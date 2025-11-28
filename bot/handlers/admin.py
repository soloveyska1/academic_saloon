from aiogram import Router, F, Bot
from aiogram.filters import Command, CommandObject, StateFilter
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
    OwnerStatusOverride,
    get_owner_status,
    get_random_saloon_quote,
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
        [
            InlineKeyboardButton(text="🔧 Превью ошибки", callback_data="admin_error_preview")
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
    """Меню управления статусом — обновлённое с быстрыми кнопками"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🚦 Загрузка", callback_data="admin_load_status"),
            InlineKeyboardButton(text="🤠 Хозяин", callback_data="admin_owner_status")
        ],
        [
            InlineKeyboardButton(text="👥 Клиенты", callback_data="admin_clients_count"),
            InlineKeyboardButton(text="📋 Заказы", callback_data="admin_orders_count")
        ],
        [
            InlineKeyboardButton(text="💬 Цитата", callback_data="admin_quote"),
            InlineKeyboardButton(text="👁 Предпросмотр", callback_data="admin_preview_pin")
        ],
        [
            InlineKeyboardButton(text="📤 Отправить закреп", callback_data="admin_send_pin")
        ],
        [
            InlineKeyboardButton(text="🔄 Обновить у всех", callback_data="admin_update_pin")
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


def get_owner_status_keyboard(current: str) -> InlineKeyboardMarkup:
    """Клавиатура выбора статуса Хозяина"""
    # Отмечаем текущий статус галочкой
    auto_mark = "✓ " if current == OwnerStatusOverride.AUTO.value else ""
    online_mark = "✓ " if current == OwnerStatusOverride.ONLINE.value else ""
    offline_mark = "✓ " if current == OwnerStatusOverride.OFFLINE.value else ""

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"{online_mark}🟢 На связи",
                callback_data="admin_set_owner_online"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{offline_mark}🌙 Отдыхаю",
                callback_data="admin_set_owner_offline"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{auto_mark}⚡ Авто (по времени)",
                callback_data="admin_set_owner_auto"
            )
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


def get_quick_count_keyboard(entity: str, current: int) -> InlineKeyboardMarkup:
    """Клавиатура с быстрыми кнопками +/- для клиентов/заказов"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="−5", callback_data=f"admin_quick_{entity}_-5"),
            InlineKeyboardButton(text="−1", callback_data=f"admin_quick_{entity}_-1"),
            InlineKeyboardButton(text=f"[ {current} ]", callback_data="noop"),
            InlineKeyboardButton(text="+1", callback_data=f"admin_quick_{entity}_+1"),
            InlineKeyboardButton(text="+5", callback_data=f"admin_quick_{entity}_+5"),
        ],
        [
            InlineKeyboardButton(text="✏️ Ввести число", callback_data=f"admin_{entity}_manual")
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
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


def get_payment_confirm_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    """Клавиатура подтверждения оплаты для админа"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Подтвердить", callback_data=f"confirm_payment:{order_id}"),
            InlineKeyboardButton(text="❌ Не пришло", callback_data=f"reject_payment:{order_id}:{user_id}"),
        ],
        [
            InlineKeyboardButton(text="💬 Написать клиенту", url=f"tg://user?id={user_id}"),
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                        ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.message(Command("admin"), StateFilter("*"))
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


@router.message(Command("error_preview"), StateFilter("*"))
async def cmd_error_preview(message: Message, bot: Bot):
    """Превью сообщения об ошибке — для проверки как выглядит"""
    if not is_admin(message.from_user.id):
        return

    from bot.middlewares.error_handler import send_error_preview

    await message.answer("📤  Отправляю превью сообщения об ошибке...")
    await send_error_preview(
        bot=bot,
        chat_id=message.chat.id,
        user_name=message.from_user.first_name or "Партнёр"
    )


@router.callback_query(F.data == "admin_error_preview")
async def admin_error_preview(callback: CallbackQuery, bot: Bot):
    """Превью сообщения об ошибке — кнопка в админке"""
    if not is_admin(callback.from_user.id):
        return

    await callback.answer("Отправляю превью...")

    from bot.middlewares.error_handler import send_error_preview

    await send_error_preview(
        bot=bot,
        chat_id=callback.message.chat.id,
        user_name=callback.from_user.first_name or "Партнёр"
    )


@router.message(Command("orders"), StateFilter("*"))
async def cmd_orders(message: Message, session: AsyncSession, state: FSMContext):
    """Быстрый просмотр заявок"""
    if not is_admin(message.from_user.id):
        return
    await state.clear()

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
    """Показать меню управления статусом — обновлённое"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer()

    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    load_emoji, load_title, _ = LOAD_STATUS_DISPLAY[load]

    # Статус Хозяина
    owner_emoji, owner_text = get_owner_status(status)
    owner_mode = OwnerStatusOverride(status.owner_status_override)
    owner_mode_text = {
        OwnerStatusOverride.AUTO: "авто",
        OwnerStatusOverride.ONLINE: "вручную",
        OwnerStatusOverride.OFFLINE: "вручную",
    }.get(owner_mode, "авто")

    # Цитата
    quote = get_random_saloon_quote()

    text = f"""📊  <b>УПРАВЛЕНИЕ ЗАКРЕПОМ</b>

<b>Текущий статус:</b>

{load_emoji} Загрузка: <b>{load_title}</b>
👥 Клиентов: <b>{status.clients_count}</b>
📋 В работе: <b>{status.orders_in_progress}</b>
{owner_emoji} Хозяин: <b>{owner_text}</b> <i>({owner_mode_text})</i>
💬 Цитата: <i>{quote[:30]}...</i>

📌 Закреп: {"✅ настроен" if status.pinned_message_id else "❌ не настроен"}"""

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

    # Возвращаемся в главное меню статуса
    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    load_emoji, load_title, _ = LOAD_STATUS_DISPLAY[load]

    # Статус Хозяина
    owner_emoji, owner_text = get_owner_status(status)
    owner_mode = OwnerStatusOverride(status.owner_status_override)
    owner_mode_text = {
        OwnerStatusOverride.AUTO: "авто",
        OwnerStatusOverride.ONLINE: "вручную",
        OwnerStatusOverride.OFFLINE: "вручную",
    }.get(owner_mode, "авто")

    quote = get_random_saloon_quote()

    text = f"""📊  <b>УПРАВЛЕНИЕ ЗАКРЕПОМ</b>

<b>Текущий статус:</b>

{load_emoji} Загрузка: <b>{load_title}</b>
👥 Клиентов: <b>{status.clients_count}</b>
📋 В работе: <b>{status.orders_in_progress}</b>
{owner_emoji} Хозяин: <b>{owner_text}</b> <i>({owner_mode_text})</i>
💬 Цитата: <i>{quote[:30]}...</i>

📌 Закреп: {"✅ настроен" if status.pinned_message_id else "❌ не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ КЛИЕНТАМИ СЕЙЧАС
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_clients_count")
async def show_clients_menu(callback: CallbackQuery):
    """Показать меню управления клиентами с быстрыми кнопками"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()

    text = f"""👥  <b>КЛИЕНТЫ</b>

Сейчас: <b>{status.clients_count}</b>

<i>Используй кнопки для быстрого изменения:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_quick_count_keyboard("clients", status.clients_count)
    )


@router.callback_query(F.data.startswith("admin_quick_clients_"))
async def quick_change_clients(callback: CallbackQuery):
    """Быстрое изменение количества клиентов"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    delta = int(callback.data.split("_")[-1])
    status = await saloon_manager.get_status()
    new_count = max(0, status.clients_count + delta)
    await saloon_manager.set_clients_count(new_count)

    await callback.answer(f"Клиентов: {new_count}")

    text = f"""👥  <b>КЛИЕНТЫ</b>

Сейчас: <b>{new_count}</b>

<i>Используй кнопки для быстрого изменения:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_quick_count_keyboard("clients", new_count)
    )


@router.callback_query(F.data == "admin_clients_manual")
async def ask_clients_manual(callback: CallbackQuery, state: FSMContext):
    """Запросить ручной ввод количества клиентов"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()

    text = f"""👥  <b>Ввод числа клиентов</b>

Текущее: <b>{status.clients_count}</b>

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
async def show_orders_menu(callback: CallbackQuery):
    """Показать меню управления заказами с быстрыми кнопками"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()

    text = f"""📋  <b>ЗАКАЗЫ В РАБОТЕ</b>

Сейчас: <b>{status.orders_in_progress}</b>

<i>Используй кнопки для быстрого изменения:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_quick_count_keyboard("orders", status.orders_in_progress)
    )


@router.callback_query(F.data.startswith("admin_quick_orders_"))
async def quick_change_orders(callback: CallbackQuery):
    """Быстрое изменение количества заказов"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    delta = int(callback.data.split("_")[-1])
    status = await saloon_manager.get_status()
    new_count = max(0, status.orders_in_progress + delta)
    await saloon_manager.set_orders_in_progress(new_count)

    await callback.answer(f"Заказов: {new_count}")

    text = f"""📋  <b>ЗАКАЗЫ В РАБОТЕ</b>

Сейчас: <b>{new_count}</b>

<i>Используй кнопки для быстрого изменения:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_quick_count_keyboard("orders", new_count)
    )


@router.callback_query(F.data == "admin_orders_manual")
async def ask_orders_manual(callback: CallbackQuery, state: FSMContext):
    """Запросить ручной ввод количества заказов"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()

    text = f"""📋  <b>Ввод числа заказов</b>

Текущее: <b>{status.orders_in_progress}</b>

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
#                    СТАТУС ХОЗЯИНА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_owner_status")
async def show_owner_status_menu(callback: CallbackQuery):
    """Показать меню выбора статуса Хозяина"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()
    owner_emoji, owner_text = get_owner_status(status)

    text = f"""🤠  <b>СТАТУС ХОЗЯИНА</b>

Текущий: {owner_emoji} <b>{owner_text}</b>

<b>Режимы:</b>
🟢 <b>На связи</b> — принудительно онлайн
🌙 <b>Отдыхаю</b> — выходной/недоступен
⚡ <b>Авто</b> — по времени МСК (9:00-22:00)

<i>Выбери режим:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_owner_status_keyboard(status.owner_status_override)
    )


@router.callback_query(F.data == "admin_set_owner_online")
async def set_owner_online(callback: CallbackQuery):
    """Установить статус Хозяина — На связи"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await saloon_manager.set_owner_status(OwnerStatusOverride.ONLINE)
    await callback.answer("🟢 Установлено: На связи", show_alert=True)

    # Возвращаемся в меню статуса хозяина
    status = await saloon_manager.get_status()
    owner_emoji, owner_text = get_owner_status(status)

    text = f"""🤠  <b>СТАТУС ХОЗЯИНА</b>

Текущий: {owner_emoji} <b>{owner_text}</b>

<b>Режимы:</b>
🟢 <b>На связи</b> — принудительно онлайн
🌙 <b>Отдыхаю</b> — выходной/недоступен
⚡ <b>Авто</b> — по времени МСК (9:00-22:00)

<i>Выбери режим:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_owner_status_keyboard(status.owner_status_override)
    )


@router.callback_query(F.data == "admin_set_owner_offline")
async def set_owner_offline(callback: CallbackQuery):
    """Установить статус Хозяина — Отдыхаю"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await saloon_manager.set_owner_status(OwnerStatusOverride.OFFLINE)
    await callback.answer("🌙 Установлено: Отдыхаю", show_alert=True)

    status = await saloon_manager.get_status()
    owner_emoji, owner_text = get_owner_status(status)

    text = f"""🤠  <b>СТАТУС ХОЗЯИНА</b>

Текущий: {owner_emoji} <b>{owner_text}</b>

<b>Режимы:</b>
🟢 <b>На связи</b> — принудительно онлайн
🌙 <b>Отдыхаю</b> — выходной/недоступен
⚡ <b>Авто</b> — по времени МСК (9:00-22:00)

<i>Выбери режим:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_owner_status_keyboard(status.owner_status_override)
    )


@router.callback_query(F.data == "admin_set_owner_auto")
async def set_owner_auto(callback: CallbackQuery):
    """Установить статус Хозяина — Авто"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await saloon_manager.set_owner_status(OwnerStatusOverride.AUTO)
    await callback.answer("⚡ Установлено: Авто", show_alert=True)

    status = await saloon_manager.get_status()
    owner_emoji, owner_text = get_owner_status(status)

    text = f"""🤠  <b>СТАТУС ХОЗЯИНА</b>

Текущий: {owner_emoji} <b>{owner_text}</b>

<b>Режимы:</b>
🟢 <b>На связи</b> — принудительно онлайн
🌙 <b>Отдыхаю</b> — выходной/недоступен
⚡ <b>Авто</b> — по времени МСК (9:00-22:00)

<i>Выбери режим:</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_owner_status_keyboard(status.owner_status_override)
    )


# ══════════════════════════════════════════════════════════════
#                    ПРЕДПРОСМОТР И ЦИТАТА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_preview_pin")
async def preview_pin(callback: CallbackQuery):
    """Предпросмотр закрепа"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    status = await saloon_manager.get_status()
    preview = generate_status_message(status)

    # Отправляем предпросмотр отдельным сообщением
    await callback.message.answer(
        f"👁 <b>ПРЕДПРОСМОТР ЗАКРЕПА:</b>\n\n{'─' * 20}\n\n{preview}\n\n{'─' * 20}",
        reply_markup=get_back_to_status_keyboard()
    )


@router.callback_query(F.data == "admin_quote")
async def show_quote_info(callback: CallbackQuery):
    """Информация о цитате"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()
    quote = get_random_saloon_quote()

    text = f"""💬  <b>ЦИТАТА В ЗАКРЕПЕ</b>

Текущая: <i>{quote}</i>

<i>Цитата меняется автоматически каждые 10 минут.
При обновлении закрепа она обновится.</i>"""

    await callback.message.edit_text(text, reply_markup=get_back_to_status_keyboard())


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

@router.message(Command("user"), StateFilter("*"))
async def cmd_user_info(message: Message, command: CommandObject, session: AsyncSession, state: FSMContext):
    """
    Показать полную информацию о пользователе.
    Использование: /user 123456789 или /user @username
    """
    if not is_admin(message.from_user.id):
        return
    await state.clear()

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
#                    УПРАВЛЕНИЕ БОНУСАМИ
# ══════════════════════════════════════════════════════════════

def get_bonus_keyboard(user_id: int) -> InlineKeyboardMarkup:
    """Клавиатура управления бонусами"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="➕ 50", callback_data=f"bonus_add:{user_id}:50"),
            InlineKeyboardButton(text="➕ 100", callback_data=f"bonus_add:{user_id}:100"),
            InlineKeyboardButton(text="➕ 500", callback_data=f"bonus_add:{user_id}:500"),
        ],
        [
            InlineKeyboardButton(text="➖ 50", callback_data=f"bonus_sub:{user_id}:50"),
            InlineKeyboardButton(text="➖ 100", callback_data=f"bonus_sub:{user_id}:100"),
            InlineKeyboardButton(text="➖ 500", callback_data=f"bonus_sub:{user_id}:500"),
        ],
        [
            InlineKeyboardButton(text="✏️ Ввести сумму", callback_data=f"bonus_custom:{user_id}"),
        ],
        [
            InlineKeyboardButton(text="💬 Написать", url=f"tg://user?id={user_id}"),
            InlineKeyboardButton(text="📋 Профиль", callback_data=f"bonus_profile:{user_id}"),
        ],
    ])


