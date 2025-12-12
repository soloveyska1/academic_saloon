"""add is_archived to orders

Revision ID: t8u9v0w1x2
Revises: promo_code_orders
Create Date: 2025-12-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 't8u9v0w1x2'
down_revision: Union[str, None] = 'promo_code_orders'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_archived field to orders table for hiding old orders from main list
    op.add_column('orders', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('orders', 'is_archived')
