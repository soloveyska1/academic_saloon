"""add user achievements table

Revision ID: b7c8d9e0f1a2
Revises: d4e5f6g7h8i9
Create Date: 2026-04-01 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7c8d9e0f1a2"
down_revision = "d4e5f6g7h8i9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("achievement_key", sa.String(length=100), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.telegram_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement_user_key"),
    )
    op.create_index("ix_user_achievements_user_id", "user_achievements", ["user_id"], unique=False)
    op.create_index("ix_user_achievements_achievement_key", "user_achievements", ["achievement_key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_achievements_achievement_key", table_name="user_achievements")
    op.drop_index("ix_user_achievements_user_id", table_name="user_achievements")
    op.drop_table("user_achievements")
