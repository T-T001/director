"""Redis pub/sub-backed event bus for task progress.

Channel naming: `np:task:{task_id}`. Events are JSON dicts with keys
`task_id`, `stage`, `progress`, `message`, `timestamp`.

We also persist every event to `task_events` so late subscribers can replay.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.redis import get_redis
from app.db.models.task import TaskEvent


def _channel(task_id: str) -> str:
    return f"np:task:{task_id}"


def emit(
    db: Session,
    *,
    task_id: str,
    project_id: str,
    user_id: str,
    stage: str,
    progress: int | None = None,
    message: str | None = None,
    payload: dict[str, Any] | None = None,
    event_type: str = "task.progress",
) -> None:
    body = {
        "task_id": task_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "timestamp": datetime.now(UTC).isoformat(),
        "payload": payload or {},
    }
    db.add(
        TaskEvent(
            task_id=task_id,
            project_id=project_id,
            user_id=user_id,
            event_type=event_type,
            payload_json=body,
        )
    )
    db.commit()
    try:
        get_redis().publish(_channel(task_id), json.dumps(body, ensure_ascii=False))
    except Exception:
        # Redis unavailable — events still land in DB for replay.
        pass
