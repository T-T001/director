"""add project intake novel text

Revision ID: 20260604_000001
Revises: 20260425_000010
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260604_000001"
down_revision = "20260425_000010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("intake_novel_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "intake_novel_text")
