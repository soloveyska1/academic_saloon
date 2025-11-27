from aiogram import Router, F, Bot
from aiogram.filters import Command, CommandObject
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from database.models.users import User
from database.models.orders import Order, WORK_TYPE_LABELS, WorkType, OrderStatus
from bot.services.logger import BotLogger, LogEvent
from bot.services.bonus import BonusService, BonusReason
from core.config import settings
from core.saloon_status import (
    saloon_manager,
    LoadStatus,
    LOAD_STATUS_DISPLAY,
    generate_status_message,
    generate_people_online,
)
from bot.states.admin import AdminStates

router = Router()


# ══════════════════════════════════════════════════════════════
#                        ФИЛЬТРЫ
# ══════════════════════════════════════════════════════════════

def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


# ══════════════════════════════════════════════════════════════
#                        КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

def get_admin_keyboard() -> InlineKeyboardMarkup:
    """Главное меню админки"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📋 Заявки", callback_data="admin_orders_list")
        ],
        [
            InlineKeyboardButton(text="📊 Статус Салуна", callback_data="admin_status_menu")
        ],
        [
            InlineKeyboardButton(text="👶 Режим новичка", callback_data="admin_newbie_mode")
        ],
    ])
    return kb


def get_admin_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка назад в админку"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")
        ],
    ])
    return kb


def get_status_menu_keyboard() -> InlineKeyboardMarkup:
    """Меню управления статусом"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🚦 Загруженность", callback_data="admin_load_status")
        ],
        [
            InlineKeyboardButton(text="🧑‍💼 Клиентов сейчас", callback_data="admin_clients_count"),
            InlineKeyboardButton(text="📋 Заказы в работе", callback_data="admin_orders_count")
        ],
        [
            InlineKeyboardButton(text="📌 Отправить закреп", callback_data="admin_send_pin")
        ],
        [
            InlineKeyboardButton(text="🔄 Обновить закреп", callback_data="admin_update_pin")
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")
        ],
    ])
    return kb


def get_load_status_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора уровня загруженности"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.LOW][0]} Свободно",
                callback_data="admin_set_load_low"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.MEDIUM][0]} Средняя загрузка",
                callback_data="admin_set_load_medium"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.HIGH][0]} Очень плотно",
                callback_data="admin_set_load_high"
            )
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


def get_back_to_status_keyboard() -> InlineKeyboardMarkup:
    """Кнопка назад к меню статуса"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


def get_cancel_keyboard() -> InlineKeyboardMarkup:
    """Кнопка отмены ввода"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="admin_status_menu")
        ],
    ])
    return kb


# Метки статусов для отображения
ORDER_STATUS_LABELS = {
    OrderStatus.DRAFT.value: ("📝", "Черновик"),
    OrderStatus.PENDING.value: ("⏳", "Ожидает оценки"),
    OrderStatus.CONFIRMED.value: ("✅", "Ждёт оплаты"),
    OrderStatus.PAID.value: ("💰", "Оплачен"),
    OrderStatus.IN_PROGRESS.value: ("⚙️", "В работе"),
    OrderStatus.REVIEW.value: ("🔍", "На проверке"),
    OrderStatus.COMPLETED.value: ("✨", "Завершён"),
    OrderStatus.CANCELLED.value: ("❌", "Отменён"),
    OrderStatus.REJECTED.value: ("🚫", "Отклонён"),
}


def get_order_detail_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Клавиатура управления заказом"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔄 Сменить статус", callback_data=f"admin_change_status:{order_id}"),
        ],
        [
            InlineKeyboardButton(text="💰 Назначить цену", callback_data=f"admin_set_price:{order_id}"),
        ],
        [
            InlineKeyboardButton(text="❌ Отменить", callback_data=f"admin_cancel_order:{order_id}"),
            InlineKeyboardButton(text="🗑 Удалить", callback_data=f"admin_delete_order:{order_id}"),
        ],
        [
            InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list"),
        ],
    ])
    return kb


def get_status_select_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Клавиатура выбора нового статуса"""
    buttons = []
    for status in OrderStatus:
        emoji, label = ORDER_STATUS_LABELS.get(status.value, ("", status.value))
        buttons.append([
            InlineKeyboardButton(
                text=f"{emoji} {label}",
                callback_data=f"admin_set_status:{order_id}:{status.value}"
            )
        ])
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад", callback_data=f"admin_order_detail:{order_id}")
    ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_confirm_delete_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Подтверждение удаления заказа"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Да, удалить", callback_data=f"admin_confirm_delete:{order_id}"),
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"admin_order_detail:{order_id}"),
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                        ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.message(Command("admin"))
async def cmd_admin(message: Message, state: FSMContext):
    """Админ-панель"""
    if not is_admin(message.from_user.id):
        return

    await state.clear()

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Заявки</b> — список активных заказов

◈  <b>Статус Салуна</b> — управление загруженностью,
    клиентами и закрепом

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь"""

    await message.answer(text, reply_markup=get_admin_keyboard())


