"""
Promo Code Service — Bulletproof Logic

This service handles all promo code operations with:
- Atomic transactions to prevent race conditions
- Row-level locking for concurrent access
- Proper usage tracking and limits
- Support for promo code return on order cancellation
- User and admin notifications for promo events
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from zoneinfo import ZoneInfo
from aiogram import Bot

from database.models.promocodes import PromoCode, PromoCodeUsage
from database.models.orders import Order
from core.config import settings

logger = logging.getLogger(__name__)
MSK_TZ = ZoneInfo("Europe/Moscow")


class PromoValidationResult:
    """Result of promo code validation"""
    def __init__(
        self,
        is_valid: bool,
        message: str,
        discount_percent: float = 0.0,
        expires_at: Optional[datetime] = None,
        promo_id: Optional[int] = None
    ):
        self.is_valid = is_valid
        self.message = message
        self.discount_percent = discount_percent
        self.expires_at = expires_at
        self.promo_id = promo_id

    def to_tuple(self) -> tuple[bool, str, float, Optional[datetime]]:
        """Convert to tuple for backwards compatibility"""
        return (self.is_valid, self.message, self.discount_percent, self.expires_at)


class PromoService:
    """
    Service for managing promo codes with strict, bulletproof logic.

    Key principles:
    1. All checks use row-level locking to prevent race conditions
    2. Usage is recorded atomically with limit checks
    3. Promo codes can be returned when orders are cancelled
    4. No hardcoded fallbacks - all promos must be in database
    """

    @staticmethod
    async def get_promo_code(
        session: AsyncSession,
        code: str,
        for_update: bool = False
    ) -> Optional[PromoCode]:
        """
        Get promo code by code (case-insensitive).

        Args:
            session: Database session
            code: Promo code string
            for_update: If True, lock the row for atomic operations
        """
        stmt = select(PromoCode).where(
            func.upper(PromoCode.code) == code.upper().strip()
        )
        if for_update:
            stmt = stmt.with_for_update()

        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def validate_promo_code(
        session: AsyncSession,
        code: str,
        user_id: int
    ) -> tuple[bool, str, float, Optional[datetime]]:
        """
        Validate a promo code for a user.

        This is a READ-ONLY operation - it doesn't apply the promo or record usage.
        Use `apply_promo_to_order` to actually use the promo code.

        Args:
            session: Database session
            code: Promo code to validate
            user_id: Telegram user ID

        Returns:
            Tuple of (is_valid, message, discount_percent, expires_at)
        """
        code = code.upper().strip()

        if not code:
            return False, "Введите промокод", 0.0, None

        # Get promo code (no locking needed for validation)
        promo = await PromoService.get_promo_code(session, code, for_update=False)

        if not promo:
            logger.info(f"[PromoService] Code '{code}' not found for user {user_id}")
            return False, "Промокод не найден", 0.0, None

        # Check if active
        if not promo.is_active:
            return False, "Промокод неактивен", 0.0, None

        now = datetime.now(MSK_TZ)

        # Check validity period
        if promo.valid_from:
            valid_from = promo.valid_from.replace(tzinfo=MSK_TZ) if promo.valid_from.tzinfo is None else promo.valid_from
            if now < valid_from:
                return False, "Срок действия промокода ещё не наступил", 0.0, None

        if promo.valid_until:
            valid_until = promo.valid_until.replace(tzinfo=MSK_TZ) if promo.valid_until.tzinfo is None else promo.valid_until
            if now > valid_until:
                return False, "Срок действия промокода истёк", 0.0, None

        # Check usage limits
        if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
            return False, "Лимит использований исчерпан", 0.0, None

        # Check if promo is for new users only
        try:
            if promo.new_users_only:
                # Count user's completed orders (not cancelled/rejected)
                from database.models.orders import OrderStatus
                orders_count_stmt = select(func.count(Order.id)).where(
                    and_(
                        Order.user_id == user_id,
                        Order.work_type != 'support_chat',
                        Order.status.notin_([OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value])
                    )
                )
                orders_result = await session.execute(orders_count_stmt)
                orders_count = orders_result.scalar() or 0

                if orders_count > 0:
                    logger.info(f"[PromoService] Code '{code}' is new_users_only but user {user_id} has {orders_count} orders")
                    return False, "Этот промокод только для новых пользователей", 0.0, None
        except Exception as e:
            # Fallback if new_users_only column doesn't exist yet
            logger.warning(f"[PromoService] new_users_only check failed (column may not exist): {e}")

        # Check if user already used this promo
        # Try with is_active filter first (if migration applied), fall back to basic check
        try:
            usage_stmt = select(PromoCodeUsage).where(
                and_(
                    PromoCodeUsage.promocode_id == promo.id,
                    PromoCodeUsage.user_id == user_id,
                    PromoCodeUsage.is_active == True  # Only count active usages
                )
            )
            usage_result = await session.execute(usage_stmt)
            if usage_result.first():
                return False, "Вы уже использовали этот промокод", 0.0, None
        except Exception as e:
            # Fallback if is_active column doesn't exist (migration not applied)
            logger.warning(f"[PromoService] is_active query failed, using fallback: {e}")
            usage_stmt = select(PromoCodeUsage).where(
                and_(
                    PromoCodeUsage.promocode_id == promo.id,
                    PromoCodeUsage.user_id == user_id
                )
            )
            usage_result = await session.execute(usage_stmt)
            if usage_result.first():
                return False, "Вы уже использовали этот промокод", 0.0, None

        # Promo is valid!
        expires_at = promo.valid_until if promo.valid_until else None

        logger.info(f"[PromoService] Code '{code}' valid for user {user_id}: {promo.discount_percent}%")
        return True, "Промокод активен", promo.discount_percent, expires_at

    @staticmethod
    async def apply_promo_to_order(
        session: AsyncSession,
        order_id: int,
        code: str,
        user_id: int,
        base_price: float,
        bot: Optional[Bot] = None
    ) -> tuple[bool, str, float]:
        """
        Apply promo code to an order atomically.

        This method:
        1. Locks the promo code row
        2. Validates the promo again (race condition protection)
        3. Records the usage
        4. Increments usage counter
        5. Notifies admin if promo reaches max uses

        Args:
            session: Database session
            order_id: Order ID
            code: Promo code
            user_id: User's Telegram ID
            base_price: Base price to calculate savings
            bot: Bot instance for sending notifications (optional)

        Returns:
            Tuple of (success, message, discount_percent)
        """
        code = code.upper().strip()

        try:
            # Lock the promo code row for atomic operation
            promo = await PromoService.get_promo_code(session, code, for_update=True)

            if not promo:
                return False, "Промокод не найден", 0.0

            # Re-validate with lock held (prevents race conditions)
            if not promo.is_active:
                return False, "Промокод был деактивирован", 0.0

            now = datetime.now(MSK_TZ)

            if promo.valid_until:
                valid_until = promo.valid_until.replace(tzinfo=MSK_TZ) if promo.valid_until.tzinfo is None else promo.valid_until
                if now > valid_until:
                    return False, "Срок действия промокода истёк", 0.0

            if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                return False, "Лимит использований исчерпан", 0.0

            # Check if promo is for new users only
            try:
                if promo.new_users_only:
                    from database.models.orders import OrderStatus
                    orders_count_stmt = select(func.count(Order.id)).where(
                        and_(
                            Order.user_id == user_id,
                            Order.work_type != 'support_chat',
                            Order.status.notin_([OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value])
                        )
                    )
                    orders_result = await session.execute(orders_count_stmt)
                    orders_count = orders_result.scalar() or 0

                    if orders_count > 0:
                        return False, "Этот промокод только для новых пользователей", 0.0
            except Exception as e:
                logger.warning(f"[PromoService] new_users_only check failed in apply: {e}")

            # Check for existing usage (with lock to prevent double-apply)
            # Try with is_active filter, fall back if column doesn't exist
            try:
                usage_stmt = select(PromoCodeUsage).where(
                    and_(
                        PromoCodeUsage.promocode_id == promo.id,
                        PromoCodeUsage.user_id == user_id,
                        PromoCodeUsage.is_active == True
                    )
                ).with_for_update()
                usage_result = await session.execute(usage_stmt)
            except Exception:
                # Fallback without is_active filter
                usage_stmt = select(PromoCodeUsage).where(
                    and_(
                        PromoCodeUsage.promocode_id == promo.id,
                        PromoCodeUsage.user_id == user_id
                    )
                ).with_for_update()
                usage_result = await session.execute(usage_stmt)

            if usage_result.first():
                return False, "Вы уже использовали этот промокод", 0.0

            # Calculate discount amount
            discount_amount = base_price * (promo.discount_percent / 100.0)

            # Record usage (is_active will be ignored if column doesn't exist)
            usage = PromoCodeUsage(
                promocode_id=promo.id,
                user_id=user_id,
                order_id=order_id,
                discount_amount=discount_amount
            )
            # Try to set is_active if column exists
            try:
                usage.is_active = True
            except Exception:
                pass  # Column doesn't exist yet
            session.add(usage)

            # Increment usage counter
            old_uses = promo.current_uses
            promo.current_uses += 1

            # Commit atomically
            await session.flush()

            logger.info(
                f"[PromoService] Applied '{code}' to order #{order_id} for user {user_id}: "
                f"{promo.discount_percent}% (saved {discount_amount:.2f})"
            )

            # Check if promo has reached max uses and notify admins
            if bot and promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
                try:
                    admin_message = (
                        f"🚨 <b>Промокод исчерпан!</b>\n\n"
                        f"🎫 Код: <code>{promo.code}</code>\n"
                        f"📉 Скидка: {promo.discount_percent}%\n"
                        f"🔢 Использован: {promo.current_uses}/{promo.max_uses}\n\n"
                        f"Промокод достиг лимита использований и больше не может быть применён."
                    )

                    # Send to all admins
                    for admin_id in settings.ADMIN_IDS:
                        try:
                            await bot.send_message(
                                chat_id=admin_id,
                                text=admin_message
                            )
                        except Exception as e:
                            logger.warning(f"[PromoService] Failed to notify admin {admin_id}: {e}")

                    logger.info(f"[PromoService] Notified admins: promo '{code}' reached max uses")
                except Exception as e:
                    logger.error(f"[PromoService] Error sending admin notifications: {e}")

            # Check if promo is almost at limit (90%) and warn admins
            elif bot and promo.max_uses > 0:
                usage_percent = (promo.current_uses / promo.max_uses) * 100
                if usage_percent >= 90 and old_uses < promo.max_uses * 0.9:
                    try:
                        admin_message = (
                            f"⚠️ <b>Промокод почти исчерпан</b>\n\n"
                            f"🎫 Код: <code>{promo.code}</code>\n"
                            f"📉 Скидка: {promo.discount_percent}%\n"
                            f"🔢 Использовано: {promo.current_uses}/{promo.max_uses} ({usage_percent:.0f}%)\n\n"
                            f"Осталось {promo.max_uses - promo.current_uses} использований."
                        )

                        for admin_id in settings.ADMIN_IDS:
                            try:
                                await bot.send_message(
                                    chat_id=admin_id,
                                    text=admin_message
                                )
                            except Exception as e:
                                logger.warning(f"[PromoService] Failed to notify admin {admin_id}: {e}")

                        logger.info(f"[PromoService] Notified admins: promo '{code}' at 90% usage")
                    except Exception as e:
                        logger.error(f"[PromoService] Error sending admin warnings: {e}")

            return True, f"Промокод применён: скидка {promo.discount_percent}%", promo.discount_percent

        except Exception as e:
            logger.error(f"[PromoService] Error applying promo '{code}': {e}")
            await session.rollback()
            return False, "Ошибка применения промокода", 0.0

    @staticmethod
    async def return_promo_usage(
        session: AsyncSession,
        order_id: int,
        bot: Optional[Bot] = None
    ) -> tuple[bool, str]:
        """
        Return promo code usage when an order is cancelled.

        This allows the user to use the promo code again on a future order.
        Sends notification to user if bot is provided.

        Args:
            session: Database session
            order_id: ID of the cancelled order
            bot: Bot instance for sending notifications (optional)

        Returns:
            Tuple of (success, message)
        """
        try:
            # Find the usage record for this order
            # Try with is_active filter, fall back if column doesn't exist
            try:
                usage_stmt = select(PromoCodeUsage).where(
                    and_(
                        PromoCodeUsage.order_id == order_id,
                        PromoCodeUsage.is_active == True
                    )
                ).with_for_update()
                result = await session.execute(usage_stmt)
                usage = result.scalar_one_or_none()
            except Exception:
                # Fallback: just find by order_id (if is_active column doesn't exist)
                usage_stmt = select(PromoCodeUsage).where(
                    PromoCodeUsage.order_id == order_id
                ).with_for_update()
                result = await session.execute(usage_stmt)
                usage = result.scalar_one_or_none()

            if not usage:
                # No promo was used on this order
                return True, "Промокод не использовался"

            # Lock the promo code
            promo_stmt = select(PromoCode).where(
                PromoCode.id == usage.promocode_id
            ).with_for_update()

            promo_result = await session.execute(promo_stmt)
            promo = promo_result.scalar_one_or_none()

            if promo:
                # Decrement usage counter
                if promo.current_uses > 0:
                    promo.current_uses -= 1

            # Mark usage as inactive (soft delete) if columns exist
            try:
                usage.is_active = False
                usage.returned_at = datetime.now(MSK_TZ)
            except Exception:
                pass  # Columns don't exist yet

            await session.flush()

            logger.info(
                f"[PromoService] Returned promo usage for order #{order_id}: "
                f"code '{promo.code if promo else 'unknown'}'"
            )

            # Notify user about promo code return
            if bot and promo and usage.user_id:
                try:
                    message = (
                        f"🎫 <b>Промокод {promo.code} возвращён!</b>\n\n"
                        f"Ваш заказ #{order_id} был отменён, и промокод снова доступен для использования.\n\n"
                        f"💰 Скидка: <b>{promo.discount_percent}%</b>\n"
                        f"📅 Действителен до: {promo.valid_until.strftime('%d.%m.%Y') if promo.valid_until else 'Безлимитно'}\n\n"
                        f"Вы можете использовать его при следующем заказе."
                    )
                    await bot.send_message(
                        chat_id=usage.user_id,
                        text=message
                    )
                    logger.info(f"[PromoService] Sent promo return notification to user {usage.user_id}")
                except Exception as e:
                    logger.warning(f"[PromoService] Failed to send promo return notification: {e}")

            return True, "Промокод возвращён"

        except Exception as e:
            logger.error(f"[PromoService] Error returning promo for order #{order_id}: {e}")
            await session.rollback()
            return False, f"Ошибка возврата промокода: {str(e)}"

    @staticmethod
    async def check_promo_code(
        session: AsyncSession,
        code: str,
        user_id: int
    ) -> tuple[bool, str, float]:
        """
        Legacy method for backwards compatibility.
        Use `validate_promo_code` instead.
        """
        is_valid, message, discount, _ = await PromoService.validate_promo_code(
            session, code, user_id
        )
        return is_valid, message, discount

    @staticmethod
    async def create_promo_code(
        session: AsyncSession,
        code: str,
        percent: float,
        max_uses: int = 0,
        days_valid: int = 30,
        created_by: Optional[int] = None
    ) -> PromoCode:
        """
        Create a new promo code.

        Args:
            session: Database session
            code: Unique promo code
            percent: Discount percentage (0-100)
            max_uses: Maximum uses (0 = unlimited)
            days_valid: Days until expiration
            created_by: Admin user ID who created this

        Returns:
            Created PromoCode instance
        """
        code = code.upper().strip()

        # Validate discount
        if percent < 0 or percent > 100:
            raise ValueError(f"Discount must be 0-100%, got {percent}")

        valid_until = datetime.now(MSK_TZ) + timedelta(days=days_valid)

        new_promo = PromoCode(
            code=code,
            discount_percent=percent,
            max_uses=max_uses,
            current_uses=0,
            valid_until=valid_until,
            created_by=created_by,
            is_active=True
        )

        session.add(new_promo)

        try:
            await session.commit()
            await session.refresh(new_promo)

            logger.info(
                f"[PromoService] Created promo '{code}': {percent}%, "
                f"max_uses={max_uses}, valid_until={valid_until}"
            )

            return new_promo
        except Exception as e:
            await session.rollback()
            logger.error(f"[PromoService] Error creating promo '{code}': {e}")
            raise

    @staticmethod
    async def get_promo_stats(
        session: AsyncSession,
        promo_id: int
    ) -> dict:
        """
        Get usage statistics for a promo code.

        Returns:
            Dict with usage stats
        """
        promo = await session.get(PromoCode, promo_id)
        if not promo:
            return {}

        # Count active usages (with fallback if is_active column doesn't exist)
        try:
            active_count_stmt = select(func.count()).select_from(PromoCodeUsage).where(
                and_(
                    PromoCodeUsage.promocode_id == promo_id,
                    PromoCodeUsage.is_active == True
                )
            )
            active_result = await session.execute(active_count_stmt)
            active_count = active_result.scalar() or 0
        except Exception:
            # Fallback: count all usages
            active_count_stmt = select(func.count()).select_from(PromoCodeUsage).where(
                PromoCodeUsage.promocode_id == promo_id
            )
            active_result = await session.execute(active_count_stmt)
            active_count = active_result.scalar() or 0

        # Sum total savings (with fallback)
        try:
            savings_stmt = select(func.sum(PromoCodeUsage.discount_amount)).where(
                and_(
                    PromoCodeUsage.promocode_id == promo_id,
                    PromoCodeUsage.is_active == True
                )
            )
            savings_result = await session.execute(savings_stmt)
            total_savings = savings_result.scalar() or 0.0
        except Exception:
            # Fallback: sum all savings
            savings_stmt = select(func.sum(PromoCodeUsage.discount_amount)).where(
                PromoCodeUsage.promocode_id == promo_id
            )
            savings_result = await session.execute(savings_stmt)
            total_savings = savings_result.scalar() or 0.0

        return {
            "code": promo.code,
            "discount_percent": promo.discount_percent,
            "max_uses": promo.max_uses,
            "current_uses": promo.current_uses,
            "active_usages": active_count,
            "total_savings": float(total_savings),
            "is_active": promo.is_active,
            "valid_until": promo.valid_until,
        }

    @staticmethod
    async def ensure_default_promos(session: AsyncSession) -> None:
        """
        Ensure default promo codes exist in database.
        Call this on app startup to migrate from hardcoded promos.
        """
        default_promos = [
            {"code": "COWBOY20", "percent": 20, "max_uses": 0, "days_valid": 365},
            {"code": "SALOON10", "percent": 10, "max_uses": 0, "days_valid": 365},
            {"code": "WELCOME5", "percent": 5, "max_uses": 0, "days_valid": 365},
        ]

        for promo_data in default_promos:
            existing = await PromoService.get_promo_code(session, promo_data["code"])
            if not existing:
                try:
                    await PromoService.create_promo_code(
                        session,
                        code=promo_data["code"],
                        percent=promo_data["percent"],
                        max_uses=promo_data["max_uses"],
                        days_valid=promo_data["days_valid"],
                        created_by=None  # System-created
                    )
                    logger.info(f"[PromoService] Created default promo: {promo_data['code']}")
                except Exception as e:
                    logger.warning(f"[PromoService] Could not create default promo {promo_data['code']}: {e}")
