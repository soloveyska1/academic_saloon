import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
from bot.keyboards.inline import get_back_keyboard
from bot.keyboards.orders import (
    get_work_type_keyboard,
    get_work_category_keyboard,
    get_category_works_keyboard,
    get_subject_keyboard,
    get_task_input_keyboard,
    get_task_continue_keyboard,
    get_deadline_keyboard,
    get_custom_deadline_keyboard,
    get_confirm_order_keyboard,
    get_edit_order_keyboard,
    get_cancel_order_keyboard,
    get_deadline_with_date,
    get_urgent_order_keyboard,
    get_urgent_task_keyboard,
    SUBJECTS,
    DEADLINES,
    WORK_CATEGORIES,
    WORKS_REQUIRE_SUBJECT,
)
from core.saloon_status import saloon_manager, get_owner_status
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from bot.services.daily_stats import get_urgent_stats_line
from bot.texts.terms import get_first_name
from core.config import settings

MSK_TZ = ZoneInfo("Europe/Moscow")

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

MAX_ATTACHMENTS = 10  # Максимум вложений в заказе


def pluralize_files(n: int) -> str:
    """Правильное склонение слова 'файл'"""
    if n % 10 == 1 and n % 100 != 11:
        return f"{n} файл"
    elif 2 <= n % 10 <= 4 and not (12 <= n % 100 <= 14):
        return f"{n} файла"
    return f"{n} файлов"


def get_attachment_confirm_text(attachment: dict, count: int, is_urgent: bool = False) -> str:
    """
    Генерирует умное подтверждение в зависимости от типа вложения.
    Показывает что именно получили + сколько всего.
    """
    att_type = attachment.get("type", "unknown")

    # Эмодзи и текст по типу
    type_confirms = {
        "text": "💬 Текст сохранил",
        "photo": "📸 Фото получил",
        "document": "📄 Файл получил",
        "voice": "🎤 Голосовое записал",
        "audio": "🎵 Аудио получил",
        "video": "🎬 Видео получил",
        "video_note": "⚪ Кружок получил",
    }

    base_text = type_confirms.get(att_type, "✅ Получил")

    # Дополнительная инфа по типу
    extra = ""
    if att_type == "document":
        fname = attachment.get("file_name", "")
        if fname:
            # Обрезаем длинные имена
            if len(fname) > 25:
                fname = fname[:22] + "..."
            extra = f": {fname}"
    elif att_type == "voice":
        duration = attachment.get("duration", 0)
        if duration:
            mins, secs = divmod(duration, 60)
            if mins:
                extra = f" ({mins}:{secs:02d})"
            else:
                extra = f" ({secs} сек)"

    # Для срочных — особое подтверждение
    if is_urgent and count == 1:
        return f"""✅ <b>Задание получено!</b>

{base_text}{extra}

⏳ Оцениваю объём...
<i>Напишу через пару минут с ценой и сроком</i>

Можешь добавить ещё файлы или нажми «Готово»"""

    # Для срочных при добавлении
    if is_urgent:
        return f"{base_text}{extra}\n📎 Всего: {pluralize_files(count)}\n\n<i>Добавь ещё или жми «Готово»</i>"

    # Счётчик если больше одного
    if count > 1:
        return f"{base_text}{extra}\n📎 Всего: {pluralize_files(count)}"

    return f"{base_text}{extra}"


def format_attachments_preview(attachments: list) -> str:
    """
    Форматирует мини-превью загруженных файлов.
    Показывает что уже есть в заказе.
    """
    if not attachments:
        return ""

    # Считаем по типам
    counts = {}
    text_preview = None
    doc_names = []

    for att in attachments:
        att_type = att.get("type", "unknown")
        counts[att_type] = counts.get(att_type, 0) + 1

        # Сохраняем превью текста
        if att_type == "text" and not text_preview:
            content = att.get("content", "")
            if len(content) > 40:
                text_preview = content[:37] + "..."
            else:
                text_preview = content

        # Имена документов (первые 2)
        if att_type == "document" and len(doc_names) < 2:
            fname = att.get("file_name", "файл")
            if len(fname) > 20:
                fname = fname[:17] + "..."
            doc_names.append(fname)

    # Формируем строки
    lines = []

    type_icons = {
        "text": "💬",
        "photo": "📸",
        "document": "📄",
        "voice": "🎤",
        "audio": "🎵",
        "video": "🎬",
        "video_note": "⚪",
    }

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
        icon = type_icons.get(att_type, "📎")
        label = type_labels.get(att_type, att_type)

        if count > 1:
            lines.append(f"{icon} {count} {label}")
        else:
            lines.append(f"{icon} {label}")

    # Добавляем превью текста
    if text_preview:
        lines.append(f"   «{text_preview}»")

    # Добавляем имена файлов
    if doc_names:
        for name in doc_names:
            lines.append(f"   • {name}")

    return "\n".join(lines)


