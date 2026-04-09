"""
Чат через Telegram Forum Topics.

Архитектура:
- Клиент пишет боту → Бот пересылает в топик админской группы
- Админ пишет в топик → Бот пересылает клиенту
- Sticky State: клиент остаётся в режиме чата пока не выйдет
- Self-Healing: автовосстановление при удалении топика
- Fusion: карточка заказа закрепляется в топике

Safety Commands (для админов в топике):
- /card - переотправить/обновить закреплённую карточку
- /price XXXX - установить цену заказа
- /summary - показать актуальную сводку по заказу
- /history - показать последние события по заказу
- /note ТЕКСТ - обновить внутреннюю заметку
- /folder - открыть папку заказа на Яндекс.Диске
- /deliver - отправить клиенту собранную версию
- /pay - повторно отправить оплату или доплату
- /paid - вручную подтвердить следующий платёж
- /review - вернуть заказ клиенту на проверку
- /done - завершить заказ
"""
from __future__ import annotations

import logging
import re
from contextlib import suppress
from datetime import datetime
from decimal import Decimal

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    ForumTopic,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.bonus import BonusReason, BonusService
from bot.services.order_delivery_service import (
    append_topic_delivery_draft,
    build_delivery_draft_keyboard,
    build_delivery_draft_summary_text,
    cancel_delivery_draft,
    get_current_delivery_draft,
    get_latest_sent_delivery_batch,
    send_order_delivery_batch,
    serialize_delivery_batch,
)
from bot.services.order_lifecycle import (
    can_complete_order,
    can_deliver_order,
    is_order_already_delivered,
    sync_order_delivery_review,
)
from bot.services.order_message_formatter import (
    build_admin_topic_header_keyboard,
    build_admin_topic_header_text,
    build_order_keyboard,
    build_price_breakdown_lines,
    format_admin_datetime,
    format_deadline_for_admin,
    format_plain_text,
)
from bot.services.order_revision_round_service import (
    bind_order_to_revision_round,
    get_current_revision_round,
)
from bot.services.order_status_service import (
    OrderStatusDispatchOptions,
    OrderStatusTransitionError,
    apply_order_status_transition,
    finalize_order_status_change,
)
from bot.services.payment_accounting import (
    apply_payment_update_to_user,
    build_payment_update,
    get_order_remaining_amount,
    get_payment_label,
    get_payment_phase,
    get_requested_payment_amount,
    get_requested_payment_label,
)
from bot.services.payment_verification import build_payment_verification_context
from bot.services.yandex_disk import yandex_disk_service
from bot.states.chat import ChatStates
from bot.utils.formatting import format_price
from core.config import settings
from database.models.admin_logs import AdminActionLog, AdminActionType
from database.models.order_events import OrderLifecycleEvent, OrderLifecycleEventType
from database.models.orders import (
    Conversation,
    ConversationType,
    MessageSender,
    Order,
    OrderMessage,
    OrderRevisionRound,
    OrderStatus,
    canonicalize_order_status,
    get_status_meta,
)
from database.models.users import User

logger = logging.getLogger(__name__)

router = Router()

TOPIC_PAYMENT_REQUEST_ALLOWED_STATUSES = {
    OrderStatus.WAITING_PAYMENT.value,
    OrderStatus.PAID.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVIEW.value,
    OrderStatus.REVISION.value,
    OrderStatus.PAUSED.value,
}

TOPIC_PAYMENT_CONFIRM_ALLOWED_STATUSES = TOPIC_PAYMENT_REQUEST_ALLOWED_STATUSES | {
    OrderStatus.VERIFICATION_PENDING.value,
}
TOPIC_HISTORY_LOG_ACTIONS = (
    AdminActionType.ORDER_STATUS_CHANGE.value,
    AdminActionType.ORDER_PRICE_SET.value,
    AdminActionType.ORDER_PROGRESS_UPDATE.value,
    AdminActionType.ORDER_PAYMENT_REQUEST.value,
    AdminActionType.ORDER_PAYMENT_CONFIRM.value,
    AdminActionType.ORDER_PAYMENT_REJECT.value,
    AdminActionType.ORDER_NOTE_UPDATE.value,
)
TOPIC_HISTORY_MESSAGE_LIMIT = 20
TOPIC_HISTORY_ITEM_LIMIT = 8
TOPIC_NOTE_MAX_LENGTH = 1200
DELIVERABLE_FILE_TYPES = {"document", "photo", "video", "voice", "audio"}
REVISION_REQUEST_PREFIX = "📝 <b>Запрос на правки</b>"


# ══════════════════════════════════════════════════════════════
#                    FSM СОСТОЯНИЯ ДЛЯ ТОПИКА
# ══════════════════════════════════════════════════════════════

class TopicStates(StatesGroup):
    """Состояния для действий внутри топика"""
    waiting_custom_price = State()  # Ожидание ввода своей цены


# ══════════════════════════════════════════════════════════════
#                    КОНСТАНТЫ И КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

# Эмодзи для топиков по типу
TOPIC_ICONS = {
    ConversationType.ORDER_CHAT.value: "📋",
    ConversationType.SUPPORT.value: "🛠️",
    ConversationType.FREE.value: "💬",
}

# ══════════════════════════════════════════════════════════════
#                    БЫСТРЫЕ ШАБЛОНЫ ОТВЕТОВ
# ══════════════════════════════════════════════════════════════

QUICK_TEMPLATES = {
    "1": {
        "name": "Приветствие",
        "text": "Здравствуйте!\nСпасибо за обращение. Чем могу помочь?",
    },
    "2": {
        "name": "Принято в работу",
        "text": "Заказ принят в работу.\nСроки выполнения: согласно дедлайну.\nЕсли будут вопросы — пишите сюда.",
    },
    "3": {
        "name": "Готово",
        "text": "Работа готова.\nФайлы отправлены в чат и на Яндекс.Диск.\nПроверьте и подтвердите получение.",
    },
    "4": {
        "name": "Уточнение",
        "text": "Для точного расчёта уточните, пожалуйста:\n• Объём работы\n• Точный срок сдачи\n• Дополнительные требования",
    },
    "5": {
        "name": "Ожидание оплаты",
        "text": "💳 Ожидаем оплату.\nПосле перевода нажмите кнопку «Я оплатил» в приложении.\nРеквизиты указаны в заказе.",
    },
    "6": {
        "name": "Доплата",
        "text": "💰 Работа выполнена на 100%!\nДля получения файлов необходима доплата.\nРеквизиты те же, что и для предоплаты.",
    },
    "7": {
        "name": "Правки безлимит",
        "text": "✏️ Безлимитные правки включены!\nОпишите, что нужно исправить одним списком — доведём работу до нужного результата.",
    },
    "8": {
        "name": "Спасибо за заказ",
        "text": "🙏 Спасибо за заказ!\nБудем рады видеть вас снова.\nНе забудьте оставить отзыв — это поможет другим студентам!",
    },
    "9": {
        "name": "Прогресс",
        "text": "📊 Информация о прогрессе:\nРабота выполняется по плану.\nОриентировочная готовность — к указанному сроку.",
    },
    "10": {
        "name": "Связь с автором",
        "text": "👨‍💻 Передал информацию автору.\nОжидайте ответа в ближайшее время.",
    },
}


def get_templates_list_text() -> str:
    """Формирует текст со списком шаблонов"""
    lines = ["📋 <b>Быстрые шаблоны:</b>\n"]
    for key, template in QUICK_TEMPLATES.items():
        lines.append(f"<code>/t{key}</code> — {template['name']}")
    lines.append("\n💡 <i>Напишите /t1, /t2... для отправки</i>")
    return "\n".join(lines)


def get_exit_chat_keyboard() -> ReplyKeyboardMarkup:
    """Reply-клавиатура для выхода из чата"""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔙 Выйти в меню")]],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def get_chat_entry_keyboard(order_id: int | None = None) -> InlineKeyboardMarkup:
    """Inline-клавиатура для входа в чат"""
    if order_id:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="💬 Написать по заказу",
                callback_data=f"enter_chat_order_{order_id}"
            )]
        ])
    else:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="💬 Написать в поддержку",
                callback_data="enter_chat_support"
            )]
        ])


# ══════════════════════════════════════════════════════════════
#                    РАБОТА С ТОПИКАМИ
# ══════════════════════════════════════════════════════════════

