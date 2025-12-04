"""
FastAPI application for Mini App API
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from .websocket import router as ws_router


# Production origins only
PROD_ORIGINS = [
    "https://academic-saloon.vercel.app",
    "https://academic-saloon-mini-app.vercel.app",
    "https://academic-saloon.duckdns.org",
]

# Dev origins (only added when DEBUG=true)
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Build allowed origins based on environment
IS_DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ALLOWED_ORIGINS = PROD_ORIGINS + (DEV_ORIGINS if IS_DEBUG else [])


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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Include routes
    app.include_router(router)
    app.include_router(ws_router)  # WebSocket for real-time updates

    # Health check
    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "service": "mini-app-api"}

    return app


# Create app instance
api_app = create_app()
