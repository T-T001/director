from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.models.project import Project, ProjectSettings
from app.db.models.task import Task
from app.schemas.project import ProjectCreate, ProjectSettingsUpdate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    def list_projects(self, user_id: str) -> list[Project]:
        return (
            self.db.query(Project)
            .filter(Project.user_id == user_id)
            .order_by(Project.updated_at.desc())
            .all()
        )

    def create_project(self, user_id: str, payload: ProjectCreate) -> Project:
        project = Project(
            user_id=user_id, name=payload.name.strip(), description=payload.description
        )
        self.db.add(project)
        self.db.flush()
        settings = ProjectSettings(project_id=project.id)
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_project(self, user_id: str, project_id: str) -> Project:
        project = (
            self.db.query(Project)
            .options(joinedload(Project.settings), joinedload(Project.episodes))
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Project not found"}
            )
        return project

    def update_project(self, user_id: str, project_id: str, payload: ProjectUpdate) -> Project:
        project = self.get_project(user_id, project_id)
        if payload.name is not None:
            project.name = payload.name.strip()
        if payload.description is not None:
            project.description = payload.description
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update_project_settings(
        self, user_id: str, project_id: str, payload: ProjectSettingsUpdate
    ) -> ProjectSettings:
        project = self.get_project(user_id, project_id)
        settings = project.settings
        if settings is None:
            settings = ProjectSettings(project_id=project.id)

        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(settings, field_name, value)

        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def delete_project(self, user_id: str, project_id: str) -> None:
        project = self.get_project(user_id, project_id)
        self.db.delete(project)
        self.db.commit()

    def get_workspace(self, user_id: str, project_id: str) -> dict:
        project = self.get_project(user_id, project_id)
        latest_active_tasks = (
            self.db.query(Task)
            .filter(
                Task.user_id == user_id,
                Task.project_id == project_id,
                Task.status.in_(["queued", "running", "processing"]),
            )
            .order_by(Task.updated_at.desc())
            .limit(10)
            .all()
        )
        task_summaries = [
            {
                "id": task.id,
                "task_type": task.task_type,
                "status": task.status,
                "progress": task.progress,
                "updated_at": task.updated_at,
            }
            for task in latest_active_tasks
        ]
        ordered_episodes = sorted(
            project.episodes, key=lambda item: (item.episode_number, item.created_at)
        )
        return {
            "project": project,
            "settings": project.settings,
            "episodes": ordered_episodes,
            "latest_active_tasks": task_summaries,
        }
