"""add promo_code fields to orders

Revision ID: promo_code_orders
Revises: g0d_m0d3_admin
Create Date: 2025-12-07 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'promo_code_orders'
down_revision: Union[str, None] = 'g0d_m0d3_admin'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add promo_code and promo_discount fields to orders table
    op.add_column('orders', sa.Column('promo_code', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('promo_discount', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('orders', 'promo_discount')
    op.drop_column('orders', 'promo_code')
