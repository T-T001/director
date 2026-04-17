from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StoryboardPanelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    panel_index: int
    description: str
    image_prompt: str | None = None
    video_prompt: str | None = None
    image_media_id: str | None = None
    video_media_id: str | None = None
    created_at: datetime
    updated_at: datetime


class StoryboardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    episode_id: str
    panel_count: int
    created_at: datetime
    updated_at: datetime
    panels: list[StoryboardPanelRead]


class PanelUpdateRequest(BaseModel):
    description: str | None = None
    image_prompt: str | None = None
    video_prompt: str | None = None
