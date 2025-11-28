"""
Middleware для отслеживания стоп-слов.
Уведомляет админа о подозрительных сообщениях.
"""

import re
from typing import Any, Awaitable, Callable, Dict, List

from aiogram import BaseMiddleware, Bot
from aiogram.types import TelegramObject, Update

from core.config import settings
from bot.services.logger import BotLogger, LogEvent, LogLevel


# Стоп-слова и паттерны (можно расширить)
STOP_WORDS: List[str] = [
    # Конкуренты
    "zaochnik",
    "автор24",
    "author24",
    "студворк",
    "studwork",
    "напишем",

    # Подозрительное
    "возврат денег",
    "верни деньги",
    "обман",
    "мошенник",
    "развод",
    "кинул",

    # Угрозы
    "в полицию",
    "в суд",
    "жалоба",
    "роспотребнадзор",
]

# Регулярные выражения для более сложных паттернов
STOP_PATTERNS = [
    r"(\+7|8)[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}",  # Телефоны
    r"@[a-zA-Z_][a-zA-Z0-9_]{4,}",  # Username других ботов/людей (длинные)
    r"t\.me/[a-zA-Z0-9_]+",  # Ссылки на телеграм
]


class StopWordsMiddleware(BaseMiddleware):
    """
    Middleware для отслеживания стоп-слов.
    Не блокирует сообщения, но уведомляет админа.
    """

    def __init__(self):
        self.stop_words = [w.lower() for w in STOP_WORDS]
        self.patterns = [re.compile(p, re.IGNORECASE) for p in STOP_PATTERNS]
        # Белый список - свои username и ссылки, которые не должны вызывать алерт
        self.whitelist = [
            f"@{settings.SUPPORT_USERNAME}".lower(),
            f"@{settings.BOT_USERNAME}".lower(),
            f"t.me/{settings.BOT_USERNAME}".lower(),
            settings.REVIEWS_CHANNEL.lower(),
        ]

    def _is_whitelisted(self, match: str) -> bool:
        """Проверяет, находится ли совпадение в белом списке"""
        match_lower = match.lower()
        for allowed in self.whitelist:
            if match_lower in allowed or allowed in match_lower:
                return True
        return False

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Проверяем только текстовые сообщения
        if isinstance(event, Update) and event.message and event.message.text:
            user = event.message.from_user
            text = event.message.text.lower()

            # Админов не проверяем
            if user and user.id not in settings.ADMIN_IDS:
                found_words = []

                # Проверяем стоп-слова
                for word in self.stop_words:
                    if word in text:
                        found_words.append(word)

                # Проверяем паттерны
                for pattern in self.patterns:
                    matches = pattern.findall(event.message.text)
                    for match in matches[:3]:  # Максимум 3 совпадения
                        # Исключаем свои username и ссылки
                        if not self._is_whitelisted(match):
                            found_words.append(match)

                # Если нашли что-то подозрительное — уведомляем
                if found_words:
                    bot: Bot = data.get("bot")
                    if bot:
                        logger = BotLogger(bot)
                        await logger.log(
                            event=LogEvent.STOP_WORD,
                            user=user,
                            details=f"Стоп-слова: {', '.join(found_words[:5])}",
                            extra_data={"Сообщение": event.message.text[:200]},
                            level=LogLevel.WARNING,
                            silent=False,
                        )

        return await handler(event, data)
