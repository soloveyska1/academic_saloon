import asyncio
import logging
import random
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from aiogram import Router, F, Bot

logger = logging.getLogger(__name__)

# Пути к изображениям для заказа
ZAKAZ_IMAGE_PATH = Path(__file__).parent.parent / "media" / "zakaz.jpg"
SMALL_TASKS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "small_tasks.jpg"
KURS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "kurs_otc.jpg"
DIPLOMA_IMAGE_PATH = Path(__file__).parent.parent / "media" / "diploma.jpg"
DIRECTIONS_IMAGE_PATH = Path(__file__).parent.parent / "media" / "directions.jpg"
DEADLINE_IMAGE_PATH = Path(__file__).parent.parent / "media" / "deadline.jpg"
URGENT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "urgent_bell.jpg"
SECRET_IMAGE_PATH = Path(__file__).parent.parent / "media" / "secret.jpg"
FAST_UPLOAD_IMAGE_PATH = Path(__file__).parent.parent / "media" / "fast_upload.jpg"
INVESTIGATION_IMAGE_PATH = Path(__file__).parent.parent / "media" / "investigation.jpg"
CONFIRM_URGENT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "confirm_urgent.jpg"
CONFIRM_SPECIAL_IMAGE_PATH = Path(__file__).parent.parent / "media" / "confirm_special.jpg"
CONFIRM_STD_IMAGE_PATH = Path(__file__).parent.parent / "media" / "confirm_std.jpg"
ORDER_DONE_IMAGE_PATH = Path(__file__).parent.parent / "media" / "order_done.jpg"
CHECKING_PAYMENT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "checking_payment.jpg"

# Risk Matrix: Изображения для разных состояний сметы
IMG_DEAL_READY = Path("/root/academic_saloon/bot/media/confirm_std.jpg")      # GREEN FLOW — Сделка готова
IMG_UNDER_REVIEW = Path("/root/academic_saloon/bot/media/checking_payment.jpg")  # YELLOW FLOW — На проверке

# Upload Stage: Изображения для загрузки файлов
IMG_UPLOAD_START = Path("/root/academic_saloon/bot/media/upload_bag.jpg")      # Пустая сумка — начальное состояние
IMG_FILES_RECEIVED = Path("/root/academic_saloon/bot/media/papka.jpg")         # Папка с файлами — файлы приняты

