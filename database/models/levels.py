from sqlalchemy import Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


class RankLevel(Base):
    """Конфигурация рангов и кешбэка по сумме трат."""

    __tablename__ = "rank_levels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    emoji: Mapped[str] = mapped_column(String(10), nullable=False)
    min_spent: Mapped[float] = mapped_column(Float, nullable=False)
    cashback_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    bonus: Mapped[str | None] = mapped_column(String(255), nullable=True)


class LoyaltyLevel(Base):
    """Конфигурация уровней лояльности по количеству заказов."""

    __tablename__ = "loyalty_levels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    emoji: Mapped[str] = mapped_column(String(10), nullable=False)
    min_orders: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0)
