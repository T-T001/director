from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.novel_promotion import NovelPromotionProject
from app.db.models.project import Project
from app.schemas.novel_promotion import NovelPromotionProjectUpdate


class NovelPromotionProjectService:
    def __init__(self, db: Session):
        self.db = db

    def _ensure_project(self, user_id: str, project_id: str) -> Project:
        project = (
            self.db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Project not found"}
            )
        return project

    def get_or_create(self, user_id: str, project_id: str) -> NovelPromotionProject:
        self._ensure_project(user_id, project_id)
        np = (
            self.db.query(NovelPromotionProject)
            .filter(NovelPromotionProject.project_id == project_id)
            .first()
        )
        if np is None:
            np = NovelPromotionProject(project_id=project_id)
            self.db.add(np)
            self.db.commit()
            self.db.refresh(np)
        return np

    def update(
        self, user_id: str, project_id: str, payload: NovelPromotionProjectUpdate
    ) -> NovelPromotionProject:
        np = self.get_or_create(user_id, project_id)
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(np, field_name, value)
        self.db.commit()
        self.db.refresh(np)
        return np