# Draft Review: Изображение для черновика контракта (ДО расчёта цены)
IMG_DRAFT_REVIEW = Path("/root/academic_saloon/bot/media/checklist.jpg")       # Чеклист — проверка данных
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile, InputMediaPhoto
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState, PanicState
from bot.keyboards.inline import get_back_keyboard, get_cancel_complete_keyboard
from bot.keyboards.orders import (
    get_work_type_keyboard,
    get_work_category_keyboard,
    get_category_works_keyboard,
    get_small_works_keyboard,
    get_medium_works_keyboard,
    get_large_works_keyboard,
    get_subject_keyboard,
    get_task_input_keyboard,
    get_task_continue_keyboard,
    get_append_files_keyboard,
    get_deadline_keyboard,
    get_custom_deadline_keyboard,
    get_confirm_order_keyboard,
    get_edit_order_keyboard,
    get_cancel_order_keyboard,
    get_deadline_with_date,
    get_urgent_order_keyboard,
    get_urgent_task_keyboard,
    get_special_type_keyboard,  # For category selection
    get_special_order_keyboard as get_special_order_kb,  # For post-order keyboard
    get_invoice_keyboard,
    get_manual_review_keyboard,
    get_waiting_payment_keyboard,
    get_order_success_keyboard,
    get_panic_urgency_keyboard,
    get_panic_upload_keyboard,
    get_panic_final_keyboard,
    SUBJECTS,
    DEADLINES,
    WORK_CATEGORIES,
    WORKS_REQUIRE_SUBJECT,
)
from bot.services.pricing import (
    calculate_price,
    get_invoice_text,
    get_special_order_text,
    format_price_breakdown,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from bot.texts.terms import get_first_name
from core.config import settings
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send
from bot.utils.media_group import handle_media_group_file, get_files_summary
from bot.handlers.start import process_start
from bot.services.yandex_disk import yandex_disk_service

MSK_TZ = ZoneInfo("Europe/Moscow")

# Словари для парсинга русских дат
WEEKDAYS_RU = {
    "понедельник": 0, "пн": 0,
    "вторник": 1, "вт": 1,
    "среда": 2, "среду": 2, "ср": 2,
    "четверг": 3, "чт": 3,
    "пятница": 4, "пятницу": 4, "пт": 4,
    "суббота": 5, "субботу": 5, "сб": 5,
    "воскресенье": 6, "воскресенью": 6, "вс": 6,
}

MONTHS_RU = {
    "января": 1, "янв": 1, "январь": 1,
    "февраля": 2, "фев": 2, "февраль": 2,
    "марта": 3, "мар": 3, "март": 3,
    "апреля": 4, "апр": 4, "апрель": 4,
    "мая": 5, "май": 5,
    "июня": 6, "июн": 6, "июнь": 6,
    "июля": 7, "июл": 7, "июль": 7,
    "августа": 8, "авг": 8, "август": 8,
    "сентября": 9, "сен": 9, "сент": 9, "сентябрь": 9,
    "октября": 10, "окт": 10, "октябрь": 10,
    "ноября": 11, "ноя": 11, "нояб": 11, "ноябрь": 11,
    "декабря": 12, "дек": 12, "декабрь": 12,
}


def parse_custom_deadline(text: str) -> tuple[str, str]:
    """
    Парсит текстовый ввод даты и определяет срочность.

    Returns:
        (deadline_key, deadline_label) - ключ для множителя и человекочитаемая метка
    """
    text_lower = text.lower().strip()
    now = datetime.now(MSK_TZ)
    today = now.date()
    target_date = None

    # Проверяем "сегодня"
    if "сегодня" in text_lower:
        return ("today", text)

    # Проверяем "завтра"
    if "завтра" in text_lower:
        return ("tomorrow", text)

    # Проверяем дни недели (к понедельнику, до среды, в пятницу)
    for weekday_name, weekday_num in WEEKDAYS_RU.items():
        if weekday_name in text_lower:
            # Находим ближайший такой день недели
            days_ahead = weekday_num - today.weekday()
            if days_ahead <= 0:  # Если день уже прошёл на этой неделе
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
            break

    # Проверяем формат "DD месяца" или "DD.MM"
    if target_date is None:
        # Паттерн: "15 декабря", "5 янв"
        for month_name, month_num in MONTHS_RU.items():
            pattern = rf"(\d{{1,2}})\s*{month_name}"
            match = re.search(pattern, text_lower)
            if match:
                day = int(match.group(1))
                year = today.year
                # Если месяц уже прошёл, берём следующий год
                if month_num < today.month or (month_num == today.month and day < today.day):
                    year += 1
                try:
                    target_date = datetime(year, month_num, day).date()
                except ValueError:
                    pass
                break

        # Паттерн: "15.12" или "15/12"
        if target_date is None:
            match = re.search(r"(\d{1,2})[./](\d{1,2})", text_lower)
            if match:
                day = int(match.group(1))
                month = int(match.group(2))
                year = today.year
                if month < today.month or (month == today.month and day < today.day):
                    year += 1
                try:
                    target_date = datetime(year, month, day).date()
                except ValueError:
                    pass

    # Если удалось распарсить дату, вычисляем разницу
    if target_date:
        days_diff = (target_date - today).days

        if days_diff <= 0:
            return ("today", text)
        elif days_diff == 1:
            return ("tomorrow", text)
        elif days_diff <= 3:
            return ("3_days", text)
        elif days_diff <= 7:
            return ("week", text)
        elif days_diff <= 14:
            return ("2_weeks", text)
        else:
            return ("month", text)

    # Не удалось распарсить — используем "неделя" как безопасный дефолт
    return ("week", text)

router = Router()


# ══════════════════════════════════════════════════════════════
#                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════════════════

MAX_ATTACHMENTS = 10  # Максимум вложений в заказе

# Rate limiting
RATE_LIMIT_ORDERS = 5  # Максимум заказов в минуту
RATE_LIMIT_WINDOW = 60  # Окно в секундах


async def check_rate_limit(user_id: int) -> bool:
    """
    Проверяет rate limit для создания заказов.
    Возвращает True если можно создавать, False если лимит превышен.
    """
    from core.redis_pool import get_redis

    try:
        redis = await get_redis()
        key = f"rate:order:{user_id}"
        count = await redis.incr(key)

        if count == 1:
            await redis.expire(key, RATE_LIMIT_WINDOW)

        return count <= RATE_LIMIT_ORDERS
    except Exception as e:
        logger.warning(f"Rate limit check failed: {e}")
        return True  # При ошибке Redis — разрешаем


def parse_callback_data(data: str, index: int, separator: str = ":") -> Optional[str]:
    """Безопасный парсинг callback_data по индексу"""
    parts = data.split(separator)
    return parts[index] if len(parts) > index else None


def pluralize_files(n: int) -> str:
    """Правильное склонение слова 'файл'"""
    if n % 10 == 1 and n % 100 != 11:
        return f"{n} файл"
    elif 2 <= n % 10 <= 4 and not (12 <= n % 100 <= 14):
        return f"{n} файла"
    return f"{n} файлов"


# Короткие подтверждения по типу файла
FILE_TYPE_CONFIRMATIONS = {
    "text": ["📝 Принял!", "📝 Записал!"],
    "photo": ["📸 Фото принял!", "📸 Есть!"],
    "document": ["📄 Файл принял!", "📄 Добавил!"],
    "voice": ["🎤 Голосовое принял!", "🎤 Записал!"],
    "video": ["🎬 Видео принял!", "🎬 Добавил!"],
    "audio": ["🎵 Аудио принял!", "🎵 Добавил!"],
    "video_note": ["⚪ Кружок принял!", "⚪ Добавил!"],
}


def get_attachment_confirm_text(
    attachment: dict,
    count: int,
    is_urgent: bool = False,
    is_special: bool = False,
) -> str:
    """
    Генерирует короткое подтверждение получения файла.
    Progress bar добавляется отдельно в вызывающем коде.
    """
    att_type = attachment.get("type", "unknown")

    # Выбираем подтверждение по типу
    confirmations = FILE_TYPE_CONFIRMATIONS.get(att_type, ["📎 Принял!"])
    confirm = random.choice(confirmations)

    # Дополнительная инфа
    extra = ""
    if att_type == "document":
        fname = attachment.get("file_name", "")
        if fname:
            if len(fname) > 25:
                fname = fname[:22] + "..."
            extra = f"\n<i>{fname}</i>"
    elif att_type == "voice":
        duration = attachment.get("duration", 0)
        if duration:
            mins, secs = divmod(duration, 60)
            extra = f"\n<i>{mins}:{secs:02d}</i>" if mins else f"\n<i>{secs} сек</i>"

    # === СРОЧНЫЙ ЗАКАЗ ===
    if is_urgent:
        return f"⚡️ {confirm}{extra}"

    # === СПЕЦЗАКАЗ ===
    if is_special:
        return f"🔍 {confirm}{extra}"

    return f"{confirm}{extra}"


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


def format_materials_received_message(attachments: list) -> str:
    """
    Форматирует сообщение "МАТЕРИАЛЫ ПРИНЯТЫ" для нового UI.
    Показывает количество файлов и сниппет описания.
    """
    if not attachments:
        return """📂 <b>ПАПКА ПУСТА</b>

<i>Скинь сюда задание: текст, фото, файлы...</i>"""

    # Считаем файлы (всё кроме текста)
    file_count = 0
    description_snippet = None

    for att in attachments:
        att_type = att.get("type", "unknown")
        if att_type == "text":
            content = att.get("content", "")
            if len(content) > 50:
                description_snippet = content[:47] + "..."
            else:
                description_snippet = content
        else:
            file_count += 1

    # Формируем сообщение
    lines = ["📥 <b>МАТЕРИАЛЫ ПРИНЯТЫ</b>", ""]

    if file_count > 0:
        lines.append(f"🗂 <b>Загружено файлов:</b> {file_count}")

    if description_snippet:
        lines.append(f"📝 <b>ТЗ:</b> «{description_snippet}»")
    elif file_count == 0:
        lines.append("📝 <b>ТЗ:</b> <i>(только текст)</i>")
    else:
        lines.append("📝 <b>ТЗ:</b> <i>(из файлов)</i>")

    lines.append("")
    lines.append("<i>Если это всё — жми «Готово», чтобы узнать цену.</i>")

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    PROGRESS BAR & APPEND CONFIRMATIONS
# ══════════════════════════════════════════════════════════════

MAX_APPEND_FILES = 5  # Лимит файлов для дослать


def get_progress_bar(current: int, maximum: int = MAX_ATTACHMENTS) -> str:
    """
    Генерирует визуальный progress bar.

    Примеры:
        ■■■□□□□□□□ 3/10
        ■■■■■■■■■■ 10/10 ✓
    """
    filled = min(current, maximum)
    empty = maximum - filled

    bar = "■" * filled + "□" * empty

    if current >= maximum:
        return f"{bar} {current}/{maximum} ✓"

    return f"{bar} {current}/{maximum}"


# Атмосферные подтверждения для append flow (дослать файлы)
APPEND_CONFIRMATIONS = {
    "photo": [
        "📸 Фото подшил к делу!",
        "📸 Снимок принят, партнёр!",
        "📸 Улика зафиксирована!",
    ],
    "document": [
        "📄 Документ в деле!",
        "📄 Бумага принята!",
        "📄 Файл подшит, партнёр!",
    ],
    "voice": [
        "🎤 Голос записан в протокол!",
        "🎤 Показания приняты!",
        "🎤 Аудиозапись в деле!",
    ],
    "text": [
        "📝 Записал в блокнот!",
        "📝 Текст принят!",
        "📝 Информация зафиксирована!",
    ],
    "video": [
        "🎬 Видео принято!",
        "🎬 Запись в деле!",
    ],
    "video_note": [
        "⚪ Кружок получил!",
        "⚪ Видеосообщение принято!",
    ],
    "audio": [
        "🎵 Аудио принято!",
        "🎵 Запись в деле!",
    ],
}


def get_append_confirm_text(
    attachment: dict,
    total_count: int,
    order_id: int,
) -> str:
    """
    Генерирует атмосферное подтверждение для append flow.
    Включает progress bar и информацию о файле.
    """
    att_type = attachment.get("type", "unknown")

    # Выбираем рандомное подтверждение
    confirmations = APPEND_CONFIRMATIONS.get(att_type, ["📎 Принято!"])
    confirm = random.choice(confirmations)

    # Доп. инфо о файле
    extra = ""
    if att_type == "document":
        fname = attachment.get("file_name", "")
        if fname:
            if len(fname) > 25:
                fname = fname[:22] + "..."
            extra = f"\n<i>{fname}</i>"
    elif att_type == "voice":
        duration = attachment.get("duration", 0)
        if duration:
            mins, secs = divmod(duration, 60)
            if mins:
                extra = f"\n<i>{mins}:{secs:02d}</i>"
            else:
                extra = f"\n<i>{secs} сек</i>"

    # Progress bar
    progress = get_progress_bar(total_count, MAX_APPEND_FILES)

    # Предупреждение о лимите
    warning = ""
    remaining = MAX_APPEND_FILES - total_count
    if remaining == 1:
        warning = "\n\n⚠️ Осталось 1 место!"
    elif remaining <= 0:
        warning = "\n\n✓ Лимит достигнут — жми «Отправить»"

    return f"""{confirm}{extra}

{progress}{warning}"""


def format_append_status_message(
    attachments: list,
    order_id: int,
) -> str:
    """
    Форматирует сообщение со статусом загрузки для append flow.
    Показывает что уже загружено + progress bar.
    """
    if not attachments:
        return f"""📎 <b>Дослать к заказу #{order_id}</b>

Кидай файлы, фото или голосовое.

{get_progress_bar(0, MAX_APPEND_FILES)}

<i>💡 Нажми 📎 внизу экрана</i>"""

    preview = format_attachments_preview(attachments)
    progress = get_progress_bar(len(attachments), MAX_APPEND_FILES)

    return f"""📎 <b>Дослать к заказу #{order_id}</b>

{preview}

{progress}

<i>Ещё файлы или жми «Отправить»</i>"""


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


# ══════════════════════════════════════════════════════════════
#   БЫСТРЫЙ ЗАКАЗ ИЗ ПРАЙС-ЛИСТА (quick_order:*)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("quick_order:"))
async def quick_order_from_price(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Быстрый заказ из прайс-листа — сразу к выбору направления/заданию.

    Кнопки: quick_order:diploma, quick_order:coursework, quick_order:photo_task, quick_order:other
    """
    # ОБЯЗАТЕЛЬНО: останавливаем часики
    await callback.answer("⏳ Начинаем оформление...")

    # Парсим тип работы
    work_type_value = callback.data.split(":")[1]

    # Валидация типа
    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        await callback.message.answer("❌ Неизвестный тип работы")
        return

    # Очищаем state и инициализируем
    await state.clear()
    await state.update_data(
        work_type=work_type_value,
        attachments=[],
    )

    work_label = WORK_TYPE_LABELS.get(work_type, work_type_value)

    # Логируем
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_START,
            user=callback.from_user,
            details=f"Быстрый заказ из прайса: {work_label}",
            session=session,
        )
    except Exception:
        pass

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Если photo_task или other — сразу к заданию
    if work_type == WorkType.PHOTO_TASK:
        await state.update_data(subject="photo_task", subject_label="📸 Фото задания")
        await state.set_state(OrderState.entering_task)
        await show_task_input_screen(callback.message, is_photo_task=True, send_new=True)
        return

    if work_type == WorkType.OTHER:
        # "Другое" переходит в Panic Flow
        await start_panic_flow(callback, state, bot)
        return

    # Для diploma, coursework и других крупных — к выбору направления
    if work_type in WORKS_REQUIRE_SUBJECT:
        await state.set_state(OrderState.choosing_subject)

        text = f"""📚 <b>{work_label}</b> — отличный выбор!

Теперь выбери направление, чтобы мы подобрали нужного специалиста:"""

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=text,
            reply_markup=get_subject_keyboard(),
        )
        return

    # Для остальных — сразу к заданию
    await state.update_data(subject="skip", subject_label="—")
    await state.set_state(OrderState.entering_task)
    await show_task_input_screen(callback.message, send_new=True)


@router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Начать создание заказа — выбор типа работы"""
    await callback.answer("⏳")

    # Админы без ограничений
    if callback.from_user.id in settings.ADMIN_IDS:
        await _proceed_to_order_creation(callback, state, bot, session)
        return

    # Rate limiting — защита от спама
    if not await check_rate_limit(callback.from_user.id):
        await callback.message.answer(
            "⏳ <b>Подожди немного</b>\n\n"
            "Слишком много запросов. Попробуй через минуту."
        )
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

        await safe_edit_or_send(callback, limit_text, reply_markup=keyboard, bot=bot)
        return

    await _proceed_to_order_creation(callback, state, bot, session)


@router.callback_query(F.data == "force_create_order")
async def force_create_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Создать заказ несмотря на лимит"""
    await callback.answer("⏳")
    await _proceed_to_order_creation(callback, state, bot, session)


async def _proceed_to_order_creation(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Общая логика начала создания заказа"""
    # Показываем typing пока готовим экран
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

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
    except Exception as e:
        logger.warning(f"Ошибка трекера заказов: {e}")

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_START,
            user=callback.from_user,
            details="Начал создание заказа",
            session=session,
            level=LogLevel.ACTION,
        )
    except Exception as e:
        logger.warning(f"Ошибка логирования ORDER_START: {e}")

    # Получаем скидку пользователя (с защитой от ошибок)
    discount = 0
    try:
        user_query = select(User).where(User.telegram_id == callback.from_user.id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        discount = calculate_user_discount(user)
    except Exception as e:
        logger.warning(f"Ошибка получения скидки: {e}")

    discount_line = f"\n\n🎁 Твоя скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Партнер, выбирай калибр задачи. Справимся с любой — от эссе на салфетке до диплома в твердом переплете.{discount_line}"""

    # Удаляем старое сообщение и отправляем с картинкой (с кэшированием file_id)
    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


@router.callback_query(OrderState.choosing_type, F.data.startswith("work_category:"))
async def process_work_category(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Обработка выбора категории работ.
    Показывает конкретные типы в выбранной категории.
    """
    await callback.answer("⏳")

    category_key = parse_callback_data(callback.data, 1)
    category = WORK_CATEGORIES.get(category_key)

    if not category:
        # Неизвестная категория — показываем полный список
        await callback.message.edit_caption(
            caption="🎯 <b>Оформление заказа</b>\n\nВыбери тип работы:",
            reply_markup=get_work_type_keyboard()
        )
        return

    # Для срочных заказов — Panic Flow
    if category_key == "urgent":
        # Обновляем трекер (некритично)
        try:
            tracker = get_abandoned_tracker()
            if tracker:
                await tracker.update_step(callback.from_user.id, "Panic Flow (срочно)")
        except Exception:
            pass

        # Запускаем Panic Flow
        await start_panic_flow(callback, state, bot)
        return

    # Для мелких работ — специальный layout с фото и ценами в caption
    if category_key == "small":
        caption = """⚡️ <b>Быстрые задачи</b>

Закроем долги по мелочи, пока ты занимаешься важными делами.
Обычно сдаём за 1-3 дня.

<i>Выбирай, что нужно закрыть:</i> 👇"""

        # Удаляем старое и отправляем с фото
        try:
            await callback.message.delete()
        except Exception:
            pass

        if SMALL_TASKS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=SMALL_TASKS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_small_works_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото small_tasks: {e}")

        # Fallback на текст
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_small_works_keyboard(),
        )
        return

    # Для курсовых/практик — крупный калибр
    if category_key == "medium":
        caption = """📚 <b>Курсовые и Практика</b>

Серьёзная работа для серьёзных людей.
Теория или практика — нам без разницы.

<i>Что пишем?</i> 👇"""

        # Удаляем старое и отправляем с фото
        try:
            await callback.message.delete()
        except Exception:
            pass

        if KURS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=KURS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_medium_works_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото kurs: {e}")

        # Fallback на текст
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_medium_works_keyboard(),
        )
        return

    # Для дипломов — самый крупный калибр
    if category_key == "large":
        caption = """🏆 <b>Большой куш</b>

Главная битва за твою свободу. Ставки высоки.
Мы сделаем чисто: комар носу не подточит.

<i>Выбирай калибр:</i> 👇"""

        # Удаляем старое и отправляем с фото
        try:
            await callback.message.delete()
        except Exception:
            pass

        if DIPLOMA_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=DIPLOMA_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_large_works_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото diploma: {e}")

        # Fallback на текст
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_large_works_keyboard(),
        )
        return

    # === СПЕЦЗАКАЗ / НЕФОРМАТ ===
    if category_key == "other":
        caption = """<b>💀 Спецзаказ / Неформат</b>

Не нашёл свою тему в списке? Или препод задал что-то совсем дикое?

Не беда. Мы в этом салуне видали всякое. Если это можно написать или начертить — мы это сделаем.

<i>Выбирай, как удобнее: оформить заявку тут или сразу написать главному.</i>"""

        # Удаляем старое и отправляем с фото
        try:
            await callback.message.delete()
        except Exception:
            pass

        if SECRET_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=SECRET_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_special_type_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото secret: {e}")

        # Fallback на текст
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_special_type_keyboard(),
        )
        return

    # Показываем типы работ в категории (для остальных категорий)
    text = f"""🎯  <b>{category['label']}</b>

<i>{category['description']}</i>

Выбери тип работы:"""

    await callback.message.edit_caption(
        caption=text,
        reply_markup=get_category_works_keyboard(category_key)
    )


@router.callback_query(OrderState.choosing_type, F.data == "back_to_categories")
async def back_to_categories(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Назад к выбору категории"""
    await callback.answer("⏳")

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n\n🎁 Твоя скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Партнер, выбирай калибр задачи. Справимся с любой — от эссе на салфетке до диплома в твердом переплете.{discount_line}"""

    # Удаляем старое и отправляем новое фото (универсально работает для любых сообщений)
    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
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
    await callback.answer("⏳")

    deadline_key = parse_callback_data(callback.data, 1)
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

    # === РЕЖИМ ФОРСАЖ — ЗАГРУЗКА ФАЙЛОВ ===

    # Формируем текст статуса
    if deadline_key == "asap":
        status_block = """<b>Срок:</b> Определим после оценки
<b>Статус:</b> 🔥 Максимальный приоритет"""
    else:
        status_block = f"""<b>Срок:</b> {deadline_label}
<b>Статус:</b> 🔥 Максимальный приоритет"""

    caption = f"""<b>⚡️ Режим «Форсаж» активирован</b>

{status_block}

Время пошло. Меньше слов — больше дела.

Кидай сюда всё, что есть: методичку, скрины, черновики или запиши голосовое. Я разберусь с материалами на лету.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""

    # Пробуем отправить с картинкой
    if FAST_UPLOAD_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=FAST_UPLOAD_IMAGE_PATH,
                caption=caption,
                reply_markup=get_urgent_task_keyboard(),
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить фото fast_upload: {e}")
            await callback.message.answer(
                text=caption,
                reply_markup=get_urgent_task_keyboard()
            )
    else:
        # Fallback на текст
        await callback.message.answer(
            text=caption,
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
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # === СРОЧНЫЙ ЗАКАЗ — КОД КРАСНЫЙ (BADASS MODE) ===

    caption = """<b>🚨 КОД КРАСНЫЙ: Горит дедлайн?</b>

🌙 Да, мы работаем прямо сейчас. Выдыхай.

Пока другие спят — мы вытаскиваем из задницы тех, кто дотянул до последнего. Без осуждения, без лишних вопросов. Только результат.

<i>Надбавка за скорость — это честная плата за бессонные ночи команды:</i>"""

    # Пробуем отправить с картинкой
    if URGENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=URGENT_IMAGE_PATH,
                caption=caption,
                reply_markup=get_urgent_order_keyboard(),
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото urgent: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_urgent_order_keyboard(),
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
    await callback.answer("⏳")

    work_type_value = parse_callback_data(callback.data, 1)
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

    caption = f"""🎯 <b>Выбирай мишень</b>

В какой сфере проблема, ковбой?
Укажи тему, чтобы я знал, какого специалиста поднимать с постели."""

    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем с фото если есть
    if DIRECTIONS_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=DIRECTIONS_IMAGE_PATH,
                caption=caption,
                reply_markup=get_subject_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback на текст
    await bot.send_message(chat_id, caption, reply_markup=get_subject_keyboard())


# ══════════════════════════════════════════════════════════════
#                    ШАГ 2: ВЫБОР НАПРАВЛЕНИЯ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_subject, F.data.startswith("subject:"))
async def process_subject(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Обработка выбора направления → переход к вводу задания.
    Поддерживает subject:skip для пропуска этого шага.
    """
    await callback.answer("⏳")

    subject_key = parse_callback_data(callback.data, 1)

    # Пропуск выбора направления
    if subject_key == "skip":
        subject_label = "—"
    else:
        subject_label = SUBJECTS.get(subject_key, subject_key)

    await state.update_data(subject=subject_key, subject_label=subject_label)
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()

    # Защита от потери state
    work_type_value = data.get("work_type")
    if not work_type_value:
        # State потерян — возвращаем к началу
        await callback.message.answer(
            "⚠️ Что-то пошло не так. Давай начнём заново.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📝 Оформить заказ", callback_data="create_order")]
            ])
        )
        await state.clear()
        return

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type_value), work_type_value)

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
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    await show_task_input_screen(callback.message, work_type=work_type)


async def show_task_input_screen(
    message: Message,
    is_photo_task: bool = False,
    send_new: bool = False,
    work_type: WorkType | None = None,
):
    """
    Показать экран ввода задания с фото.
    Дружелюбный интерфейс с инструкциями.
    Для спецзаказов (OTHER) — особый экран "Материалы дела".
    """
    bot = message.bot
    chat_id = message.chat.id

    # === СПЕЦЗАКАЗ: Особый экран "Материалы дела" ===
    if work_type == WorkType.OTHER:
        caption = """🕵️‍♂️ <b>Материалы дела</b>

Так, давай подробности. Раз задача нестандартная, мне нужно понять, во что мы ввязываемся.

Не стесняйся. Скидывай всё: черновики, фото доски, или запиши голосовое с объяснениями на пальцах. Чем страннее задача — тем интереснее вызов.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""

        # Удаляем старое сообщение
        if not send_new:
            try:
                await message.delete()
            except Exception:
                pass

        # Пробуем отправить с картинкой investigation.jpg
        if INVESTIGATION_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=chat_id,
                    photo_path=INVESTIGATION_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_task_input_keyboard(),
                )
                return
            except Exception:
                pass

        # Fallback на текст
        await bot.send_message(
            chat_id=chat_id,
            text=caption,
            reply_markup=get_task_input_keyboard(),
        )
        return

    # === СТАНДАРТНЫЙ ЭКРАН ===
    caption = """📥  <b>Приём материалов</b>

Выкладывай всё, что есть по задаче.
Чем больше инфы — тем точнее смогу назвать цену.

<b>Что можно прислать:</b>
📸 Фото методички или доски
📄 Файлы (Word, PDF)
💬 Скриншоты переписки с преподом
✍️ <b>Или просто напиши тему и требования текстом</b>

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""

    # Удаляем старое сообщение
    if not send_new:
        try:
            await message.delete()
        except Exception:
            pass

    # Выбираем изображение для начального состояния (пустая сумка)
    start_image = IMG_UPLOAD_START if IMG_UPLOAD_START.exists() else settings.TASK_INPUT_IMAGE

    # Отправляем фото с caption (с кэшированием file_id)
    if start_image.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=start_image,
                caption=caption,
                reply_markup=get_task_input_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback на текстовое сообщение
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=get_task_input_keyboard(),
    )


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
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    attachments = data.get("attachments", [])
    is_urgent = data.get("is_urgent", False)

    # Определяем, спецзаказ ли это (WorkType.OTHER)
    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value

    # Проверка лимита
    if len(attachments) >= MAX_ATTACHMENTS:
        await message.answer(
            f"⚠️ Максимум {MAX_ATTACHMENTS} вложений.\n"
            "Жми «Готово» чтобы продолжить.",
            reply_markup=get_task_continue_keyboard(files_count=len(attachments))
        )
        return

    # Определяем тип контента и сохраняем
    attachment = None
    file_id = None

    if message.text:
        # Текстовое сообщение — Soft Validation
        text_content = message.text.strip()

        # Reject garbage (< 2 chars)
        if len(text_content) < 2:
            await message.answer(
                "🤔 Слишком коротко, партнёр. Опиши задание подробнее.",
                reply_markup=get_task_continue_keyboard(files_count=len(attachments))
            )
            return

        # Set risk flag for short descriptions
        risk_short_description = len(text_content) < 20
        await state.update_data(risk_short_description=risk_short_description)

        attachment = {
            "type": "text",
            "content": text_content,
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
                    "☝️ Этот файл уже в деле, партнёр!",
                    reply_markup=get_task_continue_keyboard(files_count=len(attachments))
                )
                return

        # Если это пересланное сообщение — добавляем информацию
        if message.forward_from or message.forward_from_chat:
            attachment["forwarded"] = True
            if message.forward_from:
                attachment["forward_from"] = message.forward_from.full_name
            elif message.forward_from_chat:
                attachment["forward_from"] = message.forward_from_chat.title

        # Проверяем, является ли это частью media_group (альбома)
        media_group_id = message.media_group_id

        if media_group_id:
            # Часть альбома — НЕ сохраняем сразу, собираем в коллекторе
            # и сохраним ВСЕ файлы разом в callback (избегаем race condition)
            async def on_media_group_complete(files: list, chat_id: int, is_urgent: bool, is_special: bool, fsm_state: FSMContext):
                """Callback вызывается когда все файлы группы получены"""
                # Читаем актуальное состояние и добавляем ВСЕ файлы разом
                current_data = await fsm_state.get_data()
                current_attachments = current_data.get("attachments", [])

                # Добавляем все собранные файлы
                for f in files:
                    # Проверка на дубли
                    f_id = f.get("file_id")
                    if f_id:
                        existing_ids = {att.get("file_id") for att in current_attachments if att.get("file_id")}
                        if f_id in existing_ids:
                            continue
                    current_attachments.append(f)

                # Устанавливаем флаг has_attachments для файлов
                await fsm_state.update_data(attachments=current_attachments, has_attachments=True)

                total_count = len(current_attachments)

                # Формируем сообщение "МАТЕРИАЛЫ ПРИНЯТЫ" с новым UI
                materials_caption = format_materials_received_message(current_attachments)
                keyboard = get_task_continue_keyboard(files_count=total_count)

                # Отправляем с изображением IMG_FILES_RECEIVED
                if IMG_FILES_RECEIVED.exists():
                    try:
                        await send_cached_photo(
                            bot=bot,
                            chat_id=chat_id,
                            photo_path=IMG_FILES_RECEIVED,
                            caption=materials_caption,
                            reply_markup=keyboard,
                        )
                        return
                    except Exception:
                        pass

                # Fallback на текст
                await bot.send_message(chat_id, materials_caption, reply_markup=keyboard)

            # Добавляем в коллектор (НЕ сохраняем в state сразу!)
            await handle_media_group_file(
                media_group_id=media_group_id,
                file_info=attachment,
                on_complete=on_media_group_complete,
                chat_id=message.chat.id,
                is_urgent=is_urgent,
                is_special=is_special,
                fsm_state=state,
            )
        else:
            # Одиночный файл — сохраняем и отвечаем сразу
            attachments.append(attachment)

            # Set has_attachments flag for file types (not text)
            if attachment.get("type") != "text":
                await state.update_data(attachments=attachments, has_attachments=True)
            else:
                await state.update_data(attachments=attachments)

            count = len(attachments)

            # Формируем сообщение "МАТЕРИАЛЫ ПРИНЯТЫ" с новым UI
            materials_caption = format_materials_received_message(attachments)

            # Добавляем инфо о пересылке
            if attachment.get("forwarded"):
                forward_from = attachment.get("forward_from", "")
                if forward_from:
                    materials_caption += f"\n📨 <i>Переслано от {forward_from}</i>"

            keyboard = get_task_continue_keyboard(files_count=count)

            # Отправляем с изображением IMG_FILES_RECEIVED
            if IMG_FILES_RECEIVED.exists():
                try:
                    await send_cached_photo(
                        bot=bot,
                        chat_id=message.chat.id,
                        photo_path=IMG_FILES_RECEIVED,
                        caption=materials_caption,
                        reply_markup=keyboard,
                    )
                    return
                except Exception:
                    pass

            # Fallback на простой текст
            await message.answer(materials_caption, reply_markup=keyboard)


@router.callback_query(OrderState.entering_task, F.data == "task_add_more")
async def task_add_more(callback: CallbackQuery, state: FSMContext):
    """Legacy handler — кнопка удалена, просто отвечаем"""
    await callback.answer("Просто добавь файл 📎")


@router.callback_query(F.data == "task_clear")
async def task_clear(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Очистить все вложения — ОСТАЁМСЯ НА МЕСТЕ.

    Логика:
    1. Очищаем данные (attachments, flags)
    2. Явно устанавливаем state = entering_task
    3. Показываем ТОТ ЖЕ экран с полной клавиатурой (Готово, Очистить, Назад, Отмена)
    """
    await callback.answer("🗑 Список очищен!")

    data = await state.get_data()

    # ═══════════════════════════════════════════════════════════════
    # 1. WIPE DATA
    # ═══════════════════════════════════════════════════════════════
    await state.update_data(
        attachments=[],
        has_attachments=False,
        risk_short_description=None
    )

    # ═══════════════════════════════════════════════════════════════
    # 2. ЯВНО УСТАНАВЛИВАЕМ STATE
    # ═══════════════════════════════════════════════════════════════
    await state.set_state(OrderState.entering_task)

    # Получаем work_type для контекста
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    # ═══════════════════════════════════════════════════════════════
    # 3. PREPARE UI — ОСТАЁМСЯ НА МЕСТЕ С ПОЛНОЙ КЛАВИАТУРОЙ
    # ═══════════════════════════════════════════════════════════════
    if work_type == WorkType.OTHER:
        caption = """🕵️‍♂️ <b>Материалы дела</b>

🗑 <b>Список очищен!</b>

Можешь загрузить новые файлы или описать задачу текстом.

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""
        image_path = INVESTIGATION_IMAGE_PATH
    else:
        caption = """🗑 <b>СПИСОК ОЧИЩЕН!</b>

Можешь загрузить новые файлы или описать задачу текстом.

<b>Что можно прислать:</b>
📸 Фото методички или доски
📄 Файлы (Word, PDF)
💬 Скриншоты переписки с преподом
✍️ <b>Или просто напиши тему и требования текстом</b>

<i>💡 Чтобы прикрепить файл — нажми 📎 внизу экрана.</i>"""
        image_path = IMG_FILES_RECEIVED if IMG_FILES_RECEIVED.exists() else settings.TASK_INPUT_IMAGE

    # ПОЛНАЯ клавиатура — как будто файлы есть (files_count=1)
    # Это даёт: Готово, Очистить список, Назад, Отмена
    keyboard = get_task_continue_keyboard(files_count=1)

    # ═══════════════════════════════════════════════════════════════
    # 4. ОБНОВЛЯЕМ СООБЩЕНИЕ IN-PLACE (edit_media)
    # ═══════════════════════════════════════════════════════════════
    try:
        if image_path.exists():
            # Пробуем edit_media с FSInputFile
            from aiogram.types import InputMediaPhoto, FSInputFile
            media = InputMediaPhoto(
                media=FSInputFile(image_path),
                caption=caption
            )
            await callback.message.edit_media(media=media, reply_markup=keyboard)
        else:
            # Fallback: только текст и клавиатура
            await callback.message.edit_caption(caption=caption, reply_markup=keyboard)
    except Exception as e:
        logger.warning(f"edit_media failed: {e}, trying delete+send")
        # Fallback: удаляем и отправляем заново
        try:
            await callback.message.delete()
        except Exception:
            pass

        if image_path.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=image_path,
                    caption=caption,
                    reply_markup=keyboard,
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=keyboard,
        )


@router.callback_query(F.data == "back_from_task")
async def back_from_task(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Возврат к предыдущему шагу (выбор направления/предмета).
    Обработчик БЕЗ фильтра state чтобы всегда срабатывал.
    """
    await callback.answer("↩️")

    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    # Очищаем attachments и risk flags при возврате
    await state.update_data(
        attachments=[],
        has_attachments=False,
        risk_short_description=None
    )

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    # Для типов требующих выбор предмета - возвращаемся к предметам
    if work_type and work_type.value in WORKS_REQUIRE_SUBJECT:
        await state.set_state(OrderState.choosing_subject)

        try:
            await callback.message.delete()
        except Exception:
            pass

        if DIRECTIONS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=DIRECTIONS_IMAGE_PATH,
                    caption="📚 <b>Выбери направление</b>\n\n<i>В какой области нужна помощь?</i>",
                    reply_markup=get_subject_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text="📚 <b>Выбери направление</b>\n\n<i>В какой области нужна помощь?</i>",
            reply_markup=get_subject_keyboard(),
        )
    else:
        # Для остальных - возвращаемся к выбору типа работы
        await state.set_state(OrderState.choosing_work_type)

        try:
            await callback.message.delete()
        except Exception:
            pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text="📋 <b>Выбери тип работы</b>",
            reply_markup=get_work_category_keyboard(),
        )


@router.callback_query(OrderState.entering_task, F.data == "task_done")
async def task_done(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пользователь закончил ввод задания → переход к срокам или подтверждению"""
    data = await state.get_data()
    attachments = data.get("attachments", [])

    if not attachments:
        await callback.answer("Сначала скинь хотя бы что-нибудь!", show_alert=True)
        return

    await callback.answer("⏳")

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

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Удаляем старое и отправляем с фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    ШАГ 4: ВЫБОР СРОКОВ
# ══════════════════════════════════════════════════════════════

@router.callback_query(OrderState.choosing_deadline, F.data.startswith("deadline:"))
async def process_deadline_choice(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка выбора срока из кнопок"""
    await callback.answer("⏳")

    deadline_key = parse_callback_data(callback.data, 1)

    # Если выбрали "Указать дату" — просим ввести текстом
    if deadline_key == "custom":
        text = """📅  <b>Укажи дату</b>

Напиши когда нужно получить работу.

<i>Например: до 15 декабря, к понедельнику</i>"""
        await safe_edit_or_send(callback, text, reply_markup=get_custom_deadline_keyboard(), bot=bot)
        return

    deadline_label = DEADLINES.get(deadline_key, deadline_key)
    await state.update_data(deadline=deadline_key, deadline_label=deadline_label)

    # Переходим к подтверждению
    await show_order_confirmation(callback, state, bot, session)


@router.callback_query(OrderState.choosing_deadline, F.data == "order_back_to_deadline_buttons")
async def back_to_deadline_buttons(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Назад к кнопкам выбора срока"""
    await callback.answer("⏳")

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Удаляем старое и отправляем с фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


@router.message(OrderState.choosing_deadline)
async def process_deadline_text(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Обработка ввода срока текстом"""
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    # Парсим текстовую дату и определяем срочность для правильного расчёта цены
    deadline_key, deadline_label = parse_custom_deadline(message.text)
    await state.update_data(deadline=deadline_key, deadline_label=deadline_label)

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
    Три сценария в зависимости от типа заказа:
    - URGENT: Высокий приоритет, быстрый запуск
    - SPECIAL: Интрига, экспертный анализ
    - STANDARD: Партнёрский контракт
    """
    # Показываем typing пока формируем превью
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id
    await bot.send_chat_action(chat_id, ChatAction.TYPING)

    await state.set_state(OrderState.confirming)

    data = await state.get_data()

    # Определяем тип заказа для условной логики
    is_urgent = data.get("is_urgent", False)
    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value

    # Получаем скидку пользователя
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    await state.update_data(discount=discount)

    # Формируем общие данные превью
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Срок с реальной датой
    deadline_key = data.get("deadline", "")
    deadline_label = data.get("deadline_label", "Не указан")

    if deadline_key and deadline_key != "custom":
        deadline_display = get_deadline_with_date(deadline_key)
    else:
        deadline_display = deadline_label

    # Вложения — подсчитываем количество файлов
    attachments = data.get("attachments", [])
    file_count = len(attachments)

    # Извлекаем текстовый комментарий пользователя (если есть)
    user_comment = None
    for att in attachments:
        if att.get("type") == "text":
            user_comment = att.get("content", "")
            break

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO A: SPECIAL ORDER (🕵️‍♂️ Dossier Style)
    # ═══════════════════════════════════════════════════════════════
    if is_special:
        # Форматируем комментарий как цитату
        comment_block = ""
        if user_comment:
            comment_block = f"\n\n<i>«{user_comment[:200]}{'...' if len(user_comment) > 200 else ''}»</i>"

        caption = f"""📂 <b>МАТЕРИАЛЫ ДЕЛА</b>

<b>Статус:</b> 🦄 Спецзадача
<b>Дедлайн:</b> <code>{deadline_display}</code>
<b>Улики:</b> {file_count} файл(ов){comment_block}

<i>Так, я всё зафиксировал. Проверь, не упустили ли мы чего...</i>"""

        confirm_btn_text = "📮 Отправить шифровку"
        image_path = CONFIRM_SPECIAL_IMAGE_PATH

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO B: URGENT ORDER (🚀 Launch Protocol)
    # ═══════════════════════════════════════════════════════════════
    elif is_urgent:
        caption = f"""🚀 <b>ПРЕДПОЛЁТНАЯ ПРОВЕРКА</b>

✅ <b>Задача:</b> {work_label}
⏱ <b>Таймер:</b> <code>{deadline_display}</code>
📦 <b>Груз:</b> {file_count} файл(ов)

⚠️ <b>Режим:</b> ФОРСАЖ <code>(Priority High)</code>

<i>Времени в обрез. Проверь вводные беглым взглядом...</i>"""

        confirm_btn_text = "🚀 ПУСК (Отправить)"
        image_path = CONFIRM_URGENT_IMAGE_PATH

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO C: STANDARD ORDER (📄 Contract Style)
    # ═══════════════════════════════════════════════════════════════
    else:
        # Скидка показывается ТОЛЬКО для стандартных заказов
        discount_line = f"\n🎁 <b>Бонус:</b> Скидка {discount}%" if discount > 0 else ""

        caption = f"""📄 <b>ЧЕРНОВИК КОНТРАКТА</b>

📌 <b>Тип:</b> {work_label}
📅 <b>Срок:</b> <code>{deadline_display}</code>{discount_line}

<i>Проверь, всё ли верно записано...</i>"""

        confirm_btn_text = "✅ Всё верно (Отправить)"
        # Используем чеклист для черновика, НЕ рукопожатие (handshake = только для финального счёта)
        image_path = IMG_DRAFT_REVIEW if IMG_DRAFT_REVIEW.exists() else CONFIRM_STD_IMAGE_PATH

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

    keyboard = get_confirm_order_keyboard(confirm_text=confirm_btn_text)

    # Удаляем старое сообщение перед отправкой нового с фото
    if not send_new:
        try:
            await callback.message.delete()
        except Exception:
            pass

    # Пробуем отправить с картинкой
    if image_path.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=image_path,
                caption=caption,
                reply_markup=keyboard,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить confirm image: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=keyboard,
    )


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


# ═══════════════════════════════════════════════════════════════
#   RISK MATRIX: Определяет можно ли автоматически рассчитать цену
# ═══════════════════════════════════════════════════════════════

# Типы работ, безопасные для авторасчёта (простые, типовые)
SAFE_WORK_TYPES = {
    WorkType.ESSAY.value,         # Эссе
    WorkType.REPORT.value,        # Реферат
    WorkType.PRESENTATION.value,  # Презентация
    WorkType.CONTROL.value,       # Контрольная
    WorkType.INDEPENDENT.value,   # Самостоятельная
}

# Дедлайны с >= 24 часами (не срочные)
NON_URGENT_DEADLINES = {"3_days", "week", "2_weeks", "month", "custom"}


def check_auto_pay_allowed(data: dict) -> tuple[bool, list[str]]:
    """
    Risk Matrix: Проверяет можно ли автоматически выставить счёт.

    Возвращает (is_allowed, risk_factors).
    Auto-pay разрешён ТОЛЬКО если ВСЕ условия выполнены:
    1. Нет вложений (фото/файлы/голос) — has_attachments flag
    2. Тип работы в списке безопасных
    3. Дедлайн >= 24 часов (не срочный)
    4. Описание >= 20 символов — risk_short_description flag
    """
    risk_factors = []

    # 1. Проверка вложений (файлы = риск)
    # Используем флаг из state если есть, иначе проверяем attachments
    has_files = data.get("has_attachments", False)
    if not has_files:
        # Fallback: проверяем attachments напрямую
        attachments = data.get("attachments", [])
        file_attachments = [
            att for att in attachments
            if att.get("type") in ("photo", "document", "voice", "audio", "video", "video_note")
        ]
        has_files = len(file_attachments) > 0
    if has_files:
        risk_factors.append("📎 Есть файлы")

    # 2. Проверка типа работы
    work_type = data.get("work_type", "")
    is_safe_type = work_type in SAFE_WORK_TYPES
    if not is_safe_type:
        risk_factors.append("📚 Сложный тип работы")

    # 3. Проверка срочности дедлайна
    deadline_key = data.get("deadline", "week")
    is_non_urgent = deadline_key in NON_URGENT_DEADLINES
    if not is_non_urgent:
        risk_factors.append("⚡️ Срочный дедлайн")

    # 4. Проверка длины описания
    # Используем флаг из state если есть
    risk_short_description = data.get("risk_short_description", None)
    if risk_short_description is None:
        # Fallback: проверяем текст в attachments
        attachments = data.get("attachments", [])
        description_text = ""
        for att in attachments:
            if att.get("type") == "text":
                description_text = att.get("content", "")
                break
        risk_short_description = len(description_text) < 20

    if risk_short_description:
        risk_factors.append("📝 Краткое описание")

    # Auto-pay разрешён только если нет факторов риска
    is_allowed = len(risk_factors) == 0

    return is_allowed, risk_factors


@router.callback_query(OrderState.confirming, F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Подтверждение и сохранение заказа с RISK MATRIX логикой.

    Flow:
    1. Проверяем Risk Matrix → определяем GREEN или YELLOW flow
    2. GREEN FLOW (auto-pay): Показываем инвойс с кнопкой оплаты
    3. YELLOW FLOW (manual): Показываем экран "Требуется оценка шерифа"
    4. SPECIAL (other): Отправляем на ручную оценку
    """
    await callback.answer("⏳")

    data = await state.get_data()
    user_id = callback.from_user.id
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id

    # Формируем описание из вложений
    description = format_order_description(data.get("attachments", []))

    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value
    is_urgent = data.get("is_urgent", False)
    deadline_key = data.get("deadline", "week")
    discount_percent = data.get("discount", 0)

    # ═══════════════════════════════════════════════════════════════
    #   RISK MATRIX: Определяем GREEN или YELLOW flow
    # ═══════════════════════════════════════════════════════════════
    is_auto_pay_allowed, risk_factors = check_auto_pay_allowed(data)

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 1: Анимация (разные тексты для спец/обычных заказов)
    # ═══════════════════════════════════════════════════════════════

    try:
        await callback.message.delete()
    except Exception:
        pass

    if is_special:
        loading_text = "🕵️ <b>Шериф принимает спецзаказ...</b>\n\n<i>Секунду</i>"
    elif is_auto_pay_allowed:
        loading_text = "⚖️ <b>Робот считает смету...</b>\n\n<i>Секунду</i>"
    else:
        loading_text = "🛡 <b>Анализируем задачу...</b>\n\n<i>Секунду</i>"

    loading_msg = await bot.send_message(chat_id=chat_id, text=loading_text)

    # ═══════════════════════════════════════════════════════════════
    #   ГАРАНТИРОВАННАЯ ОБРАБОТКА: try-finally для loading_msg
    # ═══════════════════════════════════════════════════════════════

    order = None
    price_calc = None
    final_price = 0
    success = False

    try:
        # Небольшая задержка для эффекта
        await asyncio.sleep(1.5)

        # ═══════════════════════════════════════════════════════════════
        #   ШАГ 2: Определяем статус и цену
        # ═══════════════════════════════════════════════════════════════

        if is_special:
            # ═══ СПЕЦЗАКАЗ: ПРОПУСКАЕМ АВТОРАСЧЁТ ═══
            order_status = OrderStatus.WAITING_ESTIMATION.value
            order_price = 0  # Цена будет установлена админом вручную
        elif is_auto_pay_allowed:
            # ═══ GREEN FLOW: АВТОРАСЧЁТ ═══
            price_calc = calculate_price(
                work_type=work_type_value,
                deadline_key=deadline_key,
                discount_percent=discount_percent,
            )
            final_price = price_calc.price_after_discount if discount_percent > 0 else price_calc.final_price
            order_status = OrderStatus.WAITING_PAYMENT.value
            order_price = final_price
        else:
            # ═══ YELLOW FLOW: НУЖНА ОЦЕНКА ШЕРИФА ═══
            # Считаем предварительную цену для отображения
            price_calc = calculate_price(
                work_type=work_type_value,
                deadline_key=deadline_key,
                discount_percent=discount_percent,
            )
            final_price = price_calc.price_after_discount if discount_percent > 0 else price_calc.final_price
            order_status = OrderStatus.DRAFT.value  # Черновик до отправки на проверку
            order_price = final_price  # Предварительная цена

        order = Order(
            user_id=user_id,
            work_type=work_type_value,
            subject=data.get("subject_label") or data.get("subject"),
            topic=None,
            description=description,
            deadline=data.get("deadline_label"),
            discount=discount_percent,
            price=order_price,
            status=order_status,
        )
        session.add(order)
        await session.flush()  # Получаем ID без закрытия транзакции
        order_id = order.id    # Сохраняем ID
        logger.info(f"confirm_order: Created order #{order_id} with user_id={user_id}, auto_pay={is_auto_pay_allowed}")
        await session.commit()

        # Перезапрашиваем заказ из БД (refresh может не работать после commit)
        order_result = await session.execute(
            select(Order).where(Order.id == order_id)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise Exception(f"Order {order_id} not found after commit")
        # Проверяем что user_id сохранился правильно
        logger.info(f"confirm_order: Order #{order_id} loaded from DB with user_id={order.user_id}")

        # Валидация: убедимся что order.id валиден
        if not order.id or order.id <= 0:
            raise Exception(f"Invalid order.id={order.id} after DB load")
        if order.user_id != user_id:
            logger.error(f"CRITICAL: user_id mismatch! Expected {user_id}, got {order.user_id}")
            raise Exception(f"User ID mismatch: expected {user_id}, got {order.user_id}")

        success = True

    except Exception as e:
        logger.error(f"Критическая ошибка при создании заказа: {e}", exc_info=True)
        try:
            await bot.send_message(
                chat_id=chat_id,
                text="❌ Произошла ошибка при создании заказа. Попробуй ещё раз или напиши в поддержку.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔄 Попробовать снова", callback_data="new_order")],
                    [InlineKeyboardButton(text="💬 Поддержка", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
                ])
            )
        except Exception as send_err:
            logger.error(f"Не удалось отправить сообщение об ошибке: {send_err}")

    finally:
        # ГАРАНТИРОВАННО удаляем loading_msg
        try:
            await loading_msg.delete()
        except Exception:
            pass
        # Очищаем state ТОЛЬКО для не-DRAFT заказов
        # Для DRAFT сохраняем state до submit_for_review (нужны attachments)
        if order_status != OrderStatus.DRAFT.value:
            try:
                await state.clear()
            except Exception:
                pass

    # Если заказ не создан - выходим
    if not success or not order:
        return

    # Удаляем из трекера брошенных заказов (не критично)
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.complete_order(user_id)
    except Exception as e:
        logger.warning(f"Не удалось удалить из трекера: {e}")

    # Безопасное получение work_label
    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(work_type_value), work_type_value)
    except ValueError:
        work_label = work_type_value or "Заказ"
    deadline_label = data.get("deadline_label", "Не указан")

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 4: Логирование
    # ═══════════════════════════════════════════════════════════════

    urgent_prefix = "🚨 СРОЧНЫЙ " if is_urgent else ""
    special_prefix = "🦄 СПЕЦЗАКАЗ " if is_special else ""
    extra_data = {
        "Тип": work_label,
        "Направление": data.get("subject_label", "—"),
        "Срок": deadline_label,
        "Скидка": f"{discount_percent}%",
        "Вложений": len(data.get("attachments", [])),
    }

    if not is_special and price_calc:
        extra_data["💰 Цена"] = f"{final_price:,} ₽".replace(",", " ")
        extra_data["База"] = f"{price_calc.base_price:,} ₽".replace(",", " ")
        extra_data["Множитель"] = f"x{price_calc.urgency_multiplier}"

    # Логирование (не критично если не получится)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_CONFIRM,
            user=callback.from_user,
            details=f"{urgent_prefix}{special_prefix}Заказ #{order.id} создан",
            extra_data=extra_data,
            session=session,
            level=LogLevel.ACTION,
            silent=False,
        )
    except Exception as e:
        logger.warning(f"Не удалось залогировать заказ #{order.id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 5: Отправляем результат пользователю (GREEN/YELLOW/SPECIAL)
    # ═══════════════════════════════════════════════════════════════

    try:
        if is_special:
            # 🦄 СПЕЦЗАКАЗ — ждёт ручной оценки (авторасчёт пропущен!)
            text = f"""🕵️ <b>СПЕЦЗАКАЗ <code>#{order.id}</code> ПРИНЯТ</b>

Это задача нестандартная. Авто-калькулятор тут бессилен.

Шериф лично посмотрит требования и назовёт цену.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

⏳ <i>Жди сообщения...</i>"""

            logger.info(f"confirm_order: Creating special order keyboard with order.id={order.id}")
            keyboard = get_special_order_kb(order.id)
            image_path = CONFIRM_SPECIAL_IMAGE_PATH

        elif is_auto_pay_allowed:
            # ═══ GREEN FLOW: Автоматический инвойс (Сделка готова) ═══
            price_formatted = f"{final_price:,}".replace(",", " ")

            text = f"""⚖️ <b>СМЕТА ГОТОВА</b> | Заказ <code>#{order.id}</code>

📁 <b>Тип:</b> {work_label}
⏳ <b>Срок:</b> {deadline_label}

➖➖➖➖➖➖➖➖➖➖➖
💰 <b>К ОПЛАТЕ: {price_formatted} ₽</b>
➖➖➖➖➖➖➖➖➖➖➖

<i>Цена зафиксирована. Робот гарантирует.</i>"""

            logger.info(f"confirm_order: GREEN FLOW - invoice keyboard for order #{order.id}, price={final_price}")
            keyboard = get_invoice_keyboard(order.id, final_price)
            image_path = IMG_DEAL_READY if IMG_DEAL_READY.exists() else CONFIRM_STD_IMAGE_PATH

        else:
            # ═══ YELLOW FLOW: Требуется оценка шерифа (без цены!) ═══
            # НЕ показываем цену робота — это создаёт эффект якоря и разочарование

            text = f"""🛡 <b>ЗАКАЗ <code>#{order.id}</code> НА ПРОВЕРКЕ</b>

Задача нестандартная или срочная. Автоматический калькулятор здесь может ошибиться, поэтому Шериф оценит её лично.

📁 <b>Тип:</b> {work_label}
⏳ <b>Срок:</b> {deadline_label}

⏱ <i>Ожидай точную цену в течение 15-30 минут (в рабочее время).</i>"""

            logger.info(f"confirm_order: YELLOW FLOW - manual review for order #{order.id}, factors={risk_factors}")
            keyboard = get_manual_review_keyboard(order.id)
            image_path = IMG_UNDER_REVIEW if IMG_UNDER_REVIEW.exists() else CHECKING_PAYMENT_IMAGE_PATH

    except Exception as e:
        logger.error(f"Ошибка формирования сообщения для заказа #{order.id}: {e}")
        # Fallback на простое сообщение
        text = f"✅ <b>Заказ #{order.id} создан!</b>\n\nПодробности в разделе «Мои заказы»."
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Мои заказы", callback_data="profile_orders")],
            [InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")],
        ])
        image_path = None

    # Отправляем сообщение пользователю
    try:
        if image_path and image_path.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=chat_id,
                    photo_path=image_path,
                    caption=text,
                    reply_markup=keyboard,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить invoice image: {e}")
                await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
        else:
            await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Не удалось отправить финальное сообщение о заказе #{order.id}: {e}")
        # Fallback - хотя бы простое сообщение
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=f"✅ Заказ #{order.id} создан!\n\nПодробности в разделе «Мои заказы».",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="📋 Мои заказы", callback_data="profile_orders")],
                    [InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")],
                ])
            )
        except Exception:
            pass

    # Уведомление админам со всеми вложениями (не блокируем пользователя при ошибке)
    # Для DRAFT (YELLOW FLOW) НЕ уведомляем — это произойдёт в submit_for_review_callback
    if order.status != OrderStatus.DRAFT.value:
        try:
            await notify_admins_new_order(bot, callback.from_user, order, data)
        except Exception as e:
            logger.error(f"Ошибка уведомления админов о заказе #{order.id}: {e}")


