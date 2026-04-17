from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.storage import get_s3_client
from app.db.models.asset import ProjectAsset
from app.db.models.media import MediaObject
from app.db.models.project import Project
from app.db.models.task import Task


class AssetService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def build_media_url(media: MediaObject | None) -> str | None:
        if media is None:
            return None
        return f"/api/media/{media.id}"

    @staticmethod
    def upload_media(*, user_id: str, filename: str | None, content_type: str | None, contents: bytes) -> MediaObject:
        from io import BytesIO
        from uuid import uuid4

        from app.core.config import get_settings
        from app.core.db import SessionLocal

        db = SessionLocal()
        settings = get_settings()
        safe_name = (filename or "file").replace("\\", "_").replace("/", "_")
        try:
            media = MediaObject(
                user_id=user_id,
                storage_key=f"uploads/{user_id}/{uuid4()}-{safe_name}",
                bucket=settings.minio_bucket,
                mime_type=content_type,
                size_bytes=len(contents),
            )
            db.add(media)
            db.flush()

            client = get_s3_client()
            extra_args = {"ContentType": content_type} if content_type else None
            if extra_args is None:
                client.upload_fileobj(BytesIO(contents), settings.minio_bucket, media.storage_key)
            else:
                client.upload_fileobj(
                    BytesIO(contents),
                    settings.minio_bucket,
                    media.storage_key,
                    ExtraArgs=extra_args,
                )

            db.commit()
            db.refresh(media)
            return media
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def list_project_assets(self, user_id: str, project_id: str) -> list[ProjectAsset]:
        self._get_project(user_id, project_id)
        return (
            self.db.query(ProjectAsset)
            .filter(ProjectAsset.project_id == project_id)
            .order_by(ProjectAsset.updated_at.desc(), ProjectAsset.created_at.desc())
            .all()
        )

    def list_global_assets(self, user_id: str) -> list[ProjectAsset]:
        return (
            self.db.query(ProjectAsset)
            .join(Project, Project.id == ProjectAsset.project_id)
            .filter(Project.user_id == user_id)
            .order_by(ProjectAsset.updated_at.desc(), ProjectAsset.created_at.desc())
            .all()
        )

    def create_project_asset(
        self,
        user_id: str,
        project_id: str,
        *,
        kind: str,
        name: str,
        description: str | None = None,
        preview_media_id: str | None = None,
    ) -> ProjectAsset:
        project = self._get_project(user_id, project_id)
        normalized_name = name.strip()
        if not normalized_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Asset name cannot be empty"},
            )

        preview_media = self._get_media(preview_media_id) if preview_media_id else None
        asset = ProjectAsset(
            project_id=project.id,
            kind=kind,
            name=normalized_name,
            description=description,
            preview_media_id=preview_media.id if preview_media else None,
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def get_project_asset(self, user_id: str, asset_id: str) -> ProjectAsset:
        asset = (
            self.db.query(ProjectAsset)
            .join(Project, Project.id == ProjectAsset.project_id)
            .filter(ProjectAsset.id == asset_id, Project.user_id == user_id)
            .first()
        )
        if asset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Asset not found"},
            )
        return asset

    def update_project_asset(
        self,
        user_id: str,
        asset_id: str,
        *,
        description: str | None = None,
        preview_media_id: str | None = None,
        set_description: bool = False,
        set_preview_media: bool = False,
    ) -> ProjectAsset:
        asset = self.get_project_asset(user_id, asset_id)
        if set_description:
            asset.description = description
        if set_preview_media:
            preview_media = self._get_media(preview_media_id) if preview_media_id else None
            asset.preview_media_id = preview_media.id if preview_media else None
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def get_task_asset(self, user_id: str, task_id: str) -> ProjectAsset:
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if task is None or task.target_type != "asset":
            raise ValueError("Asset task not found")
        return self.get_project_asset(user_id, task.target_id)

    def _get_project(self, user_id: str, project_id: str) -> Project:
        project = (
            self.db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Project not found"},
            )
        return project

    def _get_media(self, media_id: str) -> MediaObject:
        media = self.db.query(MediaObject).filter(MediaObject.id == media_id).first()
        if media is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Media not found"},
            )
        return media
