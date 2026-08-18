"""
Rate limiter tests — slowapi rate limiting.
"""

from fastapi import Request
from slowapi.errors import RateLimitExceeded
from unittest.mock import Mock

from app.core.rate_limiter import limiter, rate_limit_handler


def test_rate_limiter_configuration_and_429_handler():
    """Verify limiter is configured and 429 response structure on limit exceed."""
    assert limiter is not None
    mock_request = Request(scope={"type": "http", "method": "GET", "path": "/test", "headers": []})
    mock_limit = Mock()
    mock_limit.error_message = "Rate limit exceeded"
    mock_limit.limit = Mock(limit="5/minute")

    response = rate_limit_handler(mock_request, RateLimitExceeded(mock_limit))
    assert response.status_code == 429
    assert b"rate limit" in response.body.lower() or b"too many" in response.body.lower()
