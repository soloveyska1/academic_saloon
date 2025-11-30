"""add_daily_bonus_field

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2024-XX-XX

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, None] = 'f6g7h8i9j0k1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле для отслеживания последнего ежедневного бонуса
    op.add_column('users', sa.Column('last_daily_bonus_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_daily_bonus_at')
