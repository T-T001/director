"""Character / appearance AI handlers (non-image ones)."""

from __future__ import annotations

import json

from app.db.models.novel_promotion import (
    CharacterAppearance,
    NovelPromotionCharacter,
    NovelPromotionProject,
)
from app.workers.handlers.base import make_client, progress, resolve_model_for_capability
from app.workers.registry import TaskContext, handler


_DESIGN_SYSTEM = (
    "You design a novel character. Output STRICT JSON: "
    "{name, introduction, appearance_description, image_prompt}. No prose."
)


@handler("np_ai_create_character")
async def ai_create_character(ctx: TaskContext) -> dict:
    name = ctx.payload.get("name") or "Untitled"
    hints = ctx.payload.get("hints") or ""

    model = resolve_model_for_capability(ctx, "chat")
    progress(ctx, "llm-call", 30)
    resp = await make_client().chat(
        model,
        messages=[
            {"role": "system", "content": _DESIGN_SYSTEM},
            {"role": "user", "content": f"Name: {name}\nHints: {hints}"},
        ],
        temperature=0.6,
    )
    parsed = _safe_json(_content(resp))

    np = (
        ctx.db.query(NovelPromotionProject)
        .filter(NovelPromotionProject.project_id == ctx.project_id)
        .first()
    )
    if np is None:
        np = NovelPromotionProject(project_id=ctx.project_id)
        ctx.db.add(np)
        ctx.db.flush()

    character = NovelPromotionCharacter(
        np_project_id=np.id,
        name=(parsed.get("name") or name)[:200],
        introduction=parsed.get("introduction"),
    )
    ctx.db.add(character)
    ctx.db.flush()

    if parsed.get("appearance_description") or parsed.get("image_prompt"):
        ctx.db.add(
            CharacterAppearance(
                character_id=character.id,
                appearance_index=0,
                description=parsed.get("appearance_description"),
                image_prompt=parsed.get("image_prompt"),
            )
        )

    ctx.db.commit()
    ctx.db.refresh(character)
    return {"character_id": character.id, "model_used": model.model_id}


@handler("np_ai_modify_appearance")
async def ai_modify_appearance(ctx: TaskContext) -> dict:
    appearance_id = ctx.payload.get("appearance_id")
    prompt = ctx.payload.get("prompt") or ""
    if not appearance_id:
        raise ValueError("appearance_id required")
    appearance = (
        ctx.db.query(CharacterAppearance).filter(CharacterAppearance.id == appearance_id).first()
    )
    if appearance is None:
        raise ValueError("appearance not found")

    model = resolve_model_for_capability(ctx, "chat")
    progress(ctx, "llm-call", 40)
    resp = await make_client().chat(
        model,
        messages=[
            {
                "role": "system",
                "content": "Rewrite the character appearance image prompt per the user's directive. Output the new prompt as plain text, no preamble.",
            },
            {
                "role": "user",
                "content": f"Current: {appearance.image_prompt or appearance.description or ''}\nDirective: {prompt}",
            },
        ],
        temperature=0.5,
    )
    new_prompt = _content(resp).strip()
    if new_prompt:
        appearance.image_prompt = new_prompt
        ctx.db.commit()
    return {"appearance_id": appearance.id, "new_prompt": new_prompt, "model_used": model.model_id}


@handler("np_ai_modify_location")
async def ai_modify_location(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "ai_modify_location stub — requires DB write of new prompt"}


@handler("np_reference_to_character")
async def reference_to_character(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "reference_to_character stub — needs vision-capable model"}


# ----- helpers -----


def _content(response: dict) -> str:
    try:
        return response["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def _safe_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass
    return {}
