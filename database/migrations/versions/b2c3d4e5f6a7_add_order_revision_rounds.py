"""add order revision rounds

Revision ID: b2c3d4e5f6a7
Revises: a9b8c7d6e5f4
Create Date: 2026-04-09 23:40:00.000000

"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a9b8c7d6e5f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


REVISION_REQUEST_PREFIX = "📝 <b>Запрос на правки</b>"


def _has_table(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _has_index(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def _has_foreign_key(inspector: sa.Inspector, table_name: str, fk_name: str) -> bool:
    return fk_name in {foreign_key["name"] for foreign_key in inspector.get_foreign_keys(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "order_revision_rounds"):
        op.create_table(
            "order_revision_rounds",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("round_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
            sa.Column("initial_comment", sa.Text(), nullable=True),
            sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("last_client_activity_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("closed_by_delivery_batch_id", sa.Integer(), nullable=True),
            sa.Column("requested_by_user_id", sa.BigInteger(), nullable=True),
            sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["closed_by_delivery_batch_id"],
                ["order_delivery_batches.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_order_revision_rounds_order_id",
            "order_revision_rounds",
            ["order_id"],
            unique=False,
        )
        op.create_index(
            "ix_order_revision_rounds_status",
            "order_revision_rounds",
            ["status"],
            unique=False,
        )
        op.create_index(
            "ix_order_revision_rounds_closed_by_delivery_batch_id",
            "order_revision_rounds",
            ["closed_by_delivery_batch_id"],
            unique=False,
        )
        op.create_index(
            "ix_order_revision_rounds_requested_by_user_id",
            "order_revision_rounds",
            ["requested_by_user_id"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    if not _has_column(inspector, "order_messages", "revision_round_id"):
        op.add_column("order_messages", sa.Column("revision_round_id", sa.Integer(), nullable=True))
    if not _has_index(inspector, "order_messages", "ix_order_messages_revision_round_id"):
        op.create_index(
            "ix_order_messages_revision_round_id",
            "order_messages",
            ["revision_round_id"],
            unique=False,
        )
    if not _has_foreign_key(inspector, "order_messages", "fk_order_messages_revision_round_id"):
        op.create_foreign_key(
            "fk_order_messages_revision_round_id",
            "order_messages",
            "order_revision_rounds",
            ["revision_round_id"],
            ["id"],
            ondelete="SET NULL",
        )

    metadata = sa.MetaData()
    orders = sa.Table(
        "orders",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("user_id", sa.BigInteger()),
        sa.Column("status", sa.String(length=20)),
        sa.Column("revision_count", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    order_messages = sa.Table(
        "order_messages",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("order_id", sa.Integer()),
        sa.Column("sender_type", sa.String(length=20)),
        sa.Column("sender_id", sa.BigInteger()),
        sa.Column("message_text", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("revision_round_id", sa.Integer()),
    )
    order_revision_rounds = sa.Table(
        "order_revision_rounds",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("order_id", sa.Integer()),
        sa.Column("round_number", sa.Integer()),
        sa.Column("status", sa.String(length=20)),
        sa.Column("initial_comment", sa.Text()),
        sa.Column("requested_at", sa.DateTime(timezone=True)),
        sa.Column("last_client_activity_at", sa.DateTime(timezone=True)),
        sa.Column("requested_by_user_id", sa.BigInteger()),
    )

    request_rows = bind.execute(
        sa.select(
            order_messages.c.id,
            order_messages.c.order_id,
            order_messages.c.sender_id,
            order_messages.c.message_text,
            order_messages.c.created_at,
            orders.c.revision_count,
        )
        .select_from(order_messages.join(orders, orders.c.id == order_messages.c.order_id))
        .where(
            order_messages.c.sender_type == "client",
            order_messages.c.message_text.like(f"{REVISION_REQUEST_PREFIX}%"),
            order_messages.c.revision_round_id.is_(None),
        )
        .order_by(order_messages.c.order_id.asc(), order_messages.c.created_at.asc(), order_messages.c.id.asc())
    ).fetchall()

    request_messages_by_order = defaultdict(list)
    for row in request_rows:
        request_messages_by_order[int(row.order_id)].append(row)

    for order_id, messages in request_messages_by_order.items():
        revision_count = int(messages[-1].revision_count or 0)
        start_round_number = max(revision_count - len(messages) + 1, 1)
        for index, row in enumerate(messages, start=0):
            round_number = start_round_number + index
            comment = row.message_text.split("\n\n", 1)[1].strip() if "\n\n" in (row.message_text or "") else None
            insert_values = {
                "order_id": order_id,
                "round_number": round_number,
                "status": "fulfilled",
                "initial_comment": comment,
                "requested_at": row.created_at,
                "last_client_activity_at": row.created_at,
                "requested_by_user_id": row.sender_id,
            }
            insert_stmt = order_revision_rounds.insert().values(**insert_values)
            if bind.dialect.name == "postgresql":
                round_id = bind.execute(
                    insert_stmt.returning(order_revision_rounds.c.id)
                ).scalar_one()
            else:
                insert_result = bind.execute(insert_stmt)
                round_id = insert_result.inserted_primary_key[0]
                if round_id is None:
                    round_id = bind.execute(
                        sa.select(order_revision_rounds.c.id)
                        .where(
                            order_revision_rounds.c.order_id == order_id,
                            order_revision_rounds.c.round_number == round_number,
                        )
                        .order_by(order_revision_rounds.c.id.desc())
                        .limit(1)
                    ).scalar_one()
            bind.execute(
                order_messages.update()
                .where(order_messages.c.id == row.id)
                .values(revision_round_id=round_id)
            )

    active_revision_orders = bind.execute(
        sa.select(
            orders.c.id,
            orders.c.user_id,
            orders.c.revision_count,
            orders.c.created_at,
            orders.c.updated_at,
        )
        .where(orders.c.status == "revision")
        .order_by(orders.c.id.asc())
    ).fetchall()

    for row in active_revision_orders:
        existing_open_round = bind.execute(
            sa.select(order_revision_rounds.c.id)
            .where(
                order_revision_rounds.c.order_id == row.id,
                order_revision_rounds.c.status == "open",
            )
            .limit(1)
        ).fetchone()
        if existing_open_round:
            continue

        requested_at = row.updated_at or row.created_at or sa.func.now()
        bind.execute(
            order_revision_rounds.insert().values(
                order_id=row.id,
                round_number=max(int(row.revision_count or 0), 1),
                status="open",
                initial_comment=None,
                requested_at=requested_at,
                last_client_activity_at=requested_at,
                requested_by_user_id=row.user_id,
            )
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if _has_foreign_key(inspector, "order_messages", "fk_order_messages_revision_round_id"):
        op.drop_constraint("fk_order_messages_revision_round_id", "order_messages", type_="foreignkey")
    if _has_index(inspector, "order_messages", "ix_order_messages_revision_round_id"):
        op.drop_index("ix_order_messages_revision_round_id", table_name="order_messages")
    if _has_column(inspector, "order_messages", "revision_round_id"):
        op.drop_column("order_messages", "revision_round_id")

    if _has_table(inspector, "order_revision_rounds"):
        if _has_index(inspector, "order_revision_rounds", "ix_order_revision_rounds_requested_by_user_id"):
            op.drop_index("ix_order_revision_rounds_requested_by_user_id", table_name="order_revision_rounds")
        if _has_index(inspector, "order_revision_rounds", "ix_order_revision_rounds_closed_by_delivery_batch_id"):
            op.drop_index("ix_order_revision_rounds_closed_by_delivery_batch_id", table_name="order_revision_rounds")
        if _has_index(inspector, "order_revision_rounds", "ix_order_revision_rounds_status"):
            op.drop_index("ix_order_revision_rounds_status", table_name="order_revision_rounds")
        if _has_index(inspector, "order_revision_rounds", "ix_order_revision_rounds_order_id"):
            op.drop_index("ix_order_revision_rounds_order_id", table_name="order_revision_rounds")
        op.drop_table("order_revision_rounds")
