from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.episode import EpisodeCreate, EpisodeRead, EpisodeUpdate
from app.services.episode_service import EpisodeService
from app.services.task_service import (
    SUPPORTED_TASK_TYPE_PROMPT_SOURCE_APPEND,
    SUPPORTED_TASK_TYPE_SCRIPT_TO_STORYBOARD,
    SUPPORTED_TASK_TYPE_STORY_TO_SCRIPT,
    SUPPORTED_TASK_TYPE_VOICE_GENERATE,
    TARGET_TYPE_EPISODE,
    TaskService,
)

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


def _submit_episode_workflow(
    episode_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User,
    db: Session,
    *,
    workflow: str,
) -> dict:
    episode_service = EpisodeService(db)
    episode = episode_service.get_episode(episode_id)
    get_project_for_user(episode.project_id, current_user.id, db)

    task_service = TaskService(db)
    task_type_map = {
        "story_to_script": SUPPORTED_TASK_TYPE_STORY_TO_SCRIPT,
        "script_to_storyboard": SUPPORTED_TASK_TYPE_SCRIPT_TO_STORYBOARD,
        "prompt_source_append": SUPPORTED_TASK_TYPE_PROMPT_SOURCE_APPEND,
        "voice_generate": SUPPORTED_TASK_TYPE_VOICE_GENERATE,
    }
    task_type = task_type_map[workflow]
    task, run, deduped = task_service.submit_task(
        user_id=current_user.id,
        project_id=episode.project_id,
        task_type=task_type,
        target_type=TARGET_TYPE_EPISODE,
        target_id=episode.id,
        episode_id=episode.id,
        payload_json=payload,
        background_tasks=background_tasks,
    )

    return {
        "success": True,
        "data": {
            "task_id": task.id,
            "run_id": run.id,
            "status": task.status,
            "deduped": deduped,
        },
    }


@router.post("/episodes/{episode_id}/story-to-script")
def story_to_script(
    episode_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_episode_workflow(
        episode_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="story_to_script",
    )


@router.post("/episodes/{episode_id}/script-to-storyboard")
def script_to_storyboard(
    episode_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_episode_workflow(
        episode_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="script_to_storyboard",
    )


@router.post("/episodes/{episode_id}/prompt-source")
def append_prompt_source(
    episode_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_episode_workflow(
        episode_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="prompt_source_append",
    )


@router.post("/episodes/{episode_id}/voice-generate")
def voice_generate(
    episode_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_episode_workflow(
        episode_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="voice_generate",
    )
