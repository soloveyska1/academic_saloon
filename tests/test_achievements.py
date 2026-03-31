import os
import pathlib
import sys
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

REQUIRED_ENV = {
    "BOT_TOKEN": "test",
    "BOT_USERNAME": "test_bot",
    "ADMIN_IDS": "[]",
    "PAYMENT_PHONE": "0000000000",
    "PAYMENT_CARD": "0000000000000000",
    "PAYMENT_BANKS": "test_bank",
    "PAYMENT_NAME": "Test User",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "POSTGRES_DB": "test",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_DB_FSM": "0",
    "REDIS_DB_CACHE": "1",
}

for key, value in REQUIRED_ENV.items():
    os.environ.setdefault(key, value)

from bot.services.achievements import sync_user_achievements
from database.db import Base
from database.models.achievements import UserAchievement
from database.models.orders import Order, OrderStatus
from database.models.transactions import BalanceTransaction
from database.models.users import User


pytest.importorskip("aiosqlite")


@pytest.mark.asyncio
async def test_sync_user_achievements_unlocks_and_rewards_only_once():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as session:
        user = User(
            telegram_id=111,
            username="tester",
            fullname="Tester",
            referrals_count=1,
            daily_bonus_streak=7,
        )
        session.add(user)
        session.add(
            Order(
                user_id=111,
                work_type="essay",
                status=OrderStatus.COMPLETED.value,
                price=Decimal("12000.00"),
                paid_amount=Decimal("12000.00"),
                payment_scheme="full",
                promo_code="SAVE10",
                review_submitted=True,
                revision_count=0,
            )
        )
        await session.commit()

        achievements = await sync_user_achievements(session, 111, notify=False)
        unlocked_keys = {item["key"] for item in achievements if item["unlocked"]}

        assert {
            "first_paid_order",
            "full_payment_first",
            "promo_first",
            "first_referral",
            "streak_7",
            "spent_10000",
            "perfect_first",
            "review_first",
        }.issubset(unlocked_keys)

        tx_result = await session.execute(
            select(BalanceTransaction).where(BalanceTransaction.user_id == 111)
        )
        transactions = tx_result.scalars().all()
        assert len(transactions) == 8
        assert all(tx.reason == "achievement" for tx in transactions)

        unlock_result = await session.execute(
            select(UserAchievement).where(UserAchievement.user_id == 111)
        )
        unlocks = unlock_result.scalars().all()
        assert len(unlocks) == 8

        refreshed_user = await session.scalar(select(User).where(User.telegram_id == 111))
        assert int(refreshed_user.balance) == 625

        achievements_second_pass = await sync_user_achievements(session, 111, notify=False)
        unlocked_again = {item["key"] for item in achievements_second_pass if item["unlocked"]}
        assert unlocked_again == unlocked_keys

        tx_result_after = await session.execute(
            select(BalanceTransaction).where(BalanceTransaction.user_id == 111)
        )
        assert len(tx_result_after.scalars().all()) == 8

    await engine.dispose()


@pytest.mark.asyncio
async def test_sync_user_achievements_returns_progress_for_locked_items():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as session:
        user = User(
            telegram_id=222,
            username="progress",
            fullname="Progress User",
            daily_bonus_streak=4,
        )
        session.add(user)
        session.add(
            Order(
                user_id=222,
                work_type="essay",
                status=OrderStatus.PAID.value,
                price=Decimal("2000.00"),
                paid_amount=Decimal("2000.00"),
                payment_scheme="half",
            )
        )
        await session.commit()

        achievements = await sync_user_achievements(session, 222, notify=False)
        achievement_map = {item["key"]: item for item in achievements}

        three_paid = achievement_map["three_paid_orders"]
        assert three_paid["unlocked"] is False
        assert three_paid["current"] == 1
        assert three_paid["target"] == 3
        assert three_paid["progress"] == pytest.approx(1 / 3, rel=1e-2)
        assert three_paid["hint"] == "Ещё 2 заказа"

        streak = achievement_map["streak_7"]
        assert streak["unlocked"] is False
        assert streak["current"] == 4
        assert streak["target"] == 7
        assert streak["hint"] == "Ещё 3 дня"

    await engine.dispose()
