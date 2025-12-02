"""
Live Cards - Система живых карточек заказов в канале.

Один заказ = одно сообщение, которое редактируется при смене статуса.
"""
import logging
from datetime import datetime
from typing import Optional

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest

from core.config import settings
from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType

logger = logging.getLogger(__name__)

# ID канала для заказов
ORDERS_CHANNEL_ID = -1003331104298


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
    return CARD_STAGES["new"]


# ══════════════════════════════════════════════════════════════
#           РЕНДЕРИНГ КАРТОЧКИ
# ══════════════════════════════════════════════════════════════

def render_order_card(
    order: Order,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
) -> tuple[str, InlineKeyboardMarkup]:
    """
    Рендерит текст и клавиатуру карточки заказа.

    Returns:
        (text, keyboard) - текст сообщения и клавиатура
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

    # Тег статуса
    status_tag = f"\n\n{stage['status_tag']}"

    # Собираем текст
    text = f"{header}\n\n{client_info}{details_text}{price_text}{files_text}{status_tag}"

    # Клавиатура в зависимости от стадии
    keyboard = get_card_keyboard(order, stage["name"])

    return text, keyboard


def get_card_keyboard(order: Order, stage_name: str) -> InlineKeyboardMarkup:
    """Генерирует клавиатуру для карточки в зависимости от стадии"""

    bot_username = settings.BOT_USERNAME or "academic_saloon_bot"
    buttons = []

    if stage_name == "new":
        # Новый заказ - оценить, отклонить, бан
        buttons = [
            [
                InlineKeyboardButton(
                    text="💵 Оценить",
                    url=f"https://t.me/{bot_username}?start=price_{order.id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🚫 Отклонить",
                    callback_data=f"card_reject:{order.id}"
                ),
                InlineKeyboardButton(
                    text="🔇 Спам/Бан",
                    callback_data=f"card_ban:{order.id}"
                ),
            ],
        ]

    elif stage_name == "waiting":
        # Ждёт оплаты
        buttons = [
            [
                InlineKeyboardButton(
                    text="✅ Оплачено (подтвердить)",
                    callback_data=f"card_confirm_pay:{order.id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🔔 Напомнить клиенту",
                    callback_data=f"card_remind:{order.id}"
                ),
                InlineKeyboardButton(
                    text="✏️ Изменить цену",
                    url=f"https://t.me/{bot_username}?start=price_{order.id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🚫 Отклонить",
                    callback_data=f"card_reject:{order.id}"
                ),
            ],
        ]

    elif stage_name == "verification":
        # Проверка оплаты
        buttons = [
            [
                InlineKeyboardButton(
                    text="✅ Подтвердить оплату",
                    callback_data=f"card_confirm_pay:{order.id}"
                ),
                InlineKeyboardButton(
                    text="❌ Отклонить (не оплачено)",
                    callback_data=f"card_reject_pay:{order.id}"
                ),
            ],
        ]

    elif stage_name == "work":
        # В работе
        buttons = [
            [
                InlineKeyboardButton(
                    text="📤 Сдать работу",
                    url=f"https://t.me/{bot_username}?start=upload_{order.id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🆘 Проблема",
                    url=f"https://t.me/{bot_username}?start=problem_{order.id}"
                ),
            ],
        ]

    elif stage_name == "review":
        # На проверке
        buttons = [
            [
                InlineKeyboardButton(
                    text="✅ Завершить заказ",
                    callback_data=f"card_complete:{order.id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🔄 Доработка",
                    url=f"https://t.me/{bot_username}?start=revision_{order.id}"
                ),
            ],
        ]

    elif stage_name in ("done", "cancelled"):
        # Завершённые - без кнопок или минимум
        buttons = [
            [
                InlineKeyboardButton(
                    text="📋 Детали",
                    url=f"https://t.me/{bot_username}?start=order_{order.id}"
                ),
            ],
        ]

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#           ОТПРАВКА/ОБНОВЛЕНИЕ КАРТОЧКИ
# ══════════════════════════════════════════════════════════════

async def send_or_update_card(
    bot: Bot,
    order: Order,
    session,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
) -> Optional[int]:
    """
    Отправляет новую карточку или обновляет существующую.

    Returns:
        message_id карточки в канале
    """
    text, keyboard = render_order_card(order, client_username, client_name, yadisk_link)

    if order.channel_message_id:
        # Обновляем существующее сообщение
        try:
            await bot.edit_message_text(
                chat_id=ORDERS_CHANNEL_ID,
                message_id=order.channel_message_id,
                text=text,
                reply_markup=keyboard,
            )
            logger.info(f"Updated card for order #{order.id} (msg_id={order.channel_message_id})")
            return order.channel_message_id
        except TelegramBadRequest as e:
            if "message is not modified" in str(e):
                # Сообщение не изменилось - это нормально
                return order.channel_message_id
            elif "message to edit not found" in str(e):
                # Сообщение удалено - создаём новое
                logger.warning(f"Card message not found for order #{order.id}, creating new")
                order.channel_message_id = None
            else:
                logger.error(f"Failed to edit card for order #{order.id}: {e}")
                return None

    # Отправляем новое сообщение
    try:
        msg = await bot.send_message(
            chat_id=ORDERS_CHANNEL_ID,
            text=text,
            reply_markup=keyboard,
        )
        order.channel_message_id = msg.message_id
        await session.commit()
        logger.info(f"Created new card for order #{order.id} (msg_id={msg.message_id})")
        return msg.message_id
    except Exception as e:
        logger.error(f"Failed to send card for order #{order.id}: {e}")
        return None


async def update_card_status(
    bot: Bot,
    order: Order,
    session,
    client_username: str = None,
    client_name: str = None,
    yadisk_link: str = None,
    extra_text: str = None,
) -> bool:
    """
    Обновляет карточку после изменения статуса.
    Добавляет extra_text к сообщению если указан.
    """
    if not order.channel_message_id:
        # Карточки нет - создаём
        await send_or_update_card(bot, order, session, client_username, client_name, yadisk_link)
        return True

    text, keyboard = render_order_card(order, client_username, client_name, yadisk_link)

    if extra_text:
        text += f"\n\n📌 <i>{extra_text}</i>"

    try:
        await bot.edit_message_text(
            chat_id=ORDERS_CHANNEL_ID,
            message_id=order.channel_message_id,
            text=text,
            reply_markup=keyboard,
        )
        return True
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            logger.error(f"Failed to update card status for order #{order.id}: {e}")
        return False


# ══════════════════════════════════════════════════════════════
#           ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def get_card_link(order: Order) -> Optional[str]:
    """Возвращает ссылку на карточку в канале"""
    if not order.channel_message_id:
        return None

    # Для публичных каналов формат: https://t.me/c/CHANNEL_ID/MESSAGE_ID
    # CHANNEL_ID без -100 префикса
    channel_id_str = str(ORDERS_CHANNEL_ID).replace("-100", "")
    return f"https://t.me/c/{channel_id_str}/{order.channel_message_id}"


def get_back_to_card_keyboard(order: Order) -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой возврата к карточке"""
    link = get_card_link(order)
    if not link:
        return None

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Вернуться к заказу", url=link)]
    ])


