from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkflowEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: str
    event_type: str
    step_key: str | None = None
    seq: int
    payload_json: dict | None = None
    created_at: datetime
