"""
UNIFIED HUB - Единый админский хаб на базе Forum Topics.

Архитектура:
- Все заказы → отдельные топики с закреплёнными карточками
- Служебные топики: Дашборд, Логи, Лента заказов, Алерты
- Автосоздание топика при новом заказе
- Авто-переименование по статусу
- Авто-закрытие при завершении
"""
import logging
from datetime import datetime
from typing import Optional

from aiogram import Bot
from aiogram.types import ForumTopic
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.orders import (
    Order, OrderStatus, Conversation, ConversationType, WORK_TYPE_LABELS, WorkType
)
from database.models.users import User

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════
#                    КОНФИГУРАЦИЯ ТОПИКОВ
# ══════════════════════════════════════════════════════════════

# Служебные топики (создаются автоматически при старте)
SERVICE_TOPICS = {
    "dashboard": {
        "name": "📊 Дашборд",
        "icon_color": 0x6FB9F0,  # Blue
    },
    "feed": {
        "name": "📋 Лента заказов",
        "icon_color": 0xFFD67E,  # Yellow
    },
    "logs": {
        "name": "🔔 Логи",
        "icon_color": 0x8EEE98,  # Green
    },
    "alerts": {
        "name": "⚠️ Алерты",
        "icon_color": 0xFF93B2,  # Red
    },
    # Mini App топик удалён - все логи теперь идут в топики заказов
}

# Эмодзи статусов для названий топиков
STATUS_EMOJI = {
    OrderStatus.PENDING.value: "🔴",
    OrderStatus.WAITING_ESTIMATION.value: "🔴",
    OrderStatus.DRAFT.value: "🔴",
    OrderStatus.WAITING_PAYMENT.value: "🟡",
    OrderStatus.CONFIRMED.value: "🟡",
    OrderStatus.VERIFICATION_PENDING.value: "🟠",
    OrderStatus.PAID.value: "🔵",
    OrderStatus.PAID_FULL.value: "🔵",
    OrderStatus.IN_PROGRESS.value: "🔵",
    OrderStatus.REVIEW.value: "🟣",
    OrderStatus.REVISION.value: "🟠",
    OrderStatus.COMPLETED.value: "🟢",
    OrderStatus.CANCELLED.value: "⚫",
    OrderStatus.REJECTED.value: "⚫",
}

# Кэш ID служебных топиков (загружается при старте)
_service_topic_ids: dict[str, int] = {}


# ══════════════════════════════════════════════════════════════
#                    ИНИЦИАЛИЗАЦИЯ ХАБА
# ══════════════════════════════════════════════════════════════

