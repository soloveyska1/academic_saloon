from decimal import Decimal

from bot.services.order_lifecycle import (
    can_complete_order,
    can_deliver_order,
    get_order_cashback_base,
    is_order_already_delivered,
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
