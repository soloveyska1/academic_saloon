"""
Личный кабинет пользователя.
Премиальный дизайн с фото и визуальным прогресс-баром.
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, Message
from aiogram.fsm.context import FSMContext
from aiogram.enums import ChatAction, ParseMode, DiceEmoji
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case

# Пути к изображениям
PROFILE_IMAGE_PATH = Path(__file__).parent.parent / "media" / "lk.jpg"
ORDERS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "my_order.jpg"
ORDER_DETAIL_IMAGE_PATH = Path(__file__).parent.parent / "media" / "delo.jpg"
WALLET_IMAGE_PATH = Path(__file__).parent.parent / "media" / "wallet.jpg"
REFERRAL_IMAGE_PATH = Path(__file__).parent.parent / "media" / "ref.jpg"

from database.models.users import User
from database.models.orders import (
    Order, OrderStatus,
    get_status_meta, get_active_statuses, get_history_statuses,
)
from bot.services.bonus import BonusService, BonusReason
from bot.keyboards.profile import (
    get_profile_dashboard_keyboard,
    get_gamified_profile_keyboard,
    get_muse_profile_keyboard,
    get_orders_list_keyboard,
    get_order_detail_keyboard,
    get_cancel_order_confirm_keyboard,
    get_empty_orders_keyboard,
    get_balance_keyboard,
    get_referral_keyboard,
    get_back_to_profile_keyboard,
    get_gang_keyboard,
    get_daily_luck_result_keyboard,
    get_muse_luck_result_keyboard,
    get_history_keyboard,
    get_coupon_keyboard,
    get_coupon_result_keyboard,
)
from bot.services.logger import log_action, LogEvent
# Progress functions moved inline for cleaner minimal design
from bot.states.order import OrderState, CouponState
from core.config import settings
from core.media_cache import send_cached_photo
from core.redis_pool import get_redis
from bot.utils.message_helpers import safe_edit_or_send


# Константы для кэша купонов в Redis
COUPON_USAGE_PREFIX = "coupon_used:"
COUPON_USAGE_TTL = 60 * 60 * 24 * 365  # 1 год


async def is_coupon_used(user_id: int, coupon_code: str) -> bool:
    """Проверяет, использовал ли пользователь данный купон"""
    try:
        redis = await get_redis()
        key = f"{COUPON_USAGE_PREFIX}{user_id}:{coupon_code}"
        return await redis.exists(key) > 0
    except Exception:
        return False


async def mark_coupon_used(user_id: int, coupon_code: str) -> None:
    """Отмечает купон как использованный"""
    try:
        redis = await get_redis()
        key = f"{COUPON_USAGE_PREFIX}{user_id}:{coupon_code}"
        await redis.set(key, "1", ex=COUPON_USAGE_TTL)
    except Exception:
        pass

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")
ORDERS_PER_PAGE = 6  # Уменьшено для лучшего UX


# ══════════════════════════════════════════════════════════════
#                    VIP MUSE MODE (Easter Egg)
# ══════════════════════════════════════════════════════════════

# Специальный username для Muse режима
MUSE_USERNAME = "neuronatali"

# Admin Chameleon Mode - хранит состояние режима для админов
# Key: telegram_id, Value: True = Muse mode, False = Standard mode
_admin_muse_mode: dict[int, bool] = {}


def is_actual_muse(user) -> bool:
    """Проверяет, является ли пользователь НАСТОЯЩЕЙ Музой (NeuroNatali)."""
    if user is None:
        return False
    username = getattr(user, 'username', None)
    return username and username.lower() == MUSE_USERNAME.lower()


def is_admin(user) -> bool:
    """Проверяет, является ли пользователь Админом."""
    if user is None:
        return False
    telegram_id = getattr(user, 'id', None) or getattr(user, 'telegram_id', None)
    return telegram_id and telegram_id in settings.ADMIN_IDS


def is_vip_muse(user) -> bool:
    """
    Проверяет, должен ли пользователь видеть VIP Muse интерфейс.

    - NeuroNatali: ВСЕГДА видит Muse версию
    - Admin: видит Muse версию ТОЛЬКО если включен debug_muse_mode
    - Остальные: никогда не видят
    """
    if user is None:
        return False

    # NeuroNatali всегда видит Muse версию
    if is_actual_muse(user):
        return True

    # Admin видит только если включен muse mode
    telegram_id = getattr(user, 'id', None) or getattr(user, 'telegram_id', None)
    if telegram_id and telegram_id in settings.ADMIN_IDS:
        return _admin_muse_mode.get(telegram_id, False)

    return False


def toggle_admin_muse_mode(admin_id: int) -> bool:
    """Переключает режим Muse для админа. Возвращает новое состояние."""
    current = _admin_muse_mode.get(admin_id, False)
    _admin_muse_mode[admin_id] = not current
    return not current


@router.message(Command("toggle_muse"))
async def cmd_toggle_muse(message: Message, session: AsyncSession, bot: Bot):
    """
    Команда /toggle_muse - переключает режим Muse для админа.
    Доступна только админам. Позволяет просматривать бота глазами NeuroNatali.
    """
    telegram_id = message.from_user.id

    # Проверяем, является ли пользователь админом
    if telegram_id not in settings.ADMIN_IDS:
        # Для обычных пользователей - игнорируем или отвечаем загадочно
        await message.answer("🤔 Команда не найдена")
        return

    # Переключаем режим
    new_state = toggle_admin_muse_mode(telegram_id)

    if new_state:
        # Режим Muse включён
        response = (
            "🌹 <b>Режим Muse АКТИВИРОВАН</b>\n\n"
            "Теперь ты видишь бота глазами NeuroNatali.\n"
            "Личный кабинет покажет VIP-интерфейс.\n\n"
            "<i>/toggle_muse — выключить режим</i>"
        )
    else:
        # Режим Muse выключён
        response = (
            "🤠 <b>Режим Muse ВЫКЛЮЧЕН</b>\n\n"
            "Вернулся стандартный вид.\n\n"
            "<i>/toggle_muse — включить режим</i>"
        )

    await message.answer(response, parse_mode=ParseMode.HTML)


# ══════════════════════════════════════════════════════════════
#                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def format_date(dt: datetime) -> str:
    """Форматирование даты: сегодня/вчера или дата"""
    if dt is None:
        return ""

    now = datetime.now(MSK_TZ)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=MSK_TZ)

    today = now.date()
    dt_date = dt.date()
    yesterday = today - timedelta(days=1)

    if dt_date == today:
        return f"сегодня {dt.strftime('%H:%M')}"
    elif dt_date == yesterday:
        return f"вчера {dt.strftime('%H:%M')}"
    return dt.strftime("%d.%m.%Y")


def format_price(order: Order) -> str:
    """Краткое форматирование цены"""
    if order.price <= 0:
        return "Цена: ожидает"

    parts = [f"{order.price:.0f}₽"]

    if order.discount > 0:
        parts.append(f"−{order.discount:.0f}%")

    if order.bonus_used > 0:
        parts.append(f"−{order.bonus_used:.0f}₽ бонусами")

    if order.discount > 0 or order.bonus_used > 0:
        parts.append(f"→ {order.final_price:.0f}₽")

    if order.paid_amount > 0:
        parts.append(f"(оплачено {order.paid_amount:.0f}₽)")

    return " ".join(parts)


async def get_order_counts(session: AsyncSession, user_id: int) -> dict:
    """Счётчики заказов одним запросом"""
    active_statuses = get_active_statuses()
    history_statuses = get_history_statuses()

    query = select(
        func.count(Order.id).label("total"),
        func.sum(case((Order.status.in_(active_statuses), 1), else_=0)).label("active"),
        func.sum(case((Order.status.in_(history_statuses), 1), else_=0)).label("history"),
    ).where(Order.user_id == user_id)

    result = await session.execute(query)
    row = result.one()

    return {
        "all": row.total or 0,
        "active": int(row.active or 0),
        "history": int(row.history or 0),
    }


# ══════════════════════════════════════════════════════════════
#                    ДАШБОРД
# ══════════════════════════════════════════════════════════════

def format_number(n: float) -> str:
    """Форматирование числа с разделителями тысяч"""
    return f"{n:,.0f}".replace(",", " ")


def build_profile_caption(user: User | None, first_name: str, counts: dict) -> str:
    """Legacy: Формирует caption для Личного кабинета"""
    if not user:
        return f"🤠 <b>Приветствую, {first_name}!</b>\n\nДобро пожаловать в салун!"

    status, discount = user.loyalty_status
    progress = user.loyalty_progress

    lines = [f"🤠 <b>Приветствую, {first_name}!</b>", ""]

    # Статус и скидка
    if discount > 0:
        lines.append(f"Твой статус: <b>{status}</b> (скидка <b>{discount}%</b>)")
    else:
        lines.append(f"Твой статус: <b>{status}</b>")

    # Прогресс-бар до следующего уровня
    lines.append("")
    if progress["has_next"]:
        bar = progress["progress_bar"]
        progress_text = progress["progress_text"]
        next_name = progress["next_name"]
        lines.append(f"До «{next_name}»: [{bar}] {progress_text}")
    else:
        lines.append(f"[{progress['progress_bar']}] {progress['progress_text']}")

    lines.append("")

    # Финансы
    lines.append(f"💳 В казне: <b>{format_number(user.balance)}₽</b>")

    saved = user.total_saved
    if saved > 100:
        lines.append(f"💰 Добыча: <b>~{format_number(saved)}₽</b>")

    # Активные заказы
    if counts["active"] > 0:
        lines.append("")
        lines.append(f"📦 В работе: <b>{counts['active']}</b> заказов")

    return "\n".join(lines)


def build_gamified_profile_caption(user: User | None, telegram_id: int) -> str:
    """
    Формирует Gamified caption для Личного кабинета - ПАСПОРТ КОВБОЯ

    Layout:
    - Header: Passport with user ID
    - Section 1: Progression (Rank + Turnover Progress Bar)
    - Section 2: Treasury (Balance)
    - Section 3: Call to Action
    """
    if not user:
        return (
            f"🤠 <b>ПАСПОРТ КОВБОЯ</b> | ID: {telegram_id}\n"
            f"<i>Твой авторитет в Салуне.</i>\n\n"
            f"Добро пожаловать, незнакомец!"
        )

    # Get rank info
    rank = user.rank_info
    progress = user.rank_progress

    # Map old rank name "Салага" to new "Путник"
    rank_name = rank['name']
    if rank_name == "Салага":
        rank_name = "Путник"

    lines = []

    # ═══════════════ HEADER ═══════════════
    lines.append(f"🤠 <b>ПАСПОРТ КОВБОЯ</b> | ID: {telegram_id}")
    lines.append("<i>Твой авторитет в Салуне.</i>")
    lines.append("")

    # ═══════════════ SECTION 1: PROGRESSION ═══════════════
    lines.append(f"🏆 <b>Ранг:</b> {rank_name}")
    lines.append(f"💼 <b>Оборот:</b> {format_number(user.total_spent)} / {format_number(progress.get('next_threshold', user.total_spent))} ₽")
    lines.append(f"[{progress['progress_bar']}] {progress['progress_text']}")

    # Progress hint
    if progress["has_next"]:
        lines.append(f"До следующего уровня: заказать на {format_number(progress['spent_needed'])} ₽")
    else:
        lines.append("<i>Ты достиг вершины, легенда!</i>")

    lines.append("")

    # ═══════════════ SECTION 2: TREASURY ═══════════════
    lines.append(f"💰 <b>Казна:</b> {format_number(user.balance)} 🟡 <i>(1🟡 = 1₽)</i>")
    lines.append("")

    # ═══════════════ SECTION 3: CALL TO ACTION ═══════════════
    lines.append("<b>Нужно больше золота?</b>")
    lines.append("Крути барабан раз в сутки или грабь дилижансы с друзьями.")

    return "\n".join(lines)


def build_muse_profile_caption(user: User | None, telegram_id: int, user_name: str = "Гость") -> str:
    """
    Формирует специальный caption для VIP Muse - минималистичный эстетичный дизайн.

    Layout (clean, no separator lines):
    `✧ M U S E — S U I T E ✧`

    👤 Гость: {name}
    💎 Статус: `Queen of Inspiration`
    💳 Баланс: `∞ (Бесценно)`

    В этом пространстве правила устанавливаешь ты.

    👇 Твоя персональная рулетка готова.
    """
    if not user:
        return (
            "<code>✧ M U S E — S U I T E ✧</code>\n\n"
            f"👤 <b>Гость:</b> {user_name}\n"
            "💎 <b>Статус:</b> <code>Queen of Inspiration</code>\n\n"
            "<i>Добро пожаловать в личное пространство.</i>"
        )

    balance_display = f"{format_number(user.balance)}" if user.balance > 0 else "∞"

    lines = [
        "<code>✧ M U S E — S U I T E ✧</code>",
        "",
        f"👤 <b>Гость:</b> {user_name}",
        "💎 <b>Статус:</b> <code>Queen of Inspiration</code>",
        "",
        f"💳 <b>Баланс:</b> <code>{balance_display}</code> 🌕",
        "",
        "<i>В этом пространстве правила устанавливаешь ты.</i>",
        "<i>Удача всегда на твоей стороне.</i>",
        "",
        "👇 <i>Твоя персональная рулетка готова.</i>",
    ]

    return "\n".join(lines)


@router.callback_query(F.data.in_(["my_profile", "my_orders", "profile"]))
async def show_profile(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Главный экран личного кабинета — Gamified Retention Hub"""
    await callback.answer()

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="Личный кабинет", session=session)
    except Exception:
        pass

    telegram_id = callback.from_user.id
    tg_user = callback.from_user
    user_name = tg_user.first_name or "Гость"

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    counts = await get_order_counts(session, telegram_id)

    # Check VIP status FIRST (Admin or Muse = unlimited spins)
    is_vip = is_admin(tg_user) or is_actual_muse(tg_user)

    # Check if should show Muse UI (Admin in muse mode or actual Muse)
    show_muse_ui = is_vip_muse(tg_user)

    # Caption based on UI mode
    if show_muse_ui:
        caption = build_muse_profile_caption(user, telegram_id, user_name)
        keyboard = get_muse_profile_keyboard(active_orders=counts["active"])
    else:
        caption = build_gamified_profile_caption(user, telegram_id)

        # Daily luck cooldown check (VIP always available)
        if is_vip:
            daily_luck_available = True
            cooldown_text = None
        else:
            daily_luck_available = True
            cooldown_text = None
            if user:
                cooldown = user.daily_bonus_cooldown
                daily_luck_available = cooldown["available"]
                cooldown_text = cooldown.get("remaining_text")

        keyboard = get_gamified_profile_keyboard(
            active_orders=counts["active"],
            daily_luck_available=daily_luck_available,
            cooldown_text=cooldown_text,
        )

    # Удаляем старое сообщение и отправляем фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Пробуем отправить с фото (с кэшированием file_id), иначе — текстом
    if PROFILE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=PROFILE_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото ЛК: {e}")

    # Fallback на текстовое сообщение
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


