from __future__ import annotations

import asyncio
from types import SimpleNamespace

from fastapi import status

from app.auth import dependencies as auth_dependencies
from app.auth import router as auth_router
from app.schemas import MagicLinkVerifyRequest, RefreshRequest

from conftest import (
    DEVICE_ID,
    FakeAsyncSession,
    make_device_session,
    make_magic_link_token,
    make_user,
    raises_http_status,
    single,
)


def test_get_current_user_requires_live_device_session(monkeypatch) -> None:
    user = make_user()
    session = make_device_session(user_id=user.id)
    db = FakeAsyncSession([single(session), single(user)])

    monkeypatch.setattr(auth_dependencies, "decode_token", lambda token: {"type": "access", "sub": str(user.id)})
    monkeypatch.setattr(auth_dependencies, "hash_token", lambda token: f"hash:{token}")

    credentials = SimpleNamespace(credentials="access-token")
    resolved_user = asyncio.run(auth_dependencies.get_current_user(credentials=credentials, db=db))

    assert resolved_user.id == user.id
    assert db.info["current_user_id"] == str(user.id)
    assert db.info["is_service_role"] is False
    assert len(db.statements) == 2


def test_get_current_user_rejects_missing_device_session(monkeypatch) -> None:
    user = make_user()
    db = FakeAsyncSession([single(None)])

    monkeypatch.setattr(auth_dependencies, "decode_token", lambda token: {"type": "access", "sub": str(user.id)})
    monkeypatch.setattr(auth_dependencies, "hash_token", lambda token: f"hash:{token}")

    credentials = SimpleNamespace(credentials="access-token")

    with raises_http_status(status.HTTP_401_UNAUTHORIZED):
        asyncio.run(auth_dependencies.get_current_user(credentials=credentials, db=db))

    assert db.info["current_user_id"] == str(user.id)


def test_magic_link_verify_consumes_token_and_binds_device_session(monkeypatch) -> None:
    user = make_user(email="magic@example.com")
    magic = make_magic_link_token(
        user_id=user.id,
        email=user.email,
        token_hash="hash:valid-magic-token-value-with-32-chars",
        nonce_hash="hash:valid-magic-nonce-value-with-32-chars",
    )
    db = FakeAsyncSession([single(magic), single(user), single(None)])

    monkeypatch.setattr(auth_router, "hash_token", lambda token: f"hash:{token}")
    monkeypatch.setattr(auth_router, "create_access_token", lambda user_id: "new-access-token")
    monkeypatch.setattr(auth_router, "create_refresh_token", lambda user_id: "new-refresh-token")

    payload = MagicLinkVerifyRequest(
        token="valid-magic-token-value-with-32-chars",
        nonce="valid-magic-nonce-value-with-32-chars",
        device_id=DEVICE_ID,
    )
    response = asyncio.run(auth_router.verify_magic_link(payload=payload, db=db))

    assert response.access_token == "new-access-token"
    assert response.refresh_token == "new-refresh-token"
    assert magic.consumed_at is not None
    assert magic.user_id == user.id
    assert db.info["is_service_role"] is True
    assert db.commits == 1
    assert len(db.added) == 1
    device_session = db.added[0]
    assert device_session.user_id == user.id
    assert device_session.device_id == DEVICE_ID
    assert device_session.session_token_hash == "hash:new-access-token"
    assert device_session.refresh_token_hash == "hash:new-refresh-token"


def test_magic_link_verify_rejects_invalid_or_consumed_token(monkeypatch) -> None:
    db = FakeAsyncSession([single(None)])
    monkeypatch.setattr(auth_router, "hash_token", lambda token: f"hash:{token}")

    payload = MagicLinkVerifyRequest(
        token="invalid-magic-token-value-with-32-chars",
        nonce="invalid-magic-nonce-value-with-32-chars",
        device_id=DEVICE_ID,
    )

    with raises_http_status(status.HTTP_401_UNAUTHORIZED):
        asyncio.run(auth_router.verify_magic_link(payload=payload, db=db))

    assert db.commits == 0
    assert db.added == []


def test_refresh_rotates_tokens_only_for_matching_device_session(monkeypatch) -> None:
    user = make_user()
    existing_session = make_device_session(
        user_id=user.id,
        refresh_token_hash="hash:old-refresh-token",
    )
    db = FakeAsyncSession([single(existing_session), single(user), single(existing_session)])

    monkeypatch.setattr(auth_router, "decode_token", lambda token: {"type": "refresh", "sub": str(user.id)})
    monkeypatch.setattr(auth_router, "hash_token", lambda token: f"hash:{token}")
    monkeypatch.setattr(auth_router, "create_access_token", lambda user_id: "rotated-access-token")
    monkeypatch.setattr(auth_router, "create_refresh_token", lambda user_id: "rotated-refresh-token")

    payload = RefreshRequest(refresh_token="old-refresh-token", device_id=DEVICE_ID)
    response = asyncio.run(auth_router.refresh(payload=payload, db=db))

    assert response.access_token == "rotated-access-token"
    assert response.refresh_token == "rotated-refresh-token"
    assert existing_session.session_token_hash == "hash:rotated-access-token"
    assert existing_session.refresh_token_hash == "hash:rotated-refresh-token"
    assert existing_session.revoked_at is None
    assert db.info["is_service_role"] is True
    assert db.commits == 1


def test_refresh_rejects_refresh_token_without_matching_device_session(monkeypatch) -> None:
    user = make_user()
    db = FakeAsyncSession([single(None)])

    monkeypatch.setattr(auth_router, "decode_token", lambda token: {"type": "refresh", "sub": str(user.id)})
    monkeypatch.setattr(auth_router, "hash_token", lambda token: f"hash:{token}")

    payload = RefreshRequest(refresh_token="old-refresh-token", device_id=DEVICE_ID)

    with raises_http_status(status.HTTP_401_UNAUTHORIZED):
        asyncio.run(auth_router.refresh(payload=payload, db=db))

    assert db.commits == 0
