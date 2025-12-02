"""
Приватный чат между админом и клиентом по заказу.
Реализует двухсторонний обмен сообщениями через бота.
"""
import logging
from datetime import datetime

from aiogram import Router, Bot, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.orders import Order, OrderMessage, MessageSender
from database.models.users import User
from bot.states.chat import OrderChatStates
from bot.services.yandex_disk import yandex_disk_service
from core.config import settings

logger = logging.getLogger(__name__)

router = Router()


# ══════════════════════════════════════════════════════════════
#                    УТИЛИТЫ
# ══════════════════════════════════════════════════════════════

def get_chat_keyboard(order_id: int, is_admin: bool) -> InlineKeyboardMarkup:
    """Клавиатура для чата - всегда с полным набором кнопок"""
    buttons = []

    if is_admin:
        buttons.append([
            InlineKeyboardButton(text="💬 Ответить", callback_data=f"chat_continue_{order_id}"),
            InlineKeyboardButton(text="📎 Файл", callback_data=f"chat_file_{order_id}"),
        ])
        buttons.append([
            InlineKeyboardButton(text="📜 История", callback_data=f"chat_history_{order_id}"),
            InlineKeyboardButton(text="❌ Закрыть", callback_data=f"chat_close_{order_id}"),
        ])
    else:
        buttons.append([
            InlineKeyboardButton(text="💬 Ответить", callback_data=f"chat_reply_{order_id}"),
            InlineKeyboardButton(text="📎 Файл", callback_data=f"chat_file_client_{order_id}"),
        ])
        buttons.append([
            InlineKeyboardButton(text="📜 История", callback_data=f"chat_history_client_{order_id}"),
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_cancel_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура отмены ввода"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="chat_cancel")]
    ])


def format_order_info(order: Order) -> str:
    """Форматирует краткую информацию о заказе для чата"""
    # Тип работы
    work_type = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type

    # Цена
    if order.price > 0:
        price_str = f"{int(order.price):,}₽".replace(",", " ")
        if order.bonus_used > 0:
            final = order.price - order.bonus_used
            price_str = f"{price_str} (−{int(order.bonus_used)}₽ бонусы = {int(final):,}₽)".replace(",", " ")
    else:
        price_str = "не установлена"

    # Сроки
    deadline_str = order.deadline if order.deadline else "не указаны"

    return (
        f"📋 <b>Заказ #{order.id}</b>\n"
        f"📝 {work_type}\n"
        f"💵 Цена: {price_str}\n"
        f"⏰ Сроки: {deadline_str}"
    )


async def upload_chat_file_to_yadisk(
    bot: Bot,
    file_id: str,
    file_name: str,
    order: Order,
    client_name: str,
    telegram_id: int,
) -> str | None:
    """
    Загружает файл из чата на Яндекс.Диск в папку Диалог.
    Возвращает публичную ссылку или None.
    """
    if not yandex_disk_service.is_available:
        return None

    try:
        # Скачиваем файл из Telegram
        file = await bot.get_file(file_id)
        file_bytes = await bot.download_file(file.file_path)
        content = file_bytes.read()

        # Загружаем в подпапку "Диалог" заказа
        import httpx
        from bot.services.yandex_disk import YADISK_API_BASE, sanitize_filename

        # Путь: /Root/Клиенты/Имя_ID/Заказ_X/Диалог/файл
        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = f"{safe_name}_{telegram_id}"
        order_folder = f"Заказ_{order.id}"
        dialog_folder = f"/{yandex_disk_service._root_folder}/Клиенты/{folder_name}/{order_folder}/Диалог"

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Создаём папку Диалог
            if not await yandex_disk_service._ensure_folder_exists(client, dialog_folder):
                logger.error(f"Failed to create dialog folder: {dialog_folder}")
                return None

            # Путь к файлу с timestamp для уникальности
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = sanitize_filename(file_name)
            file_path = f"{dialog_folder}/{timestamp}_{safe_filename}"

            # Получаем URL для загрузки
            upload_url = await yandex_disk_service._get_upload_url(client, file_path)
            if not upload_url:
                return None

            # Загружаем
            upload_resp = await client.put(
                upload_url,
                content=content,
                headers={"Content-Type": "application/octet-stream"},
            )

            if upload_resp.status_code not in (201, 202):
                logger.error(f"Upload failed: {upload_resp.status_code}")
                return None

            # Публикуем папку диалога
            public_url = await yandex_disk_service._publish_folder(client, dialog_folder)

            logger.info(f"Chat file uploaded: {file_path}")
            return public_url

    except Exception as e:
        logger.error(f"Error uploading chat file: {e}")
        return None


