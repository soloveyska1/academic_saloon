from decimal import Decimal

from sqlalchemy import BigInteger, String, Boolean, DateTime, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from database.db import Base
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import math


MSK_TZ = ZoneInfo("Europe/Moscow")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fullname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Реферальная система
    referrer_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    referrals_count: Mapped[int] = mapped_column(Integer, default=0)
    referral_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

    # Статистика заказов
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

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

    # Ранги — единый источник правды в core/ranks.py
    # Backward compat: RANK_LEVELS используется в legacy-коде
    @property
    def rank_info(self) -> dict:
        """Возвращает полную информацию о ранге пользователя"""
        from core.ranks import get_rank_for_spent, get_rank_progress
        rank = get_rank_for_spent(self.total_spent)
        progress = get_rank_progress(self.total_spent)

        result = {
            "name": rank.name,
            "emoji": "",
            "cashback": rank.cashback_percent,
            "bonus": rank.bonus,
            "min_spent": rank.min_spent,
        }

        if progress["has_next"]:
            next_tier = progress["next"]
            result["has_next"] = True
            result["next_name"] = next_tier.name
            result["next_emoji"] = ""
            result["next_cashback"] = next_tier.cashback_percent
            result["next_threshold"] = next_tier.min_spent
            result["spent_needed"] = progress["spent_to_next"]
        else:
            result["has_next"] = False

        return result

    @property
    def rank_progress(self) -> dict:
        """Прогресс до следующего ранга с визуальным прогресс-баром"""
        from core.ranks import get_rank_progress
        progress = get_rank_progress(self.total_spent)

        if not progress["has_next"]:
            return {
                "has_next": False,
                "progress_bar": "■■■■■■■■■■",
                "progress_percent": 100,
                "progress_text": "MAX",
            }

        progress_percent = progress["progress_percent"]
        filled = min(int(progress_percent / 10), 10)
        progress_bar = "■" * filled + "□" * (10 - filled)

        return {
            "has_next": True,
            "progress_bar": progress_bar,
            "progress_percent": progress_percent,
            "progress_text": f"{progress_percent}%",
            "current_spent": self.total_spent,
            "next_threshold": progress["next"].min_spent,
            "spent_needed": progress["spent_to_next"],
        }

    # ══════════════════════════════════════════════════════════════
    #                    ПРЕМИАЛЬНАЯ СИСТЕМА ЛОЯЛЬНОСТИ
    # ══════════════════════════════════════════════════════════════

    # Лояльность — единый источник правды в core/ranks.py

    @property
    def loyalty_status(self) -> tuple[str, int]:
        """Возвращает статус лояльности и процент скидки"""
        from core.ranks import get_loyalty_for_orders
        tier = get_loyalty_for_orders(self.orders_count)
        return tier.name, tier.discount_percent

    @property
    def loyalty_progress(self) -> dict:
        """Прогресс до следующего статуса лояльности"""
        from core.ranks import get_loyalty_progress
        progress = get_loyalty_progress(self.orders_count)
        current = progress["current"]

        if not progress["has_next"]:
            return {
                "has_next": False,
                "current_name": current.name,
                "progress_bar": "▓▓▓▓▓▓▓▓▓▓",
                "progress_text": "MAX",
            }

        next_tier = progress["next"]
        orders_needed = progress["orders_to_next"]
        current_min = current.min_orders
        progress_in_level = self.orders_count - current_min
        level_size = next_tier.min_orders - current_min

        filled = int((progress_in_level / level_size) * 10) if level_size > 0 else 0
        filled = min(filled, 10)
        progress_bar = "▓" * filled + "░" * (10 - filled)

        return {
            "has_next": True,
            "current_name": current.name,
            "next_name": next_tier.name,
            "next_emoji": "",
            "next_discount": next_tier.discount_percent,
            "orders_needed": orders_needed,
            "orders_current": self.orders_count,
            "orders_target": next_tier.min_orders,
            "progress_bar": progress_bar,
            "progress_text": f"{self.orders_count}/{next_tier.min_orders}",
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
        """Проверяет, может ли пользователь получить ежедневный бонус (Calendar Day Logic)"""
        try:
            last_bonus = self.last_daily_bonus_at
            if last_bonus is None:
                return True

            msk_tz = ZoneInfo("Europe/Moscow")
            now_msk = datetime.now(msk_tz)
            today = now_msk.date()

            if last_bonus.tzinfo is None:
                last_bonus = last_bonus.replace(tzinfo=msk_tz)
            else:
                last_bonus = last_bonus.astimezone(msk_tz)

            return last_bonus.date() < today
        except Exception:
            return True

    @property
    def daily_bonus_cooldown(self) -> dict:
        """Возвращает информацию о кулдауне ежедневного бонуса (до 00:00 МСК)"""
        try:
            last_bonus = self.last_daily_bonus_at
            if last_bonus is None:
                return {"available": True, "remaining_text": None}

            msk_tz = ZoneInfo("Europe/Moscow")
            now_msk = datetime.now(msk_tz)
            today = now_msk.date()

            if last_bonus.tzinfo is None:
                last_bonus = last_bonus.replace(tzinfo=msk_tz)
            else:
                last_bonus = last_bonus.astimezone(msk_tz)

            if last_bonus.date() < today:
                return {"available": True, "remaining_text": None}

            # Считаем время до полуночи
            next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            remaining = next_midnight - now_msk
            
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            
            remaining_text = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"

            return {
                "available": False,
                "remaining_text": remaining_text,
                "remaining_hours": hours,
                "remaining_minutes": minutes,
            }
        except Exception:
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
        seconds_left = (expiry_date - now).total_seconds()
        days_left = max(1, math.ceil(seconds_left / 86400)) if seconds_left > 0 else 0

        # Сколько сгорит
        burn_amount = int(self.balance * self.BONUS_EXPIRY_PERCENT / 100)

        if seconds_left <= 0:
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
