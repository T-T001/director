"""Lightweight NP async task queue.

We reuse the `tasks` table (which already exists in Phase 0 schema) but bypass
`TaskService.submit_task`'s strict target_type validator — NP has many more
target types than episode/asset/panel. Workers (Phase 4) will consume these.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models.task import Task, TaskEvent


def queue_np_task(
    db: Session,
    *,
    user_id: str,
    project_id: str,
    task_type: str,
    target_type: str,
    target_id: str,
    episode_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> Task:
    task = Task(
        user_id=user_id,
        project_id=project_id,
        episode_id=episode_id,
        task_type=task_type,
        target_type=target_type,
        target_id=target_id,
        status="queued",
        progress=0,
        payload_json=payload or {},
    )
    db.add(task)
    db.flush()
    db.add(
        TaskEvent(
            task_id=task.id,
            project_id=project_id,
            user_id=user_id,
            event_type="task.created",
            payload_json={"stage": "queued", "task_type": task_type},
        )
    )
    db.commit()
    db.refresh(task)
    return task