# ══════════════════════════════════════════════════════════════
#                    СПИСОК ЗАКАЗОВ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "profile_orders")
async def show_orders(callback: CallbackQuery, session: AsyncSession):
    await callback.answer()
    await show_orders_list(callback, session, "all", 0)


@router.callback_query(F.data.startswith("orders_filter:"))
async def filter_orders(callback: CallbackQuery, session: AsyncSession):
    await callback.answer()
    parts = callback.data.split(":")
    filter_type = parts[1] if len(parts) > 1 else "all"
    page = int(parts[2]) if len(parts) > 2 else 0
    await show_orders_list(callback, session, filter_type, page)


@router.callback_query(F.data.startswith("orders_page:"))
async def paginate_orders(callback: CallbackQuery, session: AsyncSession):
    await callback.answer()
    parts = callback.data.split(":")
    filter_type = parts[1] if len(parts) > 1 else "all"
    page = int(parts[2]) if len(parts) > 2 else 0
    await show_orders_list(callback, session, filter_type, page)


def build_orders_caption(counts: dict, filter_type: str) -> str:
    """Формирует caption для списка заказов — dashboard summary"""
    lines = ["🗄 <b>Твои текущие дела</b>", ""]

    total = counts["all"]
    active = counts["active"]
    done = counts["history"]

    lines.append(f"Всего: <b>{total}</b> | В работе: <b>{active}</b> | Готово: <b>{done}</b>")
    lines.append("")
    lines.append("<i>Нажми на заказ для деталей</i>")

    return "\n".join(lines)


