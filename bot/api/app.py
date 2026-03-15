"""
FastAPI application for Mini App API
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
logger = logging.getLogger(__name__)
from .websocket import router as ws_router


# Production origins only
PROD_ORIGINS = [
    "https://academic-saloon.vercel.app",
    "https://academic-saloon-mini-app.vercel.app",
    "https://academic-saloon.duckdns.org",
]

# Vercel preview deployments (dynamic URLs)
VERCEL_PREVIEW_ORIGINS = [
    "https://academic-saloon-fbf58ua3b-soloveyska1s-projects.vercel.app",
]

# Regex pattern for ALL Vercel preview deployments from this project
# Matches all patterns:
# - https://academic-saloon*.vercel.app
# - https://mini-app-*.vercel.app (git branch previews)
# - https://*-soloveyska1s-projects.vercel.app (all user's projects)
VERCEL_ORIGIN_REGEX = r"https://academic-saloon[a-z0-9-]*\.vercel\.app"

# Dev origins (only added when DEBUG=true)
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Build allowed origins based on environment
IS_DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ALLOWED_ORIGINS = PROD_ORIGINS + VERCEL_PREVIEW_ORIGINS + (DEV_ORIGINS if IS_DEBUG else [])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Mini App API starting...")
    logger.info(f"Debug mode: {IS_DEBUG}")
    logger.info(f"CORS origins: {len(ALLOWED_ORIGINS)} configured")
    yield
    logger.info("Mini App API shutting down...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    app = FastAPI(
        title="Academic Saloon Mini App API",
        description="API for Telegram Mini App integration",
        version="1.0.0",
        docs_url="/api/docs" if IS_DEBUG else None,
        redoc_url="/api/redoc" if IS_DEBUG else None,
        openapi_url="/api/openapi.json" if IS_DEBUG else None,
        lifespan=lifespan
    )

    # Rate limiting is handled per-endpoint via @rate_limit decorator (Redis-based)

    # CORS for Mini App
    # Note: Cannot use "*" with credentials=True, must specify origins explicitly
    # Using allow_origin_regex to support Vercel preview deployments
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_origin_regex=VERCEL_ORIGIN_REGEX,  # Allow all Vercel preview URLs
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Telegram-Init-Data",
            "X-Requested-With",
            "X-God-2FA-Token",
        ],
        expose_headers=[
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Retry-After",
        ],
    )

    # Include routers
    from .routers import auth, orders, daily, chat, admin, god_mode, payments, assistant

    app.include_router(auth.router, prefix="/api")
    app.include_router(orders.router, prefix="/api")
    app.include_router(daily.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(god_mode.router, prefix="/api")  # God Mode admin panel
    app.include_router(payments.router, prefix="/api")  # YooKassa payments
    app.include_router(assistant.router, prefix="/api")  # AI assistant (FAQ + complexity)
    app.include_router(ws_router)  # WebSocket for real-time updates

    # Health check with dependency verification
    @app.get("/api/health")
    async def health_check():
        checks = {"api": "ok"}

        try:
            from database.db import async_session_maker
            from sqlalchemy import text
            async with async_session_maker() as session:
                await session.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as e:
            checks["database"] = f"error: {e}"

        try:
            from core.redis_pool import get_redis
            redis = await get_redis()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception as e:
            checks["redis"] = f"error: {e}"

        is_healthy = all(v == "ok" for v in checks.values())
        return JSONResponse(
            status_code=200 if is_healthy else 503,
            content={"status": "healthy" if is_healthy else "degraded", "checks": checks},
        )

    # Global unhandled exception handler — logs traceback for 500 debugging
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        import traceback
        tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
        logger.error(f"[500] {request.method} {request.url.path} => {type(exc).__name__}: {exc}\n{''.join(tb[-3:])}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Внутренняя ошибка сервера. Попробуйте позже."},
        )

    # Validation error handler with logging
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Make errors JSON-serializable
        errors = []
        for err in exc.errors():
            clean_err = {
                "type": err.get("type", "unknown"),
                "loc": err.get("loc", []),
                "msg": str(err.get("msg", "Validation error")),
            }
            # Don't log input values - may contain sensitive data
            errors.append(clean_err)

        # Log only URL and error types, NOT body content (may contain auth tokens)
        logger.warning(f"[422 Validation Error] URL: {request.url.path} | Errors: {[e['loc'] for e in errors]}")

        return JSONResponse(
            status_code=422,
            content={"detail": errors}
        )

    return app


# Create app instance
api_app = create_app()
