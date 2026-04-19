"""Media-oriented async endpoints: generate-image/video, lip-sync, downloads."""

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.services.novel_promotion.common import ensure_np_project
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _queue_media(db, user_id, project_id, task_type, payload):
    np = ensure_np_project(db, user_id, project_id)
    return queue_np_task(
        db,
        user_id=user_id,
        project_id=project_id,
        task_type=task_type,
        target_type="np_project",
        target_id=np.id,
        payload=payload,
    )


@router.post("/{project_id}/generate-image")
def generate_image(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_generate_image", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/generate-video")
def generate_video(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_generate_video", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/lip-sync")
def lip_sync(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_lip_sync", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/download-images")
def download_images(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_download_images", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/download-videos")
def download_videos(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_download_videos", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/download-voices")
def download_voices(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_download_voices", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/copy-from-global")
def copy_from_global(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_copy_from_global", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/cleanup-unselected-images")
def cleanup_unselected_images(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_media(db, current_user.id, project_id, "np_cleanup_unselected_images", {})
    return {"success": True, "data": {"task_id": task.id}}
