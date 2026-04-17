from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.run import WorkflowEventRead, WorkflowRunRead, WorkflowStepRead
from app.services.run_service import RunService

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("")
def list_runs(
    project_id: str | None = Query(default=None, alias="projectId"),
    workflow_type: str | None = Query(default=None, alias="workflowType"),
    target_type: str | None = Query(default=None, alias="targetType"),
    target_id: str | None = Query(default=None, alias="targetId"),
    episode_id: str | None = Query(default=None, alias="episodeId"),
    status: list[str] = Query(default=[]),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = RunService(db)
    runs = service.list_runs(
        user_id=current_user.id,
        project_id=project_id,
        workflow_type=workflow_type,
        target_type=target_type,
        target_id=target_id,
        episode_id=episode_id,
        statuses=status or None,
        limit=limit,
    )
    return {
        "success": True,
        "data": {
            "runs": [WorkflowRunRead.model_validate(item).model_dump() for item in runs],
        },
    }


@router.get("/{run_id}")
def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = RunService(db)
    run, steps = service.get_run_snapshot(current_user.id, run_id)
    return {
        "success": True,
        "data": {
            "run": WorkflowRunRead.model_validate(run).model_dump(),
            "steps": [WorkflowStepRead.model_validate(item).model_dump() for item in steps],
        },
    }


@router.post("/{run_id}/cancel")
def cancel_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = RunService(db)
    run = service.cancel_run(current_user.id, run_id)
    return {
        "success": True,
        "data": {
            "run": WorkflowRunRead.model_validate(run).model_dump(),
        },
    }


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
    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "after_seq": after_seq,
            "events": events,
        },
    }