@router.message(Command("bonus"), StateFilter("*"))
async def cmd_bonus(message: Message, command: CommandObject, session: AsyncSession, state: FSMContext):
    """
    Управление бонусами пользователя.
    Использование: /bonus 123456789 или /bonus @username
    """
    if not is_admin(message.from_user.id):
        return
    await state.clear()

    if not command.args:
        await message.answer(
            "💰  <b>Управление бонусами</b>\n\n"
            "<code>/bonus 123456789</code> — по Telegram ID\n"
            "<code>/bonus @username</code> — по юзернейму"
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

    text = f"""💰  <b>Бонусы пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

━━━━━━━━━━━━━━━━━━━━━

💳  <b>Баланс: {user.balance:.0f} ₽</b>

━━━━━━━━━━━━━━━━━━━━━

Выбери действие 👇"""

    await message.answer(text, reply_markup=get_bonus_keyboard(user.telegram_id))


@router.callback_query(F.data.startswith("bonus_add:"))
async def bonus_add_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Добавить бонусы"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    user_id = int(parts[1])
    amount = int(parts[2])

    # Находим пользователя
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    # Начисляем бонусы
    new_balance = await BonusService.add_bonus(
        session=session,
        user_id=user_id,
        amount=amount,
        reason=BonusReason.ADMIN_ADJUSTMENT,
        description=f"Начисление админом: +{amount}₽",
        bot=bot,
    )

    await callback.answer(f"✅ +{amount}₽ начислено")

    # Обновляем сообщение
    text = f"""💰  <b>Бонусы пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

━━━━━━━━━━━━━━━━━━━━━

💳  <b>Баланс: {new_balance:.0f} ₽</b>
✅  <i>+{amount}₽ начислено</i>

━━━━━━━━━━━━━━━━━━━━━

Выбери действие 👇"""

    await callback.message.edit_text(text, reply_markup=get_bonus_keyboard(user_id))

    # Уведомляем пользователя
    try:
        await bot.send_message(
            user_id,
            f"🎁 <b>Тебе начислено {amount}₽ бонусов!</b>\n\n"
            f"Баланс: {new_balance:.0f}₽\n"
            f"Используй при следующем заказе 🤠"
        )
    except Exception:
        pass


@router.callback_query(F.data.startswith("bonus_sub:"))
async def bonus_sub_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Списать бонусы"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    user_id = int(parts[1])
    amount = int(parts[2])

    # Находим пользователя
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    if user.balance < amount:
        await callback.answer(f"Недостаточно бонусов! Баланс: {user.balance:.0f}₽", show_alert=True)
        return

    # Списываем бонусы
    success, new_balance = await BonusService.deduct_bonus(
        session=session,
        user_id=user_id,
        amount=amount,
        reason=BonusReason.ADMIN_ADJUSTMENT,
        description=f"Списание админом: -{amount}₽",
        bot=bot,
        user=user,
    )
    await session.commit()

    await callback.answer(f"✅ -{amount}₽ списано")

    # Обновляем сообщение
    text = f"""💰  <b>Бонусы пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

━━━━━━━━━━━━━━━━━━━━━

💳  <b>Баланс: {new_balance:.0f} ₽</b>
🔻  <i>-{amount}₽ списано</i>

━━━━━━━━━━━━━━━━━━━━━

Выбери действие 👇"""

    await callback.message.edit_text(text, reply_markup=get_bonus_keyboard(user_id))


@router.callback_query(F.data.startswith("bonus_custom:"))
async def bonus_custom_callback(callback: CallbackQuery, state: FSMContext):
    """Ввести произвольную сумму"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    user_id = int(callback.data.split(":")[1])

    await state.set_state(AdminStates.waiting_bonus_amount)
    await state.update_data(bonus_user_id=user_id)

    await callback.answer()
    await callback.message.edit_text(
        "✏️  <b>Введи сумму</b>\n\n"
        "Положительное число — начислить\n"
        "Отрицательное число — списать\n\n"
        "Примеры:\n"
        "<code>250</code> — начислить 250₽\n"
        "<code>-150</code> — списать 150₽\n\n"
        "Для отмены: /cancel",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data=f"bonus_cancel:{user_id}")]
        ])
    )


@router.callback_query(F.data.startswith("bonus_cancel:"))
async def bonus_cancel_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Отмена ввода суммы"""
    await state.clear()
    user_id = int(callback.data.split(":")[1])

    # Находим пользователя для отображения
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if user:
        text = f"""💰  <b>Бонусы пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

━━━━━━━━━━━━━━━━━━━━━

💳  <b>Баланс: {user.balance:.0f} ₽</b>

━━━━━━━━━━━━━━━━━━━━━

Выбери действие 👇"""
        await callback.message.edit_text(text, reply_markup=get_bonus_keyboard(user_id))
    else:
        await callback.message.edit_text("❌ Пользователь не найден")

    await callback.answer("Отменено")


@router.message(AdminStates.waiting_bonus_amount)
async def process_bonus_amount(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода суммы бонусов"""
    if not is_admin(message.from_user.id):
        return

    try:
        amount = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число. Пример: <code>250</code> или <code>-150</code>")
        return

    data = await state.get_data()
    user_id = data.get("bonus_user_id")

    if not user_id:
        await message.answer("❌ Ошибка. Попробуй снова: /bonus")
        await state.clear()
        return

    # Находим пользователя
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await message.answer("❌ Пользователь не найден")
        await state.clear()
        return

    await state.clear()

    if amount > 0:
        # Начисление
        new_balance = await BonusService.add_bonus(
            session=session,
            user_id=user_id,
            amount=amount,
            reason=BonusReason.ADMIN_ADJUSTMENT,
            description=f"Начисление админом: +{amount}₽",
            bot=bot,
        )
        action_text = f"✅ +{amount}₽ начислено"

        # Уведомляем пользователя
        try:
            await bot.send_message(
                user_id,
                f"🎁 <b>Тебе начислено {amount}₽ бонусов!</b>\n\n"
                f"Баланс: {new_balance:.0f}₽\n"
                f"Используй при следующем заказе 🤠"
            )
        except Exception:
            pass

    elif amount < 0:
        # Списание
        abs_amount = abs(amount)
        if user.balance < abs_amount:
            await message.answer(
                f"❌ Недостаточно бонусов!\n"
                f"Баланс: {user.balance:.0f}₽, пытаешься списать: {abs_amount}₽",
                reply_markup=get_bonus_keyboard(user_id)
            )
            return

        success, new_balance = await BonusService.deduct_bonus(
            session=session,
            user_id=user_id,
            amount=abs_amount,
            reason=BonusReason.ADMIN_ADJUSTMENT,
            description=f"Списание админом: -{abs_amount}₽",
            bot=bot,
            user=user,
        )
        await session.commit()
        action_text = f"🔻 -{abs_amount}₽ списано"
    else:
        await message.answer("❌ Сумма должна быть не равна нулю")
        return

    # Обновляем баланс в объекте для отображения
    query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    text = f"""💰  <b>Бонусы пользователя</b>

👤  <b>{user.fullname or 'Без имени'}</b>
🔗  @{user.username or '—'} · <code>{user.telegram_id}</code>

━━━━━━━━━━━━━━━━━━━━━

💳  <b>Баланс: {user.balance:.0f} ₽</b>
{action_text}

━━━━━━━━━━━━━━━━━━━━━

Выбери действие 👇"""

    await message.answer(text, reply_markup=get_bonus_keyboard(user_id))


@router.callback_query(F.data.startswith("bonus_profile:"))
async def bonus_profile_callback(callback: CallbackQuery, session: AsyncSession, state: FSMContext):
    """Перейти к профилю пользователя"""
    user_id = int(callback.data.split(":")[1])
    await callback.answer()

    # Имитируем команду /user
    from aiogram.types import Message as FakeMessage

    # Просто покажем сообщение с предложением
    await callback.message.answer(f"👤 Профиль: <code>/user {user_id}</code>")


# ══════════════════════════════════════════════════════════════
#                    НАЗНАЧЕНИЕ ЦЕНЫ ЗАКАЗУ
# ══════════════════════════════════════════════════════════════

@router.message(Command("price"), StateFilter("*"))
async def cmd_price(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Назначить цену заказу и отправить клиенту
    Использование: /price [order_id] [цена]
    Пример: /price 123 5000
    """
    if not is_admin(message.from_user.id):
        return
    await state.clear()

    if not command.args:
        await message.answer(
            "❌ Использование: /price [order_id] [цена]\n"
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
    half_amount = final_price / 2

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    if bonus_to_use > 0:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}
💵 Стоимость: {price:.0f}₽
🎁 Бонусы: −{bonus_to_use:.0f}₽

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
            [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
            [InlineKeyboardButton(text="💎 Сохранить бонусы", callback_data=f"price_no_bonus:{order.id}")],
        ])
    else:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
            [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
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


@router.callback_query(F.data.startswith("pay_scheme:"))
async def pay_scheme_callback(callback: CallbackQuery, session: AsyncSession):
    """Клиент выбрал схему оплаты (100% или 50%)"""
    parts = callback.data.split(":")
    scheme = parts[1]  # full или half
    order_id = int(parts[2])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Сохраняем схему оплаты
    order.payment_scheme = scheme
    await session.commit()

    await callback.answer()

    # Рассчитываем сумму к оплате
    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    if scheme == "half":
        amount_now = final_price / 2
        amount_later = final_price - amount_now
        scheme_text = f"📋 50% аванс\n\n<b>К оплате сейчас: {amount_now:.0f}₽</b>\nОстаток после проверки: {amount_later:.0f}₽"
    else:
        amount_now = final_price
        scheme_text = f"⚡ 100% сразу\n\n<b>К оплате: {amount_now:.0f}₽</b>"

    # Показываем выбор способа оплаты
    from bot.services.yookassa import get_yookassa_service
    yookassa = get_yookassa_service()

    buttons = []
    if yookassa.is_available:
        buttons.append([InlineKeyboardButton(text="💳 Оплатить картой", callback_data=f"pay_method:card:{order_id}")])

    buttons.extend([
        [InlineKeyboardButton(text="📲 Перевод по СБП", callback_data=f"pay_method:sbp:{order_id}")],
        [InlineKeyboardButton(text="🏦 Перевод на карту", callback_data=f"pay_method:transfer:{order_id}")],
        [InlineKeyboardButton(text="◀️ Назад", callback_data=f"pay_back:{order_id}")],
    ])

    text = f"""💳 <b>Оплата заказа #{order_id}</b>

{scheme_text}

Выбери способ оплаты:"""

    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))