def calculate_user_discount(user: User | None) -> int:
    """
    Рассчитывает скидку пользователя на основе:
    - Статуса лояльности
    - Реферальной скидки (5% для первого заказа по реф-ссылке)

    Returns:
        Процент скидки (0-15)
    """
    if not user:
        return 0

    _, discount = user.loyalty_status

    # Скидка 5% за первый заказ по реферальной ссылке
    if user.referrer_id and user.orders_count == 0:
        discount = max(discount, 5)

    return discount


# ══════════════════════════════════════════════════════════════
#                    ШАГ 1: ВЫБОР ТИПА РАБОТЫ
# ══════════════════════════════════════════════════════════════

MAX_PENDING_ORDERS = 5  # Мягкий лимит необработанных заказов


@router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Начать создание заказа — выбор типа работы"""
    await callback.answer()

    # Админы без ограничений
    if callback.from_user.id in settings.ADMIN_IDS:
        await _proceed_to_order_creation(callback, state, bot, session)
        return

    # Проверяем количество НЕОБРАБОТАННЫХ заказов (только PENDING)
    pending_query = select(Order).where(
        Order.user_id == callback.from_user.id,
        Order.status == OrderStatus.PENDING.value,  # Только необработанные
    )
    result = await session.execute(pending_query)
    pending_orders = result.scalars().all()

    # Мягкий лимит — показываем предупреждение, но даём продолжить
    if len(pending_orders) >= MAX_PENDING_ORDERS:
        limit_text = (
            f"🤔 <b>У тебя уже {len(pending_orders)} заявок в очереди</b>\n\n"
            f"Они ещё не обработаны — скоро посмотрю!\n\n"
            f"Можешь подождать или создать ещё одну 👇"
        )
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="➕ Всё равно создать", callback_data="force_create_order")],
            [InlineKeyboardButton(text="⏳ Подожду", callback_data="back_to_menu")],
        ])

        if callback.message.text:
            await callback.message.edit_text(limit_text, reply_markup=keyboard)
        else:
            try:
                await callback.message.delete()
            except Exception:
                pass
            await callback.message.answer(limit_text, reply_markup=keyboard)
        return

    await _proceed_to_order_creation(callback, state, bot, session)


@router.callback_query(F.data == "force_create_order")
async def force_create_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Создать заказ несмотря на лимит"""
    await callback.answer()
    await _proceed_to_order_creation(callback, state, bot, session)


