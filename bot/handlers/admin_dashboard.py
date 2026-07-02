"""
«Глаз бога» — сводка бизнеса одной командой.

/boss (алиас /dashboard) — только для админов (settings.ADMIN_IDS).
Только чтение: одни SELECT-ы, база не меняется.

Что показывает:
- СЕГОДНЯ / 7 ДНЕЙ / 30 ДНЕЙ: новые пользователи, заявки и их сумма,
  подтверждённые оплаты, рефералы и реф-бонусы, движение бонусов.
- Текущее состояние: активные заказы по статусам, активные подписки
  «Салон+» по тарифам, топ-3 реферера.

Про источник данных об оплатах.
BalanceTransaction — это история БОНУСНОГО баланса (кэшбэк, рефералка,
ежедневная удача), к живым деньгам отношения не имеет. Реальные деньги
живут в orders.paid_amount — его обновляют ВСЕ пути подтверждения
(ручное подтверждение админом и вебхук ЮKassa), но без отметки времени
самого платежа. Поэтому по периодам считаем два честных среза:
- «Оплачено по заявкам периода» — сумма paid_amount заказов, созданных
  в окне (когортная метрика: сколько денег принесли заявки периода);
- «Оплат онлайн (ЮKassa)» — точные по дате платежи из payment_logs
  (event_type='payment.succeeded'), но только онлайн-канал.
"""

from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.orders import (
    Order,
    OrderStatus,
    ORDER_STATUS_META,
    canonicalize_order_status,
    get_active_statuses,
    LEGACY_CONFIRMED_STATUS,
)
from database.models.payment_logs import PaymentLog
from database.models.subscriptions import Subscription
from database.models.transactions import BalanceTransaction
from database.models.users import User
from bot.services.subscription_service import TIERS

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")

REFERRAL_BONUS_REASON = "referral_bonus"
PAYMENT_SUCCEEDED_EVENT = "payment.succeeded"


def _fmt_money(value: Decimal | int | float | None) -> str:
    """12345.67 -> '12 346 ₽'"""
    amount = int(round(float(value or 0)))
    return f"{amount:,}".replace(",", " ") + " ₽"


def _boss_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Обновить", callback_data="boss_refresh")]
    ])


async def _collect_period_stats(session: AsyncSession, since: datetime) -> dict:
    """Все агрегаты одного окна времени. Только SELECT-ы."""
    # Новые пользователи
    new_users = (await session.execute(
        select(func.count()).select_from(User).where(User.created_at >= since)
    )).scalar() or 0

    # Заявки (без черновиков — черновик ещё не отправлен)
    orders_row = (await session.execute(
        select(
            func.count(),
            func.coalesce(func.sum(Order.price), 0),
        ).where(
            Order.created_at >= since,
            Order.status != OrderStatus.DRAFT.value,
        )
    )).one()
    orders_count, orders_sum = int(orders_row[0] or 0), Decimal(orders_row[1] or 0)

    # Оплачено по заявкам периода (когорта: заказы, созданные в окне)
    paid_row = (await session.execute(
        select(
            func.count(),
            func.coalesce(func.sum(Order.paid_amount), 0),
        ).where(
            Order.created_at >= since,
            Order.paid_amount > 0,
        )
    )).one()
    paid_count, paid_sum = int(paid_row[0] or 0), Decimal(paid_row[1] or 0)

    # Онлайн-оплаты ЮKassa — точные по дате
    online_row = (await session.execute(
        select(
            func.count(),
            func.coalesce(func.sum(PaymentLog.amount), 0),
        ).where(
            PaymentLog.processed_at >= since,
            PaymentLog.event_type == PAYMENT_SUCCEEDED_EVENT,
        )
    )).one()
    online_count, online_sum = int(online_row[0] or 0), Decimal(online_row[1] or 0)

    # Пришло по реф-ссылкам
    ref_users = (await session.execute(
        select(func.count()).select_from(User).where(
            User.created_at >= since,
            User.referrer_id.isnot(None),
        )
    )).scalar() or 0

    # Реф-бонусов начислено
    ref_bonus_sum = Decimal((await session.execute(
        select(func.coalesce(func.sum(BalanceTransaction.amount), 0)).where(
            BalanceTransaction.created_at >= since,
            BalanceTransaction.reason == REFERRAL_BONUS_REASON,
            BalanceTransaction.type == "credit",
        )
    )).scalar() or 0)

    # Бонусы: начислено / списано всего
    bonus_credit = Decimal((await session.execute(
        select(func.coalesce(func.sum(BalanceTransaction.amount), 0)).where(
            BalanceTransaction.created_at >= since,
            BalanceTransaction.type == "credit",
        )
    )).scalar() or 0)
    bonus_debit = Decimal((await session.execute(
        select(func.coalesce(func.sum(BalanceTransaction.amount), 0)).where(
            BalanceTransaction.created_at >= since,
            BalanceTransaction.type == "debit",
        )
    )).scalar() or 0)

    return {
        "new_users": int(new_users),
        "orders_count": orders_count,
        "orders_sum": orders_sum,
        "paid_count": paid_count,
        "paid_sum": paid_sum,
        "online_count": online_count,
        "online_sum": online_sum,
        "ref_users": int(ref_users),
        "ref_bonus_sum": ref_bonus_sum,
        "bonus_credit": bonus_credit,
        "bonus_debit": bonus_debit,
    }


