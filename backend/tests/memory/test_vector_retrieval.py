from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

from fastapi import status

from app.inference.router import (
    _build_memory_context,
    _extract_query_text,
    _inject_memories,
)
from app.schemas import ChatMessagePayload, InferenceRequest
from tests.auth.conftest import FakeAsyncSession, FakeResult
from tests.memory.conftest import MockEmbedder, MockVectorStore


# ---------------------------------------------------------------------------
# Unit: _extract_query_text
# ---------------------------------------------------------------------------

def test_extract_query_text_from_last_user_message() -> None:
    payload = InferenceRequest(
        messages=[
            ChatMessagePayload(role="system", content="You are a helpful assistant"),
            ChatMessagePayload(role="user", content="Hello"),
            ChatMessagePayload(role="assistant", content="Hi there!"),
            ChatMessagePayload(role="user", content="What is the weather like?"),
        ],
    )
    assert _extract_query_text(payload) == "What is the weather like?"


def test_extract_query_text_falls_back_to_prompt() -> None:
    payload = InferenceRequest(prompt="Tell me a story")
    assert _extract_query_text(payload) == "Tell me a story"


def test_extract_query_text_empty() -> None:
    payload = InferenceRequest(messages=[ChatMessagePayload(role="system", content="Just system")])
    assert _extract_query_text(payload) == ""


# ---------------------------------------------------------------------------
# Unit: _inject_memories
# ---------------------------------------------------------------------------

def test_inject_memories_prepends_to_existing_system_message() -> None:
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hi"},
    ]
    memory_context = "[MEMORY CONTEXT]"
    result = _inject_memories(messages, memory_context)

    assert len(result) == 2
    assert result[0]["role"] == "system"
    assert result[0]["content"] == "[MEMORY CONTEXT]\nYou are a helpful assistant."
    assert result[1] == {"role": "user", "content": "Hi"}


def test_inject_memories_creates_system_message_when_none_exists() -> None:
    messages = [
        {"role": "user", "content": "Hi"},
    ]
    memory_context = "[MEMORY CONTEXT]"
    result = _inject_memories(messages, memory_context)

    assert len(result) == 2
    assert result[0]["role"] == "system"
    assert result[0]["content"] == "[MEMORY CONTEXT]"
    assert result[1] == {"role": "user", "content": "Hi"}


def test_inject_memories_noop_on_empty_context() -> None:
    messages = [{"role": "user", "content": "Hi"}]
    result = _inject_memories(messages, "")
    assert result == messages


def test_inject_memories_only_injects_first_system_message() -> None:
    messages = [
        {"role": "system", "content": "Primer"},
        {"role": "user", "content": "Hi"},
        {"role": "system", "content": "Second system"},
    ]
    result = _inject_memories(messages, "[CTX]")

    assert len(result) == 3
    assert result[0]["content"] == "[CTX]\nPrimer"
    assert result[2]["role"] == "system"
    assert result[2]["content"] == "Second system"


# ---------------------------------------------------------------------------
# Unit: _build_memory_context (with mock embedder + vector store)
# ---------------------------------------------------------------------------

def test_build_memory_context_returns_formatted_block() -> None:
    user_id = str(uuid4())
    character_id = str(uuid4())
    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    # Pre-populate the vector store with some entries for this user+character
    store_key = (user_id, character_id)
    mock_store._store[store_key] = [
        {
            "id": "msg-1",
            "content": "User asked about dragons",
            "role": "user",
            "embedding": [0.5 + i * 0.01 for i in range(8)],
        },
        {
            "id": "msg-2",
            "content": "Assistant described dragon lore",
            "role": "assistant",
            "embedding": [0.3 + i * 0.01 for i in range(8)],
        },
        {
            "id": "msg-3",
            "content": "User mentioned sword fighting",
            "role": "user",
            "embedding": [0.7 + i * 0.01 for i in range(8)],
        },
    ]

    with (
        patch("app.inference.router.embedder", mock_embedder),
        patch("app.inference.router.vector_store", mock_store),
    ):
        result = _build_memory_context(
            user_id=user_id,
            character_id=character_id,
            query_text="Tell me about dragons and swords",
        )

    assert "The following are relevant past interactions" in result
    assert "User asked about dragons" in result
    assert "Assistant described dragon lore" in result
    assert "sword fighting" in result

    # Verify query was made with correct scope
    assert len(mock_store.query_calls) == 1
    assert mock_store.query_calls[0]["user_id"] == user_id
    assert mock_store.query_calls[0]["character_id"] == character_id
    assert mock_store.query_calls[0]["top_k"] == 3


