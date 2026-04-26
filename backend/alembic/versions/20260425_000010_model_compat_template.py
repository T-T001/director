"""model_configs: add compat media template fields

Revision ID: 20260425_000010
Revises: 20260424_000009
Create Date: 2026-04-25 00:00:10
"""

from alembic import op
import sqlalchemy as sa

revision = "20260425_000010"
down_revision = "20260424_000009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("model_configs", sa.Column("compat_media_template", sa.Text(), nullable=True))
    op.add_column("model_configs", sa.Column("compat_media_template_source", sa.String(length=16), nullable=True))
    op.add_column("model_configs", sa.Column("compat_media_template_checked_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("model_configs", "compat_media_template_checked_at")
    op.drop_column("model_configs", "compat_media_template_source")
    op.drop_column("model_configs", "compat_media_template")