async def show_orders_list(callback: CallbackQuery, session: AsyncSession,
                           filter_type: str, page: int):
    """Список заказов с фото (с кэшированием file_id)"""
    telegram_id = callback.from_user.id
    counts = await get_order_counts(session, telegram_id)

    # Пустой список
    if counts["all"] == 0:
        caption = "🗄 <b>Твои текущие дела</b>\n\nПока пусто — самое время сделать первый заказ!"
        keyboard = get_empty_orders_keyboard()

        try:
            await callback.message.delete()
        except Exception:
            pass

        if ORDERS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=callback.bot,
                    chat_id=callback.message.chat.id,
                    photo_path=ORDERS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=keyboard,
                    parse_mode=ParseMode.HTML,
                )
                return
            except Exception:
                pass

        await callback.message.answer(caption, reply_markup=keyboard, parse_mode=ParseMode.HTML)
        return

    active_statuses = get_active_statuses()
    history_statuses = get_history_statuses()

    if filter_type == "active":
        total_count = counts["active"]
        status_filter = Order.status.in_(active_statuses)
    elif filter_type == "history":
        total_count = counts["history"]
        status_filter = Order.status.in_(history_statuses)
    else:
        total_count = counts["all"]
        status_filter = None

    total_pages = max(1, (total_count + ORDERS_PER_PAGE - 1) // ORDERS_PER_PAGE)
    page = min(page, total_pages - 1)

    orders_query = select(Order).where(Order.user_id == telegram_id)
    if status_filter is not None:
        orders_query = orders_query.where(status_filter)
    orders_query = orders_query.order_by(desc(Order.created_at)).offset(page * ORDERS_PER_PAGE).limit(ORDERS_PER_PAGE)

    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    caption = build_orders_caption(counts, filter_type)
    keyboard = get_orders_list_keyboard(orders, page, total_pages, filter_type, counts)

    # Удаляем старое и отправляем фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if ORDERS_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=callback.bot,
                chat_id=callback.message.chat.id,
                photo_path=ORDERS_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото заказов: {e}")

    # Fallback на текст
    await callback.message.answer(caption, reply_markup=keyboard, parse_mode=ParseMode.HTML)


# ══════════════════════════════════════════════════════════════
#                    ДЕТАЛИ ЗАКАЗА
# ══════════════════════════════════════════════════════════════

def get_status_display(status: str) -> tuple[str, str]:
    """Возвращает emoji и текст статуса для отображения"""
    status_map = {
        "pending": ("⏳", "Ожидает оценки"),
        "confirmed": ("💳", "К оплате"),
        "in_progress": ("🔨", "В работе"),
        "paid": ("✅", "Оплачено (в очереди)"),
        "waiting_payment": ("💳", "К оплате"),
        "waiting_for_payment": ("💳", "К оплате"),
        "completed": ("🏁", "Готово"),
        "done": ("🏁", "Готово"),
        "cancelled": ("❌", "Отменён"),
        "rejected": ("❌", "Отклонён"),
    }
    return status_map.get(status, ("📋", status))


def build_order_detail_caption(order: Order) -> str:
    """Формирует caption для деталей заказа — Premium UX"""

    lines = [f"<b>Заказ №{order.id}</b>", ""]

    # ═══ СТАТУС ═══
    status_config = {
        OrderStatus.DRAFT.value: ("📝", "Черновик", None),
        OrderStatus.PENDING.value: ("⏳", "На оценке", "Ожидайте расчёт стоимости"),
        OrderStatus.WAITING_ESTIMATION.value: ("⏳", "На оценке", "Ожидайте расчёт стоимости"),
        OrderStatus.WAITING_PAYMENT.value: ("💳", "К оплате", None),
        OrderStatus.VERIFICATION_PENDING.value: ("🔍", "Проверка оплаты", "Подтверждаем платёж"),
        OrderStatus.CONFIRMED.value: ("💳", "К оплате", None),
        OrderStatus.PAID.value: ("⚙️", "В работе", None),
        OrderStatus.PAID_FULL.value: ("⚙️", "В работе", None),
        OrderStatus.IN_PROGRESS.value: ("⚙️", "В работе", None),
        OrderStatus.REVIEW.value: ("📋", "На проверке", "Проверьте результат"),
        OrderStatus.COMPLETED.value: ("✅", "Завершён", None),
        OrderStatus.CANCELLED.value: ("✗", "Отменён", None),
        OrderStatus.REJECTED.value: ("✗", "Отклонён", None),
    }

    emoji, status_text, hint = status_config.get(order.status, ("", order.status, None))

    # Прогресс для активных заказов
    progress = getattr(order, 'progress', 0) or 0
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value,
                        OrderStatus.IN_PROGRESS.value] and progress > 0:
        lines.append(f"<b>Статус:</b> {emoji} {status_text} ({progress}%)")
        # Текстовый этап вместо прогресс-бара
        if progress < 25:
            lines.append("Текущий этап: Подготовка")
        elif progress < 50:
            lines.append("Текущий этап: Основная работа")
        elif progress < 75:
            lines.append("Текущий этап: Детализация")
        elif progress < 100:
            lines.append("Текущий этап: Финальная проверка")
        else:
            lines.append("Текущий этап: Готово к сдаче")
    else:
        lines.append(f"<b>Статус:</b> {emoji} {status_text}")
        if hint:
            lines.append(hint)

    # ═══ СРОКИ ═══
    if order.deadline:
        lines.append("")
        lines.append(f"<b>🗓 Сроки</b>")
        lines.append(f"Дедлайн: {order.deadline}")

    # ═══ ДЕТАЛИ ЗАДАЧИ ═══
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸🔥":
        work_type = work_type[2:].strip()

    has_details = work_type or (order.subject and order.subject.strip())
    if has_details:
        lines.append("")
        lines.append(f"<b>💼 Детали задачи</b>")
        if work_type:
            lines.append(f"• {work_type}")
        if order.subject and order.subject.strip():
            lines.append(f"• {order.subject.strip()}")

    # ═══ ОПЛАТА ═══
    lines.append("")
    lines.append(f"<b>💳 Оплата</b>")

    if order.price > 0:
        lines.append(f"Стоимость: {format_number(order.price)} ₽")

        if order.discount > 0:
            discount_amount = order.price * order.discount / 100
            lines.append(f"Скидка: –{format_number(discount_amount)} ₽")

        if order.bonus_used > 0:
            lines.append(f"Бонусы: –{format_number(order.bonus_used)} ₽")

        if order.paid_amount >= order.final_price and order.paid_amount > 0:
            lines.append(f"<b>Итого оплачено: {format_number(order.paid_amount)} ₽</b> ✅")
        elif order.paid_amount > 0:
            remaining = order.final_price - order.paid_amount
            lines.append(f"Оплачено: {format_number(order.paid_amount)} ₽")
            lines.append(f"<b>Осталось: {format_number(remaining)} ₽</b>")
        else:
            lines.append(f"<b>К оплате: {format_number(order.final_price)} ₽</b>")
    else:
        lines.append("<i>Стоимость рассчитывается...</i>")

    return "\n".join(lines)


