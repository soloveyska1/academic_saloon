from aiogram import Router, Bot, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, ReplyKeyboardRemove, CallbackQuery
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, OrderStatus
from bot.keyboards.inline import get_main_menu_keyboard, get_saloon_status_keyboard
from bot.keyboards.terms import get_terms_short_keyboard
from bot.texts.terms import TERMS_SHORT
from bot.services.logger import log_action, LogEvent, LogLevel
from core.config import settings
from core.saloon_status import saloon_manager, generate_status_message
from core.media_cache import send_cached_photo
from bot.handlers.channel_cards import send_payment_notification


# FSM для ввода своей цены
class SetPriceState(StatesGroup):
    waiting_for_price = State()


# Combined welcome + status message - always available 24/7
# Implicit consent in footer (no barrier)
WELCOME_MESSAGE = """🌟 <b>АКАДЕМИЧЕСКИЙ САЛУН — ОТКРЫТО 24/7</b>
⚡️ Оперативная помощь. 1000+ сделок. Гарантия.

Привет, партнер! Учеба прижала к стенке? Мы здесь, чтобы прикрыть твою спину. Выбери, что нужно сделать, и мы найдем лучшего стрелка под твою задачу.

👇 Жми на главную кнопку внизу.

<i>Нажимая кнопки, ты принимаешь условия <a href="{offer_url}">Оферты</a>.</i>"""

router = Router()


async def send_and_pin_status(chat_id: int, bot: Bot, pin: bool = False):
    """
    Отправляет статус салуна с интерактивными кнопками.
    Закрепляет только если pin=True (для новых пользователей).
    """
    status = await saloon_manager.get_status()
    status_text = generate_status_message(status)

    # Отправляем сообщение со статусом и кнопками
    status_msg = await bot.send_message(
        chat_id=chat_id,
        text=status_text,
        reply_markup=get_saloon_status_keyboard()
    )

    # Закрепляем только если явно указано
    if pin:
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                disable_notification=True
            )
        except Exception:
            pass


@router.message(CommandStart(deep_link=True))
async def cmd_start_with_link(message: Message, command: CommandObject, session: AsyncSession, bot: Bot, state: FSMContext):
    """
    Хендлер /start с параметром (deep_link).
    Форматы: /start ref123456789, /start setprice_123, /start admin
    """
    await process_start(message, session, bot, state, deep_link=command.args)


@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext, command: CommandObject):
    """
    Хендлер /start без параметров или с параметрами (fallback).
    """
    # Проверяем есть ли аргументы (deep_link мог не сработать)
    deep_link = command.args if command and command.args else None
    await process_start(message, session, bot, state, deep_link=deep_link)


