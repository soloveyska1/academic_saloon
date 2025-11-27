from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
from bot.keyboards.inline import get_back_keyboard
from bot.keyboards.orders import (
    get_work_type_keyboard,
    get_skip_keyboard,
    get_confirm_order_keyboard,
    get_cancel_order_keyboard,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                    СОЗДАНИЕ ЗАКАЗА (FSM)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Начать создание заказа — выбор типа работы (callback)"""
    await callback.answer()

    await state.set_state(OrderState.choosing_type)

    # Начинаем отслеживание для детектора брошенных заказов
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.start_tracking(
            user_id=callback.from_user.id,
            username=callback.from_user.username,
            fullname=callback.from_user.full_name,
            step="Выбор типа работы",
        )

    # Логируем начало заказа — важное событие
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_START,
        user=callback.from_user,
        details="Начал создание заказа",
        session=session,
        level=LogLevel.ACTION,
    )

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:"""

    # Если сообщение с фото — удаляем и отправляем новое
    # (edit_text не работает с фото-сообщениями)
    if callback.message.photo:
        await callback.message.delete()
        await callback.message.answer(text, reply_markup=get_work_type_keyboard())
    else:
        await callback.message.edit_text(text, reply_markup=get_work_type_keyboard())


async def start_order_creation(message: Message, state: FSMContext = None):
    """Начать создание заказа — выбор типа работы (для Reply keyboard)"""
    # Если state не передан через параметр, пробуем получить из middleware
    if state is None:
        # Заглушка — без FSM
        text = """📝  <b>Заказать работу</b>

Чтобы оформить заказ, напиши Хозяину напрямую:

@""" + settings.SUPPORT_USERNAME + """

Или нажми /start и выбери «🎯 Новый заказ»"""
        await message.answer(text)
        return

    await state.set_state(OrderState.choosing_type)

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:"""

    await message.answer(text, reply_markup=get_work_type_keyboard())


@router.callback_query(OrderState.choosing_type, F.data.startswith("order_type:"))
async def process_work_type(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора типа работы"""
    await callback.answer()

    work_type = callback.data.split(":")[1]
    await state.update_data(work_type=work_type)
    await state.set_state(OrderState.entering_subject)

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type), work_type)

    # Обновляем шаг в трекере
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.update_step(callback.from_user.id, f"Ввод предмета (тип: {work_label})")

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details=f"Шаг 1/5: выбрал тип «{work_label}»",
        session=session,
    )

    text = f"""📚  <b>Тип:</b> {work_label}

Напиши <b>предмет/дисциплину</b>.

<i>Например: Экономика, Программирование, История</i>"""

    await callback.message.edit_text(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_subject)
async def process_subject(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка ввода предмета"""
    await state.update_data(subject=message.text)
    await state.set_state(OrderState.entering_topic)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=message.from_user,
        details=f"Шаг 2/5: предмет «{message.text[:50]}»",
        session=session,
    )

    text = """📝  <b>Тема работы</b>

Напиши тему или нажми «Пропустить»,
если тема свободная.

<i>Например: Анализ финансовой отчётности ООО «Рога и копыта»</i>"""

    await message.answer(text, reply_markup=get_skip_keyboard())


@router.callback_query(OrderState.entering_topic, F.data == "skip")
async def skip_topic(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пропуск темы"""
    await callback.answer()
    await state.update_data(topic=None)
    await state.set_state(OrderState.entering_details)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details="Шаг 3/5: тема пропущена",
        session=session,
    )

    text = """📋  <b>Требования</b>

Опиши требования к работе:
◈  Объём (страницы)
◈  Оформление (ГОСТ, методичка)
◈  Особые пожелания

Или нажми «Пропустить»."""

    await callback.message.edit_text(text, reply_markup=get_skip_keyboard())


@router.message(OrderState.entering_topic)
async def process_topic(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка ввода темы"""
    await state.update_data(topic=message.text)
    await state.set_state(OrderState.entering_details)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=message.from_user,
        details=f"Шаг 3/5: тема «{message.text[:50]}»",
        session=session,
    )

    text = """📋  <b>Требования</b>

Опиши требования к работе:
◈  Объём (страницы)
◈  Оформление (ГОСТ, методичка)
◈  Особые пожелания

Или нажми «Пропустить»."""

    await message.answer(text, reply_markup=get_skip_keyboard())


@router.callback_query(OrderState.entering_details, F.data == "skip")
async def skip_details(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пропуск требований"""
    await callback.answer()
    await state.update_data(description=None)
    await state.set_state(OrderState.entering_deadline)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details="Шаг 4/5: требования пропущены",
        session=session,
    )

    text = """⏰  <b>Сроки</b>

Когда нужна готовая работа?

<i>Например: до 15 декабря, через 2 недели</i>"""

    await callback.message.edit_text(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_details)
