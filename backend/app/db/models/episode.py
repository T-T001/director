from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.db.models.media import MediaObject
    from app.db.models.project import Project
    from app.db.models.run import WorkflowRun
    from app.db.models.storyboard import Storyboard
    from app.db.models.task import Task


class Episode(Base):
    __tablename__ = "episodes"
    __table_args__ = (
        UniqueConstraint("project_id", "episode_number", name="uq_project_episode_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    episode_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    novel_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    srt_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_objects.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    project: Mapped["Project"] = relationship(back_populates="episodes")
    audio_media: Mapped["MediaObject | None"] = relationship()
    tasks: Mapped[list["Task"]] = relationship(back_populates="episode")
    runs: Mapped[list["WorkflowRun"]] = relationship(back_populates="episode")
    storyboards: Mapped[list["Storyboard"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan"
    )