async def get_or_create_topic(
    bot: Bot,
    session: AsyncSession,
    user_id: int,
    order_id: int | None = None,
    conv_type: str = ConversationType.SUPPORT.value,
    force_recreate: bool = False,
) -> tuple[Conversation, int]:
    """
    Получает или создаёт топик для диалога.
    Self-Healing: автоматически пересоздаёт топик если он был удалён.

    Args:
        bot: Бот
        session: Сессия БД
        user_id: ID пользователя Telegram
        order_id: ID заказа (опционально)
        conv_type: Тип диалога
        force_recreate: Принудительно создать новый топик

    Returns:
        tuple[Conversation, topic_id]
    """
    # Ищем существующую Conversation
    query = select(Conversation).where(Conversation.user_id == user_id)
    if order_id:
        query = query.where(Conversation.order_id == order_id)
    else:
        query = query.where(Conversation.order_id.is_(None))
        query = query.where(Conversation.conversation_type == conv_type)

    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    # Получаем имя клиента
    user_query = select(User).where(User.telegram_id == user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()
    client_name = user.fullname if user else f"ID:{user_id}"

    # Если Conversation не существует — создаём
    if not conv:
        conv = Conversation(
            user_id=user_id,
            order_id=order_id,
            conversation_type=conv_type,
        )
        session.add(conv)

    # Проверяем есть ли topic_id и не требуется ли пересоздание
    if conv.topic_id and not force_recreate:
        # Проверяем что топик ещё жив
        try:
            # Пытаемся отправить typing action в топик для проверки
            await bot.send_chat_action(
                chat_id=settings.ADMIN_GROUP_ID,
                action="typing",
                message_thread_id=conv.topic_id
            )
            return conv, conv.topic_id
        except TelegramBadRequest as e:
            error_str = str(e).lower()
            if "thread not found" in error_str or "message_thread_id" in error_str or "chat not found" in error_str:
                # Топик удалён — создадим новый (Self-Healing)
                logger.warning(f"🔧 SELF-HEALING: Topic {conv.topic_id} was deleted, recreating...")
                conv.topic_id = None
                conv.topic_card_message_id = None
                conv.topic_header_message_id = None
            else:
                raise

    # Создаём новый топик
    icon = TOPIC_ICONS.get(conv_type, "💬")

    if order_id:
        topic_name = f"{icon} [Заказ #{order_id}] {client_name}"
    else:
        type_label = "Поддержка" if conv_type == ConversationType.SUPPORT.value else "Сообщение"
        topic_name = f"{icon} {type_label} | {client_name}"

    # Ограничение Telegram: имя топика до 128 символов
    topic_name = topic_name[:128]

    try:
        forum_topic: ForumTopic = await bot.create_forum_topic(
            chat_id=settings.ADMIN_GROUP_ID,
            name=topic_name,
        )
        conv.topic_id = forum_topic.message_thread_id
        conv.topic_card_message_id = None  # Сбрасываем — карточка будет создана заново
        conv.topic_header_message_id = None
        await session.commit()

        # Отправляем стартовое сообщение в топик
        await send_topic_header(bot, session, conv, user, order_id)

        # FUSION: Card will be sent by caller with proper context (promo codes, extra_text, etc.)
        # Removed automatic card sending to prevent duplicates
        logger.info(f"✅ Created topic {conv.topic_id} for user {user_id}, order {order_id}")

    except TelegramBadRequest as e:
        logger.error(f"Failed to create topic: {e}")
        raise

    return conv, conv.topic_id


async def send_topic_header(
    bot: Bot,
    session: AsyncSession,
    conv: Conversation,
    user: User | None,
    order_id: int | None,
):
    """Отправляет заголовок-информацию в новый топик."""
    order = await session.get(Order, order_id) if order_id else None
    payload = await build_topic_summary_payload(session, conv, order, user)
    message = await bot.send_message(
        chat_id=settings.ADMIN_GROUP_ID,
        message_thread_id=conv.topic_id,
        **payload,
    )
    conv.topic_header_message_id = message.message_id
    await session.commit()


async def get_topic_context(
    session: AsyncSession,
    topic_id: int | None,
    *,
    include_user: bool = False,
) -> tuple[Conversation | None, Order | None, User | None]:
    if not topic_id:
        return None, None, None

    query = select(Conversation).where(Conversation.topic_id == topic_id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        return None, None, None

    order = await session.get(Order, conv.order_id) if conv.order_id else None

    user = None
    if include_user and conv.user_id:
        user_query = select(User).where(User.telegram_id == conv.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()

    return conv, order, user


async def load_topic_activity_context(
    session: AsyncSession,
    order: Order,
) -> tuple[list[OrderLifecycleEvent], list[AdminActionLog], list[OrderMessage]]:
    lifecycle_result = await session.execute(
        select(OrderLifecycleEvent)
        .where(OrderLifecycleEvent.order_id == order.id)
        .order_by(OrderLifecycleEvent.created_at.desc(), OrderLifecycleEvent.id.desc())
        .limit(TOPIC_HISTORY_MESSAGE_LIMIT)
    )
    admin_logs_result = await session.execute(
        select(AdminActionLog)
        .where(
            AdminActionLog.target_type == "order",
            AdminActionLog.target_id == order.id,
            AdminActionLog.action_type.in_(TOPIC_HISTORY_LOG_ACTIONS),
        )
        .order_by(AdminActionLog.created_at.desc(), AdminActionLog.id.desc())
        .limit(TOPIC_HISTORY_MESSAGE_LIMIT)
    )
    messages_result = await session.execute(
        select(OrderMessage)
        .where(OrderMessage.order_id == order.id)
        .order_by(OrderMessage.created_at.desc(), OrderMessage.id.desc())
        .limit(TOPIC_HISTORY_MESSAGE_LIMIT)
    )
    return (
        list(lifecycle_result.scalars().all()),
        list(admin_logs_result.scalars().all()),
        list(messages_result.scalars().all()),
    )


def build_topic_activity_items(
    *,
    order: Order,
    lifecycle_events: list[OrderLifecycleEvent],
    admin_logs: list[AdminActionLog],
    messages: list[OrderMessage],
    include_created: bool = True,
) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    if include_created:
        items.append(
            _build_topic_history_item(
                timestamp=order.created_at,
                title="Заказ создан",
                details=order.work_type_label if getattr(order, "work_type_label", None) else order.work_type,
            )
        )

    revision_timestamps = {
        int(message.created_at.timestamp())
        for message in messages
        if message.created_at
        and message.sender_type == MessageSender.CLIENT.value
        and message.message_text
        and message.message_text.startswith(REVISION_REQUEST_PREFIX)
    }
    delivery_batch_timestamps = [
        int(message.created_at.timestamp())
        for message in messages
        if message.created_at and message.delivery_batch_id
    ]
    status_change_log_signatures = [
        (
            int(log.created_at.timestamp()),
            canonicalize_order_status((log.new_value or {}).get("status")) or (log.new_value or {}).get("status"),
        )
        for log in admin_logs
        if log.created_at and log.action_type == AdminActionType.ORDER_STATUS_CHANGE.value
    ]
    payment_confirm_log_signatures = [
        (
            int(log.created_at.timestamp()),
            canonicalize_order_status((log.new_value or {}).get("status")) or (log.new_value or {}).get("status"),
        )
        for log in admin_logs
        if log.created_at and log.action_type == AdminActionType.ORDER_PAYMENT_CONFIRM.value
    ]

    for event in lifecycle_events:
        if event.event_type != OrderLifecycleEventType.STATUS_CHANGED.value:
            continue
        normalized_status = canonicalize_order_status(event.status_to) or event.status_to
        if normalized_status == OrderStatus.REVISION.value and event.created_at:
            event_ts = int(event.created_at.timestamp())
            if any(abs(event_ts - revision_ts) <= 300 for revision_ts in revision_timestamps):
                continue
        if normalized_status == OrderStatus.REVIEW.value and event.created_at:
            event_ts = int(event.created_at.timestamp())
            if any(abs(event_ts - delivery_ts) <= 300 for delivery_ts in delivery_batch_timestamps):
                continue
        if event.created_at:
            event_ts = int(event.created_at.timestamp())
            if any(
                logged_status == normalized_status and abs(event_ts - log_ts) <= 300
                for log_ts, logged_status in status_change_log_signatures
            ):
                continue
            if any(
                logged_status == normalized_status and abs(event_ts - log_ts) <= 300
                for log_ts, logged_status in payment_confirm_log_signatures
            ):
                continue
        items.append(_build_topic_status_history_item(event))

    for log in admin_logs:
        item = _build_topic_admin_log_item(log)
        if item:
            items.append(item)

    delivery_messages_by_batch: dict[int, list[OrderMessage]] = {}
    revision_messages_by_round: dict[int, list[OrderMessage]] = {}
    standalone_messages: list[OrderMessage] = []

    for message in messages:
        if message.delivery_batch_id:
            delivery_messages_by_batch.setdefault(int(message.delivery_batch_id), []).append(message)
            continue
        if message.revision_round_id and message.sender_type == MessageSender.CLIENT.value:
            revision_messages_by_round.setdefault(int(message.revision_round_id), []).append(message)
            continue
        standalone_messages.append(message)

    for delivery_messages in delivery_messages_by_batch.values():
        item = _build_topic_delivery_batch_history_item(delivery_messages)
        if item:
            items.append(item)

    for revision_messages in revision_messages_by_round.values():
        item = _build_topic_revision_round_history_item(revision_messages)
        if item:
            items.append(item)

    for message in standalone_messages:
        item = _build_topic_message_history_item(message)
        if item:
            items.append(item)

    items.sort(key=lambda item: _get_topic_history_sort_key(item["timestamp"]), reverse=True)
    return items


def build_topic_activity_snapshot_lines(
    *,
    order: Order,
    lifecycle_events: list[OrderLifecycleEvent],
    admin_logs: list[AdminActionLog],
    messages: list[OrderMessage],
    limit: int = 3,
) -> list[str]:
    items = build_topic_activity_items(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=admin_logs,
        messages=messages,
        include_created=False,
    )
    if not items:
        return ["Новых событий пока нет"]

    lines: list[str] = []
    for item in items[:limit]:
        title = str(item["title"])
        details = item.get("details")
        line = f"{format_admin_datetime(item['timestamp'])} · {title}"
        if details:
            line = f"{line} — {details}"
        compact_line = _compact_topic_text(line, limit=140)
        if compact_line:
            lines.append(compact_line)
    return lines


async def build_topic_summary_payload(
    session: AsyncSession,
    conv: Conversation,
    order: Order | None,
    user: User | None,
) -> dict[str, object]:
    snapshot_lines: list[str] | None = None
    latest_delivery = None
    draft_delivery = None
    current_revision_round = None
    operational_lines: list[str] | None = None
    if order is not None:
        lifecycle_events, admin_logs, messages = await load_topic_activity_context(session, order)
        snapshot_lines = build_topic_activity_snapshot_lines(
            order=order,
            lifecycle_events=lifecycle_events,
            admin_logs=admin_logs,
            messages=messages,
        )
        latest_batch = await get_latest_sent_delivery_batch(session, order.id)
        latest_delivery = serialize_delivery_batch(latest_batch) if latest_batch else None
        draft_batch = await get_current_delivery_draft(session, order.id)
        draft_delivery = serialize_delivery_batch(draft_batch) if draft_batch else None
        current_revision_round = await get_current_revision_round(session, order.id)
        verification_event = next(
            (
                event
                for event in lifecycle_events
                if event.event_type == OrderLifecycleEventType.STATUS_CHANGED.value
                and (canonicalize_order_status(event.status_to) or event.status_to) == OrderStatus.VERIFICATION_PENDING.value
            ),
            None,
        )
        operational_lines = build_topic_operational_lines(
            order=order,
            messages=messages,
            payment_context=build_payment_verification_context(order, verification_event),
            latest_delivery=latest_delivery,
            draft_delivery=draft_delivery,
            current_revision_round=current_revision_round,
        )
    return {
        "text": build_admin_topic_header_text(
            order=order,
            client_name=user.fullname if user else "Неизвестно",
            client_username=user.username if user else None,
            user_id=conv.user_id,
            activity_snapshot_lines=snapshot_lines,
            latest_delivery=latest_delivery,
            draft_delivery=draft_delivery,
            operational_lines=operational_lines,
        ),
        "reply_markup": build_admin_topic_header_keyboard(
            order,
            has_delivery_draft=bool(draft_delivery),
            latest_delivery_url=(latest_delivery or {}).get("files_url") if latest_delivery else None,
        ),
    }


def _get_topic_payment_method_label(value: object) -> str:
    payment_method = str(value or "").strip().lower()
    labels = {
        "card": "Карта",
        "card_manual": "Карта",
        "card_transfer": "Карта",
        "bank_transfer": "Перевод",
        "transfer": "Перевод",
        "cash": "Наличные",
        "sbp": "СБП",
        "sberbank": "Сбербанк",
        "yookassa": "ЮKassa",
        "telegram_stars": "Telegram Stars",
    }
    return labels.get(payment_method, payment_method or "Способ не указан")


def _get_topic_event_extra_data(event: OrderLifecycleEvent) -> dict[str, object]:
    payload = event.payload if isinstance(event.payload, dict) else {}
    dispatch = payload.get("dispatch")
    if isinstance(dispatch, dict):
        extra_data = dispatch.get("notification_extra_data")
        if isinstance(extra_data, dict):
            return extra_data
    return {}


def _build_topic_history_item(
    *,
    timestamp: datetime | None,
    title: str,
    details: str | None = None,
    url: str | None = None,
    url_label: str | None = None,
) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "title": title,
        "details": details,
        "url": url,
        "url_label": url_label or "Открыть",
    }


def _compact_topic_text(value: object, *, limit: int = 180) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).split())
    if not normalized:
        return None
    if len(normalized) > limit:
        normalized = f"{normalized[: limit - 1].rstrip()}…"
    return normalized


def _get_topic_history_sort_key(value: datetime | None) -> float:
    if value is None:
        return 0.0
    return value.timestamp()


def _build_topic_status_history_item(event: OrderLifecycleEvent) -> dict[str, object]:
    extra_data = _get_topic_event_extra_data(event)
    new_status = canonicalize_order_status(event.status_to) or event.status_to
    old_status = canonicalize_order_status(event.status_from) or event.status_from
    new_meta = get_status_meta(new_status)
    old_meta = get_status_meta(old_status)

    title = f"Статус: {new_meta.get('label', new_status)}"
    details = None

    if new_status == OrderStatus.VERIFICATION_PENDING.value:
        amount = extra_data.get("amount_to_pay")
        payment_phase = extra_data.get("payment_phase")
        payment_label = "Доплата" if payment_phase == "final" else "Оплата"
        details_parts = [payment_label, _get_topic_payment_method_label(extra_data.get("payment_method"))]
        if amount is not None:
            details_parts.append(format_price(amount))
        batch_count = extra_data.get("batch_orders_count")
        if batch_count:
            details_parts.append(f"пакет: {int(batch_count)}")
        title = "Клиент сообщил об оплате"
        details = " · ".join(details_parts)
    elif new_status == OrderStatus.REVIEW.value:
        title = "Работа передана клиенту"
        delivered_at = extra_data.get("delivered_at")
        details = "Проверка клиентом открыта"
        if delivered_at:
            details = f"{details} · {delivered_at}"
    elif new_status == OrderStatus.REVISION.value:
        title = "Заказ переведён в правки"
        revision_count = extra_data.get("revision_count")
        if revision_count:
            details = f"Итерация {int(revision_count)}"
    elif new_status == OrderStatus.COMPLETED.value:
        title = "Заказ завершён"
    elif new_status == OrderStatus.CANCELLED.value:
        title = "Заказ отменён"
    elif new_status == OrderStatus.REJECTED.value:
        title = "Заказ отклонён"
    elif new_status == OrderStatus.WAITING_PAYMENT.value and old_status in {
        OrderStatus.PENDING.value,
        OrderStatus.WAITING_ESTIMATION.value,
    }:
        title = "Заказ переведён к оплате"
        details = f"{old_meta.get('label', old_status)} → {new_meta.get('label', new_status)}"
    else:
        details = f"{old_meta.get('label', old_status)} → {new_meta.get('label', new_status)}"

    return _build_topic_history_item(timestamp=event.created_at, title=title, details=details)


def _build_topic_admin_log_item(log: AdminActionLog) -> dict[str, object] | None:
    title = None
    details = None

    if log.action_type == AdminActionType.ORDER_PRICE_SET.value:
        old_price = (log.old_value or {}).get("price")
        new_price = (log.new_value or {}).get("price")
        title = "Цена изменена"
        old_label = format_price(old_price) if old_price is not None else None
        new_label = format_price(new_price) if new_price is not None else None
        details = " → ".join(part for part in [old_label, new_label] if part) or log.details
    elif log.action_type == AdminActionType.ORDER_PROGRESS_UPDATE.value:
        old_progress = (log.old_value or {}).get("progress")
        new_progress = (log.new_value or {}).get("progress")
        title = "Прогресс обновлён"
        if old_progress is not None and new_progress is not None:
            details = f"{int(old_progress)}% → {int(new_progress)}%"
        else:
            details = log.details
    elif log.action_type == AdminActionType.ORDER_PAYMENT_REQUEST.value:
        title = "Запрос на оплату отправлен"
        amount = (log.new_value or {}).get("amount_to_pay")
        payment_phase = str((log.new_value or {}).get("payment_phase") or "").strip().lower()
        if amount:
            payment_label = "Доплата" if payment_phase == "final" else "Оплата"
            details = f"{payment_label} {format_price(amount)}"
        else:
            details = log.details
    elif log.action_type == AdminActionType.ORDER_PAYMENT_CONFIRM.value:
        title = "Оплата подтверждена вручную"
        details = log.details
    elif log.action_type == AdminActionType.ORDER_PAYMENT_REJECT.value:
        title = "Оплата отклонена"
        details = str((log.new_value or {}).get("reason") or log.details or "")
    elif log.action_type == AdminActionType.ORDER_NOTE_UPDATE.value:
        title = "Обновлена внутренняя заметка"
        old_notes = str((log.old_value or {}).get("notes") or "").strip()
        new_notes = str((log.new_value or {}).get("notes") or "").strip()
        if old_notes and new_notes:
            details = f"{_compact_topic_text(old_notes, limit=120)} → {_compact_topic_text(new_notes, limit=120)}"
        elif new_notes:
            details = _compact_topic_text(new_notes, limit=180)
        elif old_notes:
            details = f"Очищено: {_compact_topic_text(old_notes, limit=120)}"
        else:
            details = log.details
    elif log.action_type == AdminActionType.ORDER_STATUS_CHANGE.value:
        old_status = canonicalize_order_status((log.old_value or {}).get("status")) or (log.old_value or {}).get("status")
        new_status = canonicalize_order_status((log.new_value or {}).get("status")) or (log.new_value or {}).get("status")
        old_label = get_status_meta(old_status).get("label", old_status) if old_status else None
        new_label = get_status_meta(new_status).get("label", new_status) if new_status else None
        title = "Менеджер изменил статус"
        status_diff = " → ".join(part for part in [old_label, new_label] if part)
        details = " · ".join(part for part in [log.details, status_diff] if part)
    else:
        return None

    if log.admin_username:
        actor = f"@{log.admin_username}"
        details = f"{details} · {actor}" if details else actor

    return _build_topic_history_item(timestamp=log.created_at, title=title, details=details)


def _build_topic_message_history_item(message: OrderMessage) -> dict[str, object] | None:
    if message.sender_type == MessageSender.CLIENT.value and message.message_text:
        if message.message_text.startswith(REVISION_REQUEST_PREFIX):
            comment = message.message_text.split("\n\n", 1)[1].strip() if "\n\n" in message.message_text else ""
            return _build_topic_history_item(
                timestamp=message.created_at,
                title="Клиент запросил правки",
                details=_compact_topic_text(comment, limit=220),
            )
        return None

    if message.sender_type != MessageSender.ADMIN.value:
        return None

    if message.file_type in DELIVERABLE_FILE_TYPES:
        return _build_topic_history_item(
            timestamp=message.created_at,
            title=f"Выдан файл: {message.file_name or 'без названия'}",
            details=_compact_topic_text(message.message_text, limit=180),
            url=message.yadisk_url,
            url_label="Открыть файл",
        )

    if message.message_text:
        return _build_topic_history_item(
            timestamp=message.created_at,
            title="Менеджер написал клиенту",
            details=_compact_topic_text(message.message_text.strip(), limit=220),
        )

    return None


def _build_topic_delivery_batch_history_item(messages: list[OrderMessage]) -> dict[str, object] | None:
    if not messages:
        return None

    sorted_messages = sorted(
        messages,
        key=lambda current: _get_topic_history_sort_key(current.created_at),
        reverse=True,
    )
    summary_message = next((message for message in sorted_messages if message.message_text), None)
    file_count = sum(1 for message in sorted_messages if message.file_type in DELIVERABLE_FILE_TYPES)
    version_url = next(
        (message.yadisk_url for message in sorted_messages if message.yadisk_url),
        None,
    )
    timestamp = next((message.created_at for message in sorted_messages if message.created_at), None)

    title = "Версия отправлена клиенту"
    details_parts: list[str] = []
    comment: str | None = None

    if summary_message and summary_message.message_text:
        summary_lines = [line.strip() for line in summary_message.message_text.splitlines() if line.strip()]
        if summary_lines:
            title = summary_lines[0].removeprefix("📦").strip() or title
        for line in summary_lines[1:]:
            if line.startswith("Заказ #"):
                continue
            if line.startswith("Версия:") or line.startswith("Файлов:"):
                details_parts.append(line)
                continue
            comment = _compact_topic_text(line, limit=180)
            if comment:
                break

    if file_count > 0 and not any(part.startswith("Файлов:") for part in details_parts):
        details_parts.append(f"Файлов: {file_count}")
    if comment:
        details_parts.append(comment)

    return _build_topic_history_item(
        timestamp=timestamp,
        title=title,
        details=" · ".join(part for part in details_parts if part),
        url=version_url,
        url_label="Открыть версию",
    )


def _build_topic_revision_round_history_item(messages: list[OrderMessage]) -> dict[str, object] | None:
    if not messages:
        return None

    sorted_messages = sorted(
        messages,
        key=lambda current: _get_topic_history_sort_key(current.created_at),
        reverse=True,
    )
    request_message = next(
        (
            message
            for message in sorted_messages
            if message.message_text and message.message_text.startswith(REVISION_REQUEST_PREFIX)
        ),
        None,
    )
    extra_text_messages = [
        message
        for message in sorted_messages
        if message.message_text and not message.message_text.startswith(REVISION_REQUEST_PREFIX)
    ]
    file_count = sum(1 for message in sorted_messages if message.file_type)
    timestamp = next((message.created_at for message in sorted_messages if message.created_at), None)

    title = "Клиент запросил правки"
    if file_count > 0 or extra_text_messages:
        title = "Клиент дополнил материалы по правке"

    details_parts: list[str] = []
    if request_message and request_message.message_text:
        request_comment = request_message.message_text.split("\n\n", 1)[1].strip() if "\n\n" in request_message.message_text else ""
        request_comment = _compact_topic_text(request_comment, limit=180)
        if request_comment:
            details_parts.append(request_comment)
    latest_extra_text = _compact_topic_text(
        extra_text_messages[0].message_text if extra_text_messages else None,
        limit=160,
    )
    if latest_extra_text:
        details_parts.append(f"дополнил: {latest_extra_text}")
    if file_count > 0:
        details_parts.append(f"вложений: {file_count}")

    return _build_topic_history_item(
        timestamp=timestamp,
        title=title,
        details=" · ".join(part for part in details_parts if part),
    )


def build_topic_history_text(
    *,
    order: Order,
    lifecycle_events: list[OrderLifecycleEvent],
    admin_logs: list[AdminActionLog],
    messages: list[OrderMessage],
    limit: int = TOPIC_HISTORY_ITEM_LIMIT,
) -> str:
    items = build_topic_activity_items(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=admin_logs,
        messages=messages,
    )

    lines = [f"🕘 <b>Последние события по заказу #{order.id}</b>", ""]
    for item in items[:limit]:
        timestamp_label = format_admin_datetime(item["timestamp"])
        lines.append(f"• <b>{timestamp_label}</b> — {format_plain_text(str(item['title']))}")
        details = item.get("details")
        if details:
            lines.append(f"  {format_plain_text(str(details))}")
        url = item.get("url")
        if url:
            lines.append(f"  <a href=\"{url}\">{format_plain_text(str(item.get('url_label') or 'Открыть'))}</a>")
        lines.append("")

    lines.append("💡 <i>/summary — полная сводка · /note текст — обновить заметку</i>")
    return "\n".join(lines).strip()


async def build_topic_history_payload(session: AsyncSession, order: Order) -> dict[str, object]:
    lifecycle_events, admin_logs, messages = await load_topic_activity_context(session, order)

    return {
        "text": build_topic_history_text(
            order=order,
            lifecycle_events=lifecycle_events,
            admin_logs=admin_logs,
            messages=messages,
        ),
        "disable_web_page_preview": True,
    }


def build_topic_note_text(order: Order) -> str:
    return "\n".join(
        [
            f"📝 <b>Внутренняя заметка по заказу #{order.id}</b>",
            "",
            f"Текущая заметка: {format_plain_text(order.admin_notes, 'пусто')}",
            "",
            "<code>/note текст</code> — сохранить или заменить",
            "<code>/note -</code> — очистить",
            "<code>/history</code> — показать последние события",
        ]
    )


def _extract_latest_client_revision_request(messages: list[OrderMessage]) -> tuple[str | None, datetime | None]:
    for message in sorted(messages, key=lambda current: _get_topic_history_sort_key(current.created_at), reverse=True):
        if message.sender_type != MessageSender.CLIENT.value or not message.message_text:
            continue
        if not message.message_text.startswith(REVISION_REQUEST_PREFIX):
            continue
        comment = message.message_text.split("\n\n", 1)[1].strip() if "\n\n" in message.message_text else ""
        return _compact_topic_text(comment, limit=220), message.created_at
    return None, None


def _get_revision_round_client_stats(
    current_revision_round: OrderRevisionRound | None,
    messages: list[OrderMessage],
) -> tuple[int, int, datetime | None, str | None]:
    if current_revision_round is None:
        return 0, 0, None, None

    round_messages = [
        message
        for message in messages
        if int(message.revision_round_id or 0) == int(current_revision_round.id or 0)
        and message.sender_type == MessageSender.CLIENT.value
    ]
    file_count = sum(1 for message in round_messages if message.file_type)
    text_messages = [
        message
        for message in round_messages
        if message.message_text and not message.message_text.startswith(REVISION_REQUEST_PREFIX)
    ]
    latest_activity_at = current_revision_round.last_client_activity_at or current_revision_round.requested_at
    if text_messages:
        latest_text = sorted(
            text_messages,
            key=lambda current: _get_topic_history_sort_key(current.created_at),
            reverse=True,
        )[0].message_text
        latest_text = _compact_topic_text(latest_text, limit=220)
    else:
        latest_text = _compact_topic_text(current_revision_round.initial_comment, limit=220)
    return len(text_messages), file_count, latest_activity_at, latest_text


def build_topic_operational_lines(
    *,
    order: Order,
    messages: list[OrderMessage],
    payment_context,
    latest_delivery: dict[str, object] | None,
    draft_delivery: dict[str, object] | None,
    current_revision_round: OrderRevisionRound | None = None,
) -> list[str]:
    canonical_status = canonicalize_order_status(order.status) or order.status
    revision_comment, revision_requested_at = _extract_latest_client_revision_request(messages)
    lines: list[str] = []

    if draft_delivery:
        draft_files = int(draft_delivery.get("file_count") or 0)
        lines.append(f"Сейчас: собран черновик версии ({draft_files} файл(ов))")
        lines.append("Дальше: отправить клиенту через /deliver")
        return lines

    if canonical_status == OrderStatus.VERIFICATION_PENDING.value and payment_context:
        payment_label = "доплату" if getattr(payment_context, "payment_phase", None) == "final" else "оплату"
        lines.append(f"Сейчас: клиент сообщил про {payment_label} {format_price(payment_context.amount_to_pay)}")
        if getattr(payment_context, "is_batch", False) and getattr(payment_context, "batch_orders_count", 0) > 1:
            lines.append(
                f"Контекст: пакет из {payment_context.batch_orders_count} заказов на {format_price(payment_context.batch_total_amount)}"
            )
        lines.append("Дальше: сверить поступление и подтвердить через /paid")
        return lines

    if canonical_status == OrderStatus.WAITING_PAYMENT.value:
        payment_phase = get_payment_phase(order)
        payment_label = "доплату" if payment_phase == "final" else "оплату"
        amount = get_requested_payment_amount(order, getattr(order, "payment_scheme", None))
        lines.append(f"Сейчас: ждём {payment_label} {format_price(float(amount))} от клиента")
        lines.append("Дальше: при необходимости повторить запрос через /pay")
        return lines

    if current_revision_round is not None:
        text_count, file_count, latest_activity_at, latest_text = _get_revision_round_client_stats(
            current_revision_round,
            messages,
        )
        lines.append(f"Сейчас: открыта правка #{int(current_revision_round.round_number or order.revision_count or 1)}")
        if latest_text:
            lines.append(f"Запрос клиента: {latest_text}")
        elif revision_comment:
            lines.append(f"Запрос клиента: {revision_comment}")
        if file_count > 0 or text_count > 0:
            details: list[str] = []
            if text_count > 0:
                details.append(f"сообщений: {text_count}")
            if file_count > 0:
                details.append(f"вложений: {file_count}")
            lines.append(f"Материалы в круге: {' · '.join(details)}")
        if latest_activity_at or revision_requested_at:
            lines.append(
                f"Последняя активность клиента: {format_admin_datetime(latest_activity_at or revision_requested_at)}"
            )
        lines.append("Дальше: загрузить материалы в топик и отправить через /deliver")
        return lines

    if canonical_status == OrderStatus.REVISION.value:
        lines.append("Сейчас: клиент ждёт исправленную версию")
        if revision_comment:
            lines.append(f"Правка клиента: {revision_comment}")
        if revision_requested_at:
            lines.append(f"Последняя активность клиента: {format_admin_datetime(revision_requested_at)}")
        lines.append("Дальше: загрузить материалы в топик и отправить через /deliver")
        return lines

    if canonical_status == OrderStatus.REVIEW.value:
        if latest_delivery:
            latest_version = latest_delivery.get("version_number")
            version_label = f"версию {latest_version}" if latest_version else "последнюю версию"
            lines.append(f"Сейчас: клиент проверяет {version_label}")
        else:
            lines.append("Сейчас: заказ на проверке у клиента")
        lines.append("Дальше: ждать подтверждение или новый запрос на правки")
        return lines

    if canonical_status == OrderStatus.COMPLETED.value:
        lines.append("Сейчас: заказ закрыт")
        return lines

    return lines


def build_topic_delivery_help_text(order: Order) -> str:
    return "\n".join(
        [
            f"📦 <b>Выдача версии по заказу #{order.id}</b>",
            "",
            "1. Загрузите файлы, фото или голосовые прямо в этот топик.",
            "2. Они попадут в черновик выдачи и не уйдут клиенту автоматически.",
            "3. Отправьте собранную версию командой <code>/deliver комментарий</code>.",
            "4. Для отправки без комментария используйте <code>/deliver -</code>.",
            "5. Для очистки черновика используйте <code>/deliver clear</code>.",
        ]
    )


async def add_topic_admin_action_log(
    session: AsyncSession,
    *,
    admin_id: int,
    admin_username: str | None,
    action_type: AdminActionType,
    target_id: int,
    details: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            admin_username=admin_username,
            action_type=action_type.value,
            target_type="order",
            target_id=target_id,
            details=details,
            old_value=old_value,
            new_value=new_value,
        )
    )


async def add_topic_price_set_log(
    session: AsyncSession,
    *,
    order: Order,
    admin_id: int,
    admin_username: str | None,
    old_price: float | int | None,
    old_bonus_used: float | int | None,
) -> None:
    await add_topic_admin_action_log(
        session,
        admin_id=admin_id,
        admin_username=admin_username,
        action_type=AdminActionType.ORDER_PRICE_SET,
        target_id=order.id,
        details=f"Цена обновлена до {format_price(order.price)}",
        old_value={
            "price": float(old_price) if old_price is not None else None,
            "bonus_used": float(old_bonus_used or 0),
        },
        new_value={
            "price": float(order.price or 0),
            "bonus_used": float(order.bonus_used or 0),
            "final_price": float(order.final_price or 0),
        },
    )


async def add_topic_status_change_log(
    session: AsyncSession,
    *,
    order: Order,
    admin_id: int,
    admin_username: str | None,
    old_status: str | None,
    new_status: str | None,
    details: str,
) -> None:
    await add_topic_admin_action_log(
        session,
        admin_id=admin_id,
        admin_username=admin_username,
        action_type=AdminActionType.ORDER_STATUS_CHANGE,
        target_id=order.id,
        details=details,
        old_value={"status": old_status},
        new_value={"status": new_status},
    )


async def refresh_topic_header(
    bot: Bot,
    session: AsyncSession,
    conv: Conversation,
    order: Order,
    user: User | None,
) -> int | None:
    if not conv.topic_id:
        return None

    payload = await build_topic_summary_payload(session, conv, order, user)

    if conv.topic_header_message_id:
        try:
            await bot.edit_message_text(
                chat_id=settings.ADMIN_GROUP_ID,
                message_id=conv.topic_header_message_id,
                text=payload["text"],
                reply_markup=payload["reply_markup"],
            )
            return conv.topic_header_message_id
        except TelegramBadRequest as exc:
            error_text = str(exc).lower()
            if "message is not modified" in error_text:
                return conv.topic_header_message_id
            if "message to edit not found" in error_text or "message_thread_id" in error_text:
                conv.topic_header_message_id = None
                await session.commit()
            else:
                logger.warning("Failed to edit topic header for order #%s: %s", order.id, exc)
                return None

    try:
        message = await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=conv.topic_id,
            **payload,
        )
    except TelegramBadRequest as exc:
        logger.warning("Failed to send topic header for order #%s: %s", order.id, exc)
        return None

    conv.topic_header_message_id = message.message_id
    await session.commit()
    return message.message_id


async def maybe_refresh_topic_header(
    bot: Bot,
    session: AsyncSession,
    conv: Conversation,
    order: Order,
    user: User | None,
) -> None:
    try:
        await refresh_topic_header(bot, session, conv, order, user)
    except Exception as exc:
        logger.warning("Failed to refresh topic header for order #%s: %s", order.id, exc)


async def refresh_topic_card(
    bot: Bot,
    session: AsyncSession,
    conv: Conversation,
    order: Order,
    user: User | None,
) -> None:
    from bot.services.live_cards import send_or_update_card

    await refresh_topic_header(bot, session, conv, order, user)
    conv.topic_card_message_id = None
    await session.commit()

    await send_or_update_card(
        bot=bot,
        order=order,
        session=session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )


async def reopen_review_from_topic(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    *,
    admin_id: int | None = None,
    admin_username: str | None = None,
) -> str:
    previous_status = getattr(order, "status", None)
    had_delivered_at = getattr(order, "delivered_at", None) is not None

    if previous_status == OrderStatus.COMPLETED.value:
        return "❌ Заказ уже завершён"

    if not can_deliver_order(order) and not is_order_already_delivered(order):
        return "❌ Возврат на проверку доступен из статусов: оплачено, в работе или на правках."

    result = await sync_order_delivery_review(
        session,
        bot,
        order,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        yadisk_link=order.files_url,
        card_extra_text="✏️ Менеджер вернул заказ на проверку",
    )

    if result.reopened_review and admin_id is not None:
        await add_topic_status_change_log(
            session,
            order=order,
            admin_id=admin_id,
            admin_username=admin_username,
            old_status=previous_status,
            new_status=OrderStatus.REVIEW.value,
            details="Менеджер вернул заказ на проверку из топика",
        )
        await session.commit()

    if result.reopened_review:
        return "✅ Заказ возвращён клиенту на проверку"

    if previous_status == OrderStatus.REVIEW.value and not had_delivered_at and result.delivered_at:
        return "ℹ️ Заказ уже был на проверке. Время последней выдачи обновлено."

    return "ℹ️ Заказ уже находится на проверке у клиента"


async def deliver_draft_from_topic(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    *,
    admin_id: int,
    manager_comment: str | None = None,
) -> str:
    draft = await get_current_delivery_draft(session, order.id)
    if draft is None or not list(draft.file_manifest or []):
        return "❌ Черновик выдачи пуст. Сначала загрузите файлы в топик."

    normalized_comment = (manager_comment or "").strip()
    if normalized_comment.lower() == "clear":
        await cancel_delivery_draft(session, order.id)
        return "🧹 Черновик выдачи очищен"
    if normalized_comment and normalized_comment != "-":
        draft.manager_comment = normalized_comment
        await session.commit()
    elif normalized_comment == "-":
        draft.manager_comment = None
        await session.commit()

    result = await send_order_delivery_batch(
        session,
        bot,
        order,
        user=user,
        source="topic",
        sent_by_admin_id=admin_id,
        batch=draft,
        manager_comment=draft.manager_comment,
    )
    return (
        f"✅ Версия {result.batch.version_number} отправлена клиенту"
        f"{' и возвращена на проверку' if result.review_status_changed else ''}"
    )


async def complete_order_from_topic(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    *,
    admin_id: int | None = None,
    admin_username: str | None = None,
) -> str:
    previous_status = order.status
    if order.status == OrderStatus.COMPLETED.value:
        return "ℹ️ Заказ уже завершён"

    if not can_complete_order(order):
        return "❌ Завершение доступно только когда заказ на проверке у клиента."

    try:
        change = apply_order_status_transition(order, OrderStatus.COMPLETED.value)
    except OrderStatusTransitionError as exc:
        return f"❌ {exc}"

    if admin_id is not None:
        await add_topic_status_change_log(
            session,
            order=order,
            admin_id=admin_id,
            admin_username=admin_username,
            old_status=previous_status,
            new_status=OrderStatus.COMPLETED.value,
            details="Менеджер завершил заказ из топика",
        )

    closed_at = datetime.now().strftime("%d.%m %H:%M")
    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            close_topic=True,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            yadisk_link=order.files_url,
            card_extra_text=f"✅ Закрыто менеджером из топика — {closed_at}",
        ),
    )
    return "✅ Заказ завершён. Топик будет закрыт."