def _render_period_block(title: str, s: dict) -> str:
    return (
        f"<b>{title}</b>\n"
        f"├ Новых пользователей: {s['new_users']}\n"
        f"├ Заявок: {s['orders_count']} · {_fmt_money(s['orders_sum'])}\n"
        f"├ Оплачено по заявкам периода: {s['paid_count']} · {_fmt_money(s['paid_sum'])}\n"
        f"├ Оплат онлайн (ЮKassa): {s['online_count']} · {_fmt_money(s['online_sum'])}\n"
        f"├ По реф-ссылкам пришло: {s['ref_users']}\n"
        f"├ Реф-бонусов начислено: {_fmt_money(s['ref_bonus_sum'])}\n"
        f"└ Бонусы: +{_fmt_money(s['bonus_credit'])} / −{_fmt_money(s['bonus_debit'])}"
    )


def _render_tree(lines: list[str]) -> str:
    """Оформляет список строк деревом ├/└."""
    if not lines:
        return "└ пока пусто"
    out = []
    for i, line in enumerate(lines):
        prefix = "└" if i == len(lines) - 1 else "├"
        out.append(f"{prefix} {line}")
    return "\n".join(out)


async def _collect_current_state(session: AsyncSession) -> str:
    now = datetime.now(MSK_TZ)

    # Активные заказы по статусам (+ legacy 'confirmed' -> waiting_payment)
    active_statuses = get_active_statuses()
    rows = (await session.execute(
        select(Order.status, func.count()).where(
            Order.status.in_(active_statuses + [LEGACY_CONFIRMED_STATUS])
        ).group_by(Order.status)
    )).all()
    by_status: dict[str, int] = {}
    for status, cnt in rows:
        canonical = canonicalize_order_status(status) or status
        by_status[canonical] = by_status.get(canonical, 0) + int(cnt)

    order_lines: list[str] = []
    total_active = 0
    for status_enum, meta in ORDER_STATUS_META.items():
        cnt = by_status.get(status_enum.value, 0)
        if cnt and meta.get("is_active"):
            total_active += cnt
            emoji = meta.get("emoji", "")
            label = meta.get("short_label", status_enum.value)
            order_lines.append(f"{emoji} {label}: {cnt}".strip())

    # Активные подписки по тарифам
    sub_rows = (await session.execute(
        select(Subscription.tier, func.count()).where(
            Subscription.is_active == True,  # noqa: E712
            Subscription.expires_at > now,
        ).group_by(Subscription.tier)
    )).all()
    sub_lines: list[str] = []
    total_subs = 0
    for tier, cnt in sorted(sub_rows, key=lambda r: r[0]):
        total_subs += int(cnt)
        tier_name = TIERS.get(tier, (0, 0, tier))[2]
        sub_lines.append(f"{html.escape(str(tier_name))}: {cnt}")

    # Топ-3 реферера
    top_rows = (await session.execute(
        select(User.username, User.fullname, User.telegram_id, User.referrals_count)
        .where(User.referrals_count > 0)
        .order_by(User.referrals_count.desc())
        .limit(3)
    )).all()
    top_lines: list[str] = []
    for username, fullname, telegram_id, ref_count in top_rows:
        if username:
            who = f"@{html.escape(username)}"
        elif fullname:
            who = html.escape(fullname)
        else:
            who = f"id{telegram_id}"
        top_lines.append(f"{who} — {ref_count}")

    return (
        f"<b>ТЕКУЩЕЕ СОСТОЯНИЕ</b>\n"
        f"Активные заказы: {total_active}\n"
        f"{_render_tree(order_lines)}\n\n"
        f"Подписки «Салон+»: {total_subs}\n"
        f"{_render_tree(sub_lines)}\n\n"
        f"Топ рефереры:\n"
        f"{_render_tree(top_lines)}"
    )


async def build_dashboard_text(session: AsyncSession) -> str:
    now = datetime.now(MSK_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today = await _collect_period_stats(session, today_start)
    week = await _collect_period_stats(session, now - timedelta(days=7))
    month = await _collect_period_stats(session, now - timedelta(days=30))
    current_state = await _collect_current_state(session)

    return (
        f"<b>👁 Сводка Салона · {now.strftime('%d.%m.%Y %H:%M')} МСК</b>\n\n"
        f"{_render_period_block('СЕГОДНЯ', today)}\n\n"
        f"{_render_period_block('7 ДНЕЙ', week)}\n\n"
        f"{_render_period_block('30 ДНЕЙ', month)}\n\n"
        f"{current_state}"
    )


@router.message(Command("boss", "dashboard"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_boss(message: Message, session: AsyncSession):
    """«Глаз бога»: сводка бизнеса одним сообщением."""
    try:
        text = await build_dashboard_text(session)
    except Exception as e:
        logger.exception("[Boss] Failed to build dashboard")
        try:
            await message.answer(f"Не получилось собрать сводку: {html.escape(str(e))}")
        except Exception:
            pass
        return

    try:
        await message.answer(text, reply_markup=_boss_keyboard())
    except Exception:
        logger.exception("[Boss] Failed to send dashboard")


@router.callback_query(F.data == "boss_refresh", F.from_user.id.in_(settings.ADMIN_IDS))
async def boss_refresh(callback: CallbackQuery, session: AsyncSession):
    """Кнопка «Обновить» — пересобирает сводку в том же сообщении."""
    try:
        text = await build_dashboard_text(session)
    except Exception:
        logger.exception("[Boss] Failed to rebuild dashboard")
        try:
            await callback.answer("Не получилось обновить, попробуйте ещё раз", show_alert=True)
        except Exception:
            pass
        return

    try:
        await callback.message.edit_text(text, reply_markup=_boss_keyboard())
        await callback.answer("Обновлено")
    except Exception as e:
        if "message is not modified" in str(e).lower():
            try:
                await callback.answer("Данные не изменились")
            except Exception:
                pass
        else:
            logger.warning(f"[Boss] Refresh edit failed: {e}")
            try:
                await callback.answer("Не получилось обновить", show_alert=True)
            except Exception:
                pass