# ══════════════════════════════════════════════════════════════
#               ОПЛАТА И ПЕРЕСЧЁТ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("pay_order:"))
async def pay_order_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Пользователь нажал 'Оплатить' — показываем реквизиты"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    logger.info(f"pay_order_callback: order_id={order_id}, user_id={callback.from_user.id}")

    # Получаем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        # Логируем для отладки
        logger.warning(f"pay_order: Order {order_id} not found for user {callback.from_user.id}")
        # Проверяем, существует ли заказ вообще
        check_query = select(Order).where(Order.id == order_id)
        check_result = await session.execute(check_query)
        check_order = check_result.scalar_one_or_none()
        if check_order:
            logger.warning(f"pay_order: Order {order_id} exists but belongs to user {check_order.user_id}, not {callback.from_user.id}")
        else:
            logger.warning(f"pay_order: Order {order_id} does not exist in database at all")
        await callback.answer("Заказ не найден", show_alert=True)
        return

    valid_statuses = [
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,  # legacy
        OrderStatus.WAITING_ESTIMATION.value
    ]
    if order.status not in valid_statuses:
        await callback.answer("Этот заказ уже нельзя оплатить", show_alert=True)
        return

    await callback.answer("💳")

    price = int(order.price)
    advance = price // 2  # 50% аванс

    # Реквизиты из конфига — чистый дизайн
    text = f"""💳 <b>ОПЛАТА ЗАКАЗА #{order.id}</b>

💰 <b>К оплате: {price:,} ₽</b>
<i>(Аванс 50%: {advance:,} ₽)</i>

<b>Реквизиты (нажми, чтобы скопировать):</b>

СБП: <code>{settings.PAYMENT_PHONE}</code>
Карта: <code>{settings.PAYMENT_CARD}</code>
Получатель: {settings.PAYMENT_NAME}

⚠️ <i>После перевода нажми кнопку ниже.</i>""".replace(",", " ")

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"confirm_payment:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❓ Вопрос по оплате",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🔙 Назад",
            callback_data=f"order_detail:{order_id}"
        )],
    ])

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("confirm_payment:"))
async def confirm_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    Пользователь нажал 'Я оплатил' — переводим в статус verification_pending.

    СТРОГО ручная проверка админом! НЕ помечаем как paid автоматически!
    """
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    logger.info(f"confirm_payment_callback: order_id={order_id}, user_id={callback.from_user.id}")

    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        # Диагностика
        check_result = await session.execute(select(Order).where(Order.id == order_id))
        check_order = check_result.scalar_one_or_none()
        if check_order:
            logger.warning(
                f"confirm_payment: Order {order_id} exists with user_id={check_order.user_id}, "
                f"but request from user_id={callback.from_user.id}"
            )
        else:
            logger.warning(f"confirm_payment: Order {order_id} does not exist at all")
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем что заказ в правильном статусе для оплаты
    valid_statuses = [
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
        OrderStatus.WAITING_ESTIMATION.value,  # Для спецзаказов после принятия предложения
    ]
    if order.status not in valid_statuses:
        await callback.answer("Этот заказ уже обрабатывается", show_alert=True)
        return

    # Если статус WAITING_ESTIMATION - меняем на WAITING_PAYMENT
    if order.status == OrderStatus.WAITING_ESTIMATION.value:
        order.status = OrderStatus.WAITING_PAYMENT.value
        await session.commit()

    await callback.answer("🕵️‍♂️ Шериф получил сигнал...")

    # ═══ ОБНОВЛЯЕМ СТАТУС НА VERIFICATION_PENDING (НЕ PAID!) ═══
    order.status = OrderStatus.VERIFICATION_PENDING.value
    await session.commit()

    # ═══ УДАЛЯЕМ СТАРОЕ СООБЩЕНИЕ (чтобы нельзя было нажать дважды) ═══
    try:
        await callback.message.delete()
    except Exception:
        pass

    # ═══ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЮ С КАРТИНКОЙ ═══
    user_text = """🕵️‍♂️ <b>Платеж на проверке</b>

