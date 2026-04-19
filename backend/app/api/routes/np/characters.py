from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion.entities import (
    AICreateCharacterPayload,
    AIModifyAppearancePayload,
    AppearanceCreate,
    AppearanceRead,
    AppearanceUpdate,
    BatchProfileConfirmPayload,
    CharacterCreate,
    CharacterRead,
    CharacterUpdate,
    GenerateCharacterImagePayload,
    ProfileConfirmPayload,
    ReferenceToCharacterPayload,
    SelectCharacterImagePayload,
)
from app.services.novel_promotion.characters import AppearanceService, CharacterService
from app.services.novel_promotion.common import ensure_np_project
from app.services.novel_promotion.task_queue import queue_np_task

router = APIRouter()


def _char_ok(c) -> dict:
    return {"success": True, "data": {"character": CharacterRead.model_validate(c).model_dump()}}


def _app_ok(a) -> dict:
    return {"success": True, "data": {"appearance": AppearanceRead.model_validate(a).model_dump()}}


@router.get("/{project_id}/characters")
def list_characters(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = CharacterService(db).list_(current_user.id, project_id)
    return {
        "success": True,
        "data": {
            "characters": [CharacterRead.model_validate(c).model_dump() for c in items]
        },
    }


@router.post("/{project_id}/characters")
def create_character(
    project_id: str,
    payload: CharacterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _char_ok(CharacterService(db).create(current_user.id, project_id, payload))


@router.get("/{project_id}/characters/{character_id}")
def get_character(
    project_id: str,
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _char_ok(CharacterService(db).get(current_user.id, project_id, character_id))


@router.patch("/{project_id}/characters/{character_id}")
def update_character(
    project_id: str,
    character_id: str,
    payload: CharacterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _char_ok(
        CharacterService(db).update(current_user.id, project_id, character_id, payload)
    )


@router.delete("/{project_id}/characters/{character_id}")
def delete_character(
    project_id: str,
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    CharacterService(db).delete(current_user.id, project_id, character_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/{project_id}/characters/{character_id}/profile/confirm")
def confirm_profile(
    project_id: str,
    character_id: str,
    payload: ProfileConfirmPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _char_ok(
        CharacterService(db).confirm_profile(
            current_user.id, project_id, character_id, payload.profile_data
        )
    )


@router.post("/{project_id}/characters/profile/batch-confirm")
def batch_confirm_profile(
    project_id: str,
    payload: BatchProfileConfirmPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    n = CharacterService(db).batch_confirm_profile(
        current_user.id, project_id, payload.character_ids
    )
    return {"success": True, "data": {"updated": n}}


# appearances
@router.get("/{project_id}/characters/{character_id}/appearances")
def list_appearances(
    project_id: str,
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items = AppearanceService(db).list_(current_user.id, project_id, character_id)
    return {
        "success": True,
        "data": {
            "appearances": [AppearanceRead.model_validate(a).model_dump() for a in items]
        },
    }


@router.post("/{project_id}/characters/{character_id}/appearances")
def create_appearance(
    project_id: str,
    character_id: str,
    payload: AppearanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _app_ok(
        AppearanceService(db).create(current_user.id, project_id, character_id, payload)
    )


@router.patch("/{project_id}/characters/{character_id}/appearances/{appearance_id}")
def update_appearance(
    project_id: str,
    character_id: str,
    appearance_id: str,
    payload: AppearanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _app_ok(
        AppearanceService(db).update(
            current_user.id, project_id, character_id, appearance_id, payload
        )
    )


@router.post(
    "/{project_id}/characters/{character_id}/appearances/{appearance_id}/confirm-selection"
)
def confirm_selection(
    project_id: str,
    character_id: str,
    appearance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _app_ok(
        AppearanceService(db).confirm_selection(
            current_user.id, project_id, character_id, appearance_id
        )
    )


@router.post("/{project_id}/characters/{character_id}/select-image")
def select_character_image(
    project_id: str,
    character_id: str,
    payload: SelectCharacterImagePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _app_ok(
        AppearanceService(db).select_image(
            current_user.id,
            project_id,
            character_id,
            payload.appearance_id,
            payload.image_url,
            payload.image_media_id,
        )
    )


# async AI endpoints (queue-only)
@router.post("/{project_id}/characters/ai-create")
def ai_create_character(
    project_id: str,
    payload: AICreateCharacterPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    np = ensure_np_project(db, current_user.id, project_id)
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_ai_create_character",
        target_type="np_project",
        target_id=np.id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id, "status": task.status}}


@router.post("/{project_id}/characters/{character_id}/ai-modify-appearance")
def ai_modify_appearance(
    project_id: str,
    character_id: str,
    payload: AIModifyAppearancePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_ai_modify_appearance",
        target_type="np_character",
        target_id=character_id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/characters/reference")
def reference_to_character(
    project_id: str,
    payload: ReferenceToCharacterPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    np = ensure_np_project(db, current_user.id, project_id)
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_reference_to_character",
        target_type="np_project",
        target_id=np.id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}


@router.post("/{project_id}/characters/{character_id}/generate-image")
def generate_character_image(
    project_id: str,
    character_id: str,
    payload: GenerateCharacterImagePayload = Body(default_factory=GenerateCharacterImagePayload),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    task = queue_np_task(
        db,
        user_id=current_user.id,
        project_id=project_id,
        task_type="np_generate_character_image",
        target_type="np_character",
        target_id=character_id,
        payload=payload.model_dump(),
    )
    return {"success": True, "data": {"task_id": task.id}}
