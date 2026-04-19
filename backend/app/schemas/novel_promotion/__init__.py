from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NovelPromotionProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    edit_model: str | None = None
    video_ratio: str
    tts_rate: str
    art_style: str
    art_style_prompt: str | None = None
    video_resolution: str
    image_resolution: str
    workflow_mode: str
    global_asset_text: str | None = None
    capability_overrides: str | None = None
    last_episode_id: str | None = None
    import_status: str | None = None
    created_at: datetime
    updated_at: datetime


class NovelPromotionProjectUpdate(BaseModel):
    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    edit_model: str | None = None
    video_ratio: str | None = None
    tts_rate: str | None = None
    art_style: str | None = Field(default=None, max_length=64)
    art_style_prompt: str | None = None
    video_resolution: str | None = None
    image_resolution: str | None = None
    workflow_mode: str | None = None
    global_asset_text: str | None = None
    capability_overrides: str | None = None
    last_episode_id: str | None = None
    import_status: str | None = None
