"""add topic header message id

Revision ID: f3b4c5d6e7f8
Revises: e1f2a3b4c5d6
Create Date: 2026-04-08 21:15:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3b4c5d6e7f8"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("topic_header_message_id", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("conversations", "topic_header_message_id")
