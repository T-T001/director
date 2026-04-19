"""novel promotion domain schema

Revision ID: 20260418_000006
Revises: 20260418_000005
Create Date: 2026-04-18 00:00:06
"""

from alembic import op
import sqlalchemy as sa

revision = "20260418_000006"
down_revision = "20260418_000005"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    # np_projects
    op.create_table(
        "novel_promotion_projects",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("analysis_model", sa.String(length=128), nullable=True),
        sa.Column("image_model", sa.String(length=128), nullable=True),
        sa.Column("video_model", sa.String(length=128), nullable=True),
        sa.Column("audio_model", sa.String(length=128), nullable=True),
        sa.Column("character_model", sa.String(length=128), nullable=True),
        sa.Column("location_model", sa.String(length=128), nullable=True),
        sa.Column("storyboard_model", sa.String(length=128), nullable=True),
        sa.Column("edit_model", sa.String(length=128), nullable=True),
        sa.Column("video_ratio", sa.String(length=16), nullable=False, server_default="9:16"),
        sa.Column("tts_rate", sa.String(length=16), nullable=False, server_default="+50%"),
        sa.Column("art_style", sa.String(length=64), nullable=False, server_default="american-comic"),
        sa.Column("art_style_prompt", sa.Text(), nullable=True),
        sa.Column("video_resolution", sa.String(length=32), nullable=False, server_default="720p"),
        sa.Column("image_resolution", sa.String(length=32), nullable=False, server_default="2K"),
        sa.Column("workflow_mode", sa.String(length=32), nullable=False, server_default="srt"),
        sa.Column("global_asset_text", sa.Text(), nullable=True),
        sa.Column("capability_overrides", sa.Text(), nullable=True),
        sa.Column("last_episode_id", sa.String(length=36), nullable=True),
        sa.Column("import_status", sa.String(length=32), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )

    # np_characters
    op.create_table(
        "novel_promotion_characters",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("np_project_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("aliases", sa.Text(), nullable=True),
        sa.Column("custom_voice_url", sa.Text(), nullable=True),
        sa.Column("custom_voice_media_id", sa.String(length=36), nullable=True),
        sa.Column("voice_id", sa.String(length=128), nullable=True),
        sa.Column("voice_type", sa.String(length=64), nullable=True),
        sa.Column("profile_data", sa.Text(), nullable=True),
        sa.Column("profile_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("introduction", sa.Text(), nullable=True),
        sa.Column("source_global_character_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["np_project_id"], ["novel_promotion_projects.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["custom_voice_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_np_characters_np_project_id", "novel_promotion_characters", ["np_project_id"]
    )

    # character_appearances
    op.create_table(
        "character_appearances",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("character_id", sa.String(length=36), nullable=False),
        sa.Column("appearance_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), nullable=True),
        sa.Column("candidate_images", sa.Text(), nullable=True),
        sa.Column("selected", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["character_id"], ["novel_promotion_characters.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_character_appearances_character_id", "character_appearances", ["character_id"]
    )

    # np_locations
    op.create_table(
        "novel_promotion_locations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("np_project_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("asset_kind", sa.String(length=32), nullable=False, server_default="location"),
        sa.Column("source_global_location_id", sa.String(length=36), nullable=True),
        sa.Column("selected_image_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["np_project_id"], ["novel_promotion_projects.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_np_locations_np_project_id", "novel_promotion_locations", ["np_project_id"]
    )

    # location_images
    op.create_table(
        "location_images",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("location_id", sa.String(length=36), nullable=False),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["location_id"], ["novel_promotion_locations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_location_images_location_id", "location_images", ["location_id"])

    # np_episodes
    op.create_table(
        "novel_promotion_episodes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("np_project_id", sa.String(length=36), nullable=False),
        sa.Column("episode_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("novel_text", sa.Text(), nullable=True),
        sa.Column("audio_url", sa.Text(), nullable=True),
        sa.Column("audio_media_id", sa.String(length=36), nullable=True),
        sa.Column("srt_content", sa.Text(), nullable=True),
        sa.Column("speaker_voices", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["np_project_id"], ["novel_promotion_projects.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["audio_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("np_project_id", "episode_number", name="uq_np_episode_number"),
    )
    op.create_index(
        "ix_np_episodes_np_project_id", "novel_promotion_episodes", ["np_project_id"]
    )

    # np_clips
    op.create_table(
        "novel_promotion_clips",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("episode_id", sa.String(length=36), nullable=False),
        sa.Column("start", sa.Integer(), nullable=True),
        sa.Column("end", sa.Integer(), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("characters", sa.Text(), nullable=True),
        sa.Column("props", sa.Text(), nullable=True),
        sa.Column("start_text", sa.Text(), nullable=True),
        sa.Column("end_text", sa.Text(), nullable=True),
        sa.Column("shot_count", sa.Integer(), nullable=True),
        sa.Column("screenplay", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["episode_id"], ["novel_promotion_episodes.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_np_clips_episode_id", "novel_promotion_clips", ["episode_id"])

    # np_shots
    op.create_table(
        "novel_promotion_shots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("episode_id", sa.String(length=36), nullable=False),
        sa.Column("clip_id", sa.String(length=36), nullable=True),
        sa.Column("shot_id", sa.String(length=64), nullable=False),
        sa.Column("srt_start", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("srt_end", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("srt_duration", sa.Float(), nullable=False, server_default="0"),
        sa.Column("sequence", sa.Text(), nullable=True),
        sa.Column("locations", sa.Text(), nullable=True),
        sa.Column("characters", sa.Text(), nullable=True),
        sa.Column("plot", sa.Text(), nullable=True),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("scale", sa.Text(), nullable=True),
        sa.Column("module", sa.Text(), nullable=True),
        sa.Column("focus", sa.Text(), nullable=True),
        sa.Column("zh_summarize", sa.Text(), nullable=True),
        sa.Column("pov", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["episode_id"], ["novel_promotion_episodes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["clip_id"], ["novel_promotion_clips.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_np_shots_episode_id", "novel_promotion_shots", ["episode_id"])
    op.create_index("ix_np_shots_clip_id", "novel_promotion_shots", ["clip_id"])
    op.create_index("ix_np_shots_shot_id", "novel_promotion_shots", ["shot_id"])

    # np_storyboards
    op.create_table(
        "novel_promotion_storyboards",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("episode_id", sa.String(length=36), nullable=False),
        sa.Column("clip_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("storyboard_image_url", sa.Text(), nullable=True),
        sa.Column("panel_count", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("storyboard_text_json", sa.Text(), nullable=True),
        sa.Column("image_history", sa.Text(), nullable=True),
        sa.Column("candidate_images", sa.Text(), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
        sa.Column("photography_plan", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["episode_id"], ["novel_promotion_episodes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["clip_id"], ["novel_promotion_clips.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_np_storyboards_episode_id", "novel_promotion_storyboards", ["episode_id"]
    )

    # np_panels
    op.create_table(
        "novel_promotion_panels",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("storyboard_id", sa.String(length=36), nullable=False),
        sa.Column("panel_index", sa.Integer(), nullable=False),
        sa.Column("panel_number", sa.Integer(), nullable=True),
        sa.Column("shot_type", sa.Text(), nullable=True),
        sa.Column("camera_move", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("characters", sa.Text(), nullable=True),
        sa.Column("props", sa.Text(), nullable=True),
        sa.Column("srt_segment", sa.Text(), nullable=True),
        sa.Column("srt_start", sa.Float(), nullable=True),
        sa.Column("srt_end", sa.Float(), nullable=True),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), nullable=True),
        sa.Column("image_history", sa.Text(), nullable=True),
        sa.Column("video_prompt", sa.Text(), nullable=True),
        sa.Column("first_last_frame_prompt", sa.Text(), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("video_generation_mode", sa.String(length=32), nullable=True),
        sa.Column("video_media_id", sa.String(length=36), nullable=True),
        sa.Column("scene_type", sa.String(length=32), nullable=True),
        sa.Column("candidate_images", sa.Text(), nullable=True),
        sa.Column(
            "linked_to_next_panel", sa.Boolean(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column("lip_sync_task_id", sa.String(length=64), nullable=True),
        sa.Column("lip_sync_video_url", sa.Text(), nullable=True),
        sa.Column("lip_sync_video_media_id", sa.String(length=36), nullable=True),
        sa.Column("sketch_image_url", sa.Text(), nullable=True),
        sa.Column("sketch_image_media_id", sa.String(length=36), nullable=True),
        sa.Column("previous_image_url", sa.Text(), nullable=True),
        sa.Column("previous_image_media_id", sa.String(length=36), nullable=True),
        sa.Column("photography_rules", sa.Text(), nullable=True),
        sa.Column("acting_notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["storyboard_id"], ["novel_promotion_storyboards.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["video_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["lip_sync_video_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["sketch_image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["previous_image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("storyboard_id", "panel_index", name="uq_np_panel_index"),
    )
    op.create_index(
        "ix_np_panels_storyboard_id", "novel_promotion_panels", ["storyboard_id"]
    )

    # supplementary_panels
    op.create_table(
        "supplementary_panels",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("storyboard_id", sa.String(length=36), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_panel_id", sa.String(length=36), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_media_id", sa.String(length=36), nullable=True),
        sa.Column("characters", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["storyboard_id"], ["novel_promotion_storyboards.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_supplementary_panels_storyboard_id", "supplementary_panels", ["storyboard_id"]
    )

    # np_voice_lines
    op.create_table(
        "novel_promotion_voice_lines",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("episode_id", sa.String(length=36), nullable=False),
        sa.Column("line_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("speaker", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("voice_preset_id", sa.String(length=128), nullable=True),
        sa.Column("audio_url", sa.Text(), nullable=True),
        sa.Column("audio_media_id", sa.String(length=36), nullable=True),
        sa.Column("matched_panel_id", sa.String(length=36), nullable=True),
        sa.Column("srt_start", sa.Float(), nullable=True),
        sa.Column("srt_end", sa.Float(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["episode_id"], ["novel_promotion_episodes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["audio_media_id"], ["media_objects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["matched_panel_id"], ["novel_promotion_panels.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_np_voice_lines_episode_id", "novel_promotion_voice_lines", ["episode_id"]
    )
    op.create_index(
        "ix_np_voice_lines_matched_panel_id",
        "novel_promotion_voice_lines",
        ["matched_panel_id"],
    )
    op.create_index(
        "ix_np_voice_lines_episode_line",
        "novel_promotion_voice_lines",
        ["episode_id", "line_index"],
    )


def downgrade() -> None:
    for idx, tbl in [
        ("ix_np_voice_lines_episode_line", "novel_promotion_voice_lines"),
        ("ix_np_voice_lines_matched_panel_id", "novel_promotion_voice_lines"),
        ("ix_np_voice_lines_episode_id", "novel_promotion_voice_lines"),
    ]:
        op.drop_index(idx, table_name=tbl)
    op.drop_table("novel_promotion_voice_lines")

    op.drop_index("ix_supplementary_panels_storyboard_id", table_name="supplementary_panels")
    op.drop_table("supplementary_panels")

    op.drop_index("ix_np_panels_storyboard_id", table_name="novel_promotion_panels")
    op.drop_table("novel_promotion_panels")

    op.drop_index("ix_np_storyboards_episode_id", table_name="novel_promotion_storyboards")
    op.drop_table("novel_promotion_storyboards")

    for idx in ("ix_np_shots_shot_id", "ix_np_shots_clip_id", "ix_np_shots_episode_id"):
        op.drop_index(idx, table_name="novel_promotion_shots")
    op.drop_table("novel_promotion_shots")

    op.drop_index("ix_np_clips_episode_id", table_name="novel_promotion_clips")
    op.drop_table("novel_promotion_clips")

    op.drop_index("ix_np_episodes_np_project_id", table_name="novel_promotion_episodes")
    op.drop_table("novel_promotion_episodes")

    op.drop_index("ix_location_images_location_id", table_name="location_images")
    op.drop_table("location_images")

    op.drop_index("ix_np_locations_np_project_id", table_name="novel_promotion_locations")
    op.drop_table("novel_promotion_locations")

    op.drop_index(
        "ix_character_appearances_character_id", table_name="character_appearances"
    )
    op.drop_table("character_appearances")

    op.drop_index("ix_np_characters_np_project_id", table_name="novel_promotion_characters")
    op.drop_table("novel_promotion_characters")

    op.drop_table("novel_promotion_projects")
