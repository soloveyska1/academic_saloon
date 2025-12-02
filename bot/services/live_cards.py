"""
Live Cards - Система живых карточек заказов.

UNIFIED HUB Architecture:
- Карточки ТОЛЬКО в Forum Topics (канал убран)
- Один заказ = один топик с закреплённой карточкой
- Авто-обновление при смене статуса
"""
import logging
from datetime import datetime
from typing import Optional

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType, Conversation

logger = logging.getLogger(__name__)

# ID админской группы (канал больше не используется)
ADMIN_GROUP_ID = settings.ADMIN_GROUP_ID

# Backward compatibility (канал удалён, но импорт может остаться)
ORDERS_CHANNEL_ID = None  # Deprecated - use topics instead


def get_card_link(order_id: int) -> str:
    """
    Deprecated: возвращает пустую строку.
    Для ссылки на топик используйте get_order_topic_link().
    """
    return ""


# ══════════════════════════════════════════════════════════════
#           КОНФИГУРАЦИЯ СТАДИЙ КАРТОЧКИ
# ══════════════════════════════════════════════════════════════

CARD_STAGES = {
    # Новый заказ - требует оценки
    "new": {
        "statuses": [OrderStatus.PENDING.value, OrderStatus.WAITING_ESTIMATION.value],
        "emoji": "🔴",
        "tag": "#NEW",
        "status_tag": "#status_new",
    },
    # Ждёт оплаты
    "waiting": {
        "statuses": [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value],
        "emoji": "🟡",
        "tag": "#WAIT",
        "status_tag": "#status_waiting",
    },
    # Проверка оплаты
    "verification": {
        "statuses": [OrderStatus.VERIFICATION_PENDING.value],
        "emoji": "🟠",
        "tag": "#CHECK",
        "status_tag": "#status_check",
    },
    # В работе
    "work": {
        "statuses": [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value, OrderStatus.IN_PROGRESS.value],
        "emoji": "🔵",
        "tag": "#WORK",
        "status_tag": "#status_work",
    },
    # На проверке у клиента
    "review": {
        "statuses": [OrderStatus.REVIEW.value],
        "emoji": "🟣",
        "tag": "#REVIEW",
        "status_tag": "#status_review",
    },
    # Завершён
    "done": {
        "statuses": [OrderStatus.COMPLETED.value],
        "emoji": "🟢",
        "tag": "#DONE",
        "status_tag": "#status_done",
    },
    # Отменён/Отклонён
    "cancelled": {
        "statuses": [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value],
        "emoji": "⚫",
        "tag": "#CLOSED",
        "status_tag": "#status_closed",
    },
}


def get_card_stage(status: str) -> dict:
    """Получить стадию карточки по статусу заказа"""
    for stage_name, stage_config in CARD_STAGES.items():
        if status in stage_config["statuses"]:
            return {**stage_config, "name": stage_name}
    return {**CARD_STAGES["new"], "name": "new"}


# ══════════════════════════════════════════════════════════════
#           РЕНДЕРИНГ КАРТОЧКИ
# ══════════════════════════════════════════════════════════════

def render_order_card(
    order: Order,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
    extra_text: str = None,
) -> str:
    """
    Рендерит текст карточки заказа.

    Returns:
        Текст сообщения карточки
    """
    stage = get_card_stage(order.status)

    # Тип работы
    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except ValueError:
        work_label = order.work_type or "Заказ"

    # Заголовок
    header = f"{stage['emoji']} <b>{stage['tag']} Заказ #{order.id}</b> | {work_label}"

    # Клиент
    client_info = ""
    if client_name:
        client_info = f"👤 <b>Клиент:</b> {client_name}"
        if client_username:
            client_info += f" (@{client_username})"
        client_info += f"\n🆔 <code>{order.user_id}</code>\n"

    # Детали заказа
    details = []
    if order.subject:
        details.append(f"📚 {order.subject}")
    if order.deadline:
        details.append(f"⏰ Срок: {order.deadline}")
    if order.description:
        # Обрезаем длинное описание
        desc = order.description[:200] + "..." if len(order.description) > 200 else order.description
        details.append(f"📝 {desc}")

    details_text = "\n".join(details) if details else ""

    # Цена (если есть)
    price_text = ""
    if order.price > 0:
        price_formatted = f"{order.price:,.0f}".replace(",", " ")
        price_text = f"\n💰 <b>Цена:</b> {price_formatted}₽"
        if order.paid_amount > 0:
            paid_formatted = f"{order.paid_amount:,.0f}".replace(",", " ")
            price_text += f" (оплачено: {paid_formatted}₽)"

    # Ссылка на файлы
    files_text = ""
    if yadisk_link:
        files_text = f"\n📁 <a href=\"{yadisk_link}\">Файлы на Яндекс.Диске</a>"

    # Extra text (для комментариев)
    extra_section = ""
    if extra_text:
        extra_section = f"\n\n📌 <i>{extra_text}</i>"

    # Тег статуса
    status_tag = f"\n\n{stage['status_tag']}"

    # Собираем текст
    text = f"{header}\n\n{client_info}{details_text}{price_text}{files_text}{extra_section}{status_tag}"

    return text