async def backup_chat_to_yadisk(
    order: Order,
    client_name: str,
    telegram_id: int,
    session: AsyncSession,
) -> bool:
    """
    Сохраняет историю чата в текстовый файл на Яндекс.Диск.
    """
    if not yandex_disk_service.is_available:
        return False

    try:
        # Получаем все сообщения заказа
        messages_query = select(OrderMessage).where(
            OrderMessage.order_id == order.id
        ).order_by(OrderMessage.created_at)
        result = await session.execute(messages_query)
        messages = result.scalars().all()

        if not messages:
            return True  # Нечего бэкапить

        # Формируем текст истории с информацией о заказе
        work_type = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type
        price_str = f"{int(order.price):,}₽".replace(",", " ") if order.price > 0 else "не установлена"
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

        # Загружаем на Яндекс.Диск
        import httpx
        from bot.services.yandex_disk import YADISK_API_BASE, sanitize_filename

        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = f"{safe_name}_{telegram_id}"
        order_folder = f"Заказ_{order.id}"
        dialog_folder = f"/{yandex_disk_service._root_folder}/Клиенты/{folder_name}/{order_folder}/Диалог"

        async with httpx.AsyncClient(timeout=60.0) as client:
            if not await yandex_disk_service._ensure_folder_exists(client, dialog_folder):
                return False

            # Один файл истории — перезаписывается при каждом обновлении
            file_path = f"{dialog_folder}/История_чата.txt"

            # overwrite=True для перезаписи существующего файла
            upload_url = await yandex_disk_service._get_upload_url(client, file_path, overwrite=True)
            if not upload_url:
                return False

            upload_resp = await client.put(
                upload_url,
                content=chat_text.encode("utf-8"),
                headers={"Content-Type": "text/plain; charset=utf-8"},
            )

            if upload_resp.status_code in (201, 202):
                logger.info(f"Chat history backed up: {file_path}")
                return True

            return False

    except Exception as e:
        logger.error(f"Error backing up chat: {e}")
        return False


# ══════════════════════════════════════════════════════════════
#                    АДМИН ИНИЦИИРУЕТ ЧАТ
# ══════════════════════════════════════════════════════════════

