"""Novel Promotion domain models — ported from Prisma schema."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _ts_default() -> datetime:
    return datetime.now(UTC)


# ---------- top-level NP project ----------


class NovelPromotionProject(Base):
    __tablename__ = "novel_promotion_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), unique=True
    )
    analysis_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    image_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    video_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audio_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    character_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    location_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    storyboard_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    edit_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    video_ratio: Mapped[str] = mapped_column(String(16), default="9:16")
    tts_rate: Mapped[str] = mapped_column(String(16), default="+50%")
    art_style: Mapped[str] = mapped_column(String(64), default="american-comic")
    art_style_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_resolution: Mapped[str] = mapped_column(String(32), default="720p")
    image_resolution: Mapped[str] = mapped_column(String(32), default="2K")
    workflow_mode: Mapped[str] = mapped_column(String(32), default="srt")
    global_asset_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    capability_overrides: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_episode_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    import_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    characters: Mapped[list["NovelPromotionCharacter"]] = relationship(
        back_populates="np_project", cascade="all, delete-orphan"
    )
    locations: Mapped[list["NovelPromotionLocation"]] = relationship(
        back_populates="np_project", cascade="all, delete-orphan"
    )
    episodes: Mapped[list["NovelPromotionEpisode"]] = relationship(
        back_populates="np_project", cascade="all, delete-orphan"
    )


# ---------- characters ----------


class NovelPromotionCharacter(Base):
    __tablename__ = "novel_promotion_characters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    np_project_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    aliases: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_voice_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_voice_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    voice_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    voice_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    profile_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    introduction: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_global_character_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    np_project: Mapped[NovelPromotionProject] = relationship(back_populates="characters")
    appearances: Mapped[list["CharacterAppearance"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )


class CharacterAppearance(Base):
    __tablename__ = "character_appearances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_characters.id", ondelete="CASCADE"), index=True
    )
    appearance_index: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    candidate_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    character: Mapped[NovelPromotionCharacter] = relationship(back_populates="appearances")


# ---------- locations ----------


class NovelPromotionLocation(Base):
    __tablename__ = "novel_promotion_locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    np_project_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    asset_kind: Mapped[str] = mapped_column(String(32), default="location")
    source_global_location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    selected_image_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    np_project: Mapped[NovelPromotionProject] = relationship(back_populates="locations")
    images: Mapped[list["LocationImage"]] = relationship(
        back_populates="location", cascade="all, delete-orphan"
    )


class LocationImage(Base):
    __tablename__ = "location_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    location_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_locations.id", ondelete="CASCADE"), index=True
    )
    image_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    location: Mapped[NovelPromotionLocation] = relationship(back_populates="images")


# ---------- episodes ----------


class NovelPromotionEpisode(Base):
    __tablename__ = "novel_promotion_episodes"
    __table_args__ = (
        UniqueConstraint("np_project_id", "episode_number", name="uq_np_episode_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    np_project_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_projects.id", ondelete="CASCADE"), index=True
    )
    episode_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    novel_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    srt_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker_voices: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    np_project: Mapped[NovelPromotionProject] = relationship(back_populates="episodes")
    clips: Mapped[list["NovelPromotionClip"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan"
    )
    shots: Mapped[list["NovelPromotionShot"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan"
    )
    storyboards: Mapped[list["NovelPromotionStoryboard"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan"
    )
    voice_lines: Mapped[list["NovelPromotionVoiceLine"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan"
    )


# ---------- clips ----------


class NovelPromotionClip(Base):
    __tablename__ = "novel_promotion_clips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    episode_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_episodes.id", ondelete="CASCADE"), index=True
    )
    start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    characters: Mapped[str | None] = mapped_column(Text, nullable=True)
    props: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    end_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    shot_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    screenplay: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    episode: Mapped[NovelPromotionEpisode] = relationship(back_populates="clips")
    shots: Mapped[list["NovelPromotionShot"]] = relationship(
        back_populates="clip", cascade="all, delete-orphan"
    )
    storyboard: Mapped["NovelPromotionStoryboard | None"] = relationship(
        back_populates="clip", uselist=False, cascade="all, delete-orphan"
    )


# ---------- shots ----------


class NovelPromotionShot(Base):
    __tablename__ = "novel_promotion_shots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    episode_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_episodes.id", ondelete="CASCADE"), index=True
    )
    clip_id: Mapped[str | None] = mapped_column(
        ForeignKey("novel_promotion_clips.id", ondelete="CASCADE"), nullable=True, index=True
    )
    shot_id: Mapped[str] = mapped_column(String(64), index=True)
    srt_start: Mapped[int] = mapped_column(Integer, default=0)
    srt_end: Mapped[int] = mapped_column(Integer, default=0)
    srt_duration: Mapped[float] = mapped_column(Float, default=0.0)
    sequence: Mapped[str | None] = mapped_column(Text, nullable=True)
    locations: Mapped[str | None] = mapped_column(Text, nullable=True)
    characters: Mapped[str | None] = mapped_column(Text, nullable=True)
    plot: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    scale: Mapped[str | None] = mapped_column(Text, nullable=True)
    module: Mapped[str | None] = mapped_column(Text, nullable=True)
    focus: Mapped[str | None] = mapped_column(Text, nullable=True)
    zh_summarize: Mapped[str | None] = mapped_column(Text, nullable=True)
    pov: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    episode: Mapped[NovelPromotionEpisode] = relationship(back_populates="shots")
    clip: Mapped["NovelPromotionClip | None"] = relationship(back_populates="shots")


# ---------- storyboards + panels ----------


class NovelPromotionStoryboard(Base):
    __tablename__ = "novel_promotion_storyboards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    episode_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_episodes.id", ondelete="CASCADE"), index=True
    )
    clip_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_clips.id", ondelete="CASCADE"), unique=True
    )
    storyboard_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    panel_count: Mapped[int] = mapped_column(Integer, default=9)
    storyboard_text_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photography_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    episode: Mapped[NovelPromotionEpisode] = relationship(back_populates="storyboards")
    clip: Mapped[NovelPromotionClip] = relationship(back_populates="storyboard")
    panels: Mapped[list["NovelPromotionPanel"]] = relationship(
        back_populates="storyboard", cascade="all, delete-orphan"
    )
    supplementary_panels: Mapped[list["SupplementaryPanel"]] = relationship(
        back_populates="storyboard", cascade="all, delete-orphan"
    )


class NovelPromotionPanel(Base):
    __tablename__ = "novel_promotion_panels"
    __table_args__ = (
        UniqueConstraint("storyboard_id", "panel_index", name="uq_np_panel_index"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    storyboard_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_storyboards.id", ondelete="CASCADE"), index=True
    )
    panel_index: Mapped[int] = mapped_column(Integer)
    panel_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shot_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    camera_move: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    characters: Mapped[str | None] = mapped_column(Text, nullable=True)
    props: Mapped[str | None] = mapped_column(Text, nullable=True)
    srt_segment: Mapped[str | None] = mapped_column(Text, nullable=True)
    srt_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    srt_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    image_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    image_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_last_frame_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_generation_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    video_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    scene_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    candidate_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    linked_to_next_panel: Mapped[bool] = mapped_column(Boolean, default=False)
    lip_sync_task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lip_sync_video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    lip_sync_video_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    sketch_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    sketch_image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    previous_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    photography_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    acting_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    storyboard: Mapped[NovelPromotionStoryboard] = relationship(back_populates="panels")


class SupplementaryPanel(Base):
    __tablename__ = "supplementary_panels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    storyboard_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_storyboards.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(String(32))
    source_panel_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    characters: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    storyboard: Mapped[NovelPromotionStoryboard] = relationship(
        back_populates="supplementary_panels"
    )


# ---------- voice lines ----------


class NovelPromotionVoiceLine(Base):
    __tablename__ = "novel_promotion_voice_lines"
    __table_args__ = (
        Index("ix_np_voice_lines_episode_line", "episode_id", "line_index"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    episode_id: Mapped[str] = mapped_column(
        ForeignKey("novel_promotion_episodes.id", ondelete="CASCADE"), index=True
    )
    line_index: Mapped[int] = mapped_column(Integer, default=0)
    speaker: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    voice_preset_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    matched_panel_id: Mapped[str | None] = mapped_column(
        ForeignKey("novel_promotion_panels.id", ondelete="SET NULL"), nullable=True, index=True
    )
    srt_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    srt_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ts_default)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_ts_default, onupdate=_ts_default
    )

    episode: Mapped[NovelPromotionEpisode] = relationship(back_populates="voice_lines")