def get_card_keyboard(
    order: Order,
    stage_name: str,
) -> InlineKeyboardMarkup:
    """
    Генерирует клавиатуру для карточки в зависимости от стадии.
    UNIFIED HUB: кнопки только для топика (чат не нужен - уже в топике).

    Args:
        order: Объект заказа
        stage_name: Название стадии
    """
    bot_username = settings.BOT_USERNAME or "academic_saloon_bot"
    buttons = []

    if stage_name == "new":
        # Новый заказ - оценить, отклонить, бан
        buttons.append([
            InlineKeyboardButton(
                text="💵 Оценить",
                callback_data=f"card_price:{order.id}"
            ),
        ])
        buttons.append([
            InlineKeyboardButton(
                text="🚫 Отклонить",
                callback_data=f"card_reject:{order.id}"
            ),
            InlineKeyboardButton(
                text="🔇 Спам/Бан",
                callback_data=f"card_ban:{order.id}"
            ),
        ])

    elif stage_name == "waiting":
        # Ждёт оплаты
        buttons.append([
            InlineKeyboardButton(
                text="✅ Оплачено (подтвердить)",
                callback_data=f"card_confirm_pay:{order.id}"
            ),
        ])
        buttons.append([
            InlineKeyboardButton(
                text="🔔 Напомнить клиенту",
                callback_data=f"card_remind:{order.id}"
            ),
            InlineKeyboardButton(
                text="✏️ Изменить цену",
                callback_data=f"card_price:{order.id}"
            ),
        ])
        buttons.append([
            InlineKeyboardButton(
                text="🚫 Отклонить",
                callback_data=f"card_reject:{order.id}"
            ),
        ])

    elif stage_name == "verification":
        # Проверка оплаты
        buttons.append([
            InlineKeyboardButton(
                text="✅ Подтвердить оплату",
                callback_data=f"card_confirm_pay:{order.id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить (не оплачено)",
                callback_data=f"card_reject_pay:{order.id}"
            ),
        ])

    elif stage_name == "work":
        # В работе
        buttons.append([
            InlineKeyboardButton(
                text="📤 Сдать работу",
                url=f"https://t.me/{bot_username}?start=upload_{order.id}"
            ),
        ])
        buttons.append([
            InlineKeyboardButton(
                text="✅ Готово (без файла)",
                callback_data=f"card_complete:{order.id}"
            ),
        ])

    elif stage_name == "review":
        # На проверке
        buttons.append([
            InlineKeyboardButton(
                text="✅ Завершить заказ",
                callback_data=f"card_complete:{order.id}"
            ),
        ])

    elif stage_name in ("done", "cancelled"):
        # Завершённые - минимальные кнопки (можно переоткрыть)
        buttons.append([
            InlineKeyboardButton(
                text="🔄 Переоткрыть",
                callback_data=f"card_reopen:{order.id}"
            ),
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#           UNIFIED HUB - КАРТОЧКА ТОЛЬКО В ТОПИКЕ
# ══════════════════════════════════════════════════════════════

async def get_conversation_for_order(
    session: AsyncSession,
    order_id: int,
) -> Optional[Conversation]:
    """Получает Conversation для заказа если есть"""
    query = select(Conversation).where(Conversation.order_id == order_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def send_or_update_card(
    bot: Bot,
    order: Order,
    session: AsyncSession,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
    extra_text: str = None,
) -> Optional[int]:
    """
    UNIFIED HUB: Отправляет/обновляет карточку ТОЛЬКО в топике.
    Канал больше не используется.

    Returns:
        message_id карточки в топике (или None)
    """
    # Получаем Conversation для проверки наличия топика
    conv = await get_conversation_for_order(session, order.id)

    if not conv or not conv.topic_id:
        logger.warning(f"No topic found for order #{order.id}, skipping card update")
        return None

    # Рендерим текст карточки
    text = render_order_card(order, client_username, client_name, yadisk_link, extra_text)
    stage = get_card_stage(order.status)

    # Обновляем карточку в топике
    return await _update_topic_card(bot, order, session, conv, text, stage)


async def _update_topic_card(
    bot: Bot,
    order: Order,
    session: AsyncSession,
    conv: Conversation,
    text: str,
    stage: dict,
) -> Optional[int]:
    """Обновляет закреплённую карточку в топике"""
    keyboard = get_card_keyboard(order, stage["name"])

    if conv.topic_card_message_id:
        # Обновляем существующую карточку
        try:
            await bot.edit_message_text(
                chat_id=ADMIN_GROUP_ID,
                message_id=conv.topic_card_message_id,
                text=text,
                reply_markup=keyboard,
            )
            logger.debug(f"Updated topic card for order #{order.id} in topic {conv.topic_id}")
            return conv.topic_card_message_id
        except TelegramBadRequest as e:
            if "message is not modified" in str(e):
                return conv.topic_card_message_id
            elif "message to edit not found" in str(e) or "message_thread_id" in str(e).lower():
                logger.warning(f"Topic card not found for order #{order.id}, creating new")
                conv.topic_card_message_id = None
            else:
                logger.error(f"Failed to edit topic card for order #{order.id}: {e}")
                return None

    # Отправляем новую карточку в топик и закрепляем
    try:
        msg = await bot.send_message(
            chat_id=ADMIN_GROUP_ID,
            message_thread_id=conv.topic_id,
            text=text,
            reply_markup=keyboard,
        )

        # Закрепляем карточку в топике
        try:
            await bot.pin_chat_message(
                chat_id=ADMIN_GROUP_ID,
                message_id=msg.message_id,
                disable_notification=True,
            )
        except Exception as pin_err:
            logger.warning(f"Failed to pin topic card: {pin_err}")

        conv.topic_card_message_id = msg.message_id
        await session.commit()
        logger.info(f"Created topic card for order #{order.id} in topic {conv.topic_id}")
        return msg.message_id

    except TelegramBadRequest as e:
        if "thread not found" in str(e).lower() or "message_thread_id" in str(e).lower():
            # Топик удалён — сбрасываем
            logger.warning(f"Topic {conv.topic_id} was deleted for order #{order.id}")
            conv.topic_id = None
            conv.topic_card_message_id = None
            await session.commit()
        else:
            logger.error(f"Failed to send topic card for order #{order.id}: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to send topic card for order #{order.id}: {e}")
        return None


async def update_card_status(
    bot: Bot,
    order: Order,
    session: AsyncSession,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
    extra_text: str = None,
) -> bool:
    """
    Обновляет карточку после изменения статуса.
    Wrapper для send_or_update_card с обратной совместимостью.
    """
    result = await send_or_update_card(
        bot, order, session,
        client_username, client_name,
        yadisk_link, extra_text
    )
    return result is not None


# ══════════════════════════════════════════════════════════════
#           ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def get_topic_link(topic_id: int) -> str:
    """Возвращает ссылку на топик в админской группе"""
    group_id = str(ADMIN_GROUP_ID).replace("-100", "")
    return f"https://t.me/c/{group_id}/{topic_id}"


async def get_order_topic_link(session: AsyncSession, order_id: int) -> Optional[str]:
    """Возвращает ссылку на топик заказа"""
    conv = await get_conversation_for_order(session, order_id)
    if conv and conv.topic_id:
        return get_topic_link(conv.topic_id)
    return None


def get_back_to_topic_keyboard(topic_id: int) -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой возврата в топик"""
    link = get_topic_link(topic_id)

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Вернуться к заказу", url=link)]
    ])


# ══════════════════════════════════════════════════════════════
#           LIVE DASHBOARD
# ══════════════════════════════════════════════════════════════

async def render_dashboard(session: AsyncSession) -> str:
    """
    Рендерит текст дашборда со статистикой заказов.
    """
    from sqlalchemy import func

    # Собираем статистику по стадиям
    stage_counts = {}
    for stage_name, stage_config in CARD_STAGES.items():
        statuses = stage_config["statuses"]
        count_query = select(func.count(Order.id)).where(Order.status.in_(statuses))
        result = await session.execute(count_query)
        count = result.scalar() or 0
        stage_counts[stage_name] = {
            "count": count,
            "emoji": stage_config["emoji"],
            "tag": stage_config["tag"],
        }

    # Считаем сумму активных заказов
    active_statuses = (
        CARD_STAGES["new"]["statuses"] +
        CARD_STAGES["waiting"]["statuses"] +
        CARD_STAGES["verification"]["statuses"] +
        CARD_STAGES["work"]["statuses"] +
        CARD_STAGES["review"]["statuses"]
    )
    sum_query = select(func.sum(Order.price)).where(
        Order.status.in_(active_statuses),
        Order.price > 0
    )
    sum_result = await session.execute(sum_query)
    total_sum = sum_result.scalar() or 0

    # Форматируем
    now = datetime.now().strftime("%d.%m %H:%M")
    total_active = (
        stage_counts["new"]["count"] +
        stage_counts["waiting"]["count"] +
        stage_counts["verification"]["count"] +
        stage_counts["work"]["count"] +
        stage_counts["review"]["count"]
    )

    text = f"""📊 <b>ДАШБОРД ЗАКАЗОВ</b>
<i>Обновлено: {now}</i>

━━━━━━━━━━━━━━━━━━━━
{stage_counts["new"]["emoji"]} <b>Новые:</b> {stage_counts["new"]["count"]}
{stage_counts["waiting"]["emoji"]} <b>Ждут оплаты:</b> {stage_counts["waiting"]["count"]}
{stage_counts["verification"]["emoji"]} <b>Проверка оплаты:</b> {stage_counts["verification"]["count"]}
{stage_counts["work"]["emoji"]} <b>В работе:</b> {stage_counts["work"]["count"]}
{stage_counts["review"]["emoji"]} <b>На проверке:</b> {stage_counts["review"]["count"]}
━━━━━━━━━━━━━━━━━━━━
{stage_counts["done"]["emoji"]} <b>Завершено:</b> {stage_counts["done"]["count"]}
{stage_counts["cancelled"]["emoji"]} <b>Закрыто:</b> {stage_counts["cancelled"]["count"]}
━━━━━━━━━━━━━━━━━━━━

📈 <b>Всего активных:</b> {total_active}
💰 <b>Сумма в работе:</b> {total_sum:,.0f}₽

#dashboard #status_dashboard""".replace(",", " ")

    return text


def get_dashboard_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для дашборда"""
    bot_username = settings.BOT_USERNAME or "academic_saloon_bot"
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🔄 Обновить",
                callback_data="dashboard_refresh"
            ),
        ],
        [
            InlineKeyboardButton(
                text="📋 Админка",
                url=f"https://t.me/{bot_username}?start=admin"
            ),
        ],
    ])


async def send_or_update_dashboard(
    bot: Bot,
    session: AsyncSession,
    dashboard_message_id: Optional[int] = None,
) -> Optional[int]:
    """
    UNIFIED HUB: Отправляет или обновляет дашборд в топике "Дашборд".
    """
    from bot.services.unified_hub import get_service_topic_id

    dashboard_topic_id = get_service_topic_id("dashboard")
    if not dashboard_topic_id:
        logger.warning("Dashboard topic not initialized, skipping dashboard update")
        return None

    text = await render_dashboard(session)
    keyboard = get_dashboard_keyboard()

    if dashboard_message_id:
        try:
            await bot.edit_message_text(
                chat_id=ADMIN_GROUP_ID,
                message_id=dashboard_message_id,
                text=text,
                reply_markup=keyboard,
            )
            return dashboard_message_id
        except TelegramBadRequest as e:
            if "message is not modified" in str(e):
                return dashboard_message_id
            elif "message to edit not found" in str(e):
                logger.warning("Dashboard message not found, creating new")
            else:
                logger.error(f"Failed to edit dashboard: {e}")
                return None

    try:
        msg = await bot.send_message(
            chat_id=ADMIN_GROUP_ID,
            message_thread_id=dashboard_topic_id,
            text=text,
            reply_markup=keyboard,
        )
        logger.info(f"Dashboard created in topic (msg_id={msg.message_id})")
        return msg.message_id
    except Exception as e:
        logger.error(f"Failed to send dashboard: {e}")
        return None
