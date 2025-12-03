"""
Order Flow Task Input - file/text input handlers.
"""
import logging

from aiogram import F, Bot
from aiogram.types import CallbackQuery, Message, FSInputFile, InputMediaPhoto
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import WorkType
from bot.states.order import OrderState
from bot.keyboards.orders import (
    get_task_input_keyboard,
    get_task_continue_keyboard,
    get_subject_keyboard,
    get_work_category_keyboard,
    WORKS_REQUIRE_SUBJECT,
)
from bot.services.logger import log_action, LogEvent
from bot.services.abandoned_detector import get_abandoned_tracker
from core.config import settings
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send
from bot.utils.media_group import handle_media_group_file

from .router import (
    order_router,
    logger,
    DIRECTIONS_IMAGE_PATH,
    INVESTIGATION_IMAGE_PATH,
    IMG_UPLOAD_START,
    IMG_FILES_RECEIVED,
    MAX_ATTACHMENTS,
)
from .utils import (
    pluralize_files,
    get_progress_bar,
    get_attachment_confirm_text,
    format_attachments_preview,
)


# ══════════════════════════════════════════════════════════════
#                    MATERIALS RECEIVED MESSAGE
# ══════════════════════════════════════════════════════════════

def format_materials_received_message(attachments: list) -> str:
    """
    Format "MATERIALS RECEIVED" message for new UI.
    Shows file count and description snippet.
    """
    if not attachments:
        return """📂 <b>ПАПКА ПУСТА</b>

<i>Скинь сюда задание: текст, фото, файлы...</i>"""

    file_count = 0
    description_snippet = None

    for att in attachments:
        att_type = att.get("type", "unknown")
        if att_type == "text":
            content = att.get("content", "")
            if len(content) > 50:
                description_snippet = content[:47] + "..."
            else:
                description_snippet = content
        else:
            file_count += 1

    lines = ["📥 <b>МАТЕРИАЛЫ ПРИНЯТЫ</b>", ""]

    if file_count > 0:
        lines.append(f"🗂 <b>Загружено файлов:</b> {file_count}")

    if description_snippet:
        lines.append(f"📝 <b>ТЗ:</b> «{description_snippet}»")
    elif file_count == 0:
        lines.append("📝 <b>ТЗ:</b> <i>(только текст)</i>")
    else:
        lines.append("📝 <b>ТЗ:</b> <i>(из файлов)</i>")

    lines.append("")
    lines.append("<i>Если это всё — жми «Готово», чтобы узнать цену.</i>")

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    TASK INPUT SCREEN
# ══════════════════════════════════════════════════════════════

async def show_task_input_screen(
    message: Message,
    is_photo_task: bool = False,
    send_new: bool = False,
    work_type: WorkType | None = None,
):
    """
    Show task input screen with photo.
    Friendly interface with instructions.
    For special orders (OTHER) — special "Case Materials" screen.
    """
    bot = message.bot
    chat_id = message.chat.id

    # === SPECIAL ORDER: Special "Case Materials" screen ===
    if work_type == WorkType.OTHER:
        caption = """🕵️‍♂️ <b>Материалы дела</b>

Так, давай подробности. Раз задача нестандартная, мне нужно понять, во что мы ввязываемся.

Не стесняйся. Скидывай всё: черновики, фото доски, или запиши голосовое с объяснениями на пальцах. Чем страннее задача — тем интереснее вызов.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""

        # Delete old message
        if not send_new:
            try:
                await message.delete()
            except Exception:
                pass

        # Try to send with investigation.jpg image
        if INVESTIGATION_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=chat_id,
                    photo_path=INVESTIGATION_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_task_input_keyboard(),
                )
                return
            except Exception:
                pass

        # Fallback to text
        await bot.send_message(
            chat_id=chat_id,
            text=caption,
            reply_markup=get_task_input_keyboard(),
        )
        return

    # === STANDARD SCREEN ===
    caption = """📥  <b>Приём материалов</b>

Выкладывай всё, что есть по задаче.
Чем больше инфы — тем точнее смогу назвать цену.

