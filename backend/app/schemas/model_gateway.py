from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Capability = Literal[
    "chat", "image", "image_edit", "tts", "stt", "embedding", "video", "lipsync"
]


class ProviderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    base_url: str
    has_api_key: bool = False
    created_at: datetime
    updated_at: datetime


class ProviderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_url: str = Field(min_length=1, max_length=500)
    api_key: str | None = None


class ProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    base_url: str | None = Field(default=None, min_length=1, max_length=500)
    api_key: str | None = None


class ModelConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider_id: str
    model_id: str
    display_name: str | None = None
    capability: Capability
    request_path: str
    extra_headers: str | None = None
    default_params: str | None = None
    created_at: datetime
    updated_at: datetime


class ModelConfigCreate(BaseModel):
    provider_id: str
    model_id: str = Field(min_length=1, max_length=200)
    display_name: str | None = Field(default=None, max_length=200)
    capability: Capability
    request_path: str = Field(min_length=1, max_length=500)
    extra_headers: str | None = None
    default_params: str | None = None


class ModelConfigUpdate(BaseModel):
    model_id: str | None = Field(default=None, min_length=1, max_length=200)
    display_name: str | None = Field(default=None, max_length=200)
    capability: Capability | None = None
    request_path: str | None = Field(default=None, min_length=1, max_length=500)
    extra_headers: str | None = None
    default_params: str | None = None


class ModelTestResponse(BaseModel):
    success: bool
    request_url: str
    status_code: int | None = None
    response_preview: str | None = None
    error: str | None = None
