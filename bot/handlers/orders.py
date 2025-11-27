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
    get_subject_keyboard,
    get_task_input_keyboard,
    get_task_continue_keyboard,
    get_deadline_keyboard,
    get_custom_deadline_keyboard,
    get_confirm_order_keyboard,
    get_edit_order_keyboard,
    get_cancel_order_keyboard,
    SUBJECTS,
    DEADLINES,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ШАГ 1: ВЫБОР ТИПА РАБОТЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Начать создание заказа — выбор типа работы"""
    await callback.answer()
    await state.clear()  # Очищаем предыдущее состояние
    await state.set_state(OrderState.choosing_type)

    # Инициализируем хранилище для файлов
    await state.update_data(attachments=[])

    # Начинаем отслеживание для детектора брошенных заказов
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.start_tracking(
            user_id=callback.from_user.id,
            username=callback.from_user.username,
            fullname=callback.from_user.full_name,
            step="Выбор типа работы",
        )

    # Логируем начало заказа
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_START,
        user=callback.from_user,
        details="Начал создание заказа",
        session=session,
        level=LogLevel.ACTION,
    )

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:

<i>Цены указаны минимальные —
точная стоимость зависит от темы и срока.</i>"""

    if callback.message.photo:
        await callback.message.delete()
        await callback.message.answer(text, reply_markup=get_work_type_keyboard())
    else:
        await callback.message.edit_text(text, reply_markup=get_work_type_keyboard())


@router.callback_query(OrderState.choosing_type, F.data.startswith("order_type:"))
async def process_work_type(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора типа работы → переход к направлению"""
    await callback.answer()

    work_type = callback.data.split(":")[1]
    await state.update_data(work_type=work_type)

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type), work_type)

    # Обновляем шаг в трекере
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.update_step(callback.from_user.id, f"Выбор направления (тип: {work_label})")

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details=f"Шаг 1/4: выбрал тип «{work_label}»",
        session=session,
    )

    # Если выбрали "Просто скинуть фото" — сразу к вводу задания
    if work_type == WorkType.PHOTO_TASK.value:
        await state.update_data(subject="photo_task")
        await state.set_state(OrderState.entering_task)
        await show_task_input_screen(callback.message, is_photo_task=True)
        return

    await state.set_state(OrderState.choosing_subject)

    text = f"""📚  <b>Тип:</b> {work_label}

Выбери направление:"""

    await callback.message.edit_text(text, reply_markup=get_subject_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 2: ВЫБОР НАПРАВЛЕНИЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_subject, F.data.startswith("subject:"))
async def process_subject(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора направления → переход к вводу задания"""
    await callback.answer()

    subject_key = callback.data.split(":")[1]
    subject_label = SUBJECTS.get(subject_key, subject_key)
    await state.update_data(subject=subject_key, subject_label=subject_label)
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Обновляем шаг в трекере
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.update_step(callback.from_user.id, f"Ввод задания ({work_label}, {subject_label})")

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details=f"Шаг 2/4: направление «{subject_label}»",
        session=session,
    )

    await show_task_input_screen(callback.message)