async def request_payment_from_topic(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    *,
    admin_id: int | None = None,
    admin_username: str | None = None,
) -> str:
    if user is None:
        return "❌ Клиент не найден"

    if (order.price or 0) <= 0:
        return "❌ У заказа ещё не установлена цена"

    remaining_amount = get_order_remaining_amount(order)
    if remaining_amount <= 0:
        return "ℹ️ Заказ уже полностью оплачен"

    if order.status == OrderStatus.VERIFICATION_PENDING.value:
        return "ℹ️ Платёж уже на проверке. Можно подтвердить его командой /paid после сверки."

    if order.status not in TOPIC_PAYMENT_REQUEST_ALLOWED_STATUSES:
        return "❌ Из текущего статуса нельзя запрашивать оплату из топика."

    amount_to_pay = get_requested_payment_amount(order, getattr(order, "payment_scheme", None))
    payment_label = get_requested_payment_label(order, getattr(order, "payment_scheme", None))
    payment_phase = get_payment_phase(order)
    sent = False

    if payment_phase == "final":
        user_text = (
            f"💳 <b>НУЖНА ДОПЛАТА</b>\n\n"
            f"Заказ <b>#{order.id}</b> почти готов.\n"
            f"К доплате: <b>{format_price(float(amount_to_pay))}</b>\n\n"
            "Откройте заказ, чтобы перейти к оплате и сразу увидеть все детали."
        )
        await bot.send_message(
            order.user_id,
            user_text,
            reply_markup=build_order_keyboard(order.id, primary_text="💳 Открыть оплату"),
        )
        sent = True

        try:
            from bot.services.realtime_notifications import send_custom_notification

            await send_custom_notification(
                telegram_id=order.user_id,
                title="💳 Нужна доплата",
                message=f"По заказу #{order.id} ждём {format_price(float(amount_to_pay))}.",
                notification_type="payment",
                icon="credit-card",
                color="#f59e0b",
                action="view_order",
                data={"order_id": order.id, "amount_to_pay": float(amount_to_pay), "payment_phase": payment_phase},
            )
        except Exception as exc:
            logger.debug("Topic follow-up payment WS notification failed: %s", exc)
    else:
        from bot.handlers.channel_cards import send_payment_notification

        sent = await send_payment_notification(bot, order, user, float(amount_to_pay))

    if not sent:
        return "⚠️ Не удалось отправить клиенту оплату. Проверьте Telegram и попробуйте ещё раз."

    if admin_id is not None:
        await add_topic_admin_action_log(
            session,
            admin_id=admin_id,
            admin_username=admin_username,
            action_type=AdminActionType.ORDER_PAYMENT_REQUEST,
            target_id=order.id,
            details=f"Отправлен запрос на {'доплату' if payment_phase == 'final' else 'оплату'}",
            old_value=None,
            new_value={
                "amount_to_pay": float(amount_to_pay),
                "payment_phase": payment_phase,
                "remaining_amount": float(remaining_amount),
            },
        )
        await session.commit()

    try:
        from bot.services.live_cards import update_live_card

        await update_live_card(
            bot=bot,
            session=session,
            order=order,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            yadisk_link=order.files_url,
            extra_text=(
                f"💳 {payment_label} {format_price(float(amount_to_pay))} отправлен — "
                f"{datetime.now().strftime('%d.%m %H:%M')}"
            ),
        )
    except Exception as exc:
        logger.warning("Failed to refresh live card after topic payment request for order #%s: %s", order.id, exc)

    if payment_phase == "final":
        return f"📤 Запрос на доплату {format_price(float(amount_to_pay))} отправлен клиенту"
    return f"📤 Счёт на {format_price(float(amount_to_pay))} отправлен клиенту"


async def confirm_payment_from_topic(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    *,
    admin_id: int | None = None,
    admin_username: str | None = None,
) -> str:
    if user is None:
        return "❌ Клиент не найден"

    if (order.price or 0) <= 0:
        return "❌ У заказа ещё не установлена цена"

    if order.status not in TOPIC_PAYMENT_CONFIRM_ALLOWED_STATUSES:
        return "❌ Из текущего статуса нельзя подтвердить оплату из топика."

    amount_to_pay = get_requested_payment_amount(order, getattr(order, "payment_scheme", None))
    if amount_to_pay <= 0:
        return "ℹ️ Заказ уже полностью оплачен"

    previous_status = order.status
    previous_paid_amount = getattr(order, "paid_amount", 0)
    payment_update = build_payment_update(
        previous_paid_amount=previous_paid_amount,
        new_paid_amount=previous_paid_amount + amount_to_pay,
        final_price=order.final_price,
        current_status=order.status,
    )

    try:
        status_change = apply_order_status_transition(order, payment_update.new_status)
    except OrderStatusTransitionError as exc:
        return f"❌ {exc}"

    order.paid_amount = payment_update.new_paid_amount

    if payment_update.is_first_successful_payment and order.bonus_used > 0:
        await BonusService.deduct_bonus(
            session=session,
            user_id=order.user_id,
            amount=order.bonus_used,
            reason=BonusReason.ORDER_DISCOUNT,
            description=f"Списание на заказ #{order.id}",
            bot=bot,
            user=user,
            auto_commit=False,
        )

    apply_payment_update_to_user(user, payment_update)

    if status_change.changed:
        await finalize_order_status_change(
            session,
            bot,
            order,
            status_change,
            dispatch=OrderStatusDispatchOptions(notify_user=False),
        )
    else:
        await session.commit()

    order_bonus = 0
    if payment_update.is_first_successful_payment:
        try:
            order_bonus = await BonusService.process_order_bonus(
                session=session,
                bot=bot,
                user_id=order.user_id,
            )
        except Exception as exc:
            logger.warning("Failed to award order bonus for topic payment order #%s: %s", order.id, exc)

        if user.referrer_id:
            try:
                await BonusService.process_referral_bonus(
                    session=session,
                    bot=bot,
                    referrer_id=user.referrer_id,
                    order_amount=order.price,
                    referred_user_id=order.user_id,
                )
            except Exception as exc:
                logger.warning("Failed to award referral bonus for topic payment order #%s: %s", order.id, exc)

    payment_label = get_payment_label(payment_update)
    payment_delta = float(payment_update.payment_delta)
    payment_phase = "final" if payment_update.is_followup_payment else "initial"
    remaining_amount = float(get_order_remaining_amount(order))

    if admin_id is not None:
        await add_topic_admin_action_log(
            session,
            admin_id=admin_id,
            admin_username=admin_username,
            action_type=AdminActionType.ORDER_PAYMENT_CONFIRM,
            target_id=order.id,
            details=f"Подтверждена {'доплата' if payment_phase == 'final' else 'оплата'} {format_price(payment_delta)} из топика",
            old_value={
                "paid_amount": float(previous_paid_amount or 0),
                "status": previous_status,
            },
            new_value={
                "paid_amount": float(order.paid_amount or 0),
                "payment_phase": payment_phase,
                "payment_delta": payment_delta,
                "status": order.status,
            },
        )
        await session.commit()

    try:
        from bot.services.live_cards import update_live_card

        await update_live_card(
            bot=bot,
            session=session,
            order=order,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            yadisk_link=order.files_url,
            extra_text=(
                f"✅ {payment_label} {format_price(payment_delta)} подтверждён из топика — "
                f"{datetime.now().strftime('%d.%m %H:%M')}"
            ),
        )
    except Exception as exc:
        logger.warning("Failed to refresh live card after topic payment confirmation for order #%s: %s", order.id, exc)

    try:
        from bot.api.websocket import notify_order_update

        await notify_order_update(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=order.status,
            order_data={
                "paid_amount": float(order.paid_amount or 0),
                "payment_delta": payment_delta,
                "payment_label": payment_label,
                "payment_phase": payment_phase,
                "remaining_amount": remaining_amount,
            },
        )
    except Exception as exc:
        logger.debug("Topic payment order_update WS notification failed: %s", exc)

    try:
        from bot.services.realtime_notifications import send_custom_notification

        await send_custom_notification(
            telegram_id=order.user_id,
            title="✅ Оплата подтверждена",
            message=f"{payment_label}: {format_price(payment_delta)}. Заказ обновлён.",
            notification_type="success",
            icon="check-circle",
            color="#22c55e",
            celebration=payment_update.is_first_successful_payment,
            action="view_order",
            data={"order_id": order.id, "status": order.status, "paid_amount": float(order.paid_amount or 0)},
        )
    except Exception as exc:
        logger.debug("Topic payment custom notification failed: %s", exc)

    bonus_line = f"\n\n🎁 +{order_bonus:.0f}₽ бонусов на баланс!" if order_bonus > 0 else ""
    user_text = (
        f"✅ <b>Оплата подтверждена</b>\n\n"
        f"Заказ <b>#{order.id}</b>\n"
        f"{payment_label}: <b>{format_price(payment_delta)}</b>\n\n"
        f"Статус заказа обновлён. Все детали уже доступны в приложении.{bonus_line}"
    )
    try:
        await bot.send_message(
            order.user_id,
            user_text,
            reply_markup=build_order_keyboard(order.id),
        )
    except Exception as exc:
        logger.warning("Failed to send Telegram payment confirmation for order #%s: %s", order.id, exc)

    return f"✅ {payment_label} {format_price(payment_delta)} подтверждён"


def format_order_info(order: Order) -> str:
    """Форматирует краткую информацию о заказе"""
    work_type = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type
    lines = [
        f"Заказ <code>#{order.id}</code>",
        f"Формат: {format_plain_text(work_type)}",
        f"Срок: {format_deadline_for_admin(order.deadline)}",
        f"Статус: {format_plain_text(order.status_label)}",
    ]

    if order.price > 0:
        lines.extend(build_price_breakdown_lines(order))
    else:
        lines.append("Стоимость: ещё не назначена")

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    ВХОД В ЧАТ (КЛИЕНТ)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("enter_chat_order_"))
async def enter_chat_by_order(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    bot: Bot,
):
    """Клиент входит в чат по заказу"""
    order_id = int(callback.data.replace("enter_chat_order_", ""))

    # Проверяем что это владелец заказа
    order = await session.get(Order, order_id)
    if not order or order.user_id != callback.from_user.id:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    # Устанавливаем Sticky State
    await state.set_state(ChatStates.in_chat)
    await state.update_data(
        order_id=order_id,
        conv_type=ConversationType.ORDER_CHAT.value,
    )

    await callback.message.answer(
        f"💬 <b>Чат по заказу #{order_id}</b>\n\n"
        "Вы в чате с менеджером.\n"
        "Можете писать текстом, слать файлы и голосовые.\n\n"
        "Чтобы выйти — нажмите кнопку внизу 👇",
        reply_markup=get_exit_chat_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "enter_chat_support")
async def enter_chat_support(
    callback: CallbackQuery,
    state: FSMContext,
):
    """Клиент входит в чат поддержки"""
    await state.set_state(ChatStates.in_chat)
    await state.update_data(
        order_id=None,
        conv_type=ConversationType.SUPPORT.value,
    )

    await callback.message.answer(
        "💬 <b>Чат поддержки</b>\n\n"
        "Напишите вопрос по оплате, срокам, правкам, файлам или навигации.\n"
        "Можно отправлять текст, документы, фото и голосовые.\n\n"
        "Чтобы выйти — нажмите кнопку внизу 👇",
        reply_markup=get_exit_chat_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "support_bot_chat")
async def support_bot_chat_entry(
    callback: CallbackQuery,
    state: FSMContext,
):
    """Legacy callback для входа в чат поддержки (совместимость)"""
    await enter_chat_support(callback, state)


# ══════════════════════════════════════════════════════════════
#                    ВЫХОД ИЗ ЧАТА (КЛИЕНТ)
# ══════════════════════════════════════════════════════════════

@router.message(ChatStates.in_chat, F.text == "🔙 Выйти в меню")
async def exit_chat(message: Message, state: FSMContext):
    """Клиент выходит из чата"""
    await state.clear()

    from bot.keyboards.inline import get_persistent_menu
    await message.answer(
        "✅ Вы вышли из чата.\n\n"
        "Если понадобится связаться — всегда можете написать снова!",
        reply_markup=get_persistent_menu(),
    )


# ══════════════════════════════════════════════════════════════
#                    CLIENT → ADMIN (STICKY STATE)
# ══════════════════════════════════════════════════════════════

