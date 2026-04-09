from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from bot.api.auth import TelegramUser
from bot.api.routers import admin as admin_router
from bot.api.schemas import AdminOrderUpdate, GodOrderStatusRequest
from database.models.order_events import OrderLifecycleDispatchStatus, OrderLifecycleEventType
from database.models.orders import Order, OrderStatus


def make_order(
    *,
    order_id: int = 77,
    status: str = OrderStatus.PENDING.value,
    promo_code: str | None = None,
    price: Decimal = Decimal("10000.00"),
    paid_amount: Decimal = Decimal("0.00"),
) -> Order:
    order = Order(
        user_id=123456789,
        work_type="essay",
        subject="Тест",
        status=status,
        promo_code=promo_code,
        price=price,
        paid_amount=paid_amount,
    )
    order.id = order_id
    return order


class FakeSession:
    def __init__(self, order: Order | None):
        self.order = order
        self.commits = 0
        self.added: list[object] = []

    async def get(self, model, order_id: int):
        assert model is Order
        if self.order and self.order.id == order_id:
            return self.order
        return None

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1


def test_admin_and_god_status_requests_normalize_status():
    assert AdminOrderUpdate(status=" Completed ").status == OrderStatus.COMPLETED.value
    assert GodOrderStatusRequest(status=" PaUsEd ").status == OrderStatus.PAUSED.value


def test_admin_status_request_rejects_invalid_status():
    with pytest.raises(ValidationError):
        AdminOrderUpdate(status="done")


@pytest.mark.asyncio
async def test_admin_status_update_rejects_invalid_transition(monkeypatch):
    order = make_order(status=OrderStatus.PENDING.value)
    session = FakeSession(order)

    monkeypatch.setattr(admin_router, "is_admin", lambda _user_id: True)

    with pytest.raises(HTTPException) as excinfo:
        await admin_router.update_order_status_admin(
            order_id=order.id,
            data=AdminOrderUpdate(status=OrderStatus.COMPLETED.value),
            tg_user=TelegramUser(id=1, first_name="Admin"),
            session=session,
            bot=object(),
        )

    assert excinfo.value.status_code == 400
    assert "Недопустимый переход" in excinfo.value.detail
    assert order.status == OrderStatus.PENDING.value
    assert session.commits == 0


@pytest.mark.asyncio
async def test_admin_status_update_same_status_is_noop(monkeypatch):
    order = make_order(status=OrderStatus.WAITING_PAYMENT.value)
    session = FakeSession(order)

    monkeypatch.setattr(admin_router, "is_admin", lambda _user_id: True)

    result = await admin_router.update_order_status_admin(
        order_id=order.id,
        data=AdminOrderUpdate(status=" waiting_payment "),
        tg_user=TelegramUser(id=1, first_name="Admin"),
        session=session,
        bot=object(),
    )

    assert result == {"success": True}
    assert session.commits == 0
    assert order.status == OrderStatus.WAITING_PAYMENT.value


@pytest.mark.asyncio
async def test_admin_status_update_completion_sets_completed_at_and_notifies(monkeypatch):
    order = make_order(
        status=OrderStatus.REVIEW.value,
        price=Decimal("12000.00"),
        paid_amount=Decimal("9000.00"),
    )
    session = FakeSession(order)
    cashback_calls: list[tuple[int, int, float]] = []
    notifications: list[tuple[int, int, str, str]] = []

    async def fake_add_order_cashback(
        *,
        session,
        bot,
        user_id,
        order_id,
        order_amount,
        auto_commit,
        sync_achievements,
    ):
        cashback_calls.append((user_id, order_id, order_amount))
        return 270.0

    async def fake_send_order_status_notification(*, telegram_id, order_id, new_status, old_status, extra_data=None):
        notifications.append((telegram_id, order_id, new_status, old_status))
        return True

    async def fake_sync_user_achievements(*, session, telegram_id, bot=None, notify=False, auto_commit=True):
        return []

    async def fake_update_live_card(*args, **kwargs):
        return True

    monkeypatch.setattr(admin_router, "is_admin", lambda _user_id: True)
    monkeypatch.setattr("bot.services.bonus.BonusService.add_order_cashback", fake_add_order_cashback)
    monkeypatch.setattr("bot.services.achievements.sync_user_achievements", fake_sync_user_achievements)
    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)
    monkeypatch.setattr(
        "bot.services.realtime_notifications.send_order_status_notification",
        fake_send_order_status_notification,
    )

    result = await admin_router.update_order_status_admin(
        order_id=order.id,
        data=AdminOrderUpdate(status=OrderStatus.COMPLETED.value),
        tg_user=TelegramUser(id=1, first_name="Admin"),
        session=session,
        bot=object(),
    )

    assert result == {"success": True}
    assert order.status == OrderStatus.COMPLETED.value
    assert order.completed_at is not None
    assert session.commits == 2
    assert len(session.added) == 1
    assert session.added[0].event_type == OrderLifecycleEventType.STATUS_CHANGED.value
    assert session.added[0].dispatch_status == OrderLifecycleDispatchStatus.DISPATCHED.value
    assert cashback_calls == [(order.user_id, order.id, 9000.0)]
    assert notifications == [(order.user_id, order.id, OrderStatus.COMPLETED.value, OrderStatus.REVIEW.value)]


@pytest.mark.asyncio
async def test_admin_status_update_returns_promo_on_cancellation(monkeypatch):
    order = make_order(
        status=OrderStatus.PENDING.value,
        promo_code="SPRING2026",
    )
    session = FakeSession(order)
    promo_calls: list[int] = []

    async def fake_return_promo_usage(session, order_id: int, bot=None):
        promo_calls.append(order_id)
        return True, "ok"

    async def fake_update_live_card(*args, **kwargs):
        return True

    monkeypatch.setattr(admin_router, "is_admin", lambda _user_id: True)
    monkeypatch.setattr("bot.services.promo_service.PromoService.return_promo_usage", fake_return_promo_usage)
    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)

    result = await admin_router.update_order_status_admin(
        order_id=order.id,
        data=AdminOrderUpdate(status=OrderStatus.CANCELLED.value),
        tg_user=TelegramUser(id=1, first_name="Admin"),
        session=session,
        bot=object(),
    )

    assert result == {"success": True}
    assert order.status == OrderStatus.CANCELLED.value
    assert session.commits == 2
    assert len(session.added) == 1
    assert session.added[0].event_type == OrderLifecycleEventType.STATUS_CHANGED.value
    assert session.added[0].dispatch_status == OrderLifecycleDispatchStatus.DISPATCHED.value
    assert promo_calls == [order.id]
