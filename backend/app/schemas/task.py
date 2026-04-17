from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCreateRequest(BaseModel):
    project_id: str
    episode_id: str | None = None
    task_type: str = Field(min_length=1, max_length=64)
    target_type: str = Field(min_length=1, max_length=64)
    target_id: str = Field(min_length=1, max_length=36)
    payload_json: dict | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: str
    episode_id: str | None = None
    task_type: str
    target_type: str
    target_id: str
    status: str
    progress: int
    payload_json: dict | None = None
    result_json: dict | None = None
    error_code: str | None = None
    error_message: str | None = None
    queued_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TaskEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: str
    project_id: str
    user_id: str
    event_type: str
    payload_json: dict | None = None
    created_at: datetime


class TaskSubmitResponse(BaseModel):
    task_id: str
    run_id: str
    status: str
    deduped: bool = False


class TaskDismissRequest(BaseModel):
    task_ids: list[str] = Field(min_length=1, max_length=200)
