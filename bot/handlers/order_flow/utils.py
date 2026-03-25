"""
Order Flow Utilities - shared helper functions.
"""
from __future__ import annotations

import random
import re
from datetime import datetime, timedelta

from database.models.users import User
from bot.utils.formatting import parse_callback_data, parse_callback_int, pluralize_files

from .router import (
    MSK_TZ,
    MAX_ATTACHMENTS,
    MAX_APPEND_FILES,
    WEEKDAYS_RU,
    MONTHS_RU,
    FILE_TYPE_CONFIRMATIONS,
    APPEND_CONFIRMATIONS,
)


# ══════════════════════════════════════════════════════════════
#                    PROGRESS BAR
# ══════════════════════════════════════════════════════════════

def get_progress_bar(current: int, maximum: int = MAX_ATTACHMENTS) -> str:
    """
    Generate visual progress bar.

    Examples:
        ■■■□□□□□□□ 3/10
        ■■■■■■■■■■ 10/10 ✓
    """
    filled = min(current, maximum)
    empty = maximum - filled
    bar = "■" * filled + "□" * empty

    if current >= maximum:
        return f"{bar} {current}/{maximum} ✓"

    return f"{bar} {current}/{maximum}"


# ══════════════════════════════════════════════════════════════
#                    ATTACHMENT CONFIRMATIONS
# ══════════════════════════════════════════════════════════════

def get_attachment_confirm_text(
    attachment: dict,
    count: int,
    is_urgent: bool = False,
    is_special: bool = False,
) -> str:
    """
    Generate short confirmation for file receipt.
    Progress bar is added separately in calling code.
    """
    att_type = attachment.get("type", "unknown")

    confirmations = FILE_TYPE_CONFIRMATIONS.get(att_type, ["📎 Принял!"])
    confirm = random.choice(confirmations)

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

    if is_urgent:
        return f"⚡️ {confirm}{extra}"

    if is_special:
        return f"🔍 {confirm}{extra}"

    return f"{confirm}{extra}"


def get_append_confirm_text(
    attachment: dict,
    total_count: int,
    order_id: int,
) -> str:
    """
    Generate atmospheric confirmation for append flow.
    Includes progress bar and file info.
    """
    att_type = attachment.get("type", "unknown")

    confirmations = APPEND_CONFIRMATIONS.get(att_type, ["📎 Принято!"])
    confirm = random.choice(confirmations)

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

    progress = get_progress_bar(total_count, MAX_APPEND_FILES)

    warning = ""
    remaining = MAX_APPEND_FILES - total_count
    if remaining == 1:
        warning = "\n\n⚠️ Осталось 1 место!"
    elif remaining <= 0:
        warning = "\n\nЛимит достигнут — нажмите «Отправить»"

    return f"""{confirm}{extra}

{progress}{warning}"""


# ══════════════════════════════════════════════════════════════
#                    ATTACHMENT PREVIEW FORMATTING
# ══════════════════════════════════════════════════════════════

def format_attachments_preview(attachments: list) -> str:
    """
    Format mini-preview of uploaded files.
    Shows what's already in the order.
    """
    if not attachments:
        return ""

    counts = {}
    text_preview = None
    doc_names = []

    for att in attachments:
        att_type = att.get("type", "unknown")
        counts[att_type] = counts.get(att_type, 0) + 1

        if att_type == "text" and not text_preview:
            content = att.get("content", "")
            if len(content) > 40:
                text_preview = content[:37] + "..."
            else:
                text_preview = content

        if att_type == "document" and len(doc_names) < 2:
            fname = att.get("file_name", "файл")
            if len(fname) > 20:
                fname = fname[:17] + "..."
            doc_names.append(fname)

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

    if text_preview:
        lines.append(f"   «{text_preview}»")

    if doc_names:
        for name in doc_names:
            lines.append(f"   • {name}")

    return "\n".join(lines)


def format_materials_received_message(attachments: list) -> str:
    """
    Format "MATERIALS RECEIVED" message for new UI.
    Shows file count and description snippet.
    """
    if not attachments:
        return """📂 <b>ПАПКА ПУСТА</b>

<i>Скинь сюда задание: текст, фото, файлы...</i>"""

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
    lines.append("<i>Если это всё — нажмите «Готово».</i>")

    return "\n".join(lines)


def format_append_status_message(
    attachments: list,
    order_id: int,
) -> str:
    """
    Format upload status message for append flow.
    Shows what's uploaded + progress bar.
    """
    if not attachments:
        return f"""<b>Дослать к заказу #{order_id}</b>

Прикрепите файлы, фото или голосовое сообщение.

{get_progress_bar(0, MAX_APPEND_FILES)}

<i>Нажмите 📎 внизу экрана.</i>"""

    preview = format_attachments_preview(attachments)
    progress = get_progress_bar(len(attachments), MAX_APPEND_FILES)

    return f"""<b>Дослать к заказу #{order_id}</b>

{preview}

{progress}

<i>Ещё файлы или нажмите «Отправить».</i>"""


# ══════════════════════════════════════════════════════════════
#                    USER DISCOUNT CALCULATION
# ══════════════════════════════════════════════════════════════

def calculate_user_discount(user: User | None) -> int:
    """
    Calculate user discount based on:
    - Loyalty status
    - Referral discount (5% for first order via ref link)

    Returns:
        Discount percentage (0-15)
    """
    if not user:
        return 0

    _, discount = user.loyalty_status

    # 5% discount for first order via referral
    if user.referrer_id and user.orders_count == 0:
        discount = max(discount, 5)

    return discount


# ══════════════════════════════════════════════════════════════
#                    DEADLINE PARSING
# ══════════════════════════════════════════════════════════════

def parse_custom_deadline(text: str) -> tuple[str, str]:
    """
    Parse text date input and determine urgency.

    Returns:
        (deadline_key, deadline_label) - key for multiplier and human-readable label
    """
    text_lower = text.lower().strip()
    now = datetime.now(MSK_TZ)
    today = now.date()
    target_date = None

    if "сегодня" in text_lower:
        return ("today", text)

    if "завтра" in text_lower:
        return ("tomorrow", text)

    for weekday_name, weekday_num in WEEKDAYS_RU.items():
        if weekday_name in text_lower:
            days_ahead = weekday_num - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
            break

    if target_date is None:
        for month_name, month_num in MONTHS_RU.items():
            pattern = rf"(\d{{1,2}})\s*{month_name}"
            match = re.search(pattern, text_lower)
            if match:
                day = int(match.group(1))
                year = today.year
                if month_num < today.month or (month_num == today.month and day < today.day):
                    year += 1
                try:
                    target_date = datetime(year, month_num, day).date()
                except ValueError:
                    pass
                break

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

    return ("week", text)


# ══════════════════════════════════════════════════════════════
#                    RATE LIMITING
# ══════════════════════════════════════════════════════════════

async def check_rate_limit(user_id: int) -> bool:
    """
    Check rate limit for order creation.
    Returns True if allowed, False if limit exceeded.
    """
    from core.redis_pool import get_redis
    from .router import RATE_LIMIT_ORDERS, RATE_LIMIT_WINDOW, logger

    try:
        redis = await get_redis()
        key = f"rate:order:{user_id}"
        count = await redis.incr(key)

        if count == 1:
            await redis.expire(key, RATE_LIMIT_WINDOW)

        return count <= RATE_LIMIT_ORDERS
    except Exception as e:
        logger.warning(f"Rate limit check failed: {e}")
        return True
