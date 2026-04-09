from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from bot.services.payment_verification import (
    build_payment_verification_context,
    get_pending_verification_amount,
)
from database.models.order_events import OrderLifecycleEvent, OrderLifecycleEventType
from database.models.orders import Order, OrderStatus


def make_order(
    *,
    order_id: int = 1,
    status: str = OrderStatus.VERIFICATION_PENDING.value,
    final_price: float = 3000.0,
    paid_amount: float = 1000.0,
    payment_scheme: str = "half",
) -> Order:
    order = Order(
        user_id=101,
        work_type="essay",
        subject="Тестовая тема",
        status=status,
        price=Decimal(str(final_price)),
        paid_amount=Decimal(str(paid_amount)),
        payment_scheme=payment_scheme,
        payment_method="sbp",
    )
    order.id = order_id
    return order


def test_build_payment_verification_context_reads_batch_payload():
    order = make_order(order_id=12, paid_amount=1000.0)
    event = OrderLifecycleEvent(
        order_id=12,
        user_id=101,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.REVIEW.value,
        status_to=OrderStatus.VERIFICATION_PENDING.value,
        created_at=datetime(2026, 4, 8, 12, 0, tzinfo=timezone.utc),
        payload={
            "dispatch": {
                "notification_extra_data": {
                    "payment_method": "sbp",
                    "payment_scheme": "half",
                    "payment_phase": "final",
                    "amount_to_pay": 2000.0,
                    "is_batch": True,
                    "batch_orders_count": 3,
                    "batch_total_amount": 4500.0,
                    "batch_order_ids": [12, 13, 14],
                }
            }
        },
    )

    context = build_payment_verification_context(order, event)

    assert context is not None
    assert context.amount_to_pay == 2000.0
    assert context.payment_method == "sbp"
    assert context.payment_scheme == "half"
    assert context.payment_phase == "final"
    assert context.is_batch is True
    assert context.batch_orders_count == 3
    assert context.batch_total_amount == 4500.0
    assert context.batch_order_ids == [12, 13, 14]
    assert context.requested_at == "2026-04-08T12:00:00+00:00"


def test_build_payment_verification_context_falls_back_to_order_state():
    order = make_order(order_id=7, final_price=2000.0, paid_amount=0.0, payment_scheme="half")

    context = build_payment_verification_context(order)

    assert context is not None
    assert context.amount_to_pay == 1000.0
    assert context.payment_method == "sbp"
    assert context.payment_phase == "initial"
    assert context.is_batch is False
    assert context.batch_orders_count == 0
    assert context.batch_total_amount == 1000.0


def test_get_pending_verification_amount_handles_final_settlement():
    order = make_order(order_id=9, final_price=3500.0, paid_amount=1500.0)

    assert get_pending_verification_amount(order) == 2000.0
