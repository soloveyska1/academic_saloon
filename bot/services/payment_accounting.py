from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from database.models.orders import OrderStatus

WORKFLOW_PAYMENT_PRESERVE_STATUSES = {
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVIEW.value,
    OrderStatus.REVISION.value,
    OrderStatus.PAUSED.value,
}

FULL_PAYMENT_SCHEME = "full"
HALF_PAYMENT_SCHEME = "half"


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


def get_order_remaining_amount(order) -> Decimal:
    """Return remaining amount for an order after already confirmed payments."""
    final_price = max(to_decimal(getattr(order, "final_price", 0)), Decimal("0"))
    paid_amount = max(to_decimal(getattr(order, "paid_amount", 0)), Decimal("0"))
    return max(final_price - paid_amount, Decimal("0"))


def is_followup_payment(order) -> bool:
    """Whether the next payment should be treated as a final settlement."""
    return to_decimal(getattr(order, "paid_amount", 0)) > 0 and get_order_remaining_amount(order) > 0


def get_payment_phase(order) -> str:
    return "final" if is_followup_payment(order) else "initial"


def normalize_payment_scheme(payment_scheme: object, *, default: str = FULL_PAYMENT_SCHEME) -> str:
    scheme = str(payment_scheme or default).strip().lower()
    if scheme not in {FULL_PAYMENT_SCHEME, HALF_PAYMENT_SCHEME}:
        return default
    return scheme


def get_requested_payment_amount(order, payment_scheme: object | None = None) -> Decimal:
    """Calculate amount requested right now for first or final payment."""
    remaining = get_order_remaining_amount(order)
    if remaining <= 0:
        return Decimal("0")

    if is_followup_payment(order):
        return remaining

    final_price = max(to_decimal(getattr(order, "final_price", 0)), Decimal("0"))
    scheme = normalize_payment_scheme(payment_scheme or getattr(order, "payment_scheme", None))
    if scheme == HALF_PAYMENT_SCHEME:
        return final_price / Decimal("2")
    return final_price


def get_payment_label(update: PaymentUpdate) -> str:
    if update.is_followup_payment and update.is_fully_paid:
        return "Доплата"
    if update.is_fully_paid:
        return "Оплата"
    return "Аванс"


def get_requested_payment_label(order, payment_scheme: object | None = None) -> str:
    if is_followup_payment(order):
        return "Доплата"
    scheme = normalize_payment_scheme(payment_scheme or getattr(order, "payment_scheme", None))
    return "Аванс" if scheme == HALF_PAYMENT_SCHEME else "Оплата"


def build_payment_update(
    *,
    previous_paid_amount: object,
    new_paid_amount: object,
    final_price: object,
    current_status: str | None = None,
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
    if current_status in WORKFLOW_PAYMENT_PRESERVE_STATUSES and payment_delta > 0:
        new_status = current_status
    else:
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
