from aiogram import Router, Bot, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, ReplyKeyboardRemove, CallbackQuery
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import get_main_menu_keyboard, get_saloon_status_keyboard
from bot.keyboards.terms import get_terms_short_keyboard
from bot.texts.terms import TERMS_SHORT
from bot.services.logger import log_action, LogEvent, LogLevel
from core.config import settings
from core.saloon_status import saloon_manager, generate_status_message
from core.media_cache import send_cached_photo


# New static welcome message - always available 24/7
WELCOME_MESSAGE = """Привет, партнер! Учеба прижала к стенке?

Мы здесь, чтобы прикрыть твою спину. Салун работает 24/7. Выбери, что нужно сделать, и мы найдем лучшего стрелка (автора) под твою задачу прямо сейчас.

👇 Жми на главную кнопку внизу."""

router = Router()


async def send_and_pin_status(chat_id: int, bot: Bot, pin: bool = False):
    """
    Отправляет статус салуна с интерактивными кнопками.
    Закрепляет только если pin=True (для новых пользователей).
    """
    status = await saloon_manager.get_status()
    status_text = generate_status_message(status)

    # Отправляем сообщение со статусом и кнопками
    status_msg = await bot.send_message(
        chat_id=chat_id,
        text=status_text,
        reply_markup=get_saloon_status_keyboard()
    )

    # Закрепляем только если явно указано
    if pin:
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                disable_notification=True
            )
        except Exception:
            pass


@router.message(CommandStart(deep_link=True))
async def cmd_start_with_ref(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Хендлер /start с реферальной ссылкой.
    Формат: /start ref123456789
    """
    await process_start(message, session, bot, state, deep_link=command.args)


@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Хендлер /start без параметров.
    """
    await process_start(message, session, bot, state, deep_link=None)


async def process_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext, deep_link: str | None):
    """
    Основная логика:
    - Новый пользователь → показать оферту
    - Не принял оферту → показать оферту
    - Принял оферту → главное меню
    """
    # Очищаем FSM состояние при /start
    await state.clear()

    telegram_id = message.from_user.id

    # Очистка старых Reply-кнопок
    cleanup_msg = await message.answer("⏳", reply_markup=ReplyKeyboardRemove())
    await cleanup_msg.delete()

    # Поиск пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    # Обработка реферальной ссылки для нового пользователя
    if user is None:
        referrer_id = None
        if deep_link and deep_link.startswith("ref"):
            try:
                potential_referrer_id = int(deep_link[3:])
                if potential_referrer_id != telegram_id:
                    # Проверяем существование реферера
                    ref_query = select(User).where(User.telegram_id == potential_referrer_id)
                    ref_result = await session.execute(ref_query)
                    referrer = ref_result.scalar_one_or_none()
                    if referrer:
                        referrer_id = potential_referrer_id
                        # Увеличиваем счётчик рефералов
                        referrer.referrals_count += 1
                        await session.commit()
            except ValueError:
                pass

        # Создаём пользователя БЕЗ принятия оферты
        user = User(
            telegram_id=telegram_id,
            username=message.from_user.username,
            fullname=message.from_user.full_name,
            role="user",
            referrer_id=referrer_id,
            deep_link=deep_link,
            terms_accepted_at=None,  # Оферта ещё не принята
        )
        session.add(user)
        await session.commit()

        # Логируем нового пользователя
        event = LogEvent.USER_START_REF if deep_link else LogEvent.USER_START
        extra = {"Реф-ссылка": deep_link} if deep_link else None
        await log_action(
            bot=bot,
            event=event,
            user=message.from_user,
            details="Новый пользователь, показана оферта",
            extra_data=extra,
            session=session,
            level=LogLevel.ACTION,
        )

        # Показываем оферту с картинкой (с кэшированием file_id)
        await send_cached_photo(
            bot=bot,
            chat_id=message.chat.id,
            photo_path=settings.OFFER_IMAGE,
            caption=TERMS_SHORT,
            reply_markup=get_terms_short_keyboard()
        )
        return

    # Пользователь существует, но не принял оферту
    if not user.has_accepted_terms:
        # Обновляем данные
        user.username = message.from_user.username
        user.fullname = message.from_user.full_name
        await session.commit()

        # Логируем возврат
        await log_action(
            bot=bot,
            event=LogEvent.USER_RETURN,
            user=message.from_user,
            details="Вернулся, оферта не принята",
            session=session,
        )

        # Показываем оферту с картинкой (с кэшированием file_id)
        await send_cached_photo(
            bot=bot,
            chat_id=message.chat.id,
            photo_path=settings.OFFER_IMAGE,
            caption=TERMS_SHORT,
            reply_markup=get_terms_short_keyboard()
        )
        return

    # Пользователь принял оферту — показываем главное меню
    user.username = message.from_user.username
    user.fullname = message.from_user.full_name
    await session.commit()

    # Логируем возврат активного пользователя
    await log_action(
        bot=bot,
        event=LogEvent.USER_RETURN,
        user=message.from_user,
        details="Вернулся в главное меню",
        session=session,
    )

    # === БЫСТРЫЙ ОТВЕТ — simplified, no dynamic stats ===

    # 1. Typing для визуального отклика
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)

    # 2. Отправляем новую картинку с текстом и кнопками (с кэшированием file_id)
    await send_cached_photo(
        bot=bot,
        chat_id=message.chat.id,
        photo_path=settings.WELCOME_IMAGE,
        caption=WELCOME_MESSAGE,
        reply_markup=get_main_menu_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    ОБНОВЛЕНИЕ СТАТУСА САЛУНА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "refresh_saloon_status")
async def refresh_saloon_status(callback: CallbackQuery):
    """
    Legacy handler for refresh button (now removed from UI).
    Kept for backwards compatibility if any old pinned messages exist.
    """
    status_text = generate_status_message()

    try:
        await callback.message.edit_text(
            text=status_text,
            reply_markup=get_saloon_status_keyboard()
        )
        await callback.answer("✅ Статус обновлён!")
    except Exception:
        await callback.answer("Статус актуален 👍")
