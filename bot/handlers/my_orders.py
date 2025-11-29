"""
История заказов пользователя.
Продуманный интерфейс с фильтрами, пагинацией и детальным просмотром.
"""

import logging
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.enums import ChatAction
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from database.models.users import User
from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType
from bot.services.logger import log_action, LogEvent
from bot.states.order import OrderState
from core.config import settings

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")

# Константы пагинации
ORDERS_PER_PAGE = 5

# Статусы для фильтров
ACTIVE_STATUSES = [
    OrderStatus.PENDING.value,
    OrderStatus.CONFIRMED.value,
    OrderStatus.PAID.value,
    OrderStatus.PAID_FULL.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVIEW.value,
]

COMPLETED_STATUSES = [
    OrderStatus.COMPLETED.value,
]

CANCELLED_STATUSES = [
    OrderStatus.CANCELLED.value,
    OrderStatus.REJECTED.value,
]

# Эмодзи статусов для кнопок (компактные)
STATUS_EMOJI = {
    OrderStatus.PENDING.value: "⏳",
    OrderStatus.CONFIRMED.value: "✅",
    OrderStatus.PAID.value: "💳",
    OrderStatus.PAID_FULL.value: "💰",
    OrderStatus.IN_PROGRESS.value: "⚙️",
    OrderStatus.REVIEW.value: "🔍",
    OrderStatus.COMPLETED.value: "✨",
    OrderStatus.CANCELLED.value: "❌",
    OrderStatus.REJECTED.value: "🚫",
}

# Короткие названия типов работ для кнопок
WORK_TYPE_SHORT = {
    "masters": "Магистерская",
    "diploma": "Диплом",
    "coursework": "Курсовая",
    "independent": "Самостоят.",
    "essay": "Эссе",
    "report": "Реферат",
    "control": "Контрольная",
    "presentation": "Презентация",
    "practice": "Практика",
    "other": "Другое",
    "photo_task": "Срочное",
}

# Пояснения статусов
STATUS_DESCRIPTIONS = {
    OrderStatus.PENDING.value: "Ожидает оценки — скоро посмотрю",
    OrderStatus.CONFIRMED.value: "Подтверждён — можно оплачивать",
    OrderStatus.PAID.value: "Аванс получен — приступаю к работе",
    OrderStatus.PAID_FULL.value: "Полностью оплачен — в приоритете",
    OrderStatus.IN_PROGRESS.value: "В работе — пишу для тебя",
    OrderStatus.REVIEW.value: "Готово — проверь и подтверди",
    OrderStatus.COMPLETED.value: "Завершён — спасибо за заказ!",
    OrderStatus.CANCELLED.value: "Отменён",
    OrderStatus.REJECTED.value: "Отклонён",
}


# ══════════════════════════════════════════════════════════════
#                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def format_smart_date(dt: datetime) -> str:
    """Умное форматирование даты: сегодня, вчера, или дата"""
    if dt is None:
        return "—"

    now = datetime.now(MSK_TZ)

    # Приводим к MSK если нужно
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=MSK_TZ)

    today = now.date()
    dt_date = dt.date()

    if dt_date == today:
        return f"сегодня в {dt.strftime('%H:%M')}"
    elif dt_date == today.replace(day=today.day - 1) if today.day > 1 else today:
        return f"вчера в {dt.strftime('%H:%M')}"
    else:
        return dt.strftime("%d.%m.%Y")


def format_price_breakdown(order: Order) -> str:
    """Форматирование цены с разбивкой"""
    lines = []

    if order.price > 0:
        lines.append(f"◈ Цена: {order.price:.0f}₽")

        if order.discount > 0:
            lines.append(f"◈ Скидка: −{order.discount:.0f}%")

        if order.bonus_used > 0:
            lines.append(f"◈ Бонусы: −{order.bonus_used:.0f}₽ 🎁")

        if order.discount > 0 or order.bonus_used > 0:
            lines.append(f"◈ <b>Итого: {order.final_price:.0f}₽</b>")

        if order.paid_amount > 0:
            lines.append(f"◈ Оплачено: {order.paid_amount:.0f}₽")
    else:
        lines.append("◈ Цена: ожидает оценки")

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════


