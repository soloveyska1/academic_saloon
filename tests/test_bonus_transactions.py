import os
import pathlib
import sys

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

from bot.services.bonus import BonusService, BonusReason
from database.db import Base
from database.models.transactions import BalanceTransaction
from database.models.users import User


pytest.importorskip("aiosqlite")


@pytest.mark.asyncio
async def test_bonus_transaction_persists():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as session:
        user = User(telegram_id=1, username="test", fullname="Test User")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        await BonusService.add_bonus(
            session=session,
            user_id=user.telegram_id,
            amount=100,
            reason=BonusReason.COMPENSATION,
            description="test bonus",
        )

        result = await session.execute(
            select(BalanceTransaction).where(BalanceTransaction.user_id == user.telegram_id)
        )
        transactions = result.scalars().all()

        assert len(transactions) == 1
        assert transactions[0].amount == 100

        refreshed_user = await session.get(User, user.id)
        assert refreshed_user.balance == 100

    await engine.dispose()

