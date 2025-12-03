"""
Order Flow Router - shared router instance and constants.

All order-related handlers register to this router.
"""
import logging
from pathlib import Path
from zoneinfo import ZoneInfo

from aiogram import Router

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════
#                    SHARED ROUTER
# ══════════════════════════════════════════════════════════════

order_router = Router(name="order_flow")

# ══════════════════════════════════════════════════════════════
#                    TIMEZONE
# ══════════════════════════════════════════════════════════════

MSK_TZ = ZoneInfo("Europe/Moscow")

# ══════════════════════════════════════════════════════════════
#                    IMAGE PATHS
# ══════════════════════════════════════════════════════════════

MEDIA_DIR = Path(__file__).parent.parent.parent / "media"

# Order creation images
ZAKAZ_IMAGE_PATH = MEDIA_DIR / "zakaz.jpg"
SMALL_TASKS_IMAGE_PATH = MEDIA_DIR / "small_tasks.jpg"
KURS_IMAGE_PATH = MEDIA_DIR / "kurs_otc.jpg"
DIPLOMA_IMAGE_PATH = MEDIA_DIR / "diploma.jpg"
DIRECTIONS_IMAGE_PATH = MEDIA_DIR / "directions.jpg"
DEADLINE_IMAGE_PATH = MEDIA_DIR / "deadline.jpg"
URGENT_IMAGE_PATH = MEDIA_DIR / "urgent_bell.jpg"
SECRET_IMAGE_PATH = MEDIA_DIR / "secret.jpg"
FAST_UPLOAD_IMAGE_PATH = MEDIA_DIR / "fast_upload.jpg"
INVESTIGATION_IMAGE_PATH = MEDIA_DIR / "investigation.jpg"

# Confirmation images
CONFIRM_URGENT_IMAGE_PATH = MEDIA_DIR / "confirm_urgent.jpg"
CONFIRM_SPECIAL_IMAGE_PATH = MEDIA_DIR / "confirm_special.jpg"
CONFIRM_STD_IMAGE_PATH = MEDIA_DIR / "confirm_std.jpg"
ORDER_DONE_IMAGE_PATH = MEDIA_DIR / "order_done.jpg"
CHECKING_PAYMENT_IMAGE_PATH = MEDIA_DIR / "checking_payment.jpg"

# Risk Matrix: pricing states
IMG_DEAL_READY = MEDIA_DIR / "confirm_std.jpg"
IMG_UNDER_REVIEW = MEDIA_DIR / "checking_payment.jpg"

# Upload Stage
IMG_UPLOAD_START = MEDIA_DIR / "upload_bag.jpg"
IMG_FILES_RECEIVED = MEDIA_DIR / "papka.jpg"

# Draft Review
IMG_DRAFT_REVIEW = MEDIA_DIR / "checklist.jpg"

# ══════════════════════════════════════════════════════════════
#                    LIMITS
# ══════════════════════════════════════════════════════════════

MAX_ATTACHMENTS = 10
MAX_APPEND_FILES = 5
MAX_PENDING_ORDERS = 5

# Rate limiting
RATE_LIMIT_ORDERS = 5
RATE_LIMIT_WINDOW = 60

# ══════════════════════════════════════════════════════════════
#                    URGENT ORDER SURCHARGES
# ══════════════════════════════════════════════════════════════

URGENT_SURCHARGES = {
    "today": 50,
    "tomorrow": 30,
    "3_days": 15,
    "asap": 0,
}

URGENT_DEADLINE_LABELS = {
    "today": "сегодня",
    "tomorrow": "завтра",
    "3_days": "2-3 дня",
    "asap": "как можно скорее",
}

# ══════════════════════════════════════════════════════════════
#                    RUSSIAN DATE PARSING
# ══════════════════════════════════════════════════════════════

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

# ══════════════════════════════════════════════════════════════
#                    FILE TYPE CONFIRMATIONS
# ══════════════════════════════════════════════════════════════

FILE_TYPE_CONFIRMATIONS = {
    "text": ["📝 Принял!", "📝 Записал!"],
    "photo": ["📸 Фото принял!", "📸 Есть!"],
    "document": ["📄 Файл принял!", "📄 Добавил!"],
    "voice": ["🎤 Голосовое принял!", "🎤 Записал!"],
    "video": ["🎬 Видео принял!", "🎬 Добавил!"],
    "audio": ["🎵 Аудио принял!", "🎵 Добавил!"],
    "video_note": ["⚪ Кружок принял!", "⚪ Добавил!"],
}

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