async def _proceed_to_order_creation(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Общая логика начала создания заказа"""
    await state.clear()  # Очищаем предыдущее состояние
    await state.set_state(OrderState.choosing_type)

    # Инициализируем хранилище для файлов
    await state.update_data(attachments=[])

    # Некритичные операции — если упадут, не блокируем пользователя
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.start_tracking(
                user_id=callback.from_user.id,
                username=callback.from_user.username,
                fullname=callback.from_user.full_name,
                step="Выбор типа работы",
            )
    except Exception:
        pass

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_START,
            user=callback.from_user,
            details="Начал создание заказа",
            session=session,
            level=LogLevel.ACTION,
        )
    except Exception:
        pass

    # Получаем скидку пользователя (с защитой от ошибок)
    discount = 0
    try:
        user_query = select(User).where(User.telegram_id == callback.from_user.id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        discount = calculate_user_discount(user)
    except Exception:
        pass

    discount_line = f"\n🎁 <b>Твоя скидка: −{discount}%</b>" if discount > 0 else ""

    text = f"""🎯  <b>Новый заказ</b>

Что нужно сделать?{discount_line}"""

    # Удаляем старое сообщение и отправляем с картинкой
    try:
        await callback.message.delete()
    except Exception:
        pass

    photo = FSInputFile(settings.ORDER_IMAGE)
    await callback.message.answer_photo(
        photo=photo,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


@router.callback_query(OrderState.choosing_type, F.data.startswith("work_category:"))
async def process_work_category(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Обработка выбора категории работ.
    Показывает конкретные типы в выбранной категории.
    """
    await callback.answer()

    category_key = callback.data.split(":")[1]
    category = WORK_CATEGORIES.get(category_key)

    if not category:
        # Неизвестная категория — показываем полный список
        await callback.message.edit_caption(
            caption="🎯  <b>Новый заказ</b>\n\nВыбери тип работы:",
            reply_markup=get_work_type_keyboard()
        )
        return

    # Для срочных заказов — диалоговый эффект с психологическими триггерами
    if category_key == "urgent" and len(category["types"]) == 1:
        work_type = category["types"][0]
        await state.update_data(work_type=work_type.value, is_urgent=True)
        # Состояние остаётся choosing_type для обработки выбора срока

        # Обновляем трекер (некритично)
        try:
            tracker = get_abandoned_tracker()
            if tracker:
                await tracker.update_step(callback.from_user.id, "Ввод задания (срочно)")
        except Exception:
            pass

        # === СРОЧНЫЙ ЗАКАЗ — НОВЫЙ ДИЗАЙН ===

        # Сохраняем что это срочный заказ
        await state.update_data(is_urgent=True, work_type=WorkType.PHOTO_TASK.value)

        # 1. Удаляем старое сообщение
        try:
            await callback.message.delete()
        except Exception:
            pass

        # 2. Typing + первое сообщение (эмпатия)
        first_name = get_first_name(callback.from_user.full_name)
        await callback.message.answer(f"🔥 <b>Понял, {first_name}! Разберёмся.</b>")

        # Получаем статус Хозяина
        status = await saloon_manager.get_status()
        owner_emoji, owner_text = get_owner_status(status)

        # Адаптивный текст по статусу
        if owner_emoji == "🟢":
            response_time = "⏱ Отвечу за 5-15 минут"
        elif owner_emoji == "🟡":
            response_time = "⏱ Скорее всего отвечу быстро"
        else:
            # Ночь или offline
            msk_hour = datetime.now(MSK_TZ).hour
            if msk_hour < 9:
                response_time = "⏱ Отвечу до 9:00 МСК"
            else:
                response_time = "⏱ Отвечу как только смогу"

        # Статистика срочных (социальное доказательство)
        stats_line = ""
        try:
            urgent_stats = await get_urgent_stats_line()
            if urgent_stats:
                stats_line = f"\n{urgent_stats}"
        except Exception:
            pass

        # Время суток — ночью особый текст
        msk_hour = datetime.now(MSK_TZ).hour
        night_line = "\n🌙 Да, работаем даже сейчас!" if 0 <= msk_hour < 6 else ""

        text = f"""🚨 <b>СРОЧНЫЙ ЗАКАЗ</b>

Выдыхай — справимся!{night_line}

{owner_emoji} <b>{owner_text}</b>
{response_time}
{stats_line}

───────────

<b>Когда нужно сдать?</b>
<i>Выбери срок — это влияет на цену</i>"""

        await callback.message.answer(
            text=text,
            reply_markup=get_urgent_order_keyboard()
        )
        return

    # Показываем типы работ в категории
    text = f"""🎯  <b>{category['label']}</b>

<i>{category['description']}</i>

Выбери тип работы:"""

    await callback.message.edit_caption(
        caption=text,
        reply_markup=get_category_works_keyboard(category_key)
    )


@router.callback_query(OrderState.choosing_type, F.data == "back_to_categories")
async def back_to_categories(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Назад к выбору категории"""
    await callback.answer()

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n🎁 <b>Твоя скидка: −{discount}%</b>" if discount > 0 else ""

    text = f"""🎯  <b>Новый заказ</b>

Что нужно сделать?{discount_line}"""

    await callback.message.edit_caption(
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    СРОЧНЫЙ ЗАКАЗ — ВЫБОР ДЕДЛАЙНА
# ══════════════════════════════════════════════════════════════

# Наценки за срочность
URGENT_SURCHARGES = {
    "today": 50,
    "tomorrow": 30,
    "3_days": 15,
    "asap": 0,  # Определим после оценки
}

URGENT_DEADLINE_LABELS = {
    "today": "сегодня",
    "tomorrow": "завтра",
    "3_days": "2-3 дня",
    "asap": "как можно скорее",
}


@router.callback_query(OrderState.choosing_type, F.data.startswith("urgent_deadline:"))
async def process_urgent_deadline(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Обработка выбора дедлайна для срочного заказа"""
    await callback.answer()

    deadline_key = callback.data.split(":")[1]
    surcharge = URGENT_SURCHARGES.get(deadline_key, 0)
    deadline_label = URGENT_DEADLINE_LABELS.get(deadline_key, deadline_key)

    # Сохраняем данные
    await state.update_data(
        urgent_deadline=deadline_key,
        urgent_surcharge=surcharge,
        deadline=deadline_key if deadline_key != "asap" else "today",
        deadline_label=deadline_label,
    )
    await state.set_state(OrderState.entering_task)

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Typing эффект
    # Формируем текст с чек-листом
    if deadline_key == "asap":
        deadline_text = "⚡ <b>Как можно скорее</b>\n<i>Наценку определим после оценки объёма</i>"
    else:
        deadline_text = f"⏰ <b>Срок:</b> {deadline_label}\n💰 <b>Наценка:</b> +{surcharge}%"

    text = f"""📝 <b>Отлично! Теперь кидай задание</b>

{deadline_text}

───────────

<b>📎 Что приложить:</b>
∙ Фото/скан задания
∙ Методичку (если есть)
∙ Точное время сдачи

<i>Можно отправить фото, файл, голосовое или текст</i>"""

    await callback.message.answer(
        text=text,
        reply_markup=get_urgent_task_keyboard()
    )

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details=f"Срочный заказ: дедлайн {deadline_label}",
    )


@router.callback_query(OrderState.choosing_type, F.data == "back_to_urgent")
@router.callback_query(OrderState.entering_task, F.data == "back_to_urgent")
async def back_to_urgent(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Возврат к экрану выбора дедлайна срочного заказа"""
    await callback.answer()
    await state.set_state(OrderState.choosing_type)

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Получаем статус Хозяина
    status = await saloon_manager.get_status()
    owner_emoji, owner_text = get_owner_status(status)

    # Адаптивный текст по статусу
    if owner_emoji == "🟢":
        response_time = "⏱ Отвечу за 5-15 минут"
    elif owner_emoji == "🟡":
        response_time = "⏱ Скорее всего отвечу быстро"
    else:
        msk_hour = datetime.now(MSK_TZ).hour
        if msk_hour < 9:
            response_time = "⏱ Отвечу до 9:00 МСК"
        else:
            response_time = "⏱ Отвечу как только смогу"

    # Статистика
    stats_line = ""
    try:
        urgent_stats = await get_urgent_stats_line()
        if urgent_stats:
            stats_line = f"\n{urgent_stats}"
    except Exception:
        pass

    msk_hour = datetime.now(MSK_TZ).hour
    night_line = "\n🌙 Да, работаем даже сейчас!" if 0 <= msk_hour < 6 else ""

    text = f"""🚨 <b>СРОЧНЫЙ ЗАКАЗ</b>

Выдыхай — справимся!{night_line}

{owner_emoji} <b>{owner_text}</b>
{response_time}
{stats_line}

───────────

<b>Когда нужно сдать?</b>
<i>Выбери срок — это влияет на цену</i>"""

    await callback.message.answer(
        text=text,
        reply_markup=get_urgent_order_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    ВЫБОР ТИПА РАБОТЫ (ОБЫЧНЫЙ FLOW)
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_type, F.data.startswith("order_type:"))
async def process_work_type(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Обработка выбора типа работы.

    Умный flow:
    - Крупные работы (диплом, курсовая, практика, магистерская) → спрашиваем направление
    - Мелкие работы (эссе, реферат, контрольная...) → сразу к заданию
    """
    await callback.answer()

    work_type_value = callback.data.split(":")[1]
    work_type = WorkType(work_type_value)
    await state.update_data(work_type=work_type_value)

    work_label = WORK_TYPE_LABELS.get(work_type, work_type_value)

    # Некритичные операции — если упадут, не блокируем
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.update_step(callback.from_user.id, f"Тип: {work_label}")
    except Exception:
        pass

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг 1: выбрал тип «{work_label}»",
            session=session,
        )
    except Exception:
        pass

    # Если выбрали "Просто скинуть фото" — сразу к вводу задания
    if work_type == WorkType.PHOTO_TASK:
        await state.update_data(subject="photo_task", subject_label="📸 Фото задания")
        await state.set_state(OrderState.entering_task)

        try:
            await callback.message.delete()
        except Exception:
            pass

        await show_task_input_screen(callback.message, is_photo_task=True, send_new=True)
        return

    # УМНЫЙ FLOW: для мелких работ пропускаем направление
    if work_type not in WORKS_REQUIRE_SUBJECT:
        await state.update_data(subject="skip", subject_label="—")
        await state.set_state(OrderState.entering_task)

        try:
            await callback.message.delete()
        except Exception:
            pass

        await show_task_input_screen(callback.message, send_new=True, work_type=work_type)
        return

    # Крупные работы — спрашиваем направление
    await state.set_state(OrderState.choosing_subject)

    text = f"""📚  <b>{work_label}</b>

Укажи направление — это поможет подобрать специалиста:"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await callback.message.answer(text, reply_markup=get_subject_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 2: ВЫБОР НАПРАВЛЕНИЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_subject, F.data.startswith("subject:"))
async def process_subject(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Обработка выбора направления → переход к вводу задания.
    Поддерживает subject:skip для пропуска этого шага.
    """
    await callback.answer()

    subject_key = callback.data.split(":")[1]

    # Пропуск выбора направления
    if subject_key == "skip":
        subject_label = "—"
    else:
        subject_label = SUBJECTS.get(subject_key, subject_key)

    await state.update_data(subject=subject_key, subject_label=subject_label)
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Некритичные операции
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            step_info = f"Ввод задания ({work_label})"
            if subject_key != "skip":
                step_info += f", {subject_label}"
            await tracker.update_step(callback.from_user.id, step_info)
    except Exception:
        pass

    try:
        log_details = f"Шаг 2: направление «{subject_label}»" if subject_key != "skip" else "Шаг 2: направление пропущено"
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=log_details,
            session=session,
        )
    except Exception:
        pass

    # Передаём work_type для контекстного текста
    try:
        work_type = WorkType(data["work_type"])
    except (KeyError, ValueError):
        work_type = None

    await show_task_input_screen(callback.message, work_type=work_type)


