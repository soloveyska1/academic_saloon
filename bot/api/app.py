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
# Matches: https://academic-saloon-*-soloveyska1s-projects.vercel.app
VERCEL_ORIGIN_REGEX = r"https://academic-saloon.*\.vercel\.app"

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
    print("🌐 Mini App API starting...")
    print(f"🌐 Debug mode: {IS_DEBUG}")
    print(f"🌐 CORS origins: {len(ALLOWED_ORIGINS)} configured")
    yield
    print("🌐 Mini App API shutting down...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    app = FastAPI(
        title="Academic Saloon Mini App API",
        description="API for Telegram Mini App integration",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan
    )

    # CORS for Mini App
    # Note: Cannot use "*" with credentials=True, must specify origins explicitly
    # Using allow_origin_regex to support Vercel preview deployments
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_origin_regex=VERCEL_ORIGIN_REGEX,  # Allow all Vercel preview URLs
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Include routers
    from .routers import auth, orders, daily, chat, admin, god_mode

    app.include_router(auth.router, prefix="/api")
    app.include_router(orders.router, prefix="/api")
    app.include_router(daily.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(god_mode.router, prefix="/api")  # God Mode admin panel
    app.include_router(ws_router)  # WebSocket for real-time updates

    # Health check
    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "service": "mini-app-api"}

    # Validation error handler with logging
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        body = None
        try:
            body = await request.json()
        except Exception:
            pass
        logger.error(f"[422 Validation Error] URL: {request.url}")
        logger.error(f"[422 Validation Error] Body: {body}")
        logger.error(f"[422 Validation Error] Errors: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "body": body}
        )

    return app


# Create app instance
api_app = create_app()
