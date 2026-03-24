"""Add streak_freeze_count to users table

Revision ID: w3x4y5z6a7
Revises: v2w3x4y5z6
Create Date: 2026-03-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'w3x4y5z6a7'
down_revision: Union[str, None] = 'v2w3x4y5z6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('streak_freeze_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'streak_freeze_count')
