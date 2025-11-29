"""
Личный кабинет пользователя.
Премиальный дизайн с фото и визуальным прогресс-баром.
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.enums import ChatAction, ParseMode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case

# Пути к изображениям
PROFILE_IMAGE_PATH = Path(__file__).parent.parent / "media" / "cab_saloon.jpg"
ORDERS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "my_order.jpg"
ORDER_DETAIL_IMAGE_PATH = Path(__file__).parent.parent / "media" / "delo.jpg"
WALLET_IMAGE_PATH = Path(__file__).parent.parent / "media" / "wallet.jpg"
REFERRAL_IMAGE_PATH = Path(__file__).parent.parent / "media" / "ref.jpg"

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
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")
ORDERS_PER_PAGE = 6  # Уменьшено для лучшего UX


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
    """Формирует caption для Личного кабинета"""
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


@router.callback_query(F.data.in_(["my_profile", "my_orders"]))
async def show_profile(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Главный экран личного кабинета — фото с caption"""
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
    caption = build_profile_caption(user, first_name, counts)
    keyboard = get_profile_dashboard_keyboard(counts["active"])

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
        "confirmed": ("🔨", "Подтверждён"),
        "in_progress": ("🔨", "В работе"),
        "paid": ("✅", "Оплачено (в очереди)"),
        "waiting_payment": ("💰", "Ждёт оплаты"),
        "waiting_for_payment": ("💰", "Ждёт оплаты"),
        "completed": ("🏁", "Готово"),
        "done": ("🏁", "Готово"),
        "cancelled": ("❌", "Отменён"),
        "rejected": ("❌", "Отклонён"),
    }
    return status_map.get(status, ("📋", status))


def build_order_detail_caption(order: Order) -> str:
    """Формирует caption для деталей заказа — стиль 'Дело'"""
    lines = [f"📁 <b>Дело #{order.id}</b>", ""]

    # Статус
    emoji, status_text = get_status_display(order.status)
    lines.append(f"Статус: {emoji} <b>{status_text}</b>")
    lines.append("")

    # Суть задачи
    lines.append("📚 <b>Суть задачи:</b>")

    # Тип работы (без emoji)
    work_type = order.work_type_label
    if work_type and work_type[0] in "🎩🎓📚📖📝📄✏️📊🏢📎📸🔥":
        work_type = work_type[2:].strip()
    lines.append(f"• {work_type}")

    # Предмет — только если указан
    subject = order.subject.strip() if order.subject else ""
    if subject:
        lines.append(f"• {subject}")

    # Дедлайн
    if order.deadline:
        lines.append(f"• Дедлайн: {order.deadline}")

    lines.append("")

    # Финансы
    lines.append("💰 <b>Финансы:</b>")

    if order.price > 0:
        # Базовая цена
        if order.discount > 0 or order.bonus_used > 0:
            lines.append(f"🔹 Цена: <s>{format_number(order.price)}₽</s>")
        else:
            lines.append(f"🔹 Цена: {format_number(order.price)}₽")

        # Скидка
        if order.discount > 0:
            discount_amount = order.price * order.discount / 100
            lines.append(f"🔹 Скидка: <b>−{order.discount:.0f}%</b> (−{format_number(discount_amount)}₽)")

        # Бонусы
        if order.bonus_used > 0:
            lines.append(f"🔸 Бонусы: <b>−{format_number(order.bonus_used)}₽</b>")

        lines.append("")

        # Итог
        if order.paid_amount >= order.final_price and order.paid_amount > 0:
            lines.append(f"✅ <b>Оплачено: {format_number(order.paid_amount)}₽</b>")
        elif order.paid_amount > 0:
            lines.append(f"💳 Оплачено: {format_number(order.paid_amount)}₽ из {format_number(order.final_price)}₽")
        else:
            lines.append(f"💳 <b>К оплате: {format_number(order.final_price)}₽</b>")
    else:
        lines.append("🔹 Цена: <i>ожидает оценки</i>")

    # Дата создания
    if order.created_at:
        lines.append("")
        lines.append(f"<i>Создано: {format_date(order.created_at)}</i>")

    return "\n".join(lines)


@router.callback_query(F.data.startswith("order_detail:"))
async def show_order_detail(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Детали заказа — фото с caption в стиле 'Дело'"""
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

    await safe_edit_or_send(callback, text, reply_markup=keyboard, bot=bot)


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

    await safe_edit_or_send(callback, text, reply_markup=keyboard, bot=bot)


# ══════════════════════════════════════════════════════════════
#                    ПОВТОРНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("reorder:"))
async def reorder(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
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
#                    СЛУЖЕБНОЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    await callback.answer()