def get_orders_list_keyboard(
    orders: list[Order],
    page: int,
    total_pages: int,
    filter_type: str = "all",
    counts: dict = None
) -> InlineKeyboardMarkup:
    """Клавиатура списка заказов — чистый универсальный дизайн"""
    buttons = []
    counts = counts or {"all": 0, "active": 0, "completed": 0}

    # Фильтры со счётчиками — информативно и компактно
    filter_buttons = []

    # Все
    all_label = f"Все · {counts['all']}" if counts['all'] > 0 else "Все"
    if filter_type == "all":
        all_label = f"• {all_label}"
    filter_buttons.append(InlineKeyboardButton(text=all_label, callback_data="orders_filter:all:0"))

    # Активные
    active_label = f"⏳ {counts['active']}" if counts['active'] > 0 else "⏳"
    if filter_type == "active":
        active_label = f"• {active_label}"
    filter_buttons.append(InlineKeyboardButton(text=active_label, callback_data="orders_filter:active:0"))

    # История (завершённые)
    completed_label = f"✨ {counts['completed']}" if counts['completed'] > 0 else "✨"
    if filter_type == "completed":
        completed_label = f"• {completed_label}"
    filter_buttons.append(InlineKeyboardButton(text=completed_label, callback_data="orders_filter:completed:0"))

    buttons.append(filter_buttons)

    # Кнопки заказов — тип + предмет + статус
    for order in orders:
        emoji = STATUS_EMOJI.get(order.status, "📋")
        work_short = WORK_TYPE_SHORT.get(order.work_type, order.work_type)

        # Добавляем предмет если есть (сокращаем)
        if order.subject:
            subj = order.subject[:12] + "…" if len(order.subject) > 12 else order.subject
            btn_text = f"{work_short} · {subj} {emoji}"
        else:
            btn_text = f"{work_short} {emoji}"

        buttons.append([InlineKeyboardButton(
            text=btn_text,
            callback_data=f"order_detail:{order.id}"
        )])

    # Пагинация — компактная
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(text="◀️", callback_data=f"orders_page:{filter_type}:{page - 1}"))
        pagination.append(InlineKeyboardButton(text=f"{page + 1}/{total_pages}", callback_data="noop"))
        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(text="▶️", callback_data=f"orders_page:{filter_type}:{page + 1}"))
        buttons.append(pagination)

    # Назад
    buttons.append([InlineKeyboardButton(text="◀️ Меню", callback_data="back_to_menu")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_order_detail_keyboard(order: Order) -> InlineKeyboardMarkup:
    """Клавиатура деталей заказа"""
    buttons = []

    # Спросить о заказе
    buttons.append([InlineKeyboardButton(
        text="💬 Спросить об этом заказе",
        url=f"https://t.me/{settings.SUPPORT_USERNAME}?text=Заказ%20%23{order.id}"
    )])

    # Повторить заказ (только для завершённых)
    if order.status in [OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value]:
        buttons.append([InlineKeyboardButton(
            text="🔄 Заказать похожее",
            callback_data=f"reorder:{order.id}"
        )])

    # Назад к списку
    buttons.append([InlineKeyboardButton(
        text="◀️ К списку заказов",
        callback_data="my_orders"
    )])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_empty_orders_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для пустого списка"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎯 Создать первый заказ", callback_data="create_order")],
        [InlineKeyboardButton(text="◀️ В меню", callback_data="back_to_menu")]
    ])


