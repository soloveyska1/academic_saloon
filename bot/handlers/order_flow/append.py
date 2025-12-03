"""
Order Flow Append Files - add files to existing orders.
"""
import logging

from aiogram import F, Bot
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
from bot.keyboards.orders import get_append_files_keyboard
from bot.services.live_cards import update_card_status
from bot.services.yandex_disk import yandex_disk_service
from bot.utils.media_group import handle_media_group_file, get_files_summary
from core.config import settings

from .router import order_router, logger, MAX_APPEND_FILES
from .utils import get_progress_bar


# ══════════════════════════════════════════════════════════════
#               APPEND FILES HELPERS
# ══════════════════════════════════════════════════════════════

def format_append_status_message(files: list, order_id: int) -> str:
    """Format status message for append files flow."""
    if not files:
        return f"""📎 <b>ДОСЛАТЬ МАТЕРИАЛЫ К ЗАКАЗУ #{order_id}</b>

Отправляй файлы — фото, документы, голосовые.
Максимум {MAX_APPEND_FILES} файлов за раз.

<i>Когда закончишь — нажми «Отправить»</i>"""

    progress = get_progress_bar(len(files), MAX_APPEND_FILES)
    return f"""📎 <b>ДОСЛАТЬ МАТЕРИАЛЫ К ЗАКАЗУ #{order_id}</b>

✅ <b>Загружено:</b> {len(files)} файл(ов)

{progress}

<i>Ещё файлы или жми «Отправить»</i>"""


def get_append_confirm_text(attachment: dict, count: int, order_id: int) -> str:
    """Generate confirmation text for append file."""
    att_type = attachment.get("type", "unknown")

    type_labels = {
        "text": "📝 Текст принят!",
        "photo": "📸 Фото принято!",
        "document": "📄 Файл принят!",
        "voice": "🎤 Голосовое принято!",
        "video": "🎬 Видео принято!",
        "audio": "🎵 Аудио принято!",
        "video_note": "⚪ Кружок принят!",
    }

    confirm = type_labels.get(att_type, "📎 Принято!")
    progress = get_progress_bar(count, MAX_APPEND_FILES)

    return f"""{confirm}

{progress}

<i>Ещё или жми «Отправить»</i>"""


