from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.order_lifecycle import can_deliver_order
from bot.services.order_revision_round_service import close_current_revision_round
from bot.services.order_status_service import (
    OrderStatusDispatchOptions,
    apply_order_status_transition,
    finalize_order_status_change,
)
from bot.services.yandex_disk import yandex_disk_service
from database.models.order_events import (
    OrderLifecycleDispatchStatus,
    OrderLifecycleEvent,
    OrderLifecycleEventType,
)
from database.models.orders import (
    Conversation,
    MessageSender,
    Order,
    OrderDeliveryBatch,
    OrderDeliveryBatchStatus,
    OrderMessage,
    OrderStatus,
)
from database.models.users import User

logger = logging.getLogger(__name__)
MSK_TZ = ZoneInfo("Europe/Moscow")

DELIVERY_EVENT_SURFACE_LIVE_CARD = "live_card"
DELIVERY_EVENT_SURFACE_NOTIFY_TELEGRAM = "notify_telegram"
DELIVERY_EVENT_SURFACE_NOTIFY_WS = "notify_ws"
DELIVERY_EVENT_SURFACE_NOTIFY_WS_REVISION = "notify_ws_revision"

DELIVERY_FILE_TYPES = {"document", "photo", "video", "voice", "audio"}
DELIVERY_ALLOWED_STATUSES = {
    OrderStatus.PAID.value,
    OrderStatus.PAID_FULL.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVISION.value,
    OrderStatus.REVIEW.value,
}


@dataclass
class DeliveryDispatchOptions:
    notify_user: bool = True
    update_live_card: bool = True
    client_username: str | None = None
    client_name: str | None = None


@dataclass
class DeliveryDispatchResult:
    live_card_updated: bool = False
    telegram_notified: bool = False
    ws_notified: bool = False
    revision_ws_notified: bool = False
    errors: dict[str, str] = field(default_factory=dict)

    @property
    def successful(self) -> bool:
        return not self.errors

    def completed_surfaces(self) -> set[str]:
        completed: set[str] = set()
        if self.live_card_updated:
            completed.add(DELIVERY_EVENT_SURFACE_LIVE_CARD)
        if self.telegram_notified:
            completed.add(DELIVERY_EVENT_SURFACE_NOTIFY_TELEGRAM)
        if self.ws_notified:
            completed.add(DELIVERY_EVENT_SURFACE_NOTIFY_WS)
        if self.revision_ws_notified:
            completed.add(DELIVERY_EVENT_SURFACE_NOTIFY_WS_REVISION)
        return completed


@dataclass
class DeliverySendResult:
    batch: OrderDeliveryBatch
    review_status_changed: bool
    summary_message: str


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _extract_first_scalar(result: Any) -> Any | None:
    scalars = result.scalars()
    first = getattr(scalars, "first", None)
    if callable(first):
        return first()
    all_items = getattr(scalars, "all", None)
    if callable(all_items):
        items = all_items()
        return items[0] if items else None
    scalar_one_or_none = getattr(result, "scalar_one_or_none", None)
    if callable(scalar_one_or_none):
        return scalar_one_or_none()
    return None


def _format_delivery_title(version_number: int | None, revision_count_snapshot: int | None) -> str:
    if revision_count_snapshot and revision_count_snapshot > 0:
        return f"Исправленная версия по правке #{revision_count_snapshot} готова"
    if version_number and version_number > 1:
        return f"Готова версия {version_number}"
    return "Работа готова"


def _build_delivery_summary_message(
    order: Order,
    *,
    version_number: int | None,
    revision_count_snapshot: int | None,
    manager_comment: str | None,
    file_count: int,
) -> str:
    title = _format_delivery_title(version_number, revision_count_snapshot)
    lines = [
        f"📦 {title}",
        f"Заказ #{order.id}",
    ]
    if version_number:
        lines.append(f"Версия: {version_number}")
    if file_count > 0:
        lines.append(f"Файлов: {file_count}")
    if manager_comment:
        lines.extend(["", manager_comment.strip()])
    return "\n".join(lines)


