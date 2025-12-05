from aiogram import Router, F, types
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from sqlalchemy import select

from database.db import get_session
from database.models.promocodes import PromoCode
from database.models.users import User
from bot.services.promo_service import PromoService
from core.config import settings

router = Router()

# Filter for admin only
# Assuming there is an admin filter or checking IDs manually
def is_admin(user_id: int) -> bool:
    return user_id in settings.ADMIN_IDS

@router.message(Command("promo_create"), F.from_user.id.in_(settings.ADMIN_IDS))
async def cmd_promo_create(message: types.Message):
    """
    /promo_create <CODE> <PERCENT> <MAX_USES>
    """
    args = message.text.split()
    if len(args) < 3:
        await message.answer("⚠️ Формат: `/promo_create CODE PERCENT [MAX_USES]`")
        return

    code = args[1].upper()
    try:
        percent = float(args[2])
    except ValueError:
        await message.answer("⚠️ Процент должен быть числом.")
        return
        
    max_uses = int(args[3]) if len(args) > 3 else 0

    async for session in get_session():
        try:
            promo = await PromoService.create_promo_code(
                session, code, percent, max_uses, created_by=message.from_user.id
            )
            await message.answer(
                f"✅ **Промокод создан!**\n\n"
                f"🎫 Код: `{promo.code}`\n"
                f"📉 Скидка: {promo.discount_percent}%\n"
                f"🔢 Лимит: {'Безлимит' if promo.max_uses == 0 else promo.max_uses}\n"
                f"📅 Действует до: {promo.valid_until.strftime('%d.%m.%Y')}"
            )
        except Exception as e:
            await message.answer(f"❌ Ошибка: {str(e)}")

@router.message(Command("promo_list"), F.from_user.id.in_(settings.ADMIN_IDS))
async def cmd_promo_list(message: types.Message):
    """Список активных промокодов"""
    async for session in get_session():
        stmt = select(PromoCode).where(PromoCode.is_active == True).order_by(PromoCode.id.desc())
        result = await session.execute(stmt)
        promos = result.scalars().all()
        
        if not promos:
            await message.answer("Нет активных промокодов.")
            return
            
        text = "📋 **Активные промокоды:**\n\n"
        for p in promos:
            uses_text = f"{p.current_uses}/{p.max_uses}" if p.max_uses > 0 else f"{p.current_uses}"
            text += f"🎫 `{p.code}` — {p.discount_percent}% ({uses_text})\n"
            
        await message.answer(text)

@router.message(Command("promo_send"), F.from_user.id.in_(settings.ADMIN_IDS))
async def cmd_promo_send(message: types.Message, bot: types.Bot):
    """
    /promo_send <USER_ID> <CODE>
    Отправляет пользователю красивую карточку с промокодом.
    """
    args = message.text.split()
    if len(args) < 3:
        await message.answer("⚠️ Формат: `/promo_send USER_ID CODE`")
        return

    try:
        user_id = int(args[1])
        code = args[2]
    except ValueError:
        await message.answer("⚠️ Некорректные аргументы.")
        return

    async for session in get_session():
        promo = await PromoService.get_promo_code(session, code)
        if not promo:
            await message.answer("❌ Промокод не найден.")
            return
            
        # Отправка юзеру
        try:
            # Текст "Luxury" стиля
            user_text = (
                f"🎁 **Персональный подарок от Academic Saloon**\n\n"
                f"Мы ценим, что вы с нами. Для вашего следующего заказа мы подготовили особый бонус.\n\n"
                f"🎫 Ваш промокод: `{promo.code}`\n"
                f"📉 Скидка: **{promo.discount_percent}%**\n\n"
                f"💡 _Чтобы активировать, введите код при оплате заказа._"
            )
            
            # Можно отправить картинку (если есть в конфиге, например MENU_IMAGE или что-то подарочное)
            # Используем MENU_IMAGE как заглушку, или просто текст.
            # Если есть возможность, лучше использовать generate_image, но сейчас используем статику.
            
            await bot.send_photo(
                chat_id=user_id,
                photo=types.FSInputFile(path=settings.MENU_IMAGE),
                caption=user_text,
                parse_mode="Markdown"
            )
            
            await message.answer(f"✅ Промокод `{code}` успешно отправлен пользователю `{user_id}`.")
        except Exception as e:
            await message.answer(f"❌ Не удалось отправить: {str(e)}")
