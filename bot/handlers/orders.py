import asyncio
import logging
import random
from datetime import datetime
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
PAYMENT_CHECKING_IMAGE_PATH = Path(__file__).parent.parent / "media" / "payment_checking.jpg"
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
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
    get_deadline_keyboard,
    get_custom_deadline_keyboard,
    get_confirm_order_keyboard,
    get_edit_order_keyboard,
    get_cancel_order_keyboard,
    get_deadline_with_date,
    get_urgent_order_keyboard,
    get_urgent_task_keyboard,
    get_special_order_keyboard as get_special_order_kb,  # Renamed to avoid conflict
    get_invoice_keyboard,
    get_waiting_payment_keyboard,
    get_order_success_keyboard,
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
from bot.handlers.start import process_start

MSK_TZ = ZoneInfo("Europe/Moscow")

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


# Рандомные ответы в стиле Салуна
SALOON_CONFIRMATIONS = [
    "Записал в блокнот. 📝",
    "Так, это принял. Ещё что-то? 🧐",
    "Улику подшил к делу. 📂",
    "Добро. Клади ещё, если есть. 👌",
    "Понял. Информация принята. 🤠",
]


def get_attachment_confirm_text(
    attachment: dict,
    count: int,
    is_urgent: bool = False,
    is_special: bool = False,
) -> str:
    """
    Генерирует умное подтверждение в зависимости от типа вложения и flow.

    Flows:
    - is_urgent: Срочный заказ → быстрый, энергичный ответ
    - is_special: Спецзаказ/Уникальная задача → интрига, экспертный анализ
    - Стандартный: Рандомные ответы в стиле Салуна
    """
    att_type = attachment.get("type", "unknown")

    # Дополнительная инфа по типу
    extra = ""
    if att_type == "document":
        fname = attachment.get("file_name", "")
        if fname:
            # Обрезаем длинные имена
            if len(fname) > 25:
                fname = fname[:22] + "..."
            extra = f"\n📄 <i>{fname}</i>"
    elif att_type == "voice":
        duration = attachment.get("duration", 0)
        if duration:
            mins, secs = divmod(duration, 60)
            if mins:
                extra = f"\n🎤 <i>Голосовое {mins}:{secs:02d}</i>"
            else:
                extra = f"\n🎤 <i>Голосовое {secs} сек</i>"

    # === CASE A: СРОЧНЫЙ ЗАКАЗ ===
    if is_urgent:
        if count == 1:
            return f"""⚡️ <b>Поймал!</b>

Уже несу Шерифу на стол бегом.{extra}

<i>Никуда не уходи — вернусь с ценой быстрее, чем вылетит пуля.</i>"""
        else:
            return f"⚡️ <b>Ещё один!</b>{extra}\n📎 Всего: {pluralize_files(count)}"

    # === CASE B: СПЕЦЗАКАЗ / УНИКАЛЬНАЯ ЗАДАЧА ===
    if is_special:
        if count == 1:
            return f"""🧐 <b>Любопытный случай...</b>

Материал принял.{extra}

Тут нужно покумекать. Сейчас изучу детали под лупой и скажу, как мы это провернём."""
        else:
            return f"🧐 <b>Ещё улики...</b>{extra}\n📎 Всего материалов: {pluralize_files(count)}"

    # === CASE C: СТАНДАРТНЫЙ FLOW ===
    base_text = random.choice(SALOON_CONFIRMATIONS)

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
        return

    # Для мелких работ — специальный layout с фото и ценами в caption
    if category_key == "small":
        caption = """⚡️ <b>Быстрые задачи</b>

Закроем долги по мелочи, пока ты занимаешься важными делами.
Обычно сдаём за 1-3 дня.

💰 <b>Старт: от 2 500 ₽</b> (зависит от срочности)

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

💰 <b>Курсовая: от 14 000 ₽</b>
💰 <b>Практика: от 8 000 ₽</b>

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

💰 <b>Старт: от 40 000 ₽</b>

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
                    reply_markup=get_special_order_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото secret: {e}")

        # Fallback на текст
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_special_order_keyboard(),
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

<i>Жду файлы...</i>"""

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