Шериф получил сигнал. Мы проверяем казну вручную.

💤 <b>Если сейчас ночь</b> — подтвердим утром.
✅ <b>Твой заказ зафиксирован</b>. Не волнуйся.

<i>Как только деньги придут — бот пришлет чек.</i>"""

    # Только кнопка "В меню" — никаких лишних действий
    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔙 В меню",
            callback_data="back_to_menu"
        )],
    ])

    # Отправляем с картинкой (локальный файл)
    if CHECKING_PAYMENT_IMAGE_PATH.exists():
        try:
            photo_file = FSInputFile(CHECKING_PAYMENT_IMAGE_PATH)
            await bot.send_photo(
                chat_id=callback.message.chat.id,
                photo=photo_file,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить checking_payment image: {e}")
            await bot.send_message(
                chat_id=callback.message.chat.id,
                text=user_text,
                reply_markup=user_keyboard
            )
    else:
        # Fallback без картинки
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=user_text,
            reply_markup=user_keyboard
        )

    # ═══ УВЕДОМЛЕНИЕ АДМИНАМ С КНОПКАМИ ВЕРИФИКАЦИИ ═══
    username = callback.from_user.username
    user_link = f"@{username}" if username else f"<a href='tg://user?id={callback.from_user.id}'>Пользователь</a>"

    admin_text = f"""🔔 <b>ПРОВЕРЬ ПОСТУПЛЕНИЕ!</b>

