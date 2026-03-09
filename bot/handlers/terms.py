from datetime import datetime, timezone

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery
from aiogram.fsm.context import FSMContext
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
)
from bot.keyboards.terms import (
    get_terms_short_keyboard,
    get_terms_full_keyboard,
    get_terms_section_keyboard,
)
from bot.keyboards.inline import get_start_keyboard
from bot.services.logger import log_action, LogEvent, LogLevel
from core.config import settings
from bot.handlers.menu import send_main_menu
from core.media_cache import send_cached_photo, get_cached_input_media_photo
from bot.utils.formatting import parse_callback_data

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ПРОСМОТР ОФЕРТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "terms_short")
async def show_terms_short(callback: CallbackQuery, bot: Bot):
    """Показать краткую версию оферты"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Оферта: краткая версия",
    )

    # Обновляем фото и caption (с кэшированием file_id)
    media = await get_cached_input_media_photo(settings.OFFER_IMAGE, caption=TERMS_SHORT)
    await callback.message.edit_media(media=media, reply_markup=get_terms_short_keyboard())


@router.callback_query(F.data == "terms_full")
async def show_terms_full(callback: CallbackQuery, bot: Bot):
    """Показать меню полной оферты"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Оферта: полная версия",
    )

    # Обновляем фото и caption (с кэшированием file_id)
    media = await get_cached_input_media_photo(settings.OFFER_IMAGE, caption=TERMS_FULL_INTRO)
    await callback.message.edit_media(media=media, reply_markup=get_terms_full_keyboard())


@router.callback_query(F.data.startswith("terms_section:"))
async def show_terms_section(callback: CallbackQuery, bot: Bot):
    """Показать конкретный раздел оферты"""
    await callback.answer("⏳")

    section_key = parse_callback_data(callback.data, 1)
    if not section_key or section_key not in TERMS_SECTIONS:
        return

    section_name, section_text = TERMS_SECTIONS[section_key]

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details=f"Оферта: раздел «{section_name}»",
    )

    # Обновляем фото и caption (с кэшированием file_id)
    media = await get_cached_input_media_photo(settings.OFFER_IMAGE, caption=section_text)
    await callback.message.edit_media(media=media, reply_markup=get_terms_section_keyboard(section_key))


@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    """Пустой обработчик для некликабельных кнопок"""
    await callback.answer("⏳")


# ══════════════════════════════════════════════════════════════
#                    ПРИНЯТИЕ ОФЕРТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.in_({"terms_accept", "accept_rules"}))
async def accept_terms(callback: CallbackQuery, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Принятие условий сервиса.

    Логика:
    1. Чистка: Удаляем сообщение с офертой (или редактируем если старое)
    2. Меню: Отправляем НОВОЕ сообщение с картинкой и главным меню
    3. Сброс: Очищаем FSM state от зависших диалогов
    """
    await callback.answer("🤝 Ударили по рукам!")

    telegram_id = callback.from_user.id
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id
    user_name = callback.from_user.full_name or "друг"

    # ═══ ШАГ А: ЧИСТКА — удаляем/редактируем сообщение с офертой ═══
    if callback.message:
        try:
            await callback.message.delete()
        except Exception:
            # Сообщение слишком старое — редактируем вместо удаления
            try:
                await callback.message.edit_text(
                    "✅ Правила приняты.",
                    reply_markup=None
                )
            except Exception:
                pass  # Уже удалено или недоступно

    # ═══ ШАГ В: СБРОС FSM — очищаем зависшие диалоги ═══
    await state.clear()

    # Получаем/создаём пользователя в БД
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

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

    # ═══ ШАГ Б: МЕНЮ — отправляем главное меню ═══
    if is_first_accept:
        # Логируем нового пользователя — ВАЖНОЕ событие
        ref_info = None
        if user.referrer_id:
            ref_info = {"Пригласил": f"ID {user.referrer_id}"}

        await log_action(
            bot=bot,
            event=LogEvent.USER_NEW,
            user=callback.from_user,
            details="Принял условия, новый пользователь",
            extra_data=ref_info,
            session=session,
            level=LogLevel.ACTION,
            silent=False,  # Со звуком!
        )

        # Новым пользователям: главное меню с закрепом
        await send_main_menu(
            chat_id=chat_id,
            bot=bot,
            user_name=user_name,
            pin=True,
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

        # Возвращающимся пользователям: сразу главное меню
        await send_main_menu(
            chat_id=chat_id,
            bot=bot,
            user_name=user_name,
        )