@router.callback_query(F.data.startswith("pay_back:"))
async def pay_back_callback(callback: CallbackQuery, session: AsyncSession):
    """Вернуться к выбору схемы оплаты"""
    order_id = int(callback.data.split(":")[1])

    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    await callback.answer()

    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    half_amount = final_price / 2
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    if order.bonus_used and order.bonus_used > 0:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}
💵 Стоимость: {order.price:.0f}₽
🎁 Бонусы: −{order.bonus_used:.0f}₽

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""
    else:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
        [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
    ])

    await callback.message.edit_text(client_text, reply_markup=kb)


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

    # Показываем выбор схемы оплаты без бонусов
    final_price = order.price
    half_amount = final_price / 2
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    new_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}

<b>К оплате: {order.price:.0f}₽</b>
💎 Бонусы сохранены на балансе

Выбери схему оплаты:"""

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
        [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
    ])

    await callback.message.edit_text(new_text, reply_markup=kb)


# ══════════════════════════════════════════════════════════════
#                    СПОСОБЫ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

def get_payment_amount(order: Order) -> float:
    """Получить сумму к оплате с учётом схемы"""
    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    if order.payment_scheme == "half":
        return final_price / 2
    return final_price


def get_payment_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Клавиатура для сообщения с реквизитами"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Я оплатил",
                callback_data=f"client_paid:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать в поддержку",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ]
    ])


@router.callback_query(F.data.startswith("pay_method:"))
async def pay_method_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент выбрал способ оплаты"""
    parts = callback.data.split(":")
    method = parts[1]  # card, sbp, transfer
    order_id = int(parts[2])

    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Сохраняем способ оплаты
    order.payment_method = method
    await session.commit()

    amount = get_payment_amount(order)

    if method == "card":
        # Онлайн-оплата через ЮKassa
        from bot.services.yookassa import get_yookassa_service
        yookassa = get_yookassa_service()

        if not yookassa.is_available:
            await callback.answer("Онлайн-оплата временно недоступна", show_alert=True)
            return

        await callback.answer("Создаю ссылку для оплаты...")

        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"
        description = f"Заказ #{order.id}: {work_label}"

        result = await yookassa.create_payment(
            amount=amount,
            order_id=order.id,
            description=description,
            user_id=order.user_id
        )

        if result.success:
            order.yookassa_payment_id = result.payment_id
            await session.commit()

            text = f"""💳 <b>Оплата заказа #{order.id}</b>

<b>К оплате: {amount:.0f}₽</b>

Нажми кнопку для оплаты картой.
После оплаты вернись в бот — я пришлю подтверждение."""

            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="💳 Оплатить картой", url=result.payment_url)],
                [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"client_paid:{order_id}")],
                [InlineKeyboardButton(text="◀️ Другой способ", callback_data=f"pay_scheme:{order.payment_scheme}:{order_id}")],
            ])

            await callback.message.edit_text(text, reply_markup=kb)
        else:
            await callback.answer(f"Ошибка: {result.error}", show_alert=True)

    elif method == "sbp":
        # СБП по номеру телефона
        await callback.answer()

        text = f"""📲 <b>Оплата по СБП</b>

<b>К оплате: {amount:.0f}₽</b>

Переведи на номер:
📱 <code>{settings.PAYMENT_PHONE}</code>
{settings.PAYMENT_NAME}
{settings.PAYMENT_BANKS}

После перевода нажми «Я оплатил» 👇"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"client_paid:{order_id}")],
            [InlineKeyboardButton(text="◀️ Другой способ", callback_data=f"pay_scheme:{order.payment_scheme}:{order_id}")],
            [InlineKeyboardButton(text="💬 Написать в поддержку", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
        ])

        await callback.message.edit_text(text, reply_markup=kb)

    elif method == "transfer":
        # Перевод на карту
        await callback.answer()

        # Форматируем номер карты для читаемости
        card = settings.PAYMENT_CARD
        card_formatted = f"{card[:4]} {card[4:8]} {card[8:12]} {card[12:]}" if len(card) == 16 else card

        text = f"""🏦 <b>Перевод на карту</b>

