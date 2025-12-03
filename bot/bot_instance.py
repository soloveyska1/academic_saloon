"""
Shared Bot Instance

Provides a singleton bot instance that can be used by both:
- The main polling bot
- The FastAPI endpoints

This allows the API to send messages, create topics, and trigger admin notifications.
"""

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from core.config import settings

# Singleton bot instance
_bot_instance: Bot | None = None


def get_bot() -> Bot:
    """
    Get or create the shared bot instance.

    Returns:
        Bot: The aiogram Bot instance
    """
    global _bot_instance

    if _bot_instance is None:
        _bot_instance = Bot(
            token=settings.BOT_TOKEN.get_secret_value(),
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )

    return _bot_instance


def set_bot(bot: Bot) -> None:
    """
    Set the shared bot instance (for use in main.py to ensure consistency).

    Args:
        bot: The Bot instance to use
    """
    global _bot_instance
    _bot_instance = bot


async def close_bot() -> None:
    """Close the bot session."""
    global _bot_instance

    if _bot_instance is not None:
        await _bot_instance.session.close()
        _bot_instance = None
