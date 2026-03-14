"""production hardening: Float->Numeric, PaymentLog, indexes, constraints

Revision ID: u1v2w3x4y5
Revises: t8u9v0w1x2
Create Date: 2026-03-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "u1v2w3x4y5"
down_revision: Union[str, None] = "t8u9v0w1x2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === 1. Float -> Numeric(12,2) for financial precision ===
    # Users table
    op.alter_column("users", "balance",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("users", "referral_earnings",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("users", "total_spent",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")

    # Orders table
    op.alter_column("orders", "price",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("orders", "discount",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("orders", "promo_discount",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("orders", "bonus_used",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")
    op.alter_column("orders", "paid_amount",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False, existing_server_default="0")

    # Balance transactions table
    op.alter_column("balance_transactions", "amount",
                    existing_type=sa.Float(), type_=sa.Numeric(12, 2),
                    existing_nullable=False)

    # === 2. PaymentLog table for webhook idempotency ===
    op.create_table(
        "payment_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("yookassa_payment_id", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === 3. UNIQUE constraint on orders.yookassa_payment_id ===
    op.create_unique_constraint("uq_orders_yookassa_payment_id", "orders", ["yookassa_payment_id"])

    # === 4. Missing indexes ===
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])
    op.create_index("ix_orders_work_type", "orders", ["work_type"])
    op.create_index("ix_balance_transactions_created_at", "balance_transactions", ["created_at"])

    # === 5. CHECK constraints ===
    op.create_check_constraint("ck_orders_progress_range", "orders", "progress >= 0 AND progress <= 100")
    op.create_check_constraint("ck_orders_price_positive", "orders", "price >= 0")
    op.create_check_constraint("ck_orders_discount_range", "orders", "discount >= 0 AND discount <= 100")


def downgrade() -> None:
    # Remove constraints
    op.drop_constraint("ck_orders_discount_range", "orders", type_="check")
    op.drop_constraint("ck_orders_price_positive", "orders", type_="check")
    op.drop_constraint("ck_orders_progress_range", "orders", type_="check")

    # Remove indexes
    op.drop_index("ix_balance_transactions_created_at", "balance_transactions")
    op.drop_index("ix_orders_work_type", "orders")
    op.drop_index("ix_orders_created_at", "orders")
    op.drop_index("ix_orders_status", "orders")

    # Remove unique constraint
    op.drop_constraint("uq_orders_yookassa_payment_id", "orders", type_="unique")

    # Drop PaymentLog table
    op.drop_table("payment_logs")

    # Revert Numeric -> Float
    op.alter_column("balance_transactions", "amount",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float(),
                    existing_nullable=False)

    op.alter_column("orders", "paid_amount",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("orders", "bonus_used",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("orders", "promo_discount",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("orders", "discount",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("orders", "price",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())

    op.alter_column("users", "total_spent",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("users", "referral_earnings",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
    op.alter_column("users", "balance",
                    existing_type=sa.Numeric(12, 2), type_=sa.Float())
