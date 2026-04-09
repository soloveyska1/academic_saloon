"""add order lifecycle events

Revision ID: e1f2a3b4c5d6
Revises: d0a1b2c3d4e5
Create Date: 2026-04-08 18:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_lifecycle_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("status_from", sa.String(length=20), nullable=False),
        sa.Column("status_to", sa.String(length=20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("dispatch_status", sa.String(length=20), nullable=False),
        sa.Column("dispatch_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_order_lifecycle_events_dispatch_status",
        "order_lifecycle_events",
        ["dispatch_status"],
        unique=False,
    )
    op.create_index(
        "ix_order_lifecycle_events_event_type",
        "order_lifecycle_events",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        "ix_order_lifecycle_events_order_id",
        "order_lifecycle_events",
        ["order_id"],
        unique=False,
    )
    op.create_index(
        "ix_order_lifecycle_events_user_id",
        "order_lifecycle_events",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_order_lifecycle_events_user_id", table_name="order_lifecycle_events")
    op.drop_index("ix_order_lifecycle_events_order_id", table_name="order_lifecycle_events")
    op.drop_index("ix_order_lifecycle_events_event_type", table_name="order_lifecycle_events")
    op.drop_index("ix_order_lifecycle_events_dispatch_status", table_name="order_lifecycle_events")
    op.drop_table("order_lifecycle_events")
