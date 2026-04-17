from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.models.storyboard import Storyboard, StoryboardPanel


class StoryboardService:
    def __init__(self, db: Session):
        self.db = db

    def list_storyboards(self, user_id: str, episode_id: str) -> list[Storyboard]:
        return (
            self.db.query(Storyboard)
            .options(joinedload(Storyboard.panels))
            .filter(Storyboard.user_id == user_id, Storyboard.episode_id == episode_id)
            .order_by(Storyboard.created_at.asc())
            .all()
        )

    def get_storyboard(self, user_id: str, storyboard_id: str) -> Storyboard:
        storyboard = (
            self.db.query(Storyboard)
            .options(joinedload(Storyboard.panels))
            .filter(Storyboard.id == storyboard_id, Storyboard.user_id == user_id)
            .first()
        )
        if storyboard is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Storyboard not found"},
            )
        return storyboard

    def get_panel(self, user_id: str, panel_id: str) -> StoryboardPanel:
        panel = (
            self.db.query(StoryboardPanel)
            .join(Storyboard, Storyboard.id == StoryboardPanel.storyboard_id)
            .filter(StoryboardPanel.id == panel_id, Storyboard.user_id == user_id)
            .first()
        )
        if panel is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Panel not found"},
            )
        return panel

    def update_panel(
        self,
        user_id: str,
        panel_id: str,
        *,
        description: str | None = None,
        image_prompt: str | None = None,
        video_prompt: str | None = None,
        set_description: bool = False,
        set_image_prompt: bool = False,
        set_video_prompt: bool = False,
    ) -> StoryboardPanel:
        panel = self.get_panel(user_id, panel_id)
        if set_description:
            panel.description = description or ""
        if set_image_prompt:
            panel.image_prompt = image_prompt
        if set_video_prompt:
            panel.video_prompt = video_prompt
        self.db.add(panel)
        self.db.commit()
        self.db.refresh(panel)
        return panel
