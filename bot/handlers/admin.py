import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot

# Московский часовой пояс
MSK_TZ = ZoneInfo("Europe/Moscow")

logger = logging.getLogger(__name__)

# Пути к изображениям для P2P оплаты
PAYMENT_REQUEST_IMAGE_PATH = Path(__file__).parent.parent / "media" / "payment_request.jpg"
CASH_REGISTER_IMAGE_PATH = Path(__file__).parent.parent / "media" / "cash_register.jpg"
SAFE_PAYMENT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "safe_payment.jpg"
PAYMENT_SUCCESS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "payment_success.jpg"
CHECKING_PAYMENT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "checking_payment.jpg"

# Изображение для счёта/инвойса (рукопожатие/сделка)
IMG_PAYMENT_BILL = Path("/root/academic_saloon/bot/media/confirm_std.jpg")
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, ContentType, FSInputFile
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
    generate_status_message,
)
from bot.states.admin import AdminStates
from bot.states.order import OrderState
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send
from bot.handlers.start import process_start
from bot.services.live_cards import update_card_status

router = Router()


# ══════════════════════════════════════════════════════════════
#                        ФИЛЬТРЫ
# ══════════════════════════════════════════════════════════════

def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


def parse_callback_data(data: str, index: int, separator: str = ":") -> Optional[str]:
    """Безопасный парсинг callback_data по индексу"""
    parts = data.split(separator)
    return parts[index] if len(parts) > index else None


def parse_callback_int(data: str, index: int, separator: str = ":") -> Optional[int]:
    """Безопасный парсинг callback_data с преобразованием в int"""
    value = parse_callback_data(data, index, separator)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def build_price_offer_text(
    order_id: int,
    work_label: str,
    deadline: Optional[str],
    base_price: float,
    bonus_used: float,
    final_price: float,
    bonus_note: Optional[str] = None,
) -> str:
    """
    Формирует минималистичный текст счёта на оплату.
    Ultra-clean дизайн без разделителей.
    """
    # Строка с дедлайном (только если есть)
    deadline_line = f"⏱ <b>{deadline}</b>\n" if deadline else ""

    # Строка с бонусами
    if bonus_note:
        # Особый текст (например, "Бонусы сохранены на балансе")
        bonus_line = f"💎 <i>{bonus_note}</i>\n"
    elif bonus_used > 0:
        bonus_line = f"💎 Бонусы:  <code>−{bonus_used:.0f} ₽</code>\n"
    else:
        bonus_line = ""

    return f"""<b>💰 СЧЁТ НА ОПЛАТУ №{order_id}</b>

Шериф всё посчитал. Расклад такой:

📂 <b>{work_label}</b>
{deadline_line}
💵 Тариф:  <code>{base_price:.0f} ₽</code>
{bonus_line}
👉 <b>К ОПЛАТЕ: <code>{final_price:.0f} ₽</code></b>

<i>Выбирай, как удобнее платить.</i>"""


# ══════════════════════════════════════════════════════════════
#                        КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

def get_admin_keyboard() -> InlineKeyboardMarkup:
    """Главное меню админки — The Boss Dashboard"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📋 Заявки", callback_data="admin_orders_list"),
            InlineKeyboardButton(text="📊 Бухгалтерия", callback_data="admin_statistics"),
        ],
        [
            InlineKeyboardButton(text="📢 Рассылка", callback_data="admin_broadcast"),
        ],
        [
            InlineKeyboardButton(text="🔧 Статус Салуна", callback_data="admin_status_menu"),
        ],
        [
            InlineKeyboardButton(text="👶 Режим новичка", callback_data="admin_newbie_mode"),
            InlineKeyboardButton(text="🐛 Превью ошибки", callback_data="admin_error_preview"),
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
    """Меню управления статусом — simplified, always 24/7"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
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
    OrderStatus.WAITING_ESTIMATION.value: ("🔍", "Спецзаказ: ждёт цену"),
    OrderStatus.WAITING_PAYMENT.value: ("💳", "Ждёт оплаты"),
    OrderStatus.VERIFICATION_PENDING.value: ("🔔", "Проверка оплаты"),
    OrderStatus.CONFIRMED.value: ("✅", "Подтверждён"),  # legacy
    OrderStatus.PAID.value: ("💰", "Оплачен"),
    OrderStatus.IN_PROGRESS.value: ("⚙️", "В работе"),
    OrderStatus.REVIEW.value: ("👁", "На проверке"),
    OrderStatus.COMPLETED.value: ("✨", "Завершён"),
    OrderStatus.CANCELLED.value: ("❌", "Отменён"),
    OrderStatus.REJECTED.value: ("🚫", "Отклонён"),
}


def get_order_detail_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    """
    Клавиатура управления заказом — расширенная версия.

    Actions:
    - Сменить статус
    - Изменить цену (для спецзаказов и override)
    - Написать клиенту
    - Отправить файл
    - Отметить оплаченным
    - Отменить / Удалить
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Status & Price
        [
            InlineKeyboardButton(text="🔄 Статус", callback_data=f"admin_change_status:{order_id}"),
            InlineKeyboardButton(text="✏️ Цена", callback_data=f"admin_set_price:{order_id}"),
        ],
        # Row 2: Communication
        [
            InlineKeyboardButton(text="📩 Написать", callback_data=f"admin_msg_user:{order_id}:{user_id}"),
            InlineKeyboardButton(text="📤 Файл", callback_data=f"admin_send_file:{order_id}:{user_id}"),
        ],
        # Row 3: Quick actions
        [
            InlineKeyboardButton(text="✅ Оплачен", callback_data=f"admin_mark_paid:{order_id}"),
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"admin_cancel_order:{order_id}"),
        ],
        # Row 4: Danger zone
        [
            InlineKeyboardButton(text="🗑 Удалить", callback_data=f"admin_delete_order:{order_id}"),
        ],
        # Row 5: Navigation
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
            InlineKeyboardButton(text="✅ Подтвердить", callback_data=f"admin_confirm_payment:{order_id}"),
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
        await callback.answer("Доступ запрещён", show_alert=True)
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
            OrderStatus.WAITING_PAYMENT.value,
            OrderStatus.VERIFICATION_PENDING.value,
            OrderStatus.CONFIRMED.value,  # legacy
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
    verification_pending = [o for o in orders if o.status == OrderStatus.VERIFICATION_PENDING.value]
    waiting_payment = [o for o in orders if o.status in [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value]]
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

    if verification_pending:
        text += f"🔔 <b>ПРОВЕРЬ ОПЛАТУ ({len(verification_pending)}):</b>\n"
        for o in verification_pending[:5]:
            text += f"  • #{o.id} — {o.price:.0f}₽ ⚠️\n"
        text += "\n"

    if waiting_payment:
        text += f"💳 <b>Ждут оплаты ({len(waiting_payment)}):</b>\n"
        for o in waiting_payment[:5]:
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
    await callback.answer("⏳")

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

    await callback.answer("⏳")

    # Получаем все активные заявки
    query = (
        select(Order)
        .where(Order.status.in_([
            OrderStatus.PENDING.value,
            OrderStatus.WAITING_PAYMENT.value,
            OrderStatus.VERIFICATION_PENDING.value,
            OrderStatus.CONFIRMED.value,  # legacy
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
    verification_pending = [o for o in orders if o.status == OrderStatus.VERIFICATION_PENDING.value]
    waiting_payment = [o for o in orders if o.status in [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value]]
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

    if verification_pending:
        text += f"🔔 <b>ПРОВЕРЬ ОПЛАТУ ({len(verification_pending)}):</b>\n"
        for o in verification_pending[:5]:
            text += f"  • #{o.id} — {o.price:.0f}₽ ⚠️\n"
        if len(verification_pending) > 5:
            text += f"  <i>...и ещё {len(verification_pending) - 5}</i>\n"
        text += "\n"

    if waiting_payment:
        text += f"💳 <b>Ждут оплаты ({len(waiting_payment)}):</b>\n"
        for o in waiting_payment[:5]:
            text += f"  • #{o.id} — {o.price:.0f}₽\n"
        if len(waiting_payment) > 5:
            text += f"  <i>...и ещё {len(waiting_payment) - 5}</i>\n"
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

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await callback.answer("⏳")

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

    await callback.message.edit_text(text, reply_markup=get_order_detail_keyboard(order_id, order.user_id))


@router.callback_query(F.data.startswith("admin_change_status:"))
async def show_status_change_menu(callback: CallbackQuery):
    """Показать меню выбора нового статуса"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await callback.answer("⏳")

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
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

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
        order.completed_at = datetime.now(MSK_TZ)

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

    await callback.message.edit_text(text, reply_markup=get_order_detail_keyboard(order_id, order.user_id))


