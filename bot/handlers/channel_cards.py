"""
Handlers для callback-действий в канале заказов.

Обрабатывает кнопки на Live-карточках прямо в канале,
без перехода в личку бота.
"""
import logging
from datetime import datetime

from aiogram import Router, Bot, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, OrderStatus
from database.models.users import User
from bot.services.live_cards import (
    update_card_status,
    send_or_update_card,
    get_card_link,
    ORDERS_CHANNEL_ID,
)
from core.config import settings

logger = logging.getLogger(__name__)

router = Router()


# ══════════════════════════════════════════════════════════════
#           ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

def parse_order_id(callback_data: str) -> int:
    """Извлекает order_id из callback_data, игнорируя суффиксы вроде _confirmed"""
    # card_reject:123 или card_reject:123_confirmed
    parts = callback_data.split(":")
    if len(parts) < 2:
        raise ValueError(f"Invalid callback_data: {callback_data}")

    order_part = parts[1]
    # Убираем суффиксы (_confirmed, _yes, etc.)
    order_id_str = order_part.split("_")[0]
    return int(order_id_str)


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


def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ОТКЛОНЕНИЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_reject:") & ~F.data.endswith("_yes"))
async def card_reject_order_confirm(callback: CallbackQuery):
    """Отклонить заказ - запрос подтверждения"""
    logger.info(f"card_reject_order_confirm called: {callback.data}")
    try:
        order_id = parse_order_id(callback.data)
        logger.info(f"Parsed order_id: {order_id}")
    except ValueError as e:
        logger.error(f"Failed to parse order_id: {e}")
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Показываем кнопки подтверждения
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Да, отклонить", callback_data=f"card_reject:{order_id}_yes"),
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"card_cancel:{order_id}"),
        ]
    ])

    await callback.answer()
    try:
        await callback.message.edit_reply_markup(reply_markup=keyboard)
        logger.info(f"Successfully showed confirmation for order {order_id}")
    except Exception as e:
        logger.error(f"Failed to edit reply markup: {e}")