async def init_unified_hub(bot: Bot, session: AsyncSession) -> dict[str, int]:
    """
    Инициализирует UNIFIED HUB при запуске бота.
    Создаёт служебные топики если их нет.

    Returns:
        Словарь {topic_key: topic_id}
    """
    global _service_topic_ids

    logger.info("🏗️ Initializing UNIFIED HUB...")
    print("[DEBUG] Step 1: Querying system user...", flush=True)

    # Создаём системного пользователя (user_id=0) если его нет
    # Нужен для foreign key в таблице conversations
    system_user_query = select(User).where(User.telegram_id == 0)
    system_user_result = await session.execute(system_user_query)
    system_user = system_user_result.scalar_one_or_none()
    print(f"[DEBUG] Step 1 done: system_user={system_user}", flush=True)

    if not system_user:
        system_user = User(
            telegram_id=0,
            username="system",
            fullname="System",
            role="system",
        )
        session.add(system_user)
        await session.commit()
        logger.info("✅ Created system user (telegram_id=0)")

    # Загружаем существующие служебные топики из БД
    print("[DEBUG] Step 2: Loading service topics...", flush=True)
    for topic_key, topic_config in SERVICE_TOPICS.items():
        print(f"[DEBUG] Processing topic: {topic_key}", flush=True)
        # Ищем Conversation с типом service, user_id=0 и без order_id
        query = select(Conversation).where(
            Conversation.user_id == 0,  # Служебные топики
            Conversation.conversation_type == f"service_{topic_key}",
            Conversation.order_id.is_(None),
        )
        result = await session.execute(query)
        conv = result.scalar_one_or_none()
        print(f"[DEBUG] DB query done for {topic_key}, conv={conv}", flush=True)

        if conv and conv.topic_id:
            # Проверяем что топик ещё существует
            try:
                print(f"[DEBUG] Checking topic {conv.topic_id} in Telegram...", flush=True)
                await bot.send_chat_action(
                    chat_id=settings.ADMIN_GROUP_ID,
                    action="typing",
                    message_thread_id=conv.topic_id
                )
                _service_topic_ids[topic_key] = conv.topic_id
                logger.info(f"✅ Found existing service topic '{topic_key}': {conv.topic_id}")
                continue
            except TelegramBadRequest:
                # Топик удалён — создадим заново
                logger.warning(f"🔧 Service topic '{topic_key}' was deleted, recreating...")
                conv.topic_id = None

        # Создаём новый топик
        try:
            forum_topic: ForumTopic = await bot.create_forum_topic(
                chat_id=settings.ADMIN_GROUP_ID,
                name=topic_config["name"],
            )

            topic_id = forum_topic.message_thread_id
            _service_topic_ids[topic_key] = topic_id

            # Сохраняем в БД
            if not conv:
                conv = Conversation(
                    user_id=0,  # Служебный
                    conversation_type=f"service_{topic_key}",
                )
                session.add(conv)
            conv.topic_id = topic_id
            await session.commit()

            logger.info(f"✅ Created service topic '{topic_key}': {topic_id}")

            # Отправляем приветственное сообщение
            await _send_service_topic_header(bot, topic_key, topic_id)

        except Exception as e:
            logger.error(f"❌ Failed to create service topic '{topic_key}': {e}")
            await session.rollback()  # Восстанавливаем сессию после ошибки

    logger.info(f"🏗️ UNIFIED HUB initialized with {len(_service_topic_ids)} service topics")
    return _service_topic_ids


async def _send_service_topic_header(bot: Bot, topic_key: str, topic_id: int):
    """Отправляет заголовок в служебный топик"""
    headers = {
        "dashboard": (
            "📊 <b>ДАШБОРД</b>\n\n"
            "Здесь будет статистика и обзор заказов.\n"
            "Используйте /dashboard для обновления."
        ),
        "feed": (
            "📋 <b>ЛЕНТА ЗАКАЗОВ</b>\n\n"
            "Все новые заказы появляются здесь.\n"
            "Нажмите на заказ чтобы перейти в его топик."
        ),
        "logs": (
            "🔔 <b>ЛОГИ</b>\n\n"
            "Действия пользователей отображаются здесь.\n"
            "Регистрации, заказы, платежи и т.д."
        ),
        "alerts": (
            "⚠️ <b>АЛЕРТЫ</b>\n\n"
            "Критические уведомления:\n"
            "• Ошибки системы\n"
            "• Подозрительная активность\n"
            "• Важные события"
        ),
    }

    text = headers.get(topic_key, f"Служебный топик: {topic_key}")

    try:
        await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=topic_id,
            text=text,
        )
    except Exception as e:
        logger.warning(f"Failed to send header to service topic '{topic_key}': {e}")


def get_service_topic_id(topic_key: str) -> Optional[int]:
    """Получить ID служебного топика"""
    return _service_topic_ids.get(topic_key)


# ══════════════════════════════════════════════════════════════
#                    СОЗДАНИЕ ТОПИКА ЗАКАЗА
# ══════════════════════════════════════════════════════════════

