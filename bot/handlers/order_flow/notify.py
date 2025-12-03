"""
Order Flow Notify - admin notification handlers.
"""
import asyncio
import logging

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, WorkType, WORK_TYPE_LABELS
from bot.services.yandex_disk import yandex_disk_service
from core.config import settings

from .router import logger, URGENT_DEADLINE_LABELS


# ══════════════════════════════════════════════════════════════
#                    ADMIN NOTIFICATIONS
# ══════════════════════════════════════════════════════════════

def get_order_admin_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    """Action buttons for admin order management"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💰 Назначить цену",
                callback_data=f"admin_set_price:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject:{order_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать",
                url=f"tg://user?id={user_id}"
            ),
            InlineKeyboardButton(
                text="📋 Инфо",
                callback_data=f"log_info:{user_id}"
            ),
        ],
    ])


async def notify_admins_new_order(bot: Bot, user, order: Order, data: dict, session: AsyncSession = None):
    """Notify admins about new order with all attachments + create Live card in channel"""
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])
    is_urgent = data.get("is_urgent", False)

    subject_label = data.get("subject_label", "—")
    if data.get("subject") == "photo_task":
        subject_label = "📸 Фото задания"

    discount_line = f"◈  Скидка: {data.get('discount', 0)}%\n" if data.get("discount", 0) > 0 else ""

    # For urgent — surcharge
    urgent_line = ""
    if is_urgent:
        surcharge = data.get("urgent_surcharge", 0)
        urgent_deadline = URGENT_DEADLINE_LABELS.get(data.get("urgent_deadline", ""), "")
        if surcharge > 0:
            urgent_line = f"◈  ⚡ Наценка за срочность: +{surcharge}%\n"
        elif urgent_deadline:
            urgent_line = f"◈  ⚡ Срочный: {urgent_deadline}\n"

    # Form username string
    username_str = f"@{user.username}" if user.username else "без username"

    # Determine if special order
    is_special = data.get("work_type") == WorkType.OTHER.value

    attachments = data.get("attachments", [])

    # ═══════════════════════════════════════════════════════════════
    #   Upload files to Yandex Disk
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and attachments:
        try:
            # Download files from Telegram and upload to Yandex Disk
            files_to_upload = []
            file_counter = 1

            for att in attachments:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    # Download file from Telegram
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    # Determine filename
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

            # Upload all files to Yandex Disk
            if files_to_upload:
                # Support both Telegram User (full_name) and DB User (fullname)
                client_name = getattr(user, 'fullname', None) or getattr(user, 'full_name', None) or f"User_{user.id}"
                result = await yandex_disk_service.upload_multiple_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type=work_label,
                    telegram_id=user.id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Order #{order.id} files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading to Yandex Disk: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   UNIFIED HUB: Create order topic
    # ═══════════════════════════════════════════════════════════════
    topic_created = False
    if session:
        try:
            from bot.services.unified_hub import create_order_topic, post_to_feed

            # Create topic for order
            conv, topic_id = await create_order_topic(
                bot=bot,
                session=session,
                order=order,
                user=user,
            )

            if topic_id:
                topic_created = True
                logger.info(f"✅ Order topic created for #{order.id} (topic_id={topic_id})")

                # Post to orders feed
                await post_to_feed(
                    bot=bot,
                    order=order,
                    user=user,
                    topic_id=topic_id,
                    yadisk_link=yadisk_link,
                )
            else:
                logger.warning(f"Topic creation returned None for order #{order.id}")
        except Exception as e:
            logger.error(f"Failed to create order topic for #{order.id}: {e}")

    # If topic successfully created, skip personal admin notifications
    if topic_created:
        logger.info(f"Order #{order.id}: topic created, skipping personal admin notifications")
        return

    # ═══════════════════════════════════════════════════════════════
    #   FALLBACK: Direct admin notifications (if channel unavailable)
    # ═══════════════════════════════════════════════════════════════
    logger.warning(f"Order #{order.id}: falling back to personal admin notifications")

    # Different headers for urgent/special/normal orders
    if is_special:
        header = f"""💀💀💀  <b>СПЕЦЗАКАЗ #{order.id}</b>  💀💀💀

⚠️ <b>ЦЕНУ НУЖНО ВЫСТАВИТЬ ВРУЧНУЮ!</b>"""
    elif is_urgent:
        header = f"""🚨🚨🚨  <b>СРОЧНАЯ ЗАЯВКА #{order.id}</b>  🚨🚨🚨

⚡ <b>ТРЕБУЕТ БЫСТРОГО ОТВЕТА!</b>"""
    else:
        header = f"""🆕  <b>Новая заявка #{order.id}</b>"""

    # Yandex Disk link string
    yadisk_line = f"\n📁 <b>Файлы:</b> <a href=\"{yadisk_link}\">Яндекс Диск</a>\n" if yadisk_link else ""

    # Get client name (support both Telegram User and DB User)
    client_fullname = getattr(user, 'fullname', None) or getattr(user, 'full_name', None) or f"ID:{user.id}"

    text = f"""{header}

◈  Клиент: {client_fullname} ({username_str})
◈  ID: <code>{user.id}</code>

◈  Тип: {work_label}
◈  Направление: {subject_label}
◈  Срок: {data.get('deadline_label', '—')}
{urgent_line}{discount_line}{yadisk_line}"""

    admin_keyboard = get_order_admin_keyboard(order.id, user.id)

    async def notify_single_admin(admin_id: int):
        """Send notification to single admin"""
        try:
            # First send order text with buttons
            await bot.send_message(chat_id=admin_id, text=text, reply_markup=admin_keyboard)

            # Then all attachments
            for att in attachments:
                att_type = att.get("type", "unknown")

                try:
                    if att_type == "text":
                        content = att.get("content", "")
                        if content:
                            await bot.send_message(
                                chat_id=admin_id,
                                text=f"📝 Текст от клиента:\n\n{content}"
                            )
                    elif att_type == "photo":
                        await bot.send_photo(
                            chat_id=admin_id,
                            photo=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "document":
                        await bot.send_document(
                            chat_id=admin_id,
                            document=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "voice":
                        await bot.send_voice(
                            chat_id=admin_id,
                            voice=att.get("file_id")
                        )
                    elif att_type == "video":
                        await bot.send_video(
                            chat_id=admin_id,
                            video=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "video_note":
                        await bot.send_video_note(
                            chat_id=admin_id,
                            video_note=att.get("file_id")
                        )
                    elif att_type == "audio":
                        await bot.send_audio(
                            chat_id=admin_id,
                            audio=att.get("file_id")
                        )
                except Exception:
                    pass
        except Exception:
            pass

    # Send to all admins in parallel
    await asyncio.gather(*[notify_single_admin(admin_id) for admin_id in settings.ADMIN_IDS])


async def start_order_creation(message, state=None):
    """Start order creation — for Reply keyboard"""
    if state is None:
        text = """📝  <b>Заказать работу</b>

Чтобы оформить заказ, напиши Хозяину напрямую:

@""" + settings.SUPPORT_USERNAME + """

Или нажми /start и выбери «📝 Оформить заказ»"""
        await message.answer(text)
        return

    from bot.keyboards.orders import get_work_category_keyboard

    await state.clear()
    from bot.states.order import OrderState
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[])

    text = """🎯 <b>Оформление заказа</b>

Партнер, выбирай калибр задачи. Справимся с любой — от эссе на салфетке до диплома в твердом переплете."""

    await message.answer(text, reply_markup=get_work_category_keyboard())