def _build_delivery_notification_text(
    order: Order,
    batch: OrderDeliveryBatch,
) -> tuple[str, str]:
    title = _format_delivery_title(batch.version_number, batch.revision_count_snapshot)
    details = []
    if batch.version_number:
        details.append(f"Версия {batch.version_number}")
    if batch.file_count:
        details.append(f"{int(batch.file_count)} файл(ов)")
    message = f"Заказ #{order.id}"
    if details:
        message = f"{message} · {' · '.join(details)}"
    if batch.manager_comment:
        message = f"{message}\n{batch.manager_comment.strip()}"
    return title, message


def _serialize_delivery_dispatch_options(dispatch: DeliveryDispatchOptions) -> dict[str, Any]:
    return {
        "notify_user": dispatch.notify_user,
        "update_live_card": dispatch.update_live_card,
        "client_username": dispatch.client_username,
        "client_name": dispatch.client_name,
    }


def _build_dispatch_options_from_event(event: OrderLifecycleEvent) -> DeliveryDispatchOptions:
    payload = event.payload or {}
    dispatch = payload.get("dispatch")
    if not isinstance(dispatch, dict):
        return DeliveryDispatchOptions()
    return DeliveryDispatchOptions(
        notify_user=bool(dispatch.get("notify_user", True)),
        update_live_card=bool(dispatch.get("update_live_card", True)),
        client_username=dispatch.get("client_username"),
        client_name=dispatch.get("client_name"),
    )


def _get_completed_surfaces(payload: dict[str, Any] | None) -> set[str]:
    if not isinstance(payload, dict):
        return set()
    dispatch_state = payload.get("dispatch_state")
    if not isinstance(dispatch_state, dict):
        return set()
    completed_surfaces = dispatch_state.get("completed_surfaces")
    if not isinstance(completed_surfaces, list):
        return set()
    return {str(surface) for surface in completed_surfaces if surface}


def _update_event_payload_dispatch_state(
    payload: dict[str, Any] | None,
    completed_surfaces: set[str],
) -> dict[str, Any]:
    next_payload = dict(payload or {})
    dispatch_state = dict(next_payload.get("dispatch_state") or {})
    dispatch_state["completed_surfaces"] = sorted(completed_surfaces)
    next_payload["dispatch_state"] = dispatch_state
    return next_payload


def _format_dispatch_errors(errors: dict[str, str]) -> str | None:
    if not errors:
        return None
    return "; ".join(f"{surface}: {message}" for surface, message in errors.items())


def _extract_telegram_manifest_items(message: Message) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    if message.document:
        files.append(
            {
                "kind": "telegram",
                "file_type": "document",
                "file_id": message.document.file_id,
                "file_name": message.document.file_name or "document",
            }
        )
    elif message.photo:
        files.append(
            {
                "kind": "telegram",
                "file_type": "photo",
                "file_id": message.photo[-1].file_id,
                "file_name": f"photo_{datetime.now(MSK_TZ).strftime('%Y%m%d_%H%M%S')}.jpg",
            }
        )
    elif message.video:
        files.append(
            {
                "kind": "telegram",
                "file_type": "video",
                "file_id": message.video.file_id,
                "file_name": message.video.file_name or f"video_{datetime.now(MSK_TZ).strftime('%Y%m%d_%H%M%S')}.mp4",
            }
        )
    elif message.voice:
        files.append(
            {
                "kind": "telegram",
                "file_type": "voice",
                "file_id": message.voice.file_id,
                "file_name": f"voice_{datetime.now(MSK_TZ).strftime('%Y%m%d_%H%M%S')}.ogg",
            }
        )
    elif message.audio:
        files.append(
            {
                "kind": "telegram",
                "file_type": "audio",
                "file_id": message.audio.file_id,
                "file_name": message.audio.file_name or f"audio_{datetime.now(MSK_TZ).strftime('%Y%m%d_%H%M%S')}.mp3",
            }
        )
    return files


