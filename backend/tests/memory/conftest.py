from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest


class MockEmbedder:
    """Deterministic embedder returning predictable synthetic vectors for testing."""

    def __init__(self, dim: int = 8) -> None:
        self.dim = dim
        self.calls: list[str] = []

    def embed(self, text: str) -> list[float]:
        self.calls.append(text)
        # Deterministic: hash-like embedding so similar strings produce similar vectors
        base = abs(hash(text)) % 1000 / 1000.0
        return [base + (i * 0.01) for i in range(self.dim)]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


class MockVectorStore:
    """In-memory vector store for testing that enforces user+character scoping."""

    def __init__(self) -> None:
        # keyed by (user_id, character_id) -> list of indexed documents
        self._store: dict[tuple[str, str], list[dict[str, Any]]] = {}
        self.index_calls: list[dict[str, Any]] = []
        self.query_calls: list[dict[str, Any]] = []

    def index(
        self,
        user_id: UUID,
        character_id: UUID,
        message_id: UUID,
        content: str,
        role: str,
        embedding: list[float],
    ) -> None:
        key = (str(user_id), str(character_id))
        self.index_calls.append({
            "user_id": str(user_id),
            "character_id": str(character_id),
            "message_id": str(message_id),
            "content": content,
            "role": role,
            "embedding": embedding,
        })
        entry = {
            "id": str(message_id),
            "content": content,
            "role": role,
            "embedding": embedding,
        }
        self._store.setdefault(key, []).append(entry)

    def query(
        self,
        user_id: UUID,
        character_id: UUID,
        query_embedding: list[float],
        top_k: int = 3,
    ) -> list[dict[str, object]]:
        key = (str(user_id), str(character_id))
        self.query_calls.append({
            "user_id": str(user_id),
            "character_id": str(character_id),
            "query_embedding": query_embedding,
            "top_k": top_k,
        })
        entries = self._store.get(key, [])
        if not entries or not query_embedding:
            return []

        # Simple similarity: smallest Euclidean distance first
        def dist(a: list[float], b: list[float]) -> float:
            return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

        scored = sorted(
            [(dist(entry["embedding"], query_embedding), entry) for entry in entries],
            key=lambda x: x[0],
        )
        n = min(top_k, len(scored))
        return [
            {
                "id": scored[i][1]["id"],
                "content": scored[i][1]["content"],
                "role": scored[i][1]["role"],
                "distance": scored[i][0],
            }
            for i in range(n)
        ]


@pytest.fixture
def mock_embedder() -> MockEmbedder:
    return MockEmbedder(dim=8)


@pytest.fixture
def mock_vector_store() -> MockVectorStore:
    return MockVectorStore()
