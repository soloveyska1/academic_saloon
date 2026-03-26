"""Helpers for liveness/readiness probes."""

from __future__ import annotations

import time
from fastapi import FastAPI


APP_BOOT_TIME = time.monotonic()


async def collect_readiness_checks() -> dict[str, str]:
    checks = {"database": "unknown", "redis": "unknown"}

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

    return checks


def build_liveness_payload(app: FastAPI) -> dict[str, object]:
    started_at = getattr(app.state, "started_at_monotonic", APP_BOOT_TIME)
    accepting_traffic = bool(getattr(app.state, "accepting_traffic", False))
    return {
        "status": "alive",
        "service": "mini-app-api",
        "accepting_traffic": accepting_traffic,
        "uptime_seconds": round(max(0.0, time.monotonic() - started_at), 3),
    }


def build_readiness_response(app: FastAPI, checks: dict[str, str]) -> tuple[int, dict[str, object]]:
    accepting_traffic = bool(getattr(app.state, "accepting_traffic", False))
    ready = accepting_traffic and all(value == "ok" for value in checks.values())
    payload = {
        "status": "ready" if ready else "not_ready",
        "service": "mini-app-api",
        "accepting_traffic": accepting_traffic,
        "checks": checks,
    }
    return (200 if ready else 503), payload