<b>К оплате: {amount:.0f}₽</b>

Номер карты:
💳 <code>{settings.PAYMENT_CARD}</code>
{settings.PAYMENT_NAME}

После перевода нажми «Я оплатил» 👇"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"client_paid:{order_id}")],
            [InlineKeyboardButton(text="◀️ Другой способ", callback_data=f"pay_scheme:{order.payment_scheme}:{order_id}")],
            [InlineKeyboardButton(text="💬 Написать в поддержку", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
        ])

        await callback.message.edit_text(text, reply_markup=kb)


@router.callback_query(F.data.startswith("client_paid:"))
async def client_paid_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент нажал 'Я оплатил' — уведомляем админа"""
    order_id = int(callback.data.split(":")[1])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем что заказ ещё не оплачен полностью
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        return

    await callback.answer("👍 Отлично! Проверяю оплату...")

    # Определяем сумму к оплате (с учётом схемы)
    amount = get_payment_amount(order)
    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    # Текст в зависимости от схемы
    if order.payment_scheme == "half":
        scheme_info = f"\n📋 Схема: 50% аванс\n💵 Оплачено: {amount:.0f}₽ из {final_price:.0f}₽"
    else:
        scheme_info = ""

    # Обновляем сообщение клиенту
    new_text = f"""✅ <b>Заявка отправлена!</b>

