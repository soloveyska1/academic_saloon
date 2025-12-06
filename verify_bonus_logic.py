"""Temporary script to validate bonus accrual logic against DB-backed rank levels.

This script is self contained and spins up a local SQLite database, seeds the
rank/loyalty configuration from the migration defaults, and verifies that
`BonusService.add_order_cashback` credits the expected cashback amount for a
user in the configured tier.
"""

import asyncio
import os
import time
from typing import Sequence

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker

# ─── Bootstrap minimal environment so core.config.Settings validation passes ──
_ENV_DEFAULTS: dict[str, str] = {
    "BOT_TOKEN": "dummy-token",
    "BOT_USERNAME": "dummy_bot",
    "ADMIN_IDS": "[1]",
    "PAYMENT_PHONE": "0000000000",
    "PAYMENT_CARD": "0000 0000 0000 0000",
    "PAYMENT_BANKS": "TestBank",
    "PAYMENT_NAME": "Tester",
    "POSTGRES_USER": "user",
    "POSTGRES_PASSWORD": "password",
    "POSTGRES_DB": "db",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_DB_FSM": "0",
    "REDIS_DB_CACHE": "1",
}

for key, value in _ENV_DEFAULTS.items():
    os.environ.setdefault(key, value)

from bot.services.bonus import BonusReason, BonusService  # noqa: E402
from database.db import Base  # noqa: E402
from database.models.levels import LoyaltyLevel, RankLevel  # noqa: E402
from database.models.transactions import BalanceTransaction  # noqa: E402
from database.models.users import User  # noqa: E402


RANK_SEED: Sequence[dict] = (
    {"name": "Салага", "emoji": "🐣", "min_spent": 0, "cashback_percent": 0, "bonus": None},
    {"name": "Ковбой", "emoji": "🤠", "min_spent": 5000, "cashback_percent": 3, "bonus": None},
    {"name": "Головорез", "emoji": "🔫", "min_spent": 20000, "cashback_percent": 5, "bonus": "Приоритетная поддержка"},
    {"name": "Легенда Запада", "emoji": "👑", "min_spent": 50000, "cashback_percent": 10, "bonus": "Персональный менеджер"},
)

LOYALTY_SEED: Sequence[dict] = (
    {"name": "Резидент", "emoji": "🌵", "min_orders": 0, "discount_percent": 0},
    {"name": "Партнёр", "emoji": "🤝", "min_orders": 3, "discount_percent": 3},
    {"name": "VIP-Клиент", "emoji": "⭐", "min_orders": 7, "discount_percent": 5},
    {"name": "Премиум", "emoji": "👑", "min_orders": 15, "discount_percent": 10},
)


class AsyncSessionWrapper:
    """Lightweight async facade over a synchronous SQLAlchemy session."""

    def __init__(self, sync_session):
        self._sync = sync_session

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if exc:
            self._sync.rollback()
        self._sync.close()

    def add(self, obj):
        self._sync.add(obj)

    def add_all(self, objs):
        self._sync.add_all(objs)

    async def execute(self, *args, **kwargs):
        return self._sync.execute(*args, **kwargs)

    async def commit(self):
        self._sync.commit()

    async def rollback(self):
        self._sync.rollback()


async def ensure_seed_data(session: AsyncSessionWrapper) -> None:
    rank_count = (
        await session.execute(select(func.count()).select_from(RankLevel))
    ).scalar_one()
    loyalty_count = (
        await session.execute(select(func.count()).select_from(LoyaltyLevel))
    ).scalar_one()

    if rank_count == 0:
        session.add_all(RankLevel(**row) for row in RANK_SEED)

    if loyalty_count == 0:
        session.add_all(LoyaltyLevel(**row) for row in LOYALTY_SEED)

    if rank_count == 0 or loyalty_count == 0:
        await session.commit()


async def run_verification() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///./verify_bonus_logic.db", echo=False, future=True
    )
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

    async with AsyncSessionWrapper(SessionLocal()) as session:
        await ensure_seed_data(session)

        ranks = (
            await session.execute(select(RankLevel).order_by(RankLevel.min_spent))
        ).scalars().all()

        print("== RankLevel rows ==")
        for row in ranks:
            print(
                f"{row.id}: {row.emoji} {row.name} | min_spent={row.min_spent} | "
                f"cashback={row.cashback_percent}%"
            )

        assert ranks, "RankLevel table is empty"

        target_spent = 5000
        expected_percent = await BonusService._get_cashback_percent(session, target_spent)

        telegram_id = int(time.time())
        new_user = User(
            telegram_id=telegram_id,
            username="verify_bonus_user",
            fullname="Verify Bonus",
            total_spent=target_spent,
            orders_count=0,
            balance=0.0,
        )
        session.add(new_user)
        await session.commit()

        order_amount = 1000
        credited = await BonusService.add_order_cashback(
            session=session,
            bot=None,  # Notifications are skipped in this isolated run
            user_id=telegram_id,
            order_id=1,
            order_amount=order_amount,
        )

        tx = (
            await session.execute(
                select(BalanceTransaction)
                .where(BalanceTransaction.user_id == telegram_id)
                .order_by(BalanceTransaction.id.desc())
            )
        ).scalars().first()

        expected_bonus = order_amount * expected_percent / 100
        actual_bonus = tx.amount if tx else 0

        if tx and abs(actual_bonus - expected_bonus) < 1e-6:
            print(
                "PASS: Cashback credited correctly | "
                f"percent={expected_percent}% | expected={expected_bonus} | got={actual_bonus}"
            )
        else:
            print(
                "FAIL: Cashback mismatch | "
                f"percent={expected_percent}% | expected={expected_bonus} | got={actual_bonus}"
            )

    engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_verification())