async def show_task_input_screen(
    message: Message,
    is_photo_task: bool = False,
    send_new: bool = False,
    work_type: WorkType | None = None,
):
    """
    Показать экран ввода задания.
    Контекстный текст зависит от типа работы.
    """
    if is_photo_task:
        text = """📸  <b>Кидай задание</b>

Что угодно:
• Фото методички
• Скриншот из чата
• Файл с требованиями
• Или просто опиши словами

<i>Можно несколько файлов.</i>"""

    # Контекстные подсказки под тип работы
    elif work_type == WorkType.DIPLOMA:
        text = """📝  <b>Кидай задание</b>

Для диплома желательно:
• Тема (если утверждена)
• Методичка / требования
• План или содержание

<i>Можно несколько файлов.</i>"""

    elif work_type == WorkType.COURSEWORK:
        text = """📝  <b>Кидай задание</b>

Для курсовой полезно:
• Тема
• Методичка
• Требования к оформлению

<i>Можно несколько файлов.</i>"""

    elif work_type == WorkType.CONTROL:
        text = """📝  <b>Кидай задание</b>

• Фото задачек
• Скриншот из чата
• Файл с вариантом

<i>Можно несколько файлов.</i>"""

    elif work_type == WorkType.PRESENTATION:
        text = """📝  <b>Кидай задание</b>

Для презентации:
• Тема
• Сколько слайдов нужно
• Какой стиль (строгий/креативный)

<i>Можно несколько файлов.</i>"""

    elif work_type == WorkType.ESSAY:
        text = """📝  <b>Кидай задание</b>

Для эссе:
• Тема
• Объём (страниц/слов)
• Стиль (если есть требования)

<i>Можно несколько файлов.</i>"""

    else:
        # Универсальный текст
        text = """📝  <b>Кидай задание</b>

Что угодно:
• Тема или описание
• Фото/скриншот задания
• Файл с требованиями
• Голосовое (если лень печатать)

<i>Можно несколько файлов.</i>"""

    if send_new:
        await message.answer(text, reply_markup=get_task_input_keyboard())
    else:
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
    текст, фото, документы, голосовые, видео, пересылки.

    Особенности:
    - Typing эффект для "живости"
    - Умные подтверждения по типу контента
    - Защита от дублей (по file_id)
    - Лимит вложений
    """
    data = await state.get_data()
    attachments = data.get("attachments", [])
    is_urgent = data.get("is_urgent", False)

    # Проверка лимита
    if len(attachments) >= MAX_ATTACHMENTS:
        await message.answer(
            f"⚠️ Максимум {MAX_ATTACHMENTS} вложений.\n"
            "Нажми «Готово» или очисти и начни заново.",
            reply_markup=get_task_continue_keyboard()
        )
        return

    # Определяем тип контента и сохраняем
    attachment = None
    file_id = None

    if message.text:
        # Текстовое сообщение
        attachment = {
            "type": "text",
            "content": message.text,
        }
    elif message.photo:
        # Фото — берём самое большое
        photo = message.photo[-1]
        file_id = photo.file_id
        attachment = {
            "type": "photo",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        # Документ/файл
        file_id = message.document.file_id
        attachment = {
            "type": "document",
            "file_id": file_id,
            "file_name": message.document.file_name or "файл",
            "caption": message.caption or "",
        }
    elif message.voice:
        # Голосовое сообщение
        file_id = message.voice.file_id
        attachment = {
            "type": "voice",
            "file_id": file_id,
            "duration": message.voice.duration,
        }
    elif message.audio:
        # Аудио файл
        file_id = message.audio.file_id
        attachment = {
            "type": "audio",
            "file_id": file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video:
        # Видео
        file_id = message.video.file_id
        attachment = {
            "type": "video",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.video_note:
        # Видео-кружок
        file_id = message.video_note.file_id
        attachment = {
            "type": "video_note",
            "file_id": file_id,
        }
    elif message.sticker:
        # Стикер — игнорируем, но не ругаемся
        await message.answer(
            "🤠 Стикер — это мило, но лучше скинь задание!",
            reply_markup=get_task_input_keyboard()
        )
        return

    if attachment:
        # Защита от дублей (по file_id)
        if file_id:
            existing_ids = {att.get("file_id") for att in attachments if att.get("file_id")}
            if file_id in existing_ids:
                await message.answer(
                    "☝️ Этот файл уже добавлен!",
                    reply_markup=get_task_continue_keyboard()
                )
                return

        # Если это пересланное сообщение — добавляем информацию
        if message.forward_from or message.forward_from_chat:
            attachment["forwarded"] = True
            if message.forward_from:
                attachment["forward_from"] = message.forward_from.full_name
            elif message.forward_from_chat:
                attachment["forward_from"] = message.forward_from_chat.title

        attachments.append(attachment)
        await state.update_data(attachments=attachments)

        # Умное подтверждение по типу контента
        count = len(attachments)
        confirm_text = get_attachment_confirm_text(attachment, count, is_urgent)

        # Добавляем инфо о пересылке
        if attachment.get("forwarded"):
            forward_from = attachment.get("forward_from", "")
            if forward_from:
                confirm_text += f"\n📨 Переслано от: {forward_from}"

        # Предупреждение о приближении к лимиту
        if count >= MAX_ATTACHMENTS - 2:
            remaining = MAX_ATTACHMENTS - count
            confirm_text += f"\n\n⚠️ Осталось {remaining} {'место' if remaining == 1 else 'места'}"

        await message.answer(confirm_text, reply_markup=get_task_continue_keyboard())


@router.callback_query(OrderState.entering_task, F.data == "task_add_more")
async def task_add_more(callback: CallbackQuery, state: FSMContext):
    """Пользователь хочет добавить ещё файлов"""
    await callback.answer("Кидай ещё!")

    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Показываем превью того что уже есть
    if attachments:
        preview = format_attachments_preview(attachments)
        text = f"""📎  <b>Добавь ещё</b>