@router.callback_query(F.data.startswith("order_detail:"))
async def show_order_detail(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Детали заказа — фото с caption в стиле 'Дело'"""
    await callback.answer()
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

    parts = callback.data.split(":")
    if len(parts) < 2:
        logger.warning(f"Invalid callback data in show_order_detail: {callback.data}")
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        logger.warning(f"Invalid order_id in show_order_detail: {callback.data}")
        return

    telegram_id = callback.from_user.id

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == telegram_id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        # Диагностика: проверяем существует ли заказ вообще
        check_result = await session.execute(select(Order).where(Order.id == order_id))
        check_order = check_result.scalar_one_or_none()
        if check_order:
            logger.warning(
                f"show_order_detail: Order {order_id} exists with user_id={check_order.user_id}, "
                f"but request from telegram_id={telegram_id}"
            )
        else:
            logger.warning(f"show_order_detail: Order {order_id} does not exist at all")
        await callback.message.answer("❌ Заказ не найден или был удалён")
        return

    caption = build_order_detail_caption(order)
    keyboard = get_order_detail_keyboard(order)

    # Удаляем старое и отправляем фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if ORDER_DETAIL_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=ORDER_DETAIL_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото дела: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


# ══════════════════════════════════════════════════════════════
#                    ОТМЕНА ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("cancel_user_order:"))
async def cancel_order_request(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        logger.warning(f"Invalid callback data in cancel_order_request: {callback.data}")
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        logger.warning(f"Invalid order_id in cancel_order_request: {callback.data}")
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.message.answer("❌ Заказ не найден или был удалён")
        return

    if not order.can_be_cancelled:
        await callback.message.answer(f"❌ Заказ #{order.id} уже нельзя отменить (статус: {order.status_label})")
        return

    # Убираем emoji из work_type_label
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸":
        work_type = work_type[2:].strip()

    text = f"<b>Отменить заказ #{order.id}?</b>\n\n{work_type}"
    if order.subject:
        text += f"\n{order.subject}"

    keyboard = get_cancel_order_confirm_keyboard(order_id)

    await safe_edit_or_send(callback, text, reply_markup=keyboard, bot=bot)


@router.callback_query(F.data.startswith("confirm_cancel_order:"))
async def confirm_cancel_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        logger.warning(f"Invalid callback data in confirm_cancel_order: {callback.data}")
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        logger.warning(f"Invalid order_id in confirm_cancel_order: {callback.data}")
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.message.answer("❌ Заказ не найден или был удалён")
        return

    if not order.can_be_cancelled:
        await callback.message.answer(f"❌ Заказ #{order.id} уже нельзя отменить (статус: {order.status_label})")
        return

    old_status = order.status
    order.status = OrderStatus.CANCELLED.value
    order.updated_at = datetime.now(MSK_TZ)

    # Return promo code if one was used (allows user to reuse it)
    if order.promo_code:
        try:
            from bot.services.promo_service import PromoService
            await PromoService.return_promo_usage(session, order.id, bot=bot)
            logger.info(f"[CancelOrder] Returned promo code for order #{order_id}")
        except Exception as e:
            logger.warning(f"[CancelOrder] Failed to return promo for order #{order_id}: {e}")

    await session.commit()

    try:
        await log_action(bot=bot, event=LogEvent.ORDER_CANCEL, user=callback.from_user,
                        details=f"Отменил #{order_id}", session=session)
    except Exception:
        pass

    # Уведомляем админов
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                f"Клиент отменил заказ #{order_id}\n"
                f"{callback.from_user.full_name} (ID: {callback.from_user.id})\n"
                f"Был статус: {old_status}"
            )
        except Exception:
            pass

    text = f"Заказ #{order_id} отменён"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="К заказам", callback_data="profile_orders")],
    ])

    await safe_edit_or_send(callback, text, reply_markup=keyboard, bot=bot)


# ══════════════════════════════════════════════════════════════
#                    ПОВТОРНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("reorder:"))
async def reorder(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        logger.warning(f"Invalid callback data in reorder: {callback.data}")
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        logger.warning(f"Invalid order_id in reorder: {callback.data}")
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.message.answer("❌ Невозможно повторить заказ — он не найден")
        return

    await state.clear()
    await state.set_state(OrderState.choosing_deadline)
    await state.update_data(
        work_type=order.work_type,
        subject=order.subject,
        subject_label=order.subject or "",
        attachments=[],
        reorder_from=order_id,
    )

    # Убираем emoji
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸":
        work_type = work_type[2:].strip()

    text = f"<b>Повторный заказ</b>\n\nНа основе #{order_id}: {work_type}"
    if order.subject:
        text += f", {order.subject}"
    text += "\n\nВыбери срок:"

    from bot.keyboards.orders import get_deadline_keyboard

    await safe_edit_or_send(callback, text, reply_markup=get_deadline_keyboard(), bot=bot)


# ══════════════════════════════════════════════════════════════
#                    БАЛАНС
# ══════════════════════════════════════════════════════════════

def build_balance_caption(balance: float, earnings: float) -> str:
    """Формирует caption для баланса — стиль 'Сейф'"""
    lines = ["🏦 <b>Твой личный сейф</b>", ""]

    # Hero — баланс крупно
    lines.append(f"💰 Баланс: <b>{format_number(balance)} ₽</b>")

    if earnings > 0:
        lines.append(f"<i>(из них {format_number(earnings)}₽ с друзей)</i>")

    lines.append("")

    # Как это работает
    lines.append("💎 <b>Как это работает:</b>")
    lines.append("📉 Оплачивай бонусами до <b>50%</b> от суммы заказа")
    lines.append("🤝 Приводи друзей — получай % с их заказов")

    lines.append("")
    lines.append("<i>Копи монеты, шериф!</i>")

    return "\n".join(lines)


@router.callback_query(F.data == "profile_balance")
async def show_balance(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Баланс — фото с caption в стиле 'Сейф'"""
    await callback.answer()

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="Баланс", session=session)
    except Exception:
        pass

    user_result = await session.execute(
        select(User).where(User.telegram_id == callback.from_user.id)
    )
    user = user_result.scalar_one_or_none()

    balance = user.balance if user else 0
    earnings = user.referral_earnings if user else 0

    caption = build_balance_caption(balance, earnings)
    keyboard = get_balance_keyboard()

    # Удаляем старое и отправляем фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if WALLET_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=WALLET_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото сейфа: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