Заказ: <code>#{order.id}</code>
Клиент: {user_link}
Сумма: <b>{int(order.price):,} ₽</b>

<i>Клиент нажал кнопку. Проверь банк.</i>""".replace(",", " ")

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить ($)",
                callback_data=f"admin_verify_paid:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject_payment:{order_id}"
            ),
        ],
    ])

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=admin_keyboard)
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@router.callback_query(F.data.startswith("recalc_order:"))
async def recalc_order_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Пользователь хочет пересчитать цену — возвращаем к выбору срока"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Ищем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status.in_([
            OrderStatus.WAITING_PAYMENT.value,
            OrderStatus.CONFIRMED.value,  # legacy
        ])
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже оплачен", show_alert=True)
        return

    # Сохраняем данные заказа в state
    work_type_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)

    await state.update_data(
        work_type=order.work_type,
        work_type_label=work_type_label,
        subject=order.subject or "",
        subject_label=order.subject or "",
        topic=order.topic or "",
        description=order.description or "",
        attachments=[],  # Файлы не переносим
    )

    # Удаляем заказ (он ещё не оплачен)
    await session.delete(order)
    await session.commit()

    await callback.answer("🔄 Выбери новый срок!")

    # Переходим к выбору срока
    await state.set_state(OrderState.choosing_deadline)

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Удаляем старое сообщение и отправляем новое
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=callback.bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback на текст
    await callback.bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


@router.callback_query(F.data.startswith("submit_for_review:"))
async def submit_for_review_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    YELLOW FLOW: Пользователь отправляет заказ на проверку шерифом.
    Меняет статус с DRAFT на WAITING_ESTIMATION и уведомляет админов.

    Включает загрузку на Яндекс Диск и отправку файлов админам.
    """
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Ищем заказ в статусе DRAFT
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status == OrderStatus.DRAFT.value
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже отправлен", show_alert=True)
        return

    # Получаем данные из state (сохранены при создании DRAFT)
    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Меняем статус на WAITING_ESTIMATION
    order.status = OrderStatus.WAITING_ESTIMATION.value
    await session.commit()

    await callback.answer("🤠 Заказ отправлен шерифу!")

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Показываем подтверждение пользователю
    text = f"""🛡 <b>ЗАКАЗ <code>#{order.id}</code> НА ПРОВЕРКЕ</b>

Шериф лично посмотрит твою задачу и назовёт точную цену.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

⏳ <i>Жди сообщения с ценой...</i>"""

    keyboard = get_special_order_kb(order.id)

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=text,
        reply_markup=keyboard,
    )

    # ═══════════════════════════════════════════════════════════════
    #   ЗАГРУЗКА НА ЯНДЕКС ДИСК
    # ═══════════════════════════════════════════════════════════════
    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except ValueError:
        work_label = order.work_type or "Заказ"

    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and attachments:
        try:
            files_to_upload = []
            file_counter = 1

            for att in attachments:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    if att_type == "document":
                        filename = att.get("file_name", f"document_{file_counter}")
                    elif att_type == "photo":
                        filename = f"photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"audio_{file_counter}.mp3"
                    else:
                        filename = f"file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1
                except Exception as e:
                    logger.warning(f"Failed to download file from Telegram: {e}")
                    continue

            if files_to_upload:
                client_name = callback.from_user.full_name or f"User_{callback.from_user.id}"
                result = await yandex_disk_service.upload_multiple_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type=work_label,
                    telegram_id=callback.from_user.id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Order #{order.id} files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading to Yandex Disk: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   УВЕДОМЛЕНИЕ АДМИНОВ
    # ═══════════════════════════════════════════════════════════════
    estimated_price = f"{order.price:,}".replace(",", " ") if order.price > 0 else "—"
    username_str = f"@{callback.from_user.username}" if callback.from_user.username else "без username"

    # Строка с ссылкой на Яндекс Диск
    yadisk_line = f"\n📁 <b>Файлы:</b> <a href=\"{yadisk_link}\">Яндекс Диск</a>" if yadisk_link else ""

    admin_text = f"""🛡 <b>ТРЕБУЕТ ОЦЕНКИ</b> | Заказ <code>#{order.id}</code>

👤 <b>Клиент:</b> {callback.from_user.full_name} ({username_str})
🆔 <code>{callback.from_user.id}</code>

📁 <b>Тип:</b> {work_label}
📚 <b>Направление:</b> {order.subject or "—"}
⏳ <b>Срок:</b> {order.deadline or "—"}

🤖 <b>Робот насчитал:</b> ~{estimated_price} ₽
<i>Но клиент отправил на ручную проверку.</i>{yadisk_line}

📝 <b>Описание:</b>
<i>{order.description[:500] if order.description else "—"}{'...' if order.description and len(order.description) > 500 else ''}</i>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"✅ Подтвердить ~{estimated_price}₽",
                callback_data=f"admin_confirm_robot_price:{order.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="✏️ Своя цена",
                callback_data=f"admin_set_price:{order.id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject_order:{order.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать клиенту",
                url=f"tg://user?id={callback.from_user.id}"
            ),
        ],
    ])

    # Отправляем уведомление каждому админу
    for admin_id in settings.ADMIN_IDS:
        try:
            # Сначала текст с кнопками
            await bot.send_message(
                chat_id=admin_id,
                text=admin_text,
                reply_markup=admin_keyboard,
            )

            # Затем все вложения (файлы)
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
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   ОЧИСТКА STATE (теперь можно, заказ отправлен)
    # ═══════════════════════════════════════════════════════════════
    try:
        await state.clear()
    except Exception:
        pass


@router.callback_query(F.data.startswith("edit_order_data:"))
async def edit_order_data_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Пользователь хочет изменить данные заказа — удаляем и начинаем заново"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Ищем заказ с валидным статусом для редактирования
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status.in_([
            OrderStatus.DRAFT.value,           # YELLOW FLOW (до отправки на проверку)
            OrderStatus.WAITING_PAYMENT.value,
            OrderStatus.CONFIRMED.value,  # legacy
        ])
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже оплачен", show_alert=True)
        return

    # Удаляем заказ (он ещё не оплачен)
    await session.delete(order)
    await session.commit()

    await callback.answer("✏️ Давай заполним заново!")

    # Сбрасываем состояние и начинаем заново
    await state.clear()

    # Перенаправляем на создание нового заказа
    from bot.handlers.orders import start_order
    await start_order(callback, state, callback.bot, session)


@router.callback_query(F.data.startswith("cancel_confirmed_order:"))
async def cancel_confirmed_order_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Отмена подтверждённого заказа (до оплаты)"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Можно отменить только неоплаченные заказы
    cancelable = [
        OrderStatus.DRAFT.value,              # YELLOW FLOW (до отправки на проверку)
        OrderStatus.PENDING.value,
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,  # legacy
        OrderStatus.WAITING_ESTIMATION.value
    ]
    if order.status not in cancelable:
        await callback.answer("Этот заказ уже нельзя отменить", show_alert=True)
        return

    # Отменяем
    order.status = OrderStatus.CANCELLED.value
    await session.commit()

    await callback.answer("❌ Заказ отменён")

    text = f"""❌ <b>Заказ #{order.id} отменён</b>