# ══════════════════════════════════════════════════════════════
#                    ГЛАВНЫЙ ЭКРАН
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "my_orders")
async def show_my_orders(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Главный экран истории заказов — минималистичный"""
    await callback.answer("⏳")

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.NAV_BUTTON,
            user=callback.from_user,
            details="Открыл «Мои заказы»",
            session=session,
        )
    except Exception as e:
        logger.warning(f"Ошибка логирования: {e}")

    telegram_id = callback.from_user.id

    # Считаем заказы
    all_count_query = select(func.count(Order.id)).where(Order.user_id == telegram_id)
    all_result = await session.execute(all_count_query)
    all_count = all_result.scalar() or 0

    # Если заказов нет — пустое состояние
    if all_count == 0:
        text = "📋 <b>Мои заказы</b>\n\n<i>Заказов пока нет</i>"
        await callback.message.edit_text(text, reply_markup=get_empty_orders_keyboard())
        return

    # Показываем список
    await show_orders_list(callback, session, "all", 0)


@router.callback_query(F.data.startswith("orders_filter:"))
async def filter_orders(callback: CallbackQuery, session: AsyncSession):
    """Переключение фильтра"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    filter_type = parts[1] if len(parts) > 1 else "all"
    page = int(parts[2]) if len(parts) > 2 else 0

    await show_orders_list(callback, session, filter_type, page)


@router.callback_query(F.data.startswith("orders_page:"))
async def paginate_orders(callback: CallbackQuery, session: AsyncSession):
    """Пагинация"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    filter_type = parts[1] if len(parts) > 1 else "all"
    page = int(parts[2]) if len(parts) > 2 else 0

    await show_orders_list(callback, session, filter_type, page)


async def show_orders_list(
    callback: CallbackQuery,
    session: AsyncSession,
    filter_type: str,
    page: int
):
    """Показать список заказов — чистый универсальный дизайн"""
    telegram_id = callback.from_user.id

    # Считаем заказы для всех фильтров (для отображения в кнопках)
    all_count_q = select(func.count(Order.id)).where(Order.user_id == telegram_id)
    active_count_q = select(func.count(Order.id)).where(
        Order.user_id == telegram_id,
        Order.status.in_(ACTIVE_STATUSES)
    )
    completed_count_q = select(func.count(Order.id)).where(
        Order.user_id == telegram_id,
        Order.status.in_(COMPLETED_STATUSES)
    )

    all_result = await session.execute(all_count_q)
    active_result = await session.execute(active_count_q)
    completed_result = await session.execute(completed_count_q)

    counts = {
        "all": all_result.scalar() or 0,
        "active": active_result.scalar() or 0,
        "completed": completed_result.scalar() or 0,
    }

    # Определяем какой фильтр применить
    if filter_type == "active":
        total_count = counts["active"]
        status_filter = Order.status.in_(ACTIVE_STATUSES)
    elif filter_type == "completed":
        total_count = counts["completed"]
        status_filter = Order.status.in_(COMPLETED_STATUSES)
    else:
        total_count = counts["all"]
        status_filter = None

    total_pages = max(1, (total_count + ORDERS_PER_PAGE - 1) // ORDERS_PER_PAGE)
    page = min(page, total_pages - 1)

    # Получаем заказы для текущей страницы
    orders_query = select(Order).where(Order.user_id == telegram_id)
    if status_filter is not None:
        orders_query = orders_query.where(status_filter)
    orders_query = orders_query.order_by(desc(Order.created_at)).offset(page * ORDERS_PER_PAGE).limit(ORDERS_PER_PAGE)

    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    # Минимальный header — одна строка
    text = "📋 <b>Мои заказы</b>"

    # Пустое состояние для конкретного фильтра
    if not orders:
        filter_empty = {
            "all": "Заказов пока нет",
            "active": "Нет активных заказов",
            "completed": "Нет завершённых заказов"
        }
        text += f"\n\n<i>{filter_empty.get(filter_type, 'Пусто')}</i>"

    keyboard = get_orders_list_keyboard(orders, page, total_pages, filter_type, counts)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.delete()
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ДЕТАЛИ ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("order_detail:"))
async def show_order_detail(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Показать детали заказа"""
    await callback.answer("⏳")
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == telegram_id  # Проверка владельца
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Формируем текст деталей — чистый дизайн
    emoji = STATUS_EMOJI.get(order.status, "📋")
    status_desc = STATUS_DESCRIPTIONS.get(order.status, "")

    # Заголовок и статус
    text = f"""📋  <b>Заказ #{order.id}</b>

{emoji} <b>{order.status_label}</b>
<i>{status_desc}</i>

"""

    # Информация о заказе
    text += f"<b>Тип:</b> {order.work_type_label}"

    if order.subject:
        text += f"\n<b>Направление:</b> {order.subject}"

    if order.deadline:
        text += f"\n<b>Срок:</b> {order.deadline}"

    # Финансы — компактно
    text += f"\n\n<b>Стоимость</b>\n{format_price_breakdown(order)}"

    # История — компактно
    text += "\n\n<b>История</b>"

    if order.created_at:
        text += f"\n🆕 {format_smart_date(order.created_at)} — создан"

    if order.status != OrderStatus.PENDING.value and order.updated_at:
        text += f"\n{emoji} {format_smart_date(order.updated_at)}"

    if order.completed_at:
        text += f"\n✨ {format_smart_date(order.completed_at)} — завершён"

    keyboard = get_order_detail_keyboard(order)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.delete()
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ПОВТОРНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("reorder:"))
async def reorder(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Создать похожий заказ"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем оригинальный заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == telegram_id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Сохраняем данные для нового заказа
    await state.clear()
    await state.set_state(OrderState.choosing_deadline)
    await state.update_data(
        work_type=order.work_type,
        subject=order.subject,
        subject_label=order.subject or "",
        attachments=[],
        reorder_from=order_id,
    )

    work_label = order.work_type_label
    subject_line = f"\n◈ Направление: {order.subject}" if order.subject else ""

    text = f"""🔄  <b>Повторный заказ</b>

Создаю заказ на основе #{order_id}:

◈ Тип: {work_label}{subject_line}

Теперь выбери срок и добавь новое задание 👇"""

    from bot.keyboards.orders import get_deadline_keyboard

    try:
        await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())
    except Exception:
        await callback.message.delete()
        await callback.message.answer(text, reply_markup=get_deadline_keyboard())


# noop для кнопки пагинации
@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    """Пустой обработчик для некликабельных кнопок"""
    await callback.answer()
