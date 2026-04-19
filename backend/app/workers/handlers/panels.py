"""Panel-level AI handlers (prompt rewriting, variants)."""

from __future__ import annotations

from app.db.models.novel_promotion import NovelPromotionPanel
from app.workers.handlers.base import make_client, progress, resolve_model_for_capability
from app.workers.registry import TaskContext, handler


@handler("np_ai_modify_prompt")
async def ai_modify_prompt(ctx: TaskContext) -> dict:
    panel_id = ctx.target_id
    directive = ctx.payload.get("directive") or ""
    panel = (
        ctx.db.query(NovelPromotionPanel).filter(NovelPromotionPanel.id == panel_id).first()
    )
    if panel is None:
        raise ValueError("panel not found")

    model = resolve_model_for_capability(ctx, "chat")
    progress(ctx, "llm-call", 40, f"model={model.model_id}")
    resp = await make_client().chat(
        model,
        messages=[
            {
                "role": "system",
                "content": "Rewrite the image prompt according to the user's directive. Output the prompt only, no preamble.",
            },
            {
                "role": "user",
                "content": f"Current: {panel.image_prompt or panel.description or ''}\nDirective: {directive}",
            },
        ],
        temperature=0.4,
    )
    try:
        new_prompt = resp["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        new_prompt = ""
    if new_prompt:
        panel.image_prompt = new_prompt
        ctx.db.commit()
    return {"panel_id": panel.id, "new_prompt": new_prompt, "model_used": model.model_id}


@handler("np_panel_variant")
async def panel_variant(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "panel_variant stub — delegates to image regeneration"}
