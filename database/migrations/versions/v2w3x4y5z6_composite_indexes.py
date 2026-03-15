"""Add composite indexes for orders table performance

Revision ID: v2w3x4y5z6
Revises: u1v2w3x4y5
Create Date: 2026-03-15
"""
from typing import Sequence, Union

from alembic import op


revision: str = "v2w3x4y5z6"
down_revision: Union[str, None] = "u1v2w3x4y5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Composite indexes for common query patterns:
    # - Fetch user's orders filtered by status (OrdersPage, API list endpoint)
    op.create_index("ix_orders_user_status", "orders", ["user_id", "status"])
    # - Fetch user's orders sorted by creation date (default sort)
    op.create_index("ix_orders_user_created", "orders", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_orders_user_created", "orders")
    op.drop_index("ix_orders_user_status", "orders")