async def create_order_topic(
    bot: Bot,
    session: AsyncSession,
    order: Order,
    user=None,
) -> tuple[Conversation, int]:
    """
    Создаёт топик для нового заказа.

    Args:
        bot: Бот
        session: Сессия БД
        order: Заказ
        user: Пользователь (может быть Telegram User или DB User)

    Returns:
        (Conversation, topic_id)
    """
    from bot.services.live_cards import send_or_update_card

    # Получаем имя клиента (поддерживаем и Telegram User и DB User)
    if user:
        # DB User имеет fullname, Telegram User имеет full_name
        client_name = getattr(user, 'fullname', None) or getattr(user, 'full_name', None) or f"ID:{order.user_id}"
        client_username = getattr(user, 'username', None)
    else:
        client_name = f"ID:{order.user_id}"
        client_username = None

    # Формируем имя топика
    status_emoji = STATUS_EMOJI.get(order.status, "🔴")
    topic_name = f"{status_emoji} [#{order.id}] {client_name}"[:128]

    # Создаём топик
    try:
        forum_topic: ForumTopic = await bot.create_forum_topic(
            chat_id=settings.ADMIN_GROUP_ID,
            name=topic_name,
        )
        topic_id = forum_topic.message_thread_id

        # Создаём Conversation
        conv = Conversation(
            user_id=order.user_id,
            order_id=order.id,
            conversation_type=ConversationType.ORDER_CHAT.value,
            topic_id=topic_id,
        )
        session.add(conv)
        await session.commit()

        # Отправляем заголовок
        await _send_order_topic_header(bot, order, user, topic_id, client_name, client_username)

        # Отправляем и закрепляем карточку
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=client_username,
            client_name=client_name,
        )

        logger.info(f"✅ Created order topic #{order.id}: {topic_id}")

        return conv, topic_id

    except Exception as e:
        logger.error(f"❌ Failed to create order topic #{order.id}: {e}")
        raise


async def _send_order_topic_header(
    bot: Bot,
    order: Order,
    user,
    topic_id: int,
    client_name: str = None,
    client_username: str = None,
):
    """Отправляет информационный заголовок в топик заказа"""
    if not client_name:
        client_name = getattr(user, 'fullname', None) or getattr(user, 'full_name', None) or "Неизвестно"
    if not client_username:
        client_username = getattr(user, 'username', None)
    username = f"@{client_username}" if client_username else "нет"

    # Тип работы
    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except (ValueError, KeyError):
        work_label = order.work_type or "Заказ"

    header = f"""🆕 <b>НОВЫЙ ЗАКАЗ #{order.id}</b>

👤 <b>Клиент:</b> {client_name}
📱 <b>Username:</b> {username}
🆔 <b>ID:</b> <code>{order.user_id}</code>

📝 <b>Тип:</b> {work_label}
📚 <b>Предмет:</b> {order.subject or '—'}
⏰ <b>Срок:</b> {order.deadline or '—'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <i>Пишите сюда — сообщения уйдут клиенту</i>
💡 <i>Начните с точки <code>.</code> для внутреннего комментария</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

    try:
        await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=topic_id,
            text=header,
        )
    except Exception as e:
        logger.warning(f"Failed to send order topic header: {e}")


# ══════════════════════════════════════════════════════════════
#                    ЛЕНТА ЗАКАЗОВ
# ══════════════════════════════════════════════════════════════

async def post_to_feed(
    bot: Bot,
    order: Order,
    user,
    topic_id: int,
    yadisk_link: str = None,
):
    """
    Постит мини-карточку в ленту заказов.

    Args:
        bot: Бот
        order: Заказ
        user: Пользователь (может быть Telegram User или DB User)
        topic_id: ID топика заказа (для ссылки)
        yadisk_link: Ссылка на Яндекс.Диск
    """
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

    feed_topic_id = get_service_topic_id("feed")
    if not feed_topic_id:
        logger.warning("Feed topic not initialized, skipping feed post")
        return

    # Формируем мини-карточку (поддерживаем и Telegram User и DB User)
    status_emoji = STATUS_EMOJI.get(order.status, "🔴")
    client_name = getattr(user, 'fullname', None) or getattr(user, 'full_name', None) or f"ID:{order.user_id}" if user else f"ID:{order.user_id}"
    client_username = getattr(user, 'username', None) if user else None
    username = f"@{client_username}" if client_username else ""

    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except (ValueError, KeyError):
        work_label = order.work_type or "Заказ"

    # Цена
    price_str = ""
    if order.price > 0:
        price_str = f" • {int(order.price):,}₽".replace(",", " ")

    # Файлы
    files_str = f"\n📁 <a href=\"{yadisk_link}\">Файлы</a>" if yadisk_link else ""

    text = f"""{status_emoji} <b>#{order.id}</b> • {work_label}{price_str}