@router.callback_query(F.data.startswith("admin_cancel_order:"))
async def cancel_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отменить заказ"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await callback.answer("⏳")

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

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
    """Показать меню управления статусом — simplified, always 24/7"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer("⏳")

    status = await saloon_manager.get_status()

    text = f"""📊  <b>УПРАВЛЕНИЕ ЗАКРЕПОМ</b>

<b>Статус:</b> 🌟 Салун ОТКРЫТ 24/7

<i>Закреп показывает статичное сообщение
(без динамических статистик и offline статуса)</i>

📌 Закреп: {"✅ настроен" if status.pinned_message_id else "❌ не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ПРЕДПРОСМОТР ЗАКРЕПА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_preview_pin")
async def preview_pin(callback: CallbackQuery):
    """Предпросмотр закрепа — simplified static message"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer("⏳")
    preview = generate_status_message()

    # Отправляем предпросмотр отдельным сообщением
    await callback.message.answer(
        f"👁 <b>ПРЕДПРОСМОТР ЗАКРЕПА:</b>\n\n{'─' * 20}\n\n{preview}\n\n{'─' * 20}",
        reply_markup=get_back_to_status_keyboard()
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

    await callback.answer("⏳")
    await state.clear()

    # Предпросмотр сообщения
    status = await saloon_manager.get_status()
    preview = generate_status_message()

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

    chat_id = parse_callback_int(callback.data, 1)
    if chat_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await _send_pin_message(callback, bot, chat_id)


@router.callback_query(F.data == "admin_pin_manual")
async def ask_pin_manual(callback: CallbackQuery, state: FSMContext):
    """Запросить ID чата вручную"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer("⏳")

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
        text = generate_status_message()

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
        text = generate_status_message()

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
        text = generate_status_message()
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

    await callback.answer("⏳")
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
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    try:
        user_id = int(parts[1])
        amount = int(parts[2])
    except ValueError:
        await callback.answer("Некорректные данные", show_alert=True)
        return

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
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    try:
        user_id = int(parts[1])
        amount = int(parts[2])
    except ValueError:
        await callback.answer("Некорректные данные", show_alert=True)
        return

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

    user_id = parse_callback_int(callback.data, 1)
    if user_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    await state.set_state(AdminStates.waiting_bonus_amount)
    await state.update_data(bonus_user_id=user_id)

    await callback.answer("⏳")
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
    user_id = parse_callback_int(callback.data, 1)
    if user_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
    user_id = parse_callback_int(callback.data, 1)
    if user_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await callback.answer("⏳")

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

    # Формируем сообщение для клиента (Ultra-Clean Layout)
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    client_text = build_price_offer_text(
        order_id=order.id,
        work_label=work_label,
        deadline=order.deadline,
        base_price=price,
        bonus_used=bonus_to_use,
        final_price=final_price,
    )

    # Формируем клавиатуру
    buttons = [
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order.id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order.id}"
        )],
    ]

    # Кнопка "Не тратить бонусы" только если они были применены
    if bonus_to_use > 0:
        buttons.append([InlineKeyboardButton(
            text="🔄 Не тратить бонусы (Пересчитать)",
            callback_data=f"price_no_bonus:{order.id}"
        )])

    # Кнопка для вопросов/торга
    buttons.append([InlineKeyboardButton(
        text="💬 Обсудить условия",
        callback_data=f"price_question:{order.id}"
    )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    # Отправляем клиенту с картинкой
    try:
        if IMG_PAYMENT_BILL.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=order.user_id,
                    photo_path=IMG_PAYMENT_BILL,
                    caption=client_text,
                    reply_markup=kb,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить payment_bill image: {e}")
                await bot.send_message(order.user_id, client_text, reply_markup=kb)
        else:
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
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    scheme = parts[1]  # full или half
    try:
        order_id = int(parts[2])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

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

    await callback.answer("⏳")

    # Рассчитываем сумму к оплате
    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    if scheme == "half":
        amount_now = final_price / 2
        amount_later = final_price - amount_now
        amount_note = f"\n<i>Остаток {amount_later:.0f}₽ — после проверки работы.</i>"
    else:
        amount_now = final_price
        amount_note = ""

    # Ultra-Clean Payment Method Selection
    text = f"""<b>💳 КАССА ОТКРЫТА</b>

Сумма к оплате: <code>{amount_now:.0f} ₽</code>{amount_note}

Всё готово. Как тебе удобнее перекинуть средства?

⚡️ <b>СБП</b> — долетает мгновенно (по номеру телефона).
💳 <b>Карта</b> — классический перевод."""

    # Показываем выбор способа оплаты
    from bot.services.yookassa import get_yookassa_service
    yookassa = get_yookassa_service()

    buttons = []
    # СБП первый — самый быстрый способ
    buttons.append([InlineKeyboardButton(
        text="⚡️ СБП (Быстрый перевод)",
        callback_data=f"pay_method:sbp:{order_id}"
    )])
    buttons.append([InlineKeyboardButton(
        text="💳 Карта РФ (Сбер / Т-Банк)",
        callback_data=f"pay_method:transfer:{order_id}"
    )])

    # Онлайн-оплата если доступна (редко используется)
    if yookassa.is_available:
        buttons.append([InlineKeyboardButton(
            text="🌐 Онлайн-оплата (ЮKassa)",
            callback_data=f"pay_method:card:{order_id}"
        )])

    buttons.append([InlineKeyboardButton(
        text="🔙 Назад",
        callback_data=f"pay_back:{order_id}"
    )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    # Отправляем с картинкой если есть
    try:
        if CASH_REGISTER_IMAGE_PATH.exists():
            await send_cached_photo(
                bot=callback.bot,
                chat_id=callback.from_user.id,
                photo_path=CASH_REGISTER_IMAGE_PATH,
                caption=text,
                reply_markup=kb,
            )
            # Удаляем старое сообщение
            try:
                await callback.message.delete()
            except Exception:
                pass
        else:
            await safe_edit_or_send(callback, text, reply_markup=kb)
    except Exception as e:
        logger.warning(f"Не удалось отправить cash_register image: {e}")
        await safe_edit_or_send(callback, text, reply_markup=kb)


@router.callback_query(F.data.startswith("pay_back:"))
async def pay_back_callback(callback: CallbackQuery, session: AsyncSession):
    """Вернуться к выбору схемы оплаты"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    await callback.answer("⏳")

    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    half_amount = final_price / 2
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    # Ultra-Clean Layout
    client_text = build_price_offer_text(
        order_id=order.id,
        work_label=work_label,
        deadline=order.deadline,
        base_price=order.price,
        bonus_used=order.bonus_used or 0,
        final_price=final_price,
    )

    buttons = [
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order.id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order.id}"
        )],
    ]

    if order.bonus_used and order.bonus_used > 0:
        buttons.append([InlineKeyboardButton(
            text="🔄 Не тратить бонусы (Пересчитать)",
            callback_data=f"price_no_bonus:{order.id}"
        )])

    buttons.append([InlineKeyboardButton(
        text="💬 Обсудить условия",
        callback_data=f"price_question:{order.id}"
    )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    await safe_edit_or_send(callback, client_text, reply_markup=kb)


@router.callback_query(F.data.startswith("price_no_bonus:"))
async def price_no_bonus_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент отказался от списания бонусов — пересчёт без скидки"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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

    await callback.answer(f"✅ Бонусы сохранены! (+{bonus_was:.0f}₽ на балансе)")

    # Показываем выбор схемы оплаты без бонусов (Ultra-Clean Layout)
    final_price = order.price
    half_amount = final_price / 2
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    new_text = build_price_offer_text(
        order_id=order.id,
        work_label=work_label,
        deadline=order.deadline,
        base_price=order.price,
        bonus_used=0,
        final_price=final_price,
        bonus_note="Бонусы сохранены на балансе",
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order.id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order.id}"
        )],
        [InlineKeyboardButton(
            text="💬 Обсудить условия",
            callback_data=f"price_question:{order.id}"
        )],
    ])

    await safe_edit_or_send(callback, new_text, reply_markup=kb)


@router.callback_query(F.data.startswith("price_question:"))
async def price_question_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент хочет обсудить цену / торговаться"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    await callback.answer("📨 Связываюсь с Шерифом...")

    # Уведомляем клиента
    client_text = f"""💬 <b>Понял тебя!</b>

Заказ #{order.id} · {order.price:.0f}₽

Сейчас передам твой вопрос Шерифу лично. Он свяжется с тобой в ближайшее время, чтобы всё обсудить.

Можешь написать ему напрямую:
@{settings.SUPPORT_USERNAME}"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Написать Шерифу",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    # Удаляем старое сообщение (может быть фото) и отправляем новое
    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    await bot.send_message(chat_id=chat_id, text=client_text, reply_markup=keyboard)

    # Уведомляем админов
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    admin_text = f"""💬 <b>Клиент хочет обсудить условия!</b>

📋 Заказ: #{order.id}
📝 {work_label}
💰 Текущая цена: {order.price:.0f}₽

👤 Клиент: @{callback.from_user.username or 'без username'}
🆔 ID: <code>{callback.from_user.id}</code>

<i>Клиент хочет обсудить условия — возможно, стоит связаться.</i>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Написать клиенту",
            url=f"tg://user?id={callback.from_user.id}"
        )],
        [InlineKeyboardButton(
            text="📋 Детали заказа",
            callback_data=f"admin_order_detail:{order.id}"
        )],
    ])

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=admin_keyboard)
        except Exception:
            pass


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
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    method = parts[1]  # card, sbp, transfer
    try:
        order_id = int(parts[2])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

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

            await safe_edit_or_send(callback, text, reply_markup=kb)
        else:
            await callback.answer(f"Ошибка: {result.error}", show_alert=True)

    elif method == "sbp":
        # СБП по номеру телефона — Premium Design
        await callback.answer("⏳")

        text = f"""<b>⚡️ ОПЛАТА ПО СБП (МГНОВЕННО)</b>

К оплате: <b>{amount:.0f} ₽</b>

👇 <i>Нажми на номер, чтобы скопировать:</i>
<code>{settings.PAYMENT_PHONE}</code>

🏦 <b>Банк:</b> {settings.PAYMENT_BANKS}
👤 <b>Получатель:</b> {settings.PAYMENT_NAME}

⚠️ <i>После перевода нажми кнопку «Я оплатил».</i>"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"client_paid:{order_id}")],
            [InlineKeyboardButton(text="🔙 Выбрать другой способ", callback_data=f"pay_scheme:{order.payment_scheme}:{order_id}")],
            [InlineKeyboardButton(text="🆘 Проблема с оплатой", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
        ])

        # Отправляем с картинкой если есть
        try:
            if SAFE_PAYMENT_IMAGE_PATH.exists():
                await send_cached_photo(
                    bot=callback.bot,
                    chat_id=callback.from_user.id,
                    photo_path=SAFE_PAYMENT_IMAGE_PATH,
                    caption=text,
                    reply_markup=kb,
                )
                try:
                    await callback.message.delete()
                except Exception:
                    pass
            else:
                await safe_edit_or_send(callback, text, reply_markup=kb)
        except Exception as e:
            logger.warning(f"Не удалось отправить safe_payment image: {e}")
            await safe_edit_or_send(callback, text, reply_markup=kb)

    elif method == "transfer":
        # Перевод на карту — Premium Design
        await callback.answer("⏳")

        text = f"""<b>💳 ПЕРЕВОД НА КАРТУ</b>

К оплате: <b>{amount:.0f} ₽</b>

👇 <i>Нажми на номер карты, чтобы скопировать:</i>
<code>{settings.PAYMENT_CARD}</code>

👤 <b>Владелец:</b> {settings.PAYMENT_NAME}

⚠️ <i>После перевода нажми кнопку «Я оплатил».</i>"""

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"client_paid:{order_id}")],
            [InlineKeyboardButton(text="🔙 Выбрать другой способ", callback_data=f"pay_scheme:{order.payment_scheme}:{order_id}")],
            [InlineKeyboardButton(text="🆘 Проблема с оплатой", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
        ])

        # Отправляем с картинкой если есть
        try:
            if SAFE_PAYMENT_IMAGE_PATH.exists():
                await send_cached_photo(
                    bot=callback.bot,
                    chat_id=callback.from_user.id,
                    photo_path=SAFE_PAYMENT_IMAGE_PATH,
                    caption=text,
                    reply_markup=kb,
                )
                try:
                    await callback.message.delete()
                except Exception:
                    pass
            else:
                await safe_edit_or_send(callback, text, reply_markup=kb)
        except Exception as e:
            logger.warning(f"Не удалось отправить safe_payment image: {e}")
            await safe_edit_or_send(callback, text, reply_markup=kb)


@router.callback_query(F.data.startswith("client_paid:"))
async def client_paid_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Клиент нажал 'Я оплатил' — сразу уведомляем админа с кнопками подтверждения.
    БЕЗ обязательного чека — админ сам проверяет поступление.
    """
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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

    await callback.answer("🕵️‍♂️ Шериф получил сигнал...")

    # ═══ ОБНОВЛЯЕМ СТАТУС НА VERIFICATION_PENDING ═══
    order.status = OrderStatus.VERIFICATION_PENDING.value
    await session.commit()

    # ═══ УДАЛЯЕМ СТАРОЕ СООБЩЕНИЕ ═══
    try:
        await callback.message.delete()
    except Exception:
        pass

    # ═══ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЮ ═══
    amount = get_payment_amount(order)
    user_text = f"""🕵️‍♂️ <b>Платеж на проверке</b>

Заказ <b>#{order.id}</b> · {amount:.0f}₽

Шериф получил сигнал. Мы проверяем казну вручную.

💤 <b>Если сейчас ночь</b> — подтвердим утром.
✅ <b>Твой заказ зафиксирован</b>. Не волнуйся.

<i>Как только деньги придут — бот пришлет подтверждение.</i>"""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 В меню", callback_data="back_to_menu")],
    ])

    # Отправляем с картинкой если есть
    if CHECKING_PAYMENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.from_user.id,
                photo_path=CHECKING_PAYMENT_IMAGE_PATH,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить checking_payment image: {e}")
            await bot.send_message(
                chat_id=callback.from_user.id,
                text=user_text,
                reply_markup=user_keyboard
            )
    else:
        await bot.send_message(
            chat_id=callback.from_user.id,
            text=user_text,
            reply_markup=user_keyboard
        )

    # ═══ УВЕДОМЛЕНИЕ АДМИНАМ С КНОПКАМИ ВЕРИФИКАЦИИ ═══
    username = callback.from_user.username
    user_link = f"@{username}" if username else f"<a href='tg://user?id={callback.from_user.id}'>Пользователь</a>"

    admin_text = f"""🔔 <b>ПРОВЕРЬ ПОСТУПЛЕНИЕ!</b>

Заказ: <code>#{order.id}</code>
Клиент: {user_link}
Сумма: <b>{int(amount):,} ₽</b>
Способ: {order.payment_method or "—"}

<i>Клиент нажал кнопку. Проверь банк.</i>""".replace(",", " ")

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить ($)",
                callback_data=f"admin_verify_paid:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject_payment:{order_id}"
            ),
        ],
    ])

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=admin_keyboard)
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@router.callback_query(F.data.startswith("cancel_payment_check:"))
async def cancel_payment_check_callback(callback: CallbackQuery, session: AsyncSession, state: FSMContext):
    """Отмена отправки чека — возвращаем к выбору способа оплаты"""
    await state.clear()
    await callback.answer("Отменено")

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        return

    # Находим заказ для возврата к экрану оплаты
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        return

    # Возвращаем к выбору способа оплаты
    final_price = order.price - order.bonus_used if order.bonus_used else order.price
    amount = final_price / 2 if order.payment_scheme == "half" else final_price

    text = f"""<b>💳 КАССА ОТКРЫТА</b>

Сумма к оплате: <code>{amount:.0f} ₽</code>

Всё готово. Как тебе удобнее перекинуть средства?

⚡️ <b>СБП</b> — долетает мгновенно (по номеру телефона).
💳 <b>Карта</b> — классический перевод."""

    from bot.services.yookassa import get_yookassa_service
    yookassa = get_yookassa_service()

    buttons = [
        [InlineKeyboardButton(text="⚡️ СБП (Быстрый перевод)", callback_data=f"pay_method:sbp:{order_id}")],
        [InlineKeyboardButton(text="💳 Карта РФ (Сбер / Т-Банк)", callback_data=f"pay_method:transfer:{order_id}")],
    ]
    if yookassa.is_available:
        buttons.append([InlineKeyboardButton(text="🌐 Онлайн-оплата (ЮKassa)", callback_data=f"pay_method:card:{order_id}")])
    buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data=f"pay_back:{order_id}")])

    await safe_edit_or_send(callback, text, reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))


@router.message(OrderState.waiting_for_receipt, F.content_type.in_({ContentType.PHOTO, ContentType.DOCUMENT}))
async def process_payment_receipt(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Получили фото/документ чека — отправляем админу на проверку.
    ВАЖНО: Сразу сбрасываем state чтобы не ловить дубли (альбомы).

    Поддерживает два flow:
    1. payment_order_id - из flow оплаты админа (pay_method:sbp/transfer)
    2. receipt_order_id - из flow клиента (send_receipt:)
    """
    # Получаем данные из state и СРАЗУ сбрасываем
    data = await state.get_data()
    await state.clear()  # Anti-duplicate: сбрасываем до обработки

    # Поддержка обоих flow: payment_order_id (админский) и receipt_order_id (клиентский)
    order_id = data.get("payment_order_id") or data.get("receipt_order_id")
    amount = data.get("payment_amount", 0)
    user_id = data.get("payment_user_id") or message.from_user.id
    username = data.get("payment_username") or message.from_user.username
    scheme = data.get("payment_scheme")
    method = data.get("payment_method")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден. Попробуй снова.")
        return

    # Если пришли через клиентский flow (receipt_order_id), нужно получить данные из заказа
    if not amount:
        order_query = select(Order).where(Order.id == order_id)
        order_result = await session.execute(order_query)
        order = order_result.scalar_one_or_none()
        if order:
            amount = order.price
            scheme = order.payment_scheme or "full"
            method = order.payment_method or "transfer"

    # Определяем file_id
    if message.photo:
        file_id = message.photo[-1].file_id  # Берём самое большое фото
        file_type = "photo"
    else:
        file_id = message.document.file_id
        file_type = "document"

    # Уведомляем юзера
    user_text = f"""<b>✅ ПРИНЯТО</b>

Заказ <b>#{order_id}</b> · {amount:.0f}₽

Шериф проверяет чек. Как только увидит поступление — сразу дам знать.

<i>Обычно это пара минут.</i>"""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Написать в поддержку", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
    ])

    await message.answer(user_text, reply_markup=user_keyboard)

    # Формируем сообщение для админа
    scheme_label = "50% аванс" if scheme == "half" else "100%"
    method_labels = {"card": "💳 Картой", "sbp": "📲 СБП", "transfer": "🏦 На карту"}
    method_label = method_labels.get(method, "")

    admin_text = f"""🚨 <b>ПРОВЕРКА ОПЛАТЫ</b>

👤 <a href='tg://user?id={user_id}'>{username or 'Без username'}</a>
🆔 ID: <code>{user_id}</code>

📄 Заказ: <code>#{order_id}</code>
💰 Сумма: <b>{amount:.0f}₽</b> ({scheme_label})
{method_label}

<i>Чек от клиента прикреплён ниже 👇</i>"""

    # Клавиатура админа
    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Подтвердить зачисление", callback_data=f"admin_confirm_payment:{order_id}")],
        [InlineKeyboardButton(text="❌ Деньги не пришли", callback_data=f"reject_payment:{order_id}:{user_id}")],
    ])

    # Отправляем админам с прикреплённым чеком
    for admin_id in settings.ADMIN_IDS:
        try:
            # Сначала отправляем текст
            await bot.send_message(admin_id, admin_text)
            # Потом отправляем чек с кнопками
            if file_type == "photo":
                await bot.send_photo(admin_id, file_id, reply_markup=admin_keyboard)
            else:
                await bot.send_document(admin_id, file_id, reply_markup=admin_keyboard)
        except Exception as e:
            logger.warning(f"Не удалось отправить чек админу {admin_id}: {e}")


