"""
Личный кабинет пользователя.
Компактный дизайн без лишних элементов.
"""

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.enums import ChatAction
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case

from database.models.users import User
from database.models.orders import (
    Order, OrderStatus,
    get_status_meta, get_active_statuses, get_history_statuses,
)
from bot.keyboards.profile import (
    get_profile_dashboard_keyboard,
    get_orders_list_keyboard,
    get_order_detail_keyboard,
    get_cancel_order_confirm_keyboard,
    get_empty_orders_keyboard,
    get_balance_keyboard,
    get_referral_keyboard,
    get_back_to_profile_keyboard,
)
from bot.services.logger import log_action, LogEvent
from bot.states.order import OrderState
from core.config import settings

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")
ORDERS_PER_PAGE = 10


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


@router.callback_query(F.data.in_(["my_profile", "my_orders"]))
async def show_profile(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Главный экран личного кабинета"""
    await callback.answer()

    try:
        await log_action(bot=bot, event=LogEvent.NAV_BUTTON, user=callback.from_user,
                        details="Личный кабинет", session=session)
    except Exception:
        pass

    telegram_id = callback.from_user.id
    first_name = callback.from_user.first_name or "партнёр"

    user_result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()

    counts = await get_order_counts(session, telegram_id)

    if user:
        status, discount = user.loyalty_status
        progress = user.loyalty_progress

        lines = [f"Здорово, {first_name} 🤠", ""]

        # Статус и скидка
        lines.append(f"<b>{status}</b>")
        if discount > 0:
            lines.append(f"скидка {discount}% на всё")

        # Прогресс до следующего уровня
        if progress["has_next"]:
            lines.append("")
            orders_left = progress["orders_needed"]
            next_name = progress["next_name"]
            word = "заказ" if orders_left == 1 else "заказа" if orders_left < 5 else "заказов"
            lines.append(f"<i>Ещё {orders_left} {word} до «{next_name}»</i>")

        lines.append("")

        # Счёт
        lines.append(f"На счету <b>{format_number(user.balance)}₽</b>")

        # Заказы
        if counts["active"] > 0:
            lines.append(f"В работе {counts['active']} заказов")

        # Сэкономлено (если есть)
        saved = user.total_saved
        if saved > 100:
            lines.append("")
            lines.append(f"💰 Сэкономлено ~{format_number(saved)}₽")

        text = "\n".join(lines)
        balance = user.balance
    else:
        text = f"Здорово, {first_name} 🤠\n\nДобро пожаловать в салун!"
        balance = 0

    keyboard = get_profile_dashboard_keyboard(counts["active"], balance)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer(text, reply_markup=keyboard)


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


async def show_orders_list(callback: CallbackQuery, session: AsyncSession,
                           filter_type: str, page: int):
    """Список заказов"""
    telegram_id = callback.from_user.id
    counts = await get_order_counts(session, telegram_id)

    if counts["all"] == 0:
        text = "<b>Мои заказы</b>\n\nПока пусто"
        try:
            await callback.message.edit_text(text, reply_markup=get_empty_orders_keyboard())
        except Exception:
            await callback.message.answer(text, reply_markup=get_empty_orders_keyboard())
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

    text = "<b>Мои заказы</b>"
    if not orders:
        empty_msg = {"all": "Пока пусто", "active": "Нет активных", "history": "Нет завершённых"}
        text += f"\n\n{empty_msg.get(filter_type, 'Пусто')}"

    keyboard = get_orders_list_keyboard(orders, page, total_pages, filter_type, counts)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ДЕТАЛИ ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("order_detail:"))
async def show_order_detail(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    await callback.answer()
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

    parts = callback.data.split(":")
    if len(parts) < 2:
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        return

    telegram_id = callback.from_user.id

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == telegram_id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    meta = get_status_meta(order.status)

    # Компактный текст
    lines = [f"<b>Заказ #{order.id}</b>"]
    lines.append("")

    # Статус
    status_line = f"{meta.get('emoji', '')} {meta.get('label', order.status)}"
    if meta.get('description'):
        status_line += f" — {meta.get('description')}"
    lines.append(status_line)

    lines.append("")

    # Основная инфа
    # Убираем emoji из work_type_label для чистоты
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸":
        work_type = work_type[2:].strip()
    lines.append(work_type)

    if order.subject:
        lines.append(order.subject)

    if order.deadline:
        lines.append(f"Срок: {order.deadline}")

    # Цена
    lines.append("")
    lines.append(format_price(order))

    # Дата создания — только если есть смысл
    if order.created_at:
        lines.append("")
        lines.append(f"<i>Создан {format_date(order.created_at)}</i>")

    text = "\n".join(lines)
    keyboard = get_order_detail_keyboard(order)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ОТМЕНА ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("cancel_user_order:"))
async def cancel_order_request(callback: CallbackQuery, session: AsyncSession):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if not order.can_be_cancelled:
        await callback.answer("Этот заказ нельзя отменить", show_alert=True)
        return

    # Убираем emoji из work_type_label
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸":
        work_type = work_type[2:].strip()

    text = f"<b>Отменить заказ #{order.id}?</b>\n\n{work_type}"
    if order.subject:
        text += f"\n{order.subject}"

    keyboard = get_cancel_order_confirm_keyboard(order_id)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("confirm_cancel_order:"))
async def confirm_cancel_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order or not order.can_be_cancelled:
        await callback.answer("Нельзя отменить", show_alert=True)
        return

    old_status = order.status
    order.status = OrderStatus.CANCELLED.value
    order.updated_at = datetime.now(MSK_TZ)
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

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ПОВТОРНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("reorder:"))
async def reorder(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    await callback.answer()

    parts = callback.data.split(":")
    if len(parts) < 2:
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        return

    order_result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == callback.from_user.id)
    )
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
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

    try:
        await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer(text, reply_markup=get_deadline_keyboard())


# ══════════════════════════════════════════════════════════════
#                    БАЛАНС
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "profile_balance")
async def show_balance(callback: CallbackQuery, session: AsyncSession, bot: Bot):
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

    lines = [
        "💰 <b>Ваш счёт</b>",
        "",
        f"<b>{format_number(balance)}₽</b>",
    ]

    if earnings > 0:
        lines.append(f"из них {format_number(earnings)}₽ с друзей")

    lines.extend([
        "",
        "Списывается при оплате — до 50% от суммы.",
        "Пополняется за приглашённых друзей.",
    ])

    text = "\n".join(lines)

    try:
        await callback.message.edit_text(text, reply_markup=get_balance_keyboard())
    except Exception:
        await callback.message.answer(text, reply_markup=get_balance_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ДРУЗЬЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "profile_referral")
async def show_referral(callback: CallbackQuery, session: AsyncSession, bot: Bot):
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

    lines = [
        "👥 <b>Позови друга в салун</b>",
        "",
        f"<code>{ref_link}</code>",
        "",
        "Другу — скидка 5% на первый заказ.",
        "Тебе — 5% с каждого его заказа на счёт.",
    ]

    if count > 0 or earnings > 0:
        lines.extend([
            "",
            f"Друзей приведено: {count}",
            f"Заработано: {format_number(earnings)}₽",
        ])

    text = "\n".join(lines)

    try:
        await callback.message.edit_text(text, reply_markup=get_referral_keyboard(ref_link))
    except Exception:
        await callback.message.answer(text, reply_markup=get_referral_keyboard(ref_link))


# ══════════════════════════════════════════════════════════════
#                    СЛУЖЕБНОЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    await callback.answer()