def _strip_manifest_for_storage(manifest: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for item in manifest:
        sanitized.append(
            {
                "kind": item.get("kind"),
                "file_type": item.get("file_type"),
                "file_id": item.get("file_id"),
                "file_name": item.get("file_name"),
                "yadisk_url": item.get("yadisk_url"),
            }
        )
    return sanitized


async def get_latest_sent_delivery_batch(
    session: AsyncSession,
    order_id: int,
) -> OrderDeliveryBatch | None:
    result = await session.execute(
        select(OrderDeliveryBatch)
        .where(
            OrderDeliveryBatch.order_id == order_id,
            OrderDeliveryBatch.status == OrderDeliveryBatchStatus.SENT.value,
        )
        .order_by(OrderDeliveryBatch.version_number.desc(), OrderDeliveryBatch.id.desc())
        .limit(1)
    )
    return _extract_first_scalar(result)


async def get_delivery_history(
    session: AsyncSession,
    order_id: int,
    *,
    include_drafts: bool = False,
    limit: int = 10,
) -> list[OrderDeliveryBatch]:
    query = (
        select(OrderDeliveryBatch)
        .where(OrderDeliveryBatch.order_id == order_id)
        .order_by(
            OrderDeliveryBatch.sent_at.desc().nullslast(),
            OrderDeliveryBatch.version_number.desc().nullslast(),
            OrderDeliveryBatch.id.desc(),
        )
        .limit(limit)
    )
    if not include_drafts:
        query = query.where(OrderDeliveryBatch.status == OrderDeliveryBatchStatus.SENT.value)
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_or_create_delivery_draft(
    session: AsyncSession,
    order: Order,
    *,
    source: str,
) -> OrderDeliveryBatch:
    batch = await get_current_delivery_draft(session, order.id)
    if batch:
        return batch

    batch = OrderDeliveryBatch(
        order_id=order.id,
        status=OrderDeliveryBatchStatus.DRAFT.value,
        revision_count_snapshot=int(order.revision_count or 0),
        source=source,
        file_count=0,
        file_manifest=[],
    )
    session.add(batch)
    await session.commit()
    return batch


async def get_current_delivery_draft(
    session: AsyncSession,
    order_id: int,
) -> OrderDeliveryBatch | None:
    result = await session.execute(
        select(OrderDeliveryBatch)
        .where(
            OrderDeliveryBatch.order_id == order_id,
            OrderDeliveryBatch.status == OrderDeliveryBatchStatus.DRAFT.value,
        )
        .order_by(OrderDeliveryBatch.id.desc())
        .limit(1)
    )
    return _extract_first_scalar(result)


async def append_topic_delivery_draft(
    session: AsyncSession,
    order: Order,
    message: Message,
    *,
    source: str = "topic",
) -> OrderDeliveryBatch:
    manifest_items = _extract_telegram_manifest_items(message)
    if not manifest_items:
        raise ValueError("message_has_no_delivery_files")

    batch = await get_or_create_delivery_draft(session, order, source=source)
    manifest = list(batch.file_manifest or [])
    manifest.extend(_strip_manifest_for_storage(manifest_items))
    batch.file_manifest = manifest
    batch.file_count = len(manifest)
    if message.caption and not batch.manager_comment:
        batch.manager_comment = message.caption.strip()
    await session.commit()
    return batch


async def cancel_delivery_draft(
    session: AsyncSession,
    order_id: int,
) -> OrderDeliveryBatch | None:
    batch = await get_current_delivery_draft(session, order_id)
    if batch is None:
        return None
    batch.status = OrderDeliveryBatchStatus.CANCELLED.value
    await session.commit()
    return batch


def build_delivery_draft_summary_text(
    order: Order,
    batch: OrderDeliveryBatch,
) -> str:
    manifest = list(batch.file_manifest or [])
    file_names = [str(item.get("file_name") or "без названия") for item in manifest]
    preview = ", ".join(file_names[:3]) if file_names else "файлы ещё не добавлены"
    if len(file_names) > 3:
        preview = f"{preview} и ещё {len(file_names) - 3}"

    lines = [
        f"🧾 <b>Черновик выдачи по заказу #{order.id}</b>",
        f"Файлов: {len(file_names)}",
        f"Правка: #{max(int(order.revision_count or 0), 1)}" if int(order.revision_count or 0) > 0 else "Первая выдача / обновление",
        f"Файлы: {preview}",
    ]
    if batch.manager_comment:
        lines.extend(["", f"Комментарий: {batch.manager_comment.strip()}"])
    lines.extend(
        [
            "",
            "<code>/deliver комментарий</code> — отправить клиенту",
            "<code>/deliver -</code> — отправить без комментария",
            "<code>/deliver clear</code> — очистить черновик",
        ]
    )
    return "\n".join(lines)


def build_delivery_draft_keyboard(order_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📦 Отправить клиенту", callback_data=f"topic_action:deliver:{order_id}"),
                InlineKeyboardButton(text="🧹 Очистить", callback_data=f"topic_action:clear_delivery:{order_id}"),
            ]
        ]
    )


