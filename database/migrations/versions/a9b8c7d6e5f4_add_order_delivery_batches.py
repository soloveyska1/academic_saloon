"""add order delivery batches

Revision ID: a9b8c7d6e5f4
Revises: f3b4c5d6e7f8
Create Date: 2026-04-09 12:10:00.000000

"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from datetime import timedelta
from typing import Any

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a9b8c7d6e5f4"
down_revision: str | None = "f3b4c5d6e7f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DELIVERABLE_FILE_TYPES = ("document", "photo", "video", "voice", "audio")
GROUP_WINDOW = timedelta(minutes=15)


def _build_manifest_item(row: Any) -> dict[str, object]:
    return {
        "legacy_message_id": int(row.id),
        "file_type": row.file_type,
        "file_id": row.file_id,
        "file_name": row.file_name,
        "yadisk_url": row.yadisk_url,
        "client_message_id": row.client_message_id,
        "admin_message_id": row.admin_message_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def upgrade() -> None:
    op.create_table(
        "order_delivery_batches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=True),
        sa.Column("revision_count_snapshot", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("manager_comment", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="topic"),
        sa.Column("files_url", sa.String(length=500), nullable=True),
        sa.Column("file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("file_manifest", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_by_admin_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_order_delivery_batches_order_id",
        "order_delivery_batches",
        ["order_id"],
        unique=False,
    )
    op.create_index(
        "ix_order_delivery_batches_status",
        "order_delivery_batches",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_order_delivery_batches_version_number",
        "order_delivery_batches",
        ["version_number"],
        unique=False,
    )

    op.add_column("order_messages", sa.Column("delivery_batch_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_order_messages_delivery_batch_id",
        "order_messages",
        ["delivery_batch_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_order_messages_delivery_batch_id",
        "order_messages",
        "order_delivery_batches",
        ["delivery_batch_id"],
        ["id"],
        ondelete="SET NULL",
    )

    bind = op.get_bind()
    metadata = sa.MetaData()

    orders = sa.Table(
        "orders",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("files_url", sa.String(length=500)),
        sa.Column("revision_count", sa.Integer()),
    )
    order_messages = sa.Table(
        "order_messages",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("order_id", sa.Integer()),
        sa.Column("message_text", sa.Text()),
        sa.Column("file_type", sa.String(length=20)),
        sa.Column("file_id", sa.String(length=255)),
        sa.Column("file_name", sa.String(length=255)),
        sa.Column("yadisk_url", sa.String(length=500)),
        sa.Column("admin_message_id", sa.BigInteger()),
        sa.Column("client_message_id", sa.BigInteger()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("sender_type", sa.String(length=20)),
        sa.Column("delivery_batch_id", sa.Integer()),
    )
    delivery_batches = sa.Table(
        "order_delivery_batches",
        metadata,
        sa.Column("id", sa.Integer()),
        sa.Column("order_id", sa.Integer()),
        sa.Column("status", sa.String(length=20)),
        sa.Column("version_number", sa.Integer()),
        sa.Column("revision_count_snapshot", sa.Integer()),
        sa.Column("manager_comment", sa.Text()),
        sa.Column("source", sa.String(length=50)),
        sa.Column("files_url", sa.String(length=500)),
        sa.Column("file_count", sa.Integer()),
        sa.Column("file_manifest", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
    )

    order_map = {
        row.id: row
        for row in bind.execute(
            sa.select(orders.c.id, orders.c.files_url, orders.c.revision_count)
        )
    }

    message_rows = bind.execute(
        sa.select(
            order_messages.c.id,
            order_messages.c.order_id,
            order_messages.c.message_text,
            order_messages.c.file_type,
            order_messages.c.file_id,
            order_messages.c.file_name,
            order_messages.c.yadisk_url,
            order_messages.c.admin_message_id,
            order_messages.c.client_message_id,
            order_messages.c.created_at,
        )
        .where(
            order_messages.c.sender_type == "admin",
            order_messages.c.file_type.in_(DELIVERABLE_FILE_TYPES),
        )
        .order_by(order_messages.c.order_id.asc(), order_messages.c.created_at.asc(), order_messages.c.id.asc())
    ).fetchall()

    grouped_rows: dict[int, list[list[Any]]] = defaultdict(list)
    for row in message_rows:
        order_groups = grouped_rows[row.order_id]
        if not order_groups:
            order_groups.append([row])
            continue
        last_group = order_groups[-1]
        last_row = last_group[-1]
        last_created_at = last_row.created_at or row.created_at
        row_created_at = row.created_at or last_created_at
        if (
            last_created_at is not None
            and row_created_at is not None
            and row_created_at - last_created_at <= GROUP_WINDOW
        ):
            last_group.append(row)
        else:
            order_groups.append([row])

    for order_id, groups in grouped_rows.items():
        order_row = order_map.get(order_id)
        revision_count = int((order_row.revision_count or 0) if order_row else 0)
        for version_number, group in enumerate(groups, start=1):
            created_at = group[0].created_at
            sent_at = group[-1].created_at or created_at
            manager_comment = next(
                (
                    (row.message_text or "").strip()
                    for row in group
                    if isinstance(row.message_text, str) and row.message_text.strip()
                ),
                None,
            )
            insert_result = bind.execute(
                delivery_batches.insert().values(
                    order_id=order_id,
                    status="sent",
                    version_number=version_number,
                    revision_count_snapshot=min(max(version_number - 1, 0), revision_count),
                    manager_comment=manager_comment,
                    source="legacy_backfill",
                    files_url=order_row.files_url if order_row else None,
                    file_count=len(group),
                    file_manifest=[_build_manifest_item(row) for row in group],
                    created_at=created_at,
                    sent_at=sent_at,
                )
            )
            batch_id = insert_result.inserted_primary_key[0]
            message_ids = [int(row.id) for row in group]
            bind.execute(
                order_messages.update()
                .where(order_messages.c.id.in_(message_ids))
                .values(delivery_batch_id=batch_id)
            )


def downgrade() -> None:
    op.drop_constraint("fk_order_messages_delivery_batch_id", "order_messages", type_="foreignkey")
    op.drop_index("ix_order_messages_delivery_batch_id", table_name="order_messages")
    op.drop_column("order_messages", "delivery_batch_id")

    op.drop_index("ix_order_delivery_batches_version_number", table_name="order_delivery_batches")
    op.drop_index("ix_order_delivery_batches_status", table_name="order_delivery_batches")
    op.drop_index("ix_order_delivery_batches_order_id", table_name="order_delivery_batches")
    op.drop_table("order_delivery_batches")
