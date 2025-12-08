"""Add soft delete fields to promocode_usages

Adds is_active and returned_at fields to support promo code return
when orders are cancelled.

Revision ID: promo_usage_soft_delete
Revises: promo_code_orders
Create Date: 2024-12-08
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'promo_usage_soft_delete'
down_revision = 'promo_code_orders'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_active column with default True
    op.add_column(
        'promocode_usages',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true')
    )

    # Add returned_at column (nullable - only set when promo is returned)
    op.add_column(
        'promocode_usages',
        sa.Column('returned_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Add index on is_active for faster queries
    op.create_index(
        'ix_promocode_usages_is_active',
        'promocode_usages',
        ['is_active']
    )

    # Add composite index for checking user usage (used frequently)
    op.create_index(
        'ix_promocode_usages_user_promo_active',
        'promocode_usages',
        ['user_id', 'promocode_id', 'is_active']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_promocode_usages_user_promo_active', table_name='promocode_usages')
    op.drop_index('ix_promocode_usages_is_active', table_name='promocode_usages')

    # Drop columns
    op.drop_column('promocode_usages', 'returned_at')
    op.drop_column('promocode_usages', 'is_active')
