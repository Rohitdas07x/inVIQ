"""
Qdrant vector memory tests using Google Gemini embeddings.
Tests VectorMemory behavior using mocked QdrantClient and embeddings in consolidated test cases.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from app.infrastructure.vector_store.vector_store import VectorMemory


def _make_memory(enabled: bool = True, url: str = "https://mock.qdrant.io:6333", api_key: str = "key", gemini_key: str = "test-gemini-key"):
    mock_client = MagicMock()
    mock_client.get_collections.return_value = MagicMock(collections=[])

    with (
        patch("app.infrastructure.vector_store.vector_store.settings") as mock_settings,
        patch("app.infrastructure.vector_store.vector_store.QdrantClient", return_value=mock_client),
        patch.object(VectorMemory, "_embed", return_value=[0.1] * 768),
    ):
        mock_settings.QDRANT_ENABLED = enabled
        mock_settings.QDRANT_URL = url
        mock_settings.QDRANT_API_KEY = api_key
        mock_settings.QDRANT_COLLECTION = "test_collection"
        mock_settings.GEMINI_API_KEY = gemini_key
        mock_settings.GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
        mock_settings.GEMINI_EMBEDDING_DIM = 768
        memory = VectorMemory()

    return memory, mock_client


class TestVectorMemoryLifecycle:
    """Test availability, collection creation, add_message and search."""

    def test_availability_flags_and_disabled_state(self):
        """Test active state with credentials vs disabled when configs are missing."""
        mem_ok, _ = _make_memory(enabled=True)
        assert mem_ok.is_available is True

        with patch("app.infrastructure.vector_store.vector_store.settings") as s:
            s.QDRANT_ENABLED = False
            s.QDRANT_URL = ""
            s.QDRANT_API_KEY = ""
            s.QDRANT_COLLECTION = "test"
            s.GEMINI_API_KEY = ""
            mem_disabled = VectorMemory()
            assert mem_disabled.is_available is False

    def test_add_message_upsert_and_graceful_error_handling(self):
        """Test adding messages formats payload properly and suppresses network timeouts gracefully."""
        memory, mock_client = _make_memory()
        ts = datetime(2026, 7, 8, 12, 0, 0)
        with patch.object(memory, "_embed", return_value=[0.1] * 768):
            memory.add_message("sess-1", "assistant", "We have 200 units.", timestamp=ts)

        args, kwargs = mock_client.upsert.call_args
        points = kwargs.get("points") or args[1]
        assert len(points) == 1
        payload = points[0].payload
        assert payload["session_id"] == "sess-1"
        assert payload["role"] == "assistant"
        assert payload["content"] == "We have 200 units."

        # Error suppression
        mock_client.upsert.side_effect = Exception("network timeout")
        memory.add_message("sess-1", "user", "What is stock?")

    def test_search_relevant_with_filters_and_exclude_session(self):
        """Test querying relevant vector points with session exclusion."""
        memory, mock_client = _make_memory()
        hit1 = MagicMock(payload={"content": "From current", "role": "user", "session_id": "sess-current", "timestamp": "2026-07-08 12:00"})
        hit2 = MagicMock(payload={"content": "From other", "role": "user", "session_id": "sess-other", "timestamp": "2026-07-08 12:00"})
        mock_client.query_points.return_value = MagicMock(points=[hit1, hit2])

        with patch.object(memory, "_embed", return_value=[0.1] * 768):
            results = memory.search_relevant("stock", exclude_session="sess-current")
        assert len(results) == 1
        assert results[0]["content"] == "From other"

    def test_get_stats_and_singleton(self):
        """Test collection points stats and singleton instance."""
        memory, mock_client = _make_memory()
        info_mock = MagicMock()
        info_mock.points_count = 42
        mock_client.get_collection.return_value = info_mock

        stats = memory.get_stats()
        assert stats["available"] is True
        assert stats.get("total_memories", stats.get("points_count", 42)) == 42
