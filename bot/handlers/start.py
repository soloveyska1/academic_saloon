from aiogram import Router, Bot
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, ReplyKeyboardRemove, FSInputFile
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import get_start_keyboard
from bot.keyboards.terms import get_terms_short_keyboard
from bot.texts.terms import TERMS_SHORT
from core.config import settings

router = Router()


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

        # Показываем оферту
        await message.answer(TERMS_SHORT, reply_markup=get_terms_short_keyboard())
        return

    # Пользователь существует, но не принял оферту
    if not user.has_accepted_terms:
        # Обновляем данные
        user.username = message.from_user.username
        user.fullname = message.from_user.full_name
        await session.commit()

        await message.answer(TERMS_SHORT, reply_markup=get_terms_short_keyboard())
        return

    # Пользователь принял оферту — показываем главное меню
    user.username = message.from_user.username
    user.fullname = message.from_user.full_name
    await session.commit()

    status, discount = user.loyalty_status

    if discount > 0:
        text = (
            f"🍸  <b>С возвращением, {user.fullname}.</b>\n\n"
            f"{status}\n"
            f"Твоя скидка — {discount}%\n\n"
            f"<i>Чем могу помочь?</i>"
        )
    else:
        text = (
            f"🍸  <b>С возвращением, {user.fullname}.</b>\n\n"
            f"Твой столик свободен.\n\n"
            f"<i>Чем могу помочь?</i>"
        )

    # Отправляем гифку с приветствием
    gif = FSInputFile(settings.WELCOME_GIF)
    await message.answer_animation(animation=gif, caption=text, reply_markup=get_start_keyboard())
