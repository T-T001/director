"""add storyboards and storyboard_panels

Revision ID: 20260413_000002
Revises: 20260411_000001
Create Date: 2026-04-13 00:00:02
"""

from alembic import op
import sqlalchemy as sa

revision = "20260413_000002"
down_revision = "20260411_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "storyboards",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("episode_id", sa.String(length=36), sa.ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panel_count", sa.Integer(), nullable=False),
        sa.Column("source_task_id", sa.String(length=36), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_storyboards_user_id", "storyboards", ["user_id"])
    op.create_index("ix_storyboards_project_id", "storyboards", ["project_id"])
    op.create_index("ix_storyboards_episode_id", "storyboards", ["episode_id"])

    op.create_table(
        "storyboard_panels",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("storyboard_id", sa.String(length=36), sa.ForeignKey("storyboards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panel_index", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("video_prompt", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), sa.ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("video_media_id", sa.String(length=36), sa.ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("storyboard_id", "panel_index", name="uq_storyboard_panel_index"),
    )
    op.create_index("ix_storyboard_panels_storyboard_id", "storyboard_panels", ["storyboard_id"])


def downgrade() -> None:
    op.drop_index("ix_storyboard_panels_storyboard_id", table_name="storyboard_panels")
    op.drop_table("storyboard_panels")

    op.drop_index("ix_storyboards_episode_id", table_name="storyboards")
    op.drop_index("ix_storyboards_project_id", table_name="storyboards")
    op.drop_index("ix_storyboards_user_id", table_name="storyboards")
    op.drop_table("storyboards")
