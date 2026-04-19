from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion.entities import (
    ClipCreate,
    ClipRead,
    ClipUpdate,
    EpisodeSplitByMarkersPayload,
    EpisodeSplitPayload,
    NPEpisodeBatchCreate,
    NPEpisodeCreate,
    NPEpisodeRead,
    NPEpisodeUpdate,
)
from app.services.novel_promotion.episodes import ClipService, NPEpisodeService
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _ep_ok(e) -> dict:
    return {"success": True, "data": {"episode": NPEpisodeRead.model_validate(e).model_dump()}}


def _clip_ok(c) -> dict:
    return {"success": True, "data": {"clip": ClipRead.model_validate(c).model_dump()}}


# ------- NP episodes -------


@router.get("/{project_id}/episodes")
def list_episodes(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = NPEpisodeService(db).list_(current_user.id, project_id)
    return {
        "success": True,
        "data": {"episodes": [NPEpisodeRead.model_validate(e).model_dump() for e in items]},
    }


@router.post("/{project_id}/episodes")
def create_episode(
    project_id: str,
    payload: NPEpisodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ep_ok(NPEpisodeService(db).create(current_user.id, project_id, payload))


@router.post("/{project_id}/episodes/batch")
def batch_create_episodes(
    project_id: str,
    payload: NPEpisodeBatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = NPEpisodeService(db).create_batch(current_user.id, project_id, payload)
    return {
        "success": True,
        "data": {"episodes": [NPEpisodeRead.model_validate(e).model_dump() for e in items]},
    }


@router.get("/{project_id}/episodes/{episode_id}")
def get_episode(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ep_ok(NPEpisodeService(db).get(current_user.id, project_id, episode_id))


@router.patch("/{project_id}/episodes/{episode_id}")
def update_episode(
    project_id: str,
    episode_id: str,
    payload: NPEpisodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _ep_ok(NPEpisodeService(db).update(current_user.id, project_id, episode_id, payload))


@router.delete("/{project_id}/episodes/{episode_id}")
def delete_episode(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    NPEpisodeService(db).delete(current_user.id, project_id, episode_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/{project_id}/episodes/{episode_id}/split")
def split_episode(
    project_id: str,
    episode_id: str,
    payload: EpisodeSplitPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_episode_split",
        target_type="np_episode",
        target_id=episode_id,
        episode_id=episode_id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/episodes/{episode_id}/split-by-markers")
def split_episode_by_markers(
    project_id: str,
    episode_id: str,
    payload: EpisodeSplitByMarkersPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_episode_split_by_markers",
        target_type="np_episode",
        target_id=episode_id,
        episode_id=episode_id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}


# ------- clips -------


@router.get("/{project_id}/episodes/{episode_id}/clips")
def list_clips(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = ClipService(db).list_(current_user.id, project_id, episode_id)
    return {
        "success": True,
        "data": {"clips": [ClipRead.model_validate(c).model_dump() for c in items]},
    }


@router.post("/{project_id}/episodes/{episode_id}/clips")
def create_clip(
    project_id: str,
    episode_id: str,
    payload: ClipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _clip_ok(ClipService(db).create(current_user.id, project_id, episode_id, payload))


@router.get("/{project_id}/clips/{clip_id}")
def get_clip(
    project_id: str,
    clip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _clip_ok(ClipService(db).get(current_user.id, project_id, clip_id))


@router.patch("/{project_id}/clips/{clip_id}")
def update_clip(
    project_id: str,
    clip_id: str,
    payload: ClipUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _clip_ok(ClipService(db).update(current_user.id, project_id, clip_id, payload))


@router.delete("/{project_id}/clips/{clip_id}")
def delete_clip(
    project_id: str,
    clip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ClipService(db).delete(current_user.id, project_id, clip_id)
    return {"success": True, "data": {"deleted": True}}
