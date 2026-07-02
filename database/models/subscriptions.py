from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


class Subscription(Base):
    """Подписка «Салон+» — платная скидка на заказы.

    Активируется ТОЛЬКО вручную админом после оплаты на карту.
    Действует 30 дней, автопродления нет.
    Тарифы: plus («Салон+», 499 ₽/мес, −5%) и pro («Салон+ Про», 999 ₽/мес, −10%).
    """

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)  # telegram_id клиента
    tier: Mapped[str] = mapped_column(String(10), nullable=False)  # 'plus' | 'pro'
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)  # telegram_id админа
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
