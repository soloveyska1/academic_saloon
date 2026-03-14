"""Tests for the Redis-based rate limiter."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from bot.api.rate_limit import check_rate_limit, _get_client_ip


class TestGetClientIp:
    """Test IP extraction from requests."""

    def test_x_forwarded_for(self):
        request = MagicMock()
        request.headers = {"X-Forwarded-For": "1.2.3.4, 5.6.7.8"}
        assert _get_client_ip(request) == "1.2.3.4"

    def test_x_real_ip(self):
        request = MagicMock()
        request.headers = {"X-Real-IP": "10.0.0.1"}
        assert _get_client_ip(request) == "10.0.0.1"

    def test_direct_client(self):
        request = MagicMock()
        request.headers = {}
        request.client.host = "192.168.1.1"
        assert _get_client_ip(request) == "192.168.1.1"

    def test_no_client(self):
        request = MagicMock()
        request.headers = {}
        request.client = None
        assert _get_client_ip(request) == "unknown"

    def test_forwarded_for_priority(self):
        """X-Forwarded-For should take priority over X-Real-IP."""
        request = MagicMock()
        request.headers = {
            "X-Forwarded-For": "1.1.1.1",
            "X-Real-IP": "2.2.2.2",
        }
        assert _get_client_ip(request) == "1.1.1.1"


class TestCheckRateLimit:
    """Test rate limit checking with Redis."""

    @pytest.mark.asyncio
    async def test_allows_within_limit(self):
        mock_redis = AsyncMock()
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True

        mock_get_redis = AsyncMock(return_value=mock_redis)
        with patch("core.redis_pool.get_redis", mock_get_redis):
            result = await check_rate_limit("test:key", limit=10, window_seconds=60)
            assert result is True

    @pytest.mark.asyncio
    async def test_blocks_over_limit(self):
        mock_redis = AsyncMock()
        mock_redis.incr.return_value = 11

        mock_get_redis = AsyncMock(return_value=mock_redis)
        with patch("core.redis_pool.get_redis", mock_get_redis):
            result = await check_rate_limit("test:key", limit=10, window_seconds=60)
            assert result is False

    @pytest.mark.asyncio
    async def test_fails_open_on_redis_error(self):
        """Rate limiter should allow requests when Redis is unavailable."""
        mock_get_redis = AsyncMock(side_effect=ConnectionError("Redis down"))
        with patch("core.redis_pool.get_redis", mock_get_redis):
            result = await check_rate_limit("test:key", limit=10, window_seconds=60)
            assert result is True  # Fail-open