@router.message(Command("orders"))
async def cmd_orders(message: Message, session: AsyncSession):
    """Быстрый просмотр заявок"""
    if not is_admin(message.from_user.id):
        return

    # Получаем все активные заявки
    query = (
        select(Order)
        .where(Order.status.in_([
            OrderStatus.PENDING.value,
            OrderStatus.CONFIRMED.value,
            OrderStatus.PAID.value,
            OrderStatus.IN_PROGRESS.value,
        ]))
        .order_by(desc(Order.created_at))
        .limit(20)
    )
    result = await session.execute(query)
    orders = result.scalars().all()

    if not orders:
        await message.answer(
            "📋 <b>Заявок нет</b>\n\n"
            "Все заказы обработаны! 🎉"
        )
        return

    # Группируем по статусам
    pending = [o for o in orders if o.status == OrderStatus.PENDING.value]
    confirmed = [o for o in orders if o.status == OrderStatus.CONFIRMED.value]
    paid = [o for o in orders if o.status == OrderStatus.PAID.value]
    in_progress = [o for o in orders if o.status == OrderStatus.IN_PROGRESS.value]

    text = "📋 <b>Активные заявки</b>\n\n"

    if pending:
        text += f"⏳ <b>Ожидают оценки ({len(pending)}):</b>\n"
        for o in pending[:5]:
            work = WORK_TYPE_LABELS.get(WorkType(o.work_type), o.work_type) if o.work_type else "?"
            time_str = o.created_at.strftime("%d.%m %H:%M") if o.created_at else ""
            text += f"  • #{o.id} {work} ({time_str})\n"
        if len(pending) > 5:
            text += f"  <i>...и ещё {len(pending) - 5}</i>\n"
        text += "\n"

    if confirmed:
        text += f"✅ <b>Ждут оплаты ({len(confirmed)}):</b>\n"
        for o in confirmed[:5]:
            text += f"  • #{o.id} — {o.price:.0f}₽\n"
        text += "\n"

    if paid:
        text += f"💰 <b>Оплачены ({len(paid)}):</b>\n"
        for o in paid[:5]:
            text += f"  • #{o.id} — {o.paid_amount:.0f}₽\n"
        text += "\n"

    if in_progress:
        text += f"⚙️ <b>В работе ({len(in_progress)}):</b>\n"
        for o in in_progress[:5]:
            text += f"  • #{o.id}\n"

    text += "\n<i>Команды: /price ID ЦЕНА, /paid ID</i>"

    # Кнопки для быстрых действий с pending заявками
    buttons = []
    for o in pending[:3]:
        buttons.append([
            InlineKeyboardButton(
                text=f"#{o.id} 💰 Цена",
                callback_data=f"admin_set_price:{o.id}"
            ),
            InlineKeyboardButton(
                text="❌",
                callback_data=f"admin_reject:{o.id}"
            ),
        ])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data == "admin_panel")
async def show_admin_panel(callback: CallbackQuery, state: FSMContext):
    """Вернуться в админ-панель"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer()

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Статус Салуна</b> — управление загруженностью,
    клиентами и закрепом

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь"""

    await callback.message.edit_text(text, reply_markup=get_admin_keyboard())


# ══════════════════════════════════════════════════════════════
#                    СПИСОК ЗАЯВОК
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_orders_list")
async def show_orders_list(callback: CallbackQuery, session: AsyncSession):
    """Показать список активных заявок"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    # Получаем все активные заявки
    query = (
        select(Order)
        .where(Order.status.in_([
            OrderStatus.PENDING.value,
            OrderStatus.CONFIRMED.value,
            OrderStatus.PAID.value,
            OrderStatus.IN_PROGRESS.value,
            OrderStatus.REVIEW.value,
        ]))
        .order_by(desc(Order.created_at))
        .limit(20)
    )
    result = await session.execute(query)
    orders = result.scalars().all()

    if not orders:
        await callback.message.edit_text(
            "📋 <b>Заявок нет</b>\n\n"
            "Все заказы обработаны! 🎉",
            reply_markup=get_admin_back_keyboard()
        )
        return

    # Группируем по статусам
    pending = [o for o in orders if o.status == OrderStatus.PENDING.value]
    confirmed = [o for o in orders if o.status == OrderStatus.CONFIRMED.value]
    paid = [o for o in orders if o.status == OrderStatus.PAID.value]
    in_progress = [o for o in orders if o.status == OrderStatus.IN_PROGRESS.value]
    review = [o for o in orders if o.status == OrderStatus.REVIEW.value]

    text = "📋 <b>Активные заявки</b>\n\n"

    if pending:
        text += f"⏳ <b>Ожидают оценки ({len(pending)}):</b>\n"
        for o in pending[:5]:
            work = WORK_TYPE_LABELS.get(WorkType(o.work_type), o.work_type) if o.work_type else "?"
            time_str = o.created_at.strftime("%d.%m %H:%M") if o.created_at else ""
            text += f"  • #{o.id} {work} ({time_str})\n"
        if len(pending) > 5:
            text += f"  <i>...и ещё {len(pending) - 5}</i>\n"
        text += "\n"

    if confirmed:
        text += f"✅ <b>Ждут оплаты ({len(confirmed)}):</b>\n"
        for o in confirmed[:5]:
            text += f"  • #{o.id} — {o.price:.0f}₽\n"
        if len(confirmed) > 5:
            text += f"  <i>...и ещё {len(confirmed) - 5}</i>\n"
        text += "\n"

    if paid:
        text += f"💰 <b>Оплачены ({len(paid)}):</b>\n"
        for o in paid[:5]:
            text += f"  • #{o.id} — {o.paid_amount:.0f}₽\n"
        if len(paid) > 5:
            text += f"  <i>...и ещё {len(paid) - 5}</i>\n"
        text += "\n"

    if in_progress:
        text += f"⚙️ <b>В работе ({len(in_progress)}):</b>\n"
        for o in in_progress[:5]:
            text += f"  • #{o.id}\n"
        if len(in_progress) > 5:
            text += f"  <i>...и ещё {len(in_progress) - 5}</i>\n"
        text += "\n"

    if review:
        text += f"🔍 <b>На проверке ({len(review)}):</b>\n"
        for o in review[:5]:
            text += f"  • #{o.id}\n"
        if len(review) > 5:
            text += f"  <i>...и ещё {len(review) - 5}</i>\n"

    text += "\n<i>Нажми на заказ для управления</i>"

    # Кнопки для каждого заказа
    buttons = []

    # Добавляем кнопки для всех заказов (до 10)
    all_orders = orders[:10]
    for o in all_orders:
        emoji, status_label = ORDER_STATUS_LABELS.get(o.status, ("", o.status))
        price_str = f" • {o.price:.0f}₽" if o.price else ""
        buttons.append([
            InlineKeyboardButton(
                text=f"#{o.id} {emoji} {status_label}{price_str}",
                callback_data=f"admin_order_detail:{o.id}"
            ),
        ])

    buttons.append([
        InlineKeyboardButton(text="🔄 Обновить", callback_data="admin_orders_list"),
        InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel"),
    ])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    await callback.message.edit_text(text, reply_markup=kb)


# ══════════════════════════════════════════════════════════════
#                    ДЕТАЛИ ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_order_detail:"))
async def show_order_detail(callback: CallbackQuery, session: AsyncSession):
    """Показать детали заказа с кнопками управления"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])
    await callback.answer()

    # Получаем заказ
    query = select(Order).where(Order.id == order_id)
    result = await session.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        await callback.message.edit_text(
            f"❌ Заказ #{order_id} не найден",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")]
            ])
        )
        return

    # Получаем пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    # Формируем информацию
    emoji, status_label = ORDER_STATUS_LABELS.get(order.status, ("", order.status))
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "—"

    user_info = "—"
    if user:
        username = f"@{user.username}" if user.username else ""
        user_info = f"{user.fullname or 'Без имени'} {username}\n<code>{user.telegram_id}</code>"

    text = f"""📋 <b>Заказ #{order.id}</b>

{emoji} <b>Статус:</b> {status_label}

<b>Тип работы:</b> {work_label}
<b>Предмет:</b> {order.subject or '—'}
<b>Тема:</b> {order.topic or '—'}
<b>Дедлайн:</b> {order.deadline or '—'}

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Финансы:</b>
◈ Цена: {order.price:.0f}₽
◈ Бонусы: -{order.bonus_used:.0f}₽
◈ Итого: {order.final_price:.0f}₽
◈ Оплачено: {order.paid_amount:.0f}₽

━━━━━━━━━━━━━━━━━━━━━

👤 <b>Клиент:</b>
{user_info}

📅 Создан: {order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else '—'}"""

    await callback.message.edit_text(text, reply_markup=get_order_detail_keyboard(order_id))


