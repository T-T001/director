from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.episode import EpisodeRead
from app.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectSettingsRead,
    ProjectSettingsUpdate,
    ProjectUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = ProjectService(db)
    projects = [
        ProjectRead.model_validate(item).model_dump()
        for item in service.list_projects(current_user.id)
    ]
    return {"success": True, "data": {"projects": projects}}


@router.post("")
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ProjectService(db)
    project = service.create_project(current_user.id, payload)
    return {"success": True, "data": {"project": ProjectRead.model_validate(project).model_dump()}}


@router.get("/{project_id}")
def get_project(
    project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = ProjectService(db)
    project = service.get_project(current_user.id, project_id)
    return {"success": True, "data": {"project": ProjectRead.model_validate(project).model_dump()}}


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ProjectService(db)
    project = service.update_project(current_user.id, project_id, payload)
    return {"success": True, "data": {"project": ProjectRead.model_validate(project).model_dump()}}


@router.patch("/{project_id}/settings")
def update_project_settings(
    project_id: str,
    payload: ProjectSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ProjectService(db)
    settings = service.update_project_settings(current_user.id, project_id, payload)
    return {
        "success": True,
        "data": {
            "settings": ProjectSettingsRead.model_validate(settings).model_dump(),
        },
    }


@router.delete("/{project_id}")
def delete_project(
    project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = ProjectService(db)
    service.delete_project(current_user.id, project_id)
    return {"success": True, "data": {"deleted": True}}


@router.get("/{project_id}/workspace")
def get_workspace(
    project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = ProjectService(db)
    workspace = service.get_workspace(current_user.id, project_id)
    return {
        "success": True,
        "data": {
            "project": ProjectRead.model_validate(workspace["project"]).model_dump(),
            "settings": ProjectSettingsRead.model_validate(workspace["settings"]).model_dump()
            if workspace["settings"]
            else None,
            "episodes": [
                EpisodeRead.model_validate(item).model_dump() for item in workspace["episodes"]
            ],
            "latest_active_tasks": workspace["latest_active_tasks"],
        },
    }