Заказ #{order.id} · {amount:.0f}₽{scheme_info}

⏳ Проверяю оплату, обычно пара минут.
Напишу сразу как увижу перевод!"""

    # Оставляем только кнопку поддержки
    new_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💬 Написать в поддержку",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ]
    ])

    await callback.message.edit_text(new_text, reply_markup=new_keyboard)

    # Уведомляем админов
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    # Информация о схеме оплаты для админа
    scheme_label = "50% аванс" if order.payment_scheme == "half" else "100%"
    method_labels = {"card": "💳 Картой", "sbp": "📲 СБП", "transfer": "🏦 На карту"}
    method_label = method_labels.get(order.payment_method, "")

    admin_text = f"""💸 <b>Клиент заявил об оплате!</b>

📋 Заказ: #{order.id}
📝 {work_label}
💰 Сумма: {amount:.0f}₽ ({scheme_label})
{method_label}

👤 Клиент: @{callback.from_user.username or 'без username'}
🆔 ID: <code>{callback.from_user.id}</code>"""

    # Клавиатура с кнопками подтверждения
    keyboard = get_payment_confirm_keyboard(order.id, callback.from_user.id)

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=keyboard)
        except Exception:
            pass


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
    half_amount = final_price / 2

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    if bonus_to_use > 0:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}
💵 Стоимость: {price:.0f}₽
🎁 Бонусы: −{bonus_to_use:.0f}₽

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
            [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
            [InlineKeyboardButton(text="💎 Сохранить бонусы", callback_data=f"price_no_bonus:{order.id}")],
        ])
    else:
        client_text = f"""💰 <b>Заказ #{order.id} оценён!</b>

