"""
Order Flow Panic Mode - urgent orders "FIRE!" flow.
"""
import logging

from aiogram import F, Bot
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState, PanicState
from bot.keyboards.orders import (
    get_panic_urgency_keyboard,
    get_panic_upload_keyboard,
    get_panic_final_keyboard,
    get_append_files_keyboard,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.yandex_disk import yandex_disk_service
from bot.utils.media_group import handle_media_group_file
from bot.utils.message_helpers import safe_edit_or_send
from core.config import settings
from core.media_cache import send_cached_photo

from .router import (
    order_router,
    logger,
    URGENT_IMAGE_PATH,
    FAST_UPLOAD_IMAGE_PATH,
    ORDER_DONE_IMAGE_PATH,
)


# Urgency mapping to multiplier and label
PANIC_URGENCY_MAP = {
    "critical": {"multiplier": 1.5, "label": "🚀 Нужно вчера", "tag": "+50%"},
    "high": {"multiplier": 1.3, "label": "🔥 Сдать завтра", "tag": "+30%"},
    "medium": {"multiplier": 1.15, "label": "🏎 Турбо (2-3 дня)", "tag": "+15%"},
}


# ══════════════════════════════════════════════════════════════
#               PANIC FLOW START
# ══════════════════════════════════════════════════════════════

async def start_panic_flow(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Start Panic Flow — helper function.
    Called from different places: work_category:urgent, quick_order:other
    """
    # Set Panic Flow state
    await state.set_state(PanicState.choosing_urgency)
    await state.update_data(
        panic_files=[],
        panic_urgency=None,
    )

    caption = """🔥 <b>РЕЖИМ ПАНИКИ</b>

Понял, горит! Сейчас разберёмся.

<b>Выбери степень огнеопасности:</b>

🚀 <b>Нужно вчера</b> — работаем ночью, цена x1.5
🔥 <b>Сдать завтра</b> — приоритетная очередь, x1.3
🏎 <b>Турбо</b> — 2-3 дня, ускорение x1.15"""

    # Delete old message
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send with photo if exists
    if URGENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=URGENT_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_urgency_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_panic_urgency_keyboard(),
    )


@order_router.callback_query(F.data == "panic_mode")
async def panic_mode_entry(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Entry point into Panic Flow — "URGENT! FIRE!" button from menu.
    """
    await callback.answer("🔥")
    await start_panic_flow(callback, state, bot)


@order_router.callback_query(PanicState.choosing_urgency, F.data.startswith("panic_urgency:"))
async def panic_urgency_selected(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Urgency selected — transition to file upload.
    """
    await callback.answer("⚡")

    urgency_key = callback.data.split(":")[1]
    urgency_info = PANIC_URGENCY_MAP.get(urgency_key, PANIC_URGENCY_MAP["medium"])

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_info["label"]}</b> ({urgency_info["tag"]})

Кидай сюда всё сразу: методички, скрины, голосовые. Я разберусь.

<i>✅ Принято: 0 файлов</i>"""

    # Delete old message
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send message and save its ID for editing
    sent_msg = None
    if FAST_UPLOAD_IMAGE_PATH.exists():
        try:
            sent_msg = await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=FAST_UPLOAD_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_upload_keyboard(has_files=False),
            )
        except Exception:
            pass

    if not sent_msg:
        sent_msg = await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_panic_upload_keyboard(has_files=False),
        )

    # Save message_id for later editing
    await state.update_data(
        panic_urgency=urgency_key,
        panic_multiplier=urgency_info["multiplier"],
        panic_urgency_label=urgency_info["label"],
        panic_upload_msg_id=sent_msg.message_id if sent_msg else None,
        panic_chat_id=callback.message.chat.id,
    )
    await state.set_state(PanicState.uploading_files)


# ══════════════════════════════════════════════════════════════
#               PANIC FILE UPLOAD
# ══════════════════════════════════════════════════════════════

@order_router.message(PanicState.uploading_files)
async def panic_file_received(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    File/photo/text/voice received — add to list.
    Supports media_group (albums).
    """
    # Intercept /start command
    if message.text and message.text.strip().lower().startswith("/start"):
        from bot.handlers.start import process_start
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    upload_msg_id = data.get("panic_upload_msg_id")
    chat_id = data.get("panic_chat_id", message.chat.id)
    urgency_label = data.get("panic_urgency_label", "🏎 Турбо")

    # Determine attachment type
    attachment = None

    if message.photo:
        photo = message.photo[-1]
        attachment = {
            "type": "photo",
            "file_id": photo.file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        attachment = {
            "type": "document",
            "file_id": message.document.file_id,
            "file_name": message.document.file_name or "документ",
            "caption": message.caption or "",
        }
    elif message.voice:
        attachment = {
            "type": "voice",
            "file_id": message.voice.file_id,
            "duration": message.voice.duration,
        }
    elif message.audio:
        attachment = {
            "type": "audio",
            "file_id": message.audio.file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video:
        attachment = {
            "type": "video",
            "file_id": message.video.file_id,
            "caption": message.caption or "",
        }
    elif message.video_note:
        attachment = {
            "type": "video_note",
            "file_id": message.video_note.file_id,
        }
    elif message.text:
        attachment = {
            "type": "text",
            "content": message.text,
        }

    if not attachment:
        return

    # Check media_group (album)
    media_group_id = message.media_group_id

    if media_group_id:
        # Part of album — collect via collector
        async def on_panic_media_group_complete(files: list, **kwargs):
            """Callback when all album files are collected"""
            fsm_state = kwargs.get("fsm_state")
            mg_chat_id = kwargs.get("chat_id")
            if not fsm_state or not mg_chat_id:
                logger.warning(f"Missing fsm_state or chat_id in media group callback: {kwargs}")
                return

            current_data = await fsm_state.get_data()
            panic_files = current_data.get("panic_files", [])
            ul_msg_id = current_data.get("panic_upload_msg_id")
            urg_label = current_data.get("panic_urgency_label", "🏎 Турбо")

            # Add all files from album
            for f in files:
                f_id = f.get("file_id")
                if f_id:
                    existing_ids = {att.get("file_id") for att in panic_files if att.get("file_id")}
                    if f_id in existing_ids:
                        continue
                panic_files.append(f)

            await fsm_state.update_data(panic_files=panic_files)
            logger.info(f"Media group complete: {len(files)} files added, total: {len(panic_files)}")

            # Update UI
            await update_panic_upload_ui(bot, mg_chat_id, ul_msg_id, panic_files, urg_label)

        await handle_media_group_file(
            media_group_id=media_group_id,
            file_info=attachment,
            on_complete=on_panic_media_group_complete,
            chat_id=message.chat.id,
            fsm_state=state,
        )
    else:
        # Single file
        panic_files = data.get("panic_files", [])
        panic_files.append(attachment)
        await state.update_data(panic_files=panic_files)

        await update_panic_upload_ui(bot, chat_id, upload_msg_id, panic_files, urgency_label)


async def update_panic_upload_ui(bot: Bot, chat_id: int, msg_id: int, panic_files: list, urgency_label: str):
    """Helper function to update upload UI"""
    files_count = len(panic_files)

    # Count types
    photos = sum(1 for f in panic_files if f.get("type") == "photo")
    docs = sum(1 for f in panic_files if f.get("type") == "document")
    voices = sum(1 for f in panic_files if f.get("type") in ("voice", "audio"))
    texts = sum(1 for f in panic_files if f.get("type") == "text")
    videos = sum(1 for f in panic_files if f.get("type") in ("video", "video_note"))

    summary_parts = []
    if photos:
        summary_parts.append(f"{photos} фото")
    if docs:
        summary_parts.append(f"{docs} файл(ов)")
    if voices:
        summary_parts.append(f"{voices} голосовых")
    if texts:
        summary_parts.append(f"{texts} сообщений")
    if videos:
        summary_parts.append(f"{videos} видео")

    summary = ", ".join(summary_parts) if summary_parts else "0 файлов"

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_label}</b>

Кидай сюда всё сразу: методички, скрины, голосовые. Я разберусь.

<i>✅ Принято: {summary}</i>"""

    # Try to edit existing message
    if msg_id:
        try:
            await bot.edit_message_caption(
                chat_id=chat_id,
                message_id=msg_id,
                caption=caption,
                reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
            )
            return
        except Exception:
            try:
                await bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=msg_id,
                    text=caption,
                    reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
                )
                return
            except Exception:
                pass

    # Fallback: new message
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
    )