async def process_start(message: Message, session: AsyncSession, bot: Bot, state: FSMContext, deep_link: str | None):
    """
    Основная логика (БЕЗ БАРЬЕРА ОФЕРТЫ):
    - Новый пользователь → сразу главное меню (implicit consent)
    - Существующий пользователь → главное меню
    """
    from datetime import datetime

    # Очищаем FSM состояние при /start
    await state.clear()

    telegram_id = message.from_user.id

    # Очистка старых Reply-кнопок
    try:
        cleanup_msg = await message.answer("⏳", reply_markup=ReplyKeyboardRemove())
        await cleanup_msg.delete()
    except Exception:
        pass  # Может не удалиться если нет прав или бот ограничен

    # Поиск пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    is_new_user = user is None

    # Обработка реферальной ссылки для нового пользователя
    if is_new_user:
        referrer_id = None
        referrer = None
        if deep_link and deep_link.startswith("ref"):
            try:
                potential_referrer_id = int(deep_link[3:])
                if potential_referrer_id != telegram_id:
                    # Проверяем существование реферера
                    ref_query = select(User).where(User.telegram_id == potential_referrer_id)
                    ref_result = await session.execute(ref_query)
                    referrer = ref_result.scalar_one_or_none()
                    if referrer:
                        referrer_id = potential_referrer_id
                        # Увеличиваем счётчик рефералов
                        referrer.referrals_count += 1
            except ValueError:
                pass

        # Создаём пользователя С IMPLICIT CONSENT (оферта принята по факту использования)
        user = User(
            telegram_id=telegram_id,
            username=message.from_user.username,
            fullname=message.from_user.full_name,
            role="user",
            referrer_id=referrer_id,
            deep_link=deep_link,
            terms_accepted_at=datetime.utcnow(),  # Implicit consent
        )
        session.add(user)
        await session.commit()

        # Логируем нового пользователя
        event = LogEvent.USER_START_REF if deep_link else LogEvent.USER_START
        extra = {"Реф-ссылка": deep_link} if deep_link else None
        await log_action(
            bot=bot,
            event=event,
            user=message.from_user,
            details="Новый пользователь → главное меню",
            extra_data=extra,
            session=session,
            level=LogLevel.ACTION,
        )
    else:
        # Обновляем данные существующего пользователя
        user.username = message.from_user.username
        user.fullname = message.from_user.full_name
        # Если оферта не была принята — принимаем implicit
        if not user.terms_accepted_at:
            user.terms_accepted_at = datetime.utcnow()
        await session.commit()

        # Логируем возврат
        await log_action(
            bot=bot,
            event=LogEvent.USER_RETURN,
            user=message.from_user,
            details="Вернулся в главное меню",
            session=session,
        )

    # === ОБРАБОТКА DEEP LINKS ДЛЯ АДМИНОВ ===

    # Чат с клиентом (из карточки в канале)
    if deep_link and deep_link.startswith("chat_"):
        if message.from_user.id in settings.ADMIN_IDS:
            from bot.handlers.order_chat import start_admin_chat
            try:
                order_id = int(deep_link.replace("chat_", ""))
                await start_admin_chat(message, order_id, session, bot, state)
                return  # Не показываем главное меню
            except ValueError:
                await message.answer("❌ Неверный формат ссылки")
        else:
            await message.answer("❌ Эта функция только для администраторов")
            # Продолжаем показывать главное меню

    # Установка своей цены (из карточки в канале)
    if deep_link and deep_link.startswith("setprice_"):
        if message.from_user.id in settings.ADMIN_IDS:
            try:
                order_id = int(deep_link.replace("setprice_", ""))
                order = await session.get(Order, order_id)
                if order:
                    # Сохраняем order_id в FSM и спрашиваем цену
                    await state.set_state(SetPriceState.waiting_for_price)
                    await state.update_data(order_id=order_id)

                    current_price = f"{int(order.price):,}₽".replace(",", " ") if order.price > 0 else "не установлена"
                    await message.answer(
                        f"💵 <b>Установка цены для заказа #{order_id}</b>\n\n"
                        f"Текущая цена: {current_price}\n\n"
                        f"Введи новую цену (только число, например: <code>5000</code>):",
                    )
                    return  # Не показываем главное меню
                else:
                    await message.answer(f"❌ Заказ #{order_id} не найден")
            except ValueError:
                await message.answer("❌ Неверный формат ссылки")
        else:
            await message.answer("❌ Эта функция только для администраторов")
            # Продолжаем показывать главное меню

    # === ГЛАВНОЕ МЕНЮ — сразу без барьеров ===

    # 1. Typing для визуального отклика
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)

    # 2. Форматируем текст с ссылкой на оферту
    welcome_text = WELCOME_MESSAGE.format(offer_url=settings.OFFER_URL)

    # 3. Отправляем картинку с текстом и кнопками (или текст если картинки нет)
    if settings.WELCOME_IMAGE.exists():
        await send_cached_photo(
            bot=bot,
            chat_id=message.chat.id,
            photo_path=settings.WELCOME_IMAGE,
            caption=welcome_text,
            reply_markup=get_main_menu_keyboard()
        )
    else:
        await bot.send_message(
            chat_id=message.chat.id,
            text=welcome_text,
            reply_markup=get_main_menu_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    ВВОД СВОЕЙ ЦЕНЫ (для канальных карточек)
# ══════════════════════════════════════════════════════════════

@router.message(SetPriceState.waiting_for_price)
async def process_custom_price(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода цены от админа — отправляет клиенту полноценный счёт с кнопками"""
    from bot.services.live_cards import update_card_status

    data = await state.get_data()
    order_id = data.get("order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден в состоянии")
        await state.clear()
        return

    # Парсим цену
    try:
        price_text = message.text.strip().replace(" ", "").replace("₽", "").replace(",", "")
        price = int(price_text)
        if price <= 0:
            raise ValueError("Цена должна быть положительной")
    except (ValueError, AttributeError):
        await message.answer(
            "❌ Неверный формат цены.\n\n"
            "Введи только число, например: <code>5000</code>"
        )
        return

    # Получаем заказ и пользователя
    order = await session.get(Order, order_id)
    if not order:
        await message.answer(f"❌ Заказ #{order_id} не найден")
        await state.clear()
        return

    # Получаем данные клиента для карточки и расчёта бонусов
    client_query = select(User).where(User.telegram_id == order.user_id)
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()

    # Рассчитываем бонусы (как в admin.py)
    bonus_used = 0
    if client and client.balance > 0:
        max_bonus = price * 0.5
        bonus_used = min(client.balance, max_bonus)

    # Устанавливаем цену и бонусы
    order.price = float(price)
    order.bonus_used = bonus_used
    order.status = OrderStatus.WAITING_PAYMENT.value
    await session.commit()

    # Обновляем карточку в канале
    final_price = price - bonus_used

    # Формируем текст с информацией о бонусах
    if bonus_used > 0:
        card_extra_text = (
            f"💵 Тариф: {price:,}₽\n"
            f"💎 Бонусы: −{bonus_used:.0f}₽ (баланс клиента)\n"
            f"👉 К оплате: {final_price:,.0f}₽"
        ).replace(",", " ")
    else:
        card_extra_text = f"💵 Цена: {price:,}₽ (бонусов нет)".replace(",", " ")

    try:
        await update_card_status(
            bot, order, session,
            client_username=client.username if client else None,
            client_name=client.fullname if client else None,
            extra_text=card_extra_text
        )
    except Exception as e:
        await message.answer(f"⚠️ Карточка не обновлена: {e}")

    # Отправляем полноценное уведомление с кнопками оплаты
    sent = await send_payment_notification(bot, order, client, price)

    # Очищаем FSM
    await state.clear()

    price_formatted = f"{price:,}".replace(",", " ")
    final_formatted = f"{final_price:,.0f}".replace(",", " ")

    if sent:
        await message.answer(
            f"✅ <b>Цена установлена!</b>\n\n"
            f"Заказ #{order_id}: <b>{price_formatted}₽</b>\n"
            f"Бонусов применено: {bonus_used:.0f}₽\n"
            f"К оплате: {final_formatted}₽\n\n"
            f"Клиенту отправлен счёт с кнопками оплаты."
        )
    else:
        await message.answer(
            f"✅ <b>Цена установлена!</b>\n\n"
            f"Заказ #{order_id}: <b>{price_formatted}₽</b>\n"
            f"⚠️ Не удалось уведомить клиента"
        )


# ══════════════════════════════════════════════════════════════
#                    ОБНОВЛЕНИЕ СТАТУСА САЛУНА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "refresh_saloon_status")
async def refresh_saloon_status(callback: CallbackQuery):
    """
    Legacy handler for refresh button (now removed from UI).
    Kept for backwards compatibility if any old pinned messages exist.
    """
    status_text = generate_status_message()

    try:
        await callback.message.edit_text(
            text=status_text,
            reply_markup=get_saloon_status_keyboard()
        )
        await callback.answer("✅ Статус обновлён!")
    except Exception:
        await callback.answer("Статус актуален 👍")
