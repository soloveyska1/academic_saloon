from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


class OrderLifecycleEventType(str, enum.Enum):
    STATUS_CHANGED = "status_changed"
    DELIVERY_SENT = "delivery_sent"


class OrderLifecycleDispatchStatus(str, enum.Enum):
    PENDING = "pending"
    DISPATCHED = "dispatched"
    FAILED = "failed"


class OrderLifecycleEvent(Base):
    __tablename__ = "order_lifecycle_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    status_from: Mapped[str] = mapped_column(String(20), nullable=False)
    status_to: Mapped[str] = mapped_column(String(20), nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    dispatch_status: Mapped[str] = mapped_column(
        String(20),
        default=OrderLifecycleDispatchStatus.PENDING.value,
        index=True,
    )
    dispatch_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