Жаль, что не сложилось. Но двери салуна всегда открыты.
Возвращайся, когда понадобится помощь. 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📝 Новый заказ",
            callback_data="create_order"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#               POST-ORDER: APPEND FILES
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("add_files_to_order:"))
async def add_files_to_order_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Пользователь хочет дослать файлы к заказу"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Проверяем что заказ существует и принадлежит пользователю
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Проверяем статус заказа — можно дослать только в ожидающие заказы
    allowed_statuses = [
        OrderStatus.PENDING.value,
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
        OrderStatus.WAITING_ESTIMATION.value,  # Для спецзаказов
    ]
    if order.status not in allowed_statuses:
        await callback.answer("К этому заказу уже нельзя добавить файлы", show_alert=True)
        return

    await callback.answer("📎 Жду!")

    # Сохраняем order_id и переводим в состояние дослать
    await state.update_data(append_order_id=order_id, appended_files=[])
    await state.set_state(OrderState.appending_files)

    # DEBUG: проверяем что state установлен
    check_state = await state.get_state()
    logger.info(f"add_files_to_order: set state to {check_state}, order_id={order_id}")

    # Используем новую функцию для форматирования
    text = format_append_status_message([], order_id)
    keyboard = get_append_files_keyboard(order_id, files_count=0)

    # Удаляем старое сообщение и отправляем новое
    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    await callback.bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)


@router.message(OrderState.appending_files)
async def append_file_universal(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Универсальный handler для всех типов файлов в append flow.
    Поддерживает: фото, документы, голосовые, текст, видео, аудио.
    Поддерживает media_group (альбомы).
    """
    # DEBUG: логируем что хендлер сработал
    current_state = await state.get_state()
    logger.info(f"append_file_universal triggered! State: {current_state}, Message type: photo={bool(message.photo)}, doc={bool(message.document)}")

    # Intercept /start command
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    appended_files = data.get("appended_files", [])
    order_id = data.get("append_order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден")
        await state.clear()
        return

    # Проверка лимита
    if len(appended_files) >= MAX_APPEND_FILES:
        await message.answer(
            f"⚠️ Максимум {MAX_APPEND_FILES} файлов.\n"
            "Жми «Отправить» чтобы продолжить.",
            reply_markup=get_append_files_keyboard(order_id, files_count=len(appended_files))
        )
        return

    # Определяем тип контента
    attachment = None
    file_id = None

    if message.text:
        attachment = {"type": "text", "content": message.text}
    elif message.photo:
        photo = message.photo[-1]
        file_id = photo.file_id
        attachment = {
            "type": "photo",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        file_id = message.document.file_id
        attachment = {
            "type": "document",
            "file_id": file_id,
            "file_name": message.document.file_name or "файл",
            "caption": message.caption or "",
        }
    elif message.voice:
        file_id = message.voice.file_id
        attachment = {
            "type": "voice",
            "file_id": file_id,
            "duration": message.voice.duration,
        }
    elif message.video:
        file_id = message.video.file_id
        attachment = {
            "type": "video",
            "file_id": file_id,
            "caption": message.caption or "",
        }
    elif message.audio:
        file_id = message.audio.file_id
        attachment = {
            "type": "audio",
            "file_id": file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video_note:
        file_id = message.video_note.file_id
        attachment = {"type": "video_note", "file_id": file_id}

    if not attachment:
        await message.answer("🤔 Этот тип контента не поддерживается")
        return

    # Защита от дублей
    if file_id:
        existing_ids = {f.get("file_id") for f in appended_files if f.get("file_id")}
        if file_id in existing_ids:
            await message.answer(
                "☝️ Этот файл уже добавлен!",
                reply_markup=get_append_files_keyboard(order_id, files_count=len(appended_files))
            )
            return

    # Обработка media_group (альбомов)
    media_group_id = message.media_group_id

    if media_group_id:
        # Media group — собираем файлы и отвечаем один раз
        async def on_append_media_group_complete(
            files: list,
            chat_id: int,
            order_id: int,
            fsm_state: FSMContext,
        ):
            """Callback когда все файлы альбома получены"""
            current_data = await fsm_state.get_data()
            current_files = current_data.get("appended_files", [])

            # Добавляем все файлы (с проверкой на дубли и лимит)
            added = 0
            for f in files:
                if len(current_files) >= MAX_APPEND_FILES:
                    break
                f_id = f.get("file_id")
                if f_id:
                    existing_ids = {att.get("file_id") for att in current_files if att.get("file_id")}
                    if f_id in existing_ids:
                        continue
                current_files.append(f)
                added += 1

            await fsm_state.update_data(appended_files=current_files)

            # Формируем сообщение
            total_count = len(current_files)
            summary = get_files_summary(files)
            progress = get_progress_bar(total_count, MAX_APPEND_FILES)

            text = f"""📥 <b>Принял {added} файлов!</b>

{summary}

{progress}"""

            if total_count >= MAX_APPEND_FILES:
                text += "\n\n✓ Лимит — жми «Отправить»"

            await bot.send_message(
                chat_id,
                text,
                reply_markup=get_append_files_keyboard(order_id, files_count=total_count)
            )

        await handle_media_group_file(
            media_group_id=media_group_id,
            file_info=attachment,
            on_complete=on_append_media_group_complete,
            chat_id=message.chat.id,
            order_id=order_id,
            fsm_state=state,
        )
    else:
        # Одиночный файл — сохраняем и отвечаем сразу
        appended_files.append(attachment)
        await state.update_data(appended_files=appended_files)

        total_count = len(appended_files)
        confirm_text = get_append_confirm_text(attachment, total_count, order_id)

        await message.answer(
            confirm_text,
            reply_markup=get_append_files_keyboard(order_id, files_count=total_count)
        )


@router.callback_query(F.data.startswith("finish_append:"))
async def finish_append_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Завершить дослать — отправить админам"""
    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    # Берём order_id из STATE (более надёжно, защита от race condition)
    order_id = data.get("append_order_id")

    # Fallback на callback.data если в state нет
    if not order_id:
        try:
            order_id = int(callback.data.split(":")[1])
        except (IndexError, ValueError):
            await callback.answer("Ошибка данных", show_alert=True)
            await state.clear()
            return

    if not appended_files:
        await callback.answer("Ты ещё ничего не отправил!", show_alert=True)
        return

    # Находим заказ С ПРОВЕРКОЙ ВЛАДЕЛЬЦА
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id  # Защита: только владелец
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        await state.clear()
        return

    await callback.answer("✅ Отправляю!")
    await state.clear()

    # ═══════════════════════════════════════════════════════════════
    #   БЫСТРЫЙ ОТВЕТ ПОЛЬЗОВАТЕЛЮ (до загрузки на Яндекс.Диск!)
    # ═══════════════════════════════════════════════════════════════
    client_text = f"""✅ <b>Материалы отправлены!</b>

К заказу <code>#{order.id}</code> добавлено: {len(appended_files)} файл(ов).

Шериф уже в курсе. 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="👀 Статус заказа",
            callback_data=f"order_detail:{order.id}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    await callback.message.edit_text(client_text, reply_markup=keyboard)

    # ═══════════════════════════════════════════════════════════════
    #   Загрузка дополнительных файлов на Яндекс Диск (после ответа)
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and appended_files:
        try:
            files_to_upload = []
            file_counter = 1

            for att in appended_files:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    # Скачиваем файл из Telegram
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    # Определяем имя файла (добавляем prefix "доп_")
                    if att_type == "document":
                        filename = f"доп_{att.get('file_name', f'document_{file_counter}')}"
                    elif att_type == "photo":
                        filename = f"доп_photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"доп_voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"доп_video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"доп_video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"доп_audio_{file_counter}.mp3"
                    else:
                        filename = f"доп_file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1

                except Exception as e:
                    logger.warning(f"Failed to download appended file from Telegram: {e}")
                    continue

            # Загружаем файлы на Яндекс Диск в подпапку "Дополнительно"
            if files_to_upload:
                client_name = callback.from_user.full_name or f"User_{callback.from_user.id}"
                work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)

                result = await yandex_disk_service.upload_append_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type=work_label,
                    telegram_id=callback.from_user.id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Order #{order.id} appended files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading appended files to Yandex Disk: {e}")

    # Строка с Яндекс Диском для админов
    yadisk_line = f"\n📁 Яндекс Диск: <a href=\"{yadisk_link}\">Открыть папку</a>" if yadisk_link else ""

    # Уведомляем админов
    admin_text = f"""📎 <b>Клиент дослал материалы!</b>

📋 Заказ: #{order.id}
👤 Клиент: @{callback.from_user.username or 'без username'}
📦 Файлов: {len(appended_files)}{yadisk_line}"""

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text)

            # Пересылаем все файлы
            for file_data in appended_files:
                file_type = file_data.get("type")
                try:
                    if file_type == "photo":
                        await bot.send_photo(
                            admin_id,
                            file_data["file_id"],
                            caption=file_data.get("caption") or f"[К заказу #{order.id}]"
                        )
                    elif file_type == "document":
                        await bot.send_document(
                            admin_id,
                            file_data["file_id"],
                            caption=file_data.get("caption") or f"[К заказу #{order.id}]"
                        )
                    elif file_type == "voice":
                        await bot.send_voice(
                            admin_id,
                            file_data["file_id"],
                            caption=f"[К заказу #{order.id}]"
                        )
                    elif file_type == "text":
                        await bot.send_message(
                            admin_id,
                            f"📝 <b>Текст к заказу #{order.id}:</b>\n\n{file_data.get('content', '')}"
                        )
                except Exception as e:
                    logger.warning(f"Не удалось отправить файл админу {admin_id}: {e}")
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@router.callback_query(F.data.startswith("cancel_append:"))
async def cancel_append_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Отменить дослать"""
    data = await state.get_data()

    # Берём order_id из STATE (защита от race condition)
    order_id = data.get("append_order_id")

    # Fallback на callback.data
    if not order_id:
        try:
            order_id = int(callback.data.split(":")[1])
        except (IndexError, ValueError):
            await callback.answer("Ошибка данных", show_alert=True)
            await state.clear()
            return

    await state.clear()
    await callback.answer("Отменено")

    # Возвращаем к статусу заказа С ПРОВЕРКОЙ ВЛАДЕЛЬЦА
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id  # Защита: только владелец
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if order:
        text = f"""📋 <b>Заказ #{order.id}</b>

Дослать файлы отменено."""

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📎 Забыл файл? (Дослать)",
                callback_data=f"add_files_to_order:{order.id}"
            )],
            [InlineKeyboardButton(
                text="👀 Статус заказа",
                callback_data=f"order_detail:{order.id}"
            )],
            [InlineKeyboardButton(
                text="🌵 В салун",
                callback_data="back_to_menu"
            )],
        ])

        await callback.message.edit_text(text, reply_markup=keyboard)
    else:
        await callback.message.edit_text("Заказ не найден")


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
async def back_to_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Назад к выбору типа работы.
    Возвращает в родительскую категорию, а не в корневое меню.
    """
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)

    # Проверяем, из какой категории был выбран тип работы
    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    # Определяем категорию по типу работы
    SMALL_WORK_TYPES = {
        WorkType.CONTROL.value,
        WorkType.ESSAY.value,
        WorkType.REPORT.value,
        WorkType.PRESENTATION.value,
        WorkType.INDEPENDENT.value,
    }

    MEDIUM_WORK_TYPES = {
        WorkType.COURSEWORK.value,
        WorkType.PRACTICE.value,
    }

    LARGE_WORK_TYPES = {
        WorkType.DIPLOMA.value,
        WorkType.MASTERS.value,
    }

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Для мелких работ — показываем список мелких работ
    if work_type_value in SMALL_WORK_TYPES:
        caption = """⚡️ <b>Быстрые задачи</b>

Закроем долги по мелочи, пока ты занимаешься важными делами.
Обычно сдаём за 1-3 дня.

<i>Выбирай, что нужно закрыть:</i> 👇"""

        if SMALL_TASKS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=SMALL_TASKS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_small_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_small_works_keyboard(),
        )
        return

    # Для курсовых/практик — показываем список курсовых
    if work_type_value in MEDIUM_WORK_TYPES:
        caption = """📚 <b>Курсовые и Практика</b>

Серьёзная работа для серьёзных людей.
Теория или практика — нам без разницы.

<i>Что пишем?</i> 👇"""

        if KURS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=KURS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_medium_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_medium_works_keyboard(),
        )
        return

    # Для дипломов — показываем список дипломов
    if work_type_value in LARGE_WORK_TYPES:
        caption = """🏆 <b>Большой куш</b>

Главная битва за твою свободу. Ставки высоки.
Мы сделаем чисто: комар носу не подточит.

