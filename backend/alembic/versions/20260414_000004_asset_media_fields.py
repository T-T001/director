"""add asset preview and media owner fields

Revision ID: 20260414_000004
Revises: 20260414_000003
Create Date: 2026-04-14 00:00:04
"""

from alembic import op
import sqlalchemy as sa

revision = "20260414_000004"
down_revision = "20260414_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "media_objects",
        sa.Column("user_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_media_objects_user_id_users",
        "media_objects",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_media_objects_user_id", "media_objects", ["user_id"])

    op.add_column(
        "project_assets",
        sa.Column("preview_media_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_project_assets_preview_media_id_media_objects",
        "project_assets",
        "media_objects",
        ["preview_media_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_project_assets_preview_media_id_media_objects",
        "project_assets",
        type_="foreignkey",
    )
    op.drop_column("project_assets", "preview_media_id")

    op.drop_index("ix_media_objects_user_id", table_name="media_objects")
    op.drop_constraint("fk_media_objects_user_id_users", "media_objects", type_="foreignkey")
    op.drop_column("media_objects", "user_id")