@router.callback_query(F.data.startswith("admin_change_status:"))
async def show_status_change_menu(callback: CallbackQuery):
    """Показать меню выбора нового статуса"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])
    await callback.answer()

    text = f"""🔄 <b>Смена статуса заказа #{order_id}</b>

Выбери новый статус:"""

    await callback.message.edit_text(text, reply_markup=get_status_select_keyboard(order_id))


@router.callback_query(F.data.startswith("admin_set_status:"))
async def set_order_status(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Установить новый статус заказа"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    order_id = int(parts[1])
    new_status = parts[2]

    # Получаем заказ
    query = select(Order).where(Order.id == order_id)
    result = await session.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    old_status = order.status
    order.status = new_status

    # Если статус изменён на "completed", записываем время завершения
    if new_status == OrderStatus.COMPLETED.value:
        from datetime import datetime, timezone
        order.completed_at = datetime.now(timezone.utc)

    await session.commit()

    old_emoji, old_label = ORDER_STATUS_LABELS.get(old_status, ("", old_status))
    new_emoji, new_label = ORDER_STATUS_LABELS.get(new_status, ("", new_status))

    await callback.answer(f"✅ Статус изменён: {new_emoji} {new_label}", show_alert=True)

    # Уведомляем клиента о смене статуса (опционально для важных статусов)
    notify_statuses = [
        OrderStatus.PAID.value,
        OrderStatus.IN_PROGRESS.value,
        OrderStatus.REVIEW.value,
        OrderStatus.COMPLETED.value,
        OrderStatus.CANCELLED.value,
    ]

    if new_status in notify_statuses:
        try:
            status_messages = {
                OrderStatus.PAID.value: "💰 Оплата получена! Приступаю к работе.",
                OrderStatus.IN_PROGRESS.value: "⚙️ Твой заказ в работе!",
                OrderStatus.REVIEW.value: "🔍 Работа готова и ждёт твоей проверки!",
                OrderStatus.COMPLETED.value: "✨ Заказ успешно завершён! Спасибо за доверие 🤝",
                OrderStatus.CANCELLED.value: "❌ Заказ отменён.",
            }
            msg = status_messages.get(new_status, f"Статус заказа изменён на: {new_label}")
            await bot.send_message(order.user_id, f"<b>Заказ #{order.id}</b>\n\n{msg}")
        except Exception:
            pass  # Клиент мог заблокировать бота

    # Возвращаемся к деталям заказа
    # Перечитываем заказ для актуальных данных
    await session.refresh(order)

    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    emoji, status_label = ORDER_STATUS_LABELS.get(order.status, ("", order.status))
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "—"

    user_info = "—"
    if user:
        username = f"@{user.username}" if user.username else ""
        user_info = f"{user.fullname or 'Без имени'} {username}\n<code>{user.telegram_id}</code>"

    text = f"""📋 <b>Заказ #{order.id}</b>

{emoji} <b>Статус:</b> {status_label}

<b>Тип работы:</b> {work_label}
<b>Предмет:</b> {order.subject or '—'}
<b>Тема:</b> {order.topic or '—'}
<b>Дедлайн:</b> {order.deadline or '—'}

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Финансы:</b>
◈ Цена: {order.price:.0f}₽
◈ Бонусы: -{order.bonus_used:.0f}₽
◈ Итого: {order.final_price:.0f}₽
◈ Оплачено: {order.paid_amount:.0f}₽

