import asyncio

from aiogram import Router, Bot
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, ReplyKeyboardRemove, FSInputFile
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import get_main_menu_keyboard
from bot.keyboards.terms import get_terms_short_keyboard
from bot.texts.terms import (
    TERMS_SHORT,
    get_time_greeting,
    get_first_name,
    get_main_text,
    get_welcome_quote,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.daily_stats import get_live_stats_line
from core.config import settings
from core.saloon_status import saloon_manager, generate_status_message

router = Router()


async def send_and_pin_status(chat_id: int, bot: Bot, pin: bool = False):
    """
    Отправляет статус салуна.
    Закрепляет только если pin=True (для новых пользователей).
    """
    status = await saloon_manager.get_status()
    status_text = generate_status_message(status)

    # Отправляем сообщение со статусом
    status_msg = await bot.send_message(chat_id=chat_id, text=status_text)

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

        # Показываем оферту с картинкой
        photo = FSInputFile(settings.OFFER_IMAGE)
        await message.answer_photo(
            photo=photo,
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

        # Показываем оферту с картинкой
        photo = FSInputFile(settings.OFFER_IMAGE)
        await message.answer_photo(
            photo=photo,
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

    # === ДИАЛОГОВЫЙ ЭФФЕКТ ===

    # 1. Отправляем картинку (визуальный якорь)
    photo = FSInputFile(settings.WELCOME_IMAGE)
    await message.answer_photo(photo=photo)

    # 2. Typing... (создаёт ощущение живого общения)
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)
    await asyncio.sleep(1.2)

    # 3. Персонализированное приветствие по имени
    first_name = get_first_name(user.fullname)
    greeting = get_time_greeting(name=first_name)

    # 4. Получаем скидку пользователя
    _, discount = user.loyalty_status
    if user.referrer_id and user.orders_count == 0:
        discount = max(discount, 5)

    # 5. Живая статистика (социальное доказательство)
    stats_line = await get_live_stats_line()

    # 6. Основной текст + цитата
    main_text = get_main_text(stats_line=stats_line, discount=discount)
    quote = get_welcome_quote()

    # 7. Отправляем текст с кнопками (второе сообщение = диалог)
    full_text = f"{greeting}\n\n{main_text}{quote}"

    await message.answer(
        text=full_text,
        reply_markup=get_main_menu_keyboard()
    )
