from sqlalchemy import BigInteger, String, Boolean, DateTime, Integer, Float, Text, func
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

    # Оферта
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Модерация
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    banned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ban_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_watched: Mapped[bool] = mapped_column(Boolean, default=False)  # Режим слежки
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # Заметки админа

    # Служебное
    deep_link: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    @property
    def has_accepted_terms(self) -> bool:
        """Проверяет, принял ли пользователь оферту"""
        return self.terms_accepted_at is not None

    # Пороги лояльности: (мин. заказов, название, emoji, скидка %)
    LOYALTY_LEVELS = [
        (15, "Легенда салуна", "🏆", 15),
        (7, "Шериф", "⭐", 10),
        (3, "Завсегдатай", "🤠", 5),
        (0, "Новичок", "🌵", 0),
    ]

    @property
    def loyalty_status(self) -> tuple[str, int]:
        """Возвращает статус лояльности и процент скидки"""
        for min_orders, name, emoji, discount in self.LOYALTY_LEVELS:
            if self.orders_count >= min_orders:
                return f"{emoji} {name}", discount
        return "🌵 Новичок", 0

    @property
    def loyalty_progress(self) -> dict:
        """Прогресс до следующего статуса"""
        current_level = None
        next_level = None

        for i, (min_orders, name, emoji, discount) in enumerate(self.LOYALTY_LEVELS):
            if self.orders_count >= min_orders:
                current_level = (min_orders, name, emoji, discount)
                if i > 0:
                    next_level = self.LOYALTY_LEVELS[i - 1]
                break

        if not next_level:
            return {
                "has_next": False,
                "current_name": current_level[1] if current_level else "Новичок",
                "progress_bar": "▓▓▓▓▓▓▓▓▓▓",
                "progress_text": "MAX",
            }

        orders_needed = next_level[0] - self.orders_count
        current_min = current_level[0] if current_level else 0
        progress_in_level = self.orders_count - current_min
        level_size = next_level[0] - current_min

        # Визуальный прогресс-бар (10 символов)
        filled = int((progress_in_level / level_size) * 10) if level_size > 0 else 0
        filled = min(filled, 10)
        progress_bar = "▓" * filled + "░" * (10 - filled)

        return {
            "has_next": True,
            "current_name": current_level[1] if current_level else "Новичок",
            "next_name": next_level[1],
            "next_emoji": next_level[2],
            "next_discount": next_level[3],
            "orders_needed": orders_needed,
            "orders_current": self.orders_count,
            "orders_target": next_level[0],
            "progress_bar": progress_bar,
            "progress_text": f"{self.orders_count}/{next_level[0]}",
        }

    @property
    def total_saved(self) -> float:
        """Примерная сумма сэкономленного по скидкам"""
        # Грубый расчёт: если total_spent это сумма после скидок,
        # восстанавливаем примерную экономию
        _, current_discount = self.loyalty_status
        if current_discount == 0 or self.total_spent == 0:
            return 0.0
        # Средняя скидка примерно половина от текущей (рос постепенно)
        avg_discount = current_discount / 2
        # total_spent = original * (1 - avg_discount/100)
        # original = total_spent / (1 - avg_discount/100)
        # saved = original - total_spent
        if avg_discount >= 100:
            return 0.0
        original = self.total_spent / (1 - avg_discount / 100)
        return original - self.total_spent