━━━━━━━━━━━━━━━━━━━━━

👤 <b>Клиент:</b>
{user_info}

📅 Создан: {order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else '—'}"""

    await callback.message.edit_text(text, reply_markup=get_order_detail_keyboard(order_id))


@router.callback_query(F.data.startswith("admin_cancel_order:"))
async def cancel_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отменить заказ"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])

    # Получаем заказ
    query = select(Order).where(Order.id == order_id)
    result = await session.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if order.status == OrderStatus.CANCELLED.value:
        await callback.answer("Заказ уже отменён", show_alert=True)
        return

    # Возвращаем бонусы, если они были использованы
    bonus_returned = 0
    if order.bonus_used > 0:
        user_query = select(User).where(User.telegram_id == order.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        if user:
            user.balance += order.bonus_used
            bonus_returned = order.bonus_used

    # Отменяем заказ
    order.status = OrderStatus.CANCELLED.value
    await session.commit()

    # Уведомляем клиента
    try:
        cancel_msg = f"❌ <b>Заказ #{order.id} отменён</b>"
        if bonus_returned > 0:
            cancel_msg += f"\n\n💎 Бонусы возвращены на баланс: +{bonus_returned:.0f}₽"
        await bot.send_message(order.user_id, cancel_msg)
    except Exception:
        pass

    await callback.answer(f"✅ Заказ #{order_id} отменён", show_alert=True)

    # Возвращаемся к списку заказов
    await callback.message.edit_text(
        f"❌ <b>Заказ #{order_id} отменён</b>" +
        (f"\n\n💎 Бонусы возвращены клиенту: {bonus_returned:.0f}₽" if bonus_returned > 0 else ""),
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")]
        ])
    )


@router.callback_query(F.data.startswith("admin_delete_order:"))
async def confirm_delete_order(callback: CallbackQuery):
    """Запросить подтверждение удаления"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])
    await callback.answer()

    text = f"""🗑 <b>Удаление заказа #{order_id}</b>

⚠️ <b>Внимание!</b>
Заказ будет удалён безвозвратно.

Ты уверен?"""

    await callback.message.edit_text(text, reply_markup=get_confirm_delete_keyboard(order_id))


@router.callback_query(F.data.startswith("admin_confirm_delete:"))
async def delete_order(callback: CallbackQuery, session: AsyncSession):
    """Удалить заказ"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])

    # Получаем и удаляем заказ
    query = select(Order).where(Order.id == order_id)
    result = await session.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    await session.delete(order)
    await session.commit()

    await callback.answer(f"🗑 Заказ #{order_id} удалён", show_alert=True)

    await callback.message.edit_text(
        f"🗑 <b>Заказ #{order_id} удалён</b>",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")]
        ])
    )


# ══════════════════════════════════════════════════════════════
#                    МЕНЮ СТАТУСА САЛУНА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_status_menu")
async def show_status_menu(callback: CallbackQuery, state: FSMContext):
    """Показать меню управления статусом"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer()

    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji, title, _ = LOAD_STATUS_DISPLAY[load]

    # Динамическое число "людей в боте"
    people_online = generate_people_online()

    text = f"""📊  <b>Статус Салуна</b>

<b>Текущие показатели:</b>

{emoji}  Загруженность: <b>{title}</b>
👀  Людей в боте: <b>{people_online}</b> <i>(авто)</i>
🧑‍💼  Клиентов сейчас: <b>{status.clients_count}</b>
📋  Заказов в работе: <b>{status.orders_in_progress}</b>

📌  Закреп: {"настроен" if status.pinned_message_id else "не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ ЗАГРУЖЕННОСТЬЮ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_load_status")
async def show_load_status_menu(callback: CallbackQuery):
    """Показать меню выбора загруженности"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji, title, desc = LOAD_STATUS_DISPLAY[load]

    text = f"""🚦  <b>Загруженность</b>

Текущий статус: {emoji} <b>{title}</b>
<i>{desc}</i>

Выбери новый уровень:"""

    await callback.message.edit_text(text, reply_markup=get_load_status_keyboard())


@router.callback_query(F.data.startswith("admin_set_load_"))
async def set_load_status(callback: CallbackQuery):
    """Установить уровень загруженности"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    load_map = {
        "admin_set_load_low": LoadStatus.LOW,
        "admin_set_load_medium": LoadStatus.MEDIUM,
        "admin_set_load_high": LoadStatus.HIGH,
    }

    new_load = load_map.get(callback.data)
    if not new_load:
        await callback.answer("Неизвестный статус", show_alert=True)
        return

    await saloon_manager.set_load_status(new_load)
    emoji, title, _ = LOAD_STATUS_DISPLAY[new_load]

    await callback.answer(f"Установлено: {emoji} {title}", show_alert=True)

    # Возвращаемся в меню статуса — обновляем текст
    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji_new, title_new, _ = LOAD_STATUS_DISPLAY[load]

    # Динамическое число "людей в боте"
    people_online = generate_people_online()

    text = f"""📊  <b>Статус Салуна</b>

<b>Текущие показатели:</b>

{emoji_new}  Загруженность: <b>{title_new}</b>
👀  Людей в боте: <b>{people_online}</b> <i>(авто)</i>
🧑‍💼  Клиентов сейчас: <b>{status.clients_count}</b>
📋  Заказов в работе: <b>{status.orders_in_progress}</b>

