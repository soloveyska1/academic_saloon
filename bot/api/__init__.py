"""Mini App API package."""

from __future__ import annotations

__all__ = ["create_app", "api_app"]


def __getattr__(name: str):
    if name in {"create_app", "api_app"}:
        from .app import api_app, create_app

        exports = {
            "create_app": create_app,
            "api_app": api_app,
        }
        return exports[name]

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
