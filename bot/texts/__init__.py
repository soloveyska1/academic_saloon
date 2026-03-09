"""
Centralized text system for Academic Saloon bot.

Modules:
- brand.py       — Brand identity constants
- greetings.py   — Time-based greetings, welcome text
- orders.py      — Order-related templates
- payments.py    — Payment instructions and receipts
- notifications.py — Smart notification templates
- errors.py      — Error messages
- terms.py       — Terms of service (legal)
- support.py     — Support/help text
- profile.py     — Profile, rank, loyalty text
"""
from .terms import (
    TERMS_SHORT,
    TERMS_FULL_INTRO,
    TERMS_SECTIONS,
    TERMS_ACCEPTED,
    TERMS_ACCEPTED_RETURNING,
    get_first_name,
    get_time_greeting,
    get_main_text,
    get_random_quote,
    get_welcome_quote,
)

__all__ = [
    "TERMS_SHORT",
    "TERMS_FULL_INTRO",
    "TERMS_SECTIONS",
    "TERMS_ACCEPTED",
    "TERMS_ACCEPTED_RETURNING",
    "get_first_name",
    "get_time_greeting",
    "get_main_text",
    "get_random_quote",
    "get_welcome_quote",
]
