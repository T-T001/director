from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.novel_promotion import NovelPromotionClip, NovelPromotionEpisode
from app.schemas.novel_promotion.entities import (
    ClipCreate,
    ClipUpdate,
    NPEpisodeBatchCreate,
    NPEpisodeCreate,
    NPEpisodeUpdate,
)
from app.services.novel_promotion.common import (
    apply_updates,
    ensure_clip,
    ensure_episode,
    ensure_np_project,
)


class NPEpisodeService:
    def __init__(self, db: Session):
        self.db = db

    def list_(self, user_id: str, project_id: str) -> list[NovelPromotionEpisode]:
        np = ensure_np_project(self.db, user_id, project_id)
        return (
            self.db.query(NovelPromotionEpisode)
            .filter(NovelPromotionEpisode.np_project_id == np.id)
            .order_by(NovelPromotionEpisode.episode_number.asc())
            .all()
        )

    def create(
        self, user_id: str, project_id: str, payload: NPEpisodeCreate
    ) -> NovelPromotionEpisode:
        np = ensure_np_project(self.db, user_id, project_id)
        ep = NovelPromotionEpisode(
            np_project_id=np.id,
            episode_number=payload.episode_number,
            name=payload.name.strip(),
            description=payload.description,
            novel_text=payload.novel_text,
        )
        self.db.add(ep)
        self.db.commit()
        self.db.refresh(ep)
        return ep

    def create_batch(
        self, user_id: str, project_id: str, payload: NPEpisodeBatchCreate
    ) -> list[NovelPromotionEpisode]:
        np = ensure_np_project(self.db, user_id, project_id)
        rows = [
            NovelPromotionEpisode(
                np_project_id=np.id,
                episode_number=item.episode_number,
                name=item.name.strip(),
                description=item.description,
                novel_text=item.novel_text,
            )
            for item in payload.episodes
        ]
        self.db.add_all(rows)
        self.db.commit()
        for r in rows:
            self.db.refresh(r)
        return rows

    def get(self, user_id: str, project_id: str, episode_id: str) -> NovelPromotionEpisode:
        return ensure_episode(self.db, user_id, project_id, episode_id)

    def update(
        self, user_id: str, project_id: str, episode_id: str, payload: NPEpisodeUpdate
    ) -> NovelPromotionEpisode:
        ep = ensure_episode(self.db, user_id, project_id, episode_id)
        apply_updates(ep, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(ep)
        return ep

    def delete(self, user_id: str, project_id: str, episode_id: str) -> None:
        ep = ensure_episode(self.db, user_id, project_id, episode_id)
        self.db.delete(ep)
        self.db.commit()


class ClipService:
    def __init__(self, db: Session):
        self.db = db

    def list_(
        self, user_id: str, project_id: str, episode_id: str
    ) -> list[NovelPromotionClip]:
        ensure_episode(self.db, user_id, project_id, episode_id)
        return (
            self.db.query(NovelPromotionClip)
            .filter(NovelPromotionClip.episode_id == episode_id)
            .order_by(NovelPromotionClip.start.asc().nulls_last())
            .all()
        )

    def create(
        self, user_id: str, project_id: str, episode_id: str, payload: ClipCreate
    ) -> NovelPromotionClip:
        ensure_episode(self.db, user_id, project_id, episode_id)
        clip = NovelPromotionClip(episode_id=episode_id, **payload.model_dump(exclude_unset=True))
        self.db.add(clip)
        self.db.commit()
        self.db.refresh(clip)
        return clip

    def get(self, user_id: str, project_id: str, clip_id: str) -> NovelPromotionClip:
        return ensure_clip(self.db, user_id, project_id, clip_id)

    def update(
        self, user_id: str, project_id: str, clip_id: str, payload: ClipUpdate
    ) -> NovelPromotionClip:
        clip = ensure_clip(self.db, user_id, project_id, clip_id)
        apply_updates(clip, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(clip)
        return clip

    def delete(self, user_id: str, project_id: str, clip_id: str) -> None:
        clip = ensure_clip(self.db, user_id, project_id, clip_id)
        self.db.delete(clip)
        self.db.commit()
