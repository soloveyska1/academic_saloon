"""
Rate Limiting configuration for FastAPI
Uses slowapi to limit requests per IP address
"""

import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def get_real_ip(request: Request) -> str:
    """
    Get real client IP address, considering proxy headers.
    Checks X-Forwarded-For, X-Real-IP, and falls back to request.client.host
    """
    # Check X-Forwarded-For header (nginx/proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs, take the first one (original client)
        ip = forwarded.split(",")[0].strip()
        logger.debug(f"[Rate Limit] Using X-Forwarded-For IP: {ip}")
        return ip

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        logger.debug(f"[Rate Limit] Using X-Real-IP: {real_ip}")
        return real_ip

    # Fallback to direct connection IP
    ip = get_remote_address(request)
    logger.debug(f"[Rate Limit] Using direct IP: {ip}")
    return ip


# Create limiter instance with custom key function
limiter = Limiter(
    key_func=get_real_ip,
    default_limits=["100/minute"],  # Default global limit
    storage_uri="memory://",  # In-memory storage (can be replaced with Redis later)
    headers_enabled=True,  # Add rate limit headers to responses
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.
    Logs the violation and returns a user-friendly JSON response.
    """
    client_ip = get_real_ip(request)
    path = request.url.path

    # Log rate limit violation
    logger.warning(
        f"[Rate Limit Exceeded] IP: {client_ip} | Path: {path} | "
        f"Limit: {exc.detail}"
    )

    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "message": "You have exceeded the rate limit. Please try again later.",
            "detail": exc.detail,
            "path": path
        },
        headers={
            "Retry-After": "60",  # Suggest retry after 60 seconds
            "X-RateLimit-Limit": str(exc.detail),
        }
    )
