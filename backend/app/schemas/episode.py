from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EpisodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    episode_number: int
    name: str
    description: str | None = None
    novel_text: str | None = None
    srt_content: str | None = None
    audio_media_id: str | None = None
    created_at: datetime
    updated_at: datetime


class EpisodeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    novel_text: str | None = None


class EpisodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    novel_text: str | None = None
    srt_content: str | None = None
    audio_media_id: str | None = None
