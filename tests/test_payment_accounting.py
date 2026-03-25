from decimal import Decimal

from database.models.users import User
from bot.services.payment_accounting import (
    apply_payment_update_to_user,
    build_payment_update,
)


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
