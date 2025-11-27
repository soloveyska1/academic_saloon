"""
Middleware для проверки бана пользователя.
Заблокированные пользователи получают заглушку.
"""

from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, Message, CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from core.config import settings


# Текст для забаненных пользователей
BAN_MESSAGE = f"""🚫  <b>Доступ ограничен</b>

К сожалению, твой аккаунт заблокирован.

Если считаешь, что это ошибка — напиши:
@{settings.SUPPORT_USERNAME}"""


class BanCheckMiddleware(BaseMiddleware):
    """
    Middleware для проверки, забанен ли пользователь.
    Забаненные не могут использовать бота.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Получаем пользователя из события
        user = None
        if isinstance(event, Update):
            if event.message:
                user = event.message.from_user
            elif event.callback_query:
                user = event.callback_query.from_user

        # Если пользователь не определён — пропускаем
        if not user:
            return await handler(event, data)

        # Админы не блокируются
        if user.id in settings.ADMIN_IDS:
            return await handler(event, data)

        # Проверяем бан в БД
        session: AsyncSession = data.get("session")
        if session:
            query = select(User).where(User.telegram_id == user.id)
            result = await session.execute(query)
            db_user = result.scalar_one_or_none()

            if db_user and db_user.is_banned:
                # Показываем заглушку
                await self._send_ban_message(event)
                return None

        return await handler(event, data)

    async def _send_ban_message(self, event: TelegramObject) -> None:
        """Отправляет сообщение о бане"""
        if isinstance(event, Update):
            if event.message:
                await event.message.answer(BAN_MESSAGE)
            elif event.callback_query:
                await event.callback_query.answer(
                    "Твой аккаунт заблокирован",
                    show_alert=True
                )