# ══════════════════════════════════════════════════════════════
#               PANIC ORDER SUBMIT
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(PanicState.uploading_files, F.data == "panic_submit")
async def panic_submit_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Submit urgent order — create order and notify admin.
    """
    await callback.answer("🚀 Запускаем!")

    data = await state.get_data()
    panic_files = data.get("panic_files", [])
    urgency_key = data.get("panic_urgency", "medium")
    urgency_info = PANIC_URGENCY_MAP.get(urgency_key, PANIC_URGENCY_MAP["medium"])

    user_id = callback.from_user.id
    username = callback.from_user.username or "без_ника"
    full_name = callback.from_user.full_name or "Аноним"

    # Get user from DB
    user_query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    # Form description from text attachments
    text_parts = []
    for att in panic_files:
        if att["type"] == "text":
            text_parts.append(att["content"])

    description = f"🔥 СРОЧНЫЙ ЗАКАЗ — {urgency_info['label']}\n\n"
    if text_parts:
        description += "Описание от клиента:\n" + "\n".join(text_parts)
    else:
        description += "(Только файлы без текстового описания)"

    # Create order in DB
    order = Order(
        user_id=user.telegram_id if user else user_id,  # user's telegram_id
        work_type=WorkType.OTHER.value,  # Panic = special order
        subject="🔥 Срочный заказ",
        description=description,
        deadline=urgency_info["label"],
        price=0.0,  # Price determined manually
        status=OrderStatus.PENDING.value,
    )

    session.add(order)
    await session.commit()
    await session.refresh(order)

    # ═══════════════════════════════════════════════════════════════
    #   QUICK RESPONSE TO USER (before Yandex.Disk upload!)
    # ═══════════════════════════════════════════════════════════════

    # Clear state, but save order_id for possible append
    await state.clear()
    await state.update_data(last_panic_order_id=order.id)

    # Save chat_id BEFORE deleting message
    chat_id = callback.message.chat.id

    # Show confirmation — aggressive style for critical deadlines
    if urgency_key in ("critical", "high"):
        caption = f"""🚨 <b>ТРЕВОГА ПРИНЯТА!</b>

