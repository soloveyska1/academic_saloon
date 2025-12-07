"""add admin action logs and user activities tables

Revision ID: g0d_m0d3_admin
Revises: s7t8u9v0w1
Create Date: 2025-12-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g0d_m0d3_admin'
down_revision: Union[str, None] = 's7t8u9v0w1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Admin Action Logs - audit trail for all admin actions
    op.create_table(
        'admin_action_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('admin_id', sa.BigInteger(), nullable=False),
        sa.Column('admin_username', sa.String(length=100), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=20), nullable=True),
        sa.Column('target_id', sa.BigInteger(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('old_value', sa.JSON(), nullable=True),
        sa.Column('new_value', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_action_logs_admin_id'), 'admin_action_logs', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_action_type'), 'admin_action_logs', ['action_type'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_target_id'), 'admin_action_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_created_at'), 'admin_action_logs', ['created_at'], unique=False)

    # User Activities - real-time tracking for live monitoring
    op.create_table(
        'user_activities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('telegram_id', sa.BigInteger(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('fullname', sa.String(length=255), nullable=True),
        sa.Column('current_page', sa.String(length=100), nullable=True),
        sa.Column('current_action', sa.String(length=100), nullable=True),
        sa.Column('current_order_id', sa.Integer(), nullable=True),
        sa.Column('session_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_online', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_activities_telegram_id'), 'user_activities', ['telegram_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_activities_telegram_id'), table_name='user_activities')
    op.drop_table('user_activities')
    op.drop_index(op.f('ix_admin_action_logs_created_at'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_target_id'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_action_type'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_admin_id'), table_name='admin_action_logs')
    op.drop_table('admin_action_logs')
