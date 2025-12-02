"""
FastAPI application for Mini App API
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    print("🌐 Mini App API starting...")
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Telegram Mini App can be from any origin
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
