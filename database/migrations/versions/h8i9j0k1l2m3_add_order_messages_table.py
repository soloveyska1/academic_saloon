"""add_order_messages_table

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2025-12-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'h8i9j0k1l2m3'
down_revision: Union[str, None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('order_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('sender_type', sa.String(length=20), nullable=False),
        sa.Column('sender_id', sa.BigInteger(), nullable=False),
        sa.Column('message_text', sa.Text(), nullable=True),
        sa.Column('file_type', sa.String(length=20), nullable=True),
        sa.Column('file_id', sa.String(length=255), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('yadisk_url', sa.String(length=500), nullable=True),
        sa.Column('admin_message_id', sa.BigInteger(), nullable=True),
        sa.Column('client_message_id', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_messages_order_id'), 'order_messages', ['order_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_order_messages_order_id'), table_name='order_messages')
    op.drop_table('order_messages')