Уже есть:
{preview}

Кидай ещё или нажми «Готово»."""
    else:
        text = """📎  <b>Добавь ещё</b>

Кидай файлы, фото или текст.
Когда всё — нажми «Готово»."""

    await callback.message.edit_text(text, reply_markup=get_task_input_keyboard())


@router.callback_query(OrderState.entering_task, F.data == "task_clear")
async def task_clear(callback: CallbackQuery, state: FSMContext):
    """Очистить все вложения и начать заново"""
    await callback.answer("Очищено!")

    data = await state.get_data()
    await state.update_data(attachments=[])

    # Получаем work_type для контекста
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    await show_task_input_screen(callback.message, work_type=work_type)


@router.callback_query(OrderState.entering_task, F.data == "task_done")
async def task_done(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пользователь закончил ввод задания → переход к срокам или подтверждению"""
    data = await state.get_data()
    attachments = data.get("attachments", [])

    if not attachments:
        await callback.answer("Сначала скинь хотя бы что-нибудь!", show_alert=True)
        return

    await callback.answer()

    # Некритичные операции
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг: задание ({pluralize_files(len(attachments))})",
            session=session,
        )
    except Exception:
        pass

    # Для срочных заказов срок уже выбран — сразу к подтверждению
    if data.get("is_urgent"):
        try:
            tracker = get_abandoned_tracker()
            if tracker:
                await tracker.update_step(callback.from_user.id, "Подтверждение заказа")
        except Exception:
            pass

        await show_order_confirmation(callback, state, bot, session)
        return

    # Обычный заказ — переход к выбору срока
    await state.set_state(OrderState.choosing_deadline)

    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.update_step(callback.from_user.id, "Выбор сроков")
    except Exception:
        pass

    text = """⏰  <b>Когда нужна готовая работа?</b>

Точный срок — точная цена."""

    await callback.message.edit_text(text, reply_markup=get_deadline_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 4: ВЫБОР СРОКОВ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_deadline, F.data.startswith("deadline:"))
