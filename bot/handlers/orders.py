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
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                    СОЗДАНИЕ ЗАКАЗА (FSM)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext):
    """Начать создание заказа — выбор типа работы"""
    await callback.answer()

    await state.set_state(OrderState.choosing_type)

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:"""

    await callback.message.answer(text, reply_markup=get_work_type_keyboard())


@router.callback_query(OrderState.choosing_type, F.data.startswith("order_type:"))
async def process_work_type(callback: CallbackQuery, state: FSMContext):
    """Обработка выбора типа работы"""
    await callback.answer()

    work_type = callback.data.split(":")[1]
    await state.update_data(work_type=work_type)
    await state.set_state(OrderState.entering_subject)

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type), work_type)

    text = f"""📚  <b>Тип:</b> {work_label}

Напиши <b>предмет/дисциплину</b>.

<i>Например: Экономика, Программирование, История</i>"""

    await callback.message.answer(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_subject)
async def process_subject(message: Message, state: FSMContext):
    """Обработка ввода предмета"""
    await state.update_data(subject=message.text)
    await state.set_state(OrderState.entering_topic)

    text = """📝  <b>Тема работы</b>

Напиши тему или нажми «Пропустить»,
если тема свободная.

<i>Например: Анализ финансовой отчётности ООО «Рога и копыта»</i>"""

    await message.answer(text, reply_markup=get_skip_keyboard())


@router.callback_query(OrderState.entering_topic, F.data == "skip")
async def skip_topic(callback: CallbackQuery, state: FSMContext):
    """Пропуск темы"""
    await callback.answer()
    await state.update_data(topic=None)
    await state.set_state(OrderState.entering_details)

    text = """📋  <b>Требования</b>

Опиши требования к работе:
◈  Объём (страницы)
◈  Оформление (ГОСТ, методичка)
◈  Особые пожелания

Или нажми «Пропустить»."""

    await callback.message.answer(text, reply_markup=get_skip_keyboard())


@router.message(OrderState.entering_topic)
async def process_topic(message: Message, state: FSMContext):
    """Обработка ввода темы"""
    await state.update_data(topic=message.text)
    await state.set_state(OrderState.entering_details)

    text = """📋  <b>Требования</b>

Опиши требования к работе:
◈  Объём (страницы)
◈  Оформление (ГОСТ, методичка)
◈  Особые пожелания

Или нажми «Пропустить»."""

    await message.answer(text, reply_markup=get_skip_keyboard())


@router.callback_query(OrderState.entering_details, F.data == "skip")
async def skip_details(callback: CallbackQuery, state: FSMContext):
    """Пропуск требований"""
    await callback.answer()
    await state.update_data(description=None)
    await state.set_state(OrderState.entering_deadline)

    text = """⏰  <b>Сроки</b>

Когда нужна готовая работа?

<i>Например: до 15 декабря, через 2 недели</i>"""

    await callback.message.answer(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_details)
async def process_details(message: Message, state: FSMContext):
    """Обработка ввода требований"""
    await state.update_data(description=message.text)
    await state.set_state(OrderState.entering_deadline)

    text = """⏰  <b>Сроки</b>

Когда нужна готовая работа?

<i>Например: до 15 декабря, через 2 недели</i>"""

    await message.answer(text, reply_markup=get_cancel_order_keyboard())


@router.message(OrderState.entering_deadline)
async def process_deadline(message: Message, state: FSMContext, session: AsyncSession):
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

    await state.clear()

    text = f"""✅  <b>Заявка #{order.id} принята!</b>

Шериф свяжется с тобой в течение
пары часов для уточнения деталей
и расчёта стоимости.

Пиши: @{settings.SUPPORT_USERNAME}"""

    await callback.message.answer(text, reply_markup=get_back_keyboard())

    # Уведомление админам
    await notify_admins_new_order(bot, callback.from_user, order, data)


@router.callback_query(F.data == "cancel_order")
async def cancel_order(callback: CallbackQuery, state: FSMContext):
    """Отмена создания заказа"""
    await callback.answer("Заявка отменена")
    await state.clear()

    await callback.message.answer(
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
