"""Add payment fields to orders

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: Union[str, None] = 'e5f6g7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поля для схемы и способа оплаты
    op.add_column('orders', sa.Column('payment_scheme', sa.String(20), nullable=True))
    op.add_column('orders', sa.Column('payment_method', sa.String(20), nullable=True))
    op.add_column('orders', sa.Column('yookassa_payment_id', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'yookassa_payment_id')
    op.drop_column('orders', 'payment_method')
    op.drop_column('orders', 'payment_scheme')
