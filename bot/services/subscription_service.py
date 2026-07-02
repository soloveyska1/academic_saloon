"""
Сервис подписок «Салон+» — платная скидка на заказы.

Правила (утверждены владельцем, опубликованы на сайте):
- plus  — «Салон+», 499 ₽/мес, скидка 5%
- pro   — «Салон+ Про», 999 ₽/мес, скидка 10%
- Действует 30 дней с момента активации, автопродления нет.
- Активация ТОЛЬКО вручную админом после оплаты на карту.
- Скидка суммируется с прочими, но общий потолок 25% (см. calculate_total_discount).
- Подписка не оплачивается бонусами.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.subscriptions import Subscription

MSK_TZ = ZoneInfo("Europe/Moscow")

logger = logging.getLogger(__name__)

# tier -> (скидка %, цена ₽/мес, название)
TIERS: dict[str, tuple[int, int, str]] = {
    "plus": (5, 499, "Салон+"),
    "pro": (10, 999, "Салон+ Про"),
}


async def get_active_subscription(
    session: AsyncSession, telegram_id: int
) -> Optional[Subscription]:
    """
    Возвращает активную подписку пользователя или None.

    Если срок подписки истёк — помечает её is_active=False и возвращает None.
    """
    query = (
        select(Subscription)
        .where(Subscription.user_id == telegram_id, Subscription.is_active == True)  # noqa: E712
        .order_by(Subscription.expires_at.desc())
    )
    result = await session.execute(query)
    subscriptions = result.scalars().all()

    if not subscriptions:
        return None

    now = datetime.now(MSK_TZ)
    active: Optional[Subscription] = None
    expired_any = False

    for sub in subscriptions:
        if sub.expires_at and sub.expires_at > now:
            if active is None:
                active = sub
        else:
            sub.is_active = False
            expired_any = True

    if expired_any:
        try:
            await session.commit()
            logger.info(f"[Salon+] Истёкшие подписки пользователя {telegram_id} деактивированы")
        except Exception as e:
            logger.warning(f"[Salon+] Не удалось деактивировать истёкшие подписки {telegram_id}: {e}")
            await session.rollback()

    return active


async def activate_subscription(
    session: AsyncSession,
    telegram_id: int,
    tier: str,
    created_by: int,
    days: int = 30,
    bot: Optional[Bot] = None,
) -> Subscription:
    """
    Активирует подписку пользователю (вручную, после оплаты на карту).

    Деактивирует прежние активные подписки и создаёт новую на `days` дней.
    При переданном bot уведомляет всех админов в ЛС.
    """
    if tier not in TIERS:
        raise ValueError(f"Неизвестный тариф подписки: {tier}")

    percent, _price, title = TIERS[tier]
    now = datetime.now(MSK_TZ)

    # Деактивируем прежние активные подписки
    query = select(Subscription).where(
        Subscription.user_id == telegram_id, Subscription.is_active == True  # noqa: E712
    )
    result = await session.execute(query)
    for old_sub in result.scalars().all():
        old_sub.is_active = False

    subscription = Subscription(
        user_id=telegram_id,
        tier=tier,
        discount_percent=percent,
        started_at=now,
        expires_at=now + timedelta(days=days),
        is_active=True,
        created_by=created_by,
    )
    session.add(subscription)
    await session.commit()

    logger.info(
        f"[Salon+] Подписка {tier} ({percent}%) активирована для {telegram_id} "
        f"до {subscription.expires_at:%d.%m.%Y}, админ {created_by}"
    )

    if bot is not None:
        expires_str = subscription.expires_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")
        admin_text = (
            f"⭐️ Подписка <b>{title}</b> ({percent}%) активирована для "
            f"<code>{telegram_id}</code> до {expires_str} (админ {created_by})"
        )
        for admin_id in settings.ADMIN_IDS:
            try:
                await bot.send_message(admin_id, admin_text)
            except Exception as e:
                logger.warning(f"[Salon+] Не удалось уведомить админа {admin_id}: {e}")

    return subscription


async def deactivate_subscription(session: AsyncSession, telegram_id: int) -> bool:
    """
    Деактивирует все активные подписки пользователя.

    Возвращает True, если хоть одна подписка была деактивирована.
    """
    query = select(Subscription).where(
        Subscription.user_id == telegram_id, Subscription.is_active == True  # noqa: E712
    )
    result = await session.execute(query)
    subscriptions = result.scalars().all()

    if not subscriptions:
        return False

    for sub in subscriptions:
        sub.is_active = False
    await session.commit()

    logger.info(f"[Salon+] Подписки пользователя {telegram_id} деактивированы вручную")
    return True


async def subscription_discount_percent(session: AsyncSession, telegram_id: int) -> int:
    """Процент скидки по активной подписке (0, если подписки нет)."""
    subscription = await get_active_subscription(session, telegram_id)
    return subscription.discount_percent if subscription else 0
