from datetime import datetime, timedelta, timezone
from decimal import Decimal

from bot.services.order_pause import (
    MAX_ORDER_PAUSE_DAYS,
    auto_resume_if_needed,
    can_pause_order,
    get_pause_available_days,
    pause_order,
    resume_order,
)
from database.models.orders import Order, OrderStatus


def make_order(
    *,
    status: str = OrderStatus.IN_PROGRESS.value,
    paid_amount: Decimal = Decimal("5000.00"),
    pause_days_used: int = 0,
) -> Order:
    order = Order(
        user_id=123456789,
        work_type="essay",
        subject="Тест",
        price=Decimal("10000.00"),
        paid_amount=paid_amount,
        status=status,
    )
    order.pause_days_used = pause_days_used
    return order


def test_can_pause_paid_order():
    order = make_order(status=OrderStatus.PAID.value)
    assert can_pause_order(order) is True
    assert get_pause_available_days(order) == MAX_ORDER_PAUSE_DAYS


def test_pause_order_sets_window_and_marks_status():
    order = make_order(status=OrderStatus.IN_PROGRESS.value)
    now = datetime(2026, 3, 25, 12, 0, tzinfo=timezone.utc)

    pause_until = pause_order(order, "Нужна пауза", now=now)

    assert order.status == OrderStatus.PAUSED.value
    assert order.paused_from_status == OrderStatus.IN_PROGRESS.value
    assert order.pause_started_at == now
    assert pause_until == now + timedelta(days=MAX_ORDER_PAUSE_DAYS)
    assert order.pause_reason == "Нужна пауза"
    assert order.pause_days_used == MAX_ORDER_PAUSE_DAYS
    assert get_pause_available_days(order) == 0


def test_resume_order_restores_previous_status():
    order = make_order(status=OrderStatus.REVISION.value)
    pause_order(order, now=datetime(2026, 3, 25, 12, 0, tzinfo=timezone.utc))

    resumed_status = resume_order(order)

    assert resumed_status == OrderStatus.REVISION.value
    assert order.status == OrderStatus.REVISION.value
    assert order.paused_from_status is None
    assert order.pause_started_at is None
    assert order.pause_until is None
    assert order.pause_reason is None


def test_auto_resume_if_needed_resumes_expired_pause():
    order = make_order(status=OrderStatus.PAID_FULL.value)
    start = datetime(2026, 3, 1, 9, 0, tzinfo=timezone.utc)
    pause_order(order, now=start)

    resumed_status = auto_resume_if_needed(
        order,
        now=start + timedelta(days=MAX_ORDER_PAUSE_DAYS, minutes=1),
    )

    assert resumed_status == OrderStatus.PAID_FULL.value
    assert order.status == OrderStatus.PAID_FULL.value


def test_cannot_pause_unpaid_order():
    order = make_order(status=OrderStatus.PENDING.value, paid_amount=Decimal("0.00"))
    assert can_pause_order(order) is False
