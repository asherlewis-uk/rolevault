from __future__ import annotations

from typing import Protocol
from uuid import UUID


class VectorStore(Protocol):
    """Protocol for a scoped vector store that indexes and retrieves by embedding similarity."""

    def index(
        self,
        user_id: UUID,
        character_id: UUID,
        message_id: UUID,
        content: str,
        role: str,
        embedding: list[float],
    ) -> None:
        """Store a message embedding scoped to a user+character namespace."""
        ...

    def query(
        self,
        user_id: UUID,
        character_id: UUID,
        query_embedding: list[float],
        top_k: int = 3,
    ) -> list[dict[str, object]]:
        """Retrieve the top-k most similar messages for a user+character scope."""
        ...


class ChromaVectorStore:
    """ChromaDB-backed vector store with user+character collection scoping."""

    def __init__(self, persist_path: str | None = None) -> None:
        self._persist_path = persist_path
        self._client: object | None = None
        self._collection_cache: dict[str, object] = {}

    @property
    def client(self) -> object:
        if self._client is None:
            from chromadb import PersistentClient

            if self._persist_path:
                self._client = PersistentClient(path=self._persist_path)
            else:
                self._client = PersistentClient()
        return self._client

    def _collection_name(self, user_id: UUID, character_id: UUID) -> str:
        return f"memory_{user_id}_{character_id}"

    def _get_collection(self, user_id: UUID, character_id: UUID) -> object:
        name = self._collection_name(user_id, character_id)
        if name not in self._collection_cache:
            self._collection_cache[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection_cache[name]

    def index(
        self,
        user_id: UUID,
        character_id: UUID,
        message_id: UUID,
        content: str,
        role: str,
        embedding: list[float],
    ) -> None:
        collection = self._get_collection(user_id, character_id)
        collection.add(
            ids=[str(message_id)],
            embeddings=[embedding],
            documents=[content],
            metadatas=[{"role": role}],
        )

    def query(
        self,
        user_id: UUID,
        character_id: UUID,
        query_embedding: list[float],
        top_k: int = 3,
    ) -> list[dict[str, object]]:
        collection = self._get_collection(user_id, character_id)
        if collection.count() == 0:
            return []
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        if not results or not results["ids"] or not results["ids"][0]:
            return []

        memories: list[dict[str, object]] = []
        ids_list = results["ids"][0]
        documents_list = results["documents"][0] if results.get("documents") else []
        metadatas_list = results["metadatas"][0] if results.get("metadatas") else []
        distances_list = results["distances"][0] if results.get("distances") else []

        for i, doc_id in enumerate(ids_list):
            memories.append({
                "id": doc_id,
                "content": documents_list[i] if i < len(documents_list) else "",
                "role": (metadatas_list[i].get("role", "") if i < len(metadatas_list) else ""),
                "distance": distances_list[i] if i < len(distances_list) else 1.0,
            })

        return memories
