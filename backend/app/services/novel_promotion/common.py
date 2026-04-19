"""Shared helpers for NP services."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.novel_promotion import (
    NovelPromotionCharacter,
    NovelPromotionClip,
    NovelPromotionEpisode,
    NovelPromotionLocation,
    NovelPromotionPanel,
    NovelPromotionProject,
    NovelPromotionShot,
    NovelPromotionStoryboard,
    NovelPromotionVoiceLine,
)
from app.db.models.project import Project


def ensure_project(db: Session, user_id: str, project_id: str) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Project not found"}
        )
    return project


def ensure_np_project(db: Session, user_id: str, project_id: str) -> NovelPromotionProject:
    """Return the NP project row, creating it on demand."""
    ensure_project(db, user_id, project_id)
    np = (
        db.query(NovelPromotionProject)
        .filter(NovelPromotionProject.project_id == project_id)
        .first()
    )
    if np is None:
        np = NovelPromotionProject(project_id=project_id)
        db.add(np)
        db.commit()
        db.refresh(np)
    return np


def _fetch_or_404(db: Session, model, *, id_: str, np_project_id: str, attr: str = "np_project_id"):
    row = db.query(model).filter(getattr(model, "id") == id_).first()
    if row is None or getattr(row, attr) != np_project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": f"{model.__name__} not found"},
        )
    return row


def ensure_character(
    db: Session, user_id: str, project_id: str, character_id: str
) -> NovelPromotionCharacter:
    np = ensure_np_project(db, user_id, project_id)
    return _fetch_or_404(db, NovelPromotionCharacter, id_=character_id, np_project_id=np.id)


def ensure_location(
    db: Session, user_id: str, project_id: str, location_id: str
) -> NovelPromotionLocation:
    np = ensure_np_project(db, user_id, project_id)
    return _fetch_or_404(db, NovelPromotionLocation, id_=location_id, np_project_id=np.id)


def ensure_episode(
    db: Session, user_id: str, project_id: str, episode_id: str
) -> NovelPromotionEpisode:
    np = ensure_np_project(db, user_id, project_id)
    return _fetch_or_404(db, NovelPromotionEpisode, id_=episode_id, np_project_id=np.id)


def ensure_clip(
    db: Session, user_id: str, project_id: str, clip_id: str
) -> NovelPromotionClip:
    clip = db.query(NovelPromotionClip).filter(NovelPromotionClip.id == clip_id).first()
    if clip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Clip not found"}
        )
    ensure_episode(db, user_id, project_id, clip.episode_id)
    return clip


def ensure_shot(
    db: Session, user_id: str, project_id: str, shot_id: str
) -> NovelPromotionShot:
    shot = db.query(NovelPromotionShot).filter(NovelPromotionShot.id == shot_id).first()
    if shot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Shot not found"}
        )
    ensure_episode(db, user_id, project_id, shot.episode_id)
    return shot


def ensure_storyboard(
    db: Session, user_id: str, project_id: str, storyboard_id: str
) -> NovelPromotionStoryboard:
    sb = (
        db.query(NovelPromotionStoryboard)
        .filter(NovelPromotionStoryboard.id == storyboard_id)
        .first()
    )
    if sb is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Storyboard not found"}
        )
    ensure_episode(db, user_id, project_id, sb.episode_id)
    return sb


def ensure_panel(
    db: Session, user_id: str, project_id: str, panel_id: str
) -> NovelPromotionPanel:
    panel = (
        db.query(NovelPromotionPanel)
        .filter(NovelPromotionPanel.id == panel_id)
        .first()
    )
    if panel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Panel not found"}
        )
    ensure_storyboard(db, user_id, project_id, panel.storyboard_id)
    return panel


def ensure_voice_line(
    db: Session, user_id: str, project_id: str, voice_line_id: str
) -> NovelPromotionVoiceLine:
    line = (
        db.query(NovelPromotionVoiceLine)
        .filter(NovelPromotionVoiceLine.id == voice_line_id)
        .first()
    )
    if line is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "VoiceLine not found"}
        )
    ensure_episode(db, user_id, project_id, line.episode_id)
    return line


def apply_updates(model_instance, payload_dict: dict) -> None:
    """Set attributes on a model, skipping None values (for partial updates)."""
    for field_name, value in payload_dict.items():
        setattr(model_instance, field_name, value)
