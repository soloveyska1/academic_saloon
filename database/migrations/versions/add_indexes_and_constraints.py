"""Add indexes and CHECK constraints for data integrity

Adds:
- Indexes on Order.status, Order.created_at for faster queries
- Indexes on PromoCodeUsage FK columns
- CHECK constraints on progress, discount, balance fields

Revision ID: add_indexes_constraints
Revises: promo_usage_soft_delete
Create Date: 2024-12-25
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_indexes_constraints'
down_revision = 'promo_usage_soft_delete'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ══════════════════════════════════════════════════════════════
    #                    INDEXES
    # ══════════════════════════════════════════════════════════════

    # Order.status - frequently used in filters
    op.create_index(
        'ix_orders_status',
        'orders',
        ['status']
    )

    # Order.created_at - used for sorting and date range queries
    op.create_index(
        'ix_orders_created_at',
        'orders',
        ['created_at']
    )

    # PromoCodeUsage FK indexes (missing from original migration)
    op.create_index(
        'ix_promocode_usages_promocode_id',
        'promocode_usages',
        ['promocode_id']
    )

    op.create_index(
        'ix_promocode_usages_order_id',
        'promocode_usages',
        ['order_id']
    )

    # ══════════════════════════════════════════════════════════════
    #                    CHECK CONSTRAINTS
    # ══════════════════════════════════════════════════════════════

    # Order.progress must be 0-100
    op.create_check_constraint(
        'ck_orders_progress_range',
        'orders',
        'progress >= 0 AND progress <= 100'
    )

    # Order.discount must be >= 0
    op.create_check_constraint(
        'ck_orders_discount_positive',
        'orders',
        'discount >= 0'
    )

    # Order.promo_discount must be >= 0
    op.create_check_constraint(
        'ck_orders_promo_discount_positive',
        'orders',
        'promo_discount >= 0'
    )

    # Order.bonus_used must be >= 0
    op.create_check_constraint(
        'ck_orders_bonus_used_positive',
        'orders',
        'bonus_used >= 0'
    )

    # Order.paid_amount must be >= 0
    op.create_check_constraint(
        'ck_orders_paid_amount_positive',
        'orders',
        'paid_amount >= 0'
    )

    # User.balance must be >= 0
    op.create_check_constraint(
        'ck_users_balance_positive',
        'users',
        'balance >= 0'
    )

    # User.referrals_count must be >= 0
    op.create_check_constraint(
        'ck_users_referrals_count_positive',
        'users',
        'referrals_count >= 0'
    )

    # User.total_spent must be >= 0
    op.create_check_constraint(
        'ck_users_total_spent_positive',
        'users',
        'total_spent >= 0'
    )

    # PromoCode.discount_percent must be 0-100
    op.create_check_constraint(
        'ck_promocodes_discount_percent_range',
        'promocodes',
        'discount_percent >= 0 AND discount_percent <= 100'
    )

    # PromoCode.current_uses must be >= 0
    op.create_check_constraint(
        'ck_promocodes_current_uses_positive',
        'promocodes',
        'current_uses >= 0'
    )


def downgrade() -> None:
    # Drop CHECK constraints
    op.drop_constraint('ck_promocodes_current_uses_positive', 'promocodes', type_='check')
    op.drop_constraint('ck_promocodes_discount_percent_range', 'promocodes', type_='check')
    op.drop_constraint('ck_users_total_spent_positive', 'users', type_='check')
    op.drop_constraint('ck_users_referrals_count_positive', 'users', type_='check')
    op.drop_constraint('ck_users_balance_positive', 'users', type_='check')
    op.drop_constraint('ck_orders_paid_amount_positive', 'orders', type_='check')
    op.drop_constraint('ck_orders_bonus_used_positive', 'orders', type_='check')
    op.drop_constraint('ck_orders_promo_discount_positive', 'orders', type_='check')
    op.drop_constraint('ck_orders_discount_positive', 'orders', type_='check')
    op.drop_constraint('ck_orders_progress_range', 'orders', type_='check')

    # Drop indexes
    op.drop_index('ix_promocode_usages_order_id', table_name='promocode_usages')
    op.drop_index('ix_promocode_usages_promocode_id', table_name='promocode_usages')
    op.drop_index('ix_orders_created_at', table_name='orders')
    op.drop_index('ix_orders_status', table_name='orders')
