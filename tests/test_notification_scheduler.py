import os
import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

REQUIRED_ENV = {
    "BOT_TOKEN": "test",
    "BOT_USERNAME": "test_bot",
    "ADMIN_IDS": "[]",
    "PAYMENT_PHONE": "0000000000",
    "PAYMENT_CARD": "0000000000000000",
    "PAYMENT_BANKS": "test_bank",
    "PAYMENT_NAME": "Test User",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "POSTGRES_DB": "test",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_DB_FSM": "0",
    "REDIS_DB_CACHE": "1",
}

for key, value in REQUIRED_ENV.items():
    os.environ.setdefault(key, value)

from bot.services.notification_scheduler import (  # noqa: E402
    ORDER_LIFECYCLE_REPLAY_BATCH,
    NotificationScheduler,
)
from bot.services.order_status_service import OrderLifecycleReplaySummary  # noqa: E402


@pytest.mark.asyncio
async def test_notification_scheduler_replays_order_lifecycle_events(monkeypatch):
    session = object()
    calls: list[tuple[object, object, int]] = []

    class FakeSessionContext:
        async def __aenter__(self):
            return session

        async def __aexit__(self, exc_type, exc, tb):
            return False

    def fake_session_maker():
        return FakeSessionContext()

    async def fake_replay_pending_order_lifecycle_events(*, session, bot, limit):
        calls.append((session, bot, limit))
        return OrderLifecycleReplaySummary(processed=1, dispatched=1)

    monkeypatch.setattr(
        "bot.services.order_status_service.replay_pending_order_lifecycle_events",
        fake_replay_pending_order_lifecycle_events,
    )

    scheduler = NotificationScheduler(bot=object(), session_maker=fake_session_maker)
    await scheduler._replay_order_lifecycle_events()

    assert calls == [(session, scheduler.bot, ORDER_LIFECYCLE_REPLAY_BATCH)]