Заказ <b>#{order.id}</b> в приоритетной очереди.

Шериф получил уведомление <b>ПРИОРИТЕТНОГО УРОВНЯ</b>. Оценка заказа займёт 5-15 минут.

<b>Не исчезай.</b> Мы на связи."""
    else:
        caption = f"""✅ <b>ЗАКАЗ #{order.id} ПРИНЯТ!</b>

🔥 Твоя заявка в очереди на оценку.

Шериф скоро свяжется для уточнения деталей и стоимости.

<i>Обычно отвечаем в течение 15-30 минут.</i>"""

    # Delete old message
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send confirmation to user — IMMEDIATELY, without waiting for upload
    sent = False
    if ORDER_DONE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=ORDER_DONE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_final_keyboard(user_id),
            )
            sent = True
        except Exception as e:
            logger.warning(f"Не удалось отправить фото подтверждения: {e}")

    if not sent:
        await bot.send_message(
            chat_id=chat_id,
            text=caption,
            reply_markup=get_panic_final_keyboard(user_id),
        )

    # ═══════════════════════════════════════════════════════════════
    #   UPLOAD TO YANDEX.DISK (after user response)
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and panic_files:
        try:
            files_to_upload = []
            file_counter = 1

            for att in panic_files:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    if att_type == "document":
                        filename = att.get("file_name", f"document_{file_counter}")
                    elif att_type == "photo":
                        filename = f"photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"audio_{file_counter}.mp3"
                    else:
                        filename = f"file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1
                except Exception as e:
                    logger.warning(f"Failed to download file from Telegram: {e}")
                    continue

            if files_to_upload:
                client_name = full_name
                result = await yandex_disk_service.upload_multiple_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type="Срочный заказ",
                    telegram_id=user_id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Panic Order #{order.id} files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading panic order to Yandex Disk: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   UNIFIED HUB: Create order topic
    # ═══════════════════════════════════════════════════════════════
    topic_created = False
    try:
        from bot.services.unified_hub import create_order_topic, post_to_feed

        # Create topic for order
        conv, topic_id = await create_order_topic(
            bot=bot,
            session=session,
            order=order,
            user=callback.from_user,
        )

        if topic_id:
            topic_created = True
            logger.info(f"✅ Order topic created for panic order #{order.id} (topic_id={topic_id})")

            # Post to orders feed
            await post_to_feed(
                bot=bot,
                order=order,
                user=callback.from_user,
                topic_id=topic_id,
                yadisk_link=yadisk_link,
            )
        else:
            logger.warning(f"Topic creation returned None for panic order #{order.id}")
    except Exception as e:
        logger.error(f"Failed to create order topic for panic order #{order.id}: {e}")

    # If topic created, skip personal admin notifications
    if not topic_created:
        # ═══════════════════════════════════════════════════════════════
        #   FALLBACK: Direct admin notification
        # ═══════════════════════════════════════════════════════════════
        logger.warning(f"Panic order #{order.id}: falling back to personal admin notifications")

        # Add Yandex.Disk link to notification
        yadisk_line_text = f"\n📁 <b>Яндекс.Диск:</b> <a href=\"{yadisk_link}\">Открыть папку</a>" if yadisk_link else ""

        # Form admin notification
        admin_text = f"""🔥🔥🔥 <b>СРОЧНЫЙ ЗАКАЗ #{order.id}</b> 🔥🔥🔥

