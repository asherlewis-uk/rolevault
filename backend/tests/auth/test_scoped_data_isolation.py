from __future__ import annotations

from fastapi import status

from conftest import (
    FakeAsyncSession,
    compiled_params,
    make_conversation,
    make_persona,
    many,
    single,
)


def test_user_cannot_query_another_users_conversation(client_factory, user_a, user_b, character) -> None:
    user_b_conversation = make_conversation(
        user_id=user_b.id,
        character_id=character.id,
        title="User B private chat",
    )
    db = FakeAsyncSession([single(None)])
    client = client_factory(db=db, current_user=user_a)

    response = client.get(f"/api/convos/{user_b_conversation.id}")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    params = compiled_params(db.statements[0])
    assert user_a.id in params
    assert user_b_conversation.id in params
    assert user_b.id not in params


def test_user_cannot_mutate_another_users_persona(client_factory, user_a, user_b) -> None:
    user_b_persona = make_persona(user_id=user_b.id)
    db = FakeAsyncSession([single(None)])
    client = client_factory(db=db, current_user=user_a)

    response = client.put(
        f"/api/personas/{user_b_persona.id}",
        json={"name": "Cross-account rename", "description": "should not apply", "is_active": True},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    params = compiled_params(db.statements[0])
    assert user_a.id in params
    assert user_b_persona.id in params
    assert user_b.id not in params


def test_user_can_read_global_character_pool(client_factory, user_a, character) -> None:
    db = FakeAsyncSession([many([character])])
    client = client_factory(db=db, current_user=user_a)

    response = client.get("/api/characters")

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(character.id)
    assert body[0]["name"] == character.name
    assert user_a.id not in compiled_params(db.statements[0])


def test_user_can_filter_global_character_pool_without_user_scope(client_factory, user_a, character) -> None:
    db = FakeAsyncSession([many([character])])
    client = client_factory(db=db, current_user=user_a)

    response = client.get("/api/characters", params={"category": character.category, "visibility": "global"})

    assert response.status_code == status.HTTP_200_OK
    params = compiled_params(db.statements[0])
    assert character.category in params
    assert "global" in params
    assert user_a.id not in params


def test_user_cannot_create_global_character(client_factory, user_a) -> None:
    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    response = client.post(
        "/api/characters",
        json={
            "name": "Not allowed",
            "visibility": "global",
            "category": "test",
        },
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert db.statements == []


def test_user_cannot_update_global_character(client_factory, user_a, character) -> None:
    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    response = client.put(
        f"/api/characters/{character.id}",
        json={
            "name": "Not allowed",
            "visibility": "global",
            "category": "test",
        },
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert db.statements == []


def test_user_cannot_delete_global_character(client_factory, user_a, character) -> None:
    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    response = client.delete(f"/api/characters/{character.id}")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert db.statements == []
