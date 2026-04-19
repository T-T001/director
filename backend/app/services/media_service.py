"""MediaObject ingestion: fetch external URL, push to MinIO, record DB row."""

from __future__ import annotations

import base64
import hashlib
import mimetypes
import uuid
from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from app.core import storage
from app.core.config import get_settings
from app.db.models.media import MediaObject


@dataclass
class IngestResult:
    media: MediaObject
    internal_url: str


_EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/zip": ".zip",
}


def _guess_ext(content_type: str | None, fallback_url: str | None) -> str:
    if content_type:
        ext = _EXT_BY_MIME.get(content_type.split(";")[0].strip())
        if ext:
            return ext
    if fallback_url:
        guess = mimetypes.guess_extension(mimetypes.guess_type(fallback_url)[0] or "") or ""
        if guess:
            return guess
    return ".bin"


def _build_key(user_id: str | None, kind: str, ext: str) -> str:
    scope = user_id or "shared"
    return f"{scope}/{kind}/{uuid.uuid4().hex}{ext}"


def _presigned(key: str) -> str:
    return storage.presign_get(key, ttl_seconds=3600)


def ingest_bytes(
    db: Session,
    *,
    user_id: str | None,
    data: bytes,
    content_type: str,
    kind: str = "generated",
) -> IngestResult:
    ext = _guess_ext(content_type, None)
    key = _build_key(user_id, kind, ext)
    storage.upload_bytes(key, data, content_type=content_type)

    media = MediaObject(
        user_id=user_id,
        storage_key=key,
        bucket=get_settings().minio_bucket,
        mime_type=content_type,
        size_bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return IngestResult(media=media, internal_url=_presigned(key))


def ingest_external_url(
    db: Session,
    *,
    user_id: str | None,
    url: str,
    kind: str = "generated",
    timeout: float = 60.0,
) -> IngestResult:
    """Download the given external URL (or decode a data: URL) and persist to MinIO."""
    if url.startswith("data:"):
        header, _, payload = url.partition(",")
        content_type = header.removeprefix("data:").split(";")[0] or "application/octet-stream"
        if ";base64" in header:
            data = base64.b64decode(payload)
        else:
            data = payload.encode("utf-8")
        return ingest_bytes(db, user_id=user_id, data=data, content_type=content_type, kind=kind)

    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        data = resp.content
    return ingest_bytes(db, user_id=user_id, data=data, content_type=content_type, kind=kind)


def ingest_b64(
    db: Session, *, user_id: str | None, b64: str, mime_type: str = "image/png", kind: str = "generated"
) -> IngestResult:
    data = base64.b64decode(b64)
    return ingest_bytes(db, user_id=user_id, data=data, content_type=mime_type, kind=kind)


def presigned_url_for(media: MediaObject, *, ttl_seconds: int = 900) -> str:
    return storage.presign_get(media.storage_key, ttl_seconds=ttl_seconds)
