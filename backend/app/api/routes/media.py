"""Presigned URL endpoint for MediaObject. Raw bytes proxy already lives at
`/api/media/{media_id}` (see app/api/routes/assets.py)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.media import MediaObject
from app.db.models.user import User
from app.services.media_service import presigned_url_for

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/{media_id}/url")
def get_media_url(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    media = db.query(MediaObject).filter(MediaObject.id == media_id).first()
    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Media not found"}
        )
    if media.user_id is not None and media.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail={"message": "Forbidden"}
        )
    return {
        "success": True,
        "data": {
            "url": presigned_url_for(media, ttl_seconds=900),
            "expires_in": 900,
            "mime_type": media.mime_type,
            "size_bytes": media.size_bytes,
        },
    }