@router.callback_query(F.data.startswith("card_reject:") & F.data.endswith("_yes"))
async def card_reject_order_execute(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отклонить заказ - выполнение"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Выполняем отклонение
    order.status = OrderStatus.REJECTED.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"❌ Отклонено {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"😔 <b>Заказ #{order.id} отклонён</b>\n\n"
        "К сожалению, мы не можем взять этот заказ в работу.\n"
        "Попробуй оформить новый заказ с более подробным описанием."
    )

    await callback.answer("✅ Заказ отклонён", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - БАН
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_ban:") & ~F.data.endswith("_yes"))
async def card_ban_user_confirm(callback: CallbackQuery):
    """Забанить спамера - запрос подтверждения"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🚫 Да, забанить", callback_data=f"card_ban:{order_id}_yes"),
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"card_cancel:{order_id}"),
        ]
    ])

    await callback.answer()
    try:
        await callback.message.edit_reply_markup(reply_markup=keyboard)
    except Exception:
        pass


@router.callback_query(F.data.startswith("card_ban:") & F.data.endswith("_yes"))
async def card_ban_user_execute(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Забанить спамера - выполнение"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
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
        client_name=user.fullname if user else None,
        extra_text=f"🚫 СПАМ/БАН {datetime.now().strftime('%d.%m %H:%M')}"
    )

    await callback.answer("🚫 Пользователь забанен", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ОТМЕНА ДЕЙСТВИЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_cancel:"))
async def card_cancel_action(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отмена действия - возврат к обычным кнопкам"""
    logger.info(f"card_cancel_action called: {callback.data}")
    try:
        order_id = parse_order_id(callback.data)
        logger.info(f"Parsed order_id: {order_id}")
    except ValueError as e:
        logger.error(f"Failed to parse order_id: {e}")
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order, user = await get_order_with_user(session, order_id)
    except Exception as e:
        logger.error(f"Database error: {e}")
        await callback.answer("Ошибка базы данных", show_alert=True)
        return

    if not order:
        logger.warning(f"Order {order_id} not found")
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Восстанавливаем карточку с обычными кнопками
    try:
        await send_or_update_card(
            bot, order, session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
        )
        logger.info(f"Card restored for order {order_id}")
    except Exception as e:
        logger.error(f"Failed to restore card: {e}")

    await callback.answer("Отменено")


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - УСТАНОВКА ЦЕНЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_price:"))
async def card_set_price_menu(callback: CallbackQuery, session: AsyncSession):
    """Показать меню выбора цены"""
    logger.info(f"card_set_price_menu called: {callback.data}, from_user: {callback.from_user.id}")

    try:
        order_id = parse_order_id(callback.data)
        logger.info(f"Parsed order_id: {order_id}")

        order = await session.get(Order, order_id)
        if not order:
            logger.warning(f"Order {order_id} not found")
            await callback.answer("Заказ не найден", show_alert=True)
            return

        # Если робот уже насчитал цену, предлагаем её подтвердить
        robot_price = int(order.price) if order.price > 0 else 0

        # Популярные цены
        preset_prices = [1500, 2500, 5000, 10000, 15000, 25000]

        buttons = []

        # Если есть цена от робота - первой кнопкой
        if robot_price > 0:
            buttons.append([
                InlineKeyboardButton(
                    text=f"✅ Подтвердить {robot_price:,}₽".replace(",", " "),
                    callback_data=f"card_setprice:{order_id}:{robot_price}"
                )
            ])

        # Preset цены (по 3 в ряд)
        row = []
        for price in preset_prices:
            row.append(InlineKeyboardButton(
                text=f"{price:,}₽".replace(",", " "),
                callback_data=f"card_setprice:{order_id}:{price}"
            ))
            if len(row) == 3:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

        # Кнопка для ввода своей цены (в личке)
        bot_username = settings.BOT_USERNAME
        buttons.append([
            InlineKeyboardButton(
                text="✏️ Своя цена",
                url=f"https://t.me/{bot_username}?start=setprice_{order_id}"
            )
        ])

        # Кнопка отмены
        buttons.append([
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"card_cancel:{order_id}")
        ])

        keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

        await callback.answer()
        await callback.message.edit_reply_markup(reply_markup=keyboard)
        logger.info(f"Price menu shown for order {order_id}")

    except Exception as e:
        logger.error(f"Error in card_set_price_menu: {type(e).__name__}: {e}", exc_info=True)
        await callback.answer(f"Ошибка: {type(e).__name__}", show_alert=True)


@router.callback_query(F.data.startswith("card_setprice:"))
async def card_set_price_execute(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Установить выбранную цену"""
    try:
        parts = callback.data.split(":")
        order_id = int(parts[1])
        price = int(parts[2])
    except (ValueError, IndexError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Устанавливаем цену
    order.price = float(price)
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"💵 Цена установлена: {price:,}₽".replace(",", " ")
    )

    # Уведомляем клиента
    price_formatted = f"{price:,}".replace(",", " ")
    await notify_client(
        bot, order.user_id,
        f"💰 <b>Цена за заказ #{order.id}:</b> {price_formatted}₽\n\n"
        "Оплати, чтобы мы начали работу!"
    )

    await callback.answer(f"✅ Цена {price_formatted}₽ установлена!", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_confirm_pay:"))
async def card_confirm_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить оплату"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
        client_name=user.fullname if user else None,
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
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
        client_name=user.fullname if user else None,
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


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - НАПОМИНАНИЕ И ЗАВЕРШЕНИЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_remind:"))
async def card_remind_client(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Напомнить клиенту об оплате"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
            client_name=user.fullname if user else None,
            extra_text=f"🔔 Напомнили клиенту {datetime.now().strftime('%d.%m %H:%M')}"
        )

        await callback.answer("🔔 Напоминание отправлено!", show_alert=True)
    else:
        await callback.answer("❌ Не удалось отправить напоминание", show_alert=True)


@router.callback_query(F.data.startswith("card_complete:"))
async def card_complete_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Завершить заказ"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

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
        client_name=user.fullname if user else None,
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