📌  Закреп: {"настроен" if status.pinned_message_id else "не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ КЛИЕНТАМИ СЕЙЧАС
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_clients_count")
async def ask_clients_count(callback: CallbackQuery, state: FSMContext):
    """Запросить количество клиентов сейчас"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()

    text = f"""🧑‍💼  <b>Клиентов сейчас</b>

Текущее значение: <b>{status.clients_count}</b>

<i>Это число ты выставляешь вручную.
«Людей в боте» генерируется автоматически.</i>

Введи новое число:"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_clients_count)


@router.message(AdminStates.waiting_clients_count)
async def set_clients_count(message: Message, state: FSMContext):
    """Установить количество клиентов сейчас"""
    if not is_admin(message.from_user.id):
        return

    try:
        count = int(message.text.strip())
        if count < 0:
            raise ValueError("Число должно быть неотрицательным")

        await saloon_manager.set_clients_count(count)
        await state.clear()

        text = f"""✅  <b>Готово!</b>

Клиентов сейчас: <b>{count}</b>"""

        await message.answer(text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректное число (0 или больше)",
            reply_markup=get_cancel_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ ЗАКАЗАМИ В РАБОТЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_orders_count")
async def ask_orders_count(callback: CallbackQuery, state: FSMContext):
    """Запросить количество заказов в работе"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()

    text = f"""📋  <b>Заказы в работе</b>

Текущее значение: <b>{status.orders_in_progress}</b>

Введи новое число:"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_orders_count)


@router.message(AdminStates.waiting_orders_count)
async def set_orders_count(message: Message, state: FSMContext):
    """Установить количество заказов"""
    if not is_admin(message.from_user.id):
        return

    try:
        count = int(message.text.strip())
        if count < 0:
            raise ValueError("Число должно быть неотрицательным")

        await saloon_manager.set_orders_in_progress(count)
        await state.clear()

        text = f"""✅  <b>Готово!</b>

Заказов в работе: <b>{count}</b>"""

        await message.answer(text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректное число (0 или больше)",
            reply_markup=get_cancel_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    ЗАКРЕПЛЕННОЕ СООБЩЕНИЕ
# ══════════════════════════════════════════════════════════════

def get_pin_destination_keyboard(admin_id: int) -> InlineKeyboardMarkup:
    """Клавиатура выбора куда отправить закреп"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📱 Отправить мне",
                callback_data=f"admin_pin_to:{admin_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="📢 В канал логов",
                callback_data=f"admin_pin_to:{settings.LOG_CHANNEL_ID}"
            )
        ],
        [
            InlineKeyboardButton(
                text="✏️ Ввести ID вручную",
                callback_data="admin_pin_manual"
            )
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


@router.callback_query(F.data == "admin_send_pin")
async def ask_pin_chat_id(callback: CallbackQuery, state: FSMContext):
    """Показать меню выбора куда отправить закреп"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    await state.clear()

    # Предпросмотр сообщения
    status = await saloon_manager.get_status()
    preview = generate_status_message(status)

    text = f"""📌  <b>Отправить закреп</b>

<b>Предпросмотр:</b>

{preview}

━━━━━━━━━━━━━━━━━━━━━

Куда отправить?"""

    await callback.message.edit_text(
        text,
        reply_markup=get_pin_destination_keyboard(callback.from_user.id)
    )


@router.callback_query(F.data.startswith("admin_pin_to:"))
async def send_pin_to_chat(callback: CallbackQuery, bot: Bot):
    """Отправить закреп в выбранный чат"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    chat_id = int(callback.data.split(":")[1])
    await _send_pin_message(callback, bot, chat_id)


@router.callback_query(F.data == "admin_pin_manual")
async def ask_pin_manual(callback: CallbackQuery, state: FSMContext):
    """Запросить ID чата вручную"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    text = """✏️  <b>Ввод ID вручную</b>

Введи ID чата/канала:

<i>Для каналов — число со знаком минус
Например: -1001234567890</i>"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_pin_chat_id)


async def _send_pin_message(callback: CallbackQuery, bot: Bot, chat_id: int):
    """Вспомогательная функция отправки закрепа"""
    try:
        status = await saloon_manager.get_status()
        text = generate_status_message(status)

        # Отправляем сообщение
        sent_msg = await bot.send_message(chat_id=chat_id, text=text)

        # Пытаемся закрепить
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=sent_msg.message_id,
                disable_notification=True
            )
            pin_status = "и закреплено ✅"
        except Exception:
            pin_status = "(закрепи вручную)"

        # Сохраняем ID сообщения
        await saloon_manager.set_pinned_message(chat_id, sent_msg.message_id)

        await callback.answer(f"Отправлено {pin_status}", show_alert=True)

        # Обновляем текст сообщения
        result_text = f"""✅  <b>Готово!</b>

Сообщение отправлено {pin_status}

Chat ID: <code>{chat_id}</code>
Message ID: <code>{sent_msg.message_id}</code>

Теперь можешь обновлять его через «Обновить закреп»."""

        await callback.message.edit_text(result_text, reply_markup=get_back_to_status_keyboard())

    except Exception as e:
        await callback.answer(f"Ошибка: {str(e)[:100]}", show_alert=True)


@router.message(AdminStates.waiting_pin_chat_id)
async def send_pin_message_manual(message: Message, state: FSMContext, bot: Bot):
    """Отправить закрепленное сообщение (ручной ввод ID)"""
    if not is_admin(message.from_user.id):
        return

    try:
        chat_id = int(message.text.strip())

        status = await saloon_manager.get_status()
        text = generate_status_message(status)

        # Отправляем сообщение
        sent_msg = await bot.send_message(chat_id=chat_id, text=text)

        # Пытаемся закрепить
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=sent_msg.message_id,
                disable_notification=True
            )
            pin_status = "и закреплено"
        except Exception:
            pin_status = "(закрепить вручную)"

        # Сохраняем ID сообщения
        await saloon_manager.set_pinned_message(chat_id, sent_msg.message_id)
        await state.clear()

        result_text = f"""✅  <b>Готово!</b>

Сообщение отправлено {pin_status}.

Chat ID: <code>{chat_id}</code>
Message ID: <code>{sent_msg.message_id}</code>

Теперь можешь обновлять его через кнопку «Обновить закреп»."""

        await message.answer(result_text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректный ID чата (число)",
            reply_markup=get_cancel_keyboard()
        )
    except Exception as e:
        await message.answer(
            f"❌ Ошибка отправки:\n<code>{e}</code>\n\nПроверь, что бот добавлен в чат/канал как администратор.",
            reply_markup=get_cancel_keyboard()
        )


@router.callback_query(F.data == "admin_update_pin")
async def update_pin_message(callback: CallbackQuery, bot: Bot):
    """Обновить закрепленное сообщение"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    status = await saloon_manager.get_status()

    if not status.pinned_message_id or not status.pinned_chat_id:
        await callback.answer(
            "Сначала отправь закреп через «Отправить закреп»",
            show_alert=True
        )
        return

    try:
        text = generate_status_message(status)
        await bot.edit_message_text(
            chat_id=status.pinned_chat_id,
            message_id=status.pinned_message_id,
            text=text
        )
        await callback.answer("✅ Закреп обновлён!", show_alert=True)

    except Exception as e:
        await callback.answer(
            f"Ошибка обновления: {str(e)[:100]}",
            show_alert=True
        )


# ══════════════════════════════════════════════════════════════
#                    РЕЖИМ НОВИЧКА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_newbie_mode")
async def enable_newbie_mode(callback: CallbackQuery, session: AsyncSession):
    """Включить режим новичка (сбросить принятие оферты)"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if user:
        # Сбрасываем принятие оферты
        user.terms_accepted_at = None
        await session.commit()

        text = """👶  <b>Режим новичка включён</b>

Твоя оферта сброшена. Теперь нажми /start
и увидишь флоу как новый пользователь.

<i>Голосовое и уведомления админам
также придут заново.</i>"""

    else:
        text = """❌  Пользователь не найден в БД.

Нажми /start чтобы создать запись."""

    await callback.answer()
    await callback.message.edit_text(text, reply_markup=get_admin_back_keyboard())


# ══════════════════════════════════════════════════════════════
#                    КОМАНДА /user <id>
# ══════════════════════════════════════════════════════════════

@router.message(Command("user"))
async def cmd_user_info(message: Message, command: CommandObject, session: AsyncSession):
    """
    Показать полную информацию о пользователе.
    Использование: /user 123456789 или /user @username
    """
    if not is_admin(message.from_user.id):
        return

    if not command.args:
        await message.answer(
            "📋  <b>Использование:</b>\n\n"
            "<code>/user 123456789</code> — по Telegram ID\n"
            "<code>/user @username</code> — по юзернейму"
        )
        return

    arg = command.args.strip()

    # Поиск пользователя
    if arg.startswith("@"):
        username = arg[1:]
        query = select(User).where(User.username == username)
    else:
        try:
            user_id = int(arg)
            query = select(User).where(User.telegram_id == user_id)
        except ValueError:
            await message.answer("❌ Неверный формат. Используй ID (число) или @username")
            return

    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await message.answer("❌ Пользователь не найден")
        return

    # Получаем последние заказы
    orders_query = (
        select(Order)
        .where(Order.user_id == user.telegram_id)
        .order_by(desc(Order.created_at))
        .limit(5)
    )
    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    # Формируем теги
    tags = BotLogger.get_user_tags(user)
    tags_str = " · ".join(tags) if tags else "—"

    # Формируем статус
    status, discount = user.loyalty_status

    # Проверяем флаги модерации
    is_watched = getattr(user, 'is_watched', False)
    is_banned = getattr(user, 'is_banned', False)
    notes = getattr(user, 'admin_notes', None) or "—"

    moderation_flags = []
    if is_watched:
        moderation_flags.append("👀 На слежке")
    if is_banned:
        moderation_flags.append("🚫 ЗАБАНЕН")
    moderation_str = " · ".join(moderation_flags) if moderation_flags else "✅ Чисто"

    # Формируем список заказов
    orders_str = ""
    if orders:
        for o in orders:
            work_label = WORK_TYPE_LABELS.get(WorkType(o.work_type), o.work_type)
            date_str = o.created_at.strftime("%d.%m") if o.created_at else "?"
            orders_str += f"\n  • #{o.id} {work_label} ({date_str}) — {o.status}"
    else:
        orders_str = "\n  Заказов пока нет"

    text = f"""📋  <b>Профиль пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

🏷  <b>Теги:</b> {tags_str}

━━━━━━━━━━━━━━━━━━━━━

📊  <b>Статистика</b>
◈  Статус: {status}
◈  Скидка: {discount}%
◈  Заказов: {user.orders_count}
◈  Потрачено: {user.total_spent:.0f} ₽
◈  Баланс: {user.balance:.0f} ₽
◈  Рефералов: {user.referrals_count}

━━━━━━━━━━━━━━━━━━━━━

🔒  <b>Модерация:</b> {moderation_str}

📌  <b>Заметки:</b>
{notes}

━━━━━━━━━━━━━━━━━━━━━

📝  <b>Последние заказы:</b>{orders_str}

━━━━━━━━━━━━━━━━━━━━━

📅  Регистрация: {user.created_at.strftime('%d.%m.%Y %H:%M') if user.created_at else '—'}
✅  Оферта: {user.terms_accepted_at.strftime('%d.%m.%Y') if user.terms_accepted_at else 'Не принята'}"""

    # Кнопки быстрых действий
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="💬 Написать", url=f"tg://user?id={user.telegram_id}"),
            InlineKeyboardButton(text="👀 Слежка", callback_data=f"log_watch:{user.telegram_id}"),
        ],
        [
            InlineKeyboardButton(text="📌 Заметка", callback_data=f"log_note:{user.telegram_id}"),
            InlineKeyboardButton(text="🚫 Бан", callback_data=f"log_ban:{user.telegram_id}"),
        ],
    ])

    await message.answer(text, reply_markup=kb)


