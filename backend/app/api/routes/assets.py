from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.storage import get_s3_client
from app.db.models.asset import ProjectAsset
from app.db.models.media import MediaObject
from app.db.models.project import Project
from app.db.models.storyboard import StoryboardPanel
from app.db.models.user import User
from app.schemas.asset import AssetCreate, AssetModifyRequest, AssetRead
from app.services.asset_service import AssetService
from app.services.task_service import (
    SUPPORTED_TASK_TYPE_ASSET_GENERATE,
    SUPPORTED_TASK_TYPE_ASSET_MODIFY,
    TARGET_TYPE_ASSET,
    TaskService,
)

router = APIRouter(tags=["assets"])


settings = get_settings()


def _serialize_asset(asset, service: AssetService) -> dict:
    return AssetRead(
        id=asset.id,
        name=asset.name,
        kind=asset.kind,
        description=asset.description,
        preview_media_id=asset.preview_media_id,
        image_url=service.build_media_url(asset.preview_media),
        updated_at=asset.updated_at,
    ).model_dump()


@router.get("/projects/{project_id}/assets")
def list_project_assets(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    service = AssetService(db)
    assets = [
        _serialize_asset(item, service)
        for item in service.list_project_assets(current_user.id, project_id)
    ]
    return {"success": True, "data": {"assets": assets}}


@router.get("/global-assets")
def list_global_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = AssetService(db)
    assets = [
        _serialize_asset(item, service)
        for item in service.list_global_assets(current_user.id)
    ]
    return {"success": True, "data": {"assets": assets}}


@router.post("/projects/{project_id}/characters")
def create_project_character(
    project_id: str,
    payload: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    service = AssetService(db)
    asset = service.create_project_asset(
        current_user.id,
        project_id,
        kind="character",
        name=payload.name,
        description=payload.description,
    )
    return {
        "success": True,
        "data": {"asset": _serialize_asset(asset, service)},
    }


@router.post("/projects/{project_id}/locations")
def create_project_location(
    project_id: str,
    payload: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    service = AssetService(db)
    asset = service.create_project_asset(
        current_user.id,
        project_id,
        kind="location",
        name=payload.name,
        description=payload.description,
    )
    return {
        "success": True,
        "data": {"asset": _serialize_asset(asset, service)},
    }


def _ensure_media_access(db: Session, current_user: User, media_id: str) -> MediaObject:
    media = db.query(MediaObject).filter(MediaObject.id == media_id).first()
    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Media not found"},
        )

    if media.user_id == current_user.id:
        return media

    project_asset = db.query(Project).join(Project.assets).filter(
        Project.user_id == current_user.id,
        ProjectAsset.preview_media_id == media.id,
    ).first()
    if project_asset is not None:
        return media

    panel = db.query(StoryboardPanel).join(StoryboardPanel.storyboard).join(Project).filter(
        Project.user_id == current_user.id,
        (StoryboardPanel.image_media_id == media.id) | (StoryboardPanel.video_media_id == media.id),
    ).first()
    if panel is not None:
        return media

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Media not found"},
    )


@router.post("/files")
def upload_file(
    file: UploadFile = File(...),
    purpose: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    contents = file.file.read()
    media = MediaObject(
        user_id=current_user.id,
        storage_key=f"uploads/{current_user.id}/{uuid4()}-{file.filename or 'file'}",
        bucket=settings.minio_bucket,
        mime_type=file.content_type,
        size_bytes=len(contents),
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    client = get_s3_client()
    extra_args = {"ContentType": file.content_type} if file.content_type else None
    if extra_args is None:
        client.upload_fileobj(BytesIO(contents), settings.minio_bucket, media.storage_key)
    else:
        client.upload_fileobj(
            BytesIO(contents),
            settings.minio_bucket,
            media.storage_key,
            ExtraArgs=extra_args,
        )

    return {
        "success": True,
        "data": {
            "id": media.id,
            "media_id": media.id,
            "purpose": purpose,
            "url": f"/api/media/{media.id}",
        },
    }


def _submit_asset_workflow(
    asset_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User,
    db: Session,
    *,
    workflow: str,
) -> dict:
    asset_service = AssetService(db)
    asset = asset_service.get_project_asset(current_user.id, asset_id)

    task_service = TaskService(db)
    task_type = (
        SUPPORTED_TASK_TYPE_ASSET_MODIFY if workflow == "modify" else SUPPORTED_TASK_TYPE_ASSET_GENERATE
    )
    task, run, deduped = task_service.submit_task(
        user_id=current_user.id,
        project_id=asset.project_id,
        task_type=task_type,
        target_type=TARGET_TYPE_ASSET,
        target_id=asset.id,
        episode_id=None,
        payload_json=payload,
        background_tasks=background_tasks,
    )

    return {
        "success": True,
        "data": {
            "task_id": task.id,
            "run_id": run.id,
            "status": task.status,
            "deduped": deduped,
        },
    }


@router.post("/assets/{asset_id}/generate")
def generate_asset(
    asset_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_asset_workflow(
        asset_id,
        payload,
        background_tasks,
        current_user,
        db,
        workflow="generate",
    )


@router.post("/assets/{asset_id}/modify")
def modify_asset(
    asset_id: str,
    payload: AssetModifyRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _submit_asset_workflow(
        asset_id,
        payload.model_dump(exclude_none=False),
        background_tasks,
        current_user,
        db,
        workflow="modify",
    )


@router.get("/media/{media_id}")
def get_media(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    media = _ensure_media_access(db, current_user, media_id)
    client = get_s3_client()
    response = client.get_object(Bucket=media.bucket, Key=media.storage_key)
    body = response["Body"].read()
    return StreamingResponse(
        BytesIO(body),
        media_type=media.mime_type or "application/octet-stream",
        headers={"Content-Length": str(len(body))},
    )