async def process_details(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка ввода требований"""
    await state.update_data(description=message.text)
    await state.set_state(OrderState.entering_deadline)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=message.from_user,
        details=f"Шаг 4/5: требования заполнены",
        session=session,
    )

    text = """⏰  <b>Сроки</b>

Когда нужна готовая работа?

<i>Например: до 15 декабря, через 2 недели</i>"""

    await message.answer(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_deadline)
async def process_deadline(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Обработка ввода сроков и показ превью"""
    await state.update_data(deadline=message.text)
    await state.set_state(OrderState.confirming)

    data = await state.get_data()

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == message.from_user.id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    _, discount = user.loyalty_status if user else ("", 0)

    # Проверяем, есть ли скидка за реферала
    if user and user.referrer_id and user.orders_count == 0:
        discount = max(discount, 5)  # Скидка 5% для приглашённых на первый заказ

    await state.update_data(discount=discount)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=message.from_user,
        details=f"Шаг 5/5: срок «{message.text}», ждём подтверждения",
        session=session,
    )

    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])
    topic_line = f"◈  <b>Тема:</b> {data.get('topic')}\n" if data.get("topic") else ""
    details_line = f"◈  <b>Требования:</b> {data.get('description')}\n" if data.get("description") else ""
    discount_line = f"\n🎁  Твоя скидка: <b>{discount}%</b>" if discount > 0 else ""

    text = f"""📋  <b>Проверь заявку</b>


◈  <b>Тип:</b> {work_label}
◈  <b>Предмет:</b> {data.get('subject')}
{topic_line}{details_line}◈  <b>Срок:</b> {data.get('deadline')}
{discount_line}

Всё верно?"""

    await message.answer(text, reply_markup=get_confirm_order_keyboard())


@router.callback_query(OrderState.confirming, F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Подтверждение и сохранение заказа"""
    await callback.answer()

    data = await state.get_data()
    user_id = callback.from_user.id

    # Создаём заказ
    order = Order(
        user_id=user_id,
        work_type=data["work_type"],
        subject=data.get("subject"),
        topic=data.get("topic"),
        description=data.get("description"),
        deadline=data.get("deadline"),
        discount=data.get("discount", 0),
        status=OrderStatus.PENDING.value,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # Удаляем из трекера брошенных заказов
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.complete_order(user_id)

    await state.clear()

    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Логируем подтверждение заказа — ВАЖНОЕ событие со звуком
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_CONFIRM,
        user=callback.from_user,
        details=f"Заказ #{order.id} подтверждён",
        extra_data={
            "Тип": work_label,
            "Предмет": data.get("subject"),
            "Тема": data.get("topic") or "—",
            "Срок": data.get("deadline"),
            "Скидка": f"{data.get('discount', 0)}%",
        },
        session=session,
        level=LogLevel.ACTION,
        silent=False,  # Со звуком!
    )

    text = f"""✅  <b>Заявка #{order.id} принята!</b>

Шериф свяжется с тобой в течение
пары часов для уточнения деталей
и расчёта стоимости.

Пиши: @{settings.SUPPORT_USERNAME}"""

    await callback.message.edit_text(text, reply_markup=get_back_keyboard())

    # Уведомление админам
    await notify_admins_new_order(bot, callback.from_user, order, data)


@router.callback_query(F.data == "cancel_order")
async def cancel_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Отмена создания заказа"""
    await callback.answer("Заявка отменена")

    # Удаляем из трекера брошенных заказов
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.cancel_order(callback.from_user.id)

    # Логируем отмену
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_CANCEL,
        user=callback.from_user,
        details="Отменил создание заказа",
        session=session,
        level=LogLevel.ACTION,
    )

    await state.clear()

    await callback.message.edit_text(
        "🌵  <b>Заявка отменена</b>\n\n"
        "Возвращайся, когда будешь готов.",
        reply_markup=get_back_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    УВЕДОМЛЕНИЯ
# ══════════════════════════════════════════════════════════════

async def notify_admins_new_order(bot: Bot, user, order: Order, data: dict):
    """Уведомление админов о новой заявке"""
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])
    topic_line = f"◈  Тема: {data.get('topic')}\n" if data.get("topic") else ""
    details_line = f"◈  Требования: {data.get('description')}\n" if data.get("description") else ""
    discount_line = f"◈  Скидка: {data.get('discount', 0)}%\n" if data.get("discount", 0) > 0 else ""

    text = f"""🆕  <b>Новая заявка #{order.id}</b>

◈  Клиент: {user.full_name} (@{user.username})
◈  ID: <code>{user.id}</code>

◈  Тип: {work_label}
◈  Предмет: {data.get('subject')}
{topic_line}{details_line}◈  Срок: {data.get('deadline')}
{discount_line}"""

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(chat_id=admin_id, text=text)
        except Exception:
            pass
