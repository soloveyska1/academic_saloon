from __future__ import annotations

import logging
import html
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.types import BufferedInputFile

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderMessage, MessageSender, Conversation, ConversationType, OrderStatus
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    ChatMessagesListResponse, ChatMessagesResponse,
    SendMessageResponse, SendMessageRequest, ChatFileUploadResponse, ChatMessage
)
from bot.services.yandex_disk import yandex_disk_service
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])

CHAT_PREVIEW_LIMIT = 100


def _build_chat_preview(
    *,
    text: str | None = None,
    file_type: str | None = None,
    file_name: str | None = None,
) -> str:
    if text:
        return text.strip()[:CHAT_PREVIEW_LIMIT]
    if file_type == "voice":
        return "🎤 Голосовое сообщение"
    if file_type == "photo":
        return f"🖼️ {file_name}"[:CHAT_PREVIEW_LIMIT] if file_name else "🖼️ Фото"
    if file_type == "video":
        return f"🎬 {file_name}"[:CHAT_PREVIEW_LIMIT] if file_name else "🎬 Видео"
    if file_name:
        return f"📎 {file_name}"[:CHAT_PREVIEW_LIMIT]
    return "📎 Файл"


async def _sync_client_conversation(
    *,
    session: AsyncSession,
    bot,
    user_id: int,
    order_id: int,
    conv_type: str,
    preview_text: str,
    order: Order | None = None,
    user: User | None = None,
) -> int | None:
    from bot.handlers.order_chat import get_or_create_topic, maybe_refresh_topic_header, update_conversation

    conv, topic_id = await get_or_create_topic(
        bot,
        session,
        user_id,
        order_id,
        conv_type,
    )
    await update_conversation(
        session,
        conv,
        last_message=preview_text,
        sender=MessageSender.CLIENT.value,
        increment_unread=True,
    )

    if conv_type == ConversationType.ORDER_CHAT.value:
        current_order = order or await session.get(Order, order_id)
        current_user = user
        if current_order is not None and current_user is None:
            user_result = await session.execute(select(User).where(User.telegram_id == user_id))
            current_user = user_result.scalar_one_or_none()
        if current_order is not None:
            await maybe_refresh_topic_header(bot, session, conv, current_order, current_user)
    return topic_id


async def _backup_order_chat_history(
    *,
    session: AsyncSession,
    order: Order,
    user: User | None,
) -> None:
    from bot.handlers.order_chat import backup_chat_to_yadisk

    await backup_chat_to_yadisk(
        order=order,
        client_name=user.fullname if user and user.fullname else "Client",
        telegram_id=order.user_id,
        session=session,
        client_username=user.username if user else None,
    )


async def _bind_client_revision_round(
    *,
    session: AsyncSession,
    order: Order,
    user_id: int,
    latest_comment: str | None = None,
):
    from bot.services.order_revision_round_service import bind_order_to_revision_round

    binding = await bind_order_to_revision_round(
        session,
        order,
        requested_by_user_id=user_id,
        initial_comment=latest_comment,
        create_if_missing=order.status == OrderStatus.REVISION.value,
    )
    return binding.revision_round if binding else None

# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CHAT
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/orders/{order_id}/messages", response_model=ChatMessagesListResponse)
async def get_order_messages(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    query = select(OrderMessage).where(OrderMessage.order_id == order_id).order_by(OrderMessage.created_at.asc())
    result = await session.execute(query)
    messages = result.scalars().all()

    unread_count = 0
    for msg in messages:
        if msg.sender_type == 'admin' and not msg.is_read:
            msg.is_read = True
            unread_count += 1
    if unread_count > 0:
        await session.commit()

    formatted_messages = []
    for msg in messages:
        formatted_messages.append(ChatMessage(
            id=msg.id,
            sender_type=msg.sender_type,
            sender_name="Менеджер" if msg.sender_type == 'admin' else "Вы",
            message_text=msg.message_text,
            file_type=msg.file_type,
            file_name=msg.file_name,
            file_url=msg.yadisk_url,
            created_at=msg.created_at.isoformat() if msg.created_at else "",
            is_read=msg.is_read or False,
        ))

    return ChatMessagesListResponse(
        order_id=order_id,
        messages=formatted_messages,
        unread_count=unread_count,
    )


@router.post("/orders/{order_id}/messages", response_model=SendMessageResponse)
async def send_order_message(
    order_id: int,
    data: SendMessageRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    text = data.text

    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    revision_round = await _bind_client_revision_round(
        session=session,
        order=order,
        user_id=tg_user.id,
        latest_comment=text,
    )

    message = OrderMessage(
        order_id=order_id, sender_type='client', sender_id=tg_user.id,
        message_text=text, revision_round_id=revision_round.id if revision_round else None, is_read=False,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    await _backup_order_chat_history(session=session, order=order, user=user)

    try:
        bot = get_bot()
        topic_id = await _sync_client_conversation(
            session=session,
            bot=bot,
            user_id=tg_user.id,
            order_id=order_id,
            conv_type=ConversationType.ORDER_CHAT.value,
            preview_text=_build_chat_preview(text=text),
            order=order,
            user=user,
        )
        if topic_id:
            user_name = html.escape(user.fullname if user else tg_user.first_name)
            revision_label = (
                f"\n✏️ Правка #{int(revision_round.round_number or 0)}"
                if revision_round is not None
                else ""
            )
            admin_text = f"💬 <b>Сообщение от клиента</b> (Mini App)\n👤 {user_name}{revision_label}\n\n{html.escape(text)}"
            await bot.send_message(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, text=admin_text)
    except Exception as e:
        logger.error(f"Chat Send Error: {e}")

    return SendMessageResponse(success=True, message_id=message.id, message="Сообщение отправлено")


@router.post("/orders/{order_id}/messages/file", response_model=ChatFileUploadResponse)
async def upload_chat_file(
    order_id: int,
    file: UploadFile = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    revision_round = await _bind_client_revision_round(
        session=session,
        order=order,
        user_id=tg_user.id,
    )

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    filename = file.filename or "file"
    content_type = file.content_type or ""
    
    if content_type.startswith("image/"): file_type = "photo"
    elif content_type.startswith("audio/") or filename.endswith((".ogg", ".mp3", ".wav")): file_type = "voice" if "ogg" in filename.lower() else "audio"
    elif content_type.startswith("video/"): file_type = "video"
    else: file_type = "document"

    file_url = None
    folder_url = None
    if yandex_disk_service.is_available:
        result = await yandex_disk_service.upload_chat_file(
            content,
            filename,
            order_id,
            user.fullname if user else "Client",
            tg_user.id,
            work_type=order.work_type,
            client_username=user.username if user else None,
            order_meta=yandex_disk_service.build_order_meta(order),
        )
        if result.success:
            file_url = result.public_url
            folder_url = result.folder_url

    message = OrderMessage(
        order_id=order_id, sender_type='client', sender_id=tg_user.id,
        file_type=file_type, file_name=filename, yadisk_url=file_url,
        revision_round_id=revision_round.id if revision_round else None,
        is_read=False,
    )
    session.add(message)
    if folder_url and order.files_url != folder_url:
        order.files_url = folder_url
    await session.commit()
    await session.refresh(message)
    await _backup_order_chat_history(session=session, order=order, user=user)

    try:
        bot = get_bot()
        topic_id = await _sync_client_conversation(
            session=session,
            bot=bot,
            user_id=tg_user.id,
            order_id=order_id,
            conv_type=ConversationType.ORDER_CHAT.value,
            preview_text=_build_chat_preview(file_type=file_type, file_name=filename),
            order=order,
            user=user,
        )
        if topic_id:
            user_name = html.escape(user.fullname if user else tg_user.first_name)
            revision_label = (
                f"\n✏️ Правка #{int(revision_round.round_number or 0)}"
                if revision_round is not None
                else ""
            )
            caption = f"📎 <b>Файл от клиента</b>\n👤 {user_name}{revision_label}\n📁 {html.escape(filename)}"
            if file_url: caption += f"\n🔗 <a href='{file_url}'>Скачать с Я.Диска</a>"
            
            input_file = BufferedInputFile(content, filename=filename)
            if file_type == "photo": await bot.send_photo(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, photo=input_file, caption=caption)
            elif file_type == "video": await bot.send_video(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, video=input_file, caption=caption)
            else: await bot.send_document(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, document=input_file, caption=caption)
    except Exception as e:
        logger.error(f"File Forward Error: {e}")

    return ChatFileUploadResponse(success=True, message_id=message.id, message="Файл отправлен", file_url=file_url)

@router.post("/orders/{order_id}/messages/voice", response_model=ChatFileUploadResponse)
async def upload_voice_message(
    order_id: int,
    file: UploadFile = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Order not found")
        
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    revision_round = await _bind_client_revision_round(
        session=session,
        order=order,
        user_id=tg_user.id,
    )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Voice too large")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"voice_{timestamp}.ogg"

    file_url = None
    folder_url = None
    if yandex_disk_service.is_available:
        result = await yandex_disk_service.upload_chat_file(
            content,
            filename,
            order_id,
            user.fullname if user else "Client",
            tg_user.id,
            work_type=order.work_type,
            client_username=user.username if user else None,
            order_meta=yandex_disk_service.build_order_meta(order),
        )
        if result.success:
            file_url = result.public_url
            folder_url = result.folder_url

    message = OrderMessage(
        order_id=order_id, sender_type='client', sender_id=tg_user.id,
        file_type='voice', file_name=filename, yadisk_url=file_url,
        revision_round_id=revision_round.id if revision_round else None,
        is_read=False,
    )
    session.add(message)
    if folder_url and order.files_url != folder_url:
        order.files_url = folder_url
    await session.commit()
    await session.refresh(message)
    await _backup_order_chat_history(session=session, order=order, user=user)

    try:
        bot = get_bot()
        topic_id = await _sync_client_conversation(
            session=session,
            bot=bot,
            user_id=tg_user.id,
            order_id=order_id,
            conv_type=ConversationType.ORDER_CHAT.value,
            preview_text=_build_chat_preview(file_type='voice'),
            order=order,
            user=user,
        )
        if topic_id:
            user_name = html.escape(user.fullname if user else tg_user.first_name)
            revision_label = (
                f"\n✏️ Правка #{int(revision_round.round_number or 0)}"
                if revision_round is not None
                else ""
            )
            caption = f"🎤 <b>Голосовое от клиента</b>\n👤 {user_name}{revision_label}"
            if file_url: caption += f"\n🔗 <a href='{file_url}'>Прослушать</a>"
            
            input_file = BufferedInputFile(content, filename=filename)
            await bot.send_voice(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, voice=input_file, caption=caption)
    except Exception as e:
        logger.error(f"Voice Forward Error: {e}")

    return ChatFileUploadResponse(success=True, message_id=message.id, message="Голосовое отправлено", file_url=file_url)

# ═══════════════════════════════════════════════════════════════════════════
#  SUPPORT CHAT
# ═══════════════════════════════════════════════════════════════════════════

async def get_or_create_support_order(session: AsyncSession, user: User) -> Order:
    """Get or create support chat order with race condition protection."""
    result = await session.execute(
        select(Order)
        .where(Order.user_id == user.telegram_id, Order.work_type == 'support_chat')
        .limit(1)
    )
    order = result.scalar_one_or_none()
    if not order:
        try:
            order = Order(
                user_id=user.telegram_id, work_type='support_chat', subject='Техническая Поддержка',
                topic='Чат с поддержкой из Mini App', description='Автоматически созданный диалог для поддержки',
                status=OrderStatus.DRAFT.value, price=0, paid_amount=0, discount=0
            )
            session.add(order)
            await session.commit()
            await session.refresh(order)
        except IntegrityError:
            # Race condition: another request created the order, rollback and fetch it
            await session.rollback()
            result = await session.execute(
                select(Order)
                .where(Order.user_id == user.telegram_id, Order.work_type == 'support_chat')
                .limit(1)
            )
            order = result.scalar_one_or_none()
            if not order:
                raise HTTPException(status_code=500, detail="Failed to create support chat")
    return order


async def get_support_order(session: AsyncSession, user: User) -> Order | None:
    """Return existing support chat order without creating a new hidden record."""
    result = await session.execute(
        select(Order)
        .where(Order.user_id == user.telegram_id, Order.work_type == 'support_chat')
        .limit(1)
    )
    return result.scalar_one_or_none()

@router.get("/support/messages", response_model=ChatMessagesResponse)
async def get_support_messages(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    order = await get_support_order(session, user)
    if not order:
        return ChatMessagesResponse(order_id=0, messages=[], unread_count=0)

    msgs_result = await session.execute(select(OrderMessage).where(OrderMessage.order_id == order.id).order_by(OrderMessage.created_at.asc()))
    messages = msgs_result.scalars().all()

    chat_messages = []
    for msg in messages:
        sender_name = "Вы"
        if msg.sender_type == MessageSender.ADMIN.value: sender_name = "Поддержка"
        elif msg.sender_type == MessageSender.CLIENT.value: sender_name = user.fullname or "Вы"

        if msg.sender_type == MessageSender.ADMIN.value and not msg.is_read:
            msg.is_read = True
            session.add(msg)
        
        chat_messages.append(ChatMessage(
            id=msg.id, sender_type=msg.sender_type, sender_name=sender_name,
            message_text=msg.message_text, file_type=msg.file_type, file_name=msg.file_name,
            file_url=msg.yadisk_url, created_at=msg.created_at.isoformat(), is_read=msg.is_read
        ))
    await session.commit()
    return ChatMessagesResponse(order_id=order.id, messages=chat_messages, unread_count=0)

@router.post("/support/messages", response_model=SendMessageResponse)
async def send_support_message(
    data: SendMessageRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    text = data.text

    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    order = await get_or_create_support_order(session, user)

    message = OrderMessage(
        order_id=order.id, sender_type=MessageSender.CLIENT.value, sender_id=user.telegram_id, message_text=text
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)

    try:
        bot = get_bot()
        topic_id = await _sync_client_conversation(
            session=session,
            bot=bot,
            user_id=user.telegram_id,
            order_id=order.id,
            conv_type=ConversationType.SUPPORT.value,
            preview_text=_build_chat_preview(text=text),
        )

        await bot.send_message(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, text=f"✉️ <b>Сообщение от клиента:</b>\n{html.escape(text)}", parse_mode="HTML")
    except Exception as e:
        logger.error(f"Support Notify Error: {e}")

    return SendMessageResponse(success=True, message_id=message.id, message="Сообщение отправлено")
