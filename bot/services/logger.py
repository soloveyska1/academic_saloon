"""
Система логирования действий пользователей.
Все логи отправляются в канал LOG_CHANNEL_ID.
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Optional
import pytz

from aiogram import Bot
from aiogram.types import User as TgUser, InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from database.models.users import User


# Московское время
MSK = pytz.timezone("Europe/Moscow")


class LogLevel(Enum):
    """Уровни важности логов"""
    INFO = "info"           # Обычные действия (кнопки, навигация)
    ACTION = "action"       # Важные действия (заказ, сообщение)
    WARNING = "warning"     # Предупреждения (подозрительная активность)
    ERROR = "error"         # Ошибки
    CRITICAL = "critical"   # Критические события (бан, мут)


class LogEvent(Enum):
    """Типы событий для логирования"""
    # Пользователь
    USER_START = "user_start"
    USER_START_REF = "user_start_ref"
    USER_NEW = "user_new"
    USER_RETURN = "user_return"
    USER_TERMS_ACCEPT = "user_terms_accept"

    # Навигация
    NAV_BUTTON = "nav_button"
    NAV_MENU = "nav_menu"

    # Заказы
    ORDER_START = "order_start"
    ORDER_STEP = "order_step"
    ORDER_CONFIRM = "order_confirm"
    ORDER_CANCEL = "order_cancel"
    ORDER_ABANDONED = "order_abandoned"

    # Коммуникация
    MESSAGE_TEXT = "message_text"
    MESSAGE_MEDIA = "message_media"

    # Модерация
    USER_BAN = "user_ban"
    USER_UNBAN = "user_unban"
    USER_MUTE = "user_mute"
    USER_UNMUTE = "user_unmute"
    USER_WATCH = "user_watch"
    USER_UNWATCH = "user_unwatch"
    USER_NOTE = "user_note"

    # Бонусы
    BONUS_ADDED = "bonus_added"
    BONUS_DEDUCTED = "bonus_deducted"

    # Система
    ERROR = "error"
    SPAM_DETECTED = "spam_detected"
    STOP_WORD = "stop_word"


# Иконки для событий
EVENT_ICONS = {
    LogEvent.USER_START: "🚀",
    LogEvent.USER_START_REF: "🔗",
    LogEvent.USER_NEW: "🆕",
    LogEvent.USER_RETURN: "👋",
    LogEvent.USER_TERMS_ACCEPT: "✅",

    LogEvent.NAV_BUTTON: "🔘",
    LogEvent.NAV_MENU: "📱",

    LogEvent.ORDER_START: "📝",
    LogEvent.ORDER_STEP: "▸",
    LogEvent.ORDER_CONFIRM: "✅",
    LogEvent.ORDER_CANCEL: "❌",
    LogEvent.ORDER_ABANDONED: "🚪",

    LogEvent.MESSAGE_TEXT: "💬",
    LogEvent.MESSAGE_MEDIA: "📎",

    LogEvent.USER_BAN: "🚫",
    LogEvent.USER_UNBAN: "✅",
    LogEvent.USER_MUTE: "🔇",
    LogEvent.USER_UNMUTE: "🔔",
    LogEvent.USER_WATCH: "👀",
    LogEvent.USER_UNWATCH: "👁️‍🗨️",
    LogEvent.USER_NOTE: "📌",

    LogEvent.BONUS_ADDED: "💎",
    LogEvent.BONUS_DEDUCTED: "💸",

    LogEvent.ERROR: "❌",
    LogEvent.SPAM_DETECTED: "🤖",
    LogEvent.STOP_WORD: "🚨",
}

# Названия событий на русском
EVENT_NAMES = {
    LogEvent.USER_START: "Запуск бота",
    LogEvent.USER_START_REF: "Запуск по реф-ссылке",
    LogEvent.USER_NEW: "Новый пользователь",
    LogEvent.USER_RETURN: "Вернулся в бота",
    LogEvent.USER_TERMS_ACCEPT: "Принял оферту",

    LogEvent.NAV_BUTTON: "Нажал кнопку",
    LogEvent.NAV_MENU: "Открыл меню",

    LogEvent.ORDER_START: "Начал заказ",
    LogEvent.ORDER_STEP: "Шаг заказа",
    LogEvent.ORDER_CONFIRM: "Подтвердил заказ",
    LogEvent.ORDER_CANCEL: "Отменил заказ",
    LogEvent.ORDER_ABANDONED: "Бросил заказ",

    LogEvent.MESSAGE_TEXT: "Написал сообщение",
    LogEvent.MESSAGE_MEDIA: "Отправил медиа",

    LogEvent.USER_BAN: "Заблокирован",
    LogEvent.USER_UNBAN: "Разблокирован",
    LogEvent.USER_MUTE: "Замучен",
    LogEvent.USER_UNMUTE: "Размучен",
    LogEvent.USER_WATCH: "На слежке",
    LogEvent.USER_UNWATCH: "Снят со слежки",
    LogEvent.USER_NOTE: "Добавлена заметка",

    LogEvent.BONUS_ADDED: "Начислены бонусы",
    LogEvent.BONUS_DEDUCTED: "Списаны бонусы",

    LogEvent.ERROR: "Ошибка",
    LogEvent.SPAM_DETECTED: "Обнаружен спам",
    LogEvent.STOP_WORD: "Стоп-слово",
}


class BotLogger:
    """Основной класс для логирования"""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.channel_id = settings.LOG_CHANNEL_ID

    @staticmethod
    def get_user_link(user: TgUser) -> str:
        """Генерирует кликабельную ссылку на пользователя"""
        name = user.full_name or "Без имени"
        # tg://user?id=XXX — работает для открытия профиля
        return f'<a href="tg://user?id={user.id}">{name}</a>'

    @staticmethod
    def get_user_mention(user: TgUser) -> str:
        """Генерирует @username или ссылку если нет юзернейма"""
        if user.username:
            return f"@{user.username}"
        return f'<a href="tg://user?id={user.id}">написать</a>'

    @staticmethod
    def get_msk_time() -> str:
        """Возвращает текущее время в МСК"""
        now = datetime.now(MSK)
        return now.strftime("%d.%m.%Y %H:%M")

    @staticmethod
    def get_action_keyboard(user_id: int, topic_id: int = None, order_id: int = None) -> InlineKeyboardMarkup:
        """
        Клавиатура быстрых действий под логом.

        Args:
            user_id: ID пользователя Telegram
            topic_id: ID топика (если есть) для кнопки "Открыть чат"
            order_id: ID заказа (если есть) для кнопки "Открыть чат"
        """
        buttons = []

        # Первый ряд: Написать и Инфо
        row1 = [
            InlineKeyboardButton(
                text="💬 Написать",
                url=f"tg://user?id={user_id}"
            ),
            InlineKeyboardButton(
                text="📋 Инфо",
                callback_data=f"log_info:{user_id}"
            ),
        ]
        buttons.append(row1)

        # Если есть топик — добавляем кнопку "Открыть чат"
        if topic_id:
            group_id = str(settings.ADMIN_GROUP_ID).replace("-100", "")
            topic_link = f"https://t.me/c/{group_id}/{topic_id}"
            buttons.append([
                InlineKeyboardButton(
                    text="💬 Открыть чат в топике",
                    url=topic_link
                ),
            ])

        # Второй ряд: Слежка и Заметка
        buttons.append([
            InlineKeyboardButton(
                text="👀 Слежка",
                callback_data=f"log_watch:{user_id}"
            ),
            InlineKeyboardButton(
                text="📌 Заметка",
                callback_data=f"log_note:{user_id}"
            ),
        ])

        # Третий ряд: Бан
        buttons.append([
            InlineKeyboardButton(
                text="🚫 Бан",
                callback_data=f"log_ban:{user_id}"
            ),
        ])

        return InlineKeyboardMarkup(inline_keyboard=buttons)

    @staticmethod
    def get_error_keyboard() -> InlineKeyboardMarkup:
        """Клавиатура под ошибкой"""
        return InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔄 Подробнее",
                    callback_data="log_error_details"
                ),
            ],
        ])

    @staticmethod
    def get_user_tags(user) -> list[str]:
        """Генерирует авто-теги для пользователя"""
        tags = []

        # По количеству заказов
        if user.orders_count >= 10:
            tags.append("👑 VIP")
        elif user.orders_count >= 5:
            tags.append("⭐ Постоянный")
        elif user.orders_count == 0:
            tags.append("🌱 Новичок")

        # По сумме
        if user.total_spent >= 50000:
            tags.append("💎 Крупный")

        # По рефералам
        if user.referrals_count >= 3:
            tags.append("📢 Амбассадор")

        # Проблемный (если есть заметки с ключевыми словами)
        notes = getattr(user, 'admin_notes', '') or ''
        if any(w in notes.lower() for w in ['проблем', 'жалоб', 'возврат', 'конфликт']):
            tags.append("⚠️ Проблемный")

        # Забанен
        if getattr(user, 'is_banned', False):
            tags.append("🚫 Бан")

        return tags

    async def _get_user_stats(
        self, user_id: int, session: Optional[AsyncSession] = None, order_id: int = None
    ) -> tuple[str, bool, Optional[int]]:
        """
        Получает статистику пользователя из БД.

        Returns:
            (stats_str, is_watched, topic_id) — строка статистики, флаг слежки, ID топика
        """
        if not session:
            return "", False, None

        topic_id = None
        try:
            query = select(User).where(User.telegram_id == user_id)
            result = await session.execute(query)
            user = result.scalar_one_or_none()

            # Пытаемся найти topic_id для последнего диалога пользователя
            try:
                from database.models.orders import Conversation
                conv_query = select(Conversation).where(
                    Conversation.user_id == user_id
                )
                if order_id:
                    conv_query = conv_query.where(Conversation.order_id == order_id)
                conv_query = conv_query.order_by(Conversation.last_message_at.desc()).limit(1)
                conv_result = await session.execute(conv_query)
                conv = conv_result.scalar_one_or_none()
                if conv and conv.topic_id:
                    topic_id = conv.topic_id
            except Exception:
                pass

            if user:
                status, discount = user.loyalty_status
                stats = f"📊  Заказов: {user.orders_count}"
                if user.balance > 0:
                    stats += f" · Баланс: {user.balance:.0f}₽"
                if discount > 0:
                    stats += f" · Скидка: {discount}%"

                # Авто-теги
                tags = self.get_user_tags(user)
                if tags:
                    stats += f"\n🏷  {' · '.join(tags)}"

                # Добавляем метку если пользователь на слежке
                # (безопасная проверка - поле может не существовать)
                is_watched = getattr(user, 'is_watched', False)
                if is_watched:
                    stats += "\n👀  <b>НА СЛЕЖКЕ</b>"

                return stats, is_watched, topic_id
        except Exception:
            pass

        return "", False, None

    async def log(
        self,
        event: LogEvent,
        user: TgUser,
        details: Optional[str] = None,
        extra_data: Optional[dict] = None,
        session: Optional[AsyncSession] = None,
        level: LogLevel = LogLevel.INFO,
        silent: bool = True,
        order_id: Optional[int] = None,
    ) -> Optional[int]:
        """
        Отправляет лог в канал.

        Args:
            event: Тип события
            user: Telegram пользователь
            details: Дополнительные детали
            extra_data: Дополнительные данные (словарь)
            session: Сессия БД для получения статистики
            level: Уровень важности
            silent: Без звука (True) или со звуком (False)
            order_id: ID заказа (для навигации в топик)

        Returns:
            message_id отправленного лога или None при ошибке
        """
        try:
            icon = EVENT_ICONS.get(event, "📋")
            event_name = EVENT_NAMES.get(event, event.value)

            # Формируем сообщение
            user_link = self.get_user_link(user)
            user_mention = self.get_user_mention(user)
            time_str = self.get_msk_time()

            # Статистика из БД, флаг слежки и topic_id
            stats, is_watched, topic_id = await self._get_user_stats(user.id, session, order_id)

            # Основной текст
            text_parts = [
                f"{icon}  <b>{event_name}</b>",
                "",
                f"👤  {user_link}",
                f"🔗  {user_mention} · <code>{user.id}</code>",
            ]

            # Статистика из БД
            if stats:
                text_parts.append(stats)

            # Детали события
            if details:
                text_parts.append("")
                text_parts.append(f"▸  {details}")

            # Дополнительные данные
            if extra_data:
                for key, value in extra_data.items():
                    text_parts.append(f"▸  {key}: {value}")

            # Время
            text_parts.append("")
            text_parts.append(f"🕐  {time_str}")

            text = "\n".join(text_parts)

            # Определяем нужна ли клавиатура
            # Для пользователей на слежке — всегда показываем кнопки
            keyboard = None
            if level in (LogLevel.ACTION, LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL) or is_watched:
                keyboard = self.get_action_keyboard(user.id, topic_id=topic_id, order_id=order_id)

            # Важные события со звуком
            # Пользователи на слежке — все логи со звуком
            if level in (LogLevel.ERROR, LogLevel.CRITICAL) or is_watched:
                silent = False

            # Отправляем
            msg = await self.bot.send_message(
                chat_id=self.channel_id,
                text=text,
                reply_markup=keyboard,
                disable_notification=silent,
            )

            return msg.message_id

        except Exception as e:
            # Логируем локально если не удалось отправить в канал
            logging.error(f"Failed to send log to channel: {e}")
            return None

    async def log_error(
        self,
        user: Optional[TgUser],
        error: Exception,
        context: str = "",
        traceback_str: str = "",
    ) -> Optional[int]:
        """
        Логирует ошибку с подробностями.

        Args:
            user: Пользователь (может быть None)
            error: Исключение
            context: Контекст ошибки
            traceback_str: Traceback в виде строки
        """
        try:
            time_str = self.get_msk_time()
            error_type = type(error).__name__
            error_msg = str(error)[:500]  # Ограничиваем длину

            text_parts = [
                f"❌  <b>ОШИБКА</b>",
                "",
            ]

            # Информация о пользователе
            if user:
                user_link = self.get_user_link(user)
                user_mention = self.get_user_mention(user)
                text_parts.extend([
                    f"👤  {user_link}",
                    f"🔗  {user_mention} · <code>{user.id}</code>",
                    "",
                ])

            # Информация об ошибке
            text_parts.extend([
                f"⚠️  <b>Тип:</b> <code>{error_type}</code>",
                f"📝  <b>Сообщение:</b> {error_msg}",
            ])

            if context:
                text_parts.append(f"📍  <b>Контекст:</b> {context}")

            # Traceback (укороченный)
            if traceback_str:
                tb_short = traceback_str[-1000:]  # Последние 1000 символов
                text_parts.extend([
                    "",
                    f"<pre>{tb_short}</pre>",
                ])

            text_parts.extend([
                "",
                f"🕐  {time_str}",
            ])

            text = "\n".join(text_parts)

            # Клавиатура с кнопкой на пользователя если он есть
            keyboard = None
            if user:
                keyboard = self.get_action_keyboard(user.id)

            msg = await self.bot.send_message(
                chat_id=self.channel_id,
                text=text,
                reply_markup=keyboard,
                disable_notification=False,  # Ошибки всегда со звуком
            )

            return msg.message_id

        except Exception as e:
            logging.error(f"Failed to send error log to channel: {e}")
            return None


# Глобальный экземпляр логгера (инициализируется при старте бота)
_logger: Optional[BotLogger] = None


def init_logger(bot: Bot) -> BotLogger:
    """Инициализирует глобальный логгер"""
    global _logger
    _logger = BotLogger(bot)
    return _logger


def get_logger() -> Optional[BotLogger]:
    """Возвращает глобальный логгер"""
    return _logger


async def log_action(
    bot: Bot,
    event: LogEvent,
    user: TgUser,
    details: Optional[str] = None,
    extra_data: Optional[dict] = None,
    session: Optional[AsyncSession] = None,
    level: LogLevel = LogLevel.INFO,
    silent: bool = True,
    order_id: Optional[int] = None,
) -> Optional[int]:
    """
    Удобная функция для быстрого логирования.
    Создаёт временный логгер если глобальный не инициализирован.

    Args:
        order_id: ID заказа для навигации в топик
    """
    logger = get_logger()
    if not logger:
        logger = BotLogger(bot)

    return await logger.log(
        event=event,
        user=user,
        details=details,
        extra_data=extra_data,
        session=session,
        level=level,
        silent=silent,
        order_id=order_id,
    )
