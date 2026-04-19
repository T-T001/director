from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion.entities import (
    AICreateLocationPayload,
    AIModifyLocationPayload,
    LocationCreate,
    LocationRead,
    LocationUpdate,
    SelectLocationImagePayload,
)
from app.services.novel_promotion.common import ensure_np_project
from app.services.novel_promotion.locations import LocationService
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _ok(loc) -> dict:
    return {"success": True, "data": {"location": LocationRead.model_validate(loc).model_dump()}}


@router.get("/{project_id}/locations")
def list_locations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = LocationService(db).list_(current_user.id, project_id)
    return {
        "success": True,
        "data": {"locations": [LocationRead.model_validate(it).model_dump() for it in items]},
    }


@router.post("/{project_id}/locations")
def create_location(
    project_id: str,
    payload: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ok(LocationService(db).create(current_user.id, project_id, payload))


@router.patch("/{project_id}/locations/{location_id}")
def update_location(
    project_id: str,
    location_id: str,
    payload: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ok(LocationService(db).update(current_user.id, project_id, location_id, payload))


@router.delete("/{project_id}/locations/{location_id}")
def delete_location(
    project_id: str,
    location_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    LocationService(db).delete(current_user.id, project_id, location_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/{project_id}/locations/{location_id}/select-image")
def select_location_image(
    project_id: str,
    location_id: str,
    payload: SelectLocationImagePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ok(
        LocationService(db).select_image(
            current_user.id, project_id, location_id, payload.image_id
        )
    )


@router.post("/{project_id}/locations/ai-create")
def ai_create_location(
    project_id: str,
    payload: AICreateLocationPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    np = ensure_np_project(db, current_user.id, project_id)
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_ai_create_location",
        target_type="np_project",
        target_id=np.id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/locations/{location_id}/ai-modify")
def ai_modify_location(
    project_id: str,
    location_id: str,
    payload: AIModifyLocationPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_ai_modify_location",
        target_type="np_location",
        target_id=location_id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}