<i>Жду улики...</i>"""

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

<i>Жду твои файлы... Можно кидать по одному или пачкой.</i>"""

    # Удаляем старое сообщение
    if not send_new:
        try:
            await message.delete()
        except Exception:
            pass

    # Отправляем фото с caption (с кэшированием file_id)
    if settings.TASK_INPUT_IMAGE.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=settings.TASK_INPUT_IMAGE,
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
        confirm_text = get_attachment_confirm_text(attachment, count, is_urgent, is_special)

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
async def task_add_more(callback: CallbackQuery, state: FSMContext, bot: Bot):
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

    await safe_edit_or_send(callback, text, reply_markup=get_task_input_keyboard(), bot=bot)


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
        image_path = CONFIRM_STD_IMAGE_PATH

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


@router.callback_query(OrderState.confirming, F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Подтверждение и сохранение заказа с АВТОМАТИЧЕСКИМ расчётом цены.

    Flow:
    1. Показываем анимацию "Шериф считает смету..."
    2. Рассчитываем цену по формуле: Base * Urgency * (1 - Discount)
    3. Для спецзаказов (OTHER) — ставим статус WAITING_ESTIMATION (ручная оценка)
    4. Для обычных заказов — показываем инвойс с кнопкой оплаты
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
    #   ШАГ 1: Анимация "Шериф считает..."
    # ═══════════════════════════════════════════════════════════════

    try:
        await callback.message.delete()
    except Exception:
        pass

    loading_msg = await bot.send_message(
        chat_id=chat_id,
        text="⏳ <b>Шериф считает смету...</b>\n\n<i>Подожди пару секунд</i>"
    )

    # Небольшая задержка для эффекта
    await asyncio.sleep(1.5)

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 2: Расчёт цены
    # ═══════════════════════════════════════════════════════════════

    price_calc = calculate_price(
        work_type=work_type_value,
        deadline_key=deadline_key,
        discount_percent=discount_percent,
    )

    final_price = price_calc.price_after_discount if discount_percent > 0 else price_calc.final_price

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 3: Определяем статус и создаём заказ
    # ═══════════════════════════════════════════════════════════════

    if is_special:
        # Спецзаказ — ждёт ручной оценки админа
        order_status = OrderStatus.WAITING_ESTIMATION.value
        order_price = 0  # Цена будет установлена админом
    else:
        # Обычный заказ — WAITING_PAYMENT с рассчитанной ценой
        order_status = OrderStatus.WAITING_PAYMENT.value
        order_price = final_price

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
    await session.commit()
    await session.refresh(order)

    # Удаляем из трекера брошенных заказов
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.complete_order(user_id)

    await state.clear()

    # Удаляем сообщение "считает смету"
    try:
        await loading_msg.delete()
    except Exception:
        pass

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type_value), work_type_value)
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

    if not is_special:
        extra_data["💰 Цена"] = f"{final_price:,} ₽".replace(",", " ")
        extra_data["База"] = f"{price_calc.base_price:,} ₽".replace(",", " ")
        extra_data["Множитель"] = f"x{price_calc.urgency_multiplier}"

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

    # ═══════════════════════════════════════════════════════════════
    #   ШАГ 5: Отправляем результат пользователю
    # ═══════════════════════════════════════════════════════════════

    if is_special:
        # 🦄 СПЕЦЗАКАЗ — ждёт ручной оценки
        text = f"""🦄 <b>СПЕЦЗАКАЗ <code>#{order.id}</code> ПРИНЯТ</b>

Это задача для спецназа. Тут нужен индивидуальный подход.

Шериф лично изучит материалы и вернётся с ценой.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

<i>Статус: ожидает оценки 🔍</i>"""

        keyboard = get_special_order_kb(order.id)
        image_path = CONFIRM_SPECIAL_IMAGE_PATH

    else:
        # 💰 ОБЫЧНЫЙ ЗАКАЗ — показываем инвойс
        breakdown = format_price_breakdown(price_calc, work_label, deadline_label)

        text = f"""⚖️ <b>СМЕТА ГОТОВА</b>

📋 <b>Заказ:</b> <code>#{order.id}</code>

{breakdown}

<i>Цена рассчитана автоматически.
Для сложных случаев шериф может скорректировать.</i>"""

        keyboard = get_invoice_keyboard(order.id, final_price)
        image_path = CONFIRM_STD_IMAGE_PATH if CONFIRM_STD_IMAGE_PATH.exists() else ORDER_DONE_IMAGE_PATH

    # Отправляем сообщение
    if image_path.exists():
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

    # Уведомление админам со всеми вложениями
    await notify_admins_new_order(bot, callback.from_user, order, data)


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

    # Получаем заказ
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
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
            text="📸 Отправить чек",
            callback_data=f"send_receipt:{order_id}"
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

    НЕ помечаем как paid! Ждём ручной проверки админа.
    """
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

    # Проверяем что заказ в правильном статусе
    valid_statuses = [
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
    ]
    if order.status not in valid_statuses:
        await callback.answer("Этот заказ уже обрабатывается", show_alert=True)
        return

    await callback.answer("⏳ Отправляем на проверку...")

    # ═══ ОБНОВЛЯЕМ СТАТУС НА VERIFICATION_PENDING ═══
    order.status = OrderStatus.VERIFICATION_PENDING.value
    await session.commit()

    # ═══ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЮ — УСПОКАИВАЮЩЕЕ ═══
    user_text = f"""⏳ <b>Платёж на проверке</b>

