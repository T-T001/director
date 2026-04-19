from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.novel_promotion import NovelPromotionVoiceLine
from app.schemas.novel_promotion.entities import (
    VoiceLineCreate,
    VoiceLineUpdate,
)
from app.services.novel_promotion.common import (
    apply_updates,
    ensure_episode,
    ensure_voice_line,
)


class VoiceLineService:
    def __init__(self, db: Session):
        self.db = db

    def list_(
        self, user_id: str, project_id: str, episode_id: str
    ) -> list[NovelPromotionVoiceLine]:
        ensure_episode(self.db, user_id, project_id, episode_id)
        return (
            self.db.query(NovelPromotionVoiceLine)
            .filter(NovelPromotionVoiceLine.episode_id == episode_id)
            .order_by(NovelPromotionVoiceLine.line_index.asc())
            .all()
        )

    def create(
        self, user_id: str, project_id: str, episode_id: str, payload: VoiceLineCreate
    ) -> NovelPromotionVoiceLine:
        ensure_episode(self.db, user_id, project_id, episode_id)
        line = NovelPromotionVoiceLine(
            episode_id=episode_id, **payload.model_dump(exclude_unset=True)
        )
        self.db.add(line)
        self.db.commit()
        self.db.refresh(line)
        return line

    def update(
        self,
        user_id: str,
        project_id: str,
        voice_line_id: str,
        payload: VoiceLineUpdate,
    ) -> NovelPromotionVoiceLine:
        line = ensure_voice_line(self.db, user_id, project_id, voice_line_id)
        apply_updates(line, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(line)
        return line

    def delete(self, user_id: str, project_id: str, voice_line_id: str) -> None:
        line = ensure_voice_line(self.db, user_id, project_id, voice_line_id)
        self.db.delete(line)
        self.db.commit()
