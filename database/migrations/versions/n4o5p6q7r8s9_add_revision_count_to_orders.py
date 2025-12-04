"""add revision_count to orders

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2024-12-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n4o5p6q7r8s9'
down_revision: Union[str, None] = 'm3n4o5p6q7r8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('revision_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('orders', 'revision_count')
