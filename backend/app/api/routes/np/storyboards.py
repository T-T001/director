from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion.entities import (
    PanelAIModifyPromptPayload,
    PanelCreate,
    PanelLinkPayload,
    PanelPromptUpdatePayload,
    PanelRead,
    PanelSelectCandidatePayload,
    PanelUpdate,
    PanelVariantPayload,
    ShotRead,
    ShotUpdate,
    StoryboardCreate,
    StoryboardRead,
    StoryboardUpdate,
    SupplementaryPanelCreate,
    SupplementaryPanelRead,
)
from app.services.novel_promotion.common import ensure_panel
from app.services.novel_promotion.storyboards import (
    PanelService,
    ShotService,
    StoryboardService,
)
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _sb_ok(sb) -> dict:
    return {"success": True, "data": {"storyboard": StoryboardRead.model_validate(sb).model_dump()}}


def _panel_ok(p) -> dict:
    return {"success": True, "data": {"panel": PanelRead.model_validate(p).model_dump()}}


# ------- shots -------


@router.get("/{project_id}/episodes/{episode_id}/shots")
def list_shots(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = ShotService(db).list_(current_user.id, project_id, episode_id)
    return {
        "success": True,
        "data": {"shots": [ShotRead.model_validate(s).model_dump() for s in items]},
    }


@router.patch("/{project_id}/shots/{shot_id}")
def update_shot(
    project_id: str,
    shot_id: str,
    payload: ShotUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    s = ShotService(db).update(current_user.id, project_id, shot_id, payload)
    return {"success": True, "data": {"shot": ShotRead.model_validate(s).model_dump()}}


@router.post("/{project_id}/episodes/{episode_id}/analyze-shot-variants")
def analyze_shot_variants(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_analyze_shot_variants",
        target_type="np_episode",
        target_id=episode_id,
        episode_id=episode_id,
    )
    return {"success": True, "data": {"task_id": task.id}}


# ------- storyboards -------


@router.get("/{project_id}/clips/{clip_id}/storyboard")
def get_storyboard_for_clip(
    project_id: str,
    clip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    sb = StoryboardService(db).list_for_clip(current_user.id, project_id, clip_id)
    return {
        "success": True,
        "data": {
            "storyboard": StoryboardRead.model_validate(sb).model_dump() if sb else None
        },
    }


@router.post("/{project_id}/clips/{clip_id}/storyboard")
def create_storyboard_for_clip(
    project_id: str,
    clip_id: str,
    payload: StoryboardCreate = Body(default_factory=StoryboardCreate),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _sb_ok(StoryboardService(db).create_for_clip(current_user.id, project_id, clip_id, payload))


@router.get("/{project_id}/storyboards/{storyboard_id}")
def get_storyboard(
    project_id: str,
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _sb_ok(StoryboardService(db).get(current_user.id, project_id, storyboard_id))


@router.patch("/{project_id}/storyboards/{storyboard_id}")
def update_storyboard(
    project_id: str,
    storyboard_id: str,
    payload: StoryboardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _sb_ok(
        StoryboardService(db).update(current_user.id, project_id, storyboard_id, payload)
    )


@router.post("/{project_id}/storyboards/{storyboard_id}/supplementary-panels")
def add_supplementary_panel(
    project_id: str,
    storyboard_id: str,
    payload: SupplementaryPanelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    sp = StoryboardService(db).add_supplementary_panel(
        current_user.id, project_id, storyboard_id, payload
    )
    return {
        "success": True,
        "data": {
            "supplementary_panel": SupplementaryPanelRead.model_validate(sp).model_dump()
        },
    }


# async storyboard operations
def _queue_storyboard(
    db, user_id, project_id: str, storyboard_id: str, task_type: str, payload: dict | None = None
):
    return queue_np_task(
        db,
        user_id=user_id,
        project_id=project_id,
        task_type=task_type,
        target_type="np_storyboard",
        target_id=storyboard_id,
        payload=payload,
    )


@router.post("/{project_id}/storyboards/{storyboard_id}/photography-plan")
def photography_plan(
    project_id: str,
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_storyboard(
        db, current_user.id, project_id, storyboard_id, "np_photography_plan"
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/storyboards/{storyboard_id}/regenerate-text")
def regenerate_storyboard_text(
    project_id: str,
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_storyboard(
        db, current_user.id, project_id, storyboard_id, "np_regenerate_storyboard_text"
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/storyboards/{storyboard_id}/regenerate-group")
def regenerate_storyboard_group(
    project_id: str,
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_storyboard(
        db, current_user.id, project_id, storyboard_id, "np_regenerate_storyboard_group"
    )
    return {"success": True, "data": {"task_id": task.id}}


# ------- panels -------


@router.get("/{project_id}/storyboards/{storyboard_id}/panels")
def list_panels(
    project_id: str,
    storyboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = PanelService(db).list_for_storyboard(current_user.id, project_id, storyboard_id)
    return {
        "success": True,
        "data": {"panels": [PanelRead.model_validate(p).model_dump() for p in items]},
    }


@router.post("/{project_id}/storyboards/{storyboard_id}/panels")
def create_panel(
    project_id: str,
    storyboard_id: str,
    payload: PanelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(
        PanelService(db).create(current_user.id, project_id, storyboard_id, payload)
    )


@router.get("/{project_id}/panels/{panel_id}")
def get_panel(
    project_id: str,
    panel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(PanelService(db).get(current_user.id, project_id, panel_id))


@router.patch("/{project_id}/panels/{panel_id}")
def update_panel(
    project_id: str,
    panel_id: str,
    payload: PanelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(PanelService(db).update(current_user.id, project_id, panel_id, payload))


@router.delete("/{project_id}/panels/{panel_id}")
def delete_panel(
    project_id: str,
    panel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    PanelService(db).delete(current_user.id, project_id, panel_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/{project_id}/panels/{panel_id}/link")
def link_panel(
    project_id: str,
    panel_id: str,
    payload: PanelLinkPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(PanelService(db).link(current_user.id, project_id, panel_id, payload))


@router.post("/{project_id}/panels/{panel_id}/select-candidate")
def panel_select_candidate(
    project_id: str,
    panel_id: str,
    payload: PanelSelectCandidatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(
        PanelService(db).select_candidate(current_user.id, project_id, panel_id, payload)
    )


@router.patch("/{project_id}/panels/{panel_id}/prompt")
def update_panel_prompt(
    project_id: str,
    panel_id: str,
    payload: PanelPromptUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    panel = ensure_panel(db, current_user.id, project_id, panel_id)
    if payload.image_prompt is not None:
        panel.image_prompt = payload.image_prompt
    if payload.video_prompt is not None:
        panel.video_prompt = payload.video_prompt
    db.commit()
    db.refresh(panel)
    return _panel_ok(panel)


@router.post("/{project_id}/storyboards/{storyboard_id}/insert-panel")
def insert_panel(
    project_id: str,
    storyboard_id: str,
    at_index: int = Body(embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _panel_ok(
        PanelService(db).insert(current_user.id, project_id, storyboard_id, at_index)
    )


# panel async ops
def _queue_panel(db, user_id, project_id, panel_id, task_type, payload=None):
    return queue_np_task(
        db,
        user_id=user_id,
        project_id=project_id,
        task_type=task_type,
        target_type="np_panel",
        target_id=panel_id,
        payload=payload,
    )


@router.post("/{project_id}/panels/{panel_id}/variant")
def panel_variant(
    project_id: str,
    panel_id: str,
    payload: PanelVariantPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_panel(
        db, current_user.id, project_id, panel_id, "np_panel_variant", payload.model_dump()
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/panels/{panel_id}/regenerate-image")
def regenerate_panel_image(
    project_id: str,
    panel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_panel(db, current_user.id, project_id, panel_id, "np_regenerate_panel_image")
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/panels/{panel_id}/regenerate-single")
def regenerate_panel_single(
    project_id: str,
    panel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_panel(db, current_user.id, project_id, panel_id, "np_regenerate_single_image")
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/panels/{panel_id}/modify-image")
def modify_panel_image(
    project_id: str,
    panel_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_panel(db, current_user.id, project_id, panel_id, "np_modify_panel_image", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/panels/{panel_id}/ai-modify-prompt")
def ai_modify_panel_prompt(
    project_id: str,
    panel_id: str,
    payload: PanelAIModifyPromptPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_panel(
        db, current_user.id, project_id, panel_id, "np_ai_modify_prompt", payload.model_dump()
    )
    return {"success": True, "data": {"task_id": task.id}}
