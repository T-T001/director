from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    art_style: str
    video_ratio: str
    video_resolution: str


class ProjectSettingsUpdate(BaseModel):
    analysis_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    art_style: str | None = None
    video_ratio: str | None = None
    video_resolution: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class ProjectWorkspaceRead(BaseModel):
    project: ProjectRead
    settings: ProjectSettingsRead | None
    episodes: list["EpisodeRead"]
    latest_active_tasks: list[dict] = []


from app.schemas.episode import EpisodeRead  # noqa: E402