# ══════════════════════════════════════════════════════════════
#               APPEND FILES HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("add_files_to_order:"))
async def add_files_to_order_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """User wants to append files to order"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Check order exists and belongs to user
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Check order status — can only append to waiting orders
    allowed_statuses = [
        OrderStatus.PENDING.value,
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
        OrderStatus.WAITING_ESTIMATION.value,  # For special orders
    ]
    if order.status not in allowed_statuses:
        await callback.answer("К этому заказу уже нельзя добавить файлы", show_alert=True)
        return

    await callback.answer("📎 Жду!")

    # Save order_id and switch to append state
    await state.update_data(append_order_id=order_id, appended_files=[])
    await state.set_state(OrderState.appending_files)

    # DEBUG: verify state is set
    check_state = await state.get_state()
    logger.info(f"add_files_to_order: set state to {check_state}, order_id={order_id}")

    # Use new function for formatting
    text = format_append_status_message([], order_id)
    keyboard = get_append_files_keyboard(order_id, files_count=0)

    # Delete old message and send new
    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    await callback.bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)


@order_router.message(OrderState.appending_files)
async def append_file_universal(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Universal handler for all file types in append flow.
    Supports: photos, documents, voice, text, video, audio.
    Supports media_group (albums).
    """
    # DEBUG: log that handler triggered
    current_state = await state.get_state()
    logger.info(f"append_file_universal triggered! State: {current_state}, Message type: photo={bool(message.photo)}, doc={bool(message.document)}")

    # Intercept /start command
    if message.text and message.text.strip().lower().startswith("/start"):
        from bot.handlers.start import process_start
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    appended_files = data.get("appended_files", [])
    order_id = data.get("append_order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден")
        await state.clear()
        return

    # Check limit
    if len(appended_files) >= MAX_APPEND_FILES:
        await message.answer(
            f"⚠️ Максимум {MAX_APPEND_FILES} файлов.\n"
            "Жми «Отправить» чтобы продолжить.",
            reply_markup=get_append_files_keyboard(order_id, files_count=len(appended_files))
        )
        return

    # Determine content type
    attachment = None
    file_id = None

    if message.text:
        attachment = {"type": "text", "content": message.text}
    elif message.photo:
        photo = message.photo[-1]
        file_id = photo.file_id
        attachment = {
            "type": "photo",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        file_id = message.document.file_id
        attachment = {
            "type": "document",
            "file_id": file_id,
            "file_name": message.document.file_name or "файл",
            "caption": message.caption or "",
        }
    elif message.voice:
        file_id = message.voice.file_id
        attachment = {
            "type": "voice",
            "file_id": file_id,
            "duration": message.voice.duration,
        }
    elif message.video:
        file_id = message.video.file_id
        attachment = {
            "type": "video",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.audio:
        file_id = message.audio.file_id
        attachment = {
            "type": "audio",
            "file_id": file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video_note:
        file_id = message.video_note.file_id
        attachment = {"type": "video_note", "file_id": file_id}

    if not attachment:
        await message.answer("🤔 Этот тип контента не поддерживается")
        return

    # Duplicate protection
    if file_id:
        existing_ids = {f.get("file_id") for f in appended_files if f.get("file_id")}
        if file_id in existing_ids:
            await message.answer(
                "☝️ Этот файл уже добавлен!",
                reply_markup=get_append_files_keyboard(order_id, files_count=len(appended_files))
            )
            return

    # Handle media_group (albums)
    media_group_id = message.media_group_id

    if media_group_id:
        # Media group — collect files and respond once
        async def on_append_media_group_complete(
            files: list,
            chat_id: int,
            order_id: int,
            fsm_state: FSMContext,
            **kwargs
        ):
            """Callback when all album files are received"""
            current_data = await fsm_state.get_data()
            current_files = current_data.get("appended_files", [])

            # Add all files (with duplicate check and limit)
            added = 0
            for f in files:
                if len(current_files) >= MAX_APPEND_FILES:
                    break
                f_id = f.get("file_id")
                if f_id:
                    existing_ids = {att.get("file_id") for att in current_files if att.get("file_id")}
                    if f_id in existing_ids:
                        continue
                current_files.append(f)
                added += 1

            await fsm_state.update_data(appended_files=current_files)

            # Format message
            total_count = len(current_files)
            summary = get_files_summary(files)
            progress = get_progress_bar(total_count, MAX_APPEND_FILES)

            text = f"""📥 <b>Принял {added} файлов!</b>

{summary}

{progress}"""

            if total_count >= MAX_APPEND_FILES:
                text += "\n\n✓ Лимит — жми «Отправить»"

            await bot.send_message(
                chat_id,
                text,
                reply_markup=get_append_files_keyboard(order_id, files_count=total_count)
            )

        await handle_media_group_file(
            media_group_id=media_group_id,
            file_info=attachment,
            on_complete=on_append_media_group_complete,
            chat_id=message.chat.id,
            order_id=order_id,
            fsm_state=state,
        )
    else:
        # Single file — save and respond immediately
        appended_files.append(attachment)
        await state.update_data(appended_files=appended_files)

        total_count = len(appended_files)
        confirm_text = get_append_confirm_text(attachment, total_count, order_id)

        await message.answer(
            confirm_text,
            reply_markup=get_append_files_keyboard(order_id, files_count=total_count)
        )


@order_router.callback_query(F.data.startswith("finish_append:"))
async def finish_append_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Finish append — send to admins"""
    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    # Get order_id from STATE (more reliable, protects against race condition)
    order_id = data.get("append_order_id")

    # Fallback to callback.data if not in state
    if not order_id:
        try:
            order_id = int(callback.data.split(":")[1])
        except (IndexError, ValueError):
            await callback.answer("Ошибка данных", show_alert=True)
            await state.clear()
            return

    if not appended_files:
        await callback.answer("Ты ещё ничего не отправил!", show_alert=True)
        return

    # Find order WITH OWNER CHECK
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id  # Protection: only owner
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        await state.clear()
        return

    await callback.answer("✅ Отправляю!")
    await state.clear()

    # ═══════════════════════════════════════════════════════════════
    #   QUICK RESPONSE TO USER (before Yandex.Disk upload!)
    # ═══════════════════════════════════════════════════════════════
    client_text = f"""✅ <b>Материалы отправлены!</b>

К заказу <code>#{order.id}</code> добавлено: {len(appended_files)} файл(ов).

Шериф уже в курсе. 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="👀 Статус заказа",
            callback_data=f"order_detail:{order.id}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    await callback.message.edit_text(client_text, reply_markup=keyboard)

    # ═══════════════════════════════════════════════════════════════
    #   Upload additional files to Yandex Disk (after response)
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and appended_files:
        try:
            files_to_upload = []
            file_counter = 1

            for att in appended_files:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    # Download file from Telegram
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    # Determine filename (add prefix "доп_")
                    if att_type == "document":
                        filename = f"доп_{att.get('file_name', f'document_{file_counter}')}"
                    elif att_type == "photo":
                        filename = f"доп_photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"доп_voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"доп_video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"доп_video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"доп_audio_{file_counter}.mp3"
                    else:
                        filename = f"доп_file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1

                except Exception as e:
                    logger.warning(f"Failed to download appended file from Telegram: {e}")
                    continue

            # Upload files to Yandex Disk in "Additional" subfolder
            if files_to_upload:
                client_name = callback.from_user.full_name or f"User_{callback.from_user.id}"
                work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)

                result = await yandex_disk_service.upload_append_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type=work_label,
                    telegram_id=callback.from_user.id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Order #{order.id} appended files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading appended files to Yandex Disk: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   Update Live card
    # ═══════════════════════════════════════════════════════════════
    try:
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=callback.from_user.username,
            client_name=callback.from_user.full_name,
            yadisk_link=yadisk_link,
            extra_text=f"📎 Дослано файлов: {len(appended_files)}",
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

    # Yandex Disk line for admins
    yadisk_line = f"\n📁 Яндекс Диск: <a href=\"{yadisk_link}\">Открыть папку</a>" if yadisk_link else ""

    # Notify admins
    admin_text = f"""📎 <b>Клиент дослал материалы!</b>

📋 Заказ: #{order.id}
👤 Клиент: @{callback.from_user.username or 'без username'}
📦 Файлов: {len(appended_files)}{yadisk_line}"""

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text)

            # Forward all files
            for file_data in appended_files:
                file_type = file_data.get("type")
                try:
                    if file_type == "photo":
                        await bot.send_photo(
                            admin_id,
                            file_data["file_id"],
                            caption=file_data.get("caption") or f"[К заказу #{order.id}]"
                        )
                    elif file_type == "document":
                        await bot.send_document(
                            admin_id,
                            file_data["file_id"],
                            caption=file_data.get("caption") or f"[К заказу #{order.id}]"
                        )
                    elif file_type == "voice":
                        await bot.send_voice(
                            admin_id,
                            file_data["file_id"],
                            caption=f"[К заказу #{order.id}]"
                        )
                    elif file_type == "text":
                        await bot.send_message(
                            admin_id,
                            f"📝 <b>Текст к заказу #{order.id}:</b>\n\n{file_data.get('content', '')}"
                        )
                except Exception as e:
                    logger.warning(f"Не удалось отправить файл админу {admin_id}: {e}")
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@order_router.callback_query(F.data.startswith("cancel_append:"))
async def cancel_append_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Cancel append"""
    data = await state.get_data()

    # Get order_id from STATE (protection against race condition)
    order_id = data.get("append_order_id")

    # Fallback to callback.data
    if not order_id:
        try:
            order_id = int(callback.data.split(":")[1])
        except (IndexError, ValueError):
            await callback.answer("Ошибка данных", show_alert=True)
            await state.clear()
            return

    await state.clear()
    await callback.answer("Отменено")

    # Return to order status WITH OWNER CHECK
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id  # Protection: only owner
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if order:
        text = f"""📋 <b>Заказ #{order.id}</b>

Дослать файлы отменено."""

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📎 Забыл файл? (Дослать)",
                callback_data=f"add_files_to_order:{order.id}"
            )],
            [InlineKeyboardButton(
                text="👀 Статус заказа",
                callback_data=f"order_detail:{order.id}"
            )],
            [InlineKeyboardButton(
                text="🌵 В салун",
                callback_data="back_to_menu"
            )],
        ])

        await callback.message.edit_text(text, reply_markup=keyboard)
    else:
        await callback.message.edit_text("Заказ не найден")
