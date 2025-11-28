from datetime import datetime, timezone

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, FSInputFile, InputMediaPhoto
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
    VOICE_TEASER,
    VOICE_CAPTION,
)
from bot.keyboards.terms import (
    get_terms_short_keyboard,
    get_terms_full_keyboard,
    get_terms_section_keyboard,
)
from bot.keyboards.inline import get_start_keyboard, get_main_menu_keyboard, get_voice_teaser_keyboard
from bot.services.logger import log_action, LogEvent, LogLevel
from core.config import settings
from bot.handlers.start import send_and_pin_status

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ПРОСМОТР ОФЕРТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "terms_short")
async def show_terms_short(callback: CallbackQuery, bot: Bot):
    """Показать краткую версию оферты"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Оферта: краткая версия",
    )

    # Обновляем фото и caption
    photo = FSInputFile(settings.OFFER_IMAGE)
    media = InputMediaPhoto(media=photo, caption=TERMS_SHORT)
    await callback.message.edit_media(media=media, reply_markup=get_terms_short_keyboard())


@router.callback_query(F.data == "terms_full")
async def show_terms_full(callback: CallbackQuery, bot: Bot):
    """Показать меню полной оферты"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Оферта: полная версия",
    )

    # Обновляем фото и caption
    photo = FSInputFile(settings.OFFER_IMAGE)
    media = InputMediaPhoto(media=photo, caption=TERMS_FULL_INTRO)
    await callback.message.edit_media(media=media, reply_markup=get_terms_full_keyboard())


@router.callback_query(F.data.startswith("terms_section:"))
async def show_terms_section(callback: CallbackQuery, bot: Bot):
    """Показать конкретный раздел оферты"""
    await callback.answer()

    section_key = callback.data.split(":")[1]

    if section_key not in TERMS_SECTIONS:
        return

    section_name, section_text = TERMS_SECTIONS[section_key]

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details=f"Оферта: раздел «{section_name}»",
    )

    # Обновляем фото и caption
    photo = FSInputFile(settings.OFFER_IMAGE)
    media = InputMediaPhoto(media=photo, caption=section_text)
    await callback.message.edit_media(media=media, reply_markup=get_terms_section_keyboard(section_key))


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
        # Логируем нового пользователя — ВАЖНОЕ событие
        ref_info = None
        if user.referrer_id:
            ref_info = {"Пригласил": f"ID {user.referrer_id}"}

        await log_action(
            bot=bot,
            event=LogEvent.USER_NEW,
            user=callback.from_user,
            details="Принял оферту, новый партнёр",
            extra_data=ref_info,
            session=session,
            level=LogLevel.ACTION,
            silent=False,  # Со звуком!
        )

        # Новым пользователям: интрига с кнопкой для голосового
        await callback.message.answer(
            VOICE_TEASER,
            reply_markup=get_voice_teaser_keyboard()
        )
    else:
        # Логируем повторное принятие
        await log_action(
            bot=bot,
            event=LogEvent.USER_TERMS_ACCEPT,
            user=callback.from_user,
            details="Повторно принял оферту",
            session=session,
        )

    # Получаем приветствие по времени суток (МСК)
    text = get_time_greeting()

    # Отправляем картинку с меню + Inline клавиатура
    photo = FSInputFile(settings.WELCOME_IMAGE)
    await callback.message.answer_photo(
        photo=photo,
        caption=text,
        reply_markup=get_main_menu_keyboard()
    )

    # Статус салуна с закрепом — только для НОВЫХ пользователей (один раз)
    if is_first_accept:
        await send_and_pin_status(callback.message.chat.id, bot, pin=True)


# ══════════════════════════════════════════════════════════════
#                    ГОЛОСОВОЕ ПРИВЕТСТВИЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "play_welcome_voice")
async def play_welcome_voice(callback: CallbackQuery, bot: Bot):
    """Отправляет голосовое приветствие по нажатию кнопки"""
    await callback.answer()

    # Удаляем сообщение с кнопкой
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем голосовое
    voice = FSInputFile(settings.WELCOME_VOICE)
    await callback.message.answer_voice(voice=voice, caption=VOICE_CAPTION)

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Прослушал голосовое приветствие",
    )
