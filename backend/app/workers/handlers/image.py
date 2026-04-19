"""Image generation handlers — character appearances, panels, locations.

All of them call the OpenAI-compatible image endpoint via ModelClient (with
whatever request_path the user configured for the image model), then ingest the
returned bytes into MinIO via MediaService so the content survives forever."""

from __future__ import annotations

from app.db.models.novel_promotion import (
    CharacterAppearance,
    LocationImage,
    NovelPromotionCharacter,
    NovelPromotionLocation,
    NovelPromotionPanel,
)
from app.services import media_service
from app.workers.handlers.base import make_client, progress, resolve_model_for_capability
from app.workers.registry import TaskContext, handler


def _first_image_payload(response: dict) -> tuple[str | None, str | None]:
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, list) or not data:
        return None, None
    first = data[0] if isinstance(data[0], dict) else {}
    return first.get("url"), first.get("b64_json")


def _ingest_image_result(
    ctx: TaskContext, url: str | None, b64: str | None, *, kind: str
) -> tuple[str | None, str | None]:
    """Return (media_id, internal_presigned_url) or (None, None) on empty."""
    if b64:
        result = media_service.ingest_b64(
            ctx.db, user_id=ctx.user_id, b64=b64, mime_type="image/png", kind=kind
        )
        return result.media.id, result.internal_url
    if url:
        result = media_service.ingest_external_url(
            ctx.db, user_id=ctx.user_id, url=url, kind=kind
        )
        return result.media.id, result.internal_url
    return None, None


@handler("np_generate_character_image")
async def generate_character_image(ctx: TaskContext) -> dict:
    character_id = ctx.target_id
    character = (
        ctx.db.query(NovelPromotionCharacter)
        .filter(NovelPromotionCharacter.id == character_id)
        .first()
    )
    if character is None:
        raise ValueError(f"character {character_id} not found")

    prompt = ctx.payload.get("prompt") or _prompt_for_character(character)
    appearance_id = ctx.payload.get("appearance_id")

    model = resolve_model_for_capability(ctx, "image")
    progress(ctx, "image-gen", 30, f"model={model.model_id}")
    resp = await make_client().image(model, prompt=prompt, size="1024x1024")
    url, b64 = _first_image_payload(resp)

    progress(ctx, "ingest", 70, "uploading to MinIO")
    media_id, internal_url = _ingest_image_result(ctx, url, b64, kind="character")
    if media_id is None:
        raise RuntimeError("image model returned no data")

    appearance = None
    if appearance_id:
        appearance = (
            ctx.db.query(CharacterAppearance)
            .filter(
                CharacterAppearance.id == appearance_id,
                CharacterAppearance.character_id == character_id,
            )
            .first()
        )
    if appearance is None:
        next_idx = (
            ctx.db.query(CharacterAppearance)
            .filter(CharacterAppearance.character_id == character_id)
            .count()
        )
        appearance = CharacterAppearance(
            character_id=character_id,
            appearance_index=next_idx,
            description=prompt[:500],
            image_prompt=prompt,
        )
        ctx.db.add(appearance)

    appearance.image_media_id = media_id
    appearance.image_url = internal_url
    ctx.db.commit()
    ctx.db.refresh(appearance)

    progress(ctx, "saved", 95)
    return {
        "appearance_id": appearance.id,
        "media_id": media_id,
        "image_url": internal_url,
        "model_used": model.model_id,
        "request_url": model.full_url,
    }


@handler("np_regenerate_panel_image")
async def regenerate_panel_image(ctx: TaskContext) -> dict:
    return await _panel_image(ctx, use_prompt_override=None)


@handler("np_regenerate_single_image")
async def regenerate_single_image(ctx: TaskContext) -> dict:
    return await _panel_image(ctx, use_prompt_override=None)


@handler("np_modify_panel_image")
async def modify_panel_image(ctx: TaskContext) -> dict:
    directive = ctx.payload.get("directive") or ctx.payload.get("prompt")
    return await _panel_image(ctx, use_prompt_override=directive)


