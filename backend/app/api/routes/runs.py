from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.run import WorkflowEventRead
from app.services.run_service import RunService

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}/events")
def list_run_events(
    run_id: str,
    after_seq: int = Query(default=0, ge=0, alias="afterSeq"),
    limit: int = Query(default=200, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = RunService(db)
    service.ensure_run_visible(current_user.id, run_id)
    events = [
        WorkflowEventRead.model_validate(item).model_dump()
        for item in service.list_events(current_user.id, run_id, after_seq, limit)
    ]
    return {"success": True, "data": {"run_id": run_id, "after_seq": after_seq, "events": events}}
