from sqlalchemy import BigInteger, String, Boolean, DateTime, Integer, Float, func
from sqlalchemy.orm import Mapped, mapped_column
from database.db import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fullname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Реферальная система
    referrer_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    referrals_count: Mapped[int] = mapped_column(Integer, default=0)
    referral_earnings: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Статистика заказов
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Служебное
    deep_link: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    @property
    def loyalty_status(self) -> tuple[str, int]:
        """Возвращает статус лояльности и процент скидки"""
        if self.orders_count >= 15:
            return "🥇  Легенда", 15
        elif self.orders_count >= 7:
            return "🥈  Старожил", 10
        elif self.orders_count >= 3:
            return "🥉  Свой человек", 5
        else:
            return "🌵  Новичок", 0