@router.message(OrderState.waiting_for_receipt)
async def process_payment_receipt_invalid(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Получили мусор (текст, стикер, голос и т.д.) в состоянии ожидания чека.
    Не сбрасываем state — даём ещё одну попытку.
    """
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    await message.answer(
        "❌ <b>Это не похоже на чек.</b>\n\n"
        "Пришли <b>скриншот</b> или <b>PDF-файл</b>.\n"
        "Или нажми кнопку «Отмена» выше.",
    )


# ══════════════════════════════════════════════════════════════
#                    КНОПКИ ЗАЯВОК
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_set_price:"))
async def admin_set_price_callback(callback: CallbackQuery, state: FSMContext):
    """Админ нажал кнопку 'Назначить цену'"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return
    await state.update_data(price_order_id=order_id)
    await state.set_state(AdminStates.waiting_order_price)

    await callback.answer("⏳")
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


@router.callback_query(F.data.startswith("admin_confirm_robot_price:"))
async def admin_confirm_robot_price_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Быстрое подтверждение цены робота без ручного ввода.
    Использует order.price который уже рассчитан.
    """
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer(f"Заказ #{order_id} не найден", show_alert=True)
        return

    if order.price <= 0:
        await callback.answer("❌ Цена робота не установлена! Введи вручную.", show_alert=True)
        return

    # Находим пользователя
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        await callback.answer(f"Пользователь не найден", show_alert=True)
        return

    await callback.answer("✅ Цена подтверждена!")

    price = order.price

    # Рассчитываем бонусы (макс 50% от цены)
    max_bonus = price * 0.5
    bonus_to_use = min(user.balance, max_bonus)

    # Обновляем заказ
    order.bonus_used = bonus_to_use
    order.status = OrderStatus.CONFIRMED.value
    await session.commit()

    # ═══ ОБНОВЛЯЕМ LIVE-КАРТОЧКУ В КАНАЛЕ ═══
    try:
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"💰 Цена назначена: {int(price):,}₽".replace(",", " "),
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

    # Рассчитываем итоговую цену
    final_price = price - bonus_to_use
    half_amount = final_price / 2

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    client_text = build_price_offer_text(
        order_id=order.id,
        work_label=work_label,
        deadline=order.deadline,
        base_price=price,
        bonus_used=bonus_to_use,
        final_price=final_price,
    )

    # Формируем клавиатуру
    buttons = [
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order.id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order.id}"
        )],
    ]

    if bonus_to_use > 0:
        buttons.append([InlineKeyboardButton(
            text="🔄 Не тратить бонусы (Пересчитать)",
            callback_data=f"price_no_bonus:{order.id}"
        )])

    buttons.append([InlineKeyboardButton(
        text="💬 Обсудить условия",
        callback_data=f"price_question:{order.id}"
    )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    # Отправляем клиенту с картинкой
    try:
        if IMG_PAYMENT_BILL.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=order.user_id,
                    photo_path=IMG_PAYMENT_BILL,
                    caption=client_text,
                    reply_markup=kb,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить payment_bill image: {e}")
                await bot.send_message(order.user_id, client_text, reply_markup=kb)
        else:
            await bot.send_message(order.user_id, client_text, reply_markup=kb)

        # Обновляем сообщение админа
        await callback.message.edit_text(
            f"✅ <b>Заказ #{order.id} — цена подтверждена</b>\n\n"
            f"💰 Цена: {price:.0f}₽\n"
            f"🎁 Бонусов применено: {bonus_to_use:.0f}₽\n"
            f"💵 Итого к оплате: {final_price:.0f}₽\n\n"
            f"<i>Клиенту отправлено предложение оплаты.</i>"
        )
    except Exception as e:
        await callback.message.answer(f"❌ Не удалось отправить сообщение клиенту: {e}")


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

    # Формируем сообщение для клиента (Ultra-Clean Layout)
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    client_text = build_price_offer_text(
        order_id=order.id,
        work_label=work_label,
        deadline=order.deadline,
        base_price=price,
        bonus_used=bonus_to_use,
        final_price=final_price,
    )

    # Формируем клавиатуру
    buttons = [
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order.id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order.id}"
        )],
    ]

    # Кнопка "Не тратить бонусы" только если они были применены
    if bonus_to_use > 0:
        buttons.append([InlineKeyboardButton(
            text="🔄 Не тратить бонусы (Пересчитать)",
            callback_data=f"price_no_bonus:{order.id}"
        )])

    # Кнопка для вопросов/торга
    buttons.append([InlineKeyboardButton(
        text="💬 Обсудить условия",
        callback_data=f"price_question:{order.id}"
    )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)

    # Отправляем клиенту с картинкой
    try:
        if IMG_PAYMENT_BILL.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=order.user_id,
                    photo_path=IMG_PAYMENT_BILL,
                    caption=client_text,
                    reply_markup=kb,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить payment_bill image: {e}")
                await bot.send_message(order.user_id, client_text, reply_markup=kb)
        else:
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

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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

    # ═══ ОБНОВЛЯЕМ LIVE-КАРТОЧКУ В КАНАЛЕ ═══
    try:
        user_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
        user = user_result.scalar_one_or_none()
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"❌ Отклонено админом",
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

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

@router.callback_query(F.data.startswith("admin_confirm_payment:"))
async def admin_confirm_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Админ подтвердил оплату кнопкой (ручное подтверждение от чека)"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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

    if order.status not in [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value, OrderStatus.IN_PROGRESS.value]:
        await callback.answer(
            f"Заказ нельзя отметить как оплаченный\nСтатус: {order.status_label}",
            show_alert=True
        )
        return

    if order.price <= 0:
        await callback.answer("У заказа не установлена цена!", show_alert=True)
        return

    # ═══ ANTI-DOUBLE-CLICK: Сначала убираем кнопки! ═══
    try:
        admin_processed_text = callback.message.text + "\n\n✅ <b>Обработано: Подтверждено</b>"
        await callback.message.edit_text(admin_processed_text, reply_markup=None)
    except Exception:
        pass  # Если не удалось — возможно уже обработано

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

    # ═══ ОБНОВЛЯЕМ LIVE-КАРТОЧКУ В КАНАЛЕ ═══
    try:
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"✅ Оплата подтверждена (чек)",
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

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

    # Уведомляем клиента — Premium Payment Success!
    bonus_line = f"\n\n🎁 <b>+{order_bonus:.0f}₽</b> бонусов на баланс!" if order_bonus > 0 else ""

    client_text = f"""🎉 <b>ОПЛАТА ПОДТВЕРЖДЕНА!</b>

Заказ <b>#{order.id}</b> принят в работу.
💰 Аванс получен: <b>{int(order.paid_amount):,} ₽</b>

Шериф уже запряг лошадей. Как будет готово — пришлю уведомление сюда.
Следи за статусом в кабинете.{bonus_line}""".replace(",", " ")

    client_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👀 Отследить статус", callback_data="my_orders")],
        [InlineKeyboardButton(text="🤝 Приведи друга (+500₽)", callback_data="profile_referral")],
        [InlineKeyboardButton(text="🌵 В Салун", callback_data="back_to_menu")],
    ])

    # Отправляем клиенту с картинкой (FSInputFile)
    try:
        if PAYMENT_SUCCESS_IMAGE_PATH.exists():
            photo_file = FSInputFile(PAYMENT_SUCCESS_IMAGE_PATH)
            await bot.send_photo(
                chat_id=order.user_id,
                photo=photo_file,
                caption=client_text,
                reply_markup=client_keyboard,
            )
        else:
            await bot.send_message(order.user_id, client_text, reply_markup=client_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось отправить payment_success клиенту: {e}")

    await callback.answer("✅ Оплата подтверждена!")


@router.callback_query(F.data.startswith("reject_payment:"))
async def reject_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Админ указал что оплата не пришла"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    if len(parts) < 3:
        await callback.answer("Ошибка формата данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
        user_id = int(parts[2])
    except ValueError:
        await callback.answer("Некорректные данные", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # ═══ ANTI-DOUBLE-CLICK: Сначала убираем кнопки! ═══
    try:
        admin_processed_text = callback.message.text + "\n\n❌ <b>Обработано: Отклонено</b>"
        await callback.message.edit_text(admin_processed_text, reply_markup=None)
    except Exception:
        pass  # Если не удалось — возможно уже обработано

    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    # Новое улучшенное сообщение для клиента
    client_text = f"""🚫 <b>ОПЛАТА НЕ НАЙДЕНА</b>

Партнер, в нашем сейфе пока пусто. Мы проверили счета, но поступления по заказу <b>#{order.id}</b> на сумму <b>{final_price:.0f} ₽</b> не видим.

<b>Возможные причины:</b>
• Банковская задержка (переводы идут до 15 минут).
• Ошибка в реквизитах.
• Ты забыл нажать «Отправить» в приложении банка.

Если деньги списались — без паники. Жми кнопку ниже и пиши лично Шерифу, разберемся."""

    # Новая клавиатура с действиями для клиента
    client_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🆘 Написать Шерифу",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💳 Показать реквизиты",
                callback_data=f"show_requisites:{order.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="⏳ Я подожду",
                callback_data=f"dismiss_payment_error:{order.id}"
            ),
        ],
    ])

    try:
        await bot.send_message(user_id, client_text, reply_markup=client_keyboard)
    except Exception:
        pass

    await callback.answer("Клиент уведомлён")


@router.callback_query(F.data.startswith("dismiss_payment_error:"))
async def dismiss_payment_error_callback(callback: CallbackQuery):
    """Клиент нажал 'Я подожду' — удаляем сообщение об ошибке оплаты"""
    await callback.answer("👍 Хорошо, подождём!")
    try:
        await callback.message.delete()
    except Exception:
        # Если не удалось удалить — просто убираем кнопки
        try:
            await callback.message.edit_text(
                "⏳ <b>Ожидаем поступление оплаты...</b>\n\n"
                "Если деньги списались — напиши Шерифу.",
                reply_markup=None
            )
        except Exception:
            pass


@router.callback_query(F.data.startswith("retry_payment_check:"))
async def retry_payment_check_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент настаивает что оплатил — уведомляем админа повторно"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
{settings.PAYMENT_BANKS}
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

    await callback.answer("⏳")

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

    if order.status not in [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value, OrderStatus.IN_PROGRESS.value]:
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


# ══════════════════════════════════════════════════════════════
#               P2P PAYMENT FLOW: /offer COMMAND
# ══════════════════════════════════════════════════════════════

@router.message(Command("offer"), StateFilter("*"))
async def cmd_offer(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Отправить клиенту предложение с ценой (P2P Payment Flow)
    Использование: /offer [order_id] [сумма] [комментарий]
    Пример: /offer 123 5000 Курсовая по экономике, 30 страниц
    """
    if not is_admin(message.from_user.id):
        return
    await state.clear()

    if not command.args:
        await message.answer(
            "❌ <b>Использование:</b>\n"
            "<code>/offer [order_id] [сумма] [комментарий]</code>\n\n"
            "<b>Пример:</b>\n"
            "<code>/offer 123 5000 Курсовая по экономике</code>"
        )
        return

    args = command.args.split(maxsplit=2)
    if len(args) < 2:
        await message.answer(
            "❌ Укажите ID заказа и сумму\n"
            "Пример: /offer 123 5000 Комментарий"
        )
        return

    try:
        order_id = int(args[0])
        amount = float(args[1])
    except ValueError:
        await message.answer("❌ ID заказа и сумма должны быть числами")
        return

    if amount <= 0:
        await message.answer("❌ Сумма должна быть больше 0")
        return

    # Комментарий опционален
    admin_comment = args[2] if len(args) > 2 else ""

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        return

    # Обновляем заказ
    order.price = amount
    order.admin_notes = admin_comment
    order.status = OrderStatus.CONFIRMED.value
    await session.commit()

    # Формируем сообщение для клиента
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    comment_line = f"\n💬 <b>Комментарий:</b> {admin_comment}" if admin_comment else ""

    client_text = f"""🪙 <b>Цена вопроса</b>

Эксперты оценили объём работ. Чтобы мы начали стрелять (писать), нужно зарядить обойму.

💰 <b>Сумма:</b> <code>{amount:.0f}</code> руб.{comment_line}

<i>Если устраивает — жми кнопку, дам реквизиты.</i>"""

    # Клавиатура с кнопкой принятия
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💰 Ударить по рукам (Оплатить)",
            callback_data=f"accept_offer:{order_id}"
        )],
        [InlineKeyboardButton(
            text="💬 Есть вопрос",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    # Отправляем клиенту с картинкой
    try:
        if PAYMENT_REQUEST_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=order.user_id,
                    photo_path=PAYMENT_REQUEST_IMAGE_PATH,
                    caption=client_text,
                    reply_markup=keyboard,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить payment_request image: {e}")
                await bot.send_message(order.user_id, client_text, reply_markup=keyboard)
        else:
            await bot.send_message(order.user_id, client_text, reply_markup=keyboard)

        await message.answer(
            f"✅ Предложение отправлено!\n\n"
            f"📋 Заказ: #{order.id}\n"
            f"💰 Сумма: {amount:.0f}₽\n"
            f"💬 Комментарий: {admin_comment or '—'}"
        )
    except Exception as e:
        await message.answer(f"❌ Не удалось отправить сообщение клиенту: {e}")


@router.callback_query(F.data.startswith("accept_offer:"))
async def accept_offer_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Клиент принял предложение — показываем реквизиты для P2P оплаты"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем что заказ ещё не оплачен
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        return

    await callback.answer("🤝 Отлично! Показываю реквизиты...")

    # ВАЖНО: Меняем статус на WAITING_PAYMENT чтобы confirm_payment работал
    if order.status == OrderStatus.WAITING_ESTIMATION.value:
        order.status = OrderStatus.WAITING_PAYMENT.value
        await session.commit()

    # Показываем реквизиты для P2P оплаты (используем конфиг)
    payment_text = f"""💳 <b>ОПЛАТА ЗАКАЗА #{order.id}</b>

💰 <b>К оплате: {order.price:.0f} ₽</b>

<b>Реквизиты (нажми, чтобы скопировать):</b>

СБП: <code>{settings.PAYMENT_PHONE}</code>
Карта: <code>{settings.PAYMENT_CARD}</code>
Получатель: {settings.PAYMENT_NAME}

⚠️ <i>После перевода нажми кнопку ниже.</i>"""

    # Клавиатура — простая, без запроса чека
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"confirm_payment:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❓ Вопрос по оплате",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    await callback.message.edit_text(payment_text, reply_markup=keyboard)

    # Уведомляем админов что клиент принял предложение
    admin_text = f"""🤝 <b>Клиент принял предложение!</b>

📋 Заказ: #{order.id}
💰 Сумма: {order.price:.0f}₽
👤 Клиент: @{callback.from_user.username or 'без username'}

Ожидаем оплату и чек..."""

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text)
        except Exception:
            pass


@router.callback_query(F.data.startswith("send_receipt:"))
async def send_receipt_callback(callback: CallbackQuery, session: AsyncSession, state: FSMContext):
    """Клиент нажал 'Скинуть чек' — переводим в режим ожидания скриншота"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем что заказ ещё не оплачен
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await callback.answer("✅ Этот заказ уже оплачен!", show_alert=True)
        return

    await callback.answer("📸 Жду скриншот чека!")

    # Сохраняем order_id в state и переводим в состояние ожидания чека
    await state.update_data(receipt_order_id=order_id)
    await state.set_state(OrderState.waiting_for_receipt)

    # Обновляем сообщение
    waiting_text = f"""📸 <b>Жду скриншот чека!</b>

Заказ #{order.id} · {order.price:.0f}₽

Просто отправь фото или скриншот чека в этот чат.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>

<i>После проверки я сразу приступлю к работе! 🤠</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="❌ Отмена",
            callback_data=f"cancel_receipt:{order_id}"
        )],
        [InlineKeyboardButton(
            text="💬 Проблема с оплатой",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    await callback.message.edit_text(waiting_text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("cancel_receipt:"))
async def cancel_receipt_callback(callback: CallbackQuery, session: AsyncSession, state: FSMContext):
    """Отмена отправки чека — возврат к реквизитам"""
    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Очищаем состояние
    await state.clear()
    await callback.answer("Отменено")

    # Возвращаем к реквизитам (используем конфиг)
    payment_text = f"""💳 <b>ОПЛАТА ЗАКАЗА #{order.id}</b>

💰 <b>К оплате: {order.price:.0f} ₽</b>

<b>Реквизиты (нажми, чтобы скопировать):</b>

СБП: <code>{settings.PAYMENT_PHONE}</code>
Карта: <code>{settings.PAYMENT_CARD}</code>
Получатель: {settings.PAYMENT_NAME}

⚠️ <i>После перевода нажми кнопку ниже.</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"confirm_payment:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❓ Вопрос по оплате",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    await callback.message.edit_text(payment_text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    СТАТИСТИКА / БУХГАЛТЕРИЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_statistics")
async def show_statistics(callback: CallbackQuery, session: AsyncSession):
    """📊 Бухгалтерия — статистика бота"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer("⏳")

    from sqlalchemy import func
    from datetime import date

    # Общее количество пользователей
    users_count_query = select(func.count(User.id))
    users_count = (await session.execute(users_count_query)).scalar() or 0

    # Пользователи сегодня
    today = date.today()
    today_users_query = select(func.count(User.id)).where(
        func.date(User.created_at) == today
    )
    today_users = (await session.execute(today_users_query)).scalar() or 0

    # Заказы сегодня
    today_orders_query = select(func.count(Order.id)).where(
        func.date(Order.created_at) == today
    )
    today_orders = (await session.execute(today_orders_query)).scalar() or 0

    # Общий доход (сумма paid_amount у оплаченных заказов)
    paid_statuses = [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value, OrderStatus.IN_PROGRESS.value, OrderStatus.COMPLETED.value]
    revenue_query = select(func.sum(Order.paid_amount)).where(
        Order.status.in_(paid_statuses)
    )
    total_revenue = (await session.execute(revenue_query)).scalar() or 0

    # Доход сегодня
    today_revenue_query = select(func.sum(Order.paid_amount)).where(
        Order.status.in_(paid_statuses),
        func.date(Order.created_at) == today
    )
    today_revenue = (await session.execute(today_revenue_query)).scalar() or 0

    # Активные заказы
    active_statuses = [OrderStatus.PENDING.value, OrderStatus.WAITING_ESTIMATION.value, OrderStatus.WAITING_PAYMENT.value, OrderStatus.VERIFICATION_PENDING.value, OrderStatus.CONFIRMED.value, OrderStatus.PAID.value, OrderStatus.IN_PROGRESS.value]
    active_orders_query = select(func.count(Order.id)).where(
        Order.status.in_(active_statuses)
    )
    active_orders = (await session.execute(active_orders_query)).scalar() or 0

    # Завершённые заказы
    completed_query = select(func.count(Order.id)).where(
        Order.status == OrderStatus.COMPLETED.value
    )
    completed_orders = (await session.execute(completed_query)).scalar() or 0

    text = f"""📊 <b>БУХГАЛТЕРИЯ САЛУНА</b>

<b>👥 Пользователи:</b>
├ Всего: <code>{users_count:,}</code>
└ Сегодня: <code>+{today_users}</code>

<b>📋 Заказы:</b>
├ Активных: <code>{active_orders}</code>
├ Завершено: <code>{completed_orders:,}</code>
└ Сегодня: <code>+{today_orders}</code>

<b>💰 Финансы:</b>
├ Выручка всего: <code>{total_revenue:,.0f} ₽</code>
└ Сегодня: <code>+{today_revenue:,.0f} ₽</code>

<i>Обновлено: {datetime.now(MSK_TZ).strftime('%d.%m.%Y %H:%M')}</i>""".replace(",", " ")

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Обновить", callback_data="admin_statistics")],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")],
    ])

    await callback.message.edit_text(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    РАССЫЛКА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_broadcast")
async def start_broadcast(callback: CallbackQuery, state: FSMContext):
    """📢 Рассылка — начало"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer("⏳")
    await state.set_state(AdminStates.broadcast_text)

    text = """📢 <b>РАССЫЛКА</b>

Отправь текст сообщения для рассылки.

<i>Поддерживается HTML-разметка:
• &lt;b&gt;жирный&lt;/b&gt;
• &lt;i&gt;курсив&lt;/i&gt;
• &lt;code&gt;код&lt;/code&gt;
• &lt;a href="url"&gt;ссылка&lt;/a&gt;</i>

⚠️ Рассылка будет отправлена ВСЕМ пользователям!"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_panel")],
    ])

    await callback.message.edit_text(text, reply_markup=keyboard)


