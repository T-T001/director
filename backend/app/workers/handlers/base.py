"""Shared utilities for task handlers: model resolution, progress emit."""

from __future__ import annotations

from fastapi import HTTPException

from app.ai import ModelClient, ResolvedModel
from app.db.models.novel_promotion import NovelPromotionProject
from app.services.model_gateway_service import ModelGatewayService
from app.workers.events import emit
from app.workers.registry import TaskContext


def resolve_model_for_capability(
    ctx: TaskContext, capability: str, *, preferred_model_config_id: str | None = None
) -> ResolvedModel:
    """Find a usable ModelConfig: prefer the id in payload, else fall back
    to the first user-owned model matching `capability`.

    The NP project's `*_model` column is a free-form model name hint, not an
    FK to model_configs. We use it as a soft preference — if the user has
    configured a ModelConfig whose `model_id` matches, we pick that; otherwise
    we take any model with the right capability.
    """
    svc = ModelGatewayService(ctx.db)

    if preferred_model_config_id:
        return svc.resolve(ctx.user_id, preferred_model_config_id)

    np = (
        ctx.db.query(NovelPromotionProject)
        .filter(NovelPromotionProject.project_id == ctx.project_id)
        .first()
    )
    name_hint: str | None = None
    if np is not None:
        hint_map = {
            "chat": np.analysis_model,
            "image": np.image_model,
            "image_edit": np.edit_model,
            "video": np.video_model,
            "tts": np.audio_model,
        }
        name_hint = hint_map.get(capability)

    models = [m for m in svc.list_models(ctx.user_id, capability) if getattr(m, "enabled", True)]
    if not models:
        raise HTTPException(
            status_code=400,
            detail={"message": f"No enabled model configured with capability={capability}"},
        )

    if name_hint:
        for m in models:
            if m.model_id == name_hint or (m.display_name and m.display_name == name_hint):
                return svc.resolve(ctx.user_id, m.id)
    return svc.resolve(ctx.user_id, models[0].id)


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