async def show_task_input_screen(message: Message, is_photo_task: bool = False, is_edit: bool = False):
    """Показать экран ввода задания"""
    if is_photo_task:
        text = """📸  <b>Просто скинь фото задания</b>

Кидай прямо сюда — разберёмся вместе:
◈  Фото методички
◈  Скриншот из чата
◈  Файл с заданием
◈  Или просто опиши словами

<i>Можно прислать несколько файлов.</i>"""
    else:
        text = """📝  <b>Опиши задание</b>

Как тебе удобнее:
1️⃣  Напиши тему (если знаешь)
2️⃣  Перешли сообщение от старосты/препода
3️⃣  Скинь фото/файл методички
4️⃣  Запиши голосовое (если лень печатать)

<i>Кидай прямо сюда 👇
Можно прислать несколько файлов.</i>"""

    try:
        await message.edit_text(text, reply_markup=get_task_input_keyboard())
    except Exception:
        await message.answer(text, reply_markup=get_task_input_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 3: ВВОД ЗАДАНИЯ
# ══════════════════════════════════════════════════════════════

@router.message(OrderState.entering_task)
async def process_task_input(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Обработка ввода задания — принимаем всё:
    текст, фото, документы, голосовые, видео, пересылки
    """
    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Определяем тип контента и сохраняем
    attachment = None

    if message.text:
        # Текстовое сообщение
        attachment = {
            "type": "text",
            "content": message.text,
        }
    elif message.photo:
        # Фото — берём самое большое
        photo = message.photo[-1]
        attachment = {
            "type": "photo",
            "file_id": photo.file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        # Документ/файл
        attachment = {
            "type": "document",
            "file_id": message.document.file_id,
            "file_name": message.document.file_name or "файл",
            "caption": message.caption or "",
        }
    elif message.voice:
        # Голосовое сообщение
        attachment = {
            "type": "voice",
            "file_id": message.voice.file_id,
            "duration": message.voice.duration,
        }
    elif message.audio:
        # Аудио файл
        attachment = {
            "type": "audio",
            "file_id": message.audio.file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video:
        # Видео
        attachment = {
            "type": "video",
            "file_id": message.video.file_id,
            "caption": message.caption or "",
        }
    elif message.video_note:
        # Видео-кружок
        attachment = {
            "type": "video_note",
            "file_id": message.video_note.file_id,
        }
    elif message.sticker:
        # Стикер — игнорируем, но не ругаемся
        await message.answer(
            "🤠 Стикер — это мило, но лучше скинь задание!",
            reply_markup=get_task_input_keyboard()
        )
        return

    if attachment:
        # Если это пересланное сообщение — добавляем информацию
        if message.forward_from or message.forward_from_chat:
            attachment["forwarded"] = True
            if message.forward_from:
                attachment["forward_from"] = message.forward_from.full_name
            elif message.forward_from_chat:
                attachment["forward_from"] = message.forward_from_chat.title

        attachments.append(attachment)
        await state.update_data(attachments=attachments)

        # Формируем текст подтверждения
        count = len(attachments)
        if count == 1:
            confirm_text = "✅ Получил! Это всё или будет ещё?"
        else:
            confirm_text = f"✅ Принял! Уже {count} файл(ов). Ещё?"

        await message.answer(confirm_text, reply_markup=get_task_continue_keyboard())


@router.callback_query(OrderState.entering_task, F.data == "task_add_more")
async def task_add_more(callback: CallbackQuery, state: FSMContext):
    """Пользователь хочет добавить ещё файлов"""
    await callback.answer("Кидай ещё!")

    text = """📎  <b>Добавь ещё</b>

Кидай файлы, фото или текст.
Когда всё — нажми «Готово»."""

    await callback.message.edit_text(text, reply_markup=get_task_input_keyboard())


@router.callback_query(OrderState.entering_task, F.data == "task_done")
async def task_done(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пользователь закончил ввод задания → переход к срокам"""
    await callback.answer()

    data = await state.get_data()
    attachments = data.get("attachments", [])

    if not attachments:
        await callback.answer("Сначала скинь хотя бы что-нибудь!", show_alert=True)
        return

    await state.set_state(OrderState.choosing_deadline)

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details=f"Шаг 3/4: задание ({len(attachments)} файл(ов))",
        session=session,
    )

    # Обновляем шаг в трекере
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.update_step(callback.from_user.id, "Выбор сроков")

    text = """⏰  <b>Когда нужно сдать?</b>

Чтобы тебя не повесили 💀"""

    await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 4: ВЫБОР СРОКОВ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_deadline, F.data.startswith("deadline:"))
