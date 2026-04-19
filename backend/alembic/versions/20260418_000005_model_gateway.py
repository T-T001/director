"""model gateway: providers, models, usage costs

Revision ID: 20260418_000005
Revises: 20260414_000004
Create Date: 2026-04-18 00:00:05
"""

from alembic import op
import sqlalchemy as sa

revision = "20260418_000005"
down_revision = "20260414_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "model_providers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("base_url", sa.String(length=500), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_model_providers_user_id", "model_providers", ["user_id"])

    op.create_table(
        "model_configs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("provider_id", sa.String(length=36), nullable=False),
        sa.Column("model_id", sa.String(length=200), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=True),
        sa.Column("capability", sa.String(length=32), nullable=False),
        sa.Column("request_path", sa.String(length=500), nullable=False),
        sa.Column("extra_headers", sa.Text(), nullable=True),
        sa.Column("default_params", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_id"], ["model_providers.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_model_configs_user_id", "model_configs", ["user_id"])
    op.create_index("ix_model_configs_provider_id", "model_configs", ["provider_id"])
    op.create_index("ix_model_configs_capability", "model_configs", ["capability"])

    op.create_table(
        "usage_costs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("api_type", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=200), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unit", sa.String(length=32), nullable=False, server_default="tokens"),
        sa.Column("cost", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_usage_costs_user_id", "usage_costs", ["user_id"])
    op.create_index("ix_usage_costs_project_id", "usage_costs", ["project_id"])
    op.create_index("ix_usage_costs_api_type", "usage_costs", ["api_type"])
    op.create_index("ix_usage_costs_created_at", "usage_costs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_usage_costs_created_at", table_name="usage_costs")
    op.drop_index("ix_usage_costs_api_type", table_name="usage_costs")
    op.drop_index("ix_usage_costs_project_id", table_name="usage_costs")
    op.drop_index("ix_usage_costs_user_id", table_name="usage_costs")
    op.drop_table("usage_costs")

    op.drop_index("ix_model_configs_capability", table_name="model_configs")
    op.drop_index("ix_model_configs_provider_id", table_name="model_configs")
    op.drop_index("ix_model_configs_user_id", table_name="model_configs")
    op.drop_table("model_configs")

    op.drop_index("ix_model_providers_user_id", table_name="model_providers")
    op.drop_table("model_providers")
