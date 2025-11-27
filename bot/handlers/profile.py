from aiogram import Router, F
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User

router = Router()

# Ловим нажатие текстовой кнопки "👤 Профиль"
@router.message(F.text == "👤 Профиль")
async def cmd_profile(message: Message, session: AsyncSession):
    telegram_id = message.from_user.id
    
    # Достаем свежие данные из базы
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        return await message.answer("Ошибка: Досье не найдено. Нажми /start")

    text = (
        f"📂 <b>ЛИЧНОЕ ДЕЛО №{user.id}</b>\n"
        f"➖➖➖➖➖➖➖➖➖➖\n"
        f"👤 <b>Имя:</b> {user.fullname}\n"
        f"💰 <b>Баланс:</b> {user.balance} RUB\n"
        f"📅 <b>Дата регистрации:</b> {user.created_at.strftime('%Y-%m-%d')}\n"
        f"➖➖➖➖➖➖➖➖➖➖\n"
        f"<i>Статус: {user.role}</i>"
    )
    
    await message.answer(text)