@handler("np_generate_image")
async def generate_image_generic(ctx: TaskContext) -> dict:
    prompt = ctx.payload.get("prompt")
    if not prompt:
        raise ValueError("generate_image requires 'prompt' in payload")
    model = resolve_model_for_capability(ctx, "image")
    progress(ctx, "image-gen", 40, f"model={model.model_id}")
    resp = await make_client().image(
        model, prompt=prompt, size=ctx.payload.get("size", "1024x1024")
    )
    url, b64 = _first_image_payload(resp)
    progress(ctx, "ingest", 80)
    media_id, internal_url = _ingest_image_result(ctx, url, b64, kind="generic")
    if media_id is None:
        raise RuntimeError("image model returned no data")
    return {
        "media_id": media_id,
        "image_url": internal_url,
        "model_used": model.model_id,
        "request_url": model.full_url,
    }


@handler("np_ai_create_location")
async def ai_create_location(ctx: TaskContext) -> dict:
    name = ctx.payload.get("name") or "Untitled"
    hints = ctx.payload.get("hints") or ""
    model = resolve_model_for_capability(ctx, "image")
    prompt = f"{name}. {hints}".strip()
    progress(ctx, "image-gen", 30)
    resp = await make_client().image(model, prompt=prompt, size="1024x1024")
    url, b64 = _first_image_payload(resp)

    progress(ctx, "ingest", 70)
    media_id, internal_url = _ingest_image_result(ctx, url, b64, kind="location")

    from app.db.models.novel_promotion import NovelPromotionProject

    np = (
        ctx.db.query(NovelPromotionProject)
        .filter(NovelPromotionProject.project_id == ctx.project_id)
        .first()
    )
    location = NovelPromotionLocation(
        np_project_id=np.id, name=name[:200], summary=hints or None
    )
    ctx.db.add(location)
    ctx.db.flush()
    if media_id:
        img = LocationImage(
            location_id=location.id,
            image_prompt=prompt,
            image_url=internal_url,
            image_media_id=media_id,
        )
        ctx.db.add(img)
        ctx.db.flush()
        location.selected_image_id = img.id
    ctx.db.commit()
    ctx.db.refresh(location)
    return {"location_id": location.id, "media_id": media_id, "image_url": internal_url}


# ----- helpers -----


def _prompt_for_character(character) -> str:
    parts = [character.name]
    if character.introduction:
        parts.append(character.introduction[:500])
    if character.aliases:
        parts.append(f"aliases: {character.aliases[:200]}")
    return ". ".join(parts)


async def _panel_image(ctx: TaskContext, *, use_prompt_override: str | None) -> dict:
    panel_id = ctx.target_id
    panel = (
        ctx.db.query(NovelPromotionPanel).filter(NovelPromotionPanel.id == panel_id).first()
    )
    if panel is None:
        raise ValueError(f"panel {panel_id} not found")

    prompt = use_prompt_override or panel.image_prompt or panel.description
    if not prompt:
        raise ValueError("panel has no prompt to render")

    model = resolve_model_for_capability(ctx, "image")
    progress(ctx, "image-gen", 30, f"model={model.model_id}")
    resp = await make_client().image(model, prompt=prompt, size="1024x1024")
    url, b64 = _first_image_payload(resp)

    progress(ctx, "ingest", 70)
    media_id, internal_url = _ingest_image_result(ctx, url, b64, kind="panel")
    if media_id is None:
        raise RuntimeError("image model returned no data")

    panel.image_media_id = media_id
    panel.image_url = internal_url
    ctx.db.commit()
    ctx.db.refresh(panel)

    progress(ctx, "saved", 95)
    return {
        "panel_id": panel.id,
        "media_id": media_id,
        "image_url": internal_url,
        "model_used": model.model_id,
        "request_url": model.full_url,
    }