@router.message(ChatStates.in_chat)
async def client_message_to_topic(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    bot: Bot,
):
    """
    Обработчик всех сообщений клиента в режиме чата.
    Пересылает в топик админской группы.
    Self-Healing: автоматически восстанавливает удалённые топики.
    """
    data = await state.get_data()
    order_id = data.get("order_id")
    conv_type = data.get("conv_type", ConversationType.SUPPORT.value)

    async def try_forward_to_topic(conv: Conversation, topic_id: int) -> bool:
        """Попытка переслать сообщение в топик"""
        try:
            await bot.copy_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=topic_id,
                from_chat_id=message.chat.id,
                message_id=message.message_id,
            )
            return True
        except TelegramBadRequest as e:
            error_str = str(e).lower()
            if "thread not found" in error_str or "message_thread_id" in error_str or "chat not found" in error_str:
                return False
            raise

    try:
        # Получаем или создаём топик
        conv, topic_id = await get_or_create_topic(
            bot, session, message.from_user.id, order_id, conv_type
        )

        # Пытаемся переслать в топик
        forwarded = await try_forward_to_topic(conv, topic_id)

        if not forwarded:
            # SELF-HEALING: Топик удалён — создаём новый
            logger.warning(f"🔧 SELF-HEALING triggered in client_message_to_topic for order {order_id}")

            # Пересоздаём топик
            conv, topic_id = await get_or_create_topic(
                bot, session, message.from_user.id, order_id, conv_type,
                force_recreate=True
            )

            # Пробуем ещё раз
            forwarded = await try_forward_to_topic(conv, topic_id)
            if not forwarded:
                raise TelegramBadRequest(method="copy_message", message="Topic recreation failed")

            # Логируем инцидент Self-Healing
            logger.info(f"✅ SELF-HEALING completed: new topic {topic_id} for order {order_id}")

        # Сохраняем сообщение в БД
        await save_message_to_db(
            session=session,
            order_id=order_id,
            sender_type=MessageSender.CLIENT.value,
            sender_id=message.from_user.id,
            message=message,
            bot=bot,
        )

        # Обновляем Conversation
        await update_conversation(
            session, conv,
            last_message=get_message_preview(message),
            sender=MessageSender.CLIENT.value,
            increment_unread=True,
        )

        if conv.order_id:
            order = await session.get(Order, conv.order_id)
            user_query = select(User).where(User.telegram_id == conv.user_id)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            if order:
                await maybe_refresh_topic_header(bot, session, conv, order, user)

        # Подтверждение клиенту
        await message.answer("✅ Сообщение отправлено!")

    except TelegramBadRequest as e:
        logger.error(f"Failed to forward message to topic: {e}")
        await message.answer(
            "⚠️ Не удалось отправить сообщение. Попробуйте позже."
        )
    except Exception as e:
        logger.error(f"Error in client_message_to_topic: {e}")
        await message.answer("❌ Произошла ошибка. Попробуйте позже.")


# ══════════════════════════════════════════════════════════════
#                    ADMIN → CLIENT (FROM TOPIC)
# ══════════════════════════════════════════════════════════════

@router.message(F.chat.id == settings.ADMIN_GROUP_ID, F.message_thread_id)
async def admin_message_from_topic(
    message: Message,
    session: AsyncSession,
    bot: Bot,
):
    """
    Обработчик сообщений админа из топика.
    Пересылает клиенту.
    """
    # Игнорируем сообщения бота (кроме анонимного админа)
    if message.from_user.is_bot and message.from_user.id != 1087968824:
        return

    # Игнорируем служебные сообщения (создание топика и т.д.)
    if message.forum_topic_created or message.forum_topic_edited or message.forum_topic_closed:
        return

    # Проверяем на внутренний комментарий (начинается с точки)
    if message.text and message.text.startswith("."):
        # Это внутренний комментарий команды — не пересылаем
        return

    # Команды топика должны оставаться внутренними и не улетать клиенту.
    if message.text and message.text.strip().startswith("/"):
        return

    topic_id = message.message_thread_id

    conv, order, user = await get_topic_context(session, topic_id, include_user=True)

    if not conv:
        # Топик не привязан к диалогу — игнорируем
        logger.debug(f"No conversation found for topic {topic_id}")
        return

    if conv.order_id and (message.photo or message.document or message.video or message.voice or message.audio):
        order = order or await session.get(Order, conv.order_id)
        if not order:
            await message.reply("❌ Заказ для черновика выдачи не найден")
            return
        try:
            draft = await append_topic_delivery_draft(session, order, message, source="topic")
            await maybe_refresh_topic_header(bot, session, conv, order, user)
            await message.reply(
                build_delivery_draft_summary_text(order, draft),
                reply_markup=build_delivery_draft_keyboard(order.id),
            )
        except Exception as exc:
            logger.error("Failed to append topic delivery draft for order #%s: %s", conv.order_id, exc)
            await message.reply("❌ Не удалось добавить файл в черновик выдачи")
        return

    try:
        await bot.copy_message(
            chat_id=conv.user_id,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
        )

        # Сохраняем в БД (сообщение будет доступно в mini-app)
        await save_message_to_db(
            session=session,
            order_id=conv.order_id,
            sender_type=MessageSender.ADMIN.value,
            sender_id=message.from_user.id,
            message=message,
            bot=bot,
            storage_scope="chat",
        )

        # Обновляем Conversation (сбрасываем unread)
        await update_conversation(
            session, conv,
            last_message=get_message_preview(message),
            sender=MessageSender.ADMIN.value,
            increment_unread=False,
        )

        # Send WebSocket notification to mini-app
        if conv.order_id:
            try:
                from bot.services.realtime_notifications import notify_new_chat_message

                # Determine file type for notification
                file_type = None
                if message.photo:
                    file_type = "photo"
                elif message.document:
                    file_type = "document"
                elif message.video:
                    file_type = "video"
                elif message.voice:
                    file_type = "voice"
                elif message.audio:
                    file_type = "audio"

                await notify_new_chat_message(
                    telegram_id=conv.user_id,
                    order_id=conv.order_id,
                    sender_name="Менеджер",
                    message_preview=message.text or message.caption or "",
                    file_type=file_type,
                )
            except Exception as ws_error:
                logger.debug(f"WebSocket notification failed (non-critical): {ws_error}")

        if conv.order_id and order:
            await maybe_refresh_topic_header(bot, session, conv, order, user)

        # Подтверждение в топик
        await message.reply("✅ Доставлено клиенту")

    except TelegramBadRequest as e:
        error_msg = str(e).lower()
        if "blocked" in error_msg or "deactivated" in error_msg:
            await message.reply("⚠️ Клиент заблокировал бота или удалил аккаунт")
        else:
            logger.error(f"Failed to send message to client: {e}")
            await message.reply(f"❌ Ошибка доставки: {e}")
    except Exception as e:
        logger.error(f"Error in admin_message_from_topic: {e}")
        await message.reply(f"❌ Ошибка: {e}")


# ══════════════════════════════════════════════════════════════
#                    БЫСТРЫЕ ШАБЛОНЫ (КОМАНДЫ)
# ══════════════════════════════════════════════════════════════

@router.message(Command("t"), F.chat.id == settings.ADMIN_GROUP_ID, F.message_thread_id)
async def cmd_templates_list(message: Message):
    """Показывает список доступных шаблонов"""
    await message.reply(get_templates_list_text())


