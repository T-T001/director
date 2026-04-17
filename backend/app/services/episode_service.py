from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models.episode import Episode
from app.schemas.episode import EpisodeCreate, EpisodeUpdate


class EpisodeService:
    def __init__(self, db: Session):
        self.db = db

    def list_episodes(self, project_id: str) -> list[Episode]:
        return (
            self.db.query(Episode)
            .filter(Episode.project_id == project_id)
            .order_by(Episode.episode_number.asc())
            .all()
        )

    def create_episode(self, project_id: str, payload: EpisodeCreate) -> Episode:
        next_number = (
            self.db.query(func.max(Episode.episode_number))
            .filter(Episode.project_id == project_id)
            .scalar()
            or 0
        ) + 1
        episode = Episode(
            project_id=project_id,
            episode_number=next_number,
            name=payload.name.strip(),
            description=payload.description,
            novel_text=payload.novel_text,
        )
        self.db.add(episode)
        self.db.commit()
        self.db.refresh(episode)
        return episode

    def get_episode(self, episode_id: str) -> Episode:
        episode = (
            self.db.query(Episode)
            .options(joinedload(Episode.project))
            .filter(Episode.id == episode_id)
            .first()
        )
        if not episode:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Episode not found"}
            )
        return episode

    def update_episode(self, episode_id: str, payload: EpisodeUpdate) -> Episode:
        episode = self.get_episode(episode_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(episode, field_name, value)
        self.db.add(episode)
        self.db.commit()
        self.db.refresh(episode)
        return episode

    def delete_episode(self, episode_id: str) -> None:
        episode = self.get_episode(episode_id)
        self.db.delete(episode)
        self.db.commit()
