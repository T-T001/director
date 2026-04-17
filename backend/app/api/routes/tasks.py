from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.task import (
    TaskCreateRequest,
    TaskDismissRequest,
    TaskEventRead,
    TaskRead,
    TaskSubmitResponse,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    project_id: str | None = Query(default=None, alias="projectId"),
    target_type: str | None = Query(default=None, alias="targetType"),
    target_id: str | None = Query(default=None, alias="targetId"),
    status: list[str] = Query(default=[]),
    task_type: list[str] = Query(default=[], alias="type"),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = TaskService(db)
    tasks = service.list_tasks(
        user_id=current_user.id,
        project_id=project_id,
        target_type=target_type,
        target_id=target_id,
        statuses=status or None,
        task_types=task_type or None,
        limit=limit,
    )
    return {
        "success": True,
        "data": {
            "tasks": [TaskRead.model_validate(item).model_dump() for item in tasks],
        },
    }


@router.post("")
def create_task(
    payload: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = TaskService(db)

    if not service.supports_task_type(payload.task_type):
        supported = ", ".join(sorted(service.supported_task_types()))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": f"Unsupported taskType: {payload.task_type}. Supported: {supported}",
            },
        )

    task, run, deduped = service.submit_task(
        user_id=current_user.id,
        project_id=payload.project_id,
        task_type=payload.task_type,
        target_type=payload.target_type,
        target_id=payload.target_id,
        episode_id=payload.episode_id,
        payload_json=payload.payload_json,
        background_tasks=background_tasks,
    )
    body = TaskSubmitResponse(task_id=task.id, run_id=run.id, status=task.status, deduped=deduped)
    return {"success": True, "data": body.model_dump()}


@router.get("/{task_id}")
def get_task(
    task_id: str,
    include_events: int = Query(default=0, alias="includeEvents"),
    events_limit: int = Query(default=500, alias="eventsLimit", ge=1, le=5000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = TaskService(db)
    task = service.get_task(current_user.id, task_id)
    response = {
        "task": TaskRead.model_validate(task).model_dump(),
    }
    if include_events == 1:
        events = service.list_task_events(current_user.id, task_id, events_limit)
        response["events"] = [TaskEventRead.model_validate(item).model_dump() for item in events]
    return {"success": True, "data": response}


@router.delete("/{task_id}")
def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = TaskService(db)
    task, cancelled = service.cancel_task(current_user.id, task_id)
    return {
        "success": True,
        "data": {
            "cancelled": cancelled,
            "task": TaskRead.model_validate(task).model_dump(),
        },
    }


@router.post("/dismiss")
def dismiss_tasks(
    payload: TaskDismissRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = TaskService(db)
    dismissed = service.dismiss_failed_tasks(current_user.id, payload.task_ids)
    return {
        "success": True,
        "data": {
            "dismissed": dismissed,
        },
    }
