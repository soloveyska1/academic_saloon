"""add_progress_to_orders

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2025-12-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'l2m3n4o5p6q7'
down_revision: Union[str, None] = 'k1l2m3n4o5p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('progress', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('progress_updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'progress_updated_at')
    op.drop_column('orders', 'progress')