👤 <b>Клиент:</b> {full_name}
📱 @{username}
🆔 <code>{user_id}</code>

⚡ <b>Срочность:</b> {urgency_info["label"]} ({urgency_info["tag"]})

📎 <b>Вложений:</b> {len(panic_files)}{yadisk_line_text}

⏰ <i>Требуется оперативное реагирование!</i>"""

        # Send to admins
        for admin_id in settings.ADMIN_IDS:
            try:
                await bot.send_message(admin_id, admin_text)

                # Forward all attachments
                for attachment in panic_files:
                    try:
                        if attachment["type"] == "photo":
                            await bot.send_photo(
                                admin_id,
                                attachment["file_id"],
                                caption=attachment.get("caption", "")
                            )
                        elif attachment["type"] == "document":
                            await bot.send_document(
                                admin_id,
                                attachment["file_id"],
                                caption=f"📄 {attachment.get('file_name', 'документ')}"
                            )
                        elif attachment["type"] == "voice":
                            await bot.send_voice(admin_id, attachment["file_id"])
                        elif attachment["type"] == "audio":
                            await bot.send_audio(admin_id, attachment["file_id"])
                        elif attachment["type"] == "video":
                            await bot.send_video(
                                admin_id,
                                attachment["file_id"],
                                caption=attachment.get("caption", "")
                            )
                        elif attachment["type"] == "video_note":
                            await bot.send_video_note(admin_id, attachment["file_id"])
                        elif attachment["type"] == "text":
                            await bot.send_message(
                                admin_id,
                                f"💬 Текст от клиента:\n\n{attachment['content']}"
                            )
                    except Exception as e:
                        logger.warning(f"Не удалось переслать вложение админу {admin_id}: {e}")
            except Exception as e:
                logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")

    # Log (non-critical, wrap in try)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_CREATED,
            user=callback.from_user,
            details=f"Panic Order #{order.id}, urgency: {urgency_key}, files: {len(panic_files)}",
            session=session,
            level=LogLevel.INFO,
        )
    except Exception as e:
        logger.warning(f"Не удалось залогировать panic order: {e}")


# ══════════════════════════════════════════════════════════════
#               PANIC NAVIGATION
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data == "panic_back_to_urgency")
async def panic_back_to_urgency(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Back to urgency selection"""
    await callback.answer("⏳")
    await state.set_state(PanicState.choosing_urgency)

    caption = """🔥 <b>РЕЖИМ ПАНИКИ</b>

Понял, горит! Сейчас разберёмся.

<b>Выбери степень огнеопасности:</b>

🚀 <b>Нужно вчера</b> — работаем ночью, цена x1.5
🔥 <b>Сдать завтра</b> — приоритетная очередь, x1.3
🏎 <b>Турбо</b> — 2-3 дня, ускорение x1.15"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    if URGENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=URGENT_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_urgency_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_panic_urgency_keyboard(),
    )


@order_router.callback_query(F.data == "panic_clear")
async def panic_clear_files(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Clear uploaded files"""
    await callback.answer("🗑 Очищено")

    data = await state.get_data()
    urgency_label = data.get("panic_urgency_label", "🏎 Турбо")

    await state.update_data(panic_files=[])

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_label}</b>

Файлы очищены. Загрузи заново:
• 📸 Фото задания
• 📄 Документы/файлы
• 🎤 Голосовое (опишешь словами)
• 💬 Текстом — тоже ок

<i>Загрузи хотя бы что-то, чтобы разблокировать кнопку ПУСК</i>"""

    await safe_edit_or_send(
        callback,
        caption,
        reply_markup=get_panic_upload_keyboard(has_files=False),
        bot=bot,
    )


@order_router.callback_query(F.data == "panic_append_files")
async def panic_append_files(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Append materials to existing panic order"""

    # Get order_id from previous panic order
    data = await state.get_data()
    order_id = data.get("last_panic_order_id")

    if not order_id:
        await callback.answer("❌ Заказ не найден. Оформи новый.", show_alert=True)
        return

    await callback.answer("📎")

    # Switch to append mode
    await state.set_state(OrderState.appending_files)
    # Save order_id for append and mark as panic append
    await state.update_data(
        append_order_id=order_id,
        appended_files=[],
        panic_append=True,
    )

    caption = f"""📎 <b>ДОСЛАТЬ МАТЕРИАЛЫ К ЗАКАЗУ #{order_id}</b>

Отправляй дополнительные файлы — всё передадим исполнителю.

<i>Когда закончишь — нажми «Готово»</i>"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_append_files_keyboard(order_id=order_id, files_count=0),
    )
