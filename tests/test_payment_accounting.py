from __future__ import annotations

from decimal import Decimal

from bot.services.payment_accounting import (
    apply_payment_update_to_user,
    build_payment_update,
    get_order_remaining_amount,
    get_payment_label,
    get_payment_phase,
    get_requested_payment_amount,
    get_requested_payment_label,
    is_followup_payment,
)
from database.models.orders import OrderStatus
from database.models.users import User


def make_user() -> User:
    return User(
        telegram_id=123456789,
        orders_count=0,
        total_spent=Decimal("0.00"),
    )


def test_initial_half_payment_updates_stats_once():
    user = make_user()
    update = build_payment_update(
        previous_paid_amount=Decimal("0.00"),
        new_paid_amount=Decimal("50.00"),
        final_price=Decimal("100.00"),
    )

    apply_payment_update_to_user(user, update)

    assert update.payment_delta == Decimal("50.00")
    assert update.is_first_successful_payment is True
    assert update.is_followup_payment is False
    assert update.new_status == "paid"
    assert user.orders_count == 1
    assert user.total_spent == Decimal("50.00")


def test_followup_payment_adds_only_remaining_amount():
    user = make_user()
    user.orders_count = 1
    user.total_spent = Decimal("50.00")

    update = build_payment_update(
        previous_paid_amount=Decimal("50.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
    )

    apply_payment_update_to_user(user, update)

    assert update.payment_delta == Decimal("50.00")
    assert update.is_first_successful_payment is False
    assert update.is_followup_payment is True
    assert update.new_status == "paid_full"
    assert user.orders_count == 1
    assert user.total_spent == Decimal("100.00")


def test_full_payment_counts_as_one_paid_order():
    user = make_user()
    update = build_payment_update(
        previous_paid_amount=Decimal("0.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
    )

    apply_payment_update_to_user(user, update)

    assert update.payment_delta == Decimal("100.00")
    assert update.is_first_successful_payment is True
    assert update.is_fully_paid is True
    assert update.new_status == "paid_full"
    assert user.orders_count == 1
    assert user.total_spent == Decimal("100.00")


def test_noop_payment_does_not_touch_stats():
    user = make_user()
    user.orders_count = 2
    user.total_spent = Decimal("175.00")

    update = build_payment_update(
        previous_paid_amount=Decimal("100.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
    )

    apply_payment_update_to_user(user, update)

    assert update.payment_delta == Decimal("0.00")
    assert update.is_first_successful_payment is False
    assert update.is_followup_payment is False
    assert user.orders_count == 2
    assert user.total_spent == Decimal("175.00")


def test_followup_payment_keeps_review_status():
    update = build_payment_update(
        previous_paid_amount=Decimal("50.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
        current_status=OrderStatus.REVIEW.value,
    )

    assert update.payment_delta == Decimal("50.00")
    assert update.is_followup_payment is True
    assert update.is_fully_paid is True
    assert update.new_status == OrderStatus.REVIEW.value


def test_initial_payment_can_keep_in_progress_status():
    update = build_payment_update(
        previous_paid_amount=Decimal("0.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
        current_status=OrderStatus.IN_PROGRESS.value,
    )

    assert update.is_first_successful_payment is True
    assert update.is_fully_paid is True
    assert update.new_status == OrderStatus.IN_PROGRESS.value


class PaymentOrder:
    def __init__(self, *, final_price: Decimal, paid_amount: Decimal, payment_scheme: str | None = None):
        self.final_price = final_price
        self.paid_amount = paid_amount
        self.payment_scheme = payment_scheme


def test_payment_request_helpers_handle_initial_and_final_phase():
    initial_order = PaymentOrder(
        final_price=Decimal("100.00"),
        paid_amount=Decimal("0.00"),
        payment_scheme="half",
    )
    final_order = PaymentOrder(
        final_price=Decimal("100.00"),
        paid_amount=Decimal("50.00"),
        payment_scheme="half",
    )

    assert get_order_remaining_amount(initial_order) == Decimal("100.00")
    assert is_followup_payment(initial_order) is False
    assert get_payment_phase(initial_order) == "initial"
    assert get_requested_payment_amount(initial_order, "half") == Decimal("50.00")
    assert get_requested_payment_label(initial_order, "half") == "Аванс"

    assert get_order_remaining_amount(final_order) == Decimal("50.00")
    assert is_followup_payment(final_order) is True
    assert get_payment_phase(final_order) == "final"
    assert get_requested_payment_amount(final_order, "full") == Decimal("50.00")
    assert get_requested_payment_label(final_order) == "Доплата"


def test_payment_label_formats_followup_as_extra_charge():
    update = build_payment_update(
        previous_paid_amount=Decimal("50.00"),
        new_paid_amount=Decimal("100.00"),
        final_price=Decimal("100.00"),
    )

    assert get_payment_label(update) == "Доплата"