# ══════════════════════════════════════════════════════════════
#                    НАЗНАЧЕНИЕ ЦЕНЫ ЗАКАЗУ
# ══════════════════════════════════════════════════════════════

@router.message(Command("price"))
async def cmd_price(message: Message, command: CommandObject, session: AsyncSession, bot: Bot):
    """
    Назначить цену заказу и отправить клиенту
    Использование: /price <order_id> <цена>
    Пример: /price 123 5000
    """
    if not is_admin(message.from_user.id):
        return

    if not command.args:
        await message.answer(
            "❌ Использование: /price <order_id> <цена>\n"
            "Пример: /price 123 5000"
        )
        return

    args = command.args.split()
    if len(args) < 2:
        await message.answer(
            "❌ Укажите ID заказа и цену\n"
            "Пример: /price 123 5000"
        )
        return

    try:
        order_id = int(args[0])
        price = float(args[1])
    except ValueError:
        await message.answer("❌ ID заказа и цена должны быть числами")
        return

    if price <= 0:
        await message.answer("❌ Цена должна быть больше 0")
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(f"❌ Пользователь заказа #{order_id} не найден")
        return

    # Рассчитываем бонусы (макс 50% от цены)
    max_bonus = price * 0.5
    bonus_to_use = min(user.balance, max_bonus)

    # Обновляем заказ
    order.price = price
    order.bonus_used = bonus_to_use
    order.status = OrderStatus.CONFIRMED.value
    await session.commit()

    # Рассчитываем итоговую цену
    final_price = price - bonus_to_use

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    if bonus_to_use > 0:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