async def start_admin_chat(message: Message, order_id: int, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Админ начинает чат с клиентом.
    Вызывается из start.py при deep_link chat_{order_id}.
    """
    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        await message.answer("❌ Эта функция только для администраторов")
        return

    # Получаем заказ
    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    # Получаем клиента
    client_query = select(User).where(User.telegram_id == order.user_id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()

    client_name = client.fullname if client else "Клиент"

    # Устанавливаем состояние и сохраняем данные
    await state.set_state(OrderChatStates.admin_writing)
    await state.update_data(
        order_id=order_id,
        client_id=order.user_id,
        client_name=client_name,
    )

    # Показываем последние сообщения (если есть)
    history_text = ""
    try:
        messages_query = select(OrderMessage).where(
            OrderMessage.order_id == order_id
        ).order_by(OrderMessage.created_at.desc()).limit(5)
        result = await session.execute(messages_query)
        recent_messages = list(reversed(result.scalars().all()))

        if recent_messages:
            history_text = "\n\n📜 <b>Последние сообщения:</b>\n"
            for msg in recent_messages:
                sender = "🛡️ Вы" if msg.sender_type == MessageSender.ADMIN.value else f"👤 {client_name}"
                text_preview = (msg.message_text[:50] + "...") if msg.message_text and len(msg.message_text) > 50 else (msg.message_text or "📎 Файл")
                history_text += f"• {sender}: {text_preview}\n"
    except Exception as e:
        logger.warning(f"Could not load chat history: {e}")

    # Получаем label типа работы
    work_type_display = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type

    await message.answer(
        f"💬 <b>Чат с клиентом по заказу #{order_id}</b>\n\n"
        f"👤 Клиент: {client_name}\n"
        f"📋 Тип работы: {work_type_display}"
        f"{history_text}\n\n"
        f"✏️ Введите сообщение или отправьте файл:",
        reply_markup=get_cancel_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    АДМИН ОТПРАВЛЯЕТ СООБЩЕНИЕ
# ══════════════════════════════════════════════════════════════

@router.message(OrderChatStates.admin_writing, F.text)
async def admin_send_text(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Админ отправляет текстовое сообщение клиенту"""
    data = await state.get_data()
    order_id = data.get("order_id")
    client_id = data.get("client_id")
    client_name = data.get("client_name", "Клиент")

    if not order_id or not client_id:
        await message.answer("❌ Ошибка: данные чата потеряны")
        await state.clear()
        return

    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Сохраняем сообщение в БД
    order_message = OrderMessage(
        order_id=order_id,
        sender_type=MessageSender.ADMIN.value,
        sender_id=message.from_user.id,
        message_text=message.text,
    )
    session.add(order_message)

    # Отправляем клиенту с информацией о заказе
    order_info = format_order_info(order)
    try:
        client_msg = await bot.send_message(
            chat_id=client_id,
            text=f"{order_info}\n\n"
                 f"💬 <b>Сообщение от Шерифа:</b>\n{message.text}",
            reply_markup=get_chat_keyboard(order_id, is_admin=False)
        )
        order_message.client_message_id = client_msg.message_id
        order_message.admin_message_id = message.message_id

        await session.commit()

        await message.answer(
            f"✅ Сообщение отправлено клиенту {client_name}",
            reply_markup=get_chat_keyboard(order_id, is_admin=True)
        )

        # Бэкапим чат
        await backup_chat_to_yadisk(order, client_name, client_id, session)

    except Exception as e:
        logger.error(f"Error sending message to client {client_id}: {e}")
        await message.answer(f"❌ Не удалось отправить сообщение: {e}")

    await state.clear()


@router.message(OrderChatStates.admin_writing, F.photo | F.document | F.video | F.voice | F.audio)
async def admin_send_file(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Админ отправляет файл клиенту"""
    data = await state.get_data()
    order_id = data.get("order_id")
    client_id = data.get("client_id")
    client_name = data.get("client_name", "Клиент")

    if not order_id or not client_id:
        await message.answer("❌ Ошибка: данные чата потеряны")
        await state.clear()
        return

    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Определяем тип файла и получаем file_id
    file_id = None
    file_name = None
    file_type = None
    caption = message.caption or ""

    if message.photo:
        file_id = message.photo[-1].file_id  # Берём максимальное качество
        file_name = f"photo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        file_type = "photo"
    elif message.document:
        file_id = message.document.file_id
        file_name = message.document.file_name or f"document_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
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
        file_name = message.audio.file_name or f"audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        file_type = "audio"

    if not file_id:
        await message.answer("❌ Не удалось обработать файл")
        return

    # Загружаем на Яндекс.Диск
    yadisk_url = await upload_chat_file_to_yadisk(
        bot, file_id, file_name, order, client_name, client_id
    )

    # Сохраняем сообщение в БД
    order_message = OrderMessage(
        order_id=order_id,
        sender_type=MessageSender.ADMIN.value,
        sender_id=message.from_user.id,
        message_text=caption if caption else None,
        file_type=file_type,
        file_id=file_id,
        file_name=file_name,
        yadisk_url=yadisk_url,
    )
    session.add(order_message)

    # Отправляем клиенту с информацией о заказе
    order_info = format_order_info(order)
    try:
        msg_text = f"{order_info}\n\n📎 <b>Файл от Шерифа:</b>"
        if caption:
            msg_text += f"\n\n{caption}"

        # Отправляем файл в зависимости от типа
        if file_type == "photo":
            client_msg = await bot.send_photo(
                chat_id=client_id,
                photo=file_id,
                caption=msg_text,
                reply_markup=get_chat_keyboard(order_id, is_admin=False)
            )
        elif file_type == "video":
            client_msg = await bot.send_video(
                chat_id=client_id,
                video=file_id,
                caption=msg_text,
                reply_markup=get_chat_keyboard(order_id, is_admin=False)
            )
        elif file_type == "voice":
            # Голосовые без caption, отправляем отдельно
            await bot.send_message(chat_id=client_id, text=msg_text)
            client_msg = await bot.send_voice(
                chat_id=client_id,
                voice=file_id,
                reply_markup=get_chat_keyboard(order_id, is_admin=False)
            )
        elif file_type == "audio":
            client_msg = await bot.send_audio(
                chat_id=client_id,
                audio=file_id,
                caption=msg_text,
                reply_markup=get_chat_keyboard(order_id, is_admin=False)
            )
        else:  # document
            client_msg = await bot.send_document(
                chat_id=client_id,
                document=file_id,
                caption=msg_text,
                reply_markup=get_chat_keyboard(order_id, is_admin=False)
            )

        order_message.client_message_id = client_msg.message_id
        order_message.admin_message_id = message.message_id

        await session.commit()

        yadisk_note = " 📁 Сохранено на Я.Диск" if yadisk_url else ""
        await message.answer(
            f"✅ Файл отправлен клиенту {client_name}{yadisk_note}",
            reply_markup=get_chat_keyboard(order_id, is_admin=True)
        )

        # Бэкапим чат
        await backup_chat_to_yadisk(order, client_name, client_id, session)

    except Exception as e:
        logger.error(f"Error sending file to client {client_id}: {e}")
        await message.answer(f"❌ Не удалось отправить файл: {e}")

    await state.clear()


# ══════════════════════════════════════════════════════════════
#                    КЛИЕНТ ОТВЕЧАЕТ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("chat_reply_"))
async def client_start_reply(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Клиент нажал 'Ответить'"""
    order_id = int(callback.data.replace("chat_reply_", ""))

    # Проверяем что это клиент заказа
    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    if order.user_id != callback.from_user.id:
        await callback.answer("❌ Это не ваш заказ", show_alert=True)
        return

    # Устанавливаем состояние
    await state.set_state(OrderChatStates.client_replying)
    await state.update_data(order_id=order_id)

    await callback.message.answer(
        f"💬 <b>Ответ по заказу #{order_id}</b>\n\n"
        f"✏️ Введите сообщение или отправьте файл:",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


@router.message(OrderChatStates.client_replying, F.text)
async def client_send_text(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Клиент отправляет текстовое сообщение админу"""
    data = await state.get_data()
    order_id = data.get("order_id")

    if not order_id:
        await message.answer("❌ Ошибка: данные чата потеряны")
        await state.clear()
        return

    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Получаем данные клиента
    client_query = select(User).where(User.telegram_id == message.from_user.id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else message.from_user.full_name

    # Сохраняем сообщение в БД
    order_message = OrderMessage(
        order_id=order_id,
        sender_type=MessageSender.CLIENT.value,
        sender_id=message.from_user.id,
        message_text=message.text,
        client_message_id=message.message_id,
    )
    session.add(order_message)

    # Уведомляем всех админов с информацией о заказе
    order_info = format_order_info(order)
    sent_to_admin = False
    for admin_id in settings.ADMIN_IDS:
        try:
            admin_msg = await bot.send_message(
                chat_id=admin_id,
                text=f"{order_info}\n\n"
                     f"💬 <b>Сообщение от клиента:</b>\n"
                     f"👤 {client_name}\n\n"
                     f"{message.text}",
                reply_markup=get_chat_keyboard(order_id, is_admin=True)
            )
            if not sent_to_admin:
                order_message.admin_message_id = admin_msg.message_id
                sent_to_admin = True
        except Exception as e:
            logger.error(f"Error sending to admin {admin_id}: {e}")

    await session.commit()

    if sent_to_admin:
        await message.answer(
            f"✅ Сообщение отправлено шерифу!\n\n"
            f"Ожидайте ответа.",
            reply_markup=get_chat_keyboard(order_id, is_admin=False)
        )

        # Бэкапим чат
        await backup_chat_to_yadisk(order, client_name, message.from_user.id, session)
    else:
        await message.answer("⚠️ Не удалось связаться с шерифом. Попробуйте позже.")

    await state.clear()


@router.message(OrderChatStates.client_replying, F.photo | F.document | F.video | F.voice | F.audio)
async def client_send_file(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Клиент отправляет файл админу"""
    data = await state.get_data()
    order_id = data.get("order_id")

    if not order_id:
        await message.answer("❌ Ошибка: данные чата потеряны")
        await state.clear()
        return

    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Получаем данные клиента
    client_query = select(User).where(User.telegram_id == message.from_user.id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else message.from_user.full_name

    # Определяем тип файла
    file_id = None
    file_name = None
    file_type = None
    caption = message.caption or ""

    if message.photo:
        file_id = message.photo[-1].file_id
        file_name = f"photo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        file_type = "photo"
    elif message.document:
        file_id = message.document.file_id
        file_name = message.document.file_name or f"document_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
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
        file_name = message.audio.file_name or f"audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        file_type = "audio"

    if not file_id:
        await message.answer("❌ Не удалось обработать файл")
        return

    # Загружаем на Яндекс.Диск
    yadisk_url = await upload_chat_file_to_yadisk(
        bot, file_id, file_name, order, client_name, message.from_user.id
    )

    # Сохраняем сообщение в БД
    order_message = OrderMessage(
        order_id=order_id,
        sender_type=MessageSender.CLIENT.value,
        sender_id=message.from_user.id,
        message_text=caption if caption else None,
        file_type=file_type,
        file_id=file_id,
        file_name=file_name,
        yadisk_url=yadisk_url,
        client_message_id=message.message_id,
    )
    session.add(order_message)

    # Отправляем админам с информацией о заказе
    order_info = format_order_info(order)
    msg_text = f"{order_info}\n\n📎 <b>Файл от клиента:</b>\n👤 {client_name}"
    if caption:
        msg_text += f"\n\n{caption}"
    if yadisk_url:
        msg_text += f"\n\n📁 <a href='{yadisk_url}'>Открыть на Я.Диске</a>"

    sent_to_admin = False
    for admin_id in settings.ADMIN_IDS:
        try:
            if file_type == "photo":
                admin_msg = await bot.send_photo(
                    chat_id=admin_id,
                    photo=file_id,
                    caption=msg_text,
                    reply_markup=get_chat_keyboard(order_id, is_admin=True)
                )
            elif file_type == "video":
                admin_msg = await bot.send_video(
                    chat_id=admin_id,
                    video=file_id,
                    caption=msg_text,
                    reply_markup=get_chat_keyboard(order_id, is_admin=True)
                )
            elif file_type == "voice":
                await bot.send_message(chat_id=admin_id, text=msg_text)
                admin_msg = await bot.send_voice(
                    chat_id=admin_id,
                    voice=file_id,
                    reply_markup=get_chat_keyboard(order_id, is_admin=True)
                )
            elif file_type == "audio":
                admin_msg = await bot.send_audio(
                    chat_id=admin_id,
                    audio=file_id,
                    caption=msg_text,
                    reply_markup=get_chat_keyboard(order_id, is_admin=True)
                )
            else:
                admin_msg = await bot.send_document(
                    chat_id=admin_id,
                    document=file_id,
                    caption=msg_text,
                    reply_markup=get_chat_keyboard(order_id, is_admin=True)
                )

            if not sent_to_admin:
                order_message.admin_message_id = admin_msg.message_id
                sent_to_admin = True
        except Exception as e:
            logger.error(f"Error sending file to admin {admin_id}: {e}")

    await session.commit()

    if sent_to_admin:
        yadisk_note = " 📁 Сохранено на Я.Диск" if yadisk_url else ""
        await message.answer(
            f"✅ Файл отправлен шерифу!{yadisk_note}\n\n"
            f"Ожидайте ответа.",
            reply_markup=get_chat_keyboard(order_id, is_admin=False)
        )

        # Бэкапим чат
        await backup_chat_to_yadisk(order, client_name, message.from_user.id, session)
    else:
        await message.answer("⚠️ Не удалось связаться с шерифом. Попробуйте позже.")

    await state.clear()


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ ЧАТОМ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("chat_continue_"))
async def admin_continue_chat(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Админ продолжает писать в чат"""
    order_id = int(callback.data.replace("chat_continue_", ""))

    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("❌ Только для админов", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    # Получаем клиента
    client_query = select(User).where(User.telegram_id == order.user_id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else "Клиент"

    await state.set_state(OrderChatStates.admin_writing)
    await state.update_data(
        order_id=order_id,
        client_id=order.user_id,
        client_name=client_name,
    )

    await callback.message.answer(
        f"💬 <b>Чат с клиентом по заказу #{order_id}</b>\n\n"
        f"✏️ Введите сообщение или отправьте файл:",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("chat_close_"))
async def admin_close_chat(callback: CallbackQuery, state: FSMContext):
    """Админ закрывает чат"""
    await state.clear()
    await callback.answer("✅ Чат закрыт")

    try:
        # Убираем кнопки
        await callback.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass


@router.callback_query(F.data == "chat_cancel")
async def cancel_chat_input(callback: CallbackQuery, state: FSMContext):
    """Отмена ввода сообщения"""
    await state.clear()
    await callback.answer("❌ Отменено")

    try:
        await callback.message.delete()
    except Exception:
        pass


@router.callback_query(F.data.startswith("chat_file_client_"))
async def client_send_file_btn(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Клиент хочет отправить файл"""
    order_id = int(callback.data.replace("chat_file_client_", ""))

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    if order.user_id != callback.from_user.id:
        await callback.answer("❌ Это не ваш заказ", show_alert=True)
        return

    await state.set_state(OrderChatStates.client_replying)
    await state.update_data(order_id=order_id)

    await callback.message.answer(
        f"📎 <b>Отправка файла по заказу #{order_id}</b>\n\n"
        f"Отправьте файл, фото или голосовое сообщение:",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("chat_file_"))
async def admin_send_file_btn(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Админ хочет отправить файл"""
    # Проверяем что это не client callback (уже обработан выше)
    if "client" in callback.data:
        return

    order_id = int(callback.data.replace("chat_file_", ""))

    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("❌ Только для админов", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    client_query = select(User).where(User.telegram_id == order.user_id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else "Клиент"

    await state.set_state(OrderChatStates.admin_writing)
    await state.update_data(
        order_id=order_id,
        client_id=order.user_id,
        client_name=client_name,
    )

    await callback.message.answer(
        f"📎 <b>Отправка файла клиенту по заказу #{order_id}</b>\n\n"
        f"Отправьте файл, фото или голосовое сообщение:",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


# ══════════════════════════════════════════════════════════════
#                    ИСТОРИЯ ЧАТА
# ══════════════════════════════════════════════════════════════

async def show_chat_history(callback: CallbackQuery, order_id: int, session: AsyncSession, is_admin: bool):
    """Показывает историю чата в Telegram"""
    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("❌ Заказ не найден", show_alert=True)
        return

    # Проверка доступа для клиента
    if not is_admin and order.user_id != callback.from_user.id:
        await callback.answer("❌ Это не ваш заказ", show_alert=True)
        return

    # Получаем сообщения
    try:
        messages_query = select(OrderMessage).where(
            OrderMessage.order_id == order_id
        ).order_by(OrderMessage.created_at)
        result = await session.execute(messages_query)
        messages = result.scalars().all()
    except Exception:
        messages = []

    # Информация о заказе
    order_info = format_order_info(order)

    if not messages:
        await callback.message.answer(
            f"{order_info}\n\n"
            f"📜 <b>История чата</b>\n\n"
            f"<i>Сообщений пока нет</i>",
            reply_markup=get_chat_keyboard(order_id, is_admin)
        )
        await callback.answer()
        return

    # Формируем историю
    history_lines = [f"{order_info}\n", "📜 <b>История чата:</b>\n"]

    for msg in messages[-20:]:  # Последние 20 сообщений
        sender = "🛡️ Шериф" if msg.sender_type == MessageSender.ADMIN.value else "👤 Клиент"
        time_str = msg.created_at.strftime("%d.%m %H:%M") if msg.created_at else ""

        line = f"<b>{sender}</b> <i>{time_str}</i>"
        if msg.message_text:
            text = msg.message_text[:100] + "..." if len(msg.message_text) > 100 else msg.message_text
            line += f"\n{text}"
        if msg.file_name:
            line += f"\n📎 {msg.file_name}"

        history_lines.append(line)
        history_lines.append("")

    if len(messages) > 20:
        history_lines.append(f"<i>... и ещё {len(messages) - 20} сообщений</i>")

    await callback.message.answer(
        "\n".join(history_lines),
        reply_markup=get_chat_keyboard(order_id, is_admin)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("chat_history_client_"))
async def client_view_history(callback: CallbackQuery, session: AsyncSession):
    """Клиент смотрит историю чата"""
    order_id = int(callback.data.replace("chat_history_client_", ""))
    await show_chat_history(callback, order_id, session, is_admin=False)


@router.callback_query(F.data.startswith("chat_history_"))
async def admin_view_history(callback: CallbackQuery, session: AsyncSession):
    """Админ смотрит историю чата"""
    if "client" in callback.data:
        return

    order_id = int(callback.data.replace("chat_history_", ""))

    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("❌ Только для админов", show_alert=True)
        return

    await show_chat_history(callback, order_id, session, is_admin=True)


# ══════════════════════════════════════════════════════════════
#                    ПРЯМЫЕ СООБЩЕНИЯ (ВНЕ ЗАКАЗА)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("dm_reply_"))
async def admin_dm_reply(callback: CallbackQuery, state: FSMContext):
    """Админ отвечает на свободное сообщение клиента"""
    if callback.from_user.id not in settings.ADMIN_IDS:
        await callback.answer("❌ Только для админов", show_alert=True)
        return

    user_id = int(callback.data.replace("dm_reply_", ""))

    await state.set_state(OrderChatStates.admin_dm)
    await state.update_data(client_id=user_id)

    await callback.message.answer(
        f"💬 <b>Ответ клиенту</b>\n\n"
        f"🆔 ID: <code>{user_id}</code>\n\n"
        f"✏️ Введите сообщение:",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


@router.message(OrderChatStates.admin_dm, F.text)
async def admin_dm_send(message: Message, state: FSMContext, bot: Bot):
    """Админ отправляет прямое сообщение клиенту"""
    data = await state.get_data()
    client_id = data.get("client_id")

    if not client_id:
        await message.answer("❌ Ошибка: данные потеряны")
        await state.clear()
        return

    try:
        await bot.send_message(
            chat_id=client_id,
            text=f"🛡️ <b>Сообщение от Шерифа:</b>\n\n{message.text}"
        )
        await message.answer("✅ Сообщение отправлено!")
    except Exception as e:
        logger.error(f"Error sending DM to {client_id}: {e}")
        await message.answer(f"❌ Не удалось отправить: {e}")

    await state.clear()


# ══════════════════════════════════════════════════════════════
#                    ЧАТ ПОДДЕРЖКИ В БОТЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "support_bot_chat")
async def start_support_chat(callback: CallbackQuery, state: FSMContext):
    """Клиент начинает чат с поддержкой в боте"""
    await state.set_state(OrderChatStates.client_support)

    await callback.message.answer(
        "💬 <b>Чат с Шерифом</b>\n\n"
        "Напиши своё сообщение — я передам его Шерифу,\n"
        "и он ответит тебе прямо сюда!\n\n"
        "✏️ <i>Пиши, партнёр...</i>",
        reply_markup=get_cancel_keyboard()
    )
    await callback.answer()


@router.message(OrderChatStates.client_support, F.text)
async def client_support_message(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Клиент отправляет сообщение в поддержку"""
    from bot.keyboards.inline import get_main_menu_keyboard

    user = message.from_user

    # Получаем пользователя из БД
    client_query = select(User).where(User.telegram_id == user.id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else user.full_name

    # Кнопка для ответа админу
    reply_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Ответить клиенту",
            callback_data=f"dm_reply_{user.id}"
        )]
    ])

    # Отправляем админам
    sent = False
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                chat_id=admin_id,
                text=f"📩 <b>Сообщение через чат поддержки</b>\n\n"
                     f"👤 {client_name} (@{user.username or 'нет'})\n"
                     f"🆔 <code>{user.id}</code>\n\n"
                     f"💬 {message.text}",
                reply_markup=reply_keyboard
            )
            sent = True
        except Exception as e:
            logger.error(f"Error sending support message to admin {admin_id}: {e}")

    await state.clear()

    if sent:
        await message.answer(
            "✅ <b>Сообщение отправлено Шерифу!</b>\n\n"
            "Ответ придёт сюда же. Обычно отвечаю\n"
            "в течение пары часов, часто быстрее 🤠",
            reply_markup=get_main_menu_keyboard()
        )
    else:
        await message.answer(
            "⚠️ Не удалось отправить сообщение.\n"
            f"Напиши напрямую: @{settings.SUPPORT_USERNAME}",
            reply_markup=get_main_menu_keyboard()
        )


@router.message(OrderChatStates.client_support, F.photo | F.document)
async def client_support_file(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Клиент отправляет файл в поддержку"""
    from bot.keyboards.inline import get_main_menu_keyboard

    user = message.from_user

    # Получаем пользователя из БД
    client_query = select(User).where(User.telegram_id == user.id)
    result = await session.execute(client_query)
    client = result.scalar_one_or_none()
    client_name = client.fullname if client else user.full_name

    # Определяем файл
    file_id = None
    file_type = None

    if message.photo:
        file_id = message.photo[-1].file_id
        file_type = "photo"
    elif message.document:
        file_id = message.document.file_id
        file_type = "document"

    caption = message.caption or ""

    # Кнопка для ответа
    reply_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Ответить клиенту",
            callback_data=f"dm_reply_{user.id}"
        )]
    ])

    msg_text = (
        f"📩 <b>Файл через чат поддержки</b>\n\n"
        f"👤 {client_name} (@{user.username or 'нет'})\n"
        f"🆔 <code>{user.id}</code>"
    )
    if caption:
        msg_text += f"\n\n💬 {caption}"

    # Отправляем админам
    sent = False
    for admin_id in settings.ADMIN_IDS:
        try:
            if file_type == "photo":
                await bot.send_photo(
                    chat_id=admin_id,
                    photo=file_id,
                    caption=msg_text,
                    reply_markup=reply_keyboard
                )
            else:
                await bot.send_document(
                    chat_id=admin_id,
                    document=file_id,
                    caption=msg_text,
                    reply_markup=reply_keyboard
                )
            sent = True
        except Exception as e:
            logger.error(f"Error sending support file to admin {admin_id}: {e}")

    await state.clear()

    if sent:
        await message.answer(
            "✅ <b>Файл отправлен Шерифу!</b>\n\n"
            "Ответ придёт сюда же 🤠",
            reply_markup=get_main_menu_keyboard()
        )
    else:
        await message.answer(
            "⚠️ Не удалось отправить файл.\n"
            f"Напиши напрямую: @{settings.SUPPORT_USERNAME}",
            reply_markup=get_main_menu_keyboard()
        )
