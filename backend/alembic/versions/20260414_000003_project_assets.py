"""add project_assets

Revision ID: 20260414_000003
Revises: 20260413_000002
Create Date: 2026-04-14 00:00:03
"""

from alembic import op
import sqlalchemy as sa

revision = "20260414_000003"
down_revision = "20260413_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_project_assets_project_id", "project_assets", ["project_id"])
    op.create_index("ix_project_assets_kind", "project_assets", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_project_assets_kind", table_name="project_assets")
    op.drop_index("ix_project_assets_project_id", table_name="project_assets")
    op.drop_table("project_assets")
