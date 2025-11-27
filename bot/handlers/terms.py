from datetime import datetime, timezone

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, FSInputFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.texts.terms import (
    TERMS_SHORT,
    TERMS_FULL_INTRO,
    TERMS_SECTIONS,
    TERMS_ACCEPTED,
    TERMS_ACCEPTED_RETURNING,
    get_time_greeting,
    VOICE_CAPTION,
)
from bot.keyboards.terms import (
    get_terms_short_keyboard,
    get_terms_full_keyboard,
    get_terms_section_keyboard,
)
from bot.keyboards.inline import get_start_keyboard, get_main_reply_keyboard
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ПРОСМОТР ОФЕРТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "terms_short")
async def show_terms_short(callback: CallbackQuery):
    """Показать краткую версию оферты"""
    await callback.answer()
    await callback.message.edit_text(TERMS_SHORT, reply_markup=get_terms_short_keyboard())


@router.callback_query(F.data == "terms_full")
async def show_terms_full(callback: CallbackQuery):
    """Показать меню полной оферты"""
    await callback.answer()
    await callback.message.edit_text(TERMS_FULL_INTRO, reply_markup=get_terms_full_keyboard())


@router.callback_query(F.data.startswith("terms_section:"))
async def show_terms_section(callback: CallbackQuery):
    """Показать конкретный раздел оферты"""
    await callback.answer()

    section_key = callback.data.split(":")[1]

    if section_key not in TERMS_SECTIONS:
        return

    _, section_text = TERMS_SECTIONS[section_key]
    await callback.message.edit_text(section_text, reply_markup=get_terms_section_keyboard(section_key))


@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    """Пустой обработчик для некликабельных кнопок"""
    await callback.answer()


# ══════════════════════════════════════════════════════════════
#                    ПРИНЯТИЕ ОФЕРТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "terms_accept")
async def accept_terms(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Принятие условий оферты"""
    await callback.answer("Условия приняты!")

    telegram_id = callback.from_user.id

    # Получаем пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    # Проверяем, принимал ли пользователь оферту раньше
    is_first_accept = user is None or user.terms_accepted_at is None

    if not user:
        # Создаём нового пользователя
        user = User(
            telegram_id=telegram_id,
            username=callback.from_user.username,
            fullname=callback.from_user.full_name,
            role="user",
            terms_accepted_at=datetime.now(timezone.utc),
        )
        session.add(user)
    else:
        # Обновляем дату принятия
        user.terms_accepted_at = datetime.now(timezone.utc)

    await session.commit()

    # Удаляем сообщение с офертой
    await callback.message.delete()

    # Формируем приветственное сообщение
    if is_first_accept:
        # Логируем нового пользователя
        await log_new_user(bot, callback.from_user, user)
        await notify_admins(bot, callback.from_user, user)

        # Новым пользователям: сначала текст-подводка, потом голосовое
        await callback.message.answer(VOICE_CAPTION)
        voice = FSInputFile(settings.WELCOME_VOICE)
        await callback.message.answer_voice(voice=voice)

    # Получаем приветствие по времени суток (МСК)
    text = get_time_greeting()

    # Отправляем видео с меню (зацикливается как анимация) + Reply клавиатура
    video = FSInputFile(settings.WELCOME_VIDEO)
    await callback.message.answer_animation(
        animation=video,
        caption=text,
        reply_markup=get_main_reply_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    СЛУЖЕБНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

async def log_new_user(bot: Bot, tg_user, db_user: User):
    """Лог нового пользователя в канал"""
    try:
        ref_info = ""
        if db_user.referrer_id:
            ref_info = f"\n◈  Пригласил: ID {db_user.referrer_id}"

        text = (
            f"🆕  <b>Новый партнёр</b>\n\n"
            f"◈  {tg_user.full_name}\n"
            f"◈  @{tg_user.username}\n"
            f"◈  ID: <code>{tg_user.id}</code>"
            f"{ref_info}"
        )

        await bot.send_message(chat_id=settings.LOG_CHANNEL_ID, text=text)
    except Exception:
        pass


async def notify_admins(bot: Bot, tg_user, db_user: User):
    """Уведомление админов о новом пользователе"""
    ref_info = f" (реферал)" if db_user.referrer_id else ""

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                chat_id=admin_id,
                text=f"🤝  Новый партнёр: {tg_user.full_name} (@{tg_user.username}){ref_info}"
            )
        except Exception:
            pass