def serialize_delivery_batch(batch: OrderDeliveryBatch) -> dict[str, object]:
    return {
        "id": batch.id,
        "status": batch.status,
        "version_number": batch.version_number,
        "revision_count_snapshot": int(batch.revision_count_snapshot or 0),
        "manager_comment": batch.manager_comment,
        "source": batch.source,
        "files_url": batch.files_url,
        "file_count": int(batch.file_count or len(batch.file_manifest or [])),
        "created_at": _iso(batch.created_at),
        "sent_at": _iso(batch.sent_at),
    }


async def _resolve_binary_files_for_manifest(
    bot: Bot,
    manifest: list[dict[str, Any]],
) -> list[tuple[bytes, str]]:
    files: list[tuple[bytes, str]] = []
    for item in manifest:
        if item.get("kind") != "telegram":
            continue
        file_id = item.get("file_id")
        if not file_id:
            continue
        telegram_file = await bot.get_file(str(file_id))
        file_bytes = await bot.download_file(telegram_file.file_path)
        files.append((file_bytes.read(), str(item.get("file_name") or "file")))
    return files


async def _next_delivery_version_number(session: AsyncSession, order_id: int) -> int:
    max_version = await session.scalar(
        select(func.max(OrderDeliveryBatch.version_number)).where(
            OrderDeliveryBatch.order_id == order_id,
            OrderDeliveryBatch.status == OrderDeliveryBatchStatus.SENT.value,
        )
    )
    return int(max_version or 0) + 1


async def _persist_delivery_messages(
    session: AsyncSession,
    order: Order,
    batch: OrderDeliveryBatch,
    *,
    sender_id: int | None,
    summary_message: str,
    manifest: list[dict[str, Any]],
) -> None:
    session.add(
        OrderMessage(
            order_id=order.id,
            delivery_batch_id=batch.id,
            sender_type=MessageSender.ADMIN.value,
            sender_id=sender_id or 0,
            message_text=summary_message,
            file_type=None,
            file_id=None,
            file_name=None,
            yadisk_url=batch.files_url,
            is_read=False,
        )
    )
    for item in manifest:
        session.add(
            OrderMessage(
                order_id=order.id,
                delivery_batch_id=batch.id,
                sender_type=MessageSender.ADMIN.value,
                sender_id=sender_id or 0,
                message_text=None,
                file_type=item.get("file_type"),
                file_id=item.get("file_id"),
                file_name=item.get("file_name"),
                yadisk_url=item.get("yadisk_url") or batch.files_url,
                is_read=False,
            )
        )


async def _sync_delivery_conversation(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    user: User | None,
    summary_message: str,
) -> Conversation:
    from bot.handlers.order_chat import (
        ConversationType,
        backup_chat_to_yadisk,
        get_or_create_topic,
        maybe_refresh_topic_header,
        update_conversation,
    )

    conv, _topic_id = await get_or_create_topic(
        bot=bot,
        session=session,
        user_id=order.user_id,
        order_id=order.id,
        conv_type=ConversationType.ORDER_CHAT.value,
    )
    await update_conversation(
        session,
        conv,
        last_message=summary_message,
        sender=MessageSender.ADMIN.value,
        increment_unread=False,
    )
    await backup_chat_to_yadisk(
        order=order,
        client_name=user.fullname if user and user.fullname else "Client",
        telegram_id=order.user_id,
        session=session,
        client_username=user.username if user else None,
    )
    await maybe_refresh_topic_header(bot, session, conv, order, user)
    return conv


