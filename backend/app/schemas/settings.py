from pydantic import BaseModel, ConfigDict


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    art_style: str
    video_ratio: str
    video_resolution: str


class SettingsUpdate(BaseModel):
    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    art_style: str | None = None
    video_ratio: str | None = None
    video_resolution: str | None = None