async def process_deadline_choice(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора срока из кнопок"""
    await callback.answer()

    deadline_key = callback.data.split(":")[1]

    # Если выбрали "Ввести дату" — просим ввести текстом
    if deadline_key == "custom":
        text = """📅  <b>Введи дату</b>

Напиши когда нужно сдать.

<i>Например: до 15 декабря, через 2 недели</i>"""
        await callback.message.edit_text(text, reply_markup=get_custom_deadline_keyboard())
        return

    deadline_label = DEADLINES.get(deadline_key, deadline_key)
    await state.update_data(deadline=deadline_key, deadline_label=deadline_label)

    # Переходим к подтверждению
    await show_order_confirmation(callback, state, bot, session)


@router.callback_query(OrderState.choosing_deadline, F.data == "order_back_to_deadline_buttons")
async def back_to_deadline_buttons(callback: CallbackQuery, state: FSMContext):
    """Назад к кнопкам выбора срока"""
    await callback.answer()

    text = """⏰  <b>Когда нужно сдать?</b>

Чтобы тебя не повесили 💀"""

    await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())


@router.message(OrderState.choosing_deadline)
async def process_deadline_text(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка ввода срока текстом"""
    await state.update_data(deadline="custom", deadline_label=message.text)

    # Создаём фейковый callback для унификации
    class FakeCallback:
        def __init__(self, msg, user):
            self.message = msg
            self.from_user = user

        async def answer(self):
            pass

    fake_callback = FakeCallback(message, message.from_user)

    # Отправляем новое сообщение вместо редактирования
    await show_order_confirmation(fake_callback, state, bot, session, send_new=True)


# ══════════════════════════════════════════════════════════════
#                    ШАГ 5: ПОДТВЕРЖДЕНИЕ
# ══════════════════════════════════════════════════════════════

async def show_order_confirmation(callback, state: FSMContext, bot: Bot, session: AsyncSession, send_new: bool = False):
    """Показать превью заказа для подтверждения"""
    await state.set_state(OrderState.confirming)

    data = await state.get_data()

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    _, discount = user.loyalty_status if user else ("", 0)

    # Проверяем скидку за реферала
    if user and user.referrer_id and user.orders_count == 0:
        discount = max(discount, 5)

    await state.update_data(discount=discount)

    # Формируем текст превью
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Направление
    if data.get("subject") == "photo_task":
        subject_line = "📸 Фото задания"
    else:
        subject_line = data.get("subject_label", "Не указано")

    # Срок
    deadline_label = data.get("deadline_label", "Не указан")

    # Вложения
    attachments = data.get("attachments", [])
    attachments_summary = format_attachments_summary(attachments)

    discount_line = f"\n🎁  <b>Твоя скидка:</b> {discount}%" if discount > 0 else ""

    text = f"""📋  <b>Проверь заявку</b>

◈  <b>Тип:</b> {work_label}
◈  <b>Направление:</b> {subject_line}
◈  <b>Задание:</b> {attachments_summary}
◈  <b>Срок:</b> {deadline_label}
{discount_line}

Всё верно?"""

    # Логируем шаг
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_STEP,
        user=callback.from_user,
        details=f"Шаг 4/4: срок «{deadline_label}», ждём подтверждения",
        session=session,
    )

    if send_new:
        await callback.message.answer(text, reply_markup=get_confirm_order_keyboard())
    else:
        await callback.message.edit_text(text, reply_markup=get_confirm_order_keyboard())


def format_attachments_summary(attachments: list) -> str:
    """Форматирует краткое описание вложений"""
    if not attachments:
        return "—"

    counts = {}
    text_preview = None

    for att in attachments:
        att_type = att.get("type", "unknown")
        counts[att_type] = counts.get(att_type, 0) + 1

        # Сохраняем превью текста
        if att_type == "text" and not text_preview:
            content = att.get("content", "")
            if len(content) > 50:
                text_preview = content[:50] + "..."
            else:
                text_preview = content

    parts = []
    type_labels = {
        "text": "текст",
        "photo": "фото",
        "document": "файл",
        "voice": "голосовое",
        "audio": "аудио",
        "video": "видео",
        "video_note": "кружок",
    }

    for att_type, count in counts.items():
        label = type_labels.get(att_type, att_type)
        if count > 1:
            parts.append(f"{count} {label}")
        else:
            parts.append(label)

    summary = ", ".join(parts)

    if text_preview:
        return f"«{text_preview}»"

    return summary


