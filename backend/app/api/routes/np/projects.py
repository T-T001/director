from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.novel_promotion import (
    NovelPromotionProjectRead,
    NovelPromotionProjectUpdate,
)
from app.services.novel_promotion import NovelPromotionProjectService

router = APIRouter()


@router.get("/{project_id}")
def get_np_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = NovelPromotionProjectService(db)
    np = service.get_or_create(current_user.id, project_id)
    return {
        "success": True,
        "data": {"np_project": NovelPromotionProjectRead.model_validate(np).model_dump()},
    }


@router.patch("/{project_id}")
def update_np_project(
    project_id: str,
    payload: NovelPromotionProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = NovelPromotionProjectService(db)
    np = service.update(current_user.id, project_id, payload)
    return {
        "success": True,
        "data": {"np_project": NovelPromotionProjectRead.model_validate(np).model_dump()},
    }