<b>Что можно прислать:</b>
📸 Фото методички или доски
📄 Файлы (Word, PDF)
💬 Скриншоты переписки с преподом
✍️ <b>Или просто напиши тему и требования текстом</b>

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""

    # Delete old message
    if not send_new:
        try:
            await message.delete()
        except Exception:
            pass

    # Choose image for initial state (empty bag)
    start_image = IMG_UPLOAD_START if IMG_UPLOAD_START.exists() else settings.TASK_INPUT_IMAGE

    # Send photo with caption (with file_id caching)
    if start_image.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=start_image,
                caption=caption,
                reply_markup=get_task_input_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback to text message
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=get_task_input_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#                    TASK INPUT HANDLER
# ══════════════════════════════════════════════════════════════

@order_router.message(OrderState.entering_task)
async def process_task_input(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Process task input — accept everything:
    text, photos, documents, voice, video, forwards.

    Features:
    - Typing effect for "liveliness"
    - Smart confirmations by content type
    - Duplicate protection (by file_id)
    - Attachment limit
    """
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        from bot.handlers.start import process_start
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    attachments = data.get("attachments", [])
    is_urgent = data.get("is_urgent", False)

    # Determine if this is a special order (WorkType.OTHER)
    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value

    # Check limit
    if len(attachments) >= MAX_ATTACHMENTS:
        await message.answer(
            f"⚠️ Максимум {MAX_ATTACHMENTS} вложений.\n"
            "Жми «Готово» чтобы продолжить.",
            reply_markup=get_task_continue_keyboard(files_count=len(attachments))
        )
        return

    # Determine content type and save
    attachment = None
    file_id = None

    if message.text:
        # Text message — Soft Validation
        text_content = message.text.strip()

        # Reject garbage (< 2 chars)
        if len(text_content) < 2:
            await message.answer(
                "🤔 Слишком коротко, партнёр. Опиши задание подробнее.",
                reply_markup=get_task_continue_keyboard(files_count=len(attachments))
            )
            return

        # Set risk flag for short descriptions
        risk_short_description = len(text_content) < 20
        await state.update_data(risk_short_description=risk_short_description)

        attachment = {
            "type": "text",
            "content": text_content,
        }
    elif message.photo:
        # Photo — take the largest
        photo = message.photo[-1]
        file_id = photo.file_id
        attachment = {
            "type": "photo",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        # Document/file
        file_id = message.document.file_id
        attachment = {
            "type": "document",
            "file_id": file_id,
            "file_name": message.document.file_name or "файл",
            "caption": message.caption or "",
        }
    elif message.voice:
        # Voice message
        file_id = message.voice.file_id
        attachment = {
            "type": "voice",
            "file_id": file_id,
            "duration": message.voice.duration,
        }
    elif message.audio:
        # Audio file
        file_id = message.audio.file_id
        attachment = {
            "type": "audio",
            "file_id": file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video:
        # Video
        file_id = message.video.file_id
        attachment = {
            "type": "video",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.video_note:
        # Video note (circle)
        file_id = message.video_note.file_id
        attachment = {
            "type": "video_note",
            "file_id": file_id,
        }
    elif message.sticker:
        # Sticker — ignore but don't scold
        await message.answer(
            "🤠 Стикер — это мило, но лучше скинь задание!",
            reply_markup=get_task_input_keyboard()
        )
        return

    if attachment:
        # Duplicate protection (by file_id)
        if file_id:
            existing_ids = {att.get("file_id") for att in attachments if att.get("file_id")}
            if file_id in existing_ids:
                await message.answer(
                    "☝️ Этот файл уже в деле, партнёр!",
                    reply_markup=get_task_continue_keyboard(files_count=len(attachments))
                )
                return

        # If forwarded message — add info
        if message.forward_from or message.forward_from_chat:
            attachment["forwarded"] = True
            if message.forward_from:
                attachment["forward_from"] = message.forward_from.full_name
            elif message.forward_from_chat:
                attachment["forward_from"] = message.forward_from_chat.title

        # Check if part of media_group (album)
        media_group_id = message.media_group_id

        if media_group_id:
            # Part of album — DON'T save immediately, collect in collector
            # and save ALL files at once in callback (avoid race condition)
            async def on_media_group_complete(files: list, chat_id: int, is_urgent: bool, is_special: bool, fsm_state: FSMContext):
                """Callback called when all files in group are received"""
                # Read current state and add ALL files at once
                current_data = await fsm_state.get_data()
                current_attachments = current_data.get("attachments", [])

                # Add all collected files
                for f in files:
                    # Duplicate check
                    f_id = f.get("file_id")
                    if f_id:
                        existing_ids = {att.get("file_id") for att in current_attachments if att.get("file_id")}
                        if f_id in existing_ids:
                            continue
                    current_attachments.append(f)

                # Set has_attachments flag for files
                await fsm_state.update_data(attachments=current_attachments, has_attachments=True)

                total_count = len(current_attachments)

                # Format "MATERIALS RECEIVED" message with new UI
                materials_caption = format_materials_received_message(current_attachments)
                keyboard = get_task_continue_keyboard(files_count=total_count)

                # Send with IMG_FILES_RECEIVED image
                if IMG_FILES_RECEIVED.exists():
                    try:
                        await send_cached_photo(
                            bot=bot,
                            chat_id=chat_id,
                            photo_path=IMG_FILES_RECEIVED,
                            caption=materials_caption,
                            reply_markup=keyboard,
                        )
                        return
                    except Exception:
                        pass

                # Fallback to text
                await bot.send_message(chat_id, materials_caption, reply_markup=keyboard)

            # Add to collector (DON'T save to state immediately!)
            await handle_media_group_file(
                media_group_id=media_group_id,
                file_info=attachment,
                on_complete=on_media_group_complete,
                chat_id=message.chat.id,
                is_urgent=is_urgent,
                is_special=is_special,
                fsm_state=state,
            )
        else:
            # Single file — save and respond immediately
            attachments.append(attachment)

            # Set has_attachments flag for file types (not text)
            if attachment.get("type") != "text":
                await state.update_data(attachments=attachments, has_attachments=True)
            else:
                await state.update_data(attachments=attachments)

            count = len(attachments)

            # Format "MATERIALS RECEIVED" message with new UI
            materials_caption = format_materials_received_message(attachments)

            # Add forward info
            if attachment.get("forwarded"):
                forward_from = attachment.get("forward_from", "")
                if forward_from:
                    materials_caption += f"\n📨 <i>Переслано от {forward_from}</i>"

            keyboard = get_task_continue_keyboard(files_count=count)

            # Send with IMG_FILES_RECEIVED image
            if IMG_FILES_RECEIVED.exists():
                try:
                    await send_cached_photo(
                        bot=bot,
                        chat_id=message.chat.id,
                        photo_path=IMG_FILES_RECEIVED,
                        caption=materials_caption,
                        reply_markup=keyboard,
                    )
                    return
                except Exception:
                    pass

            # Fallback to simple text
            await message.answer(materials_caption, reply_markup=keyboard)


@order_router.callback_query(OrderState.entering_task, F.data == "task_add_more")
async def task_add_more(callback: CallbackQuery, state: FSMContext):
    """Legacy handler — button removed, just respond"""
    await callback.answer("Просто добавь файл 📎")


@order_router.callback_query(F.data == "task_clear")
async def task_clear(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Clear all attachments — STAY IN PLACE.

    Logic:
    1. Clear data (attachments, flags)
    2. Explicitly set state = entering_task
    3. Show THE SAME screen with full keyboard (Done, Clear, Back, Cancel)
    """
    await callback.answer("🗑 Список очищен!")

    data = await state.get_data()

    # ═══════════════════════════════════════════════════════════════
    # 1. WIPE DATA
    # ═══════════════════════════════════════════════════════════════
    await state.update_data(
        attachments=[],
        has_attachments=False,
        risk_short_description=None
    )

    # ═══════════════════════════════════════════════════════════════
    # 2. EXPLICITLY SET STATE
    # ═══════════════════════════════════════════════════════════════
    await state.set_state(OrderState.entering_task)

    # Get work_type for context
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    # ═══════════════════════════════════════════════════════════════
    # 3. PREPARE UI — STAY IN PLACE WITH FULL KEYBOARD
    # ═══════════════════════════════════════════════════════════════
    if work_type == WorkType.OTHER:
        caption = """🕵️‍♂️ <b>Материалы дела</b>

🗑 <b>Список очищен!</b>

Можешь загрузить новые файлы или описать задачу текстом.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""
        image_path = INVESTIGATION_IMAGE_PATH
    else:
        caption = """🗑 <b>СПИСОК ОЧИЩЕН!</b>

Можешь загрузить новые файлы или описать задачу текстом.

<b>Что можно прислать:</b>
📸 Фото методички или доски
📄 Файлы (Word, PDF)
💬 Скриншоты переписки с преподом
✍️ <b>Или просто напиши тему и требования текстом</b>

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""
        image_path = IMG_FILES_RECEIVED if IMG_FILES_RECEIVED.exists() else settings.TASK_INPUT_IMAGE

    # FULL keyboard — as if files exist (files_count=1)
    # This gives: Done, Clear list, Back, Cancel
    keyboard = get_task_continue_keyboard(files_count=1)

    # ═══════════════════════════════════════════════════════════════
    # 4. UPDATE MESSAGE IN-PLACE (edit_media)
    # ═══════════════════════════════════════════════════════════════
    try:
        if image_path.exists():
            # Try edit_media with FSInputFile
            media = InputMediaPhoto(
                media=FSInputFile(image_path),
                caption=caption
            )
            await callback.message.edit_media(media=media, reply_markup=keyboard)
        else:
            # Fallback: only text and keyboard
            await callback.message.edit_caption(caption=caption, reply_markup=keyboard)
    except Exception as e:
        logger.warning(f"edit_media failed: {e}, trying delete+send")
        # Fallback: delete and send new
        try:
            await callback.message.delete()
        except Exception:
            pass

        if image_path.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=image_path,
                    caption=caption,
                    reply_markup=keyboard,
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=keyboard,
        )


