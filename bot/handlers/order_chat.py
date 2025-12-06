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
"""
import logging
import re
from datetime import datetime

from aiogram import Router, Bot, F
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
    ForumTopic,
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.filters import Command
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from database.models.orders import (
    Order, OrderMessage, MessageSender, Conversation, ConversationType, OrderStatus
)
from database.models.users import User
from bot.states.chat import ChatStates
from bot.services.yandex_disk import yandex_disk_service
from core.config import settings

logger = logging.getLogger(__name__)

router = Router()


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
        "text": "Здравствуйте! 👋\nСпасибо за обращение. Чем могу помочь?",
    },
    "2": {
        "name": "Принято в работу",
        "text": "✅ Заказ принят в работу!\nСроки выполнения: согласно дедлайну.\nЕсли будут вопросы — пишите сюда.",
    },
    "3": {
        "name": "Готово",
        "text": "🎉 Работа готова!\nФайлы отправлены в чат и на Яндекс.Диск.\nПроверьте и подтвердите получение.",
    },
    "4": {
        "name": "Уточнение",
        "text": "📝 Для точного расчёта уточните, пожалуйста:\n• Объём работы\n• Точный срок сдачи\n• Дополнительные требования",
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
        "name": "Правки бесплатно",
        "text": "✏️ Бесплатные правки включены!\nОпишите, что нужно исправить — сделаем в кратчайшие сроки.",
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
    from bot.services.live_cards import send_or_update_card

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
        await session.commit()

        # Отправляем стартовое сообщение в топик
        await send_topic_header(bot, session, conv, user, order_id)

        # FUSION: Если есть заказ — отправляем и закрепляем карточку
        if order_id:
            order = await session.get(Order, order_id)
            if order:
                await send_or_update_card(
                    bot=bot,
                    order=order,
                    session=session,
                    client_username=user.username if user else None,
                    client_name=client_name,
                )
                logger.info(f"📋 Posted order card in new topic {conv.topic_id}")

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
    """Отправляет заголовок-информацию в новый топик"""
    client_name = user.fullname if user else "Неизвестно"
    username = f"@{user.username}" if user and user.username else "нет"

    header_lines = [
        "🆕 <b>Новый диалог</b>\n",
        f"👤 <b>Клиент:</b> {client_name}",
        f"📱 <b>Username:</b> {username}",
        f"🆔 <b>ID:</b> <code>{conv.user_id}</code>",
    ]

    if order_id:
        order = await session.get(Order, order_id)
        if order:
            header_lines.append("")
            header_lines.append(format_order_info(order))

    header_lines.extend([
        "",
        "━" * 30,
        "💡 <i>Пишите сюда — сообщения уйдут клиенту.</i>",
        "💡 <i>Начните сообщение с точки <code>.</code> для внутреннего комментария.</i>",
    ])

    await bot.send_message(
        chat_id=settings.ADMIN_GROUP_ID,
        message_thread_id=conv.topic_id,
        text="\n".join(header_lines),
    )


def format_order_info(order: Order) -> str:
    """Форматирует краткую информацию о заказе"""
    work_type = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type

    if order.price > 0:
        price_str = f"{int(order.price):,}₽".replace(",", " ")
        if order.bonus_used > 0:
            final = order.price - order.bonus_used
            price_str = f"{price_str} (−{int(order.bonus_used)}₽ = {int(final):,}₽)".replace(",", " ")
    else:
        price_str = "не установлена"

    deadline_str = order.deadline if order.deadline else "не указаны"

    return (
        f"📋 <b>Заказ #{order.id}</b>\n"
        f"📝 {work_type}\n"
        f"💵 Цена: {price_str}\n"
        f"⏰ Сроки: {deadline_str}\n"
        f"📊 Статус: {order.status_label}"
    )


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
        "💬 <b>Чат с поддержкой</b>\n\n"
        "Вы в чате с менеджером.\n"
        "Можете писать текстом, слать файлы и голосовые.\n\n"
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

    from bot.keyboards.inline import get_main_menu_keyboard
    await message.answer(
        "✅ Вы вышли из чата.\n\n"
        "Если понадобится связаться — всегда можете написать снова!",
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer(
        "🏠 <b>Главное меню</b>",
        reply_markup=get_main_menu_keyboard(),
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
    # Игнорируем сообщения бота
    if message.from_user.is_bot:
        return

    # Игнорируем служебные сообщения (создание топика и т.д.)
    if message.forum_topic_created or message.forum_topic_edited or message.forum_topic_closed:
        return

    # Проверяем на внутренний комментарий (начинается с точки)
    if message.text and message.text.startswith("."):
        # Это внутренний комментарий команды — не пересылаем
        return

    topic_id = message.message_thread_id

    # Ищем Conversation по topic_id
    query = select(Conversation).where(Conversation.topic_id == topic_id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv:
        # Топик не привязан к диалогу — игнорируем
        logger.debug(f"No conversation found for topic {topic_id}")
        return

    try:
        # Пересылаем сообщение клиенту
        await bot.copy_message(
            chat_id=conv.user_id,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
        )

        # Сохраняем в БД
        await save_message_to_db(
            session=session,
            order_id=conv.order_id,
            sender_type=MessageSender.ADMIN.value,
            sender_id=message.from_user.id,
            message=message,
            bot=bot,
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
            text=template["text"],
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
/card — обновить карточку заказа
/price 5000 — установить цену

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
):
    """Сохраняет сообщение в БД (если есть order_id)"""
    if not order_id:
        # Для чатов без заказа пока не сохраняем в order_messages
        return

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
            order = await session.get(Order, order_id)
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

                yadisk_url = await upload_chat_file_to_yadisk(
                    bot, file_id, file_name, order, client_name, order.user_id
                )
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
    )
    session.add(order_message)
    await session.commit()

    # Бэкапим историю чата
    if order_id:
        order = await session.get(Order, order_id)
        if order:
            user_query = select(User).where(User.telegram_id == order.user_id)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            client_name = user.fullname if user else "Client"
            await backup_chat_to_yadisk(order, client_name, order.user_id, session)


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
) -> str | None:
    """Загружает файл из чата на Яндекс.Диск"""
    if not yandex_disk_service.is_available:
        return None

    try:
        file = await bot.get_file(file_id)
        file_bytes = await bot.download_file(file.file_path)
        content = file_bytes.read()

        import httpx
        from bot.services.yandex_disk import sanitize_filename

        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = f"{safe_name}_{telegram_id}"
        order_folder = f"Заказ_{order.id}"
        dialog_folder = f"/{yandex_disk_service._root_folder}/Клиенты/{folder_name}/{order_folder}/Диалог"

        async with httpx.AsyncClient(timeout=60.0) as client:
            if not await yandex_disk_service._ensure_folder_exists(client, dialog_folder):
                return None

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = sanitize_filename(file_name)
            file_path = f"{dialog_folder}/{timestamp}_{safe_filename}"

            upload_url = await yandex_disk_service._get_upload_url(client, file_path)
            if not upload_url:
                return None

            upload_resp = await client.put(
                upload_url,
                content=content,
                headers={"Content-Type": "application/octet-stream"},
            )

            if upload_resp.status_code not in (201, 202):
                return None

            public_url = await yandex_disk_service._publish_folder(client, file_path)
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

        import httpx
        from bot.services.yandex_disk import sanitize_filename

        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = f"{safe_name}_{telegram_id}"
        order_folder = f"Заказ_{order.id}"
        dialog_folder = f"/{yandex_disk_service._root_folder}/Клиенты/{folder_name}/{order_folder}/Диалог"

        async with httpx.AsyncClient(timeout=60.0) as client:
            if not await yandex_disk_service._ensure_folder_exists(client, dialog_folder):
                return False

            file_path = f"{dialog_folder}/История_чата.txt"
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
        Conversation.is_active == True
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
    from bot.services.live_cards import send_or_update_card

    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    topic_id = message.message_thread_id

    # Находим Conversation по topic_id
    query = select(Conversation).where(Conversation.topic_id == topic_id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return

    if not conv.order_id:
        await message.reply("❌ Этот топик не привязан к заказу (поддержка)")
        return

    # Получаем заказ и пользователя
    order = await session.get(Order, conv.order_id)
    if not order:
        await message.reply("❌ Заказ не найден")
        return

    user_query = select(User).where(User.telegram_id == conv.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    # Сбрасываем topic_card_message_id чтобы создать новую карточку
    conv.topic_card_message_id = None
    await session.commit()

    # Отправляем/обновляем карточку
    try:
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
        )
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
    from bot.services.live_cards import send_or_update_card

    # Проверяем что это админ
    if message.from_user.id not in settings.ADMIN_IDS:
        return

    topic_id = message.message_thread_id

    # Находим Conversation по topic_id
    query = select(Conversation).where(Conversation.topic_id == topic_id)
    result = await session.execute(query)
    conv = result.scalar_one_or_none()

    if not conv:
        await message.reply("❌ Этот топик не привязан к диалогу")
        return

    if not conv.order_id:
        await message.reply("❌ Этот топик не привязан к заказу")
        return

    # Получаем заказ и пользователя
    order = await session.get(Order, conv.order_id)
    if not order:
        await message.reply("❌ Заказ не найден")
        return

    user_query = select(User).where(User.telegram_id == conv.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

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

            # Рассчитываем бонусы
            bonus_used = 0
            if user and user.balance > 0:
                max_bonus = price * 0.5
                bonus_used = min(user.balance, max_bonus)

            # Устанавливаем цену
            order.price = float(price)
            order.bonus_used = bonus_used
            order.status = OrderStatus.WAITING_PAYMENT.value
            await session.commit()

            # Обновляем карточки (Dual Sync)
            final_price = price - bonus_used
            if bonus_used > 0:
                extra_text = (
                    f"💵 Тариф: {price:,}₽\n"
                    f"💎 Бонусы: −{bonus_used:.0f}₽\n"
                    f"👉 К оплате: {final_price:,.0f}₽"
                ).replace(",", " ")
            else:
                extra_text = f"💵 Цена: {price:,}₽".replace(",", " ")

            await send_or_update_card(
                bot=bot,
                order=order,
                session=session,
                client_username=user.username if user else None,
                client_name=user.fullname if user else None,
                extra_text=extra_text,
            )

            # Отправляем счёт клиенту
            from bot.handlers.channel_cards import send_payment_notification
            sent = await send_payment_notification(bot, order, user, price)

            # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ЦЕНЕ ═══
            try:
                from bot.services.realtime_notifications import send_order_status_notification
                await send_order_status_notification(
                    telegram_id=order.user_id,
                    order_id=order.id,
                    new_status=OrderStatus.WAITING_PAYMENT.value,
                    extra_data={"final_price": final_price, "bonus_used": bonus_used},
                )
            except Exception as ws_err:
                logger.debug(f"WebSocket notification failed: {ws_err}")

            price_formatted = f"{price:,}".replace(",", " ")
            status = "клиент получил счёт!" if sent else "(уведомление не доставлено)"
            await message.reply(f"✅ Цена {price_formatted}₽ установлена, {status}")

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
                    text=f"✅ Подтвердить {robot_price:,}₽".replace(",", " "),
                    callback_data=f"topic_setprice:{conv.order_id}:{robot_price}"
                )
            ])

        # Preset цены (по 3 в ряд)
        row = []
        for price in preset_prices:
            row.append(InlineKeyboardButton(
                text=f"{price:,}₽".replace(",", " "),
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
    from bot.services.live_cards import send_or_update_card
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
    if user and user.balance > 0:
        max_bonus = price * 0.5
        bonus_used = min(user.balance, max_bonus)

    # Устанавливаем цену
    order.price = float(price)
    order.bonus_used = bonus_used
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # Обновляем карточки
    final_price = price - bonus_used
    if bonus_used > 0:
        extra_text = (
            f"💵 Тариф: {price:,}₽\n"
            f"💎 Бонусы: −{bonus_used:.0f}₽\n"
            f"👉 К оплате: {final_price:,.0f}₽"
        ).replace(",", " ")
    else:
        extra_text = f"💵 Цена: {price:,}₽".replace(",", " ")

    await send_or_update_card(
        bot=bot,
        order=order,
        session=session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=extra_text,
    )

    # Отправляем счёт клиенту
    sent = await send_payment_notification(bot, order, user, price)

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ЦЕНЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.WAITING_PAYMENT.value,
            extra_data={"final_price": final_price, "bonus_used": bonus_used},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    price_formatted = f"{price:,}".replace(",", " ")
    await callback.answer(f"✅ Цена {price_formatted}₽ установлена!", show_alert=True)

    # Удаляем меню выбора цены
    try:
        await callback.message.delete()
    except Exception:
        pass


@router.callback_query(F.data == "noop")
async def noop_callback(callback: CallbackQuery):
    """Пустой callback для информационных кнопок"""
    await callback.answer()
