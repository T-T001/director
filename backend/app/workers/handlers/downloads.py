"""Download-packaging handlers: gather episode assets, stream into a zip,
push the zip back to MinIO, return a presigned download URL."""

from __future__ import annotations

import io
import zipfile
from typing import Iterable

from app.core import storage
from app.db.models.media import MediaObject
from app.db.models.novel_promotion import (
    CharacterAppearance,
    NovelPromotionEpisode,
    NovelPromotionPanel,
    NovelPromotionStoryboard,
    NovelPromotionVoiceLine,
)
from app.services import media_service
from app.workers.handlers.base import progress
from app.workers.registry import TaskContext, handler


def _ext_for_mime(mime: str | None) -> str:
    if not mime:
        return ""
    mime = mime.split(";")[0].strip().lower()
    return {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
    }.get(mime, "")


def _zip_medias(
    medias: Iterable[tuple[str, MediaObject]], *, task_label: str, ctx: TaskContext
) -> bytes:
    """Build an in-memory zip. items = list of (filename_base, media_object)."""
    buf = io.BytesIO()
    items = list(medias)
    total = max(len(items), 1)
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, (label, media) in enumerate(items):
            try:
                data = storage.download_bytes(media.storage_key)
            except Exception as exc:  # noqa: BLE001
                progress(
                    ctx,
                    "zip-skip",
                    10 + int(80 * (idx + 1) / total),
                    f"{label}: {exc}",
                )
                continue
            ext = _ext_for_mime(media.mime_type)
            zf.writestr(f"{label}{ext}", data)
            progress(
                ctx,
                "zip",
                10 + int(80 * (idx + 1) / total),
                f"{task_label}: {idx + 1}/{total}",
            )
    return buf.getvalue()


def _resolve_episode_id(ctx: TaskContext) -> str | None:
    ep_id = ctx.payload.get("episode_id")
    if ep_id:
        return ep_id
    if ctx.task.episode_id:
        return ctx.task.episode_id
    if ctx.task.target_type == "np_episode":
        return ctx.task.target_id
    return None


def _collect_image_medias(ctx: TaskContext, episode_id: str | None) -> list[tuple[str, MediaObject]]:
    items: list[tuple[str, MediaObject]] = []

    # panels (per storyboard per episode)
    panel_q = ctx.db.query(NovelPromotionPanel, NovelPromotionStoryboard).join(
        NovelPromotionStoryboard,
        NovelPromotionPanel.storyboard_id == NovelPromotionStoryboard.id,
    ).filter(NovelPromotionPanel.image_media_id.isnot(None))
    if episode_id:
        panel_q = panel_q.filter(NovelPromotionStoryboard.episode_id == episode_id)
    for panel, sb in panel_q.all():
        media = ctx.db.query(MediaObject).filter(MediaObject.id == panel.image_media_id).first()
        if media:
            items.append((f"panels/{sb.id}/panel-{panel.panel_index:03d}", media))

    # character appearances (project-wide — not tied to episode)
    for appearance in (
        ctx.db.query(CharacterAppearance)
        .filter(CharacterAppearance.image_media_id.isnot(None))
        .all()
    ):
        media = (
            ctx.db.query(MediaObject)
            .filter(MediaObject.id == appearance.image_media_id)
            .first()
        )
        if media:
            items.append(
                (
                    f"characters/{appearance.character_id}/appearance-{appearance.appearance_index}",
                    media,
                )
            )
    return items


def _collect_voice_medias(
    ctx: TaskContext, episode_id: str | None
) -> list[tuple[str, MediaObject]]:
    q = ctx.db.query(NovelPromotionVoiceLine).filter(
        NovelPromotionVoiceLine.audio_media_id.isnot(None)
    )
    if episode_id:
        q = q.filter(NovelPromotionVoiceLine.episode_id == episode_id)
    items: list[tuple[str, MediaObject]] = []
    for line in q.order_by(NovelPromotionVoiceLine.line_index.asc()).all():
        media = ctx.db.query(MediaObject).filter(MediaObject.id == line.audio_media_id).first()
        if media:
            items.append(
                (
                    f"voices/{line.episode_id}/line-{line.line_index:04d}-{(line.speaker or 'narrator')[:20]}",
                    media,
                )
            )
    return items