📝 {work_label}

<b>К оплате: {final_price:.0f}₽</b>

Выбери схему оплаты:"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=f"⚡ 100% сразу ({final_price:.0f}₽)", callback_data=f"pay_scheme:full:{order.id}")],
            [InlineKeyboardButton(text=f"📋 50% аванс ({half_amount:.0f}₽)", callback_data=f"pay_scheme:half:{order.id}")],
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
#                    КНОПКИ ПОДТВЕРЖДЕНИЯ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("confirm_payment:"))
async def confirm_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Админ подтвердил оплату кнопкой"""
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

    # Проверка статуса
    if order.status == OrderStatus.PAID.value:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        return

    if order.status not in [OrderStatus.CONFIRMED.value, OrderStatus.IN_PROGRESS.value]:
        await callback.answer(
            f"Заказ нельзя отметить как оплаченный\nСтатус: {order.status_label}",
            show_alert=True
        )
        return

    if order.price <= 0:
        await callback.answer("У заказа не установлена цена!", show_alert=True)
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await callback.answer("Пользователь не найден", show_alert=True)
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
            user=user,
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
    order_bonus = 0
    try:
        order_bonus = await BonusService.process_order_bonus(
            session=session,
            bot=bot,
            user_id=order.user_id,
        )
    except Exception:
        pass

    # Начисляем реферальные бонусы (если есть реферер)
    if user.referrer_id:
        try:
            await BonusService.process_referral_bonus(
                session=session,
                bot=bot,
                referrer_id=user.referrer_id,
                order_amount=order.price,
                referred_user_id=order.user_id,
            )
        except Exception:
            pass

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
        pass

    # Обновляем сообщение админу
    await callback.answer("✅ Оплата подтверждена!")

    new_text = callback.message.text + f"\n\n✅ <b>ОПЛАЧЕНО</b> ({order.paid_amount:.0f}₽)"
    try:
        await callback.message.edit_text(new_text, reply_markup=None)
    except Exception:
        pass


@router.callback_query(F.data.startswith("reject_payment:"))
async def reject_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Админ указал что оплата не пришла"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    order_id = int(parts[1])
    user_id = int(parts[2])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    # Уведомляем клиента с интерактивными кнопками
    client_text = f"""🔍 <b>Хм, пока не вижу перевод...</b>

