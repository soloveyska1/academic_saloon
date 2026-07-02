from __future__ import annotations

import logging

from aiogram import Router, Bot, F
from aiogram.filters import CommandStart, CommandObject, Command
from aiogram.types import Message, CallbackQuery
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, OrderStatus, ConversationType
from bot.keyboards.inline import get_pinned_message_keyboard, get_persistent_menu
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.utils.formatting import format_price
from core.config import settings
from core.saloon_status import saloon_manager, generate_status_message
from core.media_cache import send_cached_photo
from bot.handlers.channel_cards import send_payment_notification
from bot.states.chat import ChatStates
from bot.handlers.order_chat import get_exit_chat_keyboard
from bot.services.achievements import sync_user_achievements
from bot.services.order_status_service import (
    OrderStatusDispatchOptions,
    OrderStatusTransitionError,
    apply_order_status_transition,
    finalize_order_status_change,
)

logger = logging.getLogger(__name__)


# FSM для ввода своей цены
class SetPriceState(StatesGroup):
    waiting_for_price = State()


# ══════════════════════════════════════════════════════════════
#  PREMIUM WELCOME MESSAGE — Intelligent Luxury Branding
# ══════════════════════════════════════════════════════════════

WELCOME_MESSAGE = """<b>Добро пожаловать в Академический Салон.</b>

🎁 <b>Дарим 300 приветственных бонусов</b> — 1 бонус = 1 ₽ скидки на первый заказ.

Здесь удобно всё в одном месте:
1. Оформить заказ и получить расчёт
2. Следить за этапами работы
3. Написать нам в любой момент

<i>Откройте приложение кнопкой ниже — там же условия сервиса и ваш бонус.</i>"""


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
        reply_markup=get_persistent_menu()
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
            reply_markup=get_persistent_menu()
        )
        return

    # Get active orders — same logic as Mini App (everything except final statuses)
    final_statuses = [
        OrderStatus.COMPLETED.value,
        OrderStatus.CANCELLED.value,
        OrderStatus.REJECTED.value,
    ]

    orders_query = (
        select(Order)
        .where(Order.user_id == telegram_id, Order.status.notin_(final_statuses))
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    if not orders:
        await message.answer(
            "Нет активных заказов.\n\n"
            "<i>Всё спокойно.</i>",
            reply_markup=get_persistent_menu()
        )
        return

    # Build compact cards
    from database.models.orders import ORDER_STATUS_META, WORK_TYPE_LABELS, WorkType
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

    await message.answer("\n".join(lines), reply_markup=get_persistent_menu())


# ══════════════════════════════════════════════════════════════
#  /support COMMAND — Direct support access
# ══════════════════════════════════════════════════════════════

@router.message(Command("support"))
async def cmd_support(message: Message):
    """Direct link to support chat — time-aware response."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    msk_now = datetime.now(ZoneInfo("Europe/Moscow"))
    hour = msk_now.hour

    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Написать менеджеру",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    if 9 <= hour < 23:
        text = (
            "<b>Поддержка</b>\n\n"
            "Менеджер на связи. Ответим в течение 15 минут."
        )
    else:
        text = (
            "<b>Поддержка</b>\n\n"
            "Сейчас нерабочее время. Оставьте сообщение — "
            "ответим утром после 9:00 МСК."
        )

    await message.answer(text, reply_markup=keyboard)


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


# ══════════════════════════════════════════════════════════════
#  DEEP-LINK'И С САЙТА (?start=web_... / club / plus / pluspro)
# ══════════════════════════════════════════════════════════════

WEB_TYPE_LABELS = {
    "dp": "Дипломная работа / ВКР", "ms": "Магистерская диссертация",
    "ch": "Глава диссертации", "kd": "Кандидатская под ключ",
    "cr": "Курсовая теоретическая", "ce": "Курсовая с практикой и расчётами",
    "pr": "Отчёт по практике", "vk": "Научная статья ВАК",
    "sc": "Научная статья Scopus / Web of Science", "rc": "Научная статья РИНЦ",
    "sf": "Реферат, эссе, контрольная",
}
WEB_SERVICE_LABELS = {
    "ai": "Чистка текста от следов ИИ",
    "rv": "Разбор готовой работы (ВКР, курсовой)",
    "tu": "Репетиторство и консультации",
    "nm": "Оформление по методичке · нормоконтроль",
}
WEB_DISC_LABELS = {"h": "гуманитарное / экономика", "l": "право · педагогика · психология",
                   "t": "технические / IT", "m": "медицина · финансы"}
WEB_TERM_LABELS = {"f": "от 30 дней", "m": "14–30 дней", "u": "срочно, до 14 дней"}
WEB_TIER_LABELS = {"b": "базовый", "t": "под ключ", "v": "VIP"}


def parse_web_deeplink(deep_link: str | None) -> dict | None:
    """Разбирает ?start=web_<type>_<disc>_<term>_<tier> или web_<service> с сайта."""
    if not deep_link or not deep_link.startswith("web_"):
        return None
    parts = deep_link[4:].split("_")
    first = parts[0] if parts else ""
    if first in WEB_SERVICE_LABELS:
        return {"kind": "service", "label": WEB_SERVICE_LABELS[first]}
    if first in WEB_TYPE_LABELS:
        info = {"kind": "work", "type": WEB_TYPE_LABELS[first]}
        if len(parts) > 1 and parts[1] in WEB_DISC_LABELS:
            info["disc"] = WEB_DISC_LABELS[parts[1]]
        if len(parts) > 2 and parts[2] in WEB_TERM_LABELS:
            info["term"] = WEB_TERM_LABELS[parts[2]]
        if len(parts) > 3 and parts[3] in WEB_TIER_LABELS:
            info["tier"] = WEB_TIER_LABELS[parts[3]]
        return info
    return {"kind": "unknown"}


async def handle_site_deeplink(message: Message, bot: Bot, deep_link: str, is_new_user: bool) -> bool:
    """Тёплое приветствие для пришедших с сайта. Возвращает True, если обработано."""
    bonus_line = "\n\n🎁 <i>Вам начислен приветственный бонус +300 ₽ — спишется на первый заказ.</i>" if is_new_user else ""

    if deep_link == "club":
        text = (
            "<b>Клуб Салона</b>\n\n"
            "Здесь копятся бонусы за каждый заказ, действует кэшбэк 5% и приглашения друзей.\n"
            "• 1 бонус = 1 ₽ скидки\n"
            "• Пригласили друга — вам 5% с его оплаченных заказов, ему +200 бонусов\n"
            "• Подписки «Салон+» дают скидку до 10% на все заказы\n\n"
            "Откройте приложение, чтобы увидеть баланс и вашу ссылку-приглашение." + bonus_line
        )
    elif deep_link in ("plus", "pluspro"):
        text = (
            "<b>Подписка «Салон+»</b>\n\n"
            "• <b>Салон+</b> — 499 ₽/мес: −5% на все заказы и приоритетная очередь\n"
            "• <b>Салон+ Про</b> — 999 ₽/мес: −10%, приоритет и экспресс-консультация\n\n"
            "Подписку оформляем вручную после оплаты — напишите, и всё активируем." + bonus_line
        )
    else:
        info = parse_web_deeplink(deep_link)
        if not info or info.get("kind") == "unknown":
            return False
        if info["kind"] == "service":
            text = (
                f"<b>{info['label']}</b>\n\n"
                "Вы выбрали эту услугу на сайте. Опишите, пожалуйста, задачу "
                "(что за работа, объём, срок) — оценим стоимость и предложим решение." + bonus_line
            )
        else:
            spec = [f"📋 <b>{info['type']}</b>"]
            if info.get("disc"): spec.append(f"Направление: {info['disc']}")
            if info.get("term"): spec.append(f"Срок: {info['term']}")
            if info.get("tier"): spec.append(f"Сопровождение: {info['tier']}")
            text = (
                "<b>Вижу вашу смету с сайта</b>\n\n"
                + "\n".join(spec)
                + "\n\nОткройте приложение и создайте заказ — расчёт уже под рукой, "
                "или просто напишите тему, и мы всё оформим." + bonus_line
            )

    try:
        await bot.send_chat_action(message.chat.id, ChatAction.TYPING)
    except Exception:
        pass
    await bot.send_message(chat_id=message.chat.id, text=text, reply_markup=get_persistent_menu())
    return True


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
    Основная логика:
    - Новый пользователь → приветствие и вход в Mini App
    - Существующий пользователь → главное меню
    """

    # Очищаем FSM состояние при /start
    await state.clear()

    telegram_id = message.from_user.id

    # Поиск пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    is_new_user = user is None

    # Обработка реферальной ссылки для нового пользователя
    if is_new_user:
        referrer_id = None
        referrer = None
        # Поддержка обоих форматов: ref123456789 (бот/QR) и ref_123456789 (mini-app)
        if deep_link and deep_link.startswith("ref"):
            raw_ref = deep_link[3:].lstrip("_")
            try:
                if not raw_ref.isdigit():
                    raise ValueError("referral id is not numeric")
                potential_referrer_id = int(raw_ref)
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

        # Создаём пользователя без implicit consent — акцепт переносится в Mini App
        user = User(
            telegram_id=telegram_id,
            username=message.from_user.username,
            fullname=message.from_user.full_name,
            role="user",
            referrer_id=referrer_id,
            deep_link=deep_link,
        )
        session.add(user)
        await session.commit()

        # Приветственный бонус новым пользователям.
        # Антиабуз: начисляется только при СОЗДАНИИ пользователя (telegram_id уникален
        # в Postgres), поэтому один раз на аккаунт; повторный /start бонус не даёт.
        try:
            from bot.services.bonus import BonusService, BonusReason, WELCOME_BONUS_AMOUNT
            await BonusService.add_bonus(
                session=session,
                user_id=telegram_id,
                amount=WELCOME_BONUS_AMOUNT,
                reason=BonusReason.WELCOME_BONUS,
                description=f"Приветственный бонус (+{WELCOME_BONUS_AMOUNT}₽)",
                bot=bot,
                auto_commit=True,
                send_ws_notification=False,
            )
        except Exception as exc:
            logger.warning(f"[Welcome] Failed to grant welcome bonus to {telegram_id}: {exc}")

        if referrer_id:
            try:
                await sync_user_achievements(
                    session=session,
                    telegram_id=referrer_id,
                    bot=bot,
                    notify=True,
                )
            except Exception as exc:
                logger.warning(f"[Achievements] Failed to sync referral achievements for {referrer_id}: {exc}")

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

    # ═══════════════════════════════════════════════════════════════
    #  DEEP LINK С САЙТА: /start web_... / club / plus / pluspro
    # ═══════════════════════════════════════════════════════════════
    if deep_link and (deep_link.startswith("web_") or deep_link in ("club", "plus", "pluspro")):
        try:
            if await handle_site_deeplink(message, bot, deep_link, is_new_user):
                return  # Показали тёплое приветствие с сайта — меню не дублируем
        except Exception as exc:
            logger.warning(f"[SiteDeepLink] Failed to handle '{deep_link}': {exc}")
            # Падать нельзя — проваливаемся в обычное меню ниже

    # === ГЛАВНОЕ МЕНЮ — App-First Portal ===

    # 1. Typing для визуального отклика
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)

    # 2. Разный текст для новых и возвращающихся пользователей
    if is_new_user:
        welcome_text = WELCOME_MESSAGE
    else:
        welcome_text = WELCOME_BACK_MESSAGE

    # 3. Отправляем анимацию (GIF) или фото + persistent keyboard
    from aiogram.types import FSInputFile
    sent = False

    if settings.WELCOME_ANIMATION.exists():
        try:
            animation = FSInputFile(settings.WELCOME_ANIMATION)
            await bot.send_animation(
                chat_id=message.chat.id,
                animation=animation,
                caption=welcome_text,
                reply_markup=get_persistent_menu(),
            )
            sent = True
        except Exception as e:
            logger.warning(f"Failed to send welcome animation: {e}")

    if not sent and settings.WELCOME_IMAGE.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=message.chat.id,
                photo_path=settings.WELCOME_IMAGE,
                caption=welcome_text,
                reply_markup=get_persistent_menu()
            )
            sent = True
        except Exception:
            pass

    if not sent:
        await bot.send_message(
            chat_id=message.chat.id,
            text=welcome_text,
            reply_markup=get_persistent_menu()
        )


# ══════════════════════════════════════════════════════════════
#                    ВВОД СВОЕЙ ЦЕНЫ (для канальных карточек)
# ══════════════════════════════════════════════════════════════

@router.message(SetPriceState.waiting_for_price)
async def process_custom_price(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода цены от админа — отправляет клиенту полноценный счёт с кнопками"""

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
        max_bonus = float(price) * 0.2  # потолок оплаты бонусами: 20% заказа (правила лояльности)
        bonus_used = min(client.balance, max_bonus)

    # Устанавливаем цену и бонусы
    order.price = float(price)
    order.bonus_used = bonus_used
    try:
        change = apply_order_status_transition(order, OrderStatus.WAITING_PAYMENT.value)
    except OrderStatusTransitionError as exc:
        await message.answer(f"❌ {exc}")
        await state.clear()
        return

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

    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=client.username if client else None,
            client_name=client.fullname if client else None,
            card_extra_text=card_extra_text,
            notification_extra_data={"final_price": float(final_price), "bonus_used": bonus_used},
        ),
    )

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, client, price)

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