def _collect_video_medias(
    ctx: TaskContext, episode_id: str | None
) -> list[tuple[str, MediaObject]]:
    q = ctx.db.query(NovelPromotionPanel, NovelPromotionStoryboard).join(
        NovelPromotionStoryboard,
        NovelPromotionPanel.storyboard_id == NovelPromotionStoryboard.id,
    ).filter(NovelPromotionPanel.video_media_id.isnot(None))
    if episode_id:
        q = q.filter(NovelPromotionStoryboard.episode_id == episode_id)
    items: list[tuple[str, MediaObject]] = []
    for panel, sb in q.all():
        media = (
            ctx.db.query(MediaObject).filter(MediaObject.id == panel.video_media_id).first()
        )
        if media:
            items.append((f"videos/{sb.id}/panel-{panel.panel_index:03d}", media))
    return items


async def _package_and_return(
    ctx: TaskContext,
    *,
    items: list[tuple[str, MediaObject]],
    archive_name: str,
) -> dict:
    if not items:
        return {"note": "no media to download", "count": 0}
    progress(ctx, "packaging", 10, f"{len(items)} files")
    data = _zip_medias(items, task_label=archive_name, ctx=ctx)
    progress(ctx, "upload-zip", 92, "pushing archive to storage")
    ingested = media_service.ingest_bytes(
        ctx.db,
        user_id=ctx.user_id,
        data=data,
        content_type="application/zip",
        kind="archive",
    )
    download_url = media_service.presigned_url_for(ingested.media, ttl_seconds=3600)
    return {
        "count": len(items),
        "archive_media_id": ingested.media.id,
        "download_url": download_url,
        "size_bytes": ingested.media.size_bytes,
    }


@handler("np_download_images")
async def download_images(ctx: TaskContext) -> dict:
    ep_id = _resolve_episode_id(ctx)
    items = _collect_image_medias(ctx, ep_id)
    return await _package_and_return(
        ctx, items=items, archive_name=f"images-{ep_id or 'all'}"
    )


@handler("np_download_voices")
async def download_voices(ctx: TaskContext) -> dict:
    ep_id = _resolve_episode_id(ctx)
    items = _collect_voice_medias(ctx, ep_id)
    return await _package_and_return(
        ctx, items=items, archive_name=f"voices-{ep_id or 'all'}"
    )


@handler("np_download_videos")
async def download_videos(ctx: TaskContext) -> dict:
    ep_id = _resolve_episode_id(ctx)
    items = _collect_video_medias(ctx, ep_id)
    return await _package_and_return(
        ctx, items=items, archive_name=f"videos-{ep_id or 'all'}"
    )


@handler("np_cleanup_unselected_images")
async def cleanup_unselected_images(ctx: TaskContext) -> dict:
    """Delete CharacterAppearance rows that are not selected and their MinIO objects.

    Intentionally conservative: we only clean unselected appearances, not panels
    or locations (those have explicit user intent on every image)."""
    np_project_id = ctx.target_id
    from app.db.models.novel_promotion import NovelPromotionCharacter

    chars = (
        ctx.db.query(NovelPromotionCharacter)
        .filter(NovelPromotionCharacter.np_project_id == np_project_id)
        .all()
    )
    deleted = 0
    for char in chars:
        for appearance in (
            ctx.db.query(CharacterAppearance)
            .filter(
                CharacterAppearance.character_id == char.id,
                CharacterAppearance.selected.is_(False),
            )
            .all()
        ):
            if appearance.image_media_id:
                media = (
                    ctx.db.query(MediaObject)
                    .filter(MediaObject.id == appearance.image_media_id)
                    .first()
                )
                if media:
                    storage.delete_object(media.storage_key)
                    ctx.db.delete(media)
            ctx.db.delete(appearance)
            deleted += 1
    ctx.db.commit()
    return {"deleted_appearances": deleted}