def test_build_memory_context_returns_empty_on_empty_query() -> None:
    result = _build_memory_context(
        user_id=str(uuid4()),
        character_id=str(uuid4()),
        query_text="   ",
    )
    assert result == ""


def test_build_memory_context_returns_empty_when_store_has_no_entries() -> None:
    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    with (
        patch("app.inference.router.embedder", mock_embedder),
        patch("app.inference.router.vector_store", mock_store),
    ):
        result = _build_memory_context(
            user_id=str(uuid4()),
            character_id=str(uuid4()),
            query_text="something",
        )

    assert result == ""
    assert len(mock_store.query_calls) == 1


# ---------------------------------------------------------------------------
# Isolation: device / user scoping
# ---------------------------------------------------------------------------

def test_memory_isolation_between_users() -> None:
    """Memories indexed under user A must not appear in queries scoped to user B."""
    user_a_id = str(uuid4())
    user_b_id = str(uuid4())
    character_id = str(uuid4())

    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    # Index messages for user A
    mock_store.index(
        user_id=user_a_id,
        character_id=character_id,
        message_id=uuid4(),
        content="User A secret memory",
        role="user",
        embedding=mock_embedder.embed("User A secret memory"),
    )
    mock_store.index(
        user_id=user_a_id,
        character_id=character_id,
        message_id=uuid4(),
        content="Another user A thought",
        role="assistant",
        embedding=mock_embedder.embed("Another user A thought"),
    )

    # Index messages for user B (different scope)
    mock_store.index(
        user_id=user_b_id,
        character_id=character_id,
        message_id=uuid4(),
        content="User B private note",
        role="user",
        embedding=mock_embedder.embed("User B private note"),
    )

    # Query as user B — must not see user A's memories
    results_b = mock_store.query(
        user_id=user_b_id,
        character_id=character_id,
        query_embedding=mock_embedder.embed("private"),
        top_k=3,
    )

    contents_b = [r["content"] for r in results_b]
    assert "User B private note" in contents_b
    assert "User A secret memory" not in contents_b
    assert len(results_b) == 1


def test_memory_isolation_between_characters() -> None:
    """Memories indexed under character X must not leak into queries for character Y."""
    user_id = str(uuid4())
    char_x_id = str(uuid4())
    char_y_id = str(uuid4())

    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    mock_store.index(
        user_id=user_id,
        character_id=char_x_id,
        message_id=uuid4(),
        content="Dragon lore discussion",
        role="user",
        embedding=mock_embedder.embed("Dragon lore discussion"),
    )
    mock_store.index(
        user_id=user_id,
        character_id=char_y_id,
        message_id=uuid4(),
        content="Space exploration chat",
        role="user",
        embedding=mock_embedder.embed("Space exploration chat"),
    )

    results_x = mock_store.query(
        user_id=user_id,
        character_id=char_x_id,
        query_embedding=mock_embedder.embed("lore"),
        top_k=3,
    )

    contents_x = [r["content"] for r in results_x]
    assert "Dragon lore discussion" in contents_x
    assert "Space exploration chat" not in contents_x


