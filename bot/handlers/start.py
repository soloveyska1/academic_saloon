from aiogram import Router, Bot, F
from aiogram.filters import CommandStart, CommandObject, Command
from aiogram.types import Message, ReplyKeyboardRemove, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, OrderStatus, ConversationType
from bot.keyboards.inline import get_main_menu_keyboard, get_pinned_message_keyboard
from bot.keyboards.terms import get_terms_short_keyboard
from bot.texts.terms import TERMS_SHORT
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.utils.formatting import format_price
from core.config import settings
from core.saloon_status import saloon_manager, generate_status_message
from core.media_cache import send_cached_photo
from bot.handlers.channel_cards import send_payment_notification
from bot.states.chat import ChatStates
from bot.handlers.order_chat import get_exit_chat_keyboard


# FSM для ввода своей цены
class SetPriceState(StatesGroup):
    waiting_for_price = State()


# ══════════════════════════════════════════════════════════════
#  PREMIUM WELCOME MESSAGE — Intelligent Luxury Branding
# ══════════════════════════════════════════════════════════════

WELCOME_MESSAGE = """<b>Добро пожаловать в Academic Saloon.</b>

Премиальный сервис по академическим задачам готов к работе. Здесь удобно оформить заказ, следить за этапами и быстро связаться с поддержкой.

<i>Откройте приложение кнопкой ниже.</i>"""


# Message for returning users (shorter)
WELCOME_BACK_MESSAGE = """<b>Academic Saloon</b>

С возвращением. Всё важное уже под рукой.

<i>Откройте приложение кнопкой ниже.</i>"""

router = Router()


# ══════════════════════════════════════════════════════════════
#  /help COMMAND — Intelligent Luxury
# ══════════════════════════════════════════════════════════════

HELP_MESSAGE = """<b>Academic Saloon</b>

Сервис сопровождения академических задач.

<b>Как это работает:</b>
1. Откройте приложение
2. Создайте новый заказ
3. Получите расчёт стоимости
4. Оплатите и отслеживайте статус

<b>Гарантии:</b>
• Конфиденциальность
• Точность и качество
• Соблюдение сроков
• Поддержка по заказу

<i>Откройте приложение кнопкой ниже.</i>"""


@router.message(Command("help"))
async def cmd_help(message: Message):
    """Обработчик команды /help"""
    await message.answer(
        HELP_MESSAGE,
        reply_markup=get_main_menu_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#  /status COMMAND — Quick order status check
# ══════════════════════════════════════════════════════════════

@router.message(Command("status"))
async def cmd_status(message: Message, session: AsyncSession):
    """Quick check of active orders — no Mini App needed."""
    telegram_id = message.from_user.id

    # Get user
    user_query = select(User).where(User.telegram_id == telegram_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(
            "У вас пока нет заказов.\n\n"
            "<i>Откройте приложение, чтобы создать первый.</i>",
            reply_markup=get_main_menu_keyboard()
        )
        return

    # Get active orders
    from database.models.orders import ORDER_STATUS_META
    active_statuses = [
        s.value for s, meta in ORDER_STATUS_META.items()
        if meta.get("is_active") and not meta.get("is_final")
    ]

    orders_query = (
        select(Order)
        .where(Order.user_id == user.id, Order.status.in_(active_statuses))
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    if not orders:
        await message.answer(
            "Нет активных заказов.\n\n"
            "<i>Всё спокойно.</i>",
            reply_markup=get_main_menu_keyboard()
        )
        return

    # Build compact cards
    from database.models.orders import WORK_TYPE_LABELS, WorkType
    lines = [f"<b>Активные заказы</b> ({len(orders)})\n"]

    for order in orders:
        meta = ORDER_STATUS_META.get(OrderStatus(order.status), {})
        emoji = meta.get("emoji", "📋")
        label = meta.get("short_label", order.status)

        try:
            work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
        except (ValueError, KeyError):
            work_label = order.work_type or "Заказ"

        price_str = f" · {format_price(order.price)}" if order.price and order.price > 0 else ""
        deadline_str = f" · {order.deadline}" if order.deadline else ""

        lines.append(f"{emoji} <b>#{order.id}</b> {work_label}{price_str}{deadline_str}")
        lines.append(f"   <i>{label}</i>")

    lines.append("\n<i>Подробнее — в приложении.</i>")

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Открыть приложение",
            web_app=WebAppInfo(url=settings.WEBAPP_URL)
        )]
    ])

    await message.answer("\n".join(lines), reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#  /support COMMAND — Direct support access
# ══════════════════════════════════════════════════════════════

@router.message(Command("support"))
async def cmd_support(message: Message):
    """Direct link to support chat."""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Написать менеджеру",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="Открыть приложение",
            web_app=WebAppInfo(url=settings.WEBAPP_URL)
        )],
    ])

    await message.answer(
        "<b>Поддержка</b>\n\n"
        "Менеджер ответит в течение 15 минут.\n"
        "Время работы: ежедневно, 9:00–23:00 МСК.",
        reply_markup=keyboard
    )


