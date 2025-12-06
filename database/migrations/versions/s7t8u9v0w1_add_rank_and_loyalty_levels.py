"""add rank and loyalty level configuration tables

Revision ID: s7t8u9v0w1
Revises: r1s2t3u4v5
Create Date: 2025-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert


revision: str = "s7t8u9v0w1"
down_revision: Union[str, None] = "r1s2t3u4v5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    rank_levels = op.create_table(
        "rank_levels",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("emoji", sa.String(length=10), nullable=False),
        sa.Column("min_spent", sa.Float(), nullable=False),
        sa.Column("cashback_percent", sa.Float(), nullable=False, server_default="0"),
        sa.Column("bonus", sa.String(length=255), nullable=True),
    )

    loyalty_levels = op.create_table(
        "loyalty_levels",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("emoji", sa.String(length=10), nullable=False),
        sa.Column("min_orders", sa.Integer(), nullable=False),
        sa.Column("discount_percent", sa.Float(), nullable=False, server_default="0"),
    )

    # Seed defaults to mirror legacy hardcoded levels. Inserts are guarded to remain
    # idempotent if the migration is accidentally re-run.
    bind = op.get_bind()

    rank_table = sa.table(
        "rank_levels",
        sa.column("name", sa.String),
        sa.column("emoji", sa.String),
        sa.column("min_spent", sa.Float),
        sa.column("cashback_percent", sa.Float),
        sa.column("bonus", sa.String),
    )
    rank_exists = bind.execute(
        sa.select(sa.func.count()).select_from(rank_table)
    ).scalar_one()
    if rank_exists == 0:
        bind.execute(
            pg_insert(rank_table)
            .values(
                [
                    {
                        "name": "Салага",
                        "emoji": "🐣",
                        "min_spent": 0,
                        "cashback_percent": 0,
                        "bonus": None,
                    },
                    {
                        "name": "Ковбой",
                        "emoji": "🤠",
                        "min_spent": 5000,
                        "cashback_percent": 3,
                        "bonus": None,
                    },
                    {
                        "name": "Головорез",
                        "emoji": "🔫",
                        "min_spent": 20000,
                        "cashback_percent": 5,
                        "bonus": "Приоритетная поддержка",
                    },
                    {
                        "name": "Легенда Запада",
                        "emoji": "👑",
                        "min_spent": 50000,
                        "cashback_percent": 10,
                        "bonus": "Персональный менеджер",
                    },
                ]
            )
            .on_conflict_do_nothing(index_elements=["name"])
        )

    loyalty_table = sa.table(
        "loyalty_levels",
        sa.column("name", sa.String),
        sa.column("emoji", sa.String),
        sa.column("min_orders", sa.Integer),
        sa.column("discount_percent", sa.Float),
    )
    loyalty_exists = bind.execute(
        sa.select(sa.func.count()).select_from(loyalty_table)
    ).scalar_one()
    if loyalty_exists == 0:
        bind.execute(
            pg_insert(loyalty_table)
            .values(
                [
                    {"name": "Резидент", "emoji": "🌵", "min_orders": 0, "discount_percent": 0},
                    {"name": "Партнёр", "emoji": "🤝", "min_orders": 3, "discount_percent": 3},
                    {"name": "VIP-Клиент", "emoji": "⭐", "min_orders": 7, "discount_percent": 5},
                    {"name": "Премиум", "emoji": "👑", "min_orders": 15, "discount_percent": 10},
                ]
            )
            .on_conflict_do_nothing(index_elements=["name"])
        )


def downgrade() -> None:
    op.drop_table("loyalty_levels")
    op.drop_table("rank_levels")
