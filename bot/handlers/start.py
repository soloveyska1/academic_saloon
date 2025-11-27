from aiogram import Router, Bot
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import get_start_keyboard
from core.config import settings

router = Router()


@router.message(CommandStart(deep_link=True))
async def cmd_start_with_ref(message: Message, command: CommandObject, session: AsyncSession, bot: Bot):
    """
    Хендлер /start с реферальной ссылкой.
    Формат: /start ref123456789
    """
    await process_start(message, session, bot, deep_link=command.args)


@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession, bot: Bot):
    """
    Хендлер /start без параметров.
    """
    await process_start(message, session, bot, deep_link=None)


async def process_start(message: Message, session: AsyncSession, bot: Bot, deep_link: str | None):
    """
    Основная логика регистрации и приветствия.
    """
    telegram_id = message.from_user.id
    
    # Поиск пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    is_new_user = user is None
    referrer: User | None = None

    if is_new_user:
        # Проверяем реферальную ссылку
        referrer_id = None
        if deep_link and deep_link.startswith("ref"):
            try:
                referrer_id = int(deep_link[3:])
                # Проверяем, что реферер существует и это не сам пользователь
                if referrer_id != telegram_id:
                    ref_query = select(User).where(User.telegram_id == referrer_id)
                    ref_result = await session.execute(ref_query)
                    referrer = ref_result.scalar_one_or_none()
            except ValueError:
                pass

        # Создаём нового пользователя
        user = User(
            telegram_id=telegram_id,
            username=message.from_user.username,
            fullname=message.from_user.full_name,
            role="user",
            referrer_id=referrer.telegram_id if referrer else None,
            deep_link=deep_link
        )
        session.add(user)
        
        # Увеличиваем счётчик рефералов у пригласившего
        if referrer:
            referrer.referrals_count += 1
        
        await session.commit()
        
        # Лог в канал
        await log_new_user(bot, message.from_user, referrer)
        
        # Уведомление админам
        await notify_admins(bot, message.from_user, referrer)

        # Текст для новичка
        if referrer:
            text = (
                f"🌵  <b>Добро пожаловать в Салун, {message.from_user.first_name}.</b>\n\n"
                f"Тебя привёл друг — поэтому на первый заказ\n"
                f"у тебя скидка <b>5%</b>.\n\n"
                f"<i>Выбирай, чем могу помочь:</i>"
            )
        else:
            text = (
                f"🌵  <b>Добро пожаловать в Салун, {message.from_user.first_name}.</b>\n\n"
                f"Здесь не задают лишних вопросов.\n"
                f"Если есть задачи — найдутся исполнители.\n\n"
                f"<i>Выбирай, чем могу помочь:</i>"
            )
    else:
        # Текст для постоянного гостя
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

    # Очистка старых Reply-кнопок
    cleanup_msg = await message.answer("⏳", reply_markup=ReplyKeyboardRemove())
    await cleanup_msg.delete()

    # Главное меню
    await message.answer(text, reply_markup=get_start_keyboard())


async def log_new_user(bot: Bot, user, referrer: User | None):
    """Лог в канал"""
    try:
        ref_info = f"\n◈  Пригласил: @{referrer.username}" if referrer else ""
        
        text = (
            f"🆕  <b>Новый пользователь</b>\n\n"
            f"◈  {user.full_name}\n"
            f"◈  @{user.username}\n"
            f"◈  ID: <code>{user.id}</code>"
            f"{ref_info}"
        )
        
        await bot.send_message(chat_id=settings.LOG_CHANNEL_ID, text=text)
    except Exception:
        pass


async def notify_admins(bot: Bot, user, referrer: User | None):
    """Уведомление админам"""
    ref_info = f" (от @{referrer.username})" if referrer else ""
    
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                chat_id=admin_id,
                text=f"🔥  Новый: {user.full_name} (@{user.username}){ref_info}"
            )
        except Exception:
            pass