# ══════════════════════════════════════════════════════════════
#           LIVE DASHBOARD
# ══════════════════════════════════════════════════════════════

async def render_dashboard(session) -> str:
    """
    Рендерит текст дашборда со статистикой заказов.

    Returns:
        Текст дашборда для канала
    """
    from sqlalchemy import select, func
    from database.models.orders import Order, OrderStatus
    from datetime import datetime

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
    session,
    dashboard_message_id: Optional[int] = None,
) -> Optional[int]:
    """
    Отправляет или обновляет дашборд в канале.

    Args:
        bot: Bot instance
        session: AsyncSession
        dashboard_message_id: ID существующего сообщения дашборда

    Returns:
        message_id дашборда
    """
    text = await render_dashboard(session)
    keyboard = get_dashboard_keyboard()

    if dashboard_message_id:
        # Обновляем существующее
        try:
            await bot.edit_message_text(
                chat_id=ORDERS_CHANNEL_ID,
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

    # Отправляем новое
    try:
        msg = await bot.send_message(
            chat_id=ORDERS_CHANNEL_ID,
            text=text,
            reply_markup=keyboard,
        )
        logger.info(f"Dashboard created (msg_id={msg.message_id})")
        return msg.message_id
    except Exception as e:
        logger.error(f"Failed to send dashboard: {e}")
        return None
