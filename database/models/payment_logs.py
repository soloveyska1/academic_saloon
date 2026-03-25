"""Payment logs for webhook idempotency and audit trail."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


class PaymentLog(Base):
    """
    Immutable log of every processed payment webhook.
    Ensures idempotency: duplicate webhooks with the same yookassa_payment_id are rejected.
    """

    __tablename__ = "payment_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    yookassa_payment_id: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)  # payment.succeeded, payment.canceled
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    raw_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON dump for audit
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
