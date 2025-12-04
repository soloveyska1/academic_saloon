"""add delivered_at to orders

Revision ID: d1e2f3g4h5i6
Revises: m3n4o5p6q7r8
Create Date: 2025-12-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, None] = 'm3n4o5p6q7r8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле delivered_at для отслеживания времени сдачи работы
    # (начало 30-дневного периода на правки)
    op.add_column('orders', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'delivered_at')
