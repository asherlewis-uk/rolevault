from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.main import app
from app.models import Character, Conversation, DeviceSession, MagicLinkToken, Persona, User


NOW = datetime(2026, 5, 29, 12, 0, tzinfo=timezone.utc)
DEVICE_ID = "device-00000000000000000001"


class ScalarRows:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows


class FakeResult:
    def __init__(self, scalar: Any = None, scalars: list[Any] | None = None) -> None:
        self._scalar = scalar
        self._scalars = scalars if scalars is not None else ([] if scalar is None else [scalar])

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> ScalarRows:
        return ScalarRows(self._scalars)


class FakeAsyncSession:
    def __init__(self, results: list[FakeResult] | None = None) -> None:
        self.info: dict[str, Any] = {}
        self.results = results or []
        self.statements: list[Any] = []
        self.added: list[Any] = []
        self.deleted: list[Any] = []
        self.commits = 0
        self.flushes = 0
        self.refreshes: list[Any] = []
        self.rollbacks = 0

    async def execute(self, statement: Any) -> FakeResult:
        self.statements.append(statement)
        if not self.results:
            raise AssertionError(f"Unexpected database execute: {statement}")
        return self.results.pop(0)

    def add(self, model: Any) -> None:
        self.added.append(model)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        self.flushes += 1

    async def refresh(self, model: Any) -> None:
        self.refreshes.append(model)

    async def delete(self, model: Any) -> None:
        self.deleted.append(model)

    async def rollback(self) -> None:
        self.rollbacks += 1


def single(model: Any | None) -> FakeResult:
    return FakeResult(scalar=model)


def many(models: list[Any]) -> FakeResult:
    return FakeResult(scalars=models)


def make_user(
    *,
    user_id: UUID | None = None,
    email: str = "user@example.com",
    apple_subject: str | None = None,
) -> User:
    return User(
        id=user_id or uuid4(),
        email=email,
        email_verified_at=NOW,
        apple_subject=apple_subject,
        display_name=email.split("@")[0],
        created_at=NOW,
        updated_at=NOW,
    )


def make_character(*, character_id: UUID | None = None, name: str = "Global Character") -> Character:
    return Character(
        id=character_id or uuid4(),
        name=name,
        subtitle="shared",
        visibility="global",
        category="test",
        created_at=NOW,
        updated_at=NOW,
    )


def make_conversation(
    *,
    conversation_id: UUID | None = None,
    user_id: UUID,
    character_id: UUID,
    title: str = "Conversation",
) -> Conversation:
    return Conversation(
        id=conversation_id or uuid4(),
        user_id=user_id,
        character_id=character_id,
        title=title,
        is_archived=False,
        created_at=NOW,
        updated_at=NOW,
    )


def make_persona(*, persona_id: UUID | None = None, user_id: UUID) -> Persona:
    return Persona(
        id=persona_id or uuid4(),
        user_id=user_id,
        name="Private Persona",
        is_active=False,
        created_at=NOW,
        updated_at=NOW,
    )


def make_device_session(
    *,
    user_id: UUID,
    device_id: str = DEVICE_ID,
    session_token_hash: str = "hash:access-token",
    refresh_token_hash: str = "hash:refresh-token",
) -> DeviceSession:
    return DeviceSession(
        id=uuid4(),
        user_id=user_id,
        device_id=device_id,
        session_token_hash=session_token_hash,
        refresh_token_hash=refresh_token_hash,
        expires_at=NOW + timedelta(days=7),
        last_seen_at=NOW,
        created_at=NOW,
        updated_at=NOW,
    )


def make_magic_link_token(
    *,
    user_id: UUID | None,
    email: str,
    device_id: str = DEVICE_ID,
    token_hash: str = "hash:magic-token",
    nonce_hash: str = "hash:magic-nonce",
) -> MagicLinkToken:
    return MagicLinkToken(
        id=uuid4(),
        email=email,
        token_hash=token_hash,
        nonce_hash=nonce_hash,
        device_id=device_id,
        user_id=user_id,
        expires_at=NOW + timedelta(minutes=15),
        created_at=NOW,
    )


def compiled_params(statement: Any) -> set[Any]:
    return set(statement.compile().params.values())


@pytest.fixture
def user_a() -> User:
    return make_user(email="user-a@example.com")


@pytest.fixture
def user_b() -> User:
    return make_user(email="user-b@example.com")


@pytest.fixture
def character() -> Character:
    return make_character()


@pytest.fixture
def client_factory() -> Iterator[Any]:
    original_overrides = dict(app.dependency_overrides)
    clients: list[TestClient] = []

    def build_client(*, db: FakeAsyncSession, current_user: User) -> TestClient:
        async def override_get_db() -> Any:
            yield db

        async def override_current_user() -> User:
            return current_user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_current_user
        client = TestClient(app)
        clients.append(client)
        return client

    yield build_client

    for client in clients:
        client.close()
    app.dependency_overrides = original_overrides


@contextmanager
def raises_http_status(status_code: int) -> Iterator[None]:
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        yield
    assert exc_info.value.status_code == status_code