async def dispatch_order_delivery_event(
    session: AsyncSession,
    bot: Bot | None,
    order: Order,
    batch: OrderDeliveryBatch,
    *,
    options: DeliveryDispatchOptions | None = None,
    completed_surfaces: set[str] | None = None,
    fulfilled_revision_round_id: int | None = None,
    fulfilled_revision_round_number: int | None = None,
) -> DeliveryDispatchResult:
    dispatch = options or DeliveryDispatchOptions()
    already_completed = completed_surfaces or set()
    result = DeliveryDispatchResult()
    title, message = _build_delivery_notification_text(order, batch)

    if (
        dispatch.update_live_card
        and bot is not None
        and DELIVERY_EVENT_SURFACE_LIVE_CARD not in already_completed
    ):
        try:
            from bot.services.live_cards import update_live_card

            await update_live_card(
                bot=bot,
                session=session,
                order=order,
                client_username=dispatch.client_username,
                client_name=dispatch.client_name,
                yadisk_link=batch.files_url or order.files_url,
                extra_text=f"📦 Версия {batch.version_number} отправлена клиенту",
            )
            result.live_card_updated = True
        except Exception as exc:
            logger.warning("[Delivery] Live card sync failed for order #%s: %s", order.id, exc)
            result.errors["live_card"] = str(exc)

    if dispatch.notify_user and bot is not None and DELIVERY_EVENT_SURFACE_NOTIFY_TELEGRAM not in already_completed:
        try:
            buttons = []
            if batch.files_url:
                buttons.append([InlineKeyboardButton(text="📂 Открыть файлы", url=batch.files_url)])
            await bot.send_message(
                order.user_id,
                text=_build_delivery_summary_message(
                    order,
                    version_number=batch.version_number,
                    revision_count_snapshot=batch.revision_count_snapshot,
                    manager_comment=batch.manager_comment,
                    file_count=int(batch.file_count or 0),
                ),
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None,
            )
            result.telegram_notified = True
        except Exception as exc:
            logger.warning("[Delivery] Telegram notify failed for order #%s: %s", order.id, exc)
            result.errors["notify_telegram"] = str(exc)

    if dispatch.notify_user and DELIVERY_EVENT_SURFACE_NOTIFY_WS not in already_completed:
        try:
            from bot.api.websocket import notify_delivery_update

            await notify_delivery_update(
                telegram_id=order.user_id,
                order_id=order.id,
                delivery_batch_id=batch.id,
                version_number=int(batch.version_number or 0),
                revision_count_snapshot=int(batch.revision_count_snapshot or 0),
                manager_comment=batch.manager_comment,
                file_count=int(batch.file_count or 0),
                files_url=batch.files_url or order.files_url or "",
                title=title,
                message=message,
            )
            result.ws_notified = True
        except Exception as exc:
            logger.warning("[Delivery] WS notify failed for order #%s: %s", order.id, exc)
            result.errors["notify_ws"] = str(exc)

    if (
        dispatch.notify_user
        and fulfilled_revision_round_id
        and DELIVERY_EVENT_SURFACE_NOTIFY_WS_REVISION not in already_completed
    ):
        try:
            from bot.api.websocket import notify_revision_round_fulfilled

            await notify_revision_round_fulfilled(
                telegram_id=order.user_id,
                order_id=order.id,
                revision_round_id=int(fulfilled_revision_round_id),
                round_number=int(fulfilled_revision_round_number or 0),
                delivery_batch_id=batch.id,
                version_number=int(batch.version_number or 0) or None,
            )
            result.revision_ws_notified = True
        except Exception as exc:
            logger.warning("[Delivery] Revision WS notify failed for order #%s: %s", order.id, exc)
            result.errors["notify_ws_revision"] = str(exc)

    return result


async def replay_order_delivery_event(
    session: AsyncSession,
    bot: Bot | None,
    lifecycle_event: OrderLifecycleEvent,
) -> DeliveryDispatchResult | None:
    order = await session.get(Order, lifecycle_event.order_id)
    if order is None:
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = "order_not_found"
        await session.commit()
        return None

    payload = lifecycle_event.payload or {}
    batch_id = payload.get("delivery_batch_id")
    if not batch_id:
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = "delivery_batch_id_missing"
        await session.commit()
        return None

    batch = await session.get(OrderDeliveryBatch, int(batch_id))
    if batch is None:
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = "delivery_batch_not_found"
        await session.commit()
        return None

    completed_surfaces = _get_completed_surfaces(lifecycle_event.payload)
    dispatch_options = _build_dispatch_options_from_event(lifecycle_event)
    dispatch_result = await dispatch_order_delivery_event(
        session=session,
        bot=bot,
        order=order,
        batch=batch,
        options=dispatch_options,
        completed_surfaces=completed_surfaces,
        fulfilled_revision_round_id=(
            int(payload.get("fulfilled_revision_round_id"))
            if payload.get("fulfilled_revision_round_id") is not None
            else None
        ),
        fulfilled_revision_round_number=(
            int(payload.get("fulfilled_revision_round_number"))
            if payload.get("fulfilled_revision_round_number") is not None
            else None
        ),
    )

    lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
    completed_surfaces |= dispatch_result.completed_surfaces()
    lifecycle_event.payload = _update_event_payload_dispatch_state(
        lifecycle_event.payload,
        completed_surfaces,
    )
    lifecycle_event.last_error = _format_dispatch_errors(dispatch_result.errors)
    if dispatch_result.successful:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.DISPATCHED.value
        lifecycle_event.dispatched_at = datetime.now(MSK_TZ)
    else:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
    await session.commit()
    return dispatch_result