Шериф получил сигнал. Мы проверяем поступление средств вручную.

💤 <b>Если сейчас ночь</b> — подтвердим утром.
✅ <b>Твой заказ уже зафиксирован</b>, дедлайн в силе. Не волнуйся.

<i>Как только деньги звякнут в казне — придёт чек.</i>"""

    # Убираем кнопки оплаты — только статус и меню
    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="👀 Статус заказа",
            callback_data=f"order_detail:{order_id}"
        )],
        [InlineKeyboardButton(
            text="🌵 В салун",
            callback_data="back_to_menu"
        )],
    ])

    # Удаляем старое сообщение и отправляем с фото
    try:
        await callback.message.delete()
    except Exception:
        pass

    if PAYMENT_CHECKING_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=PAYMENT_CHECKING_IMAGE_PATH,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить payment_checking image: {e}")
            await bot.send_message(
                chat_id=callback.message.chat.id,
                text=user_text,
                reply_markup=user_keyboard
            )
    else:
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=user_text,
            reply_markup=user_keyboard
        )

    # ═══ УВЕДОМЛЕНИЕ АДМИНАМ С КНОПКАМИ ВЕРИФИКАЦИИ ═══
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    username = callback.from_user.username
    user_link = f"@{username}" if username else f"<a href='tg://user?id={callback.from_user.id}'>Пользователь</a>"

    admin_text = f"""🔔 <b>ПРОВЕРЬ ПОСТУПЛЕНИЕ!</b>

📋 Заказ: <code>#{order.id}</code>
💰 Сумма: <b>{int(order.price):,} ₽</b>
👤 Клиент: {user_link} (<code>{callback.from_user.id}</code>)
📂 Тип: {work_label}

<i>Клиент нажал кнопку «Я оплатил». Зайди в банк и проверь.</i>""".replace(",", " ")

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Деньги пришли",
                callback_data=f"admin_verify_paid:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Нет оплаты",
                callback_data=f"admin_reject_payment:{order_id}"
            ),
        ],
        [InlineKeyboardButton(
            text="👁 Детали заказа",
            callback_data=f"admin_order:{order_id}"
        )],
    ])

    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, reply_markup=admin_keyboard)
        except Exception as e:
            logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@router.callback_query(F.data.startswith("recalc_order:"))
async def recalc_order_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Пользователь хочет пересчитать цену — возвращаем к выбору типа работы"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Удаляем заказ (он ещё не оплачен)
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

    await session.delete(order)
    await session.commit()

    await callback.answer("🔄 Начинаем заново!")

    # Перенаправляем на создание нового заказа
    from bot.handlers.orders import start_order
    await start_order(callback, state, callback.bot, session)


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
    allowed_statuses = [OrderStatus.PENDING.value, OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value]
    if order.status not in allowed_statuses:
        await callback.answer("К этому заказу уже нельзя добавить файлы", show_alert=True)
        return

    await callback.answer("📎 Жду файлы!")

    # Сохраняем order_id и переводим в состояние дослать
    await state.update_data(append_order_id=order_id, appended_files=[])
    await state.set_state(OrderState.appending_files)

    text = f"""📎 <b>Дослать материалы к заказу #{order.id}</b>

