from __future__ import annotations

import json
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.conversations.router import ConnectionManager, manager
from app.main import app
from app.models import User
from app.schemas import WSMessageOut, WSUserEvent, WSError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_token(user_id: str) -> str:
    """Create a valid-looking JWT for testing (not cryptographically valid)."""
    import base64
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": user_id,
        "type": "access",
        "exp": 9999999999,
        "iat": 1,
    }).encode()).decode().rstrip("=")
    return f"{header}.{payload}.fake_signature"


@pytest.fixture
def ws_client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Unit: ConnectionManager
# ---------------------------------------------------------------------------

class FakeWebSocket:
    """Simulates a WebSocket connection for unit testing ConnectionManager."""

    def __init__(self) -> None:
        self.accepted = False
        self.sent: list[str] = []
        self.closed = False
        self.close_code: int | None = None
        self.close_reason: str | None = None
        self._closed_exception = False

    async def accept(self) -> None:
        self.accepted = True

    async def send_text(self, data: str) -> None:
        self.sent.append(data)

    async def close(self, code: int | None = None, reason: str | None = None) -> None:
        self.closed = True
        self.close_code = code
        self.close_reason = reason

    def __hash__(self) -> int:
        return id(self)

    def __eq__(self, other: object) -> bool:
        return self is other


@pytest.mark.asyncio
async def test_connection_manager_connect_and_broadcast() -> None:
    mgr = ConnectionManager()
    conv_id = uuid4()
    user_id = uuid4()

    ws1 = FakeWebSocket()
    ws2 = FakeWebSocket()

    await mgr.connect(conv_id, ws1, user_id, "Alice")
    assert ws1.accepted

    await mgr.connect(conv_id, ws2, user_id, "Bob")
    assert ws2.accepted

    # ws2 should receive a user_joined event for Alice (who connected first)
    # Actually wait - ws2 just connected. Alice already connected. The join event
    # for ws2 connecting should be broadcast to ws1.
    assert len(ws1.sent) >= 1  # ws1 receives join event for ws2
    join_event = json.loads(ws1.sent[-1])
    assert join_event["type"] == "user_joined"
    assert join_event["display_name"] == "Bob"


@pytest.mark.asyncio
async def test_connection_manager_disconnect_broadcasts_leave() -> None:
    mgr = ConnectionManager()
    conv_id = uuid4()

    ws1 = FakeWebSocket()
    ws2 = FakeWebSocket()

    await mgr.connect(conv_id, ws1, uuid4(), "Alice")
    await mgr.connect(conv_id, ws2, uuid4(), "Bob")

    # Clear sent buffers from the join broadcasts
    ws1.sent.clear()
    ws2.sent.clear()

    await mgr.disconnect(conv_id, ws1)

    # ws2 should receive user_left for Alice
    leave_events = [json.loads(m) for m in ws2.sent if json.loads(m)["type"] == "user_left"]
    assert len(leave_events) == 1
    assert leave_events[0]["display_name"] == "Alice"


@pytest.mark.asyncio
async def test_connection_manager_broadcast_message() -> None:
    from app.schemas import MessageResponse
    from datetime import datetime, timezone

    mgr = ConnectionManager()
    conv_id = uuid4()

    ws1 = FakeWebSocket()
    ws2 = FakeWebSocket()
    await mgr.connect(conv_id, ws1, uuid4(), "Alice")
    await mgr.connect(conv_id, ws2, uuid4(), "Bob")
    ws1.sent.clear()
    ws2.sent.clear()

    msg = MessageResponse(
        id=uuid4(),
        conversation_id=conv_id,
        user_id=uuid4(),
        role="user",
        content="Hello WebSocket",
        created_at=datetime.now(timezone.utc),
    )
    await mgr.broadcast_message(conv_id, msg)

    assert len(ws1.sent) == 1
    assert len(ws2.sent) == 1

    parsed = json.loads(ws1.sent[0])
    assert parsed["type"] == "message_created"
    assert parsed["message"]["content"] == "Hello WebSocket"