@router.message(AdminStates.broadcast_text)
async def receive_broadcast_text(message: Message, state: FSMContext, session: AsyncSession):
    """Получение текста рассылки"""
    if not is_admin(message.from_user.id):
        return

    broadcast_text = message.text or message.caption

    if not broadcast_text:
        await message.answer("❌ Отправь текстовое сообщение")
        return

    # Сохраняем текст и показываем превью
    await state.update_data(broadcast_text=broadcast_text)

    # Считаем пользователей
    from sqlalchemy import func
    users_count_query = select(func.count(User.id))
    users_count = (await session.execute(users_count_query)).scalar() or 0

    preview_text = f"""📢 <b>ПРЕВЬЮ РАССЫЛКИ</b>

<b>Получателей:</b> {users_count:,} чел.

━━━━━━━━━━━━━━━━━━━━━
{broadcast_text}
━━━━━━━━━━━━━━━━━━━━━

Отправить?""".replace(",", " ")

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить", callback_data="admin_confirm_broadcast")],
        [InlineKeyboardButton(text="✏️ Редактировать", callback_data="admin_broadcast")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_panel")],
    ])

    await message.answer(preview_text, reply_markup=keyboard)


@router.callback_query(F.data == "admin_confirm_broadcast")
async def confirm_broadcast(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Подтверждение и отправка рассылки"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    data = await state.get_data()
    broadcast_text = data.get("broadcast_text")

    if not broadcast_text:
        await callback.answer("Текст не найден", show_alert=True)
        return

    await callback.answer("🚀 Запускаю рассылку...")
    await state.clear()

    # Получаем всех пользователей
    users_query = select(User.telegram_id)
    users_result = await session.execute(users_query)
    user_ids = [row[0] for row in users_result.fetchall()]

    total = len(user_ids)
    sent = 0
    failed = 0

    # Отправляем статус
    status_msg = await callback.message.edit_text(
        f"📤 <b>Рассылка запущена...</b>\n\nОтправлено: 0/{total}"
    )

    import asyncio

    for i, user_id in enumerate(user_ids, 1):
        try:
            await bot.send_message(user_id, broadcast_text)
            sent += 1
        except Exception:
            failed += 1

        # Обновляем статус каждые 50 сообщений
        if i % 50 == 0:
            try:
                await status_msg.edit_text(
                    f"📤 <b>Рассылка...</b>\n\nОтправлено: {sent}/{total}\nОшибок: {failed}"
                )
            except Exception:
                pass

        # Задержка для избежания флуд-лимитов
        await asyncio.sleep(0.05)  # 20 сообщений в секунду

    # Итоговый отчёт
    result_text = f"""✅ <b>РАССЫЛКА ЗАВЕРШЕНА</b>

📤 Отправлено: <code>{sent}</code>
❌ Ошибок: <code>{failed}</code>
📊 Всего: <code>{total}</code>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ В админку", callback_data="admin_panel")],
    ])

    await status_msg.edit_text(result_text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    НАПИСАТЬ КЛИЕНТУ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_msg_user:"))
async def start_message_to_user(callback: CallbackQuery, state: FSMContext):
    """Начало отправки сообщения клиенту"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    if len(parts) < 3:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
        user_id = int(parts[2])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    await callback.answer("⏳")
    await state.update_data(msg_order_id=order_id, msg_user_id=user_id)
    await state.set_state(AdminStates.messaging_user)

    text = f"""📩 <b>Сообщение клиенту</b>

📋 Заказ: #{order_id}
👤 ID: <code>{user_id}</code>

Напиши текст сообщения:"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data=f"admin_order_detail:{order_id}")],
    ])

    await callback.message.edit_text(text, reply_markup=keyboard)


@router.message(AdminStates.messaging_user)
async def send_message_to_user(message: Message, state: FSMContext, bot: Bot):
    """Отправка сообщения клиенту"""
    if not is_admin(message.from_user.id):
        return

    data = await state.get_data()
    order_id = data.get("msg_order_id")
    user_id = data.get("msg_user_id")

    if not user_id:
        await message.answer("❌ Ошибка: пользователь не найден")
        await state.clear()
        return

    msg_text = message.text or message.caption

    if not msg_text:
        await message.answer("❌ Отправь текстовое сообщение")
        return

    await state.clear()

    # Форматируем сообщение от шерифа
    sheriff_msg = f"""🤠 <b>Сообщение от Шерифа</b>

{msg_text}

<i>По заказу #{order_id}</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Ответить",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    try:
        await bot.send_message(user_id, sheriff_msg, reply_markup=keyboard)
        await message.answer(f"✅ Сообщение отправлено клиенту ({user_id})")
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки: {e}")


# ══════════════════════════════════════════════════════════════
#                    ОТПРАВИТЬ ФАЙЛ КЛИЕНТУ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_send_file:"))
async def start_send_file(callback: CallbackQuery, state: FSMContext):
    """Начало отправки файла клиенту"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    parts = callback.data.split(":")
    if len(parts) < 3:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
        user_id = int(parts[2])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    await callback.answer("⏳")
    await state.update_data(file_order_id=order_id, file_user_id=user_id)
    await state.set_state(AdminStates.sending_file)

    text = f"""📤 <b>Отправка файла клиенту</b>

📋 Заказ: #{order_id}
👤 ID: <code>{user_id}</code>

Отправь файл (документ, фото, архив):"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data=f"admin_order_detail:{order_id}")],
    ])

    await callback.message.edit_text(text, reply_markup=keyboard)


