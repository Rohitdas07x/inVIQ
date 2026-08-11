"""
Vector Memory Store using Qdrant Cloud and Google Gemini Embeddings.

Provides long-term semantic memory across all chat sessions.
Messages are embedded via Google Gemini Embeddings API (gemini-embedding-001, 768-dim)
and stored in Qdrant Cloud so the agent can recall relevant facts from past
conversations via cosine-similarity search.
"""

from datetime import datetime
import logging
import uuid
from typing import List, Dict, Any, Optional
import httpx

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
)

from app.core.config import settings

logger = logging.getLogger("smart_inventory.memory")


class VectorMemory:
    """Qdrant Cloud-backed semantic memory using Google Gemini Embeddings."""

    def __init__(self):
        self._available = False
        self._client: Optional[QdrantClient] = None
        self._collection: str = settings.QDRANT_COLLECTION
        self._model: str = settings.GEMINI_EMBEDDING_MODEL
        self._dim: int = settings.GEMINI_EMBEDDING_DIM
        self._api_key: Optional[str] = settings.GEMINI_API_KEY

        if not settings.QDRANT_ENABLED:
            logger.info("Qdrant disabled via config — running without vector memory")
            return

        if not settings.QDRANT_URL or not settings.QDRANT_API_KEY:
            logger.warning(
                "QDRANT_URL or QDRANT_API_KEY not set — running without vector memory"
            )
            return

        if not self._api_key:
            logger.warning(
                "GEMINI_API_KEY not set — vector embedding disabled"
            )
            return

        try:
            # Ensure proper port on Qdrant Cloud endpoints
            url = settings.QDRANT_URL.strip()
            if url and not url.endswith(":6333") and "cloud.qdrant.io" in url:
                url = f"{url}:6333"

            self._client = QdrantClient(
                url=url,
                api_key=settings.QDRANT_API_KEY,
                timeout=10,
            )
            self._ensure_collection()
            self._available = True
            logger.info(
                "Qdrant Cloud initialized with Gemini Embeddings → cluster: %s, collection: %s, model: %s (%dd)",
                url,
                self._collection,
                self._model,
                self._dim,
            )
        except Exception as e:
            logger.warning("Qdrant Cloud unavailable — vector memory disabled: %s", e)
            self._available = False
            self._client = None

    # ── Internal helpers ──────────────────────────────────────────────────

    def _ensure_collection(self) -> None:
        """Create or recreate the collection with the correct vector dimensions."""
        existing_collections = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing_collections:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(
                    size=self._dim,
                    distance=Distance.COSINE,
                ),
            )
            logger.info("Qdrant collection created: %s (%dd)", self._collection, self._dim)
        else:
            # Verify vector dimension matches Gemini embedding dimension
            try:
                info = self._client.get_collection(self._collection)
                vector_size = getattr(getattr(getattr(info, "config", None), "params", None), "vectors", None)
                actual_size = getattr(vector_size, "size", None)
                if actual_size and actual_size != self._dim:
                    logger.info(
                        "Recreating Qdrant collection %s to update vector size from %d to %d",
                        self._collection,
                        actual_size,
                        self._dim,
                    )
                    self._client.delete_collection(self._collection)
                    self._client.create_collection(
                        collection_name=self._collection,
                        vectors_config=VectorParams(
                            size=self._dim,
                            distance=Distance.COSINE,
                        ),
                    )
            except Exception as e:
                logger.debug("Collection dimension check: %s", e)

    def _embed(self, text: str) -> List[float]:
        """Generate normalized embedding vector via Google Gemini API."""
        if not text or not text.strip():
            return [0.0] * self._dim

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:embedContent?key={self._api_key}"
        payload = {
            "content": {"parts": [{"text": text.strip()}]},
            "output_dimensionality": self._dim,
        }

        with httpx.Client(timeout=15.0) as http_client:
            response = http_client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["embedding"]["values"]

    # ── Public API ────────────────────────────────────────────────────────

    @property
    def is_available(self) -> bool:
        return self._available

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        timestamp: datetime = None,
    ) -> None:
        if not self._available or not content or not content.strip():
            return

        if timestamp is None:
            timestamp = datetime.now()

        ts_str = timestamp.strftime("%Y-%m-%d %H:%M")
        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"{session_id}_{role}_{timestamp.strftime('%Y%m%d%H%M%S%f')}",
            )
        )

        try:
            vector = self._embed(content)
            self._client.upsert(
                collection_name=self._collection,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "session_id": session_id,
                            "role": role,
                            "timestamp": ts_str,
                            "content": content,
                        },
                    )
                ],
            )
        except Exception as e:
            logger.warning("Failed to store message in vector memory: %s", e)

    def search_relevant(
        self, query: str, n_results: int = 5, exclude_session: str = None
    ) -> List[Dict[str, Any]]:
        if not self._available or not query or not query.strip():
            return []

        try:
            vector = self._embed(query)

            response = self._client.query_points(
                collection_name=self._collection,
                query=vector,
                limit=n_results * 2 if exclude_session else n_results,
                with_payload=True,
            )

            matches = []
            for hit in response.points:
                payload = hit.payload or {}
                sid = payload.get("session_id", "")

                if exclude_session and sid == exclude_session:
                    continue

                matches.append(
                    {
                        "content": payload.get("content", ""),
                        "role": payload.get("role", "unknown"),
                        "timestamp": payload.get("timestamp", "unknown"),
                        "session_id": sid,
                    }
                )

                if len(matches) >= n_results:
                    break

                return matches
            return matches

        except Exception as e:
            logger.warning("Vector memory search failed: %s", e)
            return []

    def get_stats(self) -> Dict[str, Any]:
        if not self._available:
            return {"available": False, "count": 0}

        try:
            info = self._client.get_collection(self._collection)
            count = getattr(info, "points_count", None) or getattr(info, "vectors_count", 0) or 0
            return {
                "available": True,
                "count": count,
            }
        except Exception:
            return {"available": False, "count": 0}


_memory_instance: Optional[VectorMemory] = None


def get_vector_memory() -> VectorMemory:
    """Get or create the singleton VectorMemory instance."""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = VectorMemory()
    return _memory_instance
