"""
Simple Redis-based rate limiting for Mini App API
"""

import time
from functools import wraps
from typing import Optional, Callable

from fastapi import HTTPException, Request
from redis.asyncio import Redis

from core.config import settings


# Redis connection for rate limiting
_redis: Optional[Redis] = None


async def get_redis() -> Redis:
    """Get or create Redis connection"""
    global _redis
    if _redis is None:
        _redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB_CACHE,
            decode_responses=True
        )
    return _redis


class RateLimiter:
    """
    Simple sliding window rate limiter using Redis

    Usage:
        limiter = RateLimiter(requests=10, window=60)  # 10 requests per 60 seconds

        @router.post("/endpoint")
        async def endpoint(request: Request):
            await limiter.check(request)
            ...
    """

    def __init__(self, requests: int, window: int, key_prefix: str = "ratelimit"):
        """
        Args:
            requests: Maximum number of requests allowed in window
            window: Time window in seconds
            key_prefix: Redis key prefix
        """
        self.requests = requests
        self.window = window
        self.key_prefix = key_prefix

    def _get_key(self, identifier: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"{self.key_prefix}:{identifier}"

    async def check(self, request: Request, identifier: Optional[str] = None) -> bool:
        """
        Check if request is allowed under rate limit

        Args:
            request: FastAPI request object
            identifier: Optional custom identifier (defaults to IP or user ID)

        Raises:
            HTTPException: If rate limit exceeded

        Returns:
            True if allowed
        """
        # Get identifier (prefer user ID from header, fallback to IP)
        if identifier is None:
            # Try to extract user ID from initData header (if authenticated)
            init_data = request.headers.get("X-Telegram-Init-Data", "")
            if "user" in init_data:
                # Extract user ID from initData (basic parsing)
                try:
                    import json
                    from urllib.parse import parse_qs, unquote
                    parsed = parse_qs(init_data)
                    user_json = parsed.get('user', [''])[0]
                    if user_json:
                        user_data = json.loads(unquote(user_json))
                        identifier = f"user:{user_data.get('id', 'unknown')}"
                except Exception:
                    pass

            if identifier is None:
                # Fallback to IP
                identifier = f"ip:{request.client.host if request.client else 'unknown'}"

        redis = await get_redis()
        key = self._get_key(identifier)
        now = time.time()
        window_start = now - self.window

        # First pipeline: clean old entries and count current
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        results = await pipe.execute()
        request_count = results[1]  # zcard result (count BEFORE adding new request)

        # Check limit BEFORE adding the new request
        if request_count >= self.requests:
            # Calculate retry-after
            oldest = await redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                retry_after = int(oldest[0][1] + self.window - now) + 1
            else:
                retry_after = self.window

            raise HTTPException(
                status_code=429,
                detail="Слишком много запросов. Попробуйте позже.",
                headers={"Retry-After": str(retry_after)}
            )

        # Limit not exceeded - add current request and set expiry
        pipe = redis.pipeline()
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, self.window + 1)
        await pipe.execute()

        return True


# Pre-configured limiters for different endpoints
rate_limit_default = RateLimiter(requests=60, window=60)      # 60 req/min
rate_limit_create = RateLimiter(requests=5, window=60)        # 5 orders/min
rate_limit_roulette = RateLimiter(requests=3, window=60)      # 3 spins/min (extra protection)
rate_limit_payment = RateLimiter(requests=10, window=60)      # 10 payment actions/min
