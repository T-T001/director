"""All NP entity schemas (Read/Create/Update) — kept in one file for compactness.

Pattern: Read carries every persisted field; Create validates required inputs;
Update allows partial updates. Field names mirror the SQLAlchemy models.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ---------- characters ----------


class CharacterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    np_project_id: str
    name: str
    aliases: str | None = None
    custom_voice_url: str | None = None
    custom_voice_media_id: str | None = None
    voice_id: str | None = None
    voice_type: str | None = None
    profile_data: str | None = None
    profile_confirmed: bool
    introduction: str | None = None
    source_global_character_id: str | None = None
    created_at: datetime
    updated_at: datetime


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    aliases: str | None = None
    introduction: str | None = None


class CharacterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    aliases: str | None = None
    introduction: str | None = None
    voice_id: str | None = None
    voice_type: str | None = None
    custom_voice_url: str | None = None
    custom_voice_media_id: str | None = None
    profile_data: str | None = None
    profile_confirmed: bool | None = None


class AppearanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    character_id: str
    appearance_index: int
    description: str | None = None
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    candidate_images: str | None = None
    selected: bool
    created_at: datetime
    updated_at: datetime


class AppearanceCreate(BaseModel):
    description: str | None = None
    image_prompt: str | None = None
    image_url: str | None = None


class AppearanceUpdate(BaseModel):
    description: str | None = None
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    candidate_images: str | None = None
    selected: bool | None = None


class ProfileConfirmPayload(BaseModel):
    profile_data: str | None = None


class BatchProfileConfirmPayload(BaseModel):
    character_ids: list[str] = Field(min_length=1)


class AICreateCharacterPayload(BaseModel):
    name: str
    hints: str | None = None


class AIModifyAppearancePayload(BaseModel):
    appearance_id: str
    prompt: str | None = None


class ReferenceToCharacterPayload(BaseModel):
    reference_image_url: str
    name: str | None = None


class GenerateCharacterImagePayload(BaseModel):
    appearance_id: str | None = None
    prompt: str | None = None


class SelectCharacterImagePayload(BaseModel):
    appearance_id: str
    image_url: str | None = None
    image_media_id: str | None = None


# ---------- locations ----------


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    np_project_id: str
    name: str
    summary: str | None = None
    asset_kind: str
    source_global_location_id: str | None = None
    selected_image_id: str | None = None
    created_at: datetime
    updated_at: datetime


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    summary: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    selected_image_id: str | None = None


class LocationImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    location_id: str
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    created_at: datetime
    updated_at: datetime


class AICreateLocationPayload(BaseModel):
    name: str
    hints: str | None = None


class AIModifyLocationPayload(BaseModel):
    prompt: str


class SelectLocationImagePayload(BaseModel):
    image_id: str


# ---------- episodes ----------


class NPEpisodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    np_project_id: str
    episode_number: int
    name: str
    description: str | None = None
    novel_text: str | None = None
    audio_url: str | None = None
    audio_media_id: str | None = None
    srt_content: str | None = None
    speaker_voices: str | None = None
    created_at: datetime
    updated_at: datetime


class NPEpisodeCreate(BaseModel):
    episode_number: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    novel_text: str | None = None


class NPEpisodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    novel_text: str | None = None
    audio_url: str | None = None
    audio_media_id: str | None = None
    srt_content: str | None = None
    speaker_voices: str | None = None


class NPEpisodeBatchCreate(BaseModel):
    episodes: list[NPEpisodeCreate] = Field(min_length=1)


class EpisodeSplitPayload(BaseModel):
    split_points: list[int] = Field(min_length=1)


class EpisodeSplitByMarkersPayload(BaseModel):
    markers: list[str] = Field(min_length=1)


# ---------- clips ----------


class ClipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    episode_id: str
    start: int | None = None
    end: int | None = None
    duration: int | None = None
    summary: str
    location: str | None = None
    content: str
    characters: str | None = None
    props: str | None = None
    start_text: str | None = None
    end_text: str | None = None
    shot_count: int | None = None
    screenplay: str | None = None
    created_at: datetime
    updated_at: datetime


class ClipCreate(BaseModel):
    start: int | None = None
    end: int | None = None
    duration: int | None = None
    summary: str = ""
    content: str = ""
    location: str | None = None
    characters: str | None = None
    props: str | None = None
    shot_count: int | None = None


class ClipUpdate(BaseModel):
    start: int | None = None
    end: int | None = None
    duration: int | None = None
    summary: str | None = None
    content: str | None = None
    location: str | None = None
    characters: str | None = None
    props: str | None = None
    start_text: str | None = None
    end_text: str | None = None
    shot_count: int | None = None
    screenplay: str | None = None


# ---------- shots ----------


class ShotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    episode_id: str
    clip_id: str | None = None
    shot_id: str
    srt_start: int
    srt_end: int
    srt_duration: float
    sequence: str | None = None
    locations: str | None = None
    characters: str | None = None
    plot: str | None = None
    image_prompt: str | None = None
    scale: str | None = None
    module: str | None = None
    focus: str | None = None
    zh_summarize: str | None = None
    pov: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    created_at: datetime
    updated_at: datetime


class ShotUpdate(BaseModel):
    sequence: str | None = None
    locations: str | None = None
    characters: str | None = None
    plot: str | None = None
    image_prompt: str | None = None
    scale: str | None = None
    module: str | None = None
    focus: str | None = None
    zh_summarize: str | None = None
    pov: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None


# ---------- storyboards + panels ----------


class StoryboardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    episode_id: str
    clip_id: str
    storyboard_image_url: str | None = None
    panel_count: int
    storyboard_text_json: str | None = None
    image_history: str | None = None
    candidate_images: str | None = None
    last_error: str | None = None
    photography_plan: str | None = None
    created_at: datetime
    updated_at: datetime


class StoryboardCreate(BaseModel):
    panel_count: int = 9


class StoryboardUpdate(BaseModel):
    storyboard_image_url: str | None = None
    panel_count: int | None = None
    storyboard_text_json: str | None = None
    photography_plan: str | None = None


class PanelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    storyboard_id: str
    panel_index: int
    panel_number: int | None = None
    shot_type: str | None = None
    camera_move: str | None = None
    description: str | None = None
    location: str | None = None
    characters: str | None = None
    props: str | None = None
    srt_segment: str | None = None
    srt_start: float | None = None
    srt_end: float | None = None
    duration: float | None = None
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    image_history: str | None = None
    video_prompt: str | None = None
    first_last_frame_prompt: str | None = None
    video_url: str | None = None
    video_generation_mode: str | None = None
    video_media_id: str | None = None
    scene_type: str | None = None
    candidate_images: str | None = None
    linked_to_next_panel: bool
    lip_sync_task_id: str | None = None
    lip_sync_video_url: str | None = None
    lip_sync_video_media_id: str | None = None
    sketch_image_url: str | None = None
    sketch_image_media_id: str | None = None
    previous_image_url: str | None = None
    previous_image_media_id: str | None = None
    photography_rules: str | None = None
    acting_notes: str | None = None
    created_at: datetime
    updated_at: datetime


class PanelCreate(BaseModel):
    panel_index: int
    description: str | None = None
    image_prompt: str | None = None


class PanelUpdate(BaseModel):
    panel_index: int | None = None
    panel_number: int | None = None
    shot_type: str | None = None
    camera_move: str | None = None
    description: str | None = None
    location: str | None = None
    characters: str | None = None
    props: str | None = None
    srt_segment: str | None = None
    srt_start: float | None = None
    srt_end: float | None = None
    duration: float | None = None
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    video_prompt: str | None = None
    first_last_frame_prompt: str | None = None
    video_url: str | None = None
    video_generation_mode: str | None = None
    video_media_id: str | None = None
    scene_type: str | None = None
    linked_to_next_panel: bool | None = None
    sketch_image_url: str | None = None
    photography_rules: str | None = None
    acting_notes: str | None = None


class PanelLinkPayload(BaseModel):
    linked_to_next_panel: bool


class PanelVariantPayload(BaseModel):
    variant_type: str = "image"
    prompt: str | None = None


class PanelSelectCandidatePayload(BaseModel):
    image_url: str | None = None
    image_media_id: str | None = None


class PanelPromptUpdatePayload(BaseModel):
    image_prompt: str | None = None
    video_prompt: str | None = None


class PanelAIModifyPromptPayload(BaseModel):
    directive: str


class SupplementaryPanelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    storyboard_id: str
    source_type: str
    source_panel_id: str | None = None
    description: str | None = None
    image_prompt: str | None = None
    image_url: str | None = None
    image_media_id: str | None = None
    characters: str | None = None
    location: str | None = None
    created_at: datetime
    updated_at: datetime


class SupplementaryPanelCreate(BaseModel):
    source_type: str
    source_panel_id: str | None = None
    description: str | None = None
    image_prompt: str | None = None


# ---------- voice lines ----------


class VoiceLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    episode_id: str
    line_index: int
    speaker: str
    content: str
    voice_preset_id: str | None = None
    audio_url: str | None = None
    audio_media_id: str | None = None
    matched_panel_id: str | None = None
    srt_start: float | None = None
    srt_end: float | None = None
    created_at: datetime
    updated_at: datetime


class VoiceLineCreate(BaseModel):
    line_index: int
    speaker: str = ""
    content: str
    voice_preset_id: str | None = None
    matched_panel_id: str | None = None
    srt_start: float | None = None
    srt_end: float | None = None


class VoiceLineUpdate(BaseModel):
    line_index: int | None = None
    speaker: str | None = None
    content: str | None = None
    voice_preset_id: str | None = None
    matched_panel_id: str | None = None
    audio_url: str | None = None
    audio_media_id: str | None = None
    srt_start: float | None = None
    srt_end: float | None = None


class SpeakerVoicePayload(BaseModel):
    speaker: str
    voice_preset_id: str


# ---------- generic task payloads ----------


class GenericTaskPayload(BaseModel):
    payload: dict[str, Any] | None = None


class TaskQueuedResponse(BaseModel):
    task_id: str
    status: str = "queued"
