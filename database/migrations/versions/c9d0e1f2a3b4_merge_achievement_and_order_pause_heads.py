"""merge achievement and order pause heads

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2, x4y5z6a7b8
Create Date: 2026-04-01 02:03:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = ("b7c8d9e0f1a2", "x4y5z6a7b8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