async def send_and_pin_status(chat_id: int, bot: Bot, pin: bool = False):
    """
    Отправляет статус сервиса с интерактивными кнопками.
    Закрепляет только если pin=True (для новых пользователей).
    """
    status = await saloon_manager.get_status()
    status_text = generate_status_message(status)

    # Отправляем сообщение со статусом и кнопками
    status_msg = await bot.send_message(
        chat_id=chat_id,
        text=status_text,
        reply_markup=get_pinned_message_keyboard()
    )

    # Закрепляем только если явно указано
    if pin:
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                disable_notification=True
            )
        except Exception:
            pass


@router.message(CommandStart(deep_link=True))
async def cmd_start_with_link(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Хендлер /start с параметром (deep_link).
    Форматы: /start ref123456789, /start setprice_123, /start admin
    """
    await process_start(message, session, bot, state, deep_link=command.args)


@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext, command: CommandObject):
    """
    Хендлер /start без параметров или с параметрами (fallback).
    """
    # Проверяем есть ли аргументы (deep_link мог не сработать)
    deep_link = command.args if command and command.args else None
    await process_start(message, session, bot, state, deep_link=deep_link)


async def process_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext, deep_link: str | None):
    """
    Основная логика (БЕЗ БАРЬЕРА ОФЕРТЫ):
    - Новый пользователь → сразу главное меню (implicit consent)
    - Существующий пользователь → главное меню
    """
    from datetime import datetime

    # Очищаем FSM состояние при /start
    await state.clear()

    telegram_id = message.from_user.id

    # Очистка старых Reply-кнопок
    try:
        cleanup_msg = await message.answer("⏳", reply_markup=ReplyKeyboardRemove())
        await cleanup_msg.delete()
    except Exception:
        pass  # Может не удалиться если нет прав или бот ограничен

    # Поиск пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    is_new_user = user is None

    # Обработка реферальной ссылки для нового пользователя
    if is_new_user:
        referrer_id = None
        referrer = None
        if deep_link and deep_link.startswith("ref"):
            try:
                potential_referrer_id = int(deep_link[3:])
                if potential_referrer_id != telegram_id:
                    # Проверяем существование реферера
                    ref_query = select(User).where(User.telegram_id == potential_referrer_id)
                    ref_result = await session.execute(ref_query)
                    referrer = ref_result.scalar_one_or_none()
                    if referrer:
                        referrer_id = potential_referrer_id
                        # Увеличиваем счётчик рефералов
                        referrer.referrals_count += 1
            except ValueError:
                pass

        # Создаём пользователя С IMPLICIT CONSENT (оферта принята по факту использования)
        user = User(
            telegram_id=telegram_id,
            username=message.from_user.username,
            fullname=message.from_user.full_name,
            role="user",
            referrer_id=referrer_id,
            deep_link=deep_link,
            terms_accepted_at=datetime.utcnow(),  # Implicit consent
        )
        session.add(user)
        await session.commit()

        # Логируем нового пользователя
        event = LogEvent.USER_START_REF if deep_link else LogEvent.USER_START
        extra = {"Реф-ссылка": deep_link} if deep_link else None
        await log_action(
            bot=bot,
            event=event,
            user=message.from_user,
            details="Новый пользователь → главное меню",
            extra_data=extra,
            session=session,
            level=LogLevel.ACTION,
        )
    else:
        # Обновляем данные существующего пользователя
        user.username = message.from_user.username
        user.fullname = message.from_user.full_name
        # Если оферта не была принята — принимаем implicit
        if not user.terms_accepted_at:
            user.terms_accepted_at = datetime.utcnow()
        await session.commit()

        # Логируем возврат
        await log_action(
            bot=bot,
            event=LogEvent.USER_RETURN,
            user=message.from_user,
            details="Вернулся в главное меню",
            session=session,
        )

    # === ОБРАБОТКА DEEP LINKS ДЛЯ АДМИНОВ ===

    # Установка своей цены (из карточки в канале)
    if deep_link and deep_link.startswith("setprice_"):
        if message.from_user.id in settings.ADMIN_IDS:
            try:
                order_id = int(deep_link.replace("setprice_", ""))
                order = await session.get(Order, order_id)
                if order:
                    # Сохраняем order_id в FSM и спрашиваем цену
                    await state.set_state(SetPriceState.waiting_for_price)
                    await state.update_data(order_id=order_id)

                    current_price = format_price(order.price) if order.price > 0 else "не установлена"
                    await message.answer(
                        f"💵 <b>Установка цены для заказа #{order_id}</b>\n\n"
                        f"Текущая цена: {current_price}\n\n"
                        f"Введи новую цену (только число, например: <code>5000</code>):",
                    )
                    return  # Не показываем главное меню
                else:
                    await message.answer(f"❌ Заказ #{order_id} не найден")
            except ValueError:
                await message.answer("❌ Неверный формат ссылки")
        else:
            await message.answer("❌ Эта функция только для администраторов")
            # Продолжаем показывать главное меню

    # ═══════════════════════════════════════════════════════════════
    #  ORDER CHAT DEEP LINK: /start order_chat_{order_id}
    # ═══════════════════════════════════════════════════════════════

    if deep_link and deep_link.startswith("order_chat_"):
        try:
            order_id = int(deep_link.replace("order_chat_", ""))

            # Check if the order exists and belongs to this user
            order = await session.get(Order, order_id)
            if not order:
                await message.answer("❌ Заказ не найден")
                return

            if order.user_id != message.from_user.id:
                await message.answer("❌ Это не ваш заказ")
                return

            # Set FSM state to chat mode
            await state.set_state(ChatStates.in_chat)
            await state.update_data(
                order_id=order_id,
                conv_type=ConversationType.ORDER_CHAT.value,
            )

            # Get order info for the message
            work_label = order.work_type_label if hasattr(order, 'work_type_label') else order.work_type

            await message.answer(
                f"💬 <b>Чат по заказу #{order_id}</b>\n\n"
                f"📋 {work_label}\n"
                f"📚 {order.subject or 'Не указано'}\n\n"
                "Вы подключены к менеджеру.\n"
                "Пишите сообщения, отправляйте файлы или голосовые.\n\n"
                "Чтобы выйти — нажмите кнопку внизу 👇",
                reply_markup=get_exit_chat_keyboard(),
            )

            return  # Don't show main menu

        except ValueError:
            await message.answer("❌ Неверный формат ссылки")
            # Continue to main menu

    # ═══════════════════════════════════════════════════════════════
    #  SUPPORT DEEP LINK: /start support
    # ═══════════════════════════════════════════════════════════════

    if deep_link == "support":
        # Enter support chat mode
        await state.set_state(ChatStates.in_chat)
        await state.update_data(
            order_id=None,
            conv_type=ConversationType.SUPPORT.value,
        )

        await message.answer(
            "💬 <b>Центр помощи Academic Saloon</b>\n\n"
            "Вы подключены к чату поддержки.\n"
            "Напишите вопрос по оплате, срокам, правкам или файлам — мы ответим в ближайшее время.\n\n"
            "Чтобы выйти — нажмите кнопку внизу 👇",
            reply_markup=get_exit_chat_keyboard(),
        )

        return  # Don't show main menu

    # === ГЛАВНОЕ МЕНЮ — App-First Portal ===

    # 1. Typing для визуального отклика
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)

    # 2. Разный текст для новых и возвращающихся пользователей
    if is_new_user:
        welcome_text = WELCOME_MESSAGE
    else:
        welcome_text = WELCOME_BACK_MESSAGE

    # 3. Отправляем картинку с текстом и кнопками
    if settings.WELCOME_IMAGE.exists():
        await send_cached_photo(
            bot=bot,
            chat_id=message.chat.id,
            photo_path=settings.WELCOME_IMAGE,
            caption=welcome_text,
            reply_markup=get_main_menu_keyboard()
        )
    else:
        await bot.send_message(
            chat_id=message.chat.id,
            text=welcome_text,
            reply_markup=get_main_menu_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    ВВОД СВОЕЙ ЦЕНЫ (для канальных карточек)
# ══════════════════════════════════════════════════════════════

@router.message(SetPriceState.waiting_for_price)
async def process_custom_price(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода цены от админа — отправляет клиенту полноценный счёт с кнопками"""
    from bot.services.live_cards import update_card_status

    data = await state.get_data()
    order_id = data.get("order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден в состоянии")
        await state.clear()
        return

    # Парсим цену
    try:
        price_text = message.text.strip().replace(" ", "").replace("₽", "").replace(",", "")
        price = int(price_text)
        if price <= 0:
            raise ValueError("Цена должна быть положительной")
    except (ValueError, AttributeError):
        await message.answer(
            "❌ Неверный формат цены.\n\n"
            "Введи только число, например: <code>5000</code>"
        )
        return

    # Получаем заказ и пользователя
    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Получаем данные клиента для карточки и расчёта бонусов
    client_query = select(User).where(User.telegram_id == order.user_id)
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()

    # Рассчитываем бонусы (как в admin.py)
    bonus_used = 0
    if client and client.balance > 0:
        max_bonus = price * 0.5
        bonus_used = min(client.balance, max_bonus)

    # Устанавливаем цену и бонусы
    order.price = float(price)
    order.bonus_used = bonus_used
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # Обновляем карточку в канале
    # Use order.final_price property which includes discount (loyalty + promo)
    final_price = order.final_price

    # Формируем текст с информацией о бонусах
    if bonus_used > 0:
        card_extra_text = (
            f"💵 Тариф: {format_price(price)}\n"
            f"💎 Бонусы: −{bonus_used:.0f}₽ (баланс клиента)\n"
            f"👉 К оплате: {format_price(final_price)}"
        )
    else:
        card_extra_text = f"💵 Цена: {format_price(price)} (бонусов нет)"

    try:
        await update_card_status(
            bot, order, session,
            client_username=client.username if client else None,
            client_name=client.fullname if client else None,
            extra_text=card_extra_text
        )
    except Exception as e:
        await message.answer(f"⚠️ Карточка не обновлена: {e}")

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, client, price)

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

    # Очищаем FSM
    await state.clear()

    price_formatted = format_price(price, False)
    final_formatted = format_price(final_price, False)

    if sent:
        await message.answer(
            f"✅ <b>Цена установлена!</b>\n\n"
            f"Заказ #{order_id}: <b>{price_formatted}₽</b>\n"
            f"Бонусов применено: {bonus_used:.0f}₽\n"
            f"К оплате: {final_formatted}₽\n\n"
            f"Клиенту отправлен счёт с кнопками оплаты."
        )
    else:
        await message.answer(
            f"✅ <b>Цена установлена!</b>\n\n"
            f"Заказ #{order_id}: <b>{price_formatted}₽</b>\n"
            f"⚠️ Не удалось уведомить клиента"
        )


# ══════════════════════════════════════════════════════════════
#                    ОБНОВЛЕНИЕ СТАТУСА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "refresh_saloon_status")
async def refresh_saloon_status(callback: CallbackQuery):
    """
    Legacy handler for refresh button (now removed from UI).
    Kept for backwards compatibility if any old pinned messages exist.
    """
    status_text = generate_status_message()

    try:
        await callback.message.edit_text(
            text=status_text,
            reply_markup=get_pinned_message_keyboard()
        )
        await callback.answer("✅ Статус обновлён!")
    except Exception:
        await callback.answer("Статус актуален 👍")
