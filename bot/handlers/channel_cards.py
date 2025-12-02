"""
Handlers для callback-действий в канале заказов.

Обрабатывает кнопки на Live-карточках прямо в канале,
без перехода в личку бота.
"""
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from aiogram import Router, Bot, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
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
from bot.services.unified_hub import (
    update_topic_name,
    close_order_topic,
    reopen_order_topic,
)
from core.config import settings
from bot.handlers.order_chat import get_or_create_topic, format_order_info
from core.media_cache import send_cached_photo

# Изображение для счёта/инвойса
IMG_PAYMENT_BILL = Path("/root/academic_saloon/bot/media/confirm_std.jpg")

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
        bonus_line = f"💎 <i>{bonus_note}</i>\n"
    elif bonus_used > 0:
        bonus_line = f"💎 Бонусы:  <code>−{bonus_used:.0f} ₽</code>\n"
    else:
        bonus_line = ""

    return f"""<b>💰 СЧЁТ НА ОПЛАТУ №{order_id}</b>

Шериф всё посчитал. Расклад такой:

📂 <b>{work_label}</b>
{deadline_line}💵 Тариф:  <code>{base_price:.0f} ₽</code>
{bonus_line}👉 <b>К ОПЛАТЕ: <code>{final_price:.0f} ₽</code></b>

<i>Выбирай, как удобнее платить.</i>"""


def build_payment_keyboard(order_id: int, final_price: float, bonus_used: float = 0) -> InlineKeyboardMarkup:
    """
    Создаёт клавиатуру с вариантами оплаты.
    """
    half_amount = final_price / 2

    buttons = [
        [InlineKeyboardButton(
            text=f"💳 100% Сразу ({final_price:.0f}₽)",
            callback_data=f"pay_scheme:full:{order_id}"
        )],
        [InlineKeyboardButton(
            text=f"🌓 Аванс 50% ({half_amount:.0f}₽)",
            callback_data=f"pay_scheme:half:{order_id}"
        )],
    ]

    # Кнопка "Не тратить бонусы" только если они были применены
    if bonus_used > 0:
        buttons.append([InlineKeyboardButton(
            text="🔄 Не тратить бонусы (Пересчитать)",
            callback_data=f"price_no_bonus:{order_id}"
        )])

    # Кнопка для вопросов/торга
    buttons.append([InlineKeyboardButton(
        text="💬 Обсудить условия",
        callback_data=f"price_question:{order_id}"
    )])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def send_payment_notification(
    bot: Bot,
    order: Order,
    user: Optional[User],
    price: float,
) -> bool:
    """
    Отправляет клиенту полноценное уведомление об оплате с кнопками.
    Использует существующую логику из admin.py
    """
    if not user:
        return False

    try:
        # Рассчитываем бонусы (максимум 50% от цены)
        max_bonus = price * 0.5
        bonus_used = min(user.balance, max_bonus)
        final_price = price - bonus_used

        # Формируем текст
        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

        client_text = build_price_offer_text(
            order_id=order.id,
            work_label=work_label,
            deadline=order.deadline,
            base_price=price,
            bonus_used=bonus_used,
            final_price=final_price,
        )

        # Формируем клавиатуру
        kb = build_payment_keyboard(order.id, final_price, bonus_used)

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
        max_bonus = price * 0.5
        bonus_used = min(user.balance, max_bonus)

    # Устанавливаем цену и бонусы
    order.price = float(price)
    order.bonus_used = bonus_used
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # UNIFIED HUB: Обновляем название топика
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    final_price = price - bonus_used

    # Формируем текст с информацией о бонусах
    if bonus_used > 0:
        extra_text = (
            f"💵 Тариф: {price:,}₽\n"
            f"💎 Бонусы: −{bonus_used:.0f}₽ (баланс клиента)\n"
            f"👉 К оплате: {final_price:,.0f}₽"
        ).replace(",", " ")
    else:
        extra_text = f"💵 Цена: {price:,}₽ (бонусов нет)".replace(",", " ")

    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=extra_text
    )

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, user, price)

    price_formatted = f"{price:,}".replace(",", " ")
    if sent:
        await callback.answer(f"✅ Цена {price_formatted}₽ — клиент получил счёт!", show_alert=True)
    else:
        await callback.answer(f"✅ Цена {price_formatted}₽ (уведомление не доставлено)", show_alert=True)


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_confirm_pay:"))
async def card_confirm_payment(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Подтвердить оплату — использует тот же формат, что и admin.py"""
    from aiogram.types import FSInputFile

    # Путь к картинке успешной оплаты
    PAYMENT_SUCCESS_IMAGE = Path("/root/academic_saloon/bot/media/payment_success.jpg")

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

    # UNIFIED HUB: Обновляем название топика
    await update_topic_name(bot, session, order, user)

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
        extra_text=f"✅ Оплата подтверждена {datetime.now().strftime('%d.%m %H:%M')}"
    )

    # ═══ УВЕДОМЛЕНИЕ КЛИЕНТУ (как в admin.py) ═══
    paid_formatted = f"{int(order.paid_amount):,}".replace(",", " ")
    user_text = f"""🎉 <b>ОПЛАТА ПОДТВЕРЖДЕНА!</b>

Заказ <b>#{order.id}</b> принят в работу.
💰 Получено: <b>{paid_formatted} ₽</b>

Шериф уже запряг лошадей. Как будет готово — пришлю уведомление сюда.
Следи за статусом в кабинете."""

    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👀 Отследить статус", callback_data="my_orders")],
        [InlineKeyboardButton(text="🤝 Приведи друга (+500₽)", callback_data="profile_referral")],
        [InlineKeyboardButton(text="🌵 В Салун", callback_data="back_to_menu")],
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

    await callback.answer("✅ Оплата подтверждена, клиент уведомлён", show_alert=True)


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

    # Красивое уведомление клиенту с кнопками
    final_price = order.price - order.bonus_used if order.bonus_used else order.price

    client_text = f"""⚠️ <b>Оплата не найдена</b>

Заказ <code>#{order.id}</code> • <b>{int(final_price):,} ₽</b>

Мы проверили счёт, но пока не видим поступления.

<b>Возможные причины:</b>
• Перевод ещё в обработке (5-15 минут)
• Неверные реквизиты
• Ошибка при переводе

<i>Если ты точно перевёл — напиши в поддержку
со скриншотом чека, разберёмся!</i>""".replace(",", " ")

    client_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💳 К оплате",
            callback_data=f"pay_order:{order_id}"
        )],
        [InlineKeyboardButton(
            text="🆘 Написать Шерифу",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
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
    await session.commit()

    # Обновляем карточку
    await update_card_status(
        bot, order, session,
        client_username=user.username if user else None,
        client_name=user.fullname if user else None,
    )

    # UNIFIED HUB: Закрываем топик
    await close_order_topic(bot, session, order)

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


# ══════════════════════════════════════════════════════════════
#           CALLBACK HANDLERS - ОТКРЫТИЕ ЧАТА (FORUM TOPICS)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("card_chat:"))
async def card_open_chat_topic(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Открывает или создаёт топик для чата с клиентом.
    FUSION: При создании топика автоматически постится карточка заказа.
    После создания обновляет кнопку на карточке канала для прямой ссылки.
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
        # Получаем или создаём топик (с автопостингом карточки через FUSION)
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

        # Обновляем карточку в канале чтобы кнопка "Чат" стала прямой ссылкой
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
