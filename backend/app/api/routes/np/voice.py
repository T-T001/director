from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion.entities import (
    SpeakerVoicePayload,
    VoiceLineCreate,
    VoiceLineRead,
    VoiceLineUpdate,
)
from app.services.novel_promotion.common import ensure_episode, ensure_np_project
from app.services.novel_promotion.task_queue import queue_np_task
from app.services.novel_promotion.voice import VoiceLineService

router = APIRouter()


def _line_ok(line) -> dict:
    return {
        "success": True,
        "data": {"voice_line": VoiceLineRead.model_validate(line).model_dump()},
    }


@router.get("/{project_id}/episodes/{episode_id}/voice-lines")
def list_voice_lines(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = VoiceLineService(db).list_(current_user.id, project_id, episode_id)
    return {
        "success": True,
        "data": {"voice_lines": [VoiceLineRead.model_validate(it).model_dump() for it in items]},
    }


@router.post("/{project_id}/episodes/{episode_id}/voice-lines")
def create_voice_line(
    project_id: str,
    episode_id: str,
    payload: VoiceLineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _line_ok(
        VoiceLineService(db).create(current_user.id, project_id, episode_id, payload)
    )


@router.patch("/{project_id}/voice-lines/{voice_line_id}")
def update_voice_line(
    project_id: str,
    voice_line_id: str,
    payload: VoiceLineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _line_ok(
        VoiceLineService(db).update(current_user.id, project_id, voice_line_id, payload)
    )


@router.delete("/{project_id}/voice-lines/{voice_line_id}")
def delete_voice_line(
    project_id: str,
    voice_line_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    VoiceLineService(db).delete(current_user.id, project_id, voice_line_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/{project_id}/episodes/{episode_id}/speaker-voice")
def set_speaker_voice(
    project_id: str,
    episode_id: str,
    payload: SpeakerVoicePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ep = ensure_episode(db, current_user.id, project_id, episode_id)
    import json

    current = {}
    if ep.speaker_voices:
        try:
            current = json.loads(ep.speaker_voices)
        except json.JSONDecodeError:
            current = {}
    current[payload.speaker] = payload.voice_preset_id
    ep.speaker_voices = json.dumps(current, ensure_ascii=False)
    db.commit()
    db.refresh(ep)
    return {"success": True, "data": {"speaker_voices": current}}


# async voice operations
def _queue_ep(db, user_id, project_id, episode_id, task_type, payload=None):
    return queue_np_task(
        db,
        user_id=user_id,
        project_id=project_id,
        task_type=task_type,
        target_type="np_episode",
        target_id=episode_id,
        episode_id=episode_id,
        payload=payload,
    )


@router.post("/{project_id}/episodes/{episode_id}/voice-analyze")
def voice_analyze(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_ep(db, current_user.id, project_id, episode_id, "np_voice_analyze")
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/episodes/{episode_id}/voice-design")
def voice_design(
    project_id: str,
    episode_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_ep(db, current_user.id, project_id, episode_id, "np_voice_design", payload)
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/episodes/{episode_id}/voice-generate")
def voice_generate(
    project_id: str,
    episode_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = _queue_ep(db, current_user.id, project_id, episode_id, "np_voice_generate")
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/voice-design-global")
def voice_design_global(
    project_id: str,
    payload: dict = Body(default_factory=dict),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    np = ensure_np_project(db, current_user.id, project_id)
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_voice_design_global",
        target_type="np_project",
        target_id=np.id,
        payload=payload,
    )
    return {"success": True, "data": {"task_id": task.id}}