Заказ #{order.id} · {final_price:.0f}₽

Бывает! Проверь:
• Правильные ли реквизиты
• Ушёл ли перевод (иногда банк задерживает)

Если точно оплатил — жми кнопку 👇"""

    # Клавиатура с действиями для клиента
    client_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Я точно оплатил!",
                callback_data=f"retry_payment_check:{order.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="📸 Скинуть скриншот",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
            InlineKeyboardButton(
                text="💳 Реквизиты",
                callback_data=f"show_requisites:{order.id}"
            ),
        ],
    ])

    try:
        await bot.send_message(user_id, client_text, reply_markup=client_keyboard)
    except Exception:
        pass

    await callback.answer("Клиент уведомлён")

    # Обновляем сообщение админу — оставляем кнопки для повторной проверки
    new_text = callback.message.text + "\n\n⏳ <i>Клиент уведомлён что оплата не найдена</i>"
    try:
        await callback.message.edit_text(new_text, reply_markup=callback.message.reply_markup)
    except Exception:
        pass


@router.callback_query(F.data.startswith("retry_payment_check:"))
async def retry_payment_check_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент настаивает что оплатил — уведомляем админа повторно"""
    order_id = int(callback.data.split(":")[1])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if order.status == OrderStatus.PAID.value:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        # Обновляем сообщение
        try:
            await callback.message.edit_text(
                "✅ <b>Оплата уже подтверждена!</b>\n\n"
                f"Заказ #{order.id} в работе.",
                reply_markup=None
            )
        except Exception:
            pass
        return

    await callback.answer("👍 Передал! Проверю ещё раз")

    # Обновляем сообщение клиенту
    try:
        await callback.message.edit_text(
            f"🔄 <b>Проверяю ещё раз...</b>\n\n"
            f"Заказ #{order.id}\n\n"
            f"Передал информацию, скоро отвечу!",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="💬 Написать в поддержку",
                    url=f"https://t.me/{settings.SUPPORT_USERNAME}"
                )]
            ])
        )
    except Exception:
        pass

    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    # Уведомляем админов
    admin_text = f"""🔄 <b>Клиент настаивает на оплате!</b>

📋 Заказ: #{order.id}
💰 Сумма: {final_price:.0f}₽

👤 Клиент: @{callback.from_user.username or 'без username'}
🆔 ID: <code>{callback.from_user.id}</code>

⚠️ Говорит что точно оплатил — проверь внимательнее"""

    keyboard = get_payment_confirm_keyboard(order.id, callback.from_user.id)

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=keyboard)
        except Exception:
            pass


