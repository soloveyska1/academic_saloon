"""
Личный кабинет пользователя.

Включает:
- Дашборд с общей статистикой
- Мои заказы с фильтрами и пагинацией
- Баланс и история операций
- Реферальная программа
- Отмена заказов пользователем
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.enums import ChatAction
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case, literal_column

from database.models.users import User
from database.models.orders import (
    Order, OrderStatus, WORK_TYPE_LABELS, WorkType,
    get_status_meta, get_active_statuses, get_history_statuses, get_cancelable_statuses,
)
from bot.keyboards.profile import (
    get_profile_dashboard_keyboard,
    get_orders_list_keyboard,
    get_order_detail_keyboard,
    get_cancel_order_confirm_keyboard,
    get_empty_orders_keyboard,
    get_balance_keyboard,
    get_balance_history_keyboard,
    get_referral_keyboard,
    get_back_to_profile_keyboard,
)
from bot.services.logger import log_action, LogEvent
from bot.states.order import OrderState
from core.config import settings

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")

# Константы
ORDERS_PER_PAGE = 10  # Увеличено с 5 для удобства


# ══════════════════════════════════════════════════════════════
#                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def format_smart_date(dt: datetime) -> str:
    """
    Умное форматирование даты: сегодня, вчера, или дата.
    ИСПРАВЛЕН баг с 1-м числом месяца — используем timedelta.
    """
    if dt is None:
        return "—"

    now = datetime.now(MSK_TZ)

    # Приводим к MSK если нужно
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=MSK_TZ)

    today = now.date()
    dt_date = dt.date()
    yesterday = today - timedelta(days=1)  # Исправлено: используем timedelta

    if dt_date == today:
        return f"сегодня в {dt.strftime('%H:%M')}"
    elif dt_date == yesterday:
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


async def get_order_counts(session: AsyncSession, user_id: int) -> dict:
    """
    Получить счётчики заказов ОДНИМ оптимизированным запросом.
    Возвращает: {all, active, history}
    """
    active_statuses = get_active_statuses()
    history_statuses = get_history_statuses()

    query = select(
        func.count(Order.id).label("total"),
        func.sum(case(
            (Order.status.in_(active_statuses), 1),
            else_=0
        )).label("active"),
        func.sum(case(
            (Order.status.in_(history_statuses), 1),
            else_=0
        )).label("history"),
    ).where(Order.user_id == user_id)

    result = await session.execute(query)
    row = result.one()

    return {
        "all": row.total or 0,
        "active": int(row.active or 0),
        "history": int(row.history or 0),
    }


# ══════════════════════════════════════════════════════════════
#                    ДАШБОРД ЛИЧНОГО КАБИНЕТА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.in_(["my_profile", "my_orders"]))
async def show_profile_dashboard(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Главный экран личного кабинета — дашборд.
    Показывает ключевую информацию о пользователе.
    """
    await callback.answer("⏳")

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.NAV_BUTTON,
            user=callback.from_user,
            details="Открыл «Личный кабинет»",
            session=session,
        )
    except Exception as e:
        logger.warning(f"Ошибка логирования: {e}")

    telegram_id = callback.from_user.id

    # Получаем данные пользователя
    user_query = select(User).where(User.telegram_id == telegram_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    # Получаем счётчики заказов
    counts = await get_order_counts(session, telegram_id)

    # Формируем текст дашборда
    if user:
        status, discount = user.loyalty_status
        balance = user.balance
        orders_count = user.orders_count
        total_spent = user.total_spent

        discount_line = f"◈ Скидка: <b>{discount}%</b>" if discount > 0 else ""
        spent_line = f"◈ Потрачено: {total_spent:.0f}₽" if total_spent > 0 else ""

        text = f"""👤 <b>Личный кабинет</b>

{status}
{discount_line}

◈ Баланс: <b>{balance:.0f}₽</b>
◈ Заказов: {orders_count}
{spent_line}"""
    else:
        balance = 0
        text = """👤 <b>Личный кабинет</b>

<i>Добро пожаловать!</i>

Здесь ты можешь отслеживать свои заказы,
смотреть баланс и приглашать друзей."""

    text = text.strip()

    keyboard = get_profile_dashboard_keyboard(
        active_orders=counts["active"],
        balance=balance,
    )

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
    """Показать список заказов"""
    await callback.answer("⏳")
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
    """Показать список заказов с фильтрацией и пагинацией"""
    telegram_id = callback.from_user.id

    # Получаем счётчики одним запросом
    counts = await get_order_counts(session, telegram_id)

    # Если заказов нет — показываем пустое состояние
    if counts["all"] == 0:
        text = "📋 <b>Мои заказы</b>\n\n<i>Заказов пока нет</i>"
        await callback.message.edit_text(text, reply_markup=get_empty_orders_keyboard())
        return

    # Определяем фильтр
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

    # Получаем заказы
    orders_query = select(Order).where(Order.user_id == telegram_id)
    if status_filter is not None:
        orders_query = orders_query.where(status_filter)
    orders_query = (
        orders_query
        .order_by(desc(Order.created_at))
        .offset(page * ORDERS_PER_PAGE)
        .limit(ORDERS_PER_PAGE)
    )

    orders_result = await session.execute(orders_query)
    orders = orders_result.scalars().all()

    # Заголовок
    text = "📋 <b>Мои заказы</b>"

    # Пустое состояние для фильтра
    if not orders:
        filter_empty = {
            "all": "Заказов пока нет",
            "active": "Нет активных заказов",
            "history": "Нет завершённых заказов"
        }
        text += f"\n\n<i>{filter_empty.get(filter_type, 'Пусто')}</i>"

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
    """Показать детали заказа"""
    await callback.answer("⏳")
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

    # Парсим order_id с валидацией
    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем заказ с проверкой владельца
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == telegram_id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Получаем метаданные статуса
    meta = get_status_meta(order.status)
    emoji = meta.get("emoji", "📋")
    status_desc = meta.get("description", "")

    # Формируем текст
    text = f"""📋 <b>Заказ #{order.id}</b>

{emoji} <b>{meta.get('label', order.status)}</b>
<i>{status_desc}</i>

"""

    # Информация о заказе
    text += f"<b>Тип:</b> {order.work_type_label}"

    if order.subject:
        text += f"\n<b>Направление:</b> {order.subject}"

    if order.deadline:
        text += f"\n<b>Срок:</b> {order.deadline}"

    # Финансы
    text += f"\n\n<b>Стоимость</b>\n{format_price_breakdown(order)}"

    # История
    text += "\n\n<b>История</b>"

    if order.created_at:
        text += f"\n🆕 {format_smart_date(order.created_at)} — создан"

    if order.status != OrderStatus.PENDING.value and order.updated_at:
        text += f"\n{emoji} {format_smart_date(order.updated_at)}"

    if order.completed_at:
        text += f"\n✨ {format_smart_date(order.completed_at)} — завершён"

    # Подсказка про отмену
    if order.can_be_cancelled:
        text += "\n\n<i>💡 Ты можешь отменить этот заказ</i>"

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
#                    ОТМЕНА ЗАКАЗА ПОЛЬЗОВАТЕЛЕМ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("cancel_user_order:"))
async def cancel_order_request(callback: CallbackQuery, session: AsyncSession):
    """Запрос на отмену заказа — показываем подтверждение"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Проверяем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == telegram_id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if not order.can_be_cancelled:
        await callback.answer(
            "Этот заказ уже нельзя отменить. Напиши в поддержку.",
            show_alert=True
        )
        return

    text = f"""❌ <b>Отмена заказа #{order.id}</b>

<b>Тип:</b> {order.work_type_label}
{f"<b>Направление:</b> {order.subject}" if order.subject else ""}

Ты уверен, что хочешь отменить этот заказ?"""

    keyboard = get_cancel_order_confirm_keyboard(order_id)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("confirm_cancel_order:"))
async def confirm_cancel_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтверждение отмены заказа"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == telegram_id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if not order.can_be_cancelled:
        await callback.answer("Этот заказ уже нельзя отменить", show_alert=True)
        return

    # Отменяем заказ
    old_status = order.status
    order.status = OrderStatus.CANCELLED.value
    order.updated_at = datetime.now(MSK_TZ)
    await session.commit()

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_CANCEL,
            user=callback.from_user,
            details=f"Отменил заказ #{order_id} (был: {old_status})",
            session=session,
        )
    except Exception as e:
        logger.warning(f"Ошибка логирования: {e}")

    # Уведомляем админов
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                chat_id=admin_id,
                text=f"❌ <b>Заказ отменён клиентом</b>\n\n"
                     f"◈ Заказ: #{order_id}\n"
                     f"◈ Тип: {order.work_type_label}\n"
                     f"◈ Клиент: {callback.from_user.full_name}\n"
                     f"◈ ID: <code>{telegram_id}</code>\n"
                     f"◈ Был статус: {old_status}"
            )
        except Exception:
            pass

    text = f"""✅ <b>Заказ #{order_id} отменён</b>

Заказ успешно отменён.
Если передумаешь — создай новый заказ."""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 Новый заказ", callback_data="create_order")],
        [InlineKeyboardButton(text="◀️ К заказам", callback_data="profile_orders")],
    ])

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    ПОВТОРНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("reorder:"))
async def reorder(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Создать похожий заказ на основе старого"""
    await callback.answer("⏳")

    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Некорректный ID заказа", show_alert=True)
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

    text = f"""🔄 <b>Повторный заказ</b>

Создаю заказ на основе #{order_id}:

◈ Тип: {work_label}{subject_line}

Теперь выбери срок и добавь новое задание 👇"""

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
    """Показать баланс"""
    await callback.answer("⏳")

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.NAV_BUTTON,
            user=callback.from_user,
            details="Открыл «Баланс» в ЛК",
            session=session,
        )
    except Exception:
        pass

    telegram_id = callback.from_user.id

    # Получаем пользователя
    user_query = select(User).where(User.telegram_id == telegram_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    balance = user.balance if user else 0
    referral_earnings = user.referral_earnings if user else 0

    text = f"""💰 <b>Мой баланс</b>

◈ Баланс: <b>{balance:.0f}₽</b>
◈ Заработано с друзей: {referral_earnings:.0f}₽

<b>Как использовать</b>

Баланс автоматически списывается при оплате заказа.
Можно списать до 50% стоимости.

<b>Как пополнить</b>

◈ Приглашай друзей — 5% с их заказов
◈ Получай компенсации за задержки"""

    try:
        await callback.message.edit_text(text, reply_markup=get_balance_keyboard())
    except Exception:
        await callback.message.answer(text, reply_markup=get_balance_keyboard())


@router.callback_query(F.data == "balance_history")
async def show_balance_history(callback: CallbackQuery, session: AsyncSession):
    """Показать историю операций с балансом"""
    await callback.answer("⏳")

    # TODO: Добавить модель BonusTransaction и историю
    text = """📜 <b>История операций</b>

<i>История операций пока недоступна.
Скоро добавим!</i>"""

    try:
        await callback.message.edit_text(text, reply_markup=get_back_to_profile_keyboard())
    except Exception:
        await callback.message.answer(text, reply_markup=get_back_to_profile_keyboard())


# ══════════════════════════════════════════════════════════════
#                    РЕФЕРАЛЬНАЯ ПРОГРАММА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "profile_referral")
async def show_referral(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Показать реферальную программу"""
    await callback.answer("⏳")

    telegram_id = callback.from_user.id
    referral_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"

    # Получаем статистику
    user_query = select(User).where(User.telegram_id == telegram_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    referrals_count = user.referrals_count if user else 0
    referral_earnings = user.referral_earnings if user else 0

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.NAV_BUTTON,
            user=callback.from_user,
            details="Открыл «Друзья» в ЛК",
            session=session,
        )
    except Exception:
        pass

    text = f"""🤝 <b>Привести друга</b>

<b>Твоя ссылка:</b>
<code>{referral_link}</code>

<b>Как это работает</b>

1. Друг переходит по ссылке
2. Делает заказ
3. Ты получаешь 5% от суммы на баланс
4. Друг получает скидку 5% на первый заказ

<b>Твоя статистика</b>

◈ Приглашено: {referrals_count}
◈ Заработано: {referral_earnings:.0f}₽"""

    try:
        await callback.message.edit_text(text, reply_markup=get_referral_keyboard(referral_link))
    except Exception:
        await callback.message.answer(text, reply_markup=get_referral_keyboard(referral_link))


# ══════════════════════════════════════════════════════════════
#                    СЛУЖЕБНЫЕ ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "noop")
async def noop_handler(callback: CallbackQuery):
    """Пустой обработчик для некликабельных кнопок"""
    await callback.answer()
