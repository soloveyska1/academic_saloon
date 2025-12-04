"""add bonus expiry fields

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2024-12-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'o5p6q7r8s9t0'
down_revision: Union[str, None] = 'n4o5p6q7r8s9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Дата последнего начисления бонусов (для расчёта сгорания)
    op.add_column('users', sa.Column('last_bonus_at', sa.DateTime(timezone=True), nullable=True))
    # Флаг, было ли отправлено уведомление о скором сгорании
    op.add_column('users', sa.Column('bonus_expiry_notified', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'bonus_expiry_notified')
    op.drop_column('users', 'last_bonus_at')
