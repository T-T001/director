from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.novel_promotion import (
    NovelPromotionPanel,
    NovelPromotionShot,
    NovelPromotionStoryboard,
    SupplementaryPanel,
)
from app.schemas.novel_promotion.entities import (
    PanelCreate,
    PanelLinkPayload,
    PanelSelectCandidatePayload,
    PanelUpdate,
    ShotUpdate,
    StoryboardCreate,
    StoryboardUpdate,
    SupplementaryPanelCreate,
)
from app.services.novel_promotion.common import (
    apply_updates,
    ensure_clip,
    ensure_episode,
    ensure_panel,
    ensure_shot,
    ensure_storyboard,
)


class ShotService:
    def __init__(self, db: Session):
        self.db = db

    def list_(
        self, user_id: str, project_id: str, episode_id: str
    ) -> list[NovelPromotionShot]:
        ensure_episode(self.db, user_id, project_id, episode_id)
        return (
            self.db.query(NovelPromotionShot)
            .filter(NovelPromotionShot.episode_id == episode_id)
            .order_by(NovelPromotionShot.srt_start.asc())
            .all()
        )

    def update(
        self, user_id: str, project_id: str, shot_id: str, payload: ShotUpdate
    ) -> NovelPromotionShot:
        shot = ensure_shot(self.db, user_id, project_id, shot_id)
        apply_updates(shot, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(shot)
        return shot


class StoryboardService:
    def __init__(self, db: Session):
        self.db = db

    def list_for_clip(
        self, user_id: str, project_id: str, clip_id: str
    ) -> NovelPromotionStoryboard | None:
        ensure_clip(self.db, user_id, project_id, clip_id)
        return (
            self.db.query(NovelPromotionStoryboard)
            .filter(NovelPromotionStoryboard.clip_id == clip_id)
            .first()
        )

    def create_for_clip(
        self,
        user_id: str,
        project_id: str,
        clip_id: str,
        payload: StoryboardCreate,
    ) -> NovelPromotionStoryboard:
        clip = ensure_clip(self.db, user_id, project_id, clip_id)
        existing = (
            self.db.query(NovelPromotionStoryboard)
            .filter(NovelPromotionStoryboard.clip_id == clip_id)
            .first()
        )
        if existing is not None:
            return existing
        sb = NovelPromotionStoryboard(
            episode_id=clip.episode_id, clip_id=clip.id, panel_count=payload.panel_count
        )
        self.db.add(sb)
        self.db.commit()
        self.db.refresh(sb)
        return sb

    def get(self, user_id: str, project_id: str, storyboard_id: str) -> NovelPromotionStoryboard:
        return ensure_storyboard(self.db, user_id, project_id, storyboard_id)

    def update(
        self,
        user_id: str,
        project_id: str,
        storyboard_id: str,
        payload: StoryboardUpdate,
    ) -> NovelPromotionStoryboard:
        sb = ensure_storyboard(self.db, user_id, project_id, storyboard_id)
        apply_updates(sb, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(sb)
        return sb

    def add_supplementary_panel(
        self,
        user_id: str,
        project_id: str,
        storyboard_id: str,
        payload: SupplementaryPanelCreate,
    ) -> SupplementaryPanel:
        ensure_storyboard(self.db, user_id, project_id, storyboard_id)
        sp = SupplementaryPanel(
            storyboard_id=storyboard_id,
            source_type=payload.source_type,
            source_panel_id=payload.source_panel_id,
            description=payload.description,
            image_prompt=payload.image_prompt,
        )
        self.db.add(sp)
        self.db.commit()
        self.db.refresh(sp)
        return sp


class PanelService:
    def __init__(self, db: Session):
        self.db = db

    def list_for_storyboard(
        self, user_id: str, project_id: str, storyboard_id: str
    ) -> list[NovelPromotionPanel]:
        ensure_storyboard(self.db, user_id, project_id, storyboard_id)
        return (
            self.db.query(NovelPromotionPanel)
            .filter(NovelPromotionPanel.storyboard_id == storyboard_id)
            .order_by(NovelPromotionPanel.panel_index.asc())
            .all()
        )

    def create(
        self,
        user_id: str,
        project_id: str,
        storyboard_id: str,
        payload: PanelCreate,
    ) -> NovelPromotionPanel:
        ensure_storyboard(self.db, user_id, project_id, storyboard_id)
        panel = NovelPromotionPanel(
            storyboard_id=storyboard_id,
            panel_index=payload.panel_index,
            description=payload.description,
            image_prompt=payload.image_prompt,
        )
        self.db.add(panel)
        self.db.commit()
        self.db.refresh(panel)
        return panel

    def get(self, user_id: str, project_id: str, panel_id: str) -> NovelPromotionPanel:
        return ensure_panel(self.db, user_id, project_id, panel_id)

    def update(
        self, user_id: str, project_id: str, panel_id: str, payload: PanelUpdate
    ) -> NovelPromotionPanel:
        panel = ensure_panel(self.db, user_id, project_id, panel_id)
        apply_updates(panel, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(panel)
        return panel

    def delete(self, user_id: str, project_id: str, panel_id: str) -> None:
        panel = ensure_panel(self.db, user_id, project_id, panel_id)
        self.db.delete(panel)
        self.db.commit()

    def link(
        self, user_id: str, project_id: str, panel_id: str, payload: PanelLinkPayload
    ) -> NovelPromotionPanel:
        panel = ensure_panel(self.db, user_id, project_id, panel_id)
        panel.linked_to_next_panel = payload.linked_to_next_panel
        self.db.commit()
        self.db.refresh(panel)
        return panel

    def select_candidate(
        self,
        user_id: str,
        project_id: str,
        panel_id: str,
        payload: PanelSelectCandidatePayload,
    ) -> NovelPromotionPanel:
        panel = ensure_panel(self.db, user_id, project_id, panel_id)
        if payload.image_url is not None:
            panel.image_url = payload.image_url
        if payload.image_media_id is not None:
            panel.image_media_id = payload.image_media_id
        self.db.commit()
        self.db.refresh(panel)
        return panel

    def insert(
        self, user_id: str, project_id: str, storyboard_id: str, at_index: int
    ) -> NovelPromotionPanel:
        ensure_storyboard(self.db, user_id, project_id, storyboard_id)
        # bump existing panels at or after at_index
        self.db.query(NovelPromotionPanel).filter(
            NovelPromotionPanel.storyboard_id == storyboard_id,
            NovelPromotionPanel.panel_index >= at_index,
        ).update(
            {NovelPromotionPanel.panel_index: NovelPromotionPanel.panel_index + 1},
            synchronize_session=False,
        )
        panel = NovelPromotionPanel(storyboard_id=storyboard_id, panel_index=at_index)
        self.db.add(panel)
        self.db.commit()
        self.db.refresh(panel)
        return panel
