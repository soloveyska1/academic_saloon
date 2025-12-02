"""add_topic_id_to_conversations

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2025-12-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'j0k1l2m3n4o5'
down_revision: Union[str, None] = 'i9j0k1l2m3n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column('topic_id', sa.BigInteger(), nullable=True))
    op.create_index(op.f('ix_conversations_topic_id'), 'conversations', ['topic_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_conversations_topic_id'), table_name='conversations')
    op.drop_column('conversations', 'topic_id')