👤 {client_name} {username}
⏰ {order.deadline or '—'}{files_str}"""

    # Кнопка перехода в топик
    group_id = str(settings.ADMIN_GROUP_ID).replace("-100", "")
    topic_link = f"https://t.me/c/{group_id}/{topic_id}"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 Открыть заказ", url=topic_link)]
    ])

    try:
        await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=feed_topic_id,
            text=text,
            reply_markup=keyboard,
        )
        logger.debug(f"Posted order #{order.id} to feed")
    except Exception as e:
        logger.warning(f"Failed to post to feed: {e}")


# ══════════════════════════════════════════════════════════════
#                    ПЕРЕИМЕНОВАНИЕ ТОПИКА
# ══════════════════════════════════════════════════════════════

async def update_topic_name(
    bot: Bot,
    session: AsyncSession,
    order: Order,
    user: User = None,
):
    """
    Обновляет название топика при смене статуса.
    """
    # Ищем Conversation
    query = select(Conversation).where(Conversation.order_id == order.id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv or not conv.topic_id:
        return

    # Формируем новое имя
    status_emoji = STATUS_EMOJI.get(order.status, "🔴")

    if not user:
        user_query = select(User).where(User.telegram_id == order.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()

    client_name = user.fullname if user else f"ID:{order.user_id}"
    new_name = f"{status_emoji} [#{order.id}] {client_name}"[:128]

    try:
        await bot.edit_forum_topic(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=conv.topic_id,
            name=new_name,
        )
        logger.debug(f"Updated topic name for order #{order.id}: {new_name}")
    except TelegramBadRequest as e:
        if "TOPIC_NOT_MODIFIED" not in str(e):
            logger.warning(f"Failed to update topic name: {e}")


# ══════════════════════════════════════════════════════════════
#                    ЗАКРЫТИЕ ТОПИКА
# ══════════════════════════════════════════════════════════════

async def close_order_topic(
    bot: Bot,
    session: AsyncSession,
    order: Order,
):
    """
    Закрывает топик при завершении заказа.
    """
    # Ищем Conversation
    query = select(Conversation).where(Conversation.order_id == order.id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv or not conv.topic_id:
        return

    try:
        # Сначала обновляем имя
        await update_topic_name(bot, session, order)

        # Затем закрываем топик
        await bot.close_forum_topic(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=conv.topic_id,
        )
        logger.info(f"✅ Closed topic for order #{order.id}")
    except TelegramBadRequest as e:
        if "TOPIC_CLOSED" not in str(e):
            logger.warning(f"Failed to close topic: {e}")


async def reopen_order_topic(
    bot: Bot,
    session: AsyncSession,
    order: Order,
):
    """
    Переоткрывает закрытый топик.
    """
    query = select(Conversation).where(Conversation.order_id == order.id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv or not conv.topic_id:
        return

    try:
        await bot.reopen_forum_topic(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=conv.topic_id,
        )
        logger.info(f"✅ Reopened topic for order #{order.id}")
    except TelegramBadRequest as e:
        logger.warning(f"Failed to reopen topic: {e}")


# ══════════════════════════════════════════════════════════════
#                    ЛОГИРОВАНИЕ В ТОПИК
# ══════════════════════════════════════════════════════════════

async def log_to_topic(
    bot: Bot,
    text: str,
    topic_key: str = "logs",
    reply_markup=None,
    silent: bool = True,
):
    """
    Отправляет лог-сообщение в служебный топик.

    Args:
        bot: Бот
        text: Текст сообщения
        topic_key: Ключ топика (logs, alerts, dashboard, feed)
        reply_markup: Клавиатура
        silent: Без звука
    """
    topic_id = get_service_topic_id(topic_key)
    if not topic_id:
        logger.warning(f"Service topic '{topic_key}' not initialized")
        return None

    try:
        msg = await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=topic_id,
            text=text,
            reply_markup=reply_markup,
            disable_notification=silent,
        )
        return msg.message_id
    except Exception as e:
        logger.error(f"Failed to log to topic '{topic_key}': {e}")
        return None


async def alert(bot: Bot, text: str, reply_markup=None):
    """Отправляет алерт (со звуком)"""
    return await log_to_topic(bot, f"🚨 {text}", "alerts", reply_markup, silent=False)
