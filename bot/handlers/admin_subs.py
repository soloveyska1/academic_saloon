"""
Админ-команды подписок «Салон+».

- /sub <telegram_id|@username> <plus|pro> [days] — активировать подписку (после оплаты на карту)
- /unsub <telegram_id|@username> — деактивировать подписку
- /subinfo <telegram_id|@username> — статус подписки пользователя

Доступ только для settings.ADMIN_IDS.
"""
from __future__ import annotations

import logging
from typing import Optional

from aiogram import Router, F
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.users import User
from bot.services.subscription_service import (
    MSK_TZ,
    TIERS,
    activate_subscription,
    deactivate_subscription,
    get_active_subscription,
)

logger = logging.getLogger(__name__)
router = Router()


async def _find_user(session: AsyncSession, arg: str) -> Optional[User]:
    """Ищет пользователя по telegram_id или @username."""
    arg = arg.strip()
    if arg.startswith("@"):
        query = select(User).where(User.username == arg[1:])
    else:
        try:
            telegram_id = int(arg)
        except ValueError:
            return None
        query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


def _user_label(user: User) -> str:
    """Короткая подпись пользователя для ответов админу."""
    username = f"@{user.username}" if user.username else ""
    return f"{user.fullname or 'Без имени'} {username} (<code>{user.telegram_id}</code>)"


@router.message(Command("sub"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter("*"))
async def cmd_sub(message: Message, command: CommandObject, session: AsyncSession):
    """Активировать подписку «Салон+» пользователю (вручную, после оплаты)."""
    usage = (
        "📋  <b>Использование:</b>\n\n"
        "<code>/sub 123456789 plus</code>\n"
        "<code>/sub @username pro 30</code>\n\n"
        "Тарифы: plus — 5% (499 ₽/мес), pro — 10% (999 ₽/мес). Срок по умолчанию 30 дней."
    )

    args = command.args.split() if command.args else []
    if len(args) < 2:
        await message.answer(usage)
        return

    user_arg, tier = args[0], args[1].lower()
    if tier not in TIERS:
        await message.answer(f"❌ Неизвестный тариф «{tier}». Доступны: plus, pro.")
        return

    days = 30
    if len(args) >= 3:
        try:
            days = int(args[2])
            if days <= 0:
                raise ValueError
        except ValueError:
            await message.answer("❌ Срок должен быть положительным числом дней.")
            return

    user = await _find_user(session, user_arg)
    if not user:
        await message.answer("❌ Пользователь не найден. Используй ID (число) или @username.")
        return

    try:
        subscription = await activate_subscription(
            session=session,
            telegram_id=user.telegram_id,
            tier=tier,
            created_by=message.from_user.id,
            days=days,
            bot=message.bot,
        )
    except Exception as e:
        logger.error(f"[Salon+] Ошибка активации подписки для {user.telegram_id}: {e}")
        await message.answer(f"❌ Не удалось активировать подписку: {e}")
        return

    percent, price, title = TIERS[tier]
    expires_str = subscription.expires_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")

    await message.answer(
        f"✅ Подписка <b>{title}</b> (−{percent}%, {price} ₽/мес) активирована\n"
        f"для {_user_label(user)}\n"
        f"Действует до <b>{expires_str}</b> ({days} дн.)"
    )

    # Уведомляем клиента в ЛС — не критично, если не дойдёт
    try:
        await message.bot.send_message(
            user.telegram_id,
            f"⭐️ <b>Подписка «{title}» активна до {expires_str}</b>\n\n"
            f"Скидка {percent}% уже применяется к вашим заказам автоматически.\n"
            f"Спасибо, что вы с Салоном!",
        )
    except Exception as e:
        logger.warning(f"[Salon+] Не удалось уведомить клиента {user.telegram_id}: {e}")
        await message.answer("⚠️ Клиенту не удалось отправить уведомление в ЛС (возможно, бот заблокирован).")


@router.message(Command("unsub"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter("*"))
async def cmd_unsub(message: Message, command: CommandObject, session: AsyncSession):
    """Деактивировать подписку пользователя."""
    if not command.args:
        await message.answer(
            "📋  <b>Использование:</b>\n\n"
            "<code>/unsub 123456789</code>\n"
            "<code>/unsub @username</code>"
        )
        return

    user = await _find_user(session, command.args)
    if not user:
        await message.answer("❌ Пользователь не найден. Используй ID (число) или @username.")
        return

    try:
        deactivated = await deactivate_subscription(session, user.telegram_id)
    except Exception as e:
        logger.error(f"[Salon+] Ошибка деактивации подписки для {user.telegram_id}: {e}")
        await message.answer(f"❌ Не удалось деактивировать подписку: {e}")
        return

    if deactivated:
        await message.answer(f"✅ Подписка пользователя {_user_label(user)} деактивирована.")
    else:
        await message.answer(f"ℹ️ У пользователя {_user_label(user)} нет активной подписки.")


@router.message(Command("subinfo"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter("*"))
async def cmd_subinfo(message: Message, command: CommandObject, session: AsyncSession):
    """Показать статус подписки пользователя."""
    if not command.args:
        await message.answer(
            "📋  <b>Использование:</b>\n\n"
            "<code>/subinfo 123456789</code>\n"
            "<code>/subinfo @username</code>"
        )
        return

    user = await _find_user(session, command.args)
    if not user:
        await message.answer("❌ Пользователь не найден. Используй ID (число) или @username.")
        return

    subscription = await get_active_subscription(session, user.telegram_id)
    if not subscription:
        await message.answer(f"ℹ️ У пользователя {_user_label(user)} нет активной подписки.")
        return

    _, _, title = TIERS.get(subscription.tier, (0, 0, subscription.tier))
    started_str = subscription.started_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")
    expires_str = subscription.expires_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")

    await message.answer(
        f"⭐️ <b>Подписка пользователя</b> {_user_label(user)}\n\n"
        f"├ Тариф: <b>{title}</b> ({subscription.tier})\n"
        f"├ Скидка: <b>−{subscription.discount_percent}%</b>\n"
        f"├ Активирована: {started_str}\n"
        f"└ Действует до: <b>{expires_str}</b>"
    )