@router.message(AdminStates.sending_file, F.document | F.photo)
async def forward_file_to_user(message: Message, state: FSMContext, bot: Bot):
    """Пересылка файла клиенту"""
    if not is_admin(message.from_user.id):
        return

    data = await state.get_data()
    order_id = data.get("file_order_id")
    user_id = data.get("file_user_id")

    if not user_id:
        await message.answer("❌ Ошибка: пользователь не найден")
        await state.clear()
        return

    await state.clear()

    # Отправляем файл с подписью
    caption = f"""📥 <b>Файл по заказу #{order_id}</b>

<i>Готовая работа от Салуна!</i>"""

    try:
        if message.document:
            await bot.send_document(
                user_id,
                message.document.file_id,
                caption=caption
            )
        elif message.photo:
            await bot.send_photo(
                user_id,
                message.photo[-1].file_id,
                caption=caption
            )

        await message.answer(f"✅ Файл отправлен клиенту ({user_id})")
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки: {e}")


# ══════════════════════════════════════════════════════════════
#                    ОТМЕТИТЬ ОПЛАЧЕННЫМ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_mark_paid:"))
async def mark_order_paid(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отметить заказ как оплаченный"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    order_id = parse_callback_int(callback.data, 1)
    if order_id is None:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Получаем заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Обновляем статус и paid_amount
    order.status = OrderStatus.PAID.value
    order.paid_amount = order.price or 0
    order.paid_at = datetime.now(MSK_TZ)

    await session.commit()
    await callback.answer("✅ Заказ отмечен как оплаченный!")

    # Уведомляем клиента
    user_notification = f"""✅ <b>ОПЛАТА ПОДТВЕРЖДЕНА</b>

📋 Заказ: <code>#{order.id}</code>
💰 Сумма: <code>{order.paid_amount:.0f} ₽</code>

Отлично! Я уже взял твою задачу в работу.
Скоро вернусь с результатом. 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="👀 Статус заказа",
            callback_data=f"order_detail:{order_id}"
        )],
    ])

    try:
        await bot.send_message(order.user_id, user_notification, reply_markup=keyboard)
    except Exception:
        pass

    # Обновляем карточку заказа для админа
    emoji, status_label = ORDER_STATUS_LABELS.get(order.status, ("", order.status))
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "—"

    text = f"""✅ <b>Заказ #{order.id} оплачен!</b>

📂 <b>Тип:</b> {work_label}
💰 <b>Сумма:</b> {order.paid_amount:.0f}₽
{emoji} <b>Статус:</b> {status_label}

<i>Клиент уведомлён</i>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 К заказу", callback_data=f"admin_order_detail:{order_id}")],
        [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")],
    ])

    await callback.message.edit_text(text, reply_markup=admin_keyboard)


