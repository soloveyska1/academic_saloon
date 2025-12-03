"""
FastAPI application for Mini App API
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router


# Allowed origins for CORS
ALLOWED_ORIGINS = [
    # Production
    "https://academic-saloon.vercel.app",
    "https://academic-saloon-mini-app.vercel.app",
    "https://academic-saloon.duckdns.org",
    # Development
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    print("🌐 Mini App API starting...")
    print(f"🌐 CORS allowed origins: {ALLOWED_ORIGINS}")
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

    # Health check
    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "service": "mini-app-api"}

    return app


# Create app instance
api_app = create_app()