async def process_deadline_choice(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора срока из кнопок"""
    await callback.answer()

    deadline_key = callback.data.split(":")[1]

    # Если выбрали "Указать дату" — просим ввести текстом
    if deadline_key == "custom":
        text = """📅  <b>Укажи дату</b>

Напиши когда нужно получить работу.

<i>Например: до 15 декабря, к понедельнику</i>"""
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

    text = """⏰  <b>Когда нужна готовая работа?</b>

Точный срок — точная цена."""

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
    """
    Показать превью заказа для подтверждения.
    Персонализированный текст с реальными датами.
    """
    await state.set_state(OrderState.confirming)

    data = await state.get_data()

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    await state.update_data(discount=discount)

    # Персонализация — имя пользователя
    first_name = get_first_name(callback.from_user.full_name)

    # Формируем текст превью
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Направление — показываем только если было указано
    subject = data.get("subject")
    subject_line = None
    if subject == "photo_task":
        subject_line = "📸 Фото задания"
    elif subject and subject != "skip":
        subject_line = data.get("subject_label", "Не указано")

    # Срок с реальной датой
    deadline_key = data.get("deadline", "")
    deadline_label = data.get("deadline_label", "Не указан")

    # Для стандартных сроков показываем дату, для custom — как ввели
    if deadline_key and deadline_key != "custom":
        deadline_display = get_deadline_with_date(deadline_key)
    else:
        deadline_display = deadline_label

    # Вложения — улучшенный формат
    attachments = data.get("attachments", [])
    attachments_preview = format_attachments_preview(attachments)

    # Формируем строки
    subject_text = f"\n◈  <b>Направление:</b> {subject_line}" if subject_line else ""
    discount_line = f"\n🎁  <b>Скидка:</b> {discount}%" if discount > 0 else ""

    text = f"""📋  <b>Проверь и отправляй, {first_name}!</b>

◈  <b>Тип:</b> {work_label}{subject_text}
◈  <b>Срок:</b> {deadline_display}
◈  <b>Задание:</b>
{attachments_preview}
{discount_line}

После отправки отвечу за 5-15 мин."""

    # Логируем шаг (некритично)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг: подтверждение, срок «{deadline_display}»",
            session=session,
        )
    except Exception:
        pass

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
    is_urgent = data.get("is_urgent", False)

    # Логируем подтверждение заказа
    urgent_prefix = "🚨 СРОЧНЫЙ " if is_urgent else ""
    extra_data = {
        "Тип": work_label,
        "Направление": data.get("subject_label", "—"),
        "Срок": data.get("deadline_label", "—"),
        "Скидка": f"{data.get('discount', 0)}%",
        "Вложений": len(data.get("attachments", [])),
    }
    if is_urgent:
        surcharge = data.get("urgent_surcharge", 0)
        if surcharge > 0:
            extra_data["Наценка"] = f"+{surcharge}%"

    await log_action(
        bot=bot,
        event=LogEvent.ORDER_CONFIRM,
        user=callback.from_user,
        details=f"{urgent_prefix}Заказ #{order.id} подтверждён",
        extra_data=extra_data,
        session=session,
        level=LogLevel.ACTION,
        silent=False,
    )

    text = f"""✅  <b>Заявка #{order.id} принята!</b>

Я уже открыл материалы и оцениваю объём.
Дай мне 10-15 минут — посчитаю честную цену
и напишу тебе лично.

Скоро вернусь! 🤠

━━━━━━━━━━━━━━━━━━━━━━
💳  <b>Реквизиты для оплаты</b>

📱  <code>89196739120</code>
👤  Семен Юрьевич С.

🏦  Сбербанк • Т-Банк • БСПБ
━━━━━━━━━━━━━━━━━━━━━━

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
async def back_to_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Назад к выбору типа работы (категории)"""
    await callback.answer()
    await state.set_state(OrderState.choosing_type)

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n🎁 <b>Твоя скидка: −{discount}%</b>" if discount > 0 else ""

    text = f"""🎯  <b>Новый заказ</b>

Что нужно сделать?{discount_line}"""

    # Удаляем старое и отправляем с картинкой
    try:
        await callback.message.delete()
    except Exception:
        pass

    photo = FSInputFile(settings.ORDER_IMAGE)
    await callback.message.answer_photo(
        photo=photo,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


@router.callback_query(F.data == "order_back_to_subject")
async def back_to_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """
    Назад к выбору направления.
    Для мелких работ — сразу к выбору типа.
    """
    await callback.answer()

    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    # Для мелких работ (не требующих направления) — возврат к типу
    if work_type and work_type not in WORKS_REQUIRE_SUBJECT:
        await back_to_type(callback, state, session)
        return

    # Для крупных — показываем выбор направления
    await state.set_state(OrderState.choosing_subject)

    work_label = WORK_TYPE_LABELS.get(work_type, work_type_value)

    text = f"""📚  <b>{work_label}</b>

Укажи направление — это поможет подобрать специалиста:"""

    await callback.message.edit_text(text, reply_markup=get_subject_keyboard())


@router.callback_query(F.data == "order_back_to_task")
async def back_to_task(callback: CallbackQuery, state: FSMContext):
    """Назад к вводу задания"""
    await callback.answer()
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Получаем work_type для контекста
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    if attachments:
        # Уже есть вложения — показываем превью
        preview = format_attachments_preview(attachments)
        text = f"""📝  <b>Задание</b>

Уже получено:
{preview}

Добавить ещё или продолжить?"""
        await callback.message.edit_text(text, reply_markup=get_task_continue_keyboard())
    else:
        await show_task_input_screen(callback.message, work_type=work_type)


@router.callback_query(OrderState.confirming, F.data == "order_edit")
async def edit_order(callback: CallbackQuery, state: FSMContext):
    """Редактирование заказа — выбор что изменить"""
    await callback.answer()

    # Определяем, нужна ли кнопка направления
    data = await state.get_data()
    work_type_value = data.get("work_type", "")
    show_subject = True

    try:
        work_type = WorkType(work_type_value)
        show_subject = work_type in WORKS_REQUIRE_SUBJECT
    except ValueError:
        pass

    text = """✏️  <b>Что изменить?</b>"""

    await callback.message.edit_text(text, reply_markup=get_edit_order_keyboard(show_subject=show_subject))


@router.callback_query(F.data == "back_to_confirm")
async def back_to_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Назад к подтверждению"""
    await callback.answer()
    await show_order_confirmation(callback, state, bot, session)


@router.callback_query(F.data == "edit_type")
async def edit_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Изменить тип работы"""
    await callback.answer()
    await state.set_state(OrderState.choosing_type)
    await back_to_type(callback, state, session)


@router.callback_query(F.data == "edit_subject")
async def edit_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Изменить направление"""
    await callback.answer()
    await state.set_state(OrderState.choosing_subject)
    await back_to_subject(callback, state, session)


@router.callback_query(F.data == "edit_task")
async def edit_task(callback: CallbackQuery, state: FSMContext):
    """Изменить задание — очищаем вложения"""
    await callback.answer()

    data = await state.get_data()

    # Получаем work_type для контекста
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    await state.update_data(attachments=[])
    await state.set_state(OrderState.entering_task)
    await show_task_input_screen(callback.message, work_type=work_type)


@router.callback_query(F.data == "edit_deadline")
async def edit_deadline(callback: CallbackQuery, state: FSMContext):
    """Изменить сроки"""
    await callback.answer()
    await state.set_state(OrderState.choosing_deadline)

    text = """⏰  <b>Когда нужна готовая работа?</b>

Точный срок — точная цена."""

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

    # Удаляем старое сообщение и отправляем с картинкой
    try:
        await callback.message.delete()
    except Exception:
        pass

    photo = FSInputFile(settings.CANCEL_IMAGE)
    await callback.message.answer_photo(
        photo=photo,
        caption="🌵  <b>Заявка отменена</b>\n\n"
                "Возвращайся, когда будешь готов, партнёр.",
        reply_markup=get_back_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    УВЕДОМЛЕНИЯ АДМИНАМ
# ══════════════════════════════════════════════════════════════

def get_order_admin_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    """Кнопки действий с заказом для админа"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💰 Назначить цену",
                callback_data=f"admin_set_price:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject:{order_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать",
                url=f"tg://user?id={user_id}"
            ),
            InlineKeyboardButton(
                text="📋 Инфо",
                callback_data=f"log_info:{user_id}"
            ),
        ],
    ])


async def notify_admins_new_order(bot: Bot, user, order: Order, data: dict):
    """Уведомление админов о новой заявке со всеми вложениями"""
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])
    is_urgent = data.get("is_urgent", False)

    subject_label = data.get("subject_label", "—")
    if data.get("subject") == "photo_task":
        subject_label = "📸 Фото задания"

    discount_line = f"◈  Скидка: {data.get('discount', 0)}%\n" if data.get("discount", 0) > 0 else ""

    # Для срочных — наценка
    urgent_line = ""
    if is_urgent:
        surcharge = data.get("urgent_surcharge", 0)
        urgent_deadline = URGENT_DEADLINE_LABELS.get(data.get("urgent_deadline", ""), "")
        if surcharge > 0:
            urgent_line = f"◈  ⚡ Наценка за срочность: +{surcharge}%\n"
        elif urgent_deadline:
            urgent_line = f"◈  ⚡ Срочный: {urgent_deadline}\n"

    # Формируем строку с username или без
    username_str = f"@{user.username}" if user.username else "без username"

    # Разный заголовок для срочных и обычных заказов
    if is_urgent:
        header = f"""🚨🚨🚨  <b>СРОЧНАЯ ЗАЯВКА #{order.id}</b>  🚨🚨🚨

⚡ <b>ТРЕБУЕТ БЫСТРОГО ОТВЕТА!</b>"""
    else:
        header = f"""🆕  <b>Новая заявка #{order.id}</b>"""

    text = f"""{header}

◈  Клиент: {user.full_name} ({username_str})
◈  ID: <code>{user.id}</code>

◈  Тип: {work_label}
◈  Направление: {subject_label}
◈  Срок: {data.get('deadline_label', '—')}
{urgent_line}{discount_line}"""

    attachments = data.get("attachments", [])
    admin_keyboard = get_order_admin_keyboard(order.id, user.id)

    async def notify_single_admin(admin_id: int):
        """Отправить уведомление одному админу"""
        try:
            # Сначала отправляем текст заявки с кнопками
            await bot.send_message(chat_id=admin_id, text=text, reply_markup=admin_keyboard)

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

    # Отправляем всем админам параллельно
    await asyncio.gather(*[notify_single_admin(admin_id) for admin_id in settings.ADMIN_IDS])


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

Что нужно сделать?"""

    await message.answer(text, reply_markup=get_work_category_keyboard())
