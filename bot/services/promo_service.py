from datetime import datetime
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from zoneinfo import ZoneInfo

from database.models.promocodes import PromoCode, PromoCodeUsage
from database.models.orders import Order

MSK_TZ = ZoneInfo("Europe/Moscow")

class PromoService:
    @staticmethod
    async def get_promo_code(session: AsyncSession, code: str) -> PromoCode | None:
        """Получить промокод по коду (case-insensitive)"""
        stmt = select(PromoCode).where(func.lower(PromoCode.code) == code.lower())
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def check_promo_code(session: AsyncSession, code: str, user_id: int) -> tuple[bool, str, float]:
        """
        Проверка промокода.
        Возвращает: (valid: bool, reason: str, discount_percent: float)
        """
        promo = await PromoService.get_promo_code(session, code)
        
        if not promo:
            return False, "Промокод не найден", 0.0
            
        if not promo.is_active:
            return False, "Промокод неактивен", 0.0
            
        now = datetime.now(MSK_TZ)
        
        # Проверка сроков
        if promo.valid_from:
            valid_from = promo.valid_from.replace(tzinfo=MSK_TZ) if promo.valid_from.tzinfo is None else promo.valid_from
            if now < valid_from:
                return False, "Срок действия промокода еще не наступил", 0.0
                
        if promo.valid_until:
            valid_until = promo.valid_until.replace(tzinfo=MSK_TZ) if promo.valid_until.tzinfo is None else promo.valid_until
            if now > valid_until:
                return False, "Срок действия промокода истек", 0.0
                
        # Проверка лимитов
        if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
            return False, "Лимит использований исчерпан", 0.0
            
        # Проверка повторного использования юзером (опционально, можно добавить флаг в модель, но пока запретим)
        # Если нужно разрешить многократное использование одним юзером - убрать эту проверку
        stmt = select(PromoCodeUsage).where(
            PromoCodeUsage.promocode_id == promo.id,
            PromoCodeUsage.user_id == user_id
        )
        usage = await session.execute(stmt)
        if usage.first():
            return False, "Вы уже использовали этот промокод", 0.0
            
        return True, "Промокод активен", promo.discount_percent

    @staticmethod
    async def apply_promo_code(session: AsyncSession, order_id: int, code: str, user_id: int) -> tuple[bool, str]:
        """
        Применить промокод к заказу.
        """
        # 1. Снова проверяем валидность (на всякий случай)
        is_valid, reason, _ = await PromoService.check_promo_code(session, code, user_id)
        if not is_valid:
            return False, reason
            
        promo = await PromoService.get_promo_code(session, code)
        order_stmt = select(Order).where(Order.id == order_id)
        result = await session.execute(order_stmt)
        order = result.scalar_one_or_none()
        
        if not order:
            return False, "Заказ не найден"
            
        # 2. Применяем скидку
        # Скидка применяется к текущей цене (order.price)
        # Если уже есть скидка (order.discount), мы можем заменить её или сложить.
        # В этой реализации мы ЗАМЕНЯЕМ скидку, если новая больше, или складываем?
        # Обычно промокод дает доп скидку или фиксированную.
        # Давайте сделаем так: Promocode sets the discount to the code's percent if it's higher than current?
        # Or let's assume `order.discount` handles all discounts.
        # Let's ADD the promo discount to existing loyalty discount? Or just replace?
        # "Quality" system: Usually promo codes stacks or replaces. Let's make it simple: replace if higher, or just set it.
        # But wait, `order.discount` field exists.
        # Let's set `order.discount` = `promo.discount_percent`.
        
        # Calculate amount saved
        saved_amount = order.price * (promo.discount_percent / 100.0)
        
        # Update order
        order.discount = promo.discount_percent
        # order.price stays the same (base price), final_price property handles the calculation.
        
        # Update promo usage stats
        promo.current_uses += 1
        
        # Record usage
        usage = PromoCodeUsage(
            promocode_id=promo.id,
            user_id=user_id,
            order_id=order.id,
            discount_amount=saved_amount
        )
        session.add(usage)
        await session.commit()
        
        return True, f"Промокод {code} успешно применен! Скидка {promo.discount_percent}%"

    @staticmethod
    async def create_promo_code(
        session: AsyncSession, 
        code: str, 
        percent: float, 
        max_uses: int = 0, 
        days_valid: int = 30,
        created_by: int = None
    ) -> PromoCode:
        from datetime import timedelta
        
        valid_until = datetime.now(MSK_TZ) + timedelta(days=days_valid)
        
        new_promo = PromoCode(
            code=code,
            discount_percent=percent,
            max_uses=max_uses,
            valid_until=valid_until,
            created_by=created_by
        )
        session.add(new_promo)
        try:
            await session.commit()
            return new_promo
        except Exception as e:
            await session.rollback()
            raise e
