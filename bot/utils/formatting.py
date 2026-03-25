"""
Centralized formatting utilities.

Single source of truth for:
- Price formatting
- Callback data parsing
- Russian pluralization
- Text sanitization
"""
from __future__ import annotations

from typing import Optional
from html import escape as html_escape


# ══════════════════════════════════════════════════════════════
#                    PRICE FORMATTING
# ══════════════════════════════════════════════════════════════

def format_price(amount: float | int, with_currency: bool = True) -> str:
    """
    Format price with space thousands separator.

    Examples:
        format_price(14000)     → "14 000 ₽"
        format_price(1500.50)   → "1 501 ₽"
        format_price(500, False) → "500"
    """
    rounded = int(round(amount))
    formatted = f"{rounded:,}".replace(",", " ")
    return f"{formatted} ₽" if with_currency else formatted


def format_price_short(amount: float | int) -> str:
    """
    Short price format for compact display.

    Examples:
        format_price_short(14000)  → "14к"
        format_price_short(1500)   → "1.5к"
        format_price_short(500)    → "500₽"
    """
    rounded = int(round(amount))
    if rounded >= 1000:
        k = rounded / 1000
        if k == int(k):
            return f"{int(k)}к"
        return f"{k:.1f}к"
    return f"{rounded}₽"


def round_to_nearest(amount: float, step: int = 10) -> int:
    """Round amount to nearest step (default 10₽)."""
    return int(round(amount / step) * step)


# ══════════════════════════════════════════════════════════════
#                    CALLBACK DATA PARSING
# ══════════════════════════════════════════════════════════════

def parse_callback_data(data: str, index: int, separator: str = ":") -> Optional[str]:
    """
    Safely parse callback_data by index.

    Example:
        parse_callback_data("order_detail:123", 1) → "123"
        parse_callback_data("action", 1) → None
    """
    parts = data.split(separator)
    return parts[index] if len(parts) > index else None


def parse_callback_int(data: str, index: int, separator: str = ":") -> Optional[int]:
    """
    Safely parse callback_data with int conversion.

    Example:
        parse_callback_int("order_detail:123", 1) → 123
        parse_callback_int("order_detail:abc", 1) → None
    """
    value = parse_callback_data(data, index, separator)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


# ══════════════════════════════════════════════════════════════
#                    RUSSIAN PLURALIZATION
# ══════════════════════════════════════════════════════════════

def pluralize(n: int, one: str, few: str, many: str) -> str:
    """
    Russian pluralization.

    Example:
        pluralize(1, "файл", "файла", "файлов") → "1 файл"
        pluralize(3, "файл", "файла", "файлов") → "3 файла"
        pluralize(5, "файл", "файла", "файлов") → "5 файлов"
    """
    if n % 10 == 1 and n % 100 != 11:
        return f"{n} {one}"
    elif 2 <= n % 10 <= 4 and not (12 <= n % 100 <= 14):
        return f"{n} {few}"
    return f"{n} {many}"


def pluralize_files(n: int) -> str:
    """Shortcut: pluralize files."""
    return pluralize(n, "файл", "файла", "файлов")


def pluralize_orders(n: int) -> str:
    """Shortcut: pluralize orders."""
    return pluralize(n, "заказ", "заказа", "заказов")


def pluralize_days(n: int) -> str:
    """Shortcut: pluralize days."""
    return pluralize(n, "день", "дня", "дней")


def pluralize_referrals(n: int) -> str:
    """Shortcut: pluralize referrals."""
    return pluralize(n, "реферал", "реферала", "рефералов")


# ══════════════════════════════════════════════════════════════
#                    TEXT SANITIZATION
# ══════════════════════════════════════════════════════════════

def safe_html(text: str | None, max_length: int = 0) -> str:
    """
    HTML-escape user input for Telegram messages.
    Optionally truncate to max_length.
    """
    if not text:
        return ""
    escaped = html_escape(str(text))
    if max_length and len(escaped) > max_length:
        return escaped[:max_length - 3] + "..."
    return escaped


def truncate(text: str, max_length: int = 50, suffix: str = "...") -> str:
    """Truncate text with suffix."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix
