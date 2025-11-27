"""add_referral_and_loyalty_fields

Revision ID: 45637324814e
Revises: 7fec4f536a7e
Create Date: 2024-XX-XX

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '45637324814e'
down_revision: Union[str, None] = '7fec4f536a7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем колонки с server_default, чтобы заполнить существующие строки
    op.add_column('users', sa.Column('referrer_id', sa.BigInteger(), nullable=True))
    op.add_column('users', sa.Column('referrals_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('referral_earnings', sa.Float(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('orders_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('total_spent', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'total_spent')
    op.drop_column('users', 'orders_count')
    op.drop_column('users', 'referral_earnings')
    op.drop_column('users', 'referrals_count')
    op.drop_column('users', 'referrer_id')