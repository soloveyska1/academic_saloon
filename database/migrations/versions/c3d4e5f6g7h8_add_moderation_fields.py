"""add moderation fields

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-11-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поля модерации
    op.add_column('users', sa.Column('is_banned', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('banned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('ban_reason', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('is_watched', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('admin_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'admin_notes')
    op.drop_column('users', 'is_watched')
    op.drop_column('users', 'ban_reason')
    op.drop_column('users', 'banned_at')
    op.drop_column('users', 'is_banned')