# ══════════════════════════════════════════════════════════════
#                    ДРУЗЬЯ
# ══════════════════════════════════════════════════════════════

def build_referral_caption(ref_link: str, count: int, earnings: float) -> str:
    """Формирует caption для реферальной программы — стиль 'Банда'"""
    lines = [
        "🤠 <b>Сколоти свою банду!</b>",
        "",
        "В одиночку на Диком Западе сложно.",
        "Зови друзей — будем грабить знания вместе!",
        "",
        "💎 <b>Другу:</b> Скидка <b>5%</b> на первый заказ",
        "💰 <b>Тебе:</b> Пожизненные <b>5%</b> с его оплат",
    ]

    # Статистика (если есть)
    if count > 0 or earnings > 0:
        lines.append("")
        lines.append(f"📊 В банде: <b>{count}</b> | Добыча: <b>{format_number(earnings)}₽</b>")

    lines.extend([
        "",
        "👇 <i>Твоя ссылка (жми, чтобы скопировать):</i>",
        f"<code>{ref_link}</code>",
        "",
        "<i>Чем больше банда, тем больше добыча!</i>",
    ])

    return "\n".join(lines)


@router.callback_query(F.data == "profile_referral")
async def show_referral(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Реферальная программа — фото с caption в стиле 'Банда'"""
    await callback.answer()

    telegram_id = callback.from_user.id
    ref_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    count = user.referrals_count if user else 0
    earnings = user.referral_earnings if user else 0

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="Друзья", session=session)
    except Exception:
        pass

    caption = build_referral_caption(ref_link, count, earnings)
    keyboard = get_referral_keyboard(ref_link)

    # Удаляем старое и отправляем фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if REFERRAL_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=REFERRAL_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото рефералки: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


# ══════════════════════════════════════════════════════════════
#                    GAMIFIED FEATURES
# ══════════════════════════════════════════════════════════════

# Награды для Daily Luck (барабан) - стандартные
DAILY_LUCK_REWARDS = [
    (5, 10, "Мелочь на табак"),       # 5-10₽
    (10, 25, "Неплохой улов"),        # 10-25₽
    (25, 50, "Добрая добыча!"),       # 25-50₽
    (50, 100, "Удачный день!"),       # 50-100₽
    (100, 200, "Джекпот, ковбой!"),   # 100-200₽ (редко)
]

DAILY_LUCK_WEIGHTS = [40, 30, 20, 8, 2]  # Вероятности (%)

# Специальные награды для VIP Muse (NeuroNatali)
MUSE_LUCK_REWARDS = [
    (100, 100, "Твоя улыбка сияет ярче моего кода! 💫"),
    (500, 500, "ДЖЕКПОТ! Но главный приз в этом боте — это ты. 💎"),
    (50, 50, "Сертификат на безлимитный кофе (спрашивать у Админа) ☕"),
    (50, 50, "Пусто... Шучу! Для тебя проигрышей не существует 🤗"),
    (200, 200, "Иммунитет от грусти на 24 часа ✨"),
    (150, 150, "Ты — причина, почему этот бот существует 🌹"),
    (300, 300, "Выпало: Безграничное восхищение 💖"),
    (75, 75, "Маленький бонус + большое сердечко 💝"),
]

MUSE_LUCK_WEIGHTS = [15, 10, 15, 15, 15, 10, 10, 10]  # Равномерное распределение


@router.callback_query(F.data == "daily_luck")
async def daily_luck_handler(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Ежедневный бонус - Испытать удачу

    Animated Casino Experience:
    1. Check VIP status FIRST (before any DB checks)
    2. If not VIP -> check cooldown
    3. Send 🎰 slot machine animation
    4. Wait 3 seconds for suspense
    5. Calculate reward
    6. Show result
    """
    telegram_id = callback.from_user.id
    tg_user = callback.from_user

    # ═══════════════ STEP 1: CHECK VIP STATUS FIRST ═══════════════
    # This MUST happen BEFORE any database cooldown checks
    is_vip = is_admin(tg_user) or is_actual_muse(tg_user)

    # Get user from DB
    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        await callback.answer("Сначала создай профиль!", show_alert=True)
        return

    # ═══════════════ STEP 2: CHECK COOLDOWN (only for non-VIP) ═══════════════
    if not is_vip:
        if not user.can_claim_daily_bonus:
            cooldown = user.daily_bonus_cooldown
            await callback.answer(
                f"⏳ Барабан остывает! Жди ещё {cooldown['remaining_text']}",
                show_alert=True
            )
            return

    await callback.answer("🎰 Крутим барабан...")

    # ═══════════════ STEP 3: DELETE OLD & SEND ANIMATION ═══════════════
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send native Telegram 🎰 dice animation
    dice_msg = await bot.send_dice(
        chat_id=callback.message.chat.id,
        emoji=DiceEmoji.SLOT_MACHINE
    )

    # ═══════════════ STEP 4: SUSPENSE DELAY (3 seconds) ═══════════════
    await asyncio.sleep(3)

    # ═══════════════ STEP 5: CALCULATE REWARD ═══════════════
    # Check if should use Muse UI (different from VIP bypass)
    show_muse_ui = is_vip_muse(tg_user)

    if show_muse_ui:
        reward_tier = random.choices(MUSE_LUCK_REWARDS, weights=MUSE_LUCK_WEIGHTS, k=1)[0]
    else:
        reward_tier = random.choices(DAILY_LUCK_REWARDS, weights=DAILY_LUCK_WEIGHTS, k=1)[0]

    min_amount, max_amount, flavor_text = reward_tier
    bonus_amount = random.randint(min_amount, max_amount)

    await BonusService.add_bonus(
        session=session,
        user_id=tg_user.id,
        amount=bonus_amount,
        reason=BonusReason.DAILY_LUCK,
        description=flavor_text,
        bot=bot,
        auto_commit=False,
    )

    # Set cooldown only for regular users
    if not is_vip:
        try:
            user.last_daily_bonus_at = datetime.now(MSK_TZ)
        except Exception:
            pass

    await session.commit()
    # Refresh user to get updated balance after bonus was added
    await session.refresh(user)

    # Log
    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=tg_user,
                        details=f"Daily Luck: +{bonus_amount}₽ {'(VIP)' if is_vip else ''}", session=session)
    except Exception:
        pass

    # ═══════════════ STEP 6: SHOW RESULT ═══════════════
    if show_muse_ui:
        lines = [
            "<code>✧ R O U L E T T E ✧</code>",
            "",
            f"💎 {flavor_text}",
            "",
            f"💰 <b>+{bonus_amount}</b> монет",
            "",
            f"<i>Баланс: {format_number(user.balance)} 🌕</i>",
        ]
        keyboard = get_muse_luck_result_keyboard()
    else:
        lines = [
            "🎰 <b>БАРАБАН УДАЧИ</b>",
            "",
            f"🎉 <b>{flavor_text}</b>",
            "",
            f"💰 Ты получил: <b>+{bonus_amount} 🌕</b>",
            f"Теперь в сейфе: <b>{format_number(user.balance)} 🌕</b>",
            "",
            "<i>Приходи завтра за новой порцией золота!</i>",
        ]
        keyboard = get_daily_luck_result_keyboard()

    caption = "\n".join(lines)

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        reply_to_message_id=dice_msg.message_id,
    )


