"""
Обработчики кнопок быстрых действий под логами.
Работают только в канале логов для админов.
"""

from datetime import datetime, timezone

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.services.logger import log_action, LogEvent, LogLevel, BotLogger
from bot.middlewares.ban_check import invalidate_ban_cache
from core.config import settings
from bot.utils.formatting import parse_callback_data

router = Router()


class NoteState(StatesGroup):
    """Состояние для добавления заметки"""
    waiting_for_note = State()


# ══════════════════════════════════════════════════════════════
#                    СЛЕЖКА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("log_watch:"))
async def toggle_watch(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Включить/выключить режим слежки за пользователем"""
    # Проверяем что это админ
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    user_id_str = parse_callback_data(callback.data, 1)
    if not user_id_str:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    user_id = int(user_id_str)

    # Получаем пользователя из БД
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    # Переключаем режим слежки
    user.is_watched = not user.is_watched
    await session.commit()

    status = "включена" if user.is_watched else "выключена"
    icon = "👀" if user.is_watched else "👁️‍🗨️"

    await callback.answer(f"{icon} Слежка {status}", show_alert=True)

    # Логируем действие
    logger = BotLogger(bot)
    await logger.log(
        event=LogEvent.USER_WATCH if user.is_watched else LogEvent.USER_UNWATCH,
        user=callback.from_user,
        details=f"{'Включил' if user.is_watched else 'Выключил'} слежку за ID {user_id}",
        level=LogLevel.CRITICAL,
    )


# ══════════════════════════════════════════════════════════════
#                    БАН
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("log_ban:"))
async def toggle_ban(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Забанить/разбанить пользователя"""
    # Проверяем что это админ
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    user_id_str = parse_callback_data(callback.data, 1)
    if not user_id_str:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    user_id = int(user_id_str)

    # Получаем пользователя из БД
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    # Переключаем бан
    if user.is_banned:
        # Разбаниваем
        user.is_banned = False
        user.banned_at = None
        user.ban_reason = None
        await session.commit()

        # Сбрасываем кэш бана
        await invalidate_ban_cache(user_id)

        await callback.answer("✅ Пользователь разбанен", show_alert=True)

        # Логируем
        logger = BotLogger(bot)
        await logger.log(
            event=LogEvent.USER_UNBAN,
            user=callback.from_user,
            details=f"Разбанил пользователя ID {user_id}",
            level=LogLevel.CRITICAL,
            silent=False,
        )
    else:
        # Баним
        user.is_banned = True
        user.banned_at = datetime.now(timezone.utc)
        await session.commit()

        # Сбрасываем кэш бана
        await invalidate_ban_cache(user_id)

        await callback.answer("🚫 Пользователь забанен", show_alert=True)

        # Логируем
        logger = BotLogger(bot)
        await logger.log(
            event=LogEvent.USER_BAN,
            user=callback.from_user,
            details=f"Забанил пользователя ID {user_id}",
            level=LogLevel.CRITICAL,
            silent=False,
        )


# ══════════════════════════════════════════════════════════════
#                    ЗАМЕТКИ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("log_note:"))
async def start_note(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Начать добавление заметки"""
    # Проверяем что это админ
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    user_id_str = parse_callback_data(callback.data, 1)
    if not user_id_str:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    user_id = int(user_id_str)

    # Получаем пользователя из БД
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    # Показываем текущую заметку если есть
    current_note = getattr(user, 'admin_notes', None) or "Заметок нет"

    await callback.answer("⏳")

    # Сохраняем user_id в состояние
    await state.set_state(NoteState.waiting_for_note)
    await state.update_data(note_user_id=user_id)

    await callback.message.answer(
        f"📌  <b>Заметка для ID {user_id}</b>\n\n"
        f"Текущая заметка:\n<i>{current_note}</i>\n\n"
        f"Напиши новую заметку или /cancel для отмены:"
    )


@router.message(NoteState.waiting_for_note, F.text == "/cancel")
async def cancel_note(message: Message, state: FSMContext):
    """Отмена добавления заметки"""
    await state.clear()
    await message.answer("❌ Отменено")


@router.message(NoteState.waiting_for_note, F.text)
async def save_note(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Сохранить заметку"""
    data = await state.get_data()
    user_id = data.get("note_user_id")

    if not user_id:
        await state.clear()
        await message.answer("❌ Ошибка: пользователь не найден")
        return

    # Получаем пользователя
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await state.clear()
        await message.answer("❌ Пользователь не найден")
        return

    # Сохраняем заметку
    user.admin_notes = message.text
    await session.commit()

    await state.clear()
    await message.answer(f"✅ Заметка сохранена для ID {user_id}")

    # Логируем
    logger = BotLogger(bot)
    await logger.log(
        event=LogEvent.USER_NOTE,
        user=message.from_user,
        details=f"Добавил заметку для ID {user_id}",
        extra_data={"Заметка": message.text[:100]},
        level=LogLevel.INFO,
    )


# ══════════════════════════════════════════════════════════════
#                    ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("log_info:"))
async def show_user_info(callback: CallbackQuery, session: AsyncSession):
    """Показать подробную информацию о пользователе"""
    # Проверяем что это админ
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    user_id_str = parse_callback_data(callback.data, 1)
    if not user_id_str:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    user_id = int(user_id_str)

    # Получаем пользователя из БД
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    await callback.answer("⏳")

    # Формируем информацию
    status, discount = user.loyalty_status
    watch_status = "👀 На слежке" if getattr(user, 'is_watched', False) else ""
    ban_status = "🚫 ЗАБАНЕН" if getattr(user, 'is_banned', False) else ""
    notes = getattr(user, 'admin_notes', None) or "—"

    text = f"""📋  <b>Профиль пользователя</b>

👤  <b>{user.fullname}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

📊  <b>Статистика</b>
◈  Заказов: {user.orders_count}
◈  Потрачено: {user.total_spent:.0f} ₽
◈  Баланс: {user.balance:.0f} ₽
◈  Рефералов: {user.referrals_count}

🏆  <b>Статус:</b> {status}
💰  <b>Скидка:</b> {discount}%

📌  <b>Заметки:</b>
{notes}

{watch_status}
{ban_status}

📅  Регистрация: {user.created_at.strftime('%d.%m.%Y') if user.created_at else '—'}"""

    await callback.message.answer(text.strip())


# ══════════════════════════════════════════════════════════════
#                    ОТВЕТ НА ЛОГ = СООБЩЕНИЕ ЮЗЕРУ
# ══════════════════════════════════════════════════════════════

import re

def extract_user_id_from_log(text: str) -> int | None:
    """Извлекает user_id из текста лога (ищет <code>ID</code>)"""
    if not text:
        return None
    # Ищем паттерн: · <code>123456789</code>
    match = re.search(r'·\s*<code>(\d+)</code>', text)
    if match:
        return int(match.group(1))
    return None


@router.message(F.reply_to_message, F.chat.id == settings.LOG_CHANNEL_ID)
async def reply_to_log(message: Message, bot: Bot):
    """
    Ответ на лог в канале = пересылка сообщения пользователю.
    Админ отвечает на лог → юзер получает сообщение от бота.
    """
    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    # Получаем текст оригинального лога
    original_text = message.reply_to_message.text or message.reply_to_message.caption
    user_id = extract_user_id_from_log(original_text)

    if not user_id:
        await message.reply("❌ Не удалось найти ID пользователя в логе")
        return

    # Формируем сообщение от имени бота
    admin_text = message.text or message.caption

    if not admin_text:
        await message.reply("❌ Пустое сообщение")
        return

    # Отправляем пользователю
    try:
        sent = await bot.send_message(
            chat_id=user_id,
            text=f"💬  <b>Сообщение от Хозяина:</b>\n\n{admin_text}"
        )
        await message.reply(f"✅ Отправлено пользователю {user_id}")

        # Логируем отправку
        await bot.send_message(
            chat_id=settings.LOG_CHANNEL_ID,
            text=f"📤  <b>Сообщение отправлено</b>\n\n"
                 f"👤  ID: <code>{user_id}</code>\n"
                 f"💬  {admin_text[:200]}",
            disable_notification=True,
        )

    except Exception as e:
        await message.reply(f"❌ Не удалось отправить: {e}")
