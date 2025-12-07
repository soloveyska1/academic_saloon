"""
Promo Code Service with comprehensive anti-abuse protection

Security measures:
1. User can only use each promo code once
2. Rate limiting: max 5 promo validation attempts per minute per user
3. Max 3 different promos per user total (prevent promo hopping)
4. Atomic usage recording with SELECT FOR UPDATE to prevent race conditions
5. Promo attempt logging for security monitoring
6. Max discount cap enforced at 50%
"""

from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from zoneinfo import ZoneInfo
import logging

from database.models.promocodes import PromoCode, PromoCodeUsage
from database.models.orders import Order

logger = logging.getLogger(__name__)
MSK_TZ = ZoneInfo("Europe/Moscow")

# Anti-abuse settings
MAX_PROMO_ATTEMPTS_PER_MINUTE = 5
MAX_DIFFERENT_PROMOS_PER_USER = 3
MAX_DISCOUNT_PERCENT = 50

# In-memory rate limiting (simple implementation)
_promo_attempts: dict[int, list[datetime]] = {}


def _check_rate_limit(user_id: int) -> tuple[bool, str]:
    """Check if user exceeded promo validation rate limit"""
    now = datetime.now(MSK_TZ)
    minute_ago = now - timedelta(minutes=1)

    # Clean old attempts
    if user_id in _promo_attempts:
        _promo_attempts[user_id] = [
            t for t in _promo_attempts[user_id] if t > minute_ago
        ]
    else:
        _promo_attempts[user_id] = []

    # Check limit
    if len(_promo_attempts[user_id]) >= MAX_PROMO_ATTEMPTS_PER_MINUTE:
        return False, "Слишком много попыток. Подождите минуту."

    # Record attempt
    _promo_attempts[user_id].append(now)
    return True, ""


class PromoService:
    @staticmethod
    async def get_promo_code(session: AsyncSession, code: str) -> PromoCode | None:
        """Получить промокод по коду (case-insensitive)"""
        stmt = select(PromoCode).where(func.lower(PromoCode.code) == code.lower())
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_promo_count(session: AsyncSession, user_id: int) -> int:
        """Count how many different promo codes user has used"""
        stmt = select(func.count(func.distinct(PromoCodeUsage.promocode_id))).where(
            PromoCodeUsage.user_id == user_id
        )
        result = await session.execute(stmt)
        return result.scalar() or 0

    @staticmethod
    async def check_promo_code(session: AsyncSession, code: str, user_id: int) -> tuple[bool, str, float]:
        """
        Проверка промокода с защитой от абуза.
        Возвращает: (valid: bool, reason: str, discount_percent: float)
        """
        # Rate limiting check
        rate_ok, rate_msg = _check_rate_limit(user_id)
        if not rate_ok:
            logger.warning(f"[Promo] Rate limit exceeded for user {user_id}")
            return False, rate_msg, 0.0

        code = code.strip().upper()

        promo = await PromoService.get_promo_code(session, code)

        if not promo:
            logger.info(f"[Promo] Code not found: {code} by user {user_id}")
            return False, "Промокод не найден", 0.0

        if not promo.is_active:
            return False, "Промокод неактивен", 0.0

        now = datetime.now(MSK_TZ)

        # Check validity period
        if promo.valid_from:
            valid_from = promo.valid_from.replace(tzinfo=MSK_TZ) if promo.valid_from.tzinfo is None else promo.valid_from
            if now < valid_from:
                return False, "Срок действия промокода еще не наступил", 0.0

        if promo.valid_until:
            valid_until = promo.valid_until.replace(tzinfo=MSK_TZ) if promo.valid_until.tzinfo is None else promo.valid_until
            if now > valid_until:
                return False, "Срок действия промокода истек", 0.0

        # Check usage limits
        if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
            return False, "Лимит использований промокода исчерпан", 0.0

        # Check if user already used this promo
        stmt = select(PromoCodeUsage).where(
            PromoCodeUsage.promocode_id == promo.id,
            PromoCodeUsage.user_id == user_id
        )
        usage = await session.execute(stmt)
        if usage.first():
            return False, "Вы уже использовали этот промокод", 0.0

        # Check user's total promo usage limit
        user_promo_count = await PromoService.get_user_promo_count(session, user_id)
        if user_promo_count >= MAX_DIFFERENT_PROMOS_PER_USER:
            logger.warning(f"[Promo] User {user_id} exceeded max different promos limit")
            return False, f"Вы уже использовали максимум промокодов ({MAX_DIFFERENT_PROMOS_PER_USER})", 0.0

        # Enforce max discount cap
        discount = min(promo.discount_percent, MAX_DISCOUNT_PERCENT)

        return True, "Промокод активен", discount

    @staticmethod
    async def reserve_and_record_promo(
        session: AsyncSession,
        code: str,
        user_id: int,
        order_id: int,
        base_price: float
    ) -> tuple[bool, str, float]:
        """
        Atomically reserve and record promo code usage using SELECT FOR UPDATE.
        This prevents race conditions when multiple orders are created simultaneously.

        Should be called AFTER order is created but BEFORE commit.
        Returns: (success: bool, message: str, discount: float)
        """
        code = code.strip().upper()

        try:
            # Lock the promo code row for update to prevent race conditions
            stmt = select(PromoCode).where(
                func.lower(PromoCode.code) == code.lower()
            ).with_for_update()

            result = await session.execute(stmt)
            promo = result.scalar_one_or_none()

            if not promo:
                return False, "Промокод не найден", 0.0

            if not promo.is_active:
                return False, "Промокод неактивен", 0.0

            now = datetime.now(MSK_TZ)

            # Recheck validity (in case something changed)
            if promo.valid_until:
                valid_until = promo.valid_until.replace(tzinfo=MSK_TZ) if promo.valid_until.tzinfo is None else promo.valid_until
                if now > valid_until:
                    return False, "Срок действия промокода истек", 0.0

            if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                return False, "Лимит использований исчерпан", 0.0

            # Check if user already used (double-check under lock)
            usage_stmt = select(PromoCodeUsage).where(
                PromoCodeUsage.promocode_id == promo.id,
                PromoCodeUsage.user_id == user_id
            )
            existing_usage = await session.execute(usage_stmt)
            if existing_usage.first():
                return False, "Вы уже использовали этот промокод", 0.0

            # Atomically increment usage counter
            promo.current_uses += 1

            discount = min(promo.discount_percent, MAX_DISCOUNT_PERCENT)
            saved_amount = base_price * (discount / 100.0)

            # Record usage in same transaction
            usage = PromoCodeUsage(
                promocode_id=promo.id,
                user_id=user_id,
                order_id=order_id,
                discount_amount=saved_amount
            )
            session.add(usage)

            logger.info(f"[Promo] Reserved and recorded {code} for user {user_id}, order {order_id}, discount {discount}%")
            return True, "Промокод применен", discount

        except Exception as e:
            logger.error(f"[Promo] Reserve error for {code}: {e}")
            return False, "Ошибка применения промокода", 0.0

    @staticmethod
    async def apply_promo_code(session: AsyncSession, order_id: int, code: str, user_id: int) -> tuple[bool, str]:
        """
        Apply promo code to an existing order.
        Uses atomic reservation to prevent race conditions.
        """
        # Get the order first
        order_stmt = select(Order).where(Order.id == order_id)
        result = await session.execute(order_stmt)
        order = result.scalar_one_or_none()

        if not order:
            return False, "Заказ не найден"

        # Check if order already has a promo
        if order.promo_code:
            return False, "К заказу уже применен промокод"

        # Reserve the promo (with locking)
        is_valid, reason, discount = await PromoService.reserve_and_record_promo(
            session, code, user_id, order_id, order.price or 0
        )
        if not is_valid:
            return False, reason

        # Update order with promo info
        order.promo_code = code.upper()
        order.promo_discount = discount

        await session.commit()

        return True, f"Промокод {code} успешно применен! Скидка {discount}%"

    @staticmethod
    async def create_promo_code(
        session: AsyncSession,
        code: str,
        percent: float,
        max_uses: int = 0,
        days_valid: int = 30,
        created_by: int = None
    ) -> PromoCode:
        """Create a new promo code"""
        # Enforce max discount
        percent = min(percent, MAX_DISCOUNT_PERCENT)

        valid_until = datetime.now(MSK_TZ) + timedelta(days=days_valid)

        new_promo = PromoCode(
            code=code.upper(),
            discount_percent=percent,
            max_uses=max_uses,
            valid_until=valid_until,
            created_by=created_by
        )
        session.add(new_promo)
        try:
            await session.commit()
            logger.info(f"[Promo] Created new promo: {code} ({percent}%)")
            return new_promo
        except Exception as e:
            await session.rollback()
            raise e
