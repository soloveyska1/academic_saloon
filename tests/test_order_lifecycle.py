from decimal import Decimal

import pytest

from bot.services.order_lifecycle import (
    can_complete_order,
    can_deliver_order,
    get_order_cashback_base,
    is_order_already_delivered,
    sync_order_delivery_review,
)
from database.models.orders import Order, OrderStatus


def make_order(
    *,
    status: str,
    price: Decimal = Decimal("10000.00"),
    paid_amount: Decimal = Decimal("0.00"),
) -> Order:
    return Order(
        user_id=123456789,
        work_type="essay",
        subject="Тест",
        status=status,
        price=price,
        paid_amount=paid_amount,
    )


def test_can_deliver_only_active_paid_work():
    assert can_deliver_order(make_order(status=OrderStatus.IN_PROGRESS.value)) is True
    assert can_deliver_order(make_order(status=OrderStatus.REVISION.value)) is True
    assert can_deliver_order(make_order(status=OrderStatus.REVIEW.value)) is False
    assert can_deliver_order(make_order(status=OrderStatus.COMPLETED.value)) is False


def test_complete_allowed_only_from_review():
    assert can_complete_order(make_order(status=OrderStatus.REVIEW.value)) is True
    assert can_complete_order(make_order(status=OrderStatus.IN_PROGRESS.value)) is False


def test_already_delivered_detects_review_and_completed():
    assert is_order_already_delivered(make_order(status=OrderStatus.REVIEW.value)) is True
    assert is_order_already_delivered(make_order(status=OrderStatus.COMPLETED.value)) is True
    assert is_order_already_delivered(make_order(status=OrderStatus.REVISION.value)) is False


def test_cashback_base_prefers_paid_amount():
    order = make_order(
        status=OrderStatus.COMPLETED.value,
        price=Decimal("12000.00"),
        paid_amount=Decimal("9900.00"),
    )
    assert get_order_cashback_base(order) == 9900.0


def test_cashback_base_falls_back_to_final_or_base_price():
    order = make_order(status=OrderStatus.COMPLETED.value, price=Decimal("8000.00"))
    assert get_order_cashback_base(order) == 8000.0


class FakeLifecycleSession:
    def __init__(self):
        self.commit_calls = 0

    async def commit(self):
        self.commit_calls += 1


@pytest.mark.asyncio
async def test_sync_order_delivery_review_reopens_revision(monkeypatch):
    order = make_order(status=OrderStatus.REVISION.value)
    session = FakeLifecycleSession()
    dispatches = []

    async def fake_finalize(session_arg, bot, order_arg, result, *, dispatch):
        dispatches.append(dispatch)
        return result

    monkeypatch.setattr(
        "bot.services.order_status_service.finalize_order_status_change",
        fake_finalize,
    )

    result = await sync_order_delivery_review(
        session,
        object(),
        order,
        client_username="client",
        client_name="Client User",
    )

    assert result.reopened_review is True
    assert order.status == OrderStatus.REVIEW.value
    assert order.delivered_at is not None
    assert dispatches[0].notification_extra_data == {"delivered_at": order.delivered_at.isoformat()}
    assert "Исправленная версия отправлена" in (dispatches[0].card_extra_text or "")


@pytest.mark.asyncio
async def test_sync_order_delivery_review_backfills_review_timestamp_without_reopen():
    order = make_order(status=OrderStatus.REVIEW.value)
    order.delivered_at = None
    session = FakeLifecycleSession()

    result = await sync_order_delivery_review(session, object(), order)

    assert result.reopened_review is False
    assert order.delivered_at is not None
    assert session.commit_calls == 1
