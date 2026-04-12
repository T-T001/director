from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.settings import SettingsRead, SettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = SettingsService(db)
    preference = service.get_or_create(current_user.id)
    return {
        "success": True,
        "data": {"settings": SettingsRead.model_validate(preference).model_dump()},
    }


@router.patch("")
def patch_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = SettingsService(db)
    preference = service.update(current_user.id, payload)
    return {
        "success": True,
        "data": {"settings": SettingsRead.model_validate(preference).model_dump()},
    }
