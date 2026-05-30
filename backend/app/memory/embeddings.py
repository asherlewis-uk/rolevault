from __future__ import annotations

from typing import Protocol


class EmbeddingPipeline(Protocol):
    """Protocol for converting text into fixed-size vector embeddings."""

    def embed(self, text: str) -> list[float]:
        """Convert a single text string into an embedding vector."""
        ...

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Convert multiple text strings into embedding vectors."""
        ...


class SentenceTransformersEmbedder:
    """Concrete embedder backed by sentence-transformers (all-MiniLM-L6-v2)."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model_name
        self._model: object | None = None

    @property
    def model(self) -> object:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self._model_name)
        return self._model

    def embed(self, text: str) -> list[float]:
        result = self.model.encode([text], normalize_embeddings=True)
        return result[0].tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        result = self.model.encode(texts, normalize_embeddings=True)
        return [vec.tolist() for vec in result]