{work_label}

Стоимость: {price:.0f}₽
🎁 Бонусы: −{bonus_to_use:.0f}₽

━━━━━━━━━━━━━━━
<b>Итого к оплате: {final_price:.0f}₽</b>

Реквизиты для оплаты пришлю следующим сообщением."""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Понятно", callback_data=f"price_ok:{order.id}"),
                InlineKeyboardButton(text="Не списывать бонусы", callback_data=f"price_no_bonus:{order.id}"),
            ]
        ])
    else:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

{work_label}

<b>Стоимость: {price:.0f}₽</b>

Реквизиты для оплаты пришлю следующим сообщением."""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Понятно", callback_data=f"price_ok:{order.id}")]
        ])

    # Отправляем клиенту
    try:
        await bot.send_message(order.user_id, client_text, reply_markup=kb)
        await message.answer(
            f"✅ Цена {price:.0f}₽ назначена заказу #{order.id}\n"
            f"Клиенту отправлено сообщение\n"
            f"Бонусов применено: {bonus_to_use:.0f}₽\n"
            f"Итого к оплате: {final_price:.0f}₽"
        )
    except Exception as e:
        await message.answer(f"❌ Не удалось отправить сообщение клиенту: {e}")


@router.callback_query(F.data.startswith("price_ok:"))
async def price_ok_callback(callback: CallbackQuery, session: AsyncSession):
    """Клиент подтвердил цену"""
    await callback.answer("👍 Отлично! Ожидай реквизиты")

    # Убираем кнопки
    await callback.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("price_no_bonus:"))
async def price_no_bonus_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент отказался от списания бонусов"""
    order_id = int(callback.data.split(":")[1])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Возвращаем бонусы (не списываем)
    bonus_was = order.bonus_used
    order.bonus_used = 0
    await session.commit()

    await callback.answer(f"✅ Бонусы сохранены на балансе (+{bonus_was:.0f}₽)")

    # Обновляем сообщение
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    new_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

{work_label}

<b>Стоимость: {order.price:.0f}₽</b>

💎 Бонусы сохранены на балансе

Реквизиты для оплаты пришлю следующим сообщением."""

    await callback.message.edit_text(new_text, reply_markup=None)


# ══════════════════════════════════════════════════════════════
#                    КНОПКИ ЗАЯВОК
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_set_price:"))
async def admin_set_price_callback(callback: CallbackQuery, state: FSMContext):
    """Админ нажал кнопку 'Назначить цену'"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])
    await state.update_data(price_order_id=order_id)
    await state.set_state(AdminStates.waiting_order_price)

    await callback.answer()
    await callback.message.answer(
        f"💰 <b>Введи цену для заказа #{order_id}</b>\n\n"
        f"Напиши просто число (например: 5000)",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_cancel_price")]
        ])
    )


@router.callback_query(F.data == "admin_cancel_price")
async def admin_cancel_price(callback: CallbackQuery, state: FSMContext):
    """Отмена ввода цены"""
    await state.clear()
    await callback.answer("Отменено")
    await callback.message.delete()


@router.message(AdminStates.waiting_order_price)
async def process_order_price_input(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода цены заказа"""
    if not is_admin(message.from_user.id):
        return

    data = await state.get_data()
    order_id = data.get("price_order_id")

    if not order_id:
        await state.clear()
        await message.answer("❌ Ошибка: заказ не выбран")
        return

    try:
        price = float(message.text.strip())
        if price <= 0:
            raise ValueError("Цена должна быть положительной")
    except ValueError:
        await message.answer("❌ Введи корректную цену (положительное число)")
        return

    await state.clear()

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(f"❌ Пользователь заказа #{order_id} не найден")
        return

    # Рассчитываем бонусы (макс 50% от цены)
    max_bonus = price * 0.5
    bonus_to_use = min(user.balance, max_bonus)

    # Обновляем заказ
    order.price = price
    order.bonus_used = bonus_to_use
    order.status = OrderStatus.CONFIRMED.value
    await session.commit()

    # Рассчитываем итоговую цену
    final_price = price - bonus_to_use

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    if bonus_to_use > 0:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

