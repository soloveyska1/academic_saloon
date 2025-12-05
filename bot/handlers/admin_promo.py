from aiogram import Router, F, types, Bot
from aiogram.filters import Command, CommandObject
from sqlalchemy import select

from database.db import get_session
from database.models.promocodes import PromoCode
from bot.services.promo_service import PromoService
from core.config import settings

router = Router()

@router.message(Command("promo_create"), F.from_user.id.in_(settings.ADMIN_IDS))
async def cmd_promo_create(message: types.Message, command: CommandObject):
    """
    /promo_create <CODE> <PERCENT> [MAX_USES]
    """
    if not command.args:
        await message.answer("⚠️ Формат: `/promo_create CODE PERCENT [MAX_USES]`")
        return

    try:
        args = command.args.split()
        if len(args) < 2:
            raise ValueError("Мало аргументов")

        code = args[0].upper()
        percent = float(args[1])
        max_uses = int(args[2]) if len(args) > 2 else 0
        
        if not (0 < percent <= 100):
            await message.answer("⚠️ Процент скидки должен быть от 1 до 100.")
            return

    except ValueError:
        await message.answer("⚠️ Ошибка в формате данных. Пример: `/promo_create SUMMER 20 100`")
        return

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
            await message.answer(f"❌ Ошибка при создании: {str(e)}")

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
async def cmd_promo_send(message: types.Message, command: CommandObject, bot: Bot):
    """
    /promo_send <USER_ID> <CODE>
    """
    if not command.args:
        await message.answer("⚠️ Формат: `/promo_send USER_ID CODE`")
        return

    try:
        args = command.args.split()
        if len(args) < 2:
            raise ValueError("Мало аргументов")

        user_id = int(args[0])
        code = args[1].upper()
    except ValueError:
        await message.answer("⚠️ Некорректные данные. ID пользователя должен быть числом.")
        return

    async for session in get_session():
        promo = await PromoService.get_promo_code(session, code)
        if not promo:
            await message.answer("❌ Промокод не найден.")
            return
            
        try:
            user_text = (
                f"🎁 **Персональный подарок от Academic Saloon**\n\n"
                f"Мы ценим, что вы с нами. Для вашего следующего заказа мы подготовили особый бонус.\n\n"
                f"🎫 Ваш промокод: `{promo.code}`\n"
                f"📉 Скидка: **{promo.discount_percent}%**\n\n"
                f"💡 _Чтобы активировать, введите код при оплате заказа._"
            )
            
            # Используем safe send (если картинки нет - просто текст)
            try:
                if settings.MENU_IMAGE:
                     await bot.send_photo(
                        chat_id=user_id,
                        photo=types.FSInputFile(path=settings.MENU_IMAGE),
                        caption=user_text,
                        parse_mode="Markdown"
                    )
                else:
                    await bot.send_message(user_id, user_text, parse_mode="Markdown")
            except Exception:
                 # Fallback if image fails
                 await bot.send_message(user_id, user_text, parse_mode="Markdown")
            
            await message.answer(f"✅ Промокод `{code}` отправлен пользователю `{user_id}`.")
        except Exception as e:
            await message.answer(f"❌ Не удалось отправить (возможно, бот заблокирован пользователем): {str(e)}")
