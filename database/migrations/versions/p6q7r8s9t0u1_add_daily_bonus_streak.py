"""add daily_bonus_streak field

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0, d1e2f3g4h5i6
Create Date: 2024-12-04 15:00:00.000000

This migration merges two branches:
- o5p6q7r8s9t0 (bonus expiry fields)
- d1e2f3g4h5i6 (delivered_at to orders)

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p6q7r8s9t0u1'
down_revision: Union[str, Sequence[str], None] = ('o5p6q7r8s9t0', 'd1e2f3g4h5i6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле для отслеживания стрика ежедневного бонуса
    op.add_column('users', sa.Column('daily_bonus_streak', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'daily_bonus_streak')
