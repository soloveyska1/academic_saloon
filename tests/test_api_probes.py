"""Tests for API liveness/readiness probe helpers."""

from __future__ import annotations

import time
from types import SimpleNamespace

from bot.api.probes import build_liveness_payload, build_readiness_response


class DummyApp:
    def __init__(self, *, started_at: float, accepting_traffic: bool):
        self.state = SimpleNamespace(
            started_at_monotonic=started_at,
            accepting_traffic=accepting_traffic,
        )


def test_liveness_payload_reports_uptime_and_traffic_state():
    app = DummyApp(started_at=time.monotonic() - 5.0, accepting_traffic=True)

    payload = build_liveness_payload(app)

    assert payload["status"] == "alive"
    assert payload["service"] == "mini-app-api"
    assert payload["accepting_traffic"] is True
    assert payload["uptime_seconds"] >= 5.0


def test_readiness_requires_all_dependencies_and_traffic_acceptance():
    app = DummyApp(started_at=time.monotonic(), accepting_traffic=True)

    status_code, payload = build_readiness_response(app, {"database": "ok", "redis": "error: timeout"})

    assert status_code == 503
    assert payload["status"] == "not_ready"
    assert payload["accepting_traffic"] is True


def test_readiness_returns_ready_for_healthy_dependencies():
    app = DummyApp(started_at=time.monotonic(), accepting_traffic=True)

    status_code, payload = build_readiness_response(app, {"database": "ok", "redis": "ok"})

    assert status_code == 200
    assert payload["status"] == "ready"


def test_readiness_stays_blocked_while_app_is_draining():
    app = DummyApp(started_at=time.monotonic(), accepting_traffic=False)

    status_code, payload = build_readiness_response(app, {"database": "ok", "redis": "ok"})

    assert status_code == 503
    assert payload["status"] == "not_ready"
    assert payload["accepting_traffic"] is False
