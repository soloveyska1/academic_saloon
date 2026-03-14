"""
Redis-based rate limiting for FastAPI.
Replaces slowapi which crashes behind nginx reverse proxy.
Uses sliding window counter via Redis INCR + EXPIRE.
"""

import logging
from functools import wraps

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """
    Check rate limit using Redis sliding window.
    Returns True if request is ALLOWED, False if rate limit exceeded.
    Fails open (allows request) if Redis is unavailable.
    """
    try:
        from core.redis_pool import get_redis
        redis = await get_redis()
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, window_seconds)
        return current <= limit
    except Exception as e:
        logger.warning(f"[RateLimit] Redis error, allowing request: {e}")
        return True  # Fail-open for rate limiting


def rate_limit(limit: int = 30, window: int = 60, key_prefix: str = "rl"):
    """
    Rate limiting decorator for FastAPI endpoints.

    Usage:
        @router.post("/endpoint")
        @rate_limit(limit=10, window=60)
        async def my_endpoint(request: Request, ...):
            ...

    Note: The decorated function MUST have a `request: Request` parameter.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find Request object in args or kwargs
            request = kwargs.get("request")
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request:
                ip = _get_client_ip(request)
                key = f"{key_prefix}:{request.url.path}:{ip}"
                if not await check_rate_limit(key, limit, window):
                    raise HTTPException(
                        status_code=429,
                        detail="Too many requests. Please try again later.",
                    )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handler for rate limit exceeded errors (kept for compatibility)."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "message": "You have exceeded the rate limit. Please try again later.",
        },
        headers={"Retry-After": "60"},
    )