{work_label}

Стоимость: {price:.0f}₽
🎁 Бонусы: −{bonus_to_use:.0f}₽

━━━━━━━━━━━━━━━
<b>Итого к оплате: {final_price:.0f}₽</b>

Реквизиты для оплаты пришлю следующим сообщением."""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Понятно", callback_data=f"price_ok:{order.id}"),
                InlineKeyboardButton(text="Не списывать бонусы", callback_data=f"price_no_bonus:{order.id}"),
            ]
        ])
    else:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

{work_label}

<b>Стоимость: {price:.0f}₽</b>

Реквизиты для оплаты пришлю следующим сообщением."""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Понятно", callback_data=f"price_ok:{order.id}")]
        ])

    # Отправляем клиенту
    try:
        await bot.send_message(order.user_id, client_text, reply_markup=kb)
        await message.answer(
            f"✅ Цена {price:.0f}₽ назначена заказу #{order.id}\n"
            f"Клиенту отправлено сообщение\n"
            f"Бонусов применено: {bonus_to_use:.0f}₽\n"
            f"Итого к оплате: {final_price:.0f}₽"
        )
    except Exception as e:
        await message.answer(f"❌ Не удалось отправить сообщение клиенту: {e}")


@router.callback_query(F.data.startswith("admin_reject:"))
async def admin_reject_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отклонить заказ"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = int(callback.data.split(":")[1])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Обновляем статус
    order.status = OrderStatus.REJECTED.value
    await session.commit()

    # Уведомляем клиента
    try:
        await bot.send_message(
            order.user_id,
            f"❌ <b>Заказ #{order.id} отклонён</b>\n\n"
            f"К сожалению, не смогу взяться за эту работу.\n"
            f"Если есть вопросы — пиши: @{settings.SUPPORT_USERNAME}"
        )
    except Exception:
        pass

    await callback.answer(f"Заказ #{order_id} отклонён")

    # Обновляем сообщение
    try:
        if callback.message.text:
            await callback.message.edit_text(
                callback.message.text + "\n\n❌ <b>ОТКЛОНЁН</b>",
                reply_markup=None
            )
        else:
            # Если сообщение без текста — просто убираем кнопки
            await callback.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass  # Сообщение могло быть удалено


# ══════════════════════════════════════════════════════════════
#                    ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

@router.message(Command("paid"))
async def cmd_paid(message: Message, command: CommandObject, session: AsyncSession, bot: Bot):
    """
    Подтвердить оплату заказа
    Использование: /paid <order_id>
    Пример: /paid 123
    """
    if not is_admin(message.from_user.id):
        return

    if not command.args:
        await message.answer(
            "❌ Использование: /paid <order_id>\n"
            "Пример: /paid 123"
        )
        return

    try:
        order_id = int(command.args.strip())
    except ValueError:
        await message.answer("❌ ID заказа должен быть числом")
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    if order.status == OrderStatus.PAID.value:
        await message.answer(f"⚠️ Заказ #{order_id} уже оплачен")
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(f"❌ Пользователь заказа #{order_id} не найден")
        return

    # Списываем бонусы с баланса клиента
    bonus_deducted = 0
    if order.bonus_used > 0:
        success, _ = await BonusService.deduct_bonus(
            session=session,
            user_id=order.user_id,
            amount=order.bonus_used,
            reason=BonusReason.ORDER_DISCOUNT,
            description=f"Списание на заказ #{order.id}",
            bot=bot,
        )
        if success:
            bonus_deducted = order.bonus_used

    # Обновляем статус заказа
    order.status = OrderStatus.PAID.value
    order.paid_amount = order.final_price

    # Увеличиваем счётчик заказов и общую сумму
    user.orders_count += 1
    user.total_spent += order.paid_amount

    await session.commit()

    # Начисляем бонусы клиенту за оплаченный заказ (50₽)
    order_bonus = await BonusService.process_order_bonus(
        session=session,
        bot=bot,
        user_id=order.user_id,
    )

    # Начисляем реферальные бонусы (если есть реферер)
    referral_bonus = 0
    if user.referrer_id:
        referral_bonus = await BonusService.process_referral_bonus(
            session=session,
            bot=bot,
            referrer_id=user.referrer_id,
            order_amount=order.price,  # 5% от полной цены
            referred_user_id=order.user_id,
        )

    # Уведомляем клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    bonus_line = f"\n\n🎁 +{order_bonus:.0f}₽ бонусов на баланс!" if order_bonus > 0 else ""

    client_text = f"""✅ <b>Оплата получена!</b>

Заказ #{order.id} — {work_label}

Спасибо за доверие! 🤠
Приступаю к работе.{bonus_line}"""

    try:
        await bot.send_message(order.user_id, client_text)
    except Exception:
        pass  # Клиент мог заблокировать бота

    # Ответ админу
    response = f"✅ Заказ #{order_id} отмечен как оплаченный\n"
    response += f"💰 Сумма: {order.paid_amount:.0f}₽\n"

    if bonus_deducted > 0:
        response += f"🔻 Списано бонусов: {bonus_deducted:.0f}₽\n"

    if order_bonus > 0:
        response += f"🎁 Начислено клиенту: +{order_bonus:.0f}₽\n"

    if referral_bonus > 0:
        response += f"👥 Реферальный бонус: +{referral_bonus:.0f}₽"

    await message.answer(response)
