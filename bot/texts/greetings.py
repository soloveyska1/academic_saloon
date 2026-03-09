"""
Greetings and welcome messages.
Premium minimalism tone — concise, confident, no excessive emoji.
"""
import random
from datetime import datetime
from zoneinfo import ZoneInfo

MSK_TZ = ZoneInfo("Europe/Moscow")


# ══════════════════════════════════════════════════════════════
#                    TIME-BASED GREETINGS
# ══════════════════════════════════════════════════════════════

_GREETINGS = {
    "morning": "Доброе утро, {name}",
    "day": "Добрый день, {name}",
    "evening": "Добрый вечер, {name}",
    "night": "Доброй ночи, {name}",
}


def get_first_name(fullname: str | None) -> str:
    """Extract first name from full name."""
    if not fullname:
        return "друг"
    return fullname.split()[0]


def get_time_greeting(name: str = "друг") -> str:
    """Returns time-appropriate greeting (MSK timezone)."""
    hour = datetime.now(MSK_TZ).hour

    if 6 <= hour < 12:
        period = "morning"
    elif 12 <= hour < 18:
        period = "day"
    elif 18 <= hour < 24:
        period = "evening"
    else:
        period = "night"

    return f"<b>{_GREETINGS[period].format(name=name)}</b>"


# ══════════════════════════════════════════════════════════════
#                    WELCOME TEXT
# ══════════════════════════════════════════════════════════════

WELCOME_USP = """Помогаем с учебными работами — от эссе до дипломов.

<b>О нас:</b>
├ 6 лет опыта
├ 1 000+ довольных клиентов
└ {stats_line}

Откройте приложение, чтобы начать."""


def get_welcome_text(stats_line: str = "", discount: int = 0) -> str:
    """Build welcome message."""
    live_stats = stats_line.strip() if stats_line and stats_line.strip() else "Индивидуальный подход к каждому заказу"

    text = WELCOME_USP.format(stats_line=live_stats)

    if discount > 0:
        text += f"\n\nВаша скидка: <b>−{discount}%</b>"

    return text.strip()


# ══════════════════════════════════════════════════════════════
#                    RETURNING USER
# ══════════════════════════════════════════════════════════════

WELCOME_RETURNING = """<b>С возвращением, {name}!</b>

{status}
{discount_line}

Откройте приложение, чтобы продолжить."""


# ══════════════════════════════════════════════════════════════
#                    BRAND QUOTES (premium tone)
# ══════════════════════════════════════════════════════════════

QUOTES = [
    "Качество — лучшая инвестиция в будущее",
    "Делаем сложное простым",
    "Ваш результат — наша репутация",
    "Каждая работа — индивидуально и с нуля",
]


def get_random_quote() -> str:
    """Returns a random brand quote."""
    return random.choice(QUOTES)