@router.message(Command(re.compile(r"t(\d+)")), F.chat.id == settings.ADMIN_GROUP_ID, F.message_thread_id)
async def cmd_send_template(
    message: Message,
    session: AsyncSession,
    bot: Bot,
):
    """
    Отправляет быстрый шаблон клиенту.
    Команды: /t1, /t2, ... /t10
    """
    # Извлекаем номер шаблона
    match = re.match(r"/t(\d+)", message.text)
    if not match:
        return

    template_key = match.group(1)
    template = QUICK_TEMPLATES.get(template_key)

    if not template:
        await message.reply(f"❌ Шаблон /t{template_key} не найден.\n\nИспользуйте /t для списка.")
        return

    topic_id = message.message_thread_id

    # Ищем Conversation по topic_id
    query = select(Conversation).where(Conversation.topic_id == topic_id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv:
        await message.reply("❌ Топик не привязан к диалогу")
        return

    try:
        # Отправляем шаблон клиенту
        await bot.send_message(
            chat_id=conv.user_id,
            text=template["text"],
        )

        # Сохраняем в БД как сообщение админа
        order_message = OrderMessage(
            order_id=conv.order_id,
            sender_type=MessageSender.ADMIN.value,
            sender_id=message.from_user.id,
            message_text=template["text"],
        )
        session.add(order_message)

        # Обновляем Conversation
        await update_conversation(
            session, conv,
            last_message=template["text"][:100],
            sender=MessageSender.ADMIN.value,
            increment_unread=False,
        )

        await session.commit()

        # WebSocket уведомление в Mini App
        if conv.order_id:
            try:
                from bot.services.realtime_notifications import notify_new_chat_message
                await notify_new_chat_message(
                    telegram_id=conv.user_id,
                    order_id=conv.order_id,
                    sender_name="Менеджер",
                    message_preview=template["text"],
                )
            except Exception as ws_error:
                logger.debug(f"WebSocket notification failed (non-critical): {ws_error}")

            order = await session.get(Order, conv.order_id)
            if order:
                user_query = select(User).where(User.telegram_id == conv.user_id)
                user_result = await session.execute(user_query)
                user = user_result.scalar_one_or_none()
                await maybe_refresh_topic_header(bot, session, conv, order, user)

        # Подтверждение
        await message.reply(f"✅ Шаблон «{template['name']}» отправлен клиенту")

    except TelegramBadRequest as e:
        error_msg = str(e).lower()
        if "blocked" in error_msg or "deactivated" in error_msg:
            await message.reply("⚠️ Клиент заблокировал бота")
        else:
            await message.reply(f"❌ Ошибка: {e}")
    except Exception as e:
        logger.error(f"Error sending template: {e}")
        await message.reply(f"❌ Ошибка: {e}")


@router.message(Command("help"), F.chat.id == settings.ADMIN_GROUP_ID, F.message_thread_id)
async def cmd_topic_help(message: Message):
    """Справка по командам в топике"""
    help_text = """📚 <b>Команды в топике:</b>

<b>Шаблоны:</b>
/t — список всех шаблонов
/t1 ... /t10 — отправить шаблон клиенту

<b>Управление заказом:</b>
/summary — показать актуальную сводку
/history — показать последние события
/note текст — сохранить заметку
/note - — очистить заметку
/folder — показать папку заказа
/pay — отправить клиенту оплату или доплату
/paid — вручную подтвердить следующий платёж
/review — вернуть клиенту на проверку
/done — завершить заказ
/card — обновить карточку заказа
/price 5000 — установить цену

<b>Выдача работы:</b>
Файлы, фото и голосовые из топика попадают в черновик выдачи.
/deliver комментарий — отправить собранную версию клиенту
/deliver - — отправить без комментария
/deliver clear — очистить черновик

<b>Внутренние комментарии:</b>
Начните сообщение с <code>.</code> — оно НЕ уйдёт клиенту

<b>Обычные сообщения:</b>
Просто пишите — всё пересылается клиенту автоматически"""

    await message.reply(help_text)


# ══════════════════════════════════════════════════════════════
#                    УТИЛИТЫ
# ══════════════════════════════════════════════════════════════

def get_message_preview(message: Message) -> str:
    """Получает превью сообщения для last_message_text"""
    if message.text:
        return message.text[:100]
    elif message.caption:
        return message.caption[:100]
    elif message.photo:
        return "📷 Фото"
    elif message.video:
        return "🎥 Видео"
    elif message.document:
        return f"📎 {message.document.file_name or 'Документ'}"
    elif message.voice:
        return "🎤 Голосовое"
    elif message.audio:
        return "🎵 Аудио"
    elif message.sticker:
        return "😀 Стикер"
    else:
        return "💬 Сообщение"


async def save_message_to_db(
    session: AsyncSession,
    order_id: int | None,
    sender_type: str,
    sender_id: int,
    message: Message,
    bot: Bot,
    storage_scope: str = "chat",
):
    """Сохраняет сообщение в БД (если есть order_id)"""
    if not order_id:
        # Для чатов без заказа пока не сохраняем в order_messages
        return

    order = await session.get(Order, order_id) if order_id else None
    current_revision_round = None
    if order is not None and sender_type == MessageSender.CLIENT.value:
        if (canonicalize_order_status(order.status) or order.status) == OrderStatus.REVISION.value:
            binding = await bind_order_to_revision_round(
                session,
                order,
                requested_by_user_id=sender_id,
                initial_comment=message.text or message.caption,
                create_if_missing=True,
                activity_at=getattr(message, "date", None),
            )
            current_revision_round = binding.revision_round if binding else None
        else:
            current_revision_round = await get_current_revision_round(session, order.id)

    # Определяем тип файла
    file_id = None
    file_name = None
    file_type = None

    if message.photo:
        file_id = message.photo[-1].file_id
        file_name = f"photo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        file_type = "photo"
    elif message.document:
        file_id = message.document.file_id
        file_name = message.document.file_name
        file_type = "document"
    elif message.video:
        file_id = message.video.file_id
        file_name = message.video.file_name or f"video_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
        file_type = "video"
    elif message.voice:
        file_id = message.voice.file_id
        file_name = f"voice_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ogg"
        file_type = "voice"
    elif message.audio:
        file_id = message.audio.file_id
        file_name = message.audio.file_name
        file_type = "audio"

    # Загружаем файл на Яндекс.Диск если есть
    yadisk_url = None
    if file_id and yandex_disk_service.is_available:
        try:
            if not order:
                logger.warning(f"Order {order_id} not found for YaDisk upload")
            else:
                # Determine telegram_id based on sender type
                telegram_id = (
                    message.from_user.id if sender_type == MessageSender.CLIENT.value else order.user_id
                )
                user_query = select(User).where(User.telegram_id == telegram_id)
                user_result = await session.execute(user_query)
                user = user_result.scalar_one_or_none()
                client_name = user.fullname if user else "Client"

                yadisk_file_url, yadisk_folder_url = await upload_chat_file_to_yadisk(
                    bot,
                    file_id,
                    file_name,
                    order,
                    client_name,
                    order.user_id,
                    client_username=user.username if user else None,
                    storage_scope=storage_scope,
                    delivery_note=message.caption or message.text,
                )
                yadisk_url = yadisk_file_url
                if yadisk_folder_url and order.files_url != yadisk_folder_url:
                    order.files_url = yadisk_folder_url
        except Exception as e:
            logger.error(f"Failed to upload to YaDisk: {e}")

    # Сохраняем сообщение
    order_message = OrderMessage(
        order_id=order_id,
        sender_type=sender_type,
        sender_id=sender_id,
        message_text=message.text or message.caption,
        file_type=file_type,
        file_id=file_id,
        file_name=file_name,
        yadisk_url=yadisk_url,
        revision_round_id=current_revision_round.id if current_revision_round else None,
    )
    session.add(order_message)
    await session.commit()

    # Бэкапим историю чата
    if order_id and order:
        user_query = select(User).where(User.telegram_id == order.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        client_name = user.fullname if user else "Client"
        await backup_chat_to_yadisk(
            order,
            client_name,
            order.user_id,
            session,
            client_username=user.username if user else None,
        )


async def update_conversation(
    session: AsyncSession,
    conv: Conversation,
    last_message: str,
    sender: str,
    increment_unread: bool = False,
):
    """Обновляет метаданные Conversation"""
    conv.last_message_text = last_message[:100] if last_message else None
    conv.last_message_at = datetime.now()
    conv.last_sender = sender
    conv.is_active = True

    if increment_unread and sender == MessageSender.CLIENT.value:
        conv.unread_count = (conv.unread_count or 0) + 1
    elif sender == MessageSender.ADMIN.value:
        conv.unread_count = 0

    await session.commit()


# ══════════════════════════════════════════════════════════════
#                    ЯНДЕКС.ДИСК ИНТЕГРАЦИЯ
# ══════════════════════════════════════════════════════════════

async def upload_chat_file_to_yadisk(
    bot: Bot,
    file_id: str,
    file_name: str,
    order: Order,
    client_name: str,
    telegram_id: int,
    client_username: str | None = None,
    storage_scope: str = "chat",
    delivery_note: str | None = None,
) -> tuple[str | None, str | None]:
    """Загружает файл из чата на Яндекс.Диск"""
    if not yandex_disk_service.is_available:
        return None, None

    try:
        file = await bot.get_file(file_id)
        file_bytes = await bot.download_file(file.file_path)
        content = file_bytes.read()
        if storage_scope == "deliverable":
            result = await yandex_disk_service.upload_deliverable_files(
                files=[(content, file_name)],
                order_id=order.id,
                client_name=client_name,
                telegram_id=telegram_id,
                work_type=order.work_type,
                client_username=client_username,
                order_meta=yandex_disk_service.build_order_meta(order),
                delivered_by="Менеджер",
                delivery_note=delivery_note,
            )
        else:
            result = await yandex_disk_service.upload_chat_file(
                file_bytes=content,
                filename=file_name,
                order_id=order.id,
                client_name=client_name,
                telegram_id=telegram_id,
                work_type=order.work_type,
                client_username=client_username,
                order_meta=yandex_disk_service.build_order_meta(order),
            )
        if not result.success:
            return None, None
        return result.public_url, result.folder_url

    except Exception as e:
        logger.error(f"Error uploading chat file: {e}")
        return None, None


async def backup_chat_to_yadisk(
    order: Order,
    client_name: str,
    telegram_id: int,
    session: AsyncSession,
    client_username: str | None = None,
) -> bool:
    """Сохраняет историю чата в текстовый файл на Яндекс.Диск"""
    if not yandex_disk_service.is_available:
        return False

    try:
        messages_query = select(OrderMessage).where(
            OrderMessage.order_id == order.id
        ).order_by(OrderMessage.created_at)
        result = await session.execute(messages_query)
        messages = result.scalars().all()

        if not messages:
            return True

        work_type = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type
        price_str = format_price(order.price) if order.price and order.price > 0 else "не установлена"
        deadline_str = order.deadline if order.deadline else "не указаны"

        chat_lines = [
            f"═══ История чата по заказу #{order.id} ═══",
            f"Обновлено: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            f"Клиент: {client_name} (ID: {telegram_id})",
            f"Тип работы: {work_type}",
            f"Цена: {price_str}",
            f"Сроки: {deadline_str}",
            "═" * 50,
            "",
        ]

        for msg in messages:
            sender = "🛡️ АДМИН" if msg.sender_type == MessageSender.ADMIN.value else "👤 КЛИЕНТ"
            time_str = msg.created_at.strftime("%d.%m.%Y %H:%M") if msg.created_at else "—"

            chat_lines.append(f"[{time_str}] {sender}:")
            if msg.message_text:
                chat_lines.append(msg.message_text)
            if msg.file_name:
                file_info = f"📎 Файл: {msg.file_name}"
                if msg.yadisk_url:
                    file_info += f" ({msg.yadisk_url})"
                chat_lines.append(file_info)
            chat_lines.append("")

        chat_text = "\n".join(chat_lines)

        uploaded = await yandex_disk_service.upload_chat_history(
            chat_text=chat_text,
            order_id=order.id,
            client_name=client_name,
            telegram_id=telegram_id,
            work_type=order.work_type,
            client_username=client_username,
            order_meta=yandex_disk_service.build_order_meta(order),
        )
        if uploaded:
            folder_url = await yandex_disk_service.get_folder_link(
                order_id=order.id,
                client_name=client_name,
                work_type=order.work_type,
                telegram_id=telegram_id,
                client_username=client_username,
                order_meta=yandex_disk_service.build_order_meta(order),
            )
            if folder_url and order.files_url != folder_url:
                order.files_url = folder_url
                await session.commit()
        return uploaded

    except Exception as e:
        logger.error(f"Error backing up chat: {e}")
        return False


# ══════════════════════════════════════════════════════════════
#                    ПАНЕЛЬ ДИАЛОГОВ (LEGACY)
# ══════════════════════════════════════════════════════════════

# Оставляем команду /dialogs для просмотра статистики
@router.message(Command("dialogs"))
async def cmd_dialogs(message: Message, session: AsyncSession):
    """Команда /dialogs — показывает статистику диалогов"""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    # Считаем статистику
    from sqlalchemy import func as sql_func

    total_query = select(sql_func.count()).select_from(Conversation)
    total = (await session.execute(total_query)).scalar() or 0

    active_query = select(sql_func.count()).select_from(Conversation).where(
        Conversation.is_active
    )
    active = (await session.execute(active_query)).scalar() or 0

    unread_query = select(sql_func.count()).select_from(Conversation).where(
        Conversation.unread_count > 0
    )
    unread = (await session.execute(unread_query)).scalar() or 0

    await message.answer(
        "📊 <b>Статистика диалогов</b>\n\n"
        f"📋 Всего диалогов: {total}\n"
        f"✅ Активных: {active}\n"
        f"📩 С непрочитанными: {unread}\n\n"
        "💡 <i>Все диалоги теперь в топиках группы!</i>"
    )


# ══════════════════════════════════════════════════════════════
#                    SAFETY COMMANDS (В ТОПИКЕ)
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    F.data.startswith("topic_action:"),
    F.message.chat.id == settings.ADMIN_GROUP_ID,
)
async def topic_action_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Быстрые inline-действия из header-сообщения топика."""
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    try:
        _prefix, action, raw_order_id = callback.data.split(":", maxsplit=2)
        order_id = int(raw_order_id)
    except (AttributeError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    topic_id = getattr(callback.message, "message_thread_id", None)
    conv, order, user = await get_topic_context(session, topic_id, include_user=True)
    if not conv or not conv.order_id or not order:
        await callback.answer("Топик не привязан к заказу", show_alert=True)
        return
    if order.id != order_id:
        await callback.answer("Заказ в сообщении не совпадает с топиком", show_alert=True)
        return

    if action == "summary":
        await callback.message.answer(**await build_topic_summary_payload(session, conv, order, user))
        await callback.answer("Сводка отправлена")
        return

    if action == "history":
        await callback.message.answer(**await build_topic_history_payload(session, order))
        await callback.answer("История отправлена")
        return

    if action == "note":
        await callback.message.answer(build_topic_note_text(order))
        await callback.answer("Показал заметку")
        return

    if action == "card":
        try:
            await refresh_topic_card(bot, session, conv, order, user)
        except Exception as exc:
            logger.error(f"Failed to refresh card from topic action: {exc}")
            await callback.answer("Не удалось обновить карточку", show_alert=True)
            return
        await callback.answer("Карточка обновлена")
        return

    if action == "review":
        response_text = await reopen_review_from_topic(
            session,
            bot,
            order,
            user,
            admin_id=callback.from_user.id,
            admin_username=getattr(callback.from_user, "username", None),
        )
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer(response_text)
        await callback.answer()
        return

    if action == "deliver":
        response_text = await deliver_draft_from_topic(
            session,
            bot,
            order,
            user,
            admin_id=callback.from_user.id,
        )
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer(response_text)
        await callback.answer()
        return

    if action == "delivery_help":
        await callback.message.answer(build_topic_delivery_help_text(order))
        await callback.answer("Сначала загрузите файлы в топик", show_alert=True)
        return

    if action == "clear_delivery":
        cancelled = await cancel_delivery_draft(session, order.id)
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer("🧹 Черновик выдачи очищен" if cancelled else "ℹ️ Черновик уже пуст")
        await callback.answer()
        return

    if action == "invoice":
        response_text = await request_payment_from_topic(
            session,
            bot,
            order,
            user,
            admin_id=callback.from_user.id,
            admin_username=getattr(callback.from_user, "username", None),
        )
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer(response_text)
        await callback.answer()
        return

    if action == "paid":
        response_text = await confirm_payment_from_topic(
            session,
            bot,
            order,
            user,
            admin_id=callback.from_user.id,
            admin_username=getattr(callback.from_user, "username", None),
        )
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer(response_text)
        await callback.answer()
        return

    if action == "complete":
        response_text = await complete_order_from_topic(
            session,
            bot,
            order,
            user,
            admin_id=callback.from_user.id,
            admin_username=getattr(callback.from_user, "username", None),
        )
        await maybe_refresh_topic_header(bot, session, conv, order, user)
        await callback.message.answer(response_text)
        await callback.answer()
        return

    await callback.answer("Неизвестное действие", show_alert=True)


@router.message(
    Command("summary"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_summary_in_topic(message: Message, session: AsyncSession):
    """Показывает актуальную сводку по заказу прямо в топике."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    await message.reply(**await build_topic_summary_payload(session, conv, order, user))


@router.message(
    Command("history"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_history_in_topic(message: Message, session: AsyncSession):
    """Показывает последние события по заказу прямо в топике."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, _user = await get_topic_context(session, message.message_thread_id)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    await message.reply(**await build_topic_history_payload(session, order))


@router.message(
    Command("note"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_note_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Показывает или обновляет внутреннюю заметку заказа прямо в топике."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    parts = (message.text or "").split(maxsplit=1)
    if len(parts) == 1:
        await message.reply(build_topic_note_text(order))
        return

    note_text = parts[1].strip()
    if not note_text:
        await message.reply("❌ Укажите текст заметки после команды /note")
        return
    if len(note_text) > TOPIC_NOTE_MAX_LENGTH:
        await message.reply(f"❌ Заметка слишком длинная. Лимит — {TOPIC_NOTE_MAX_LENGTH} символов.")
        return

    old_note = order.admin_notes or ""
    order.admin_notes = None if note_text == "-" else note_text
    await add_topic_admin_action_log(
        session,
        admin_id=message.from_user.id,
        admin_username=message.from_user.username,
        action_type=AdminActionType.ORDER_NOTE_UPDATE,
        target_id=order.id,
        details="Обновлена внутренняя заметка по заказу",
        old_value={"notes": old_note},
        new_value={"notes": order.admin_notes or ""},
    )
    await session.commit()

    try:
        await refresh_topic_card(bot, session, conv, order, user)
    except Exception as exc:
        logger.warning(f"Failed to refresh topic card after note update: {exc}")
    try:
        await maybe_refresh_topic_header(bot, session, conv, order, user)
    except Exception as exc:
        logger.warning(f"Failed to refresh topic header after note update: {exc}")

    note_status = "очищена" if order.admin_notes is None else "сохранена"
    await message.reply(f"✅ Заметка {note_status}\n\n{build_topic_note_text(order)}")


@router.message(
    Command("folder"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_folder_in_topic(message: Message, session: AsyncSession):
    """Показывает быструю информацию по папке заказа."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, _user = await get_topic_context(session, message.message_thread_id)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    delivered_at = format_admin_datetime(order.delivered_at)
    remaining = max(float(order.final_price or 0) - float(order.paid_amount or 0), 0)
    lines = [
        f"🗂 <b>Папка заказа #{order.id}</b>",
        f"Статус: {format_plain_text(order.status_label)}",
        f"Последняя выдача: {delivered_at}",
    ]
    if (order.price or 0) > 0:
        lines.append(f"Итого: {format_price(order.final_price)}")
        lines.append(f"Оплачено: {format_price(order.paid_amount)}")
        if remaining > 0:
            lines.append(f"Осталось: {format_price(remaining)}")

    if order.admin_notes:
        lines.append(f"Заметка: {format_plain_text(order.admin_notes[:180])}")

    if order.files_url:
        await message.reply(
            "\n".join(lines + ["", f"<a href=\"{order.files_url}\">Открыть папку на Яндекс.Диске</a>"]),
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[[InlineKeyboardButton(text="🗂 Открыть папку", url=order.files_url)]]
            ),
        )
        return

    await message.reply(
        "\n".join(
            lines
            + [
                "",
                "Папка ещё не создана. Она появится после первой загрузки материалов или выдачи готовой работы.",
            ]
        )
    )


@router.message(
    Command(commands=["pay", "invoice"]),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_pay_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Повторно отправляет клиенту текущий запрос на оплату или доплату."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    response_text = await request_payment_from_topic(
        session,
        bot,
        order,
        user,
        admin_id=message.from_user.id,
        admin_username=getattr(message.from_user, "username", None),
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    await message.reply(response_text)


@router.message(
    Command("paid"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_paid_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Подтверждает следующий платёж вручную прямо из топика."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    response_text = await confirm_payment_from_topic(
        session,
        bot,
        order,
        user,
        admin_id=message.from_user.id,
        admin_username=getattr(message.from_user, "username", None),
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    await message.reply(response_text)


@router.message(
    Command("review"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_review_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Возвращает заказ клиенту на проверку прямо из топика."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    response_text = await reopen_review_from_topic(
        session,
        bot,
        order,
        user,
        admin_id=message.from_user.id,
        admin_username=getattr(message.from_user, "username", None),
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    await message.reply(response_text)


@router.message(
    Command("deliver"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_deliver_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Отправляет клиенту текущий черновик версии из топика."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    command_text = (message.text or "").strip()
    comment = command_text.partition(" ")[2].strip() if " " in command_text else None
    response_text = await deliver_draft_from_topic(
        session,
        bot,
        order,
        user,
        admin_id=message.from_user.id,
        manager_comment=comment,
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    await message.reply(response_text)


@router.message(
    Command(commands=["done", "complete"]),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_complete_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """Завершает заказ из топика, если клиент уже проверил результат."""
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return
    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    response_text = await complete_order_from_topic(
        session,
        bot,
        order,
        user,
        admin_id=message.from_user.id,
        admin_username=getattr(message.from_user, "username", None),
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    await message.reply(response_text)


@router.message(
    Command("card"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_card_in_topic(message: Message, session: AsyncSession, bot: Bot):
    """
    /card - Переотправить/обновить закреплённую карточку заказа в топике.
    Работает только в топиках админской группы.
    """
    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return

    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    try:
        await refresh_topic_card(bot, session, conv, order, user)
        await message.reply("✅ Карточка заказа обновлена и закреплена")
    except Exception as e:
        logger.error(f"Failed to refresh card in topic: {e}")
        await message.reply(f"❌ Ошибка: {e}")


@router.message(
    Command("price"),
    F.chat.id == settings.ADMIN_GROUP_ID,
    F.message_thread_id,
)
async def cmd_price_in_topic(message: Message, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    /price [сумма] - Установить цену заказа прямо в топике.
    Примеры:
    - /price 5000 - установить цену 5000₽
    - /price - показать меню выбора цены
    """
    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    conv, order, user = await get_topic_context(session, message.message_thread_id, include_user=True)
    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return

    if not conv.order_id or not order:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    # Парсим аргумент команды
    args = message.text.split(maxsplit=1)
    if len(args) > 1:
        # Передана сумма — устанавливаем сразу
        try:
            price_str = args[1].replace(" ", "").replace(",", "").replace("₽", "")
            price = int(price_str)

            if price <= 0:
                await message.reply("❌ Цена должна быть положительной")
                return

            if price > 1000000:
                await message.reply("❌ Слишком большая сумма")
                return

            old_price = float(order.price or 0)
            old_bonus_used = float(order.bonus_used or 0)

            # Рассчитываем бонусы
            bonus_used = 0
            if user and float(user.balance or 0) > 0:
                max_bonus = float(price) * 0.5
                bonus_used = min(float(user.balance or 0), max_bonus)

            # Устанавливаем цену
            order.price = Decimal(str(price))
            order.bonus_used = Decimal(str(bonus_used))
            try:
                change = apply_order_status_transition(order, OrderStatus.WAITING_PAYMENT.value)
            except OrderStatusTransitionError as exc:
                await message.reply(f"❌ {exc}")
                return
            final_price = order.final_price
            if bonus_used > 0:
                extra_text = (
                    f"💵 Тариф: {format_price(price)}\n"
                    f"💎 Бонусы: −{format_price(bonus_used)}\n"
                    f"👉 К оплате: {format_price(final_price)}"
                )
            else:
                extra_text = f"💵 Цена: {format_price(price)}"

            await add_topic_price_set_log(
                session,
                order=order,
                admin_id=message.from_user.id,
                admin_username=getattr(message.from_user, "username", None),
                old_price=old_price,
                old_bonus_used=old_bonus_used,
            )
            await finalize_order_status_change(
                session,
                bot,
                order,
                change,
                dispatch=OrderStatusDispatchOptions(
                    update_live_card=True,
                    client_username=user.username if user else None,
                    client_name=user.fullname if user else None,
                    card_extra_text=extra_text,
                    notification_extra_data={"final_price": float(final_price), "bonus_used": bonus_used},
                ),
            )

            # Отправляем счёт клиенту
            from bot.handlers.channel_cards import send_payment_notification
            sent = await send_payment_notification(bot, order, user, price)
            await maybe_refresh_topic_header(bot, session, conv, order, user)

            status = "клиент получил счёт!" if sent else "(уведомление не доставлено)"
            await message.reply(f"✅ Цена {format_price(price)} установлена, {status}")

        except ValueError:
            await message.reply("❌ Неверный формат цены. Пример: /price 5000")
    else:
        # Цена не передана — показываем меню
        preset_prices = [1500, 2500, 5000, 10000, 15000, 25000]
        robot_price = int(order.price) if order.price > 0 else 0

        buttons = []

        # Если есть цена от робота
        if robot_price > 0:
            buttons.append([
                InlineKeyboardButton(
                    text=f"✅ Подтвердить {format_price(robot_price)}",
                    callback_data=f"topic_setprice:{conv.order_id}:{robot_price}"
                )
            ])

        # Preset цены (по 3 в ряд)
        row = []
        for price in preset_prices:
            row.append(InlineKeyboardButton(
                text=format_price(price),
                callback_data=f"topic_setprice:{conv.order_id}:{price}"
            ))
            if len(row) == 3:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

        # Кнопка своей цены
        buttons.append([
            InlineKeyboardButton(
                text="✏️ Своя цена (введите /price СУММА)",
                callback_data="noop"
            )
        ])

        keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

        await message.reply(
            f"💵 <b>Установка цены для заказа #{conv.order_id}</b>\n\n"
            "Выберите цену или введите свою командой:\n"
            "<code>/price 7500</code>",
            reply_markup=keyboard,
        )


@router.callback_query(F.data.startswith("topic_setprice:"))
async def topic_set_price_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Обработчик callback для установки цены из меню в топике"""
    from bot.handlers.channel_cards import send_payment_notification

    # Проверяем что это админ
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    try:
        parts = callback.data.split(":")
        order_id = int(parts[1])
        price = int(parts[2])
    except (ValueError, IndexError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    # Рассчитываем бонусы
    bonus_used = 0
    if user and float(user.balance or 0) > 0:
        max_bonus = float(price) * 0.5
        bonus_used = min(float(user.balance or 0), max_bonus)

    old_price = float(order.price or 0)
    old_bonus_used = float(order.bonus_used or 0)

    # Устанавливаем цену
    order.price = Decimal(str(price))
    order.bonus_used = Decimal(str(bonus_used))
    try:
        change = apply_order_status_transition(order, OrderStatus.WAITING_PAYMENT.value)
    except OrderStatusTransitionError as exc:
        await callback.answer(str(exc), show_alert=True)
        return
    final_price = order.final_price
    if bonus_used > 0:
        extra_text = (
            f"💵 Тариф: {format_price(price)}\n"
            f"💎 Бонусы: −{format_price(bonus_used)}\n"
            f"👉 К оплате: {format_price(final_price)}"
        )
    else:
        extra_text = f"💵 Цена: {format_price(price)}"

    await add_topic_price_set_log(
        session,
        order=order,
        admin_id=callback.from_user.id,
        admin_username=getattr(callback.from_user, "username", None),
        old_price=old_price,
        old_bonus_used=old_bonus_used,
    )
    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            card_extra_text=extra_text,
            notification_extra_data={"final_price": float(final_price), "bonus_used": bonus_used},
        ),
    )

    # Отправляем счёт клиенту
    await send_payment_notification(bot, order, user, price)
    topic_conv, _topic_order, topic_user = await get_topic_context(
        session, getattr(callback.message, "message_thread_id", None), include_user=True
    )
    if topic_conv:
        await maybe_refresh_topic_header(bot, session, topic_conv, order, topic_user or user)

    await callback.answer(f"✅ Цена {format_price(price)} установлена!", show_alert=True)

    # Удаляем меню выбора цены
    with suppress(Exception):
        await callback.message.delete()


@router.callback_query(F.data == "noop")
async def noop_callback(callback: CallbackQuery):
    """Пустой callback для информационных кнопок"""
    await callback.answer()
