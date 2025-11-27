from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                        ФИЛЬТРЫ
# ══════════════════════════════════════════════════════════════

def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


# ══════════════════════════════════════════════════════════════
#                        КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

def get_admin_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="👶 Режим новичка", callback_data="admin_newbie_mode")
        ],
    ])
    return kb


def get_admin_back_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                        ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.message(Command("admin"))
async def cmd_admin(message: Message):
    """Админ-панель"""
    if not is_admin(message.from_user.id):
        return

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь.
    После проверки нажми /start"""

    await message.answer(text, reply_markup=get_admin_keyboard())


@router.callback_query(F.data == "admin_panel")
async def show_admin_panel(callback: CallbackQuery):
    """Вернуться в админ-панель"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь.
    После проверки нажми /start"""

    await callback.message.edit_text(text, reply_markup=get_admin_keyboard())


@router.callback_query(F.data == "admin_newbie_mode")
async def enable_newbie_mode(callback: CallbackQuery, session: AsyncSession):
    """Включить режим новичка (сбросить принятие оферты)"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if user:
        # Сбрасываем принятие оферты
        user.terms_accepted_at = None
        await session.commit()

        text = """👶  <b>Режим новичка включён</b>

Твоя оферта сброшена. Теперь нажми /start
и увидишь флоу как новый пользователь.

<i>Голосовое и уведомления админам
также придут заново.</i>"""

    else:
        text = """❌  Пользователь не найден в БД.

Нажми /start чтобы создать запись."""

    await callback.answer()
    await callback.message.edit_text(text, reply_markup=get_admin_back_keyboard())
