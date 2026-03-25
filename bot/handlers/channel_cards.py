"""
Handlers для callback-действий в канале заказов.

Обрабатывает кнопки на Live-карточках прямо в канале,
без перехода в личку бота.
"""
from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime
from pathlib import Path
from typing import Optional

from aiogram import Router, Bot, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType, Conversation, ConversationType
from database.models.users import User
from bot.services.live_cards import (
    update_card_status,
    send_or_update_card,
    get_card_link,
    ORDERS_CHANNEL_ID,
)
from bot.services.order_progress import (
    get_progress_keyboard,
    update_order_progress,
    build_progress_bar,
)
from bot.services.unified_hub import (
    update_topic_name,
    close_order_topic,
    reopen_order_topic,
)
from core.config import settings
from bot.handlers.order_chat import get_or_create_topic, format_order_info
from bot.services.order_message_formatter import (
    build_client_price_ready_text,
    build_payment_keyboard as build_order_payment_keyboard,
)
from bot.utils import parse_order_id
from bot.utils.formatting import format_price
from core.media_cache import send_cached_photo

# Изображение для счёта/инвойса
IMG_PAYMENT_BILL = Path(__file__).parent.parent / "media" / "confirm_std.jpg"

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


def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


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
    deadline_line = f"⏱ Срок: <b>{deadline}</b>\n" if deadline else ""

    # Строка с бонусами
    if bonus_note:
        bonus_line = f"💎 <i>{bonus_note}</i>\n"
    elif bonus_used > 0:
        bonus_line = f"💎 Списано бонусов: <code>−{bonus_used:.0f} ₽</code>\n"
    else:
        bonus_line = ""

    return f"""<b>Стоимость согласована</b>

Заказ <code>#{order_id}</code> · <b>{work_label}</b>
{deadline_line}💵 Базовая стоимость: <code>{base_price:.0f} ₽</code>
{bonus_line}👉 <b>К оплате: <code>{final_price:.0f} ₽</code></b>

<i>Выберите удобный формат оплаты ниже.</i>"""


def build_payment_keyboard(order_id: int, final_price: float, bonus_used: float = 0) -> InlineKeyboardMarkup:
    """
    Создаёт клавиатуру с вариантами оплаты.
    """
    half_amount = final_price / 2

    buttons = [
        [InlineKeyboardButton(
            text=f"Оплатить полностью ({final_price:.0f} ₽)",
            callback_data=f"pay_scheme:full:{order_id}"
        )],
        [InlineKeyboardButton(
            text=f"Предоплата 50% ({half_amount:.0f} ₽)",
            callback_data=f"pay_scheme:half:{order_id}"
        )],
    ]

    # Кнопка "Не тратить бонусы" только если они были применены
    if bonus_used > 0:
        buttons.append([InlineKeyboardButton(
            text="Не списывать бонусы",
            callback_data=f"price_no_bonus:{order_id}"
        )])

    # Кнопка для вопросов/торга
    buttons.append([InlineKeyboardButton(
        text="Обсудить условия",
        callback_data=f"price_question:{order_id}"
    )])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _to_decimal(value: object) -> Decimal:
    """Приводит денежные значения к Decimal для стабильной арифметики."""
    if isinstance(value, Decimal):
        return value
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