<i>Выбирай калибр:</i> 👇"""

        if DIPLOMA_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=DIPLOMA_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_large_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_large_works_keyboard(),
        )
        return

    # Для остальных (other, urgent) — корневое меню категорий
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n\n🎁 Твоя скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Партнер, выбирай калибр задачи. Справимся с любой — от эссе на салфетке до диплома в твердом переплете.{discount_line}"""

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


@router.callback_query(F.data == "order_back_to_subject")
async def back_to_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Назад к выбору направления.
    Для мелких работ — сразу к выбору типа.
    """
    await callback.answer("⏳")

    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    # Для мелких работ (не требующих направления) — возврат к типу
    if work_type and work_type not in WORKS_REQUIRE_SUBJECT:
        await back_to_type(callback, state, session, bot)
        return

    # Для крупных — показываем выбор направления
    await state.set_state(OrderState.choosing_subject)

    caption = """🎯 <b>Выбирай мишень</b>

В какой сфере проблема, ковбой?
Укажи тему, чтобы я знал, какого специалиста поднимать с постели."""

    # Удаляем старое (может быть фото)
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем с фото если есть
    if DIRECTIONS_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DIRECTIONS_IMAGE_PATH,
                caption=caption,
                reply_markup=get_subject_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_subject_keyboard()
    )


@router.callback_query(F.data == "order_back_to_task")
async def back_to_task(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Назад к вводу задания"""
    await callback.answer("⏳")
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
        count = len(attachments)
        progress = get_progress_bar(count, MAX_ATTACHMENTS)
        text = f"""📎 <b>Материалы</b>

{preview}

{progress}

<i>Ещё или жми «Готово»</i>"""
        await safe_edit_or_send(callback, text, reply_markup=get_task_continue_keyboard(files_count=count), bot=bot)
    else:
        await show_task_input_screen(callback.message, work_type=work_type)


@router.callback_query(OrderState.confirming, F.data == "order_edit")
async def edit_order(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Редактирование заказа — выбор что изменить"""
    await callback.answer("⏳")

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

    await safe_edit_or_send(callback, text, reply_markup=get_edit_order_keyboard(show_subject=show_subject), bot=bot)


@router.callback_query(F.data == "back_to_confirm")
async def back_to_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Назад к подтверждению"""
    await callback.answer("⏳")
    await show_order_confirmation(callback, state, bot, session)


@router.callback_query(F.data == "edit_type")
async def edit_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Изменить тип работы"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)
    await back_to_type(callback, state, session, bot)


@router.callback_query(F.data == "edit_subject")
async def edit_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Изменить направление"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_subject)
    await back_to_subject(callback, state, session, bot)


@router.callback_query(F.data == "edit_task")
async def edit_task(callback: CallbackQuery, state: FSMContext):
    """Изменить задание — очищаем вложения"""
    await callback.answer("⏳")

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
async def edit_deadline(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Изменить сроки"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_deadline)

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Удаляем старое и отправляем с фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


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

    # Удаляем старое сообщение и отправляем с картинкой (с кэшированием file_id)
    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=settings.CANCEL_IMAGE,
        caption="🌵  <b>Отбой тревоги</b>\n\n"
                "Понял-принял.\n"
                "Не сегодня — значит не сегодня.\n\n"
                "Заходи, когда созреешь — я тут всегда.",
        reply_markup=get_cancel_complete_keyboard()
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

    # Определяем, спецзаказ ли это
    is_special = data.get("work_type") == WorkType.OTHER.value

    attachments = data.get("attachments", [])

    # ═══════════════════════════════════════════════════════════════
    #   Загрузка файлов на Яндекс Диск
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and attachments:
        try:
            # Скачиваем файлы из Telegram и загружаем на Яндекс Диск
            files_to_upload = []
            file_counter = 1

            for att in attachments:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    # Скачиваем файл из Telegram
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    # Определяем имя файла
                    if att_type == "document":
                        filename = att.get("file_name", f"document_{file_counter}")
                    elif att_type == "photo":
                        filename = f"photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"audio_{file_counter}.mp3"
                    else:
                        filename = f"file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1

                except Exception as e:
                    logger.warning(f"Failed to download file from Telegram: {e}")
                    continue

            # Загружаем все файлы на Яндекс Диск
            if files_to_upload:
                client_name = user.full_name or f"User_{user.id}"
                result = await yandex_disk_service.upload_multiple_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type=work_label,
                    telegram_id=user.id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Order #{order.id} files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading to Yandex Disk: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   Формируем текст уведомления
    # ═══════════════════════════════════════════════════════════════

    # Разный заголовок для срочных/спец/обычных заказов
    if is_special:
        header = f"""💀💀💀  <b>СПЕЦЗАКАЗ #{order.id}</b>  💀💀💀

⚠️ <b>ЦЕНУ НУЖНО ВЫСТАВИТЬ ВРУЧНУЮ!</b>"""
    elif is_urgent:
        header = f"""🚨🚨🚨  <b>СРОЧНАЯ ЗАЯВКА #{order.id}</b>  🚨🚨🚨

⚡ <b>ТРЕБУЕТ БЫСТРОГО ОТВЕТА!</b>"""
    else:
        header = f"""🆕  <b>Новая заявка #{order.id}</b>"""

    # Строка с ссылкой на Яндекс Диск
    yadisk_line = f"\n📁 <b>Файлы:</b> <a href=\"{yadisk_link}\">Яндекс Диск</a>\n" if yadisk_link else ""

    text = f"""{header}

◈  Клиент: {user.full_name} ({username_str})
◈  ID: <code>{user.id}</code>

◈  Тип: {work_label}
◈  Направление: {subject_label}
◈  Срок: {data.get('deadline_label', '—')}
{urgent_line}{discount_line}{yadisk_line}"""

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

Или нажми /start и выбери «📝 Оформить заказ»"""
        await message.answer(text)
        return

    await state.clear()
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[])

    text = """🎯 <b>Оформление заказа</b>

Партнер, выбирай калибр задачи. Справимся с любой — от эссе на салфетке до диплома в твердом переплете."""

    await message.answer(text, reply_markup=get_work_category_keyboard())


# ══════════════════════════════════════════════════════════════
#               P2P PAYMENT: RECEIPT HANDLER
# ══════════════════════════════════════════════════════════════

@router.message(OrderState.waiting_for_receipt, F.photo)
async def receive_payment_receipt(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Получен скриншот чека — пересылаем админам для проверки"""
    data = await state.get_data()
    order_id = data.get("receipt_order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден. Попробуй ещё раз.")
        await state.clear()
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer("❌ Заказ не найден")
        await state.clear()
        return

    # Проверяем что заказ ещё не оплачен
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await message.answer("✅ Этот заказ уже оплачен!")
        await state.clear()
        return

    # Очищаем состояние
    await state.clear()

    # Отправляем подтверждение клиенту
    client_text = f"""✅ <b>Чек получен!</b>

Заказ #{order.id} · {order.price:.0f}₽

⏳ Проверяю оплату, обычно пара минут.
Напишу сразу как увижу перевод! 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Написать в поддержку",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )]
    ])

    await message.answer(client_text, reply_markup=keyboard)

    # Пересылаем чек админам с кнопками подтверждения
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    admin_caption = f"""📸 <b>Получен чек об оплате!</b>

📋 Заказ: #{order.id}
📝 {work_label}
💰 Сумма: {order.price:.0f}₽

👤 Клиент: @{message.from_user.username or 'без username'}
🆔 ID: <code>{message.from_user.id}</code>"""

    # Клавиатура с кнопками подтверждения (для админа)
    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить",
                callback_data=f"admin_confirm_payment:{order.id}"
            ),
            InlineKeyboardButton(
                text="❌ Не пришло",
                callback_data=f"reject_payment:{order.id}:{message.from_user.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать клиенту",
                url=f"tg://user?id={message.from_user.id}"
            )
        ],
    ])

    # Отправляем фото чека всем админам
    photo = message.photo[-1]  # Берём самое большое качество
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_photo(
                chat_id=admin_id,
                photo=photo.file_id,
                caption=admin_caption,
                reply_markup=admin_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить чек админу {admin_id}: {e}")


@router.message(OrderState.waiting_for_receipt, F.document)
async def receive_payment_receipt_document(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Получен документ (PDF чека) — пересылаем админам"""
    data = await state.get_data()
    order_id = data.get("receipt_order_id")

    if not order_id:
        await message.answer("❌ Ошибка: заказ не найден. Попробуй ещё раз.")
        await state.clear()
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer("❌ Заказ не найден")
        await state.clear()
        return

    # Проверяем что заказ ещё не оплачен
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await message.answer("✅ Этот заказ уже оплачен!")
        await state.clear()
        return

    # Очищаем состояние
    await state.clear()

    # Отправляем подтверждение клиенту
    client_text = f"""✅ <b>Чек получен!</b>

Заказ #{order.id} · {order.price:.0f}₽

⏳ Проверяю оплату, обычно пара минут.
Напишу сразу как увижу перевод! 🤠"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Написать в поддержку",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )]
    ])

    await message.answer(client_text, reply_markup=keyboard)

    # Пересылаем документ админам
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"

    admin_caption = f"""📄 <b>Получен чек об оплате!</b>

📋 Заказ: #{order.id}
📝 {work_label}
💰 Сумма: {order.price:.0f}₽

👤 Клиент: @{message.from_user.username or 'без username'}
🆔 ID: <code>{message.from_user.id}</code>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить",
                callback_data=f"admin_confirm_payment:{order.id}"
            ),
            InlineKeyboardButton(
                text="❌ Не пришло",
                callback_data=f"reject_payment:{order.id}:{message.from_user.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать клиенту",
                url=f"tg://user?id={message.from_user.id}"
            )
        ],
    ])

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_document(
                chat_id=admin_id,
                document=message.document.file_id,
                caption=admin_caption,
                reply_markup=admin_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить документ админу {admin_id}: {e}")


@router.message(OrderState.waiting_for_receipt)
async def waiting_for_receipt_invalid(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Пользователь отправил что-то кроме фото/документа"""
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    await message.answer(
        "📸 <b>Жду скриншот чека!</b>\n\n"
        "Пожалуйста, отправь фото или файл с чеком об оплате."
    )


# ═══════════════════════════════════════════════════════════════════════════════
#                           PANIC FLOW — СРОЧНЫЙ ЗАКАЗ "ГОРИТ!"
# ═══════════════════════════════════════════════════════════════════════════════

# Маппинг срочности на множитель и метку
PANIC_URGENCY_MAP = {
    "critical": {"multiplier": 1.5, "label": "🚀 Нужно вчера", "tag": "+50%"},
    "high": {"multiplier": 1.3, "label": "🔥 Сдать завтра", "tag": "+30%"},
    "medium": {"multiplier": 1.15, "label": "🏎 Турбо (2-3 дня)", "tag": "+15%"},
}


async def start_panic_flow(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Запуск Panic Flow — вспомогательная функция.
    Вызывается из разных мест: work_category:urgent, quick_order:other
    """
    # Устанавливаем состояние Panic Flow
    await state.set_state(PanicState.choosing_urgency)
    await state.update_data(
        panic_files=[],
        panic_urgency=None,
    )

    caption = """🔥 <b>РЕЖИМ ПАНИКИ</b>

Понял, горит! Сейчас разберёмся.

<b>Выбери степень огнеопасности:</b>

🚀 <b>Нужно вчера</b> — работаем ночью, цена x1.5
🔥 <b>Сдать завтра</b> — приоритетная очередь, x1.3
🏎 <b>Турбо</b> — 2-3 дня, ускорение x1.15"""

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем с фото если есть
    if URGENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=URGENT_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_urgency_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_panic_urgency_keyboard(),
    )


@router.callback_query(F.data == "panic_mode")
async def panic_mode_entry(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Точка входа в Panic Flow — кнопка "СРОЧНО! ГОРИТ!" из меню.
    """
    await callback.answer("🔥")
    await start_panic_flow(callback, state, bot)


@router.callback_query(PanicState.choosing_urgency, F.data.startswith("panic_urgency:"))
async def panic_urgency_selected(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Выбрана срочность — переходим к загрузке файлов.
    """
    await callback.answer("⚡")

    urgency_key = callback.data.split(":")[1]
    urgency_info = PANIC_URGENCY_MAP.get(urgency_key, PANIC_URGENCY_MAP["medium"])

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_info["label"]}</b> ({urgency_info["tag"]})

Кидай сюда всё сразу: методички, скрины, голосовые. Я разберусь.

<i>✅ Принято: 0 файлов</i>"""

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем сообщение и сохраняем его ID для редактирования
    sent_msg = None
    if FAST_UPLOAD_IMAGE_PATH.exists():
        try:
            sent_msg = await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=FAST_UPLOAD_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_upload_keyboard(has_files=False),
            )
        except Exception:
            pass

    if not sent_msg:
        sent_msg = await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_panic_upload_keyboard(has_files=False),
        )

    # Сохраняем message_id для последующего редактирования
    await state.update_data(
        panic_urgency=urgency_key,
        panic_multiplier=urgency_info["multiplier"],
        panic_urgency_label=urgency_info["label"],
        panic_upload_msg_id=sent_msg.message_id if sent_msg else None,
        panic_chat_id=callback.message.chat.id,
    )
    await state.set_state(PanicState.uploading_files)


@router.message(PanicState.uploading_files)
async def panic_file_received(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Получен файл/фото/текст/голос — добавляем в список.
    Поддерживает media_group (альбомы).
    """
    # Intercept /start command
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    upload_msg_id = data.get("panic_upload_msg_id")
    chat_id = data.get("panic_chat_id", message.chat.id)
    urgency_label = data.get("panic_urgency_label", "🏎 Турбо")

    # Определяем тип вложения
    attachment = None

    if message.photo:
        photo = message.photo[-1]
        attachment = {
            "type": "photo",
            "file_id": photo.file_id,
            "caption": message.caption or "",
        }
    elif message.document:
        attachment = {
            "type": "document",
            "file_id": message.document.file_id,
            "file_name": message.document.file_name or "документ",
            "caption": message.caption or "",
        }
    elif message.voice:
        attachment = {
            "type": "voice",
            "file_id": message.voice.file_id,
            "duration": message.voice.duration,
        }
    elif message.audio:
        attachment = {
            "type": "audio",
            "file_id": message.audio.file_id,
            "file_name": message.audio.file_name or "аудио",
        }
    elif message.video:
        attachment = {
            "type": "video",
            "file_id": message.video.file_id,
            "caption": message.caption or "",
        }
    elif message.video_note:
        attachment = {
            "type": "video_note",
            "file_id": message.video_note.file_id,
        }
    elif message.text:
        attachment = {
            "type": "text",
            "content": message.text,
        }

    if not attachment:
        return

    # Проверяем media_group (альбом)
    media_group_id = message.media_group_id

    if media_group_id:
        # Часть альбома — собираем через коллектор
        async def on_panic_media_group_complete(files: list, **kwargs):
            """Callback когда все файлы альбома собраны"""
            fsm_state = kwargs.get("fsm_state")
            mg_chat_id = kwargs.get("chat_id")
            if not fsm_state or not mg_chat_id:
                logger.warning(f"Missing fsm_state or chat_id in media group callback: {kwargs}")
                return

            current_data = await fsm_state.get_data()
            panic_files = current_data.get("panic_files", [])
            ul_msg_id = current_data.get("panic_upload_msg_id")
            urg_label = current_data.get("panic_urgency_label", "🏎 Турбо")

            # Добавляем все файлы из альбома
            for f in files:
                f_id = f.get("file_id")
                if f_id:
                    existing_ids = {att.get("file_id") for att in panic_files if att.get("file_id")}
                    if f_id in existing_ids:
                        continue
                panic_files.append(f)

            await fsm_state.update_data(panic_files=panic_files)
            logger.info(f"Media group complete: {len(files)} files added, total: {len(panic_files)}")

            # Обновляем UI
            await update_panic_upload_ui(bot, mg_chat_id, ul_msg_id, panic_files, urg_label)

        await handle_media_group_file(
            media_group_id=media_group_id,
            file_info=attachment,
            on_complete=on_panic_media_group_complete,
            chat_id=message.chat.id,
            fsm_state=state,
        )
    else:
        # Одиночный файл
        panic_files = data.get("panic_files", [])
        panic_files.append(attachment)
        await state.update_data(panic_files=panic_files)

        await update_panic_upload_ui(bot, chat_id, upload_msg_id, panic_files, urgency_label)


async def update_panic_upload_ui(bot: Bot, chat_id: int, msg_id: int, panic_files: list, urgency_label: str):
    """Вспомогательная функция для обновления UI загрузки"""
    files_count = len(panic_files)

    # Считаем типы
    photos = sum(1 for f in panic_files if f.get("type") == "photo")
    docs = sum(1 for f in panic_files if f.get("type") == "document")
    voices = sum(1 for f in panic_files if f.get("type") in ("voice", "audio"))
    texts = sum(1 for f in panic_files if f.get("type") == "text")
    videos = sum(1 for f in panic_files if f.get("type") in ("video", "video_note"))

    summary_parts = []
    if photos:
        summary_parts.append(f"{photos} фото")
    if docs:
        summary_parts.append(f"{docs} файл(ов)")
    if voices:
        summary_parts.append(f"{voices} голосовых")
    if texts:
        summary_parts.append(f"{texts} сообщений")
    if videos:
        summary_parts.append(f"{videos} видео")

    summary = ", ".join(summary_parts) if summary_parts else "0 файлов"

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_label}</b>

