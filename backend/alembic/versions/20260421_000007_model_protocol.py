"""model_configs: add protocol column

Revision ID: 20260421_000007
Revises: 20260418_000006
Create Date: 2026-04-21 00:00:07
"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_000007"
down_revision = "20260418_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "model_configs",
        sa.Column(
            "protocol",
            sa.String(length=32),
            nullable=False,
            server_default="openai",
        ),
    )


def downgrade() -> None:
    op.drop_column("model_configs", "protocol")
