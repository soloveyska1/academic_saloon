"""
Handlers для callback-действий в канале заказов.

Обрабатывает кнопки на Live-карточках прямо в канале,
без перехода в личку бота.
"""
import logging
from datetime import datetime

from aiogram import Router, Bot, F
from aiogram.types import CallbackQuery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, OrderStatus
from database.models.users import User
from bot.services.live_cards import (
    update_card_status,
    get_card_link,
    ORDERS_CHANNEL_ID,
)
from core.config import settings

logger = logging.getLogger(__name__)

router = Router()


# ══════════════════════════════════════════════════════════════
#           ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

async def get_order_with_user(session: AsyncSession, order_id: int) -> tuple[Order | None, User | None]:
    """Получает заказ и пользователя"""
    order = await session.get(Order, order_id)
    if not order:
        return None, None

    user_query = select(User).where(User.telegram_id == order.user_id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    return order, user


async def notify_client(bot: Bot, user_id: int, text: str, reply_markup=None):
    """Уведомляет клиента"""
    try:
        await bot.send_message(user_id, text, reply_markup=reply_markup)
        return True
    except Exception as e:
        logger.warning(f"Failed to notify client {user_id}: {e}")
        return False


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_reject:"))
async def card_reject_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отклонить заказ (с подтверждением)"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Подтверждение
    if not callback.data.endswith("_confirmed"):
        await callback.answer(
            f"Отклонить заказ #{order_id}?\n\nНажмите ещё раз для подтверждения.",
            show_alert=True
        )
        # Меняем callback_data для подтверждения
        callback.data = f"card_reject:{order_id}_confirmed"
        return

    # Выполняем отклонение
    order.status = OrderStatus.REJECTED.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.full_name if user else None,
        extra_text=f"Отклонено {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"😔 <b>Заказ #{order.id} отклонён</b>\n\n"
        "К сожалению, мы не можем взять этот заказ в работу.\n"
        "Попробуй оформить новый заказ с более подробным описанием."
    )

    await callback.answer("✅ Заказ отклонён", show_alert=True)


@router.callback_query(F.data.startswith("card_ban:"))
async def card_ban_user(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Забанить спамера"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Подтверждение
    if not callback.data.endswith("_confirmed"):
        await callback.answer(
            f"🚫 ЗАБАНИТЬ пользователя?\n\n"
            f"User ID: {order.user_id}\n"
            "Нажмите ещё раз для подтверждения.",
            show_alert=True
        )
        callback.data = f"card_ban:{order_id}_confirmed"
        return

    # Баним пользователя
    if user:
        user.is_banned = True

    order.status = OrderStatus.REJECTED.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.full_name if user else None,
        extra_text=f"🚫 СПАМ/БАН {datetime.now().strftime('%d.%m %H:%M')}"
    )

    await callback.answer("🚫 Пользователь забанен", show_alert=True)


@router.callback_query(F.data.startswith("card_confirm_pay:"))
async def card_confirm_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить оплату"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Меняем статус на "Оплачен"
    order.status = OrderStatus.PAID_FULL.value
    order.paid_amount = order.price
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.full_name if user else None,
        extra_text=f"✅ Оплата подтверждена {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"✅ <b>Оплата подтверждена!</b>\n\n"
        f"Заказ #{order.id} принят в работу.\n"
        "Ожидай результат в срок, указанный при оформлении."
    )

    await callback.answer("✅ Оплата подтверждена, клиент уведомлён", show_alert=True)


@router.callback_query(F.data.startswith("card_reject_pay:"))
async def card_reject_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отклонить (оплата не прошла)"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Возвращаем статус "Ждёт оплаты"
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.full_name if user else None,
        extra_text=f"❌ Оплата не подтверждена {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"❌ <b>Оплата не найдена</b>\n\n"
        f"Мы не нашли оплату по заказу #{order.id}.\n"
        "Проверь статус платежа и попробуй снова."
    )

    await callback.answer("❌ Оплата отклонена", show_alert=True)


@router.callback_query(F.data.startswith("card_remind:"))
async def card_remind_client(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Напомнить клиенту об оплате"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Отправляем напоминание
    price_formatted = f"{order.price:,.0f}".replace(",", " ")
    sent = await notify_client(
        bot, order.user_id,
        f"🔔 <b>Напоминание об оплате</b>\n\n"
        f"Заказ #{order.id} ждёт оплаты.\n"
        f"💰 Сумма: <b>{price_formatted}₽</b>\n\n"
        "Оплати, чтобы мы начали работу!"
    )

    if sent:
        # Обновляем время напоминания
        order.reminder_sent_at = datetime.utcnow()
        await session.commit()

        # Добавляем инфо в карточку
        await update_card_status(
            bot, order, session,
            client_username=user.username if user else None,
            client_name=user.full_name if user else None,
            extra_text=f"🔔 Напомнили клиенту {datetime.now().strftime('%d.%m %H:%M')}"
        )

        await callback.answer("🔔 Напоминание отправлено!", show_alert=True)
    else:
        await callback.answer("❌ Не удалось отправить напоминание", show_alert=True)


@router.callback_query(F.data.startswith("card_complete:"))
async def card_complete_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Завершить заказ"""
    order_id = int(callback.data.split(":")[1])
    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Завершаем заказ
    order.status = OrderStatus.COMPLETED.value
    order.completed_at = datetime.utcnow()
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.full_name if user else None,
    )

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"🎉 <b>Заказ #{order.id} завершён!</b>\n\n"
        "Спасибо, что выбрал нас! Будем рады помочь снова.\n\n"
        "Оставь отзыв, если понравилось 🌟"
    )

    await callback.answer("✅ Заказ завершён!", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           DASHBOARD HANDLERS
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "dashboard_refresh")
async def dashboard_refresh(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Обновить дашборд"""
    from bot.services.live_cards import send_or_update_dashboard

    await callback.answer("🔄 Обновляю...")

    try:
        await send_or_update_dashboard(
            bot=bot,
            session=session,
            dashboard_message_id=callback.message.message_id,
        )
    except Exception as e:
        logger.error(f"Failed to refresh dashboard: {e}")
        await callback.answer("❌ Ошибка обновления", show_alert=True)