async def send_payment_notification(
    bot: Bot,
    order: Order,
    user: Optional[User],
    price: float,
) -> bool:
    """
    Отправляет клиенту премиум-уведомление об оплате с кнопкой Mini App.
    Вся логика оплаты теперь в Mini App — более чистый и современный UX.
    """
    if not user:
        return False

    try:
        client_text = build_client_price_ready_text(order)
        kb = build_order_payment_keyboard(
            order_id=order.id,
            chat_callback=f"price_question:{order.id}",
        )

        # Отправляем с картинкой
        if IMG_PAYMENT_BILL.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=order.user_id,
                    photo_path=IMG_PAYMENT_BILL,
                    caption=client_text,
                    reply_markup=kb,
                )
                return True
            except Exception as e:
                logger.warning(f"Не удалось отправить payment_bill image: {e}")

        # Fallback: отправляем без картинки
        await bot.send_message(order.user_id, client_text, reply_markup=kb)
        return True

    except Exception as e:
        logger.warning(f"Failed to send payment notification to {order.user_id}: {e}")
        return False


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

    # UNIFIED HUB: Закрываем топик
    await close_order_topic(bot, session, order)

    # Уведомляем клиента
    await notify_client(
        bot, order.user_id,
        f"<b>Заказ #{order.id} отклонён</b>\n\n"
        "К сожалению, мы не можем взять этот заказ в работу.\n"
        "Попробуйте оформить новый заказ с более подробным описанием."
    )

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ ОБ ОТКЛОНЕНИИ ═══
    try:
        from bot.services.realtime_notifications import send_custom_notification
        await send_custom_notification(
            telegram_id=order.user_id,
            title="😔 Заказ отклонён",
            message=f"Заказ #{order.id} не может быть выполнен",
            notification_type="order_rejected",
            icon="x-circle",
            color="#ef4444",
            action="view_orders",
            data={"order_id": order.id, "status": OrderStatus.REJECTED.value},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

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

    # UNIFIED HUB: Закрываем топик
    await close_order_topic(bot, session, order)

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
                    text=f"✅ Подтвердить {format_price(robot_price)}",
                    callback_data=f"card_setprice:{order_id}:{robot_price}"
                )
            ])

        # Preset цены (по 3 в ряд)
        row = []
        for price in preset_prices:
            row.append(InlineKeyboardButton(
                text=format_price(price),
                callback_data=f"card_setprice:{order_id}:{price}"
            ))
            if len(row) == 3:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

        # Кнопка для ввода своей цены (прямо в топике)
        buttons.append([
            InlineKeyboardButton(
                text="✏️ Своя цена",
                callback_data=f"admin_set_price:{order_id}"
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

    # Рассчитываем бонусы (как в admin.py)
    bonus_used = 0
    if user and user.balance > 0:
        max_bonus = float(price) * 0.5
        bonus_used = min(user.balance, max_bonus)

    # Устанавливаем цену и бонусы
    order.price = float(price)
    order.bonus_used = bonus_used
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # UNIFIED HUB: Обновляем название топика
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    # Use order.final_price property which includes discount (loyalty + promo)
    final_price = order.final_price

    # Формируем текст с информацией о бонусах
    if bonus_used > 0:
        extra_text = (
            f"💵 Тариф: {format_price(price)}\n"
            f"💎 Бонусы: −{bonus_used:.0f}₽ (баланс клиента)\n"
            f"👉 К оплате: {format_price(int(final_price))}"
        )
    else:
        extra_text = f"💵 Цена: {format_price(price)} (бонусов нет)"

    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=extra_text
    )

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, user, price)

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ЦЕНЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.WAITING_PAYMENT.value,
            extra_data={"final_price": final_price, "bonus_used": bonus_used},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    price_formatted = format_price(price, False)
    if sent:
        await callback.answer(f"✅ Цена {price_formatted}₽ — клиент получил счёт!", show_alert=True)
    else:
        await callback.answer(f"✅ Цена {price_formatted}₽ (уведомление не доставлено)", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_confirm_pay:"))
async def card_confirm_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить оплату (полную или предоплату 50%)"""
    from aiogram.types import FSInputFile

    # Путь к картинке успешной оплаты
    PAYMENT_SUCCESS_IMAGE = Path(__file__).parent.parent / "media" / "payment_success.jpg"

    # Парсим callback_data: card_confirm_pay:{order_id}:{type}
    parts = callback.data.split(":")
    if len(parts) < 2:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Определяем тип оплаты (full/half), по умолчанию full для обратной совместимости
    payment_type = parts[2] if len(parts) > 2 else "full"

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    await callback.answer("Подтверждаю оплату...")

    final_price = _to_decimal(order.final_price or order.price or 0)
    already_paid = _to_decimal(order.paid_amount or 0)
    remaining_amount = max(final_price - already_paid, Decimal("0"))
    is_final_payment = already_paid > 0 and remaining_amount > 0

    if is_final_payment:
        order.status = OrderStatus.PAID_FULL.value
        order.paid_amount = final_price
        if not order.payment_scheme:
            order.payment_scheme = "half"
        extra_text = f"✅ Доплата ({int(remaining_amount)} ₽) — {datetime.now().strftime('%d.%m %H:%M')}"
    elif payment_type == "half":
        # Предоплата 50%
        half_amount = final_price / Decimal("2")
        order.status = OrderStatus.PAID.value  # В работу!
        order.paid_amount = half_amount
        order.payment_scheme = "half"
        extra_text = f"💰 Предоплата 50% ({int(half_amount)} ₽) — {datetime.now().strftime('%d.%m %H:%M')}"
    else:
        # Полная оплата
        order.status = OrderStatus.PAID_FULL.value
        order.paid_amount = final_price
        order.payment_scheme = "full"
        extra_text = f"✅ Полная оплата ({int(final_price)} ₽) — {datetime.now().strftime('%d.%m %H:%M')}"

    await session.commit()

    # UNIFIED HUB: Обновляем название топика
    try:
        await update_topic_name(bot, session, order, user)
    except Exception as e:
        logger.exception(f"Failed to update topic name after payment confirmation for order #{order.id}: {e}")

    # Обновляем карточку
    try:
        await update_card_status(
            bot, order, session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            extra_text=extra_text
        )
    except Exception as e:
        logger.exception(f"Failed to update live card after payment confirmation for order #{order.id}: {e}")
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    # ═══ УВЕДОМЛЕНИЕ КЛИЕНТУ ═══
    paid_formatted = format_price(int(order.paid_amount), False)

    if is_final_payment:
        user_text = f"""🎉 <b>ДОПЛАТА ПОЛУЧЕНА!</b>

Заказ <b>#{order.id}</b> оплачен полностью.
✅ Получено всего: <b>{paid_formatted} ₽</b>

Теперь можно передать клиенту полный результат."""
    elif payment_type == "half":
        remaining = int(max(final_price - _to_decimal(order.paid_amount), Decimal("0")))
        user_text = f"""💰 <b>ПРЕДОПЛАТА ПОЛУЧЕНА!</b>

Заказ <b>#{order.id}</b> принят в работу.
✅ Внесено: <b>{paid_formatted} ₽</b>
💳 Доплата после выполнения: <b>{remaining} ₽</b>

Работа уже началась. Следи за прогрессом в кабинете!"""
    else:
        user_text = f"""🎉 <b>Оплата подтверждена</b>

Заказ <b>#{order.id}</b> принят в работу.
💰 Получено: <b>{paid_formatted} ₽</b>

Работа уже запущена. Когда появится следующий этап, сразу пришлём уведомление сюда.
Статус и детали всегда доступны в приложении."""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📱 Открыть заказ",
            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/order/{order.id}")
        )],
        [InlineKeyboardButton(
            text="📋 Мои заказы",
            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/orders")
        )],
    ])

    try:
        if PAYMENT_SUCCESS_IMAGE.exists():
            photo_file = FSInputFile(PAYMENT_SUCCESS_IMAGE)
            await bot.send_photo(
                chat_id=order.user_id,
                photo=photo_file,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        else:
            await bot.send_message(order.user_id, user_text, reply_markup=user_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось уведомить клиента {order.user_id}: {e}")

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ ОБ ОПЛАТЕ ═══
    confirmed_payment_type = "final" if is_final_payment else payment_type
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=order.status,
            extra_data={"paid_amount": float(order.paid_amount or 0), "payment_type": confirmed_payment_type},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")


# ══════════════════════════════════════════════════════════════
#           ДОПЛАТА (для схемы 50% предоплаты)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_request_final:"))
async def card_request_final_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Запросить доплату у клиента (для предоплаты 50%)"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    remaining = float(order.final_price or 0) - float(order.paid_amount or 0)
    if remaining <= 0:
        await callback.answer("Заказ уже полностью оплачен", show_alert=True)
        return

    remaining_formatted = format_price(int(remaining), False)

    # Уведомляем клиента о необходимости доплаты
    user_text = f"""💳 <b>РАБОТА ГОТОВА — НУЖНА ДОПЛАТА</b>

Заказ <b>#{order.id}</b> выполнен!

💰 К доплате: <b>{remaining_formatted} ₽</b>

После оплаты вы получите готовую работу.
Реквизиты для оплаты — в Mini App."""

    webapp_url = f"{settings.WEBAPP_URL}/order/{order.id}"
    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Перейти к оплате", web_app=WebAppInfo(url=webapp_url))],
        [InlineKeyboardButton(text="💬 Связаться", callback_data=f"chat_order:{order.id}")],
    ])

    try:
        await bot.send_message(order.user_id, user_text, reply_markup=user_keyboard)

        # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ДОПЛАТЕ ═══
        try:
            from bot.services.realtime_notifications import send_custom_notification
            await send_custom_notification(
                telegram_id=order.user_id,
                title="💳 Нужна доплата",
                message=f"Работа готова! К оплате: {remaining_formatted} ₽",
                notification_type="payment",
                icon="credit-card",
                color="#f59e0b",
                action="view_order",
                data={"order_id": order.id, "amount": remaining},
            )
        except Exception as ws_err:
            logger.debug(f"WebSocket notification failed: {ws_err}")

        await callback.answer(f"📤 Запрос на доплату {int(remaining)} ₽ отправлен клиенту", show_alert=True)
    except Exception as e:
        logger.warning(f"Не удалось уведомить клиента {order.user_id}: {e}")
        await callback.answer("⚠️ Не удалось отправить уведомление клиенту", show_alert=True)


@router.callback_query(F.data.startswith("card_confirm_final:"))
async def card_confirm_final_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить получение доплаты"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    remaining = float(order.final_price or 0) - float(order.paid_amount or 0)
    if remaining <= 0:
        await callback.answer("Заказ уже полностью оплачен", show_alert=True)
        return

    # Фиксируем полную оплату
    order.paid_amount = order.final_price
    order.status = OrderStatus.PAID_FULL.value
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"✅ Доплата {int(remaining)} ₽ получена — {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Уведомляем клиента
    user_text = f"""✅ <b>ДОПЛАТА ПОЛУЧЕНА!</b>

Заказ <b>#{order.id}</b> полностью оплачен.
💰 Всего оплачено: <b>{int(order.final_price):,} ₽</b>

Готовая работа уже ждёт вас!"""

    try:
        await bot.send_message(order.user_id, user_text)
    except Exception as e:
        logger.warning(f"Не удалось уведомить клиента {order.user_id}: {e}")

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ДОПЛАТЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.PAID_FULL.value,
            extra_data={"total_paid": float(order.final_price or 0)},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    await callback.answer(f"✅ Доплата {int(remaining)} ₽ подтверждена", show_alert=True)


@router.callback_query(F.data.startswith("card_reject_pay:"))
async def card_reject_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отклонить (оплата не прошла) — с красивым уведомлением"""
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

    # UNIFIED HUB: Обновляем название топика
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"❌ Оплата не найдена {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # Красивое уведомление клиенту с кнопками (с учётом скидки и бонусов)
    final_price = order.final_price

    client_text = f"""⚠️ <b>Оплата не найдена</b>

Заказ <code>#{order.id}</code> • <b>{format_price(int(final_price))}</b>

Мы проверили счёт, но пока не видим поступления.

<b>Возможные причины:</b>
• Перевод ещё в обработке (5-15 минут)
• Неверные реквизиты
• Ошибка при переводе

<i>Если ты точно перевёл — напиши в поддержку
со скриншотом чека, разберёмся!</i>"""

    client_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💳 Вернуться к оплате",
            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/order/{order_id}?action=pay")
        )],
        [InlineKeyboardButton(
            text="Открыть поддержку",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
    ])

    try:
        await bot.send_message(order.user_id, client_text, reply_markup=client_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось уведомить клиента {order.user_id}: {e}")

    await callback.answer("❌ Оплата не найдена, клиент уведомлён", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - НАПОМИНАНИЕ И ЗАВЕРШЕНИЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_remind:"))
async def card_remind_client(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Напомнить клиенту об оплате — отправляет полноценный счёт с кнопками"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if not order.price or order.price <= 0:
        await callback.answer("❌ Цена ещё не установлена", show_alert=True)
        return

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, user, order.price)

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

        await callback.answer("🔔 Счёт повторно отправлен клиенту!", show_alert=True)
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

    # Увеличиваем счётчик заказов пользователя
    if user:
        user.orders_count = (user.orders_count or 0) + 1
        user.total_spent = (user.total_spent or 0) + float(order.paid_amount or order.final_price or order.price or 0)

    await session.commit()

    # Начисляем кешбэк за заказ
    cashback_amount = 0.0
    if user:
        from bot.services.bonus import BonusService
        order_amount = float(order.paid_amount or order.final_price or order.price or 0)
        cashback_amount = await BonusService.add_order_cashback(
            session=session,
            bot=bot,
            user_id=order.user_id,
            order_id=order.id,
            order_amount=order_amount,
        )

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )

    # UNIFIED HUB: Закрываем топик
    await close_order_topic(bot, session, order)

    # Уведомляем клиента
    cashback_text = ""
    if cashback_amount > 0:
        cashback_text = f"\n💰 <b>Кешбэк:</b> +{cashback_amount:.0f}₽ на бонусный счёт"

    await notify_client(
        bot, order.user_id,
        f"🎉 <b>Заказ #{order.id} завершён!</b>{cashback_text}\n\n"
        "Спасибо, что выбрал нас! Будем рады помочь снова.\n\n"
        "Оставь отзыв, если понравилось 🌟"
    )

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О ЗАВЕРШЕНИИ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.COMPLETED.value,
            extra_data={"cashback": cashback_amount} if cashback_amount > 0 else None,
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    await callback.answer("✅ Заказ завершён!", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           СДАЧА РАБОТЫ (прямо в топике)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_deliver:"))
async def card_deliver_menu(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Показать меню сдачи работы прямо в топике"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    client_name = user.fullname if user else "Клиент"

    text = f"""📤 <b>Сдача работы по заказу #{order_id}</b>

👤 Клиент: <b>{client_name}</b>

<b>Инструкция:</b>
1️⃣ Отправьте файлы прямо в этот топик
   <i>(они автоматически уйдут клиенту)</i>

2️⃣ Добавьте комментарий если нужно

3️⃣ Нажмите <b>«✅ Работа отправлена»</b>

━━━━━━━━━━━━━━━━━━━━━━
💡 <i>После подтверждения клиент получит уведомление
и 30 дней на бесплатные правки</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Работа отправлена",
            callback_data=f"card_deliver_confirm:{order.id}"
        )],
        [InlineKeyboardButton(
            text="◀️ Назад к карточке",
            callback_data=f"card_back:{order.id}"
        )],
    ])

    await callback.message.edit_text(text, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data.startswith("card_deliver_confirm:"))
async def card_deliver_confirm(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить сдачу работы → статус review + уведомление клиенту"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Меняем статус на "На проверке"
    old_status = order.status
    order.status = OrderStatus.REVIEW.value
    order.delivered_at = datetime.utcnow()  # Фиксируем время сдачи для 30-дневного таймера
    await session.commit()

    # UNIFIED HUB: Обновляем название топика
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"📤 Работа сдана — {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # ═══ УВЕДОМЛЕНИЕ КЛИЕНТУ ═══
    webapp_url = f"{settings.WEBAPP_URL}/order/{order.id}"
    user_text = f"""🎉 <b>РАБОТА ГОТОВА!</b>

Заказ <b>#{order.id}</b> выполнен и ждёт вашей проверки.

📁 Файлы отправлены в чат
⏰ <b>30 дней</b> на бесплатные правки

Проверьте работу и подтвердите получение 👇"""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👀 Проверить работу", web_app=WebAppInfo(url=webapp_url))],
        [InlineKeyboardButton(text="💬 Написать менеджеру", callback_data=f"enter_chat_order_{order.id}")],
    ])

    try:
        await bot.send_message(order.user_id, user_text, reply_markup=user_keyboard)
    except Exception as e:
        logger.warning(f"Не удалось уведомить клиента {order.user_id}: {e}")

    # ═══ WEBSOCKET УВЕДОМЛЕНИЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.REVIEW.value,
            old_status=old_status,
            extra_data={"delivered_at": datetime.utcnow().isoformat()},
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    await callback.answer("✅ Работа отправлена клиенту!", show_alert=True)


@router.callback_query(F.data.startswith("card_back:"))
async def card_back_to_card(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Вернуться к карточке заказа"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Перерендерим карточку
    from bot.services.live_cards import render_order_card, get_card_keyboard

    card_text = await render_order_card(
        order=order,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )

    keyboard = await get_card_keyboard(order, session, bot)

    try:
        await callback.message.edit_text(card_text, reply_markup=keyboard)
    except Exception:
        pass

    await callback.answer()


# ══════════════════════════════════════════════════════════════
#           ПРОГРЕСС ЗАКАЗА (прямо в топике)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_progress:"))
async def card_show_progress_menu(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Показать меню прогресса прямо в топике"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    current_progress = getattr(order, 'progress', 0) or 0
    progress_bar = build_progress_bar(current_progress)

    text = f"""📊 <b>Прогресс заказа #{order_id}</b>

{progress_bar}

<b>Текущий прогресс:</b> {current_progress}%

Выбери новый прогресс:

<i>💡 При достижении 25%, 50%, 75% и 100%
клиент получит уведомление автоматически.</i>"""

    await callback.message.edit_text(
        text,
        reply_markup=get_topic_progress_keyboard(order_id, current_progress)
    )
    await callback.answer()


def get_topic_progress_keyboard(order_id: int, current_progress: int = 0) -> InlineKeyboardMarkup:
    """Клавиатура прогресса для топика (компактная)"""
    buttons = []

    # Быстрые пресеты
    presets = [25, 50, 75, 100]
    preset_row = []
    for p in presets:
        emoji = "✅" if current_progress >= p else ""
        preset_row.append(
            InlineKeyboardButton(
                text=f"{emoji}{p}%",
                callback_data=f"topic_progress_set:{order_id}:{p}"
            )
        )
    buttons.append(preset_row)

    # Кнопки +/- 10%
    buttons.append([
        InlineKeyboardButton(
            text="➖ 10%",
            callback_data=f"topic_progress_dec:{order_id}"
        ),
        InlineKeyboardButton(
            text="➕ 10%",
            callback_data=f"topic_progress_inc:{order_id}"
        ),
    ])

    # Назад к карточке
    buttons.append([
        InlineKeyboardButton(
            text="◀️ Назад к карточке",
            callback_data=f"topic_progress_back:{order_id}"
        ),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


@router.callback_query(F.data.startswith("topic_progress_set:"))
async def topic_set_progress(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Установить прогресс из топика"""
    parts = callback.data.split(":")
    if len(parts) < 3:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    try:
        order_id = int(parts[1])
        new_progress = int(parts[2])
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Обновляем прогресс
    milestones = await update_order_progress(session, bot, order, new_progress)

    milestone_text = ""
    if milestones:
        milestone_text = f"\n🔔 Уведомления: {', '.join([f'{m}%' for m in milestones])}"

    await callback.answer(f"✅ Прогресс: {new_progress}%{milestone_text}", show_alert=True)

    # Обновляем карточку заказа в топике
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )


@router.callback_query(F.data.startswith("topic_progress_inc:"))
async def topic_increase_progress(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Увеличить прогресс на 10%"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    current = getattr(order, 'progress', 0) or 0
    new_progress = min(100, current + 10)

    milestones = await update_order_progress(session, bot, order, new_progress)

    milestone_text = ""
    if milestones:
        milestone_text = f" 🔔 {', '.join([f'{m}%' for m in milestones])}"

    await callback.answer(f"📊 {new_progress}%{milestone_text}", show_alert=True)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )


@router.callback_query(F.data.startswith("topic_progress_dec:"))
async def topic_decrease_progress(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Уменьшить прогресс на 10%"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    current = getattr(order, 'progress', 0) or 0
    new_progress = max(0, current - 10)

    await update_order_progress(session, bot, order, new_progress, notify=False)

    await callback.answer(f"📊 {new_progress}%", show_alert=True)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )


@router.callback_query(F.data.startswith("topic_progress_back:"))
async def topic_progress_back(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Вернуться к карточке заказа"""
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Обновляем карточку — вернётся стандартная карточка
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )

    await callback.answer()


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


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ОТКРЫТИЕ ЧАТА (FORUM TOPICS)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_chat:"))
async def card_open_chat_topic(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Открывает или создаёт топик для чата с клиентом.
    После создания отправляет/обновляет карточку заказа в топике.
    """
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    try:
        # Получаем или создаём топик
        conv, topic_id = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=order.user_id,
            order_id=order_id,
            conv_type=ConversationType.ORDER_CHAT.value,
        )

        # Формируем ссылку на топик
        group_id = str(settings.ADMIN_GROUP_ID).replace("-100", "")
        topic_link = f"https://t.me/c/{group_id}/{topic_id}"

        await callback.answer(f"💬 Топик готов!", show_alert=True)

        # Отправляем/обновляем карточку в топике
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
        )

        # Не отправляем отдельное сообщение - теперь всё в карточке

    except Exception as e:
        logger.error(f"Failed to create/open chat topic: {e}")
        await callback.answer(f"❌ Ошибка: {e}", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ПЕРЕОТКРЫТИЕ ЗАКАЗА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_reopen:"))
async def card_reopen_order(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Переоткрывает завершённый/отклонённый заказ.
    Возвращает статус в PENDING и открывает топик.
    """
    try:
        order_id = parse_order_id(callback.data)
    except ValueError:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order, user = await get_order_with_user(session, order_id)

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Возвращаем статус в "Новый"
    order.status = OrderStatus.PENDING.value
    order.completed_at = None
    await session.commit()

    # UNIFIED HUB: Переоткрываем топик
    await reopen_order_topic(bot, session, order)
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"🔄 Переоткрыт {datetime.now().strftime('%d.%m %H:%M')}"
    )

    await callback.answer("✅ Заказ переоткрыт!", show_alert=True)
