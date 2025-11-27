"""add_orders_table

Revision ID: a1b2c3d4e5f6
Revises: 45637324814e
Create Date: 2025-11-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '45637324814e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('orders',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('work_type', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('topic', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('deadline', sa.String(length=100), nullable=True),
        sa.Column('price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('paid_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.telegram_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_table('orders')
