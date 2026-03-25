from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from database.models.orders import OrderStatus


def to_decimal(value: object, default: str = "0") -> Decimal:
    """Best-effort Decimal conversion for payment math and loyalty stats."""
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal(default)
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


@dataclass(frozen=True)
class PaymentUpdate:
    previous_paid_amount: Decimal
    new_paid_amount: Decimal
    payment_delta: Decimal
    is_first_successful_payment: bool
    is_followup_payment: bool
    is_fully_paid: bool
    new_status: str


def build_payment_update(
    *,
    previous_paid_amount: object,
    new_paid_amount: object,
    final_price: object,
) -> PaymentUpdate:
    previous_paid = max(to_decimal(previous_paid_amount), Decimal("0"))
    current_paid = max(to_decimal(new_paid_amount), Decimal("0"))
    total_due = max(to_decimal(final_price), Decimal("0"))

    if total_due > 0:
        current_paid = min(current_paid, total_due)

    payment_delta = max(current_paid - previous_paid, Decimal("0"))
    is_first_successful_payment = previous_paid <= 0 and current_paid > 0
    is_followup_payment = previous_paid > 0 and payment_delta > 0
    is_fully_paid = (total_due <= 0 and current_paid > 0) or (total_due > 0 and current_paid >= total_due)
    new_status = OrderStatus.PAID_FULL.value if is_fully_paid else OrderStatus.PAID.value

    return PaymentUpdate(
        previous_paid_amount=previous_paid,
        new_paid_amount=current_paid,
        payment_delta=payment_delta,
        is_first_successful_payment=is_first_successful_payment,
        is_followup_payment=is_followup_payment,
        is_fully_paid=is_fully_paid,
        new_status=new_status,
    )


def apply_payment_update_to_user(user, update: PaymentUpdate) -> PaymentUpdate:
    """Apply payment-derived loyalty stats once per real payment delta."""
    if update.is_first_successful_payment:
        user.orders_count = int(getattr(user, "orders_count", 0) or 0) + 1

    if update.payment_delta > 0:
        current_total_spent = to_decimal(getattr(user, "total_spent", 0), default="0.00")
        user.total_spent = current_total_spent + update.payment_delta

    return update
