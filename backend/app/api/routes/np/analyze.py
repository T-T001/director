"""Analyze / pipeline kickoff endpoints. All async — worker (Phase 4) picks up."""

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.services.novel_promotion.common import ensure_episode, ensure_np_project
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _queue_np(db, user_id, project_id, task_type, payload, episode_id: str | None = None):
    np = ensure_np_project(db, user_id, project_id)
    target_type = "np_project"
    target_id = np.id
    if episode_id:
        ensure_episode(db, user_id, project_id, episode_id)
        target_type = "np_episode"
        target_id = episode_id
    return queue_np_task(
        db,
        user_id=user_id,
        project_id=project_id,
        task_type=task_type,
        target_type=target_type,
        target_id=target_id,
        episode_id=episode_id,
        payload=payload,
    )


@router.post("/{project_id}/analyze")
def analyze(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    episode_id = payload.get("episode_id") if isinstance(payload, dict) else None
    task = _queue_np(db, current_user.id, project_id, "np_analyze", payload, episode_id)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/analyze-global")
def analyze_global(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_np(db, current_user.id, project_id, "np_analyze_global", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/screenplay-conversion")
def screenplay_conversion(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    episode_id = payload.get("episode_id") if isinstance(payload, dict) else None
    task = _queue_np(
        db, current_user.id, project_id, "np_screenplay_conversion", payload, episode_id
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/story-to-script-stream")
def story_to_script_stream(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    episode_id = payload.get("episode_id") if isinstance(payload, dict) else None
    task = _queue_np(
        db, current_user.id, project_id, "np_story_to_script_stream", payload, episode_id
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/script-to-storyboard-stream")
def script_to_storyboard_stream(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    episode_id = payload.get("episode_id") if isinstance(payload, dict) else None
    task = _queue_np(
        db, current_user.id, project_id, "np_script_to_storyboard_stream", payload, episode_id
    )
    return {"success": True, "data": {"task_id": task.id}}
