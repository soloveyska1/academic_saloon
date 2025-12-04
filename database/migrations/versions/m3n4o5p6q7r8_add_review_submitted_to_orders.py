"""add_review_submitted_and_files_url_to_orders

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2025-12-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'm3n4o5p6q7r8'
down_revision: Union[str, None] = 'l2m3n4o5p6q7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('review_submitted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('orders', sa.Column('files_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'files_url')
    op.drop_column('orders', 'review_submitted')
