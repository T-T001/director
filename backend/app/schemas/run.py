from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkflowRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str | None = None
    user_id: str
    project_id: str
    episode_id: str | None = None
    workflow_type: str
    target_type: str
    target_id: str
    status: str
    input_json: dict | None = None
    output_json: dict | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class WorkflowStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    step_key: str
    step_title: str
    status: str
    current_attempt: int
    step_index: int
    step_total: int
    started_at: datetime | None = None
    finished_at: datetime | None = None


class WorkflowEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: str
    event_type: str
    step_key: str | None = None
    seq: int
    payload_json: dict | None = None
    created_at: datetime