async def finalize_order_delivery_event(
    session: AsyncSession,
    bot: Bot | None,
    order: Order,
    batch: OrderDeliveryBatch,
    *,
    dispatch: DeliveryDispatchOptions | None = None,
    status_from: str | None = None,
    status_to: str | None = None,
    fulfilled_revision_round_id: int | None = None,
    fulfilled_revision_round_number: int | None = None,
) -> OrderLifecycleEvent:
    dispatch_options = dispatch or DeliveryDispatchOptions()
    lifecycle_event = OrderLifecycleEvent(
        order_id=order.id,
        user_id=order.user_id,
        event_type=OrderLifecycleEventType.DELIVERY_SENT.value,
        status_from=status_from or order.status,
        status_to=status_to or order.status,
        payload={
            "delivery_batch_id": batch.id,
            "version_number": batch.version_number,
            "revision_count_snapshot": batch.revision_count_snapshot,
            "manager_comment": batch.manager_comment,
            "file_count": batch.file_count,
            "files_url": batch.files_url,
            "fulfilled_revision_round_id": fulfilled_revision_round_id,
            "fulfilled_revision_round_number": fulfilled_revision_round_number,
            "dispatch": _serialize_delivery_dispatch_options(dispatch_options),
            "dispatch_state": {"completed_surfaces": []},
        },
        dispatch_status=OrderLifecycleDispatchStatus.PENDING.value,
        dispatch_attempts=0,
    )
    session.add(lifecycle_event)
    await session.commit()

    try:
        dispatch_result = await dispatch_order_delivery_event(
            session=session,
            bot=bot,
            order=order,
            batch=batch,
            options=dispatch_options,
            fulfilled_revision_round_id=fulfilled_revision_round_id,
            fulfilled_revision_round_number=fulfilled_revision_round_number,
        )
    except Exception as exc:
        logger.exception("[Delivery] Dispatch crashed for order #%s", order.id)
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = str(exc)
        await session.commit()
        return lifecycle_event

    lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
    lifecycle_event.payload = _update_event_payload_dispatch_state(
        lifecycle_event.payload,
        dispatch_result.completed_surfaces(),
    )
    lifecycle_event.last_error = _format_dispatch_errors(dispatch_result.errors)
    if dispatch_result.successful:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.DISPATCHED.value
        lifecycle_event.dispatched_at = datetime.now(MSK_TZ)
    else:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
    await session.commit()
    return lifecycle_event


