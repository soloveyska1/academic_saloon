from sqlalchemy import BigInteger, String, Boolean, DateTime, Integer, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from database.db import Base
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


MSK_TZ = ZoneInfo("Europe/Moscow")


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

    # Ежедневный бонус (Daily Luck)
    last_daily_bonus_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    daily_bonus_streak: Mapped[int] = mapped_column(Integer, default=0)  # Текущий стрик ежедневного бонуса

    # Сгорание бонусов
    last_bonus_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Дата последнего начисления
    bonus_expiry_notified: Mapped[bool] = mapped_column(Boolean, default=False)  # Флаг уведомления о сгорании

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

    # ══════════════════════════════════════════════════════════════
    #                    РАНГОВАЯ СИСТЕМА (XP/SPEND BASED)
    # ══════════════════════════════════════════════════════════════

    # Ранги на основе суммы трат: (мин. сумма ₽, название, emoji, кэшбэк %, доп. бонусы)
    RANK_LEVELS = [
        (50000, "Легенда Запада", "👑", 10, "Персональный менеджер"),
        (20000, "Головорез", "🔫", 7, "Приоритетная поддержка"),
        (5000, "Ковбой", "🤠", 3, None),
        (0, "Салага", "🐣", 0, None),
    ]

    @property
    def rank_info(self) -> dict:
        """Возвращает полную информацию о ранге пользователя"""
        current_level = None
        next_level = None

        for i, (min_spent, name, emoji, cashback, bonus) in enumerate(self.RANK_LEVELS):
            if self.total_spent >= min_spent:
                current_level = (min_spent, name, emoji, cashback, bonus)
                if i > 0:
                    next_level = self.RANK_LEVELS[i - 1]
                break

        if not current_level:
            current_level = self.RANK_LEVELS[-1]

        result = {
            "name": current_level[1],
            "emoji": current_level[2],
            "cashback": current_level[3],
            "bonus": current_level[4],
            "min_spent": current_level[0],
        }

        if next_level:
            result["has_next"] = True
            result["next_name"] = next_level[1]
            result["next_emoji"] = next_level[2]
            result["next_cashback"] = next_level[3]
            result["next_threshold"] = next_level[0]
            result["spent_needed"] = next_level[0] - self.total_spent
        else:
            result["has_next"] = False

        return result

    @property
    def rank_progress(self) -> dict:
        """Прогресс до следующего ранга с визуальным прогресс-баром"""
        rank = self.rank_info

        if not rank["has_next"]:
            return {
                "has_next": False,
                "progress_bar": "■■■■■■■■■■",
                "progress_percent": 100,
                "progress_text": "MAX",
            }

        current_min = rank["min_spent"]
        next_threshold = rank["next_threshold"]
        level_size = next_threshold - current_min
        progress_in_level = self.total_spent - current_min

        # Процент прогресса
        if level_size > 0:
            progress_percent = int((progress_in_level / level_size) * 100)
            progress_percent = min(progress_percent, 100)
        else:
            progress_percent = 0

        # Визуальный прогресс-бар (10 символов)
        filled = int(progress_percent / 10)
        filled = min(filled, 10)
        progress_bar = "■" * filled + "□" * (10 - filled)

        return {
            "has_next": True,
            "progress_bar": progress_bar,
            "progress_percent": progress_percent,
            "progress_text": f"{progress_percent}%",
            "current_spent": self.total_spent,
            "next_threshold": next_threshold,
            "spent_needed": rank["spent_needed"],
        }

    # ══════════════════════════════════════════════════════════════
    #                    ПРЕМИАЛЬНАЯ СИСТЕМА ЛОЯЛЬНОСТИ
    # ══════════════════════════════════════════════════════════════

    # Пороги лояльности: (мин. заказов, название, emoji, скидка %)
    # Резидент -> Партнёр -> VIP-Клиент -> Премиум
    LOYALTY_LEVELS = [
        (15, "Премиум", "👑", 10),
        (7, "VIP-Клиент", "⭐", 5),
        (3, "Партнёр", "🤝", 3),
        (0, "Резидент", "🌵", 0),
    ]

    @property
    def loyalty_status(self) -> tuple[str, int]:
        """Возвращает статус лояльности и процент скидки"""
        for min_orders, name, emoji, discount in self.LOYALTY_LEVELS:
            if self.orders_count >= min_orders:
                return f"{emoji} {name}", discount
        return "🌵 Резидент", 0

    @property
    def loyalty_progress(self) -> dict:
        """Прогресс до следующего статуса лояльности"""
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
                "current_name": current_level[1] if current_level else "Резидент",
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
            "current_name": current_level[1] if current_level else "Резидент",
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

    # ══════════════════════════════════════════════════════════════
    #                    DAILY LUCK (ЕЖЕДНЕВНЫЙ БОНУС)
    # ══════════════════════════════════════════════════════════════

    @property
    def can_claim_daily_bonus(self) -> bool:
        """Проверяет, может ли пользователь получить ежедневный бонус"""
        try:
            last_bonus = self.last_daily_bonus_at
            if last_bonus is None:
                return True

            now = datetime.now(MSK_TZ)
            if last_bonus.tzinfo is None:
                last_bonus = last_bonus.replace(tzinfo=MSK_TZ)

            return (now - last_bonus) >= timedelta(hours=24)
        except Exception:
            # Если колонка не существует в БД - разрешаем бонус
            return True

    @property
    def daily_bonus_cooldown(self) -> dict:
        """Возвращает информацию о кулдауне ежедневного бонуса"""
        try:
            last_bonus = self.last_daily_bonus_at
            if last_bonus is None:
                return {"available": True, "remaining_text": None}

            now = datetime.now(MSK_TZ)
            if last_bonus.tzinfo is None:
                last_bonus = last_bonus.replace(tzinfo=MSK_TZ)

            time_passed = now - last_bonus
            cooldown = timedelta(hours=24)

            if time_passed >= cooldown:
                return {"available": True, "remaining_text": None}

            remaining = cooldown - time_passed
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)

            if hours > 0:
                remaining_text = f"{hours}ч {minutes}мин"
            else:
                remaining_text = f"{minutes}мин"

            return {
                "available": False,
                "remaining_text": remaining_text,
                "remaining_hours": hours,
                "remaining_minutes": minutes,
            }
        except Exception:
            # Если колонка не существует в БД - разрешаем бонус
            return {"available": True, "remaining_text": None}

    # ══════════════════════════════════════════════════════════════
    #                    СГОРАНИЕ БОНУСОВ
    # ══════════════════════════════════════════════════════════════

    BONUS_EXPIRY_DAYS = 30  # Бонусы сгорают через 30 дней неактивности
    BONUS_EXPIRY_WARNING_DAYS = 7  # Предупреждение за 7 дней
    BONUS_EXPIRY_PERCENT = 20  # Сгорает 20% бонусов за раз

    @property
    def bonus_expiry_date(self) -> datetime | None:
        """Дата сгорания бонусов (30 дней от последнего начисления)"""
        if self.balance <= 0:
            return None
        if self.last_bonus_at is None:
            return None

        expiry = self.last_bonus_at + timedelta(days=self.BONUS_EXPIRY_DAYS)
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=MSK_TZ)
        return expiry

    @property
    def bonus_expiry_info(self) -> dict:
        """Информация о сгорании бонусов для отображения в UI"""
        if self.balance <= 0:
            return {"has_expiry": False, "balance": 0}

        expiry_date = self.bonus_expiry_date
        if expiry_date is None:
            return {
                "has_expiry": False,
                "balance": self.balance,
            }

        now = datetime.now(MSK_TZ)
        days_left = (expiry_date - now).days

        # Сколько сгорит
        burn_amount = int(self.balance * self.BONUS_EXPIRY_PERCENT / 100)

        if days_left <= 0:
            return {
                "has_expiry": True,
                "balance": self.balance,
                "days_left": 0,
                "expiry_date": expiry_date.strftime("%d.%m.%Y"),
                "burn_amount": burn_amount,
                "status": "expired",
                "status_text": "Бонусы сгорели!",
                "color": "#ef4444",
            }
        elif days_left <= self.BONUS_EXPIRY_WARNING_DAYS:
            return {
                "has_expiry": True,
                "balance": self.balance,
                "days_left": days_left,
                "expiry_date": expiry_date.strftime("%d.%m.%Y"),
                "burn_amount": burn_amount,
                "status": "warning",
                "status_text": f"Сгорят через {days_left} дн.",
                "color": "#f59e0b",
            }
        else:
            return {
                "has_expiry": True,
                "balance": self.balance,
                "days_left": days_left,
                "expiry_date": expiry_date.strftime("%d.%m.%Y"),
                "burn_amount": burn_amount,
                "status": "ok",
                "status_text": f"Действуют до {expiry_date.strftime('%d.%m')}",
                "color": "#22c55e",
            }