from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.db.models.asset import ProjectAsset
    from app.db.models.episode import Episode
    from app.db.models.run import WorkflowRun
    from app.db.models.task import Task
    from app.db.models.user import User


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user: Mapped["User"] = relationship(back_populates="projects")
    settings: Mapped["ProjectSettings | None"] = relationship(
        back_populates="project", uselist=False, cascade="all, delete-orphan"
    )
    episodes: Mapped[list["Episode"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    assets: Mapped[list["ProjectAsset"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    runs: Mapped[list["WorkflowRun"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectSettings(Base):
    __tablename__ = "project_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), unique=True
    )
    analysis_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    character_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    location_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    storyboard_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    video_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audio_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    art_style: Mapped[str] = mapped_column(String(64), default="american-comic")
    video_ratio: Mapped[str] = mapped_column(String(16), default="9:16")
    video_resolution: Mapped[str] = mapped_column(String(32), default="720p")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    project: Mapped[Project] = relationship(back_populates="settings")