# ══════════════════════════════════════════════════════════════
#                    PLACEHOLDER: ТАЙНИК (ХАЛЯВА)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "secret_stash")
async def secret_stash_placeholder(callback: CallbackQuery):
    """🎁 Тайник — placeholder для будущей функции халявы"""
    text = """🎁 <b>ТАЙНИК</b>

<i>Эта функция скоро появится!</i>

Здесь будут:
• Промокоды на скидки
• Бесплатные шаблоны
• Секретные бонусы

Следи за обновлениями! 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")],
    ])

    await callback.answer("🎁 Скоро!")
    try:
        await callback.message.edit_caption(caption=text, reply_markup=keyboard)
    except Exception:
        try:
            await callback.message.edit_text(text, reply_markup=keyboard)
        except Exception:
            await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ВЕРИФИКАЦИЯ ПЛАТЕЖА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("admin_verify_paid:"))
async def admin_verify_paid_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Админ подтверждает, что деньги поступили.

    Actions:
    1. Меняем статус на PAID
    2. Записываем paid_amount
    3. Уведомляем пользователя
    4. Обновляем сообщение админа
    """
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔️ Нет доступа", show_alert=True)
        return

    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем статус
    if order.status != OrderStatus.VERIFICATION_PENDING.value:
        await callback.answer(f"Заказ уже в статусе: {order.status}", show_alert=True)
        return

    await callback.answer("✅ Подтверждаем оплату...")

    # ═══ ОБНОВЛЯЕМ ЗАКАЗ ═══
    order.status = OrderStatus.PAID.value
    order.paid_amount = order.price / 2  # 50% аванс
    await session.commit()

    # ═══ ОБНОВЛЯЕМ LIVE-КАРТОЧКУ В КАНАЛЕ ═══
    try:
        # Получаем данные клиента для карточки
        user_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
        user = user_result.scalar_one_or_none()
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"✅ Оплата подтверждена админом",
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

    # ═══ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ С КАРТИНКОЙ ═══
    user_text = f"""🎉 <b>ОПЛАТА ПОДТВЕРЖДЕНА!</b>

Заказ <b>#{order.id}</b> принят в работу.
💰 Аванс получен: <b>{int(order.paid_amount):,} ₽</b>

Шериф уже запряг лошадей. Как будет готово — пришлю уведомление сюда.
Следи за статусом в кабинете.""".replace(",", " ")

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👀 Отследить статус", callback_data="my_orders")],
        [InlineKeyboardButton(text="🤝 Приведи друга (+500₽)", callback_data="profile_referral")],
        [InlineKeyboardButton(text="🌵 В Салун", callback_data="back_to_menu")],
    ])

    try:
        if PAYMENT_SUCCESS_IMAGE_PATH.exists():
            photo_file = FSInputFile(PAYMENT_SUCCESS_IMAGE_PATH)
            await bot.send_photo(
                chat_id=order.user_id,
                photo=photo_file,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        else:
            await bot.send_message(order.user_id, user_text, reply_markup=user_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось уведомить пользователя {order.user_id}: {e}")

    # ═══ ОБНОВЛЯЕМ СООБЩЕНИЕ АДМИНА ═══
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "—"

    admin_text = f"""✅ <b>ОПЛАТА ПОДТВЕРЖДЕНА</b>

📋 Заказ: <code>#{order.id}</code>
📂 Тип: {work_label}
💰 Аванс: <b>{int(order.paid_amount):,} ₽</b>

<i>Клиент уведомлён. Заказ в работе.</i>""".replace(",", " ")

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 К заказу", callback_data=f"admin_order_detail:{order_id}")],
        [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")],
    ])

    try:
        await callback.message.edit_text(admin_text, reply_markup=admin_keyboard)
    except Exception:
        await callback.message.answer(admin_text, reply_markup=admin_keyboard)


@router.callback_query(F.data.startswith("admin_reject_payment:"))
async def admin_reject_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Админ НЕ видит оплату — возвращаем заказ в waiting_payment.

    Actions:
    1. Меняем статус обратно на WAITING_PAYMENT
    2. Уведомляем пользователя с предупреждением
    3. Обновляем сообщение админа
    """
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔️ Нет доступа", show_alert=True)
        return

    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем статус
    if order.status != OrderStatus.VERIFICATION_PENDING.value:
        await callback.answer(f"Заказ уже в статусе: {order.status}", show_alert=True)
        return

    await callback.answer("❌ Отклоняем...")

    # ═══ ВОЗВРАЩАЕМ В WAITING_PAYMENT ═══
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # ═══ ОБНОВЛЯЕМ LIVE-КАРТОЧКУ В КАНАЛЕ ═══
    try:
        user_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
        user = user_result.scalar_one_or_none()
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"❌ Оплата не найдена",
        )
    except Exception as e:
        logger.warning(f"Failed to update live card for order #{order.id}: {e}")

    # ═══ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ ═══
    user_text = f"""⚠️ <b>Оплата не найдена</b>

Заказ <code>#{order.id}</code>

Мы проверили счёт, но пока не видим поступления.

<b>Возможные причины:</b>
• Перевод ещё в обработке (подожди 5-15 минут)
• Неверные реквизиты
• Перевод на другую сумму

Если ты точно перевёл — напиши в поддержку со скриншотом чека.
Или попробуй ещё раз 👇"""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💳 К оплате",
            callback_data=f"pay_order:{order_id}"
        )],
        [InlineKeyboardButton(
            text="🆘 Написать в поддержку",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    try:
        await bot.send_message(order.user_id, user_text, reply_markup=user_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось уведомить пользователя {order.user_id}: {e}")

    # ═══ ОБНОВЛЯЕМ СООБЩЕНИЕ АДМИНА ═══
    admin_text = f"""❌ <b>ОПЛАТА НЕ НАЙДЕНА</b>

📋 Заказ: <code>#{order.id}</code>
💰 Сумма: <b>{int(order.price):,} ₽</b>

Заказ возвращён в статус «Ждёт оплаты».
<i>Клиент уведомлён.</i>""".replace(",", " ")

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 К заказу", callback_data=f"admin_order_detail:{order_id}")],
        [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_orders_list")],
    ])

    try:
        await callback.message.edit_text(admin_text, reply_markup=admin_keyboard)
    except Exception:
        await callback.message.answer(admin_text, reply_markup=admin_keyboard)


# ══════════════════════════════════════════════════════════════
#                    LIVE DASHBOARD
# ══════════════════════════════════════════════════════════════

@router.message(Command("dashboard"), StateFilter("*"))
async def create_dashboard_command(message: Message, session: AsyncSession, bot: Bot):
    """
    Создать Live Dashboard в канале заказов.

    Использование: /dashboard
    """
    if not is_admin(message.from_user.id):
        return

    from bot.services.live_cards import send_or_update_dashboard

    await message.answer("📊 Создаю дашборд в канале...")

    try:
        msg_id = await send_or_update_dashboard(bot=bot, session=session)
        if msg_id:
            await message.answer(f"✅ Дашборд создан!\n\nMessage ID: {msg_id}")
        else:
            await message.answer("❌ Не удалось создать дашборд")
    except Exception as e:
        logger.error(f"Failed to create dashboard: {e}")
        await message.answer(f"❌ Ошибка: {e}")


@router.message(Command("testchannel"), StateFilter("*"))
async def test_channel_command(message: Message, bot: Bot):
    """
    Тестовая отправка сообщения в канал заказов.
    Помогает проверить, что бот может постить в канал.

    Использование: /testchannel
    """
    if not is_admin(message.from_user.id):
        return

    from datetime import datetime
    channel_id = settings.ORDERS_CHANNEL_ID

    await message.answer(
        f"🔄 Тестирую отправку в канал...\n"
        f"Channel ID: <code>{channel_id}</code>"
    )

    try:
        test_msg = await bot.send_message(
            chat_id=channel_id,
            text=f"🧪 <b>Тестовое сообщение</b>\n\n"
                 f"Время: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n"
                 f"Отправлено администратором для проверки.\n\n"
                 f"<i>Можно удалить это сообщение.</i>"
        )
        await message.answer(
            f"✅ <b>Успешно!</b>\n\n"
            f"Сообщение отправлено в канал.\n"
            f"Message ID: <code>{test_msg.message_id}</code>\n"
            f"Channel: <code>{channel_id}</code>"
        )
    except Exception as e:
        error_msg = str(e)
        hint = ""
        if "chat not found" in error_msg.lower():
            hint = "\n\n💡 <b>Подсказка:</b> Проверь, что ID канала верный."
        elif "not enough rights" in error_msg.lower() or "bot is not a member" in error_msg.lower():
            hint = "\n\n💡 <b>Подсказка:</b> Добавь бота в канал как администратора с правом отправки сообщений."
        elif "forbidden" in error_msg.lower():
            hint = "\n\n💡 <b>Подсказка:</b> У бота нет прав на отправку сообщений в этот канал."

        await message.answer(
            f"❌ <b>Ошибка отправки!</b>\n\n"
            f"Channel ID: <code>{channel_id}</code>\n"
            f"Error: <code>{error_msg}</code>{hint}"
        )
