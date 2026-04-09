"""canonicalize confirmed order status

Revision ID: d0a1b2c3d4e5
Revises: c9d0e1f2a3b4
Create Date: 2026-04-08 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d0a1b2c3d4e5"
down_revision: Union[str, None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE orders
            SET status = 'waiting_payment'
            WHERE status = 'confirmed'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE orders
            SET paused_from_status = 'waiting_payment'
            WHERE paused_from_status = 'confirmed'
            """
        )
    )


def downgrade() -> None:
    # Irreversible data canonicalization.
    pass
