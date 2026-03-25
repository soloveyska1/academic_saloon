"""add order pause fields

Revision ID: x4y5z6a7b8
Revises: w3x4y5z6a7
Create Date: 2026-03-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'x4y5z6a7b8'
down_revision: Union[str, None] = 'w3x4y5z6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('paused_from_status', sa.String(length=20), nullable=True))
    op.add_column('orders', sa.Column('pause_started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('pause_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('pause_reason', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('pause_days_used', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('orders', 'pause_days_used')
    op.drop_column('orders', 'pause_reason')
    op.drop_column('orders', 'pause_until')
    op.drop_column('orders', 'pause_started_at')
    op.drop_column('orders', 'paused_from_status')