@router.callback_query(F.data.startswith("show_requisites:"))
async def show_requisites_callback(callback: CallbackQuery, session: AsyncSession):
    """Показать реквизиты клиенту повторно"""
    order_id = int(callback.data.split(":")[1])

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if order.status == OrderStatus.PAID.value:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        return

    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    # Показываем реквизиты
    requisites_text = f"""💳 <b>Реквизиты для оплаты</b>

Заказ #{order.id} · <b>{final_price:.0f}₽</b>

<code>{settings.PAYMENT_CARD}</code>
{settings.PAYMENT_BANK}
{settings.PAYMENT_NAME}

📌 Скопируй номер карты и переведи точную сумму.
После оплаты нажми «Я оплатил» 👇"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"client_paid:{order.id}"
        )],
        [InlineKeyboardButton(
            text="💬 Нужна помощь",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    await callback.answer()

    try:
        await callback.message.edit_text(requisites_text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(requisites_text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ПОДТВЕРЖДЕНИЕ ОПЛАТЫ (КОМАНДА)
# ══════════════════════════════════════════════════════════════

@router.message(Command("paid"), StateFilter("*"))
async def cmd_paid(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Подтвердить оплату заказа
    Использование: /paid [order_id]
    Пример: /paid 123
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[/paid] Команда вызвана пользователем {message.from_user.id}, args: {command.args}")

    if not is_admin(message.from_user.id):
        logger.warning(f"[/paid] Пользователь {message.from_user.id} не админ")
        return

    # Очищаем FSM состояние (если было активно)
    await state.clear()

    if not command.args:
        await message.answer(
            "❌ Использование: /paid [order_id]\n"
            "Пример: /paid 123"
        )
        return

    try:
        order_id = int(command.args.strip())
    except ValueError:
        await message.answer("❌ ID заказа должен быть числом")
        return

    logger.info(f"[/paid] Ищем заказ #{order_id}")

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    logger.info(f"[/paid] Заказ #{order_id} найден, статус: {order.status}, цена: {order.price}")

    # Проверка статуса - заказ должен быть подтверждён (ждёт оплаты)
    if order.status == OrderStatus.PAID.value:
        await message.answer(f"⚠️ Заказ #{order_id} уже оплачен")
        return

    if order.status not in [OrderStatus.CONFIRMED.value, OrderStatus.IN_PROGRESS.value]:
        await message.answer(
            f"⚠️ Заказ #{order_id} нельзя отметить как оплаченный\n"
            f"Текущий статус: {order.status_label}\n\n"
            f"Сначала установите цену командой /price {order_id} СУММА"
        )
        return

    # Проверяем что цена установлена
    if order.price <= 0:
        await message.answer(
            f"⚠️ У заказа #{order_id} не установлена цена\n"
            f"Сначала установите цену: /price {order_id} СУММА"
        )
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await message.answer(f"❌ Пользователь заказа #{order_id} не найден")
        return

    logger.info(f"[/paid] Пользователь найден: {user.telegram_id}, баланс: {user.balance}")

    # Списываем бонусы с баланса клиента (передаём user чтобы избежать проблем с сессией)
    bonus_deducted = 0
    if order.bonus_used > 0:
        logger.info(f"[/paid] Списываем бонусы: {order.bonus_used}")
        success, _ = await BonusService.deduct_bonus(
            session=session,
            user_id=order.user_id,
            amount=order.bonus_used,
            reason=BonusReason.ORDER_DISCOUNT,
            description=f"Списание на заказ #{order.id}",
            bot=bot,
            user=user,
        )
        if success:
            bonus_deducted = order.bonus_used
            logger.info(f"[/paid] Бонусы списаны успешно")
        else:
            logger.warning(f"[/paid] Не удалось списать бонусы")

    # Обновляем статус заказа
    order.status = OrderStatus.PAID.value
    order.paid_amount = order.final_price

    # Увеличиваем счётчик заказов и общую сумму
    user.orders_count += 1
    user.total_spent += order.paid_amount

    logger.info(f"[/paid] Коммитим изменения в БД")
    await session.commit()
    logger.info(f"[/paid] Заказ #{order_id} переведён в статус PAID")

    # Начисляем бонусы клиенту за оплаченный заказ (50₽)
    order_bonus = 0
    try:
        order_bonus = await BonusService.process_order_bonus(
            session=session,
            bot=bot,
            user_id=order.user_id,
        )
        logger.info(f"[/paid] Начислены бонусы за заказ: {order_bonus}")
    except Exception as e:
        logger.error(f"[/paid] Ошибка начисления бонусов за заказ: {e}")

    # Начисляем реферальные бонусы (если есть реферер)
    referral_bonus = 0
    if user.referrer_id:
        try:
            referral_bonus = await BonusService.process_referral_bonus(
                session=session,
                bot=bot,
                referrer_id=user.referrer_id,
                order_amount=order.price,  # 5% от полной цены
                referred_user_id=order.user_id,
            )
            logger.info(f"[/paid] Начислен реферальный бонус: {referral_bonus}")
        except Exception as e:
            logger.error(f"[/paid] Ошибка начисления реферального бонуса: {e}")

    # Уведомляем клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    bonus_line = f"\n\n🎁 +{order_bonus:.0f}₽ бонусов на баланс!" if order_bonus > 0 else ""

    client_text = f"""✅ <b>Оплата получена!</b>

Заказ #{order.id} — {work_label}

Спасибо за доверие! 🤠
Приступаю к работе.{bonus_line}"""

    try:
        await bot.send_message(order.user_id, client_text)
        logger.info(f"[/paid] Уведомление клиенту отправлено")
    except Exception as e:
        logger.warning(f"[/paid] Не удалось отправить уведомление клиенту: {e}")

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
    logger.info(f"[/paid] Команда выполнена успешно")
