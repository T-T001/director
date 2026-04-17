from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    kind: str
    description: str | None = None
    preview_media_id: str | None = None
    image_url: str | None = None
    updated_at: datetime


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class AssetModifyRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    extra_image_urls: list[str] | None = None
    preview_media_id: str | None = None