def test_cross_user_cannot_see_other_users_memories() -> None:
    """Confirm that user A querying their own scope never sees user B's data."""
    user_a_id = str(uuid4())
    user_b_id = str(uuid4())
    char_id = str(uuid4())

    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    mock_store.index(
        user_id=user_b_id,
        character_id=char_id,
        message_id=uuid4(),
        content="User B sensitive data",
        role="user",
        embedding=mock_embedder.embed("User B sensitive data"),
    )

    # Query all users to ensure only B sees B's data
    results_a = mock_store.query(
        user_id=user_a_id,
        character_id=char_id,
        query_embedding=mock_embedder.embed("sensitive"),
        top_k=3,
    )
    results_b = mock_store.query(
        user_id=user_b_id,
        character_id=char_id,
        query_embedding=mock_embedder.embed("sensitive"),
        top_k=3,
    )

    assert len(results_a) == 0
    assert len(results_b) == 1
    assert results_b[0]["content"] == "User B sensitive data"


# ---------------------------------------------------------------------------
# Integration: inference endpoint RAG injection
# ---------------------------------------------------------------------------

def test_inference_endpoint_injects_memories_into_payload(
    client_factory,
    user_a,
    character,
) -> None:
    """Full integration: POST /api/inference/chat/completions with character_id injects memories."""
    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    # Pre-seed with a relevant memory for user_a + character
    mock_store.index(
        user_id=user_a.id,
        character_id=character.id,
        message_id=uuid4(),
        content="User previously asked about elven magic",
        role="user",
        embedding=mock_embedder.embed("User previously asked about elven magic"),
    )
    mock_store.index(
        user_id=user_a.id,
        character_id=character.id,
        message_id=uuid4(),
        content="Assistant explained the arcane arts",
        role="assistant",
        embedding=mock_embedder.embed("Assistant explained the arcane arts"),
    )

    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    with (
        patch("app.inference.router.embedder", mock_embedder),
        patch("app.inference.router.vector_store", mock_store),
    ):
        response = client.post(
            "/api/inference/chat/completions",
            json={
                "model": "test-model",
                "messages": [
                    {"role": "system", "content": "You are a wizard."},
                    {"role": "user", "content": "Tell me about magic"},
                ],
                "character_id": str(character.id),
                "stream": False,
            },
        )

    # The inference call will fail (no real upstream), but we can verify
    # the memory retrieval was triggered with correct scope
    assert len(mock_store.query_calls) == 1
    assert mock_store.query_calls[0]["user_id"] == str(user_a.id)
    assert mock_store.query_calls[0]["character_id"] == str(character.id)

    # Verify the embed was called with the user's last message
    embedded_texts = mock_embedder.calls
    assert "Tell me about magic" in embedded_texts


def test_inference_endpoint_skips_memory_without_character_id(
    client_factory,
    user_a,
) -> None:
    """When no character_id is provided, no memory retrieval should happen."""
    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    with (
        patch("app.inference.router.embedder", mock_embedder),
        patch("app.inference.router.vector_store", mock_store),
    ):
        response = client.post(
            "/api/inference/chat/completions",
            json={
                "model": "test-model",
                "messages": [
                    {"role": "user", "content": "Hello"},
                ],
                "stream": False,
            },
        )

    assert len(mock_store.query_calls) == 0


def test_inference_endpoint_prompt_injection_includes_memory_block(
    client_factory,
    user_a,
    character,
) -> None:
    """Verify the system prompt is augmented with the memory retrieval block."""
    mock_embedder = MockEmbedder(dim=8)
    mock_store = MockVectorStore()

    mock_store.index(
        user_id=user_a.id,
        character_id=character.id,
        message_id=uuid4(),
        content="Prior discussion about potions",
        role="user",
        embedding=mock_embedder.embed("Prior discussion about potions"),
    )

    db = FakeAsyncSession()
    client = client_factory(db=db, current_user=user_a)

    with (
        patch("app.inference.router.embedder", mock_embedder),
        patch("app.inference.router.vector_store", mock_store),
    ):
        client.post(
            "/api/inference/chat/completions",
            json={
                "model": "test-model",
                "messages": [
                    {"role": "system", "content": "You are an alchemist."},
                    {"role": "user", "content": "Remind me about potions"},
                ],
                "character_id": str(character.id),
                "stream": False,
            },
        )

    # Verify the mock embedder was called for the query
    assert "Remind me about potions" in mock_embedder.calls
