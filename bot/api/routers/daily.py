import logging
import random
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    DailyBonusInfoResponse, DailyBonusClaimResponse, RouletteResponse
)
from bot.api.rate_limit import rate_limit_roulette
from bot.services.bonus import BonusService, BonusReason
from bot.services.mini_app_logger import log_roulette_spin
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Daily & Roulette"])

# ═══════════════════════════════════════════════════════════════════════════
#  ROULETTE
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/roulette/spin", response_model=RouletteResponse)
async def spin_roulette(
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Элитный Клуб - испытай удачу!
    БЕЗ ЛИМИТА - крутить можно сколько угодно
    Шанс выигрыша крайне низкий - это элитный клуб!
    """
    await rate_limit_roulette.check(request)

    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prizes = [
        {"prize": "ДЖЕКПОТ 50000₽", "type": "jackpot", "value": 50000, "weight": 1},
        {"prize": "МЕГА-ПРИЗ 10000₽", "type": "bonus", "value": 10000, "weight": 10},
        {"prize": "СУПЕР-ПРИЗ 5000₽", "type": "bonus", "value": 5000, "weight": 100},
        {"prize": "КРУПНЫЙ 1000₽", "type": "bonus", "value": 1000, "weight": 1000},
        {"prize": "ХОРОШИЙ 500₽", "type": "bonus", "value": 500, "weight": 10000},
        {"prize": "БОНУС 100₽", "type": "bonus", "value": 100, "weight": 100000},
        {"prize": "Не повезло", "type": "nothing", "value": 0, "weight": 9888889},
    ]

    total_weight = sum(p["weight"] for p in prizes)
    rand = random.randint(1, total_weight)
    cumulative = 0
    selected = prizes[-1]
    for prize in prizes:
        cumulative += prize["weight"]
        if rand <= cumulative:
            selected = prize
            break

    if selected["type"] in ("bonus", "jackpot") and selected["value"] > 0:
        user.balance = (user.balance or 0) + selected["value"]
        user.last_bonus_at = datetime.now(ZoneInfo("Europe/Moscow"))
        user.bonus_expiry_notified = False

    await session.commit()

    if selected["type"] != "nothing":
        try:
            bot = get_bot()
            await log_roulette_spin(
                bot=bot,
                user_id=user.telegram_id,
                username=user.username,
                prize=selected["prize"],
                prize_type=selected["type"],
                value=selected["value"],
            )

            if selected["value"] > 0:
                from bot.services.realtime_notifications import send_balance_notification
                await send_balance_notification(
                    telegram_id=user.telegram_id,
                    change=round(float(selected["value"]), 2),
                    new_balance=round(float(user.balance), 2),
                    reason=f"Выигрыш в рулетке: {selected['prize']}",
                    reason_key="roulette_win"
                )
        except Exception as e:
            logger.warning(f"Roulette Log Error: {e}")

    message = f"Поздравляем! Ты выиграл {selected['value']}₽!" if selected["value"] > 0 else "Не повезло! Попробуй ещё раз!"

    return RouletteResponse(
        success=True,
        prize=selected["prize"],
        type=selected["type"],
        value=selected["value"],
        message=message,
        next_spin_at=None
    )

# ═══════════════════════════════════════════════════════════════════════════
#  DAILY BONUS
# ═══════════════════════════════════════════════════════════════════════════

DAILY_BONUS_AMOUNTS = [10, 20, 30, 40, 50, 100, 150]
DAILY_BONUS_WIN_CHANCE = 0.5

@router.get("/daily-bonus/info", response_model=DailyBonusInfoResponse)
async def get_daily_bonus_info(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    streak = getattr(user, 'daily_bonus_streak', 0) or 0
    last_claim = user.last_daily_bonus_at

    can_claim = True
    cooldown_remaining = None

    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)

        next_claim = last_claim + timedelta(hours=24)
        if now < next_claim:
            can_claim = False
            remaining = next_claim - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            cooldown_remaining = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"

        if now > last_claim + timedelta(hours=48):
            streak = 0

    if can_claim:
        current_day = (streak % 7) + 1
    else:
        current_day = ((streak - 1) % 7) + 1 if streak > 0 else 1

    next_bonus = DAILY_BONUS_AMOUNTS[current_day - 1] if can_claim else (
        DAILY_BONUS_AMOUNTS[current_day % 7] if streak > 0 else DAILY_BONUS_AMOUNTS[0]
    )

    return DailyBonusInfoResponse(
        can_claim=can_claim,
        streak=current_day if not can_claim else current_day,
        next_bonus=next_bonus,
        cooldown_remaining=cooldown_remaining,
        bonuses=DAILY_BONUS_AMOUNTS
    )

@router.post("/daily-bonus/claim", response_model=DailyBonusClaimResponse)
async def claim_daily_bonus(
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await rate_limit_roulette.check(request)
    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    streak = getattr(user, 'daily_bonus_streak', 0) or 0
    last_claim = user.last_daily_bonus_at

    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        
        next_claim_time = last_claim + timedelta(hours=24)
        if now < next_claim_time:
            # Reconstruct cooldown message
            remaining = next_claim_time - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            cooldown_text = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"
            return DailyBonusClaimResponse(
                success=False, won=False, bonus=0, streak=((streak - 1) % 7) + 1 if streak > 0 else 0,
                message=f"Бонус уже получен. Следующий через {cooldown_text}",
                next_claim_at=next_claim_time.isoformat()
            )

        if now > last_claim + timedelta(hours=48):
            streak = 0

    current_day_index = streak % 7
    bonus_amount = DAILY_BONUS_AMOUNTS[current_day_index]
    won = random.random() < DAILY_BONUS_WIN_CHANCE

    user.daily_bonus_streak = streak + 1
    user.last_daily_bonus_at = now

    if won:
        await BonusService.add_bonus(
            session=session, user_id=tg_user.id, amount=bonus_amount, reason=BonusReason.DAILY_LUCK,
            description="Ежедневный бонус", bot=None, auto_commit=False,
        )

    await session.commit()
    next_claim_at = (now + timedelta(hours=24)).isoformat()

    return DailyBonusClaimResponse(
        success=True, won=won, bonus=bonus_amount if won else 0,
        streak=(current_day_index + 1),
        message=f"Поздравляем! Ты выиграл {bonus_amount}₽!" if won else "Не повезло! Попробуй завтра!",
        next_claim_at=next_claim_at
    )