@order_router.callback_query(F.data == "back_from_task")
async def back_from_task(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Return to previous step (direction/subject selection).
    Handler WITHOUT state filter to always trigger.
    """
    await callback.answer("↩️")

    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    # Clear attachments and risk flags on return
    await state.update_data(
        attachments=[],
        has_attachments=False,
        risk_short_description=None
    )

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    # For types requiring subject selection - return to subjects
    if work_type and work_type.value in WORKS_REQUIRE_SUBJECT:
        await state.set_state(OrderState.choosing_subject)

        try:
            await callback.message.delete()
        except Exception:
            pass

        if DIRECTIONS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=DIRECTIONS_IMAGE_PATH,
                    caption="📚 <b>Выбери направление</b>\n\n<i>В какой области нужна помощь?</i>",
                    reply_markup=get_subject_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text="📚 <b>Выбери направление</b>\n\n<i>В какой области нужна помощь?</i>",
            reply_markup=get_subject_keyboard(),
        )
    else:
        # For others - return to work type selection
        await state.set_state(OrderState.choosing_type)

        try:
            await callback.message.delete()
        except Exception:
            pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text="📋 <b>Выбери тип работы</b>",
            reply_markup=get_work_category_keyboard(),
        )


@order_router.callback_query(OrderState.entering_task, F.data == "task_done")
async def task_done(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """User finished entering task → transition to deadline or confirmation"""
    data = await state.get_data()
    attachments = data.get("attachments", [])

    if not attachments:
        await callback.answer("Сначала скинь хотя бы что-нибудь!", show_alert=True)
        return

    await callback.answer("⏳")

    # Non-critical operations
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг: задание ({pluralize_files(len(attachments))})",
            session=session,
        )
    except Exception:
        pass

    # For urgent orders deadline is already selected — go directly to confirmation
    if data.get("is_urgent"):
        try:
            tracker = get_abandoned_tracker()
            if tracker:
                await tracker.update_step(callback.from_user.id, "Подтверждение заказа")
        except Exception:
            pass

        from .confirmation import show_order_confirmation
        await show_order_confirmation(callback, state, bot, session)
        return

    # Normal order — transition to deadline selection
    await state.set_state(OrderState.choosing_deadline)

    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.update_step(callback.from_user.id, "Выбор сроков")
    except Exception:
        pass

    from .deadline import show_deadline_screen
    await show_deadline_screen(callback, bot)