@router.callback_query(F.data == "daily_luck_cooldown")
async def daily_luck_cooldown_handler(callback: CallbackQuery, session: AsyncSession):
    """Показывает сообщение о кулдауне"""
    telegram_id = callback.from_user.id

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    if user:
        cooldown = user.daily_bonus_cooldown
        if not cooldown["available"]:
            await callback.answer(
                f"⏳ Барабан перезаряжается. Попробуй через {cooldown['remaining_text']}",
                show_alert=True
            )
            return

    await callback.answer("Барабан готов! Жми на кнопку.", show_alert=True)


@router.callback_query(F.data == "profile_gang")
async def show_gang(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Моя Банда - расширенный экран рефералки"""
    await callback.answer()

    telegram_id = callback.from_user.id
    ref_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    count = user.referrals_count if user else 0
    earnings = user.referral_earnings if user else 0

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="Моя банда", session=session)
    except Exception:
        pass

    # Build Gang caption
    lines = [
        "🔫 <b>МОЯ БАНДА</b>",
        "",
        "В одиночку на Диком Западе не выжить.",
        "Собирай свою банду — вместе грабить веселее!",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        f"👥 <b>Бандитов завербовано:</b> {count}",
        f"💰 <b>Общая добыча с банды:</b> {format_number(earnings)} 🌕",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "💎 <b>Условия вербовки:</b>",
        "• Друг получает <b>5% скидку</b> на первый заказ",
        "• Ты получаешь <b>5%</b> с каждой его оплаты — навсегда!",
        "",
        "👇 <i>Твоя ссылка (жми, чтобы скопировать):</i>",
        f"<code>{ref_link}</code>",
        "",
        "<i>Чем больше банда, тем больше золота!</i>",
    ]

    caption = "\n".join(lines)
    keyboard = get_gang_keyboard(ref_link)

    # Delete old message and send result
    try:
        await callback.message.delete()
    except Exception:
        pass

    if REFERRAL_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=REFERRAL_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото банды: {e}")

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


@router.callback_query(F.data == "copy_ref_link")
async def copy_ref_link_handler(callback: CallbackQuery):
    """Показывает ссылку для копирования"""
    telegram_id = callback.from_user.id
    ref_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"
    await callback.answer(f"Твоя ссылка: {ref_link}", show_alert=True)


@router.callback_query(F.data == "profile_history")
async def show_history(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """История операций с балансом"""
    await callback.answer()
    await show_history_page(callback, session, bot, 0)


@router.callback_query(F.data.startswith("history_page:"))
async def paginate_history(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Пагинация истории"""
    await callback.answer()
    parts = callback.data.split(":")
    page = int(parts[1]) if len(parts) > 1 else 0
    await show_history_page(callback, session, bot, page)


HISTORY_PER_PAGE = 10


async def show_history_page(callback: CallbackQuery, session: AsyncSession, bot: Bot, page: int):
    """Показывает страницу истории операций"""
    telegram_id = callback.from_user.id

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        await callback.answer("Профиль не найден", show_alert=True)
        return

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="История операций", session=session)
    except Exception:
        pass

    # Get completed orders as a proxy for financial history
    orders_query = select(Order).where(
        Order.user_id == telegram_id,
        Order.paid_amount > 0
    ).order_by(desc(Order.created_at))

    orders_result = await session.execute(orders_query)
    all_orders = orders_result.scalars().all()

    total_count = len(all_orders)
    total_pages = max(1, (total_count + HISTORY_PER_PAGE - 1) // HISTORY_PER_PAGE)
    page = min(page, total_pages - 1)

    start_idx = page * HISTORY_PER_PAGE
    end_idx = start_idx + HISTORY_PER_PAGE
    page_orders = all_orders[start_idx:end_idx]

    # Build caption
    lines = [
        "📜 <b>ИСТОРИЯ ОПЕРАЦИЙ</b>",
        "",
    ]

    if not page_orders:
        lines.append("<i>Пока нет оплаченных заказов.</i>")
        lines.append("")
        lines.append("Сделай первый заказ и история начнётся!")
    else:
        lines.append(f"💰 <b>Всего операций:</b> {total_count}")
        lines.append("")

        for order in page_orders:
            date_str = order.created_at.strftime("%d.%m.%Y") if order.created_at else "—"
            work_type = order.work_type_label
            if work_type and len(work_type) > 1 and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸🔥":
                work_type = work_type[2:].strip()

            lines.append(f"• <b>#{order.id}</b> | {date_str}")
            lines.append(f"  {work_type}: <b>{format_number(order.paid_amount)}₽</b>")
            if order.bonus_used > 0:
                lines.append(f"  <i>Бонусов использовано: {format_number(order.bonus_used)}₽</i>")

        if total_pages > 1:
            lines.append("")
            lines.append(f"<i>Страница {page + 1} из {total_pages}</i>")

    lines.append("")
    lines.append(f"💳 <b>Текущий баланс:</b> {format_number(user.balance)} 🌕")

    caption = "\n".join(lines)
    keyboard = get_history_keyboard(page, total_pages)

    # Delete old message and send
    try:
        await callback.message.delete()
    except Exception:
        pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


@router.callback_query(F.data == "activate_coupon")
async def activate_coupon_start(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Начало активации купона"""
    await callback.answer()

    try:
        await callback.message.delete()
    except Exception:
        pass

    lines = [
        "🎟 <b>АКТИВАЦИЯ КУПОНА</b>",
        "",
        "Введи код купона, который ты получил:",
        "",
        "<i>Например: WELCOME50, BONUS100</i>",
    ]

    caption = "\n".join(lines)
    keyboard = get_coupon_keyboard()

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )

    # Set state to wait for coupon code
    await state.set_state(CouponState.waiting_code)


# Known coupons (can be extended to DB-based system)
VALID_COUPONS = {
    "WELCOME50": {"amount": 50, "description": "Приветственный бонус"},
    "BONUS100": {"amount": 100, "description": "Праздничный бонус"},
    "SALOON25": {"amount": 25, "description": "Бонус от Салуна"},
}


@router.message(CouponState.waiting_code)
async def process_coupon_code(message: Message, session: AsyncSession, state: FSMContext, bot: Bot):
    """Обработка введённого кода купона"""
    telegram_id = message.from_user.id
    code = message.text.strip().upper() if message.text else ""

    # Clear state first
    await state.clear()

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(
            "Профиль не найден. Начни с /start",
            reply_markup=get_coupon_result_keyboard(False),
            parse_mode=ParseMode.HTML,
        )
        return

    # Check if coupon is valid
    coupon_data = VALID_COUPONS.get(code)

    if coupon_data:
        # Check if user already used this coupon
        if await is_coupon_used(telegram_id, code):
            lines = [
                "🎟 <b>КУПОН УЖЕ ИСПОЛЬЗОВАН</b>",
                "",
                f"❌ Ты уже активировал код <code>{code}</code>.",
                "",
                "Каждый купон можно использовать только один раз.",
            ]
            await message.answer(
                "\n".join(lines),
                reply_markup=get_coupon_result_keyboard(False),
                parse_mode=ParseMode.HTML,
            )
            return

        # Apply coupon
        bonus_amount = coupon_data["amount"]
        description = coupon_data["description"]

        await BonusService.add_bonus(
            session=session,
            user_id=telegram_id,
            amount=bonus_amount,
            reason=BonusReason.COUPON,
            description=description,
            bot=bot,
        )

        # Mark coupon as used
        await mark_coupon_used(telegram_id, code)

        # Log
        try:
            await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=message.from_user,
                            details=f"Coupon {code}: +{bonus_amount}₽", session=session)
        except Exception:
            pass

        lines = [
            "🎟 <b>КУПОН АКТИВИРОВАН!</b>",
            "",
            f"✅ Код: <code>{code}</code>",
            f"💎 {description}",
            "",
            f"💰 Начислено: <b>+{bonus_amount} 🌕</b>",
            f"Теперь в сейфе: <b>{format_number(user.balance)} 🌕</b>",
            "",
            "<i>Золото зачислено на твой счёт!</i>",
        ]

        await message.answer(
            "\n".join(lines),
            reply_markup=get_coupon_result_keyboard(True),
            parse_mode=ParseMode.HTML,
        )
    else:
        # Invalid coupon
        lines = [
            "🎟 <b>КУПОН НЕ НАЙДЕН</b>",
            "",
            f"❌ Код <code>{code}</code> недействителен.",
            "",
            "Проверь правильность ввода или попробуй другой код.",
        ]

        await message.answer(
            "\n".join(lines),
            reply_markup=get_coupon_result_keyboard(False),
            parse_mode=ParseMode.HTML,
        )


# ══════════════════════════════════════════════════════════════
#                    СЛУЖЕБНОЕ
# ══════════════════════════════════════════════════════════════

# Сюрпризы для кнопки "🌹 Сюрприз" (VIP Muse only)
MUSE_SURPRISES = [
    "💕 Ты — самое прекрасное, что случалось с этим ботом!",
    "🌟 Если бы звёзды могли писать код, они бы писали о тебе.",
    "☕ Кофе? Чай? Или, может, обнимашки? (спросить у Админа)",
    "🎵 *играет романтическая музыка из сериалов*",
    "💎 Сюрприз: твоя улыбка сделала чей-то день лучше!",
    "🌹 Этот бот официально влюблён. В тебя.",
    "✨ Секрет: Админ улыбается каждый раз, когда ты заходишь.",
    "🤗 Виртуальные обнимашки отправлены! (доставка: немедленно)",
    "💫 Факт дня: ты делаешь мир лучше просто своим существованием.",
    "🎁 Настоящий сюрприз — это ты сама!",
]


@router.callback_query(F.data == "muse_surprise")
async def muse_surprise_handler(callback: CallbackQuery):
    """Обработчик кнопки 🌹 Сюрприз для VIP Muse"""
    surprise = random.choice(MUSE_SURPRISES)
    await callback.answer(surprise, show_alert=True)


@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    await callback.answer()
