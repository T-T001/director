from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.storyboard import PanelUpdateRequest, StoryboardPanelRead, StoryboardRead
from app.services.episode_service import EpisodeService
from app.services.storyboard_service import StoryboardService
from app.services.task_service import (
    SUPPORTED_TASK_TYPE_PROMPT_MODIFY,
    SUPPORTED_TASK_TYPE_VIDEO_GENERATE,
    SUPPORTED_TASK_TYPE_VIDEO_LIPSYNC,
    TARGET_TYPE_PANEL,
    TaskService,
)

router = APIRouter(tags=["storyboards"])


@router.get("/episodes/{episode_id}/storyboards")
def list_storyboards(
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    episode_service = EpisodeService(db)
    episode = episode_service.get_episode(episode_id)
    get_project_for_user(episode.project_id, current_user.id, db)

    service = StoryboardService(db)
    storyboards = service.list_storyboards(current_user.id, episode_id)
    return {
        "success": True,
        "data": {
            "storyboards": [
                StoryboardRead.model_validate(item).model_dump() for item in storyboards
            ],
        },
    }


@router.get("/storyboards/{storyboard_id}")
def get_storyboard(
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = StoryboardService(db)
    storyboard = service.get_storyboard(current_user.id, storyboard_id)
    return {
        "success": True,
        "data": {
            "storyboard": StoryboardRead.model_validate(storyboard).model_dump(),
        },
    }


@router.patch("/panels/{panel_id}")
def patch_panel(
    panel_id: str,
    payload: PanelUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = StoryboardService(db)
    update_data = payload.model_dump(exclude_unset=True)
    panel = service.update_panel(
        current_user.id,
        panel_id,
        description=payload.description,
        image_prompt=payload.image_prompt,
        video_prompt=payload.video_prompt,
        set_description="description" in update_data,
        set_image_prompt="image_prompt" in update_data,
        set_video_prompt="video_prompt" in update_data,
    )
    return {
        "success": True,
        "data": {
            "panel": StoryboardPanelRead.model_validate(panel).model_dump(),
        },
    }


def _submit_panel_workflow(
    panel_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User,
    db: Session,
    *,
    workflow: str,
) -> dict:
    storyboard_service = StoryboardService(db)
    panel = storyboard_service.get_panel(current_user.id, panel_id)
    storyboard = storyboard_service.get_storyboard(current_user.id, panel.storyboard_id)

    task_type_map = {
        "prompt_modify": SUPPORTED_TASK_TYPE_PROMPT_MODIFY,
        "video_generate": SUPPORTED_TASK_TYPE_VIDEO_GENERATE,
        "video_lipsync": SUPPORTED_TASK_TYPE_VIDEO_LIPSYNC,
    }

    task_service = TaskService(db)
    task, run, deduped = task_service.submit_task(
        user_id=current_user.id,
        project_id=storyboard.project_id,
        task_type=task_type_map[workflow],
        target_type=TARGET_TYPE_PANEL,
        target_id=panel.id,
        episode_id=storyboard.episode_id,
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


@router.post("/panels/{panel_id}/prompt-modify")
def prompt_modify_panel(
    panel_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_panel_workflow(
        panel_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="prompt_modify",
    )


@router.post("/panels/{panel_id}/video-generate")
def generate_panel_video(
    panel_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_panel_workflow(
        panel_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="video_generate",
    )


@router.post("/panels/{panel_id}/video-lipsync")
def lipsync_panel_video(
    panel_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_panel_workflow(
        panel_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="video_lipsync",
    )