Кидай сюда всё сразу: методички, скрины, голосовые. Я разберусь.

<i>✅ Принято: {summary}</i>"""

    # Пытаемся отредактировать существующее сообщение
    if msg_id:
        try:
            await bot.edit_message_caption(
                chat_id=chat_id,
                message_id=msg_id,
                caption=caption,
                reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
            )
            return
        except Exception:
            try:
                await bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=msg_id,
                    text=caption,
                    reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
                )
                return
            except Exception:
                pass

    # Fallback: новое сообщение
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=get_panic_upload_keyboard(has_files=files_count > 0),
    )


@router.callback_query(PanicState.uploading_files, F.data == "panic_submit")
async def panic_submit_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Отправка срочного заказа — создаём заявку и уведомляем админа.
    """
    await callback.answer("🚀 Запускаем!")

    data = await state.get_data()
    panic_files = data.get("panic_files", [])
    urgency_key = data.get("panic_urgency", "medium")
    urgency_info = PANIC_URGENCY_MAP.get(urgency_key, PANIC_URGENCY_MAP["medium"])

    user_id = callback.from_user.id
    username = callback.from_user.username or "без_ника"
    full_name = callback.from_user.full_name or "Аноним"

    # Получаем пользователя из БД
    user_query = select(User).where(User.telegram_id == user_id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    # Формируем описание из текстовых вложений
    text_parts = []
    for att in panic_files:
        if att["type"] == "text":
            text_parts.append(att["content"])

    description = f"🔥 СРОЧНЫЙ ЗАКАЗ — {urgency_info['label']}\n\n"
    if text_parts:
        description += "Описание от клиента:\n" + "\n".join(text_parts)
    else:
        description += "(Только файлы без текстового описания)"

    # Создаём заказ в БД
    order = Order(
        user_id=user.telegram_id if user else user_id,  # telegram_id пользователя
        work_type=WorkType.OTHER.value,  # Panic = спецзаказ
        subject="🔥 Срочный заказ",
        description=description,
        deadline=urgency_info["label"],
        price=0.0,  # Цена определяется вручную
        status=OrderStatus.PENDING.value,
    )

    session.add(order)
    await session.commit()
    await session.refresh(order)

    # ═══════════════════════════════════════════════════════════════
    #   БЫСТРЫЙ ОТВЕТ ПОЛЬЗОВАТЕЛЮ (до загрузки на Яндекс.Диск!)
    # ═══════════════════════════════════════════════════════════════

    # Очищаем состояние, но сохраняем order_id для возможного append
    await state.clear()
    await state.update_data(last_panic_order_id=order.id)

    # Сохраняем chat_id ДО удаления сообщения
    chat_id = callback.message.chat.id

    # Показываем подтверждение — агрессивный стиль для критических сроков
    if urgency_key in ("critical", "high"):
        caption = f"""🚨 <b>ТРЕВОГА ПРИНЯТА!</b>

Заказ <b>#{order.id}</b> в приоритетной очереди.

Шериф получил уведомление <b>ПРИОРИТЕТНОГО УРОВНЯ</b>. Оценка заказа займёт 5-15 минут.

<b>Не исчезай.</b> Мы на связи."""
    else:
        caption = f"""✅ <b>ЗАКАЗ #{order.id} ПРИНЯТ!</b>

🔥 Твоя заявка в очереди на оценку.

Шериф скоро свяжется для уточнения деталей и стоимости.

<i>Обычно отвечаем в течение 15-30 минут.</i>"""

    # Удаляем старое сообщение
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Отправляем подтверждение юзеру — СРАЗУ, без ожидания загрузки
    sent = False
    if ORDER_DONE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=ORDER_DONE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_final_keyboard(user_id),
            )
            sent = True
        except Exception as e:
            logger.warning(f"Не удалось отправить фото подтверждения: {e}")

    if not sent:
        await bot.send_message(
            chat_id=chat_id,
            text=caption,
            reply_markup=get_panic_final_keyboard(user_id),
        )

    # ═══════════════════════════════════════════════════════════════
    #   ЗАГРУЗКА НА ЯНДЕКС.ДИСК (после ответа пользователю)
    # ═══════════════════════════════════════════════════════════════
    yadisk_link = None
    if yandex_disk_service and yandex_disk_service.is_available and panic_files:
        try:
            files_to_upload = []
            file_counter = 1

            for att in panic_files:
                att_type = att.get("type", "unknown")
                file_id = att.get("file_id")

                if not file_id or att_type == "text":
                    continue

                try:
                    tg_file = await bot.get_file(file_id)
                    file_bytes = await bot.download_file(tg_file.file_path)

                    if att_type == "document":
                        filename = att.get("file_name", f"document_{file_counter}")
                    elif att_type == "photo":
                        filename = f"photo_{file_counter}.jpg"
                    elif att_type == "voice":
                        filename = f"voice_{file_counter}.ogg"
                    elif att_type == "video":
                        filename = f"video_{file_counter}.mp4"
                    elif att_type == "video_note":
                        filename = f"video_note_{file_counter}.mp4"
                    elif att_type == "audio":
                        filename = f"audio_{file_counter}.mp3"
                    else:
                        filename = f"file_{file_counter}"

                    files_to_upload.append((file_bytes.read(), filename))
                    file_counter += 1
                except Exception as e:
                    logger.warning(f"Failed to download file from Telegram: {e}")
                    continue

            if files_to_upload:
                client_name = full_name
                result = await yandex_disk_service.upload_multiple_files(
                    files=files_to_upload,
                    order_id=order.id,
                    client_name=client_name,
                    work_type="Срочный заказ",
                    telegram_id=user_id,
                )
                if result.success and result.folder_url:
                    yadisk_link = result.folder_url
                    logger.info(f"Panic Order #{order.id} files uploaded to Yandex Disk: {yadisk_link}")

        except Exception as e:
            logger.error(f"Error uploading panic order to Yandex Disk: {e}")

    # Добавляем ссылку на Яндекс.Диск в уведомление
    yadisk_line = f"\n📁 <b>Яндекс.Диск:</b> <a href=\"{yadisk_link}\">Открыть папку</a>" if yadisk_link else ""

    # Формируем уведомление админам
    admin_text = f"""🔥🔥🔥 <b>СРОЧНЫЙ ЗАКАЗ #{order.id}</b> 🔥🔥🔥

👤 <b>Клиент:</b> {full_name}
📱 @{username}
🆔 <code>{user_id}</code>

⚡ <b>Срочность:</b> {urgency_info["label"]} ({urgency_info["tag"]})

📎 <b>Вложений:</b> {len(panic_files)}{yadisk_line}

⏰ <i>Требуется оперативное реагирование!</i>"""

    # Отправляем админам
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text)

            # Пересылаем все вложения
            for attachment in panic_files:
                try:
                    if attachment["type"] == "photo":
                        await bot.send_photo(
                            admin_id,
                            attachment["file_id"],
                            caption=attachment.get("caption", "")
                        )
                    elif attachment["type"] == "document":
                        await bot.send_document(
                            admin_id,
                            attachment["file_id"],
                            caption=f"📄 {attachment.get('file_name', 'документ')}"
                        )
                    elif attachment["type"] == "voice":
                        await bot.send_voice(admin_id, attachment["file_id"])
                    elif attachment["type"] == "audio":
                        await bot.send_audio(admin_id, attachment["file_id"])
                    elif attachment["type"] == "video":
                        await bot.send_video(
                            admin_id,
                            attachment["file_id"],
                            caption=attachment.get("caption", "")
                        )
                    elif attachment["type"] == "video_note":
                        await bot.send_video_note(admin_id, attachment["file_id"])
                    elif attachment["type"] == "text":
                        await bot.send_message(
                            admin_id,
                            f"💬 Текст от клиента:\n\n{attachment['content']}"
                        )
                except Exception as e:
                    logger.warning(f"Не удалось переслать вложение админу {admin_id}: {e}")
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")

    # Логируем (не критично, оборачиваем в try)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_CREATED,
            user=callback.from_user,
            details=f"Panic Order #{order.id}, urgency: {urgency_key}, files: {len(panic_files)}",
            session=session,
            level=LogLevel.INFO,
        )
    except Exception as e:
        logger.warning(f"Не удалось залогировать panic order: {e}")


@router.callback_query(F.data == "panic_back_to_urgency")
async def panic_back_to_urgency(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Назад к выбору срочности"""
    await callback.answer("⏳")
    await state.set_state(PanicState.choosing_urgency)

    caption = """🔥 <b>РЕЖИМ ПАНИКИ</b>

Понял, горит! Сейчас разберёмся.

<b>Выбери степень огнеопасности:</b>

🚀 <b>Нужно вчера</b> — работаем ночью, цена x1.5
🔥 <b>Сдать завтра</b> — приоритетная очередь, x1.3
🏎 <b>Турбо</b> — 2-3 дня, ускорение x1.15"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    if URGENT_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=URGENT_IMAGE_PATH,
                caption=caption,
                reply_markup=get_panic_urgency_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_panic_urgency_keyboard(),
    )


@router.callback_query(F.data == "panic_clear")
async def panic_clear_files(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Очистить загруженные файлы"""
    await callback.answer("🗑 Очищено")

    data = await state.get_data()
    urgency_label = data.get("panic_urgency_label", "🏎 Турбо")

    await state.update_data(panic_files=[])

    caption = f"""📤 <b>ЗАГРУЗИ ЗАДАНИЕ</b>

Срочность: <b>{urgency_label}</b>

Файлы очищены. Загрузи заново:
• 📸 Фото задания
• 📄 Документы/файлы
• 🎤 Голосовое (опишешь словами)
• 💬 Текстом — тоже ок

<i>Загрузи хотя бы что-то, чтобы разблокировать кнопку ПУСК</i>"""

    await safe_edit_or_send(
        callback,
        caption,
        reply_markup=get_panic_upload_keyboard(has_files=False),
        bot=bot,
    )


@router.callback_query(F.data == "panic_append_files")
async def panic_append_files(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Дослать материалы к существующему panic-заказу"""

    # Получаем order_id из предыдущего panic заказа
    data = await state.get_data()
    order_id = data.get("last_panic_order_id")

    if not order_id:
        await callback.answer("❌ Заказ не найден. Оформи новый.", show_alert=True)
        return

    await callback.answer("📎")

    # Переходим в режим дозагрузки
    await state.set_state(OrderState.appending_files)
    # Сохраняем order_id для append и помечаем как panic append
    await state.update_data(
        append_order_id=order_id,
        appended_files=[],
        panic_append=True,
    )

    caption = f"""📎 <b>ДОСЛАТЬ МАТЕРИАЛЫ К ЗАКАЗУ #{order_id}</b>

Отправляй дополнительные файлы — всё передадим исполнителю.

<i>Когда закончишь — нажми «Готово»</i>"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_append_files_keyboard(order_id=order_id, files_count=0),
    )
