"""model_configs: add enabled column

Revision ID: 20260421_000008
Revises: 20260421_000007
Create Date: 2026-04-21 00:00:08
"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_000008"
down_revision = "20260421_000007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "model_configs",
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )


def downgrade() -> None:
    op.drop_column("model_configs", "enabled")
