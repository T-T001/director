from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.episode import EpisodeCreate, EpisodeRead, EpisodeUpdate
from app.services.episode_service import EpisodeService

router = APIRouter(tags=["episodes"])


@router.get("/projects/{project_id}/episodes")
def list_episodes(
    project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    service = EpisodeService(db)
    episodes = [
        EpisodeRead.model_validate(item).model_dump() for item in service.list_episodes(project_id)
    ]
    return {"success": True, "data": {"episodes": episodes}}


@router.post("/projects/{project_id}/episodes")
def create_episode(
    project_id: str,
    payload: EpisodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    service = EpisodeService(db)
    episode = service.create_episode(project_id, payload)
    return {"success": True, "data": {"episode": EpisodeRead.model_validate(episode).model_dump()}}


@router.get("/episodes/{episode_id}")
def get_episode(
    episode_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = EpisodeService(db)
    episode = service.get_episode(episode_id)
    get_project_for_user(episode.project_id, current_user.id, db)
    return {"success": True, "data": {"episode": EpisodeRead.model_validate(episode).model_dump()}}


@router.patch("/episodes/{episode_id}")
def update_episode(
    episode_id: str,
    payload: EpisodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = EpisodeService(db)
    existing = service.get_episode(episode_id)
    get_project_for_user(existing.project_id, current_user.id, db)
    episode = service.update_episode(episode_id, payload)
    return {"success": True, "data": {"episode": EpisodeRead.model_validate(episode).model_dump()}}


@router.delete("/episodes/{episode_id}")
def delete_episode(
    episode_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = EpisodeService(db)
    existing = service.get_episode(episode_id)
    get_project_for_user(existing.project_id, current_user.id, db)
    service.delete_episode(episode_id)
    return {"success": True, "data": {"deleted": True}}