@pytest.mark.asyncio
async def test_connection_manager_send_error() -> None:
    mgr = ConnectionManager()
    ws = FakeWebSocket()
    await mgr.send_error(ws, "Something went wrong")

    assert len(ws.sent) == 1
    parsed = json.loads(ws.sent[0])
    assert parsed["type"] == "error"
    assert parsed["detail"] == "Something went wrong"


@pytest.mark.asyncio
async def test_connection_manager_dead_connection_cleanup() -> None:
    mgr = ConnectionManager()
    conv_id = uuid4()

    ws_live = FakeWebSocket()
    ws_dead = FakeWebSocket()

    # Make ws_dead raise on send
    original_send = ws_dead.send_text
    async def broken_send(data: str) -> None:
        raise RuntimeError("connection lost")
    ws_dead.send_text = broken_send  # type: ignore[method-assign]

    await mgr.connect(conv_id, ws_live, uuid4(), "Alice")
    await mgr.connect(conv_id, ws_dead, uuid4(), "Broken")
    ws_live.sent.clear()
    ws_dead.sent.clear()

    from app.schemas import MessageResponse
    from datetime import datetime, timezone

    msg = MessageResponse(
        id=uuid4(),
        conversation_id=conv_id,
        user_id=uuid4(),
        role="user",
        content="broadcast",
        created_at=datetime.now(timezone.utc),
    )
    await mgr.broadcast_message(conv_id, msg)

    # Live connection should get the message
    assert len(ws_live.sent) >= 1

    # Dead connection should be removed
    assert conv_id in mgr._connections
    assert ws_dead not in mgr._connections[conv_id]


@pytest.mark.asyncio
async def test_connection_manager_isolation_between_conversations() -> None:
    """Messages broadcast to conversation A must not reach conversation B clients."""
    mgr = ConnectionManager()
    conv_a = uuid4()
    conv_b = uuid4()

    ws_a = FakeWebSocket()
    ws_b = FakeWebSocket()

    await mgr.connect(conv_a, ws_a, uuid4(), "UserA")
    await mgr.connect(conv_b, ws_b, uuid4(), "UserB")
    ws_a.sent.clear()
    ws_b.sent.clear()

    from app.schemas import MessageResponse
    from datetime import datetime, timezone

    msg = MessageResponse(
        id=uuid4(),
        conversation_id=conv_a,
        user_id=uuid4(),
        role="user",
        content="Only for A",
        created_at=datetime.now(timezone.utc),
    )
    await mgr.broadcast_message(conv_a, msg)

    assert len(ws_a.sent) == 1
    assert len(ws_b.sent) == 0


# ---------------------------------------------------------------------------
# WebSocket endpoint event type validation
# ---------------------------------------------------------------------------

def test_ws_message_out_schema() -> None:
    from datetime import datetime, timezone

    msg = WSMessageOut(
        message={
            "id": str(uuid4()),
            "conversation_id": str(uuid4()),
            "user_id": str(uuid4()),
            "role": "user",
            "content": "test",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    data = json.loads(msg.model_dump_json())
    assert data["type"] == "message_created"
    assert data["message"]["content"] == "test"


def test_ws_user_event_schema() -> None:
    event = WSUserEvent(type="user_joined", user_id=uuid4(), display_name="Tester")
    data = json.loads(event.model_dump_json())
    assert data["type"] == "user_joined"
    assert data["display_name"] == "Tester"


def test_ws_error_schema() -> None:
    event = WSError(detail="Forbidden")
    data = json.loads(event.model_dump_json())
    assert data["type"] == "error"
    assert data["detail"] == "Forbidden"


def test_ws_message_in_validation() -> None:
    from app.schemas import WSMessageIn

    # valid
    msg = WSMessageIn(role="user", content="hello")
    assert msg.role == "user"

    # role must be "user"
    with pytest.raises(Exception):
        WSMessageIn(role="assistant", content="hello")

    # empty content
    with pytest.raises(Exception):
        WSMessageIn(role="user", content="")
