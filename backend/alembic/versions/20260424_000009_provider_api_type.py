"""model_providers: add api_type column

Revision ID: 20260424_000009
Revises: 20260421_000008
Create Date: 2026-04-24 00:00:09
"""

from alembic import op
import sqlalchemy as sa

revision = "20260424_000009"
down_revision = "20260421_000008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "model_providers",
        sa.Column(
            "api_type",
            sa.String(length=32),
            nullable=False,
            server_default="openai",
        ),
    )


def downgrade() -> None:
    op.drop_column("model_providers", "api_type")