Отправь фото, документы или голосовое сообщение.
Можешь прислать несколько файлов подряд.

Когда закончишь — нажми кнопку ниже."""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="✅ Готово (Отправить)",
            callback_data=f"finish_append:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❌ Отмена",
            callback_data=f"cancel_append:{order_id}"
        )],
    ])

    # Удаляем старое сообщение (может быть фото) и отправляем новое
    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    await callback.bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)


@router.message(OrderState.appending_files, F.photo)
async def append_photo(message: Message, state: FSMContext):
    """Получено фото для дослать"""
    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    photo = message.photo[-1]
    appended_files.append({
        "type": "photo",
        "file_id": photo.file_id,
        "caption": message.caption or "",
    })
    await state.update_data(appended_files=appended_files)

    await message.answer(f"📸 Фото принял! (всего: {len(appended_files)})")


@router.message(OrderState.appending_files, F.document)
async def append_document(message: Message, state: FSMContext):
    """Получен документ для дослать"""
    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    appended_files.append({
        "type": "document",
        "file_id": message.document.file_id,
        "file_name": message.document.file_name or "файл",
        "caption": message.caption or "",
    })
    await state.update_data(appended_files=appended_files)

    await message.answer(f"📄 Файл принял! (всего: {len(appended_files)})")


@router.message(OrderState.appending_files, F.voice)
async def append_voice(message: Message, state: FSMContext):
    """Получено голосовое для дослать"""
    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    appended_files.append({
        "type": "voice",
        "file_id": message.voice.file_id,
        "duration": message.voice.duration,
    })
    await state.update_data(appended_files=appended_files)

    await message.answer(f"🎤 Голосовое принял! (всего: {len(appended_files)})")


@router.message(OrderState.appending_files, F.text)
async def append_text(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Получен текст для дослать"""
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        await process_start(message, session, bot, state, deep_link=None)
        return

    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    appended_files.append({
        "type": "text",
        "content": message.text,
    })
    await state.update_data(appended_files=appended_files)

    await message.answer(f"📝 Текст принял! (всего: {len(appended_files)})")


@router.callback_query(F.data.startswith("finish_append:"))
async def finish_append_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Завершить дослать — отправить админам"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    data = await state.get_data()
    appended_files = data.get("appended_files", [])

    if not appended_files:
        await callback.answer("Ты ещё ничего не отправил!", show_alert=True)
        return

    # Находим заказ
    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        await state.clear()
        return

    await callback.answer("✅ Отправляю!")
    await state.clear()

    # Обновляем сообщение пользователю
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

    # Уведомляем админов
    admin_text = f"""📎 <b>Клиент дослал материалы!</b>

📋 Заказ: #{order.id}
👤 Клиент: @{callback.from_user.username or 'без username'}
📦 Файлов: {len(appended_files)}"""

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
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    await state.clear()
    await callback.answer("Отменено")

    # Возвращаем к статусу заказа
    order_query = select(Order).where(Order.id == order_id)
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

💰 <b>Старт: от 2 500 ₽</b> (зависит от срочности)

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

💰 <b>Курсовая: от 14 000 ₽</b>
💰 <b>Практика: от 8 000 ₽</b>

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

💰 <b>Старт: от 40 000 ₽</b>

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
        text = f"""📝  <b>Задание</b>

Уже получено:
{preview}

Добавить ещё или продолжить?"""
        await safe_edit_or_send(callback, text, reply_markup=get_task_continue_keyboard(), bot=bot)
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

    # Клавиатура с кнопками подтверждения
    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить",
                callback_data=f"confirm_payment:{order.id}"
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
                callback_data=f"confirm_payment:{order.id}"
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
