"""Voice / TTS handlers. Ingest audio to MinIO like image handlers."""

from __future__ import annotations

import base64

from app.db.models.novel_promotion import NovelPromotionVoiceLine
from app.services import media_service
from app.workers.handlers.base import make_client, progress, resolve_model_for_capability
from app.workers.registry import TaskContext, handler


def _extract_audio(response: dict) -> tuple[str | None, bytes | None, str]:
    """Return (url, raw_bytes, mime). Handles url-style and base64 responses."""
    if not isinstance(response, dict):
        return None, None, "audio/mpeg"
    url = response.get("url")
    if isinstance(url, str):
        return url, None, response.get("mime_type", "audio/mpeg")
    b64 = response.get("audio") or response.get("b64_json") or response.get("data")
    if isinstance(b64, str):
        try:
            return None, base64.b64decode(b64), response.get("mime_type", "audio/mpeg")
        except ValueError:
            return None, None, "audio/mpeg"
    return None, None, "audio/mpeg"


@handler("np_voice_generate")
async def voice_generate(ctx: TaskContext) -> dict:
    episode_id = ctx.target_id
    lines = (
        ctx.db.query(NovelPromotionVoiceLine)
        .filter(NovelPromotionVoiceLine.episode_id == episode_id)
        .order_by(NovelPromotionVoiceLine.line_index.asc())
        .all()
    )
    if not lines:
        return {"note": "no voice lines to generate"}

    model = resolve_model_for_capability(ctx, "tts")
    client = make_client()
    progress(ctx, "tts-call", 5, f"lines={len(lines)} model={model.model_id}")

    generated = 0
    total = len(lines)
    for idx, line in enumerate(lines):
        if line.audio_media_id:
            continue
        try:
            resp = await client.tts(model, text=line.content or "", voice=line.voice_preset_id)
            url, raw, mime = _extract_audio(resp)
            if raw is not None:
                result = media_service.ingest_bytes(
                    ctx.db, user_id=ctx.user_id, data=raw, content_type=mime, kind="voice"
                )
                line.audio_media_id = result.media.id
                line.audio_url = result.internal_url
                generated += 1
            elif url:
                result = media_service.ingest_external_url(
                    ctx.db, user_id=ctx.user_id, url=url, kind="voice"
                )
                line.audio_media_id = result.media.id
                line.audio_url = result.internal_url
                generated += 1
        except Exception as exc:  # noqa: BLE001
            progress(ctx, "tts-skip", 5 + int(90 * (idx + 1) / total), f"{line.id}: {exc}")
            continue
        progress(ctx, "tts-progress", 5 + int(90 * (idx + 1) / total), f"{idx + 1}/{total}")

    ctx.db.commit()
    return {"generated": generated, "total": total, "model_used": model.model_id}


@handler("np_voice_analyze")
async def voice_analyze(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "voice_analyze stub — implement LLM-based speaker/line extraction"}


@handler("np_voice_design")
async def voice_design(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "voice_design stub — implement voice preset picking"}


@handler("np_voice_design_global")
async def voice_design_global(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "voice_design_global stub"}