@router.callback_query(OrderState.confirming, F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Подтверждение и сохранение заказа"""
    await callback.answer()

    data = await state.get_data()
    user_id = callback.from_user.id

    # Формируем описание из вложений
    description = format_order_description(data.get("attachments", []))

    # Создаём заказ
    order = Order(
        user_id=user_id,
        work_type=data["work_type"],
        subject=data.get("subject_label") or data.get("subject"),
        topic=None,  # Тема теперь часть описания
        description=description,
        deadline=data.get("deadline_label"),
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

    # Логируем подтверждение заказа
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_CONFIRM,
        user=callback.from_user,
        details=f"Заказ #{order.id} подтверждён",
        extra_data={
            "Тип": work_label,
            "Направление": data.get("subject_label", "—"),
            "Срок": data.get("deadline_label", "—"),
            "Скидка": f"{data.get('discount', 0)}%",
            "Вложений": len(data.get("attachments", [])),
        },
        session=session,
        level=LogLevel.ACTION,
        silent=False,
    )

    text = f"""✅  <b>Заявка #{order.id} принята!</b>

Я уже открыл материалы и оцениваю объём.
Дай мне 10-15 минут — посчитаю честную цену
и напишу тебе лично.

🎁  Начислил тебе <b>50 бонусов</b> в тайник за доверие.
Проверь в меню «💰 Мой баланс».

Скоро вернусь! 🤠

Пиши: @{settings.SUPPORT_USERNAME}"""

    await callback.message.edit_text(text, reply_markup=get_back_keyboard())

    # Уведомление админам со всеми вложениями
    await notify_admins_new_order(bot, callback.from_user, order, data)


def format_order_description(attachments: list) -> str:
    """Форматирует описание заказа из вложений для БД"""
    if not attachments:
        return ""

    parts = []
    for att in attachments:
        att_type = att.get("type", "unknown")

        if att_type == "text":
            parts.append(att.get("content", ""))
        elif att_type == "photo":
            caption = att.get("caption", "")
            parts.append(f"[Фото] {caption}".strip())
        elif att_type == "document":
            fname = att.get("file_name", "файл")
            caption = att.get("caption", "")
            parts.append(f"[Файл: {fname}] {caption}".strip())
        elif att_type == "voice":
            duration = att.get("duration", 0)
            parts.append(f"[Голосовое: {duration} сек]")
        elif att_type == "video":
            caption = att.get("caption", "")
            parts.append(f"[Видео] {caption}".strip())
        elif att_type == "video_note":
            parts.append("[Видео-кружок]")
        elif att_type == "audio":
            fname = att.get("file_name", "аудио")
            parts.append(f"[Аудио: {fname}]")

    return "\n".join(parts)


# ══════════════════════════════════════════════════════════════
#                    НАВИГАЦИЯ "НАЗАД"
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "order_back_to_type")
async def back_to_type(callback: CallbackQuery, state: FSMContext):
    """Назад к выбору типа работы"""
    await callback.answer()
    await state.set_state(OrderState.choosing_type)

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:

<i>Цены указаны минимальные —
точная стоимость зависит от темы и срока.</i>"""

    await callback.message.edit_text(text, reply_markup=get_work_type_keyboard())


@router.callback_query(F.data == "order_back_to_subject")
async def back_to_subject(callback: CallbackQuery, state: FSMContext):
    """Назад к выбору направления"""
    await callback.answer()
    await state.set_state(OrderState.choosing_subject)

    data = await state.get_data()
    work_label = WORK_TYPE_LABELS.get(WorkType(data.get("work_type", "")), "")

    text = f"""📚  <b>Тип:</b> {work_label}

Выбери направление:"""

    await callback.message.edit_text(text, reply_markup=get_subject_keyboard())


@router.callback_query(F.data == "order_back_to_task")
async def back_to_task(callback: CallbackQuery, state: FSMContext):
    """Назад к вводу задания"""
    await callback.answer()
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()
    attachments = data.get("attachments", [])

    if attachments:
        # Уже есть вложения — показываем кнопки продолжения
        count = len(attachments)
        text = f"""📝  <b>Задание</b>

Уже получено: {count} файл(ов)

Добавить ещё или продолжить?"""
        await callback.message.edit_text(text, reply_markup=get_task_continue_keyboard())
    else:
        await show_task_input_screen(callback.message)


@router.callback_query(OrderState.confirming, F.data == "order_edit")
async def edit_order(callback: CallbackQuery, state: FSMContext):
    """Редактирование заказа — выбор что изменить"""
    await callback.answer()

    text = """✏️  <b>Что изменить?</b>"""

    await callback.message.edit_text(text, reply_markup=get_edit_order_keyboard())


@router.callback_query(F.data == "back_to_confirm")
async def back_to_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Назад к подтверждению"""
    await callback.answer()
    await show_order_confirmation(callback, state, bot, session)


@router.callback_query(F.data == "edit_type")
async def edit_type(callback: CallbackQuery, state: FSMContext):
    """Изменить тип работы"""
    await callback.answer()
    await state.set_state(OrderState.choosing_type)
    await back_to_type(callback, state)


@router.callback_query(F.data == "edit_subject")
async def edit_subject(callback: CallbackQuery, state: FSMContext):
    """Изменить направление"""
    await callback.answer()
    await state.set_state(OrderState.choosing_subject)
    await back_to_subject(callback, state)


@router.callback_query(F.data == "edit_task")
async def edit_task(callback: CallbackQuery, state: FSMContext):
    """Изменить задание — очищаем вложения"""
    await callback.answer()
    await state.update_data(attachments=[])
    await state.set_state(OrderState.entering_task)
    await show_task_input_screen(callback.message)


@router.callback_query(F.data == "edit_deadline")
async def edit_deadline(callback: CallbackQuery, state: FSMContext):
    """Изменить сроки"""
    await callback.answer()
    await state.set_state(OrderState.choosing_deadline)

    text = """⏰  <b>Когда нужно сдать?</b>

Чтобы тебя не повесили 💀"""

    await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ОТМЕНА ЗАКАЗА
# ══════════════════════════════════════════════════════════════

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
#                    УВЕДОМЛЕНИЯ АДМИНАМ
# ══════════════════════════════════════════════════════════════

async def notify_admins_new_order(bot: Bot, user, order: Order, data: dict):
    """Уведомление админов о новой заявке со всеми вложениями"""
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    subject_label = data.get("subject_label", "—")
    if data.get("subject") == "photo_task":
        subject_label = "📸 Фото задания"

    discount_line = f"◈  Скидка: {data.get('discount', 0)}%\n" if data.get("discount", 0) > 0 else ""

    text = f"""🆕  <b>Новая заявка #{order.id}</b>

◈  Клиент: {user.full_name} (@{user.username})
◈  ID: <code>{user.id}</code>

◈  Тип: {work_label}
◈  Направление: {subject_label}
◈  Срок: {data.get('deadline_label', '—')}
{discount_line}"""

    attachments = data.get("attachments", [])

    for admin_id in settings.ADMIN_IDS:
        try:
            # Сначала отправляем текст заявки
            await bot.send_message(chat_id=admin_id, text=text)

            # Затем все вложения
            for att in attachments:
                att_type = att.get("type", "unknown")

                try:
                    if att_type == "text":
                        content = att.get("content", "")
                        if content:
                            await bot.send_message(
                                chat_id=admin_id,
                                text=f"📝 Текст от клиента:\n\n{content}"
                            )
                    elif att_type == "photo":
                        await bot.send_photo(
                            chat_id=admin_id,
                            photo=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "document":
                        await bot.send_document(
                            chat_id=admin_id,
                            document=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "voice":
                        await bot.send_voice(
                            chat_id=admin_id,
                            voice=att.get("file_id")
                        )
                    elif att_type == "video":
                        await bot.send_video(
                            chat_id=admin_id,
                            video=att.get("file_id"),
                            caption=att.get("caption") or None
                        )
                    elif att_type == "video_note":
                        await bot.send_video_note(
                            chat_id=admin_id,
                            video_note=att.get("file_id")
                        )
                    elif att_type == "audio":
                        await bot.send_audio(
                            chat_id=admin_id,
                            audio=att.get("file_id")
                        )
                except Exception:
                    pass

        except Exception:
            pass


# ══════════════════════════════════════════════════════════════
#                    LEGACY: Reply keyboard support
# ══════════════════════════════════════════════════════════════

async def start_order_creation(message: Message, state: FSMContext = None):
    """Начать создание заказа — для Reply keyboard"""
    if state is None:
        text = """📝  <b>Заказать работу</b>

Чтобы оформить заказ, напиши Хозяину напрямую:

@""" + settings.SUPPORT_USERNAME + """

Или нажми /start и выбери «🎯 Новый заказ»"""
        await message.answer(text)
        return

    await state.clear()
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[])

    text = """🎯  <b>Новый заказ</b>

Выбери тип работы:

<i>Цены указаны минимальные —
точная стоимость зависит от темы и срока.</i>"""

    await message.answer(text, reply_markup=get_work_type_keyboard())
