"""Shared utilities for task handlers: model resolution, progress emit."""

from __future__ import annotations

from fastapi import HTTPException

from app.ai import ModelClient, ResolvedModel
from app.db.models.novel_promotion import NovelPromotionProject
from app.db.models.project import Project
from app.db.models.user import UserPreference
from app.services.model_gateway_service import ModelGatewayService
from app.workers.events import emit
from app.workers.registry import TaskContext


def _preferred_name_hints(
    db, *, user_id: str, project_id: str | None, capability: str
) -> list[str]:
    hints: list[str] = []

    np = None
    if project_id:
        np = (
            db.query(NovelPromotionProject)
            .filter(NovelPromotionProject.project_id == project_id)
            .first()
        )
    if np is not None:
        hint_map = {
            "chat": np.analysis_model,
            "image": np.image_model,
            "image_edit": np.edit_model,
            "video": np.video_model,
            "tts": np.audio_model,
        }
        hint = hint_map.get(capability)
        if hint:
            hints.append(hint)

    if capability == "chat" and project_id:
        project = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
        if project and project.settings and project.settings.analysis_model:
            hints.append(project.settings.analysis_model)

    preferences = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if preferences is not None:
        preference_map = {
            "chat": preferences.analysis_model,
            "image": preferences.image_model,
            "video": preferences.video_model,
            "tts": preferences.audio_model,
        }
        hint = preference_map.get(capability)
        if hint:
            hints.append(hint)

    seen: set[str] = set()
    ordered: list[str] = []
    for hint in hints:
        if hint not in seen:
            seen.add(hint)
            ordered.append(hint)
    return ordered


def resolve_model_for_user_and_project(
    db, *, user_id: str, capability: str, project_id: str | None = None, preferred_model_config_id: str | None = None
) -> ResolvedModel:
    svc = ModelGatewayService(db)

    if preferred_model_config_id:
        return svc.resolve(user_id, preferred_model_config_id)

    models = [m for m in svc.list_models(user_id, capability) if getattr(m, "enabled", True)]
    if not models:
        raise HTTPException(
            status_code=400,
            detail={"message": f"No enabled model configured with capability={capability}"},
        )

    for name_hint in _preferred_name_hints(db, user_id=user_id, project_id=project_id, capability=capability):
        for m in models:
            if m.model_id == name_hint or (m.display_name and m.display_name == name_hint):
                return svc.resolve(user_id, m.id)

    return svc.resolve(user_id, models[0].id)


def resolve_model_for_capability(
    ctx: TaskContext, capability: str, *, preferred_model_config_id: str | None = None
) -> ResolvedModel:
    """Find a usable ModelConfig: prefer explicit id, then project/user hints, then first enabled model."""
    return resolve_model_for_user_and_project(
        ctx.db,
        user_id=ctx.user_id,
        project_id=ctx.project_id,
        capability=capability,
        preferred_model_config_id=preferred_model_config_id,
    )


def progress(ctx: TaskContext, stage: str, value: int, message: str | None = None) -> None:
    """Shortcut to emit a progress event on the current task."""
    task = ctx.task
    task.progress = value
    ctx.db.commit()
    emit(
        ctx.db,
        task_id=task.id,
        project_id=task.project_id,
        user_id=task.user_id,
        stage=stage,
        progress=value,
        message=message,
    )


def make_client() -> ModelClient:
    return ModelClient(timeout=60.0, retries=1)