async def send_order_delivery_batch(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    *,
    user: User | None,
    source: str,
    sent_by_admin_id: int | None,
    batch: OrderDeliveryBatch | None = None,
    manager_comment: str | None = None,
    binary_files: list[tuple[bytes, str]] | None = None,
) -> DeliverySendResult:
    if order.status not in DELIVERY_ALLOWED_STATUSES and not can_deliver_order(order):
        raise ValueError("delivery_not_allowed_for_status")

    direct_binary_files = list(binary_files or [])
    if batch is None and not direct_binary_files:
        raise ValueError("delivery_batch_is_empty")

    if batch is None:
        batch = OrderDeliveryBatch(
            order_id=order.id,
            status=OrderDeliveryBatchStatus.DRAFT.value,
            revision_count_snapshot=int(order.revision_count or 0),
            source=source,
            file_count=len(direct_binary_files),
            file_manifest=[
                {
                    "kind": "binary",
                    "file_type": "document",
                    "file_name": file_name,
                }
                for _file_bytes, file_name in direct_binary_files
            ],
        )
        session.add(batch)
        await session.commit()

    manifest = list(batch.file_manifest or [])
    if not manifest and not direct_binary_files:
        raise ValueError("delivery_batch_is_empty")

    binary_payloads = list(direct_binary_files)
    if manifest and bot is not None:
        binary_payloads.extend(await _resolve_binary_files_for_manifest(bot, manifest))
    if not binary_payloads:
        raise ValueError("delivery_files_unavailable")

    delivery_time = datetime.now(MSK_TZ)
    version_number = await _next_delivery_version_number(session, order.id)
    upload_result = await yandex_disk_service.upload_deliverable_files(
        files=binary_payloads,
        order_id=order.id,
        client_name=user.fullname if user and user.fullname else f"User_{order.user_id}",
        work_type=order.work_type,
        telegram_id=order.user_id,
        client_username=user.username if user else None,
        order_meta=yandex_disk_service.build_order_meta(order),
        delivered_by=f"admin:{sent_by_admin_id}" if sent_by_admin_id else "manager",
        delivery_note=manager_comment or batch.manager_comment,
        delivered_at=delivery_time,
        version_number=version_number,
    )
    if not upload_result.success:
        raise ValueError(upload_result.error or "delivery_upload_failed")

    previous_status = order.status
    review_status_changed = False
    if previous_status != OrderStatus.REVIEW.value:
        change = apply_order_status_transition(order, OrderStatus.REVIEW.value)
        await finalize_order_status_change(
            session,
            bot,
            order,
            change,
            dispatch=OrderStatusDispatchOptions(
                notify_user=False,
                update_live_card=False,
                client_username=user.username if user else None,
                client_name=user.fullname if user else None,
                yadisk_link=upload_result.batch_url or upload_result.folder_url,
            ),
        )
        review_status_changed = True

    order.delivered_at = delivery_time
    if upload_result.folder_url:
        order.files_url = upload_result.folder_url

    fulfilled_revision_round = await close_current_revision_round(
        session,
        order.id,
        delivery_batch_id=batch.id,
        closed_at=delivery_time,
    )

    batch.status = OrderDeliveryBatchStatus.SENT.value
    batch.version_number = version_number
    batch.revision_count_snapshot = int(order.revision_count or 0)
    if manager_comment == "-":
        batch.manager_comment = None
    elif manager_comment is not None:
        normalized_comment = manager_comment.strip()
        batch.manager_comment = normalized_comment or None
    batch.source = source
    batch.files_url = upload_result.batch_url or upload_result.folder_url
    batch.file_count = upload_result.uploaded_count or len(binary_payloads)
    batch.file_manifest = [
        {
            **item,
            "yadisk_url": upload_result.batch_url or upload_result.folder_url,
        }
        for item in _strip_manifest_for_storage(manifest)
    ] or [
        {
            "kind": "binary",
            "file_type": "document",
            "file_name": file_name,
            "yadisk_url": upload_result.batch_url or upload_result.folder_url,
        }
        for _file_bytes, file_name in direct_binary_files
    ]
    batch.sent_at = delivery_time
    batch.sent_by_admin_id = sent_by_admin_id

    summary_message = _build_delivery_summary_message(
        order,
        version_number=batch.version_number,
        revision_count_snapshot=batch.revision_count_snapshot,
        manager_comment=batch.manager_comment,
        file_count=int(batch.file_count or 0),
    )
    await _persist_delivery_messages(
        session,
        order,
        batch,
        sender_id=sent_by_admin_id,
        summary_message=summary_message,
        manifest=list(batch.file_manifest or []),
    )
    await _sync_delivery_conversation(
        session,
        bot,
        order,
        user,
        summary_message,
    )
    await session.commit()

    await finalize_order_delivery_event(
        session,
        bot,
        order,
        batch,
        dispatch=DeliveryDispatchOptions(
            notify_user=True,
            update_live_card=True,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
        ),
        status_from=previous_status,
        status_to=order.status,
        fulfilled_revision_round_id=fulfilled_revision_round.id if fulfilled_revision_round else None,
        fulfilled_revision_round_number=(
            int(fulfilled_revision_round.round_number or 0)
            if fulfilled_revision_round is not None
            else None
        ),
    )
    return DeliverySendResult(
        batch=batch,
        review_status_changed=review_status_changed,
        summary_message=summary_message,
    )
