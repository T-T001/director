"""Polling worker: claims queued `np_*` tasks and dispatches to registered handlers.

Design
------
- Runs as a single asyncio.Task launched from FastAPI lifespan.
- Polls every POLL_INTERVAL seconds for queued tasks with `task_type LIKE 'np_%'`.
- Claim is atomic at the SQL level: `UPDATE ... WHERE id=? AND status='queued'`
  followed by rowcount check, so two workers could coexist safely (future-proof).
- Each task runs inside its own DB session. Errors mark the task failed and
  include the exception message; they don't kill the worker.
- No-op when no handler is registered for a task_type (task is marked failed
  with a `UNREGISTERED_HANDLER` code so it doesn't loop forever).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session

# Ensure every handler module is imported so @handler decorators run.
import app.workers.handlers  # noqa: F401
from app.core.db import SessionLocal
from app.db.models.task import Task
from app.workers.events import emit
from app.workers.registry import TaskContext, registry

logger = logging.getLogger("np.worker")

POLL_INTERVAL_SECONDS = 2.0
MAX_CONCURRENT_TASKS = 4

_worker_task: asyncio.Task | None = None
_stop_event: asyncio.Event | None = None


def _claim_next_task(db: Session) -> Task | None:
    row = (
        db.query(Task)
        .filter(
            Task.status == "queued",
            or_(Task.task_type.like("np_%"), Task.task_type == "np_analyze"),
        )
        .order_by(Task.created_at.asc())
        .first()
    )
    if row is None:
        return None
    # Atomic claim: only succeed if still queued.
    now = datetime.now(UTC)
    result = db.execute(
        update(Task)
        .where(and_(Task.id == row.id, Task.status == "queued"))
        .values(status="running", started_at=now, updated_at=now)
    )
    db.commit()
    if result.rowcount != 1:
        return None
    db.refresh(row)
    return row


async def _run_task(task_id: str) -> None:
    db: Session = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task is None:
            return

        fn = registry.get(task.task_type)
        payload = task.payload_json or {}

        emit(
            db,
            task_id=task.id,
            project_id=task.project_id,
            user_id=task.user_id,
            stage="started",
            progress=0,
            event_type="task.started",
        )

        if fn is None:
            task.status = "failed"
            task.error_code = "UNREGISTERED_HANDLER"
            task.error_message = f"No handler for task_type={task.task_type}"
            task.finished_at = datetime.now(UTC)
            db.commit()
            emit(
                db,
                task_id=task.id,
                project_id=task.project_id,
                user_id=task.user_id,
                stage="failed",
                message=task.error_message,
                event_type="task.failed",
            )
            return

        try:
            ctx = TaskContext(db=db, task=task, payload=payload)
            result = await fn(ctx)
            task.status = "completed"
            task.progress = 100
            task.result_json = result or {}
            task.finished_at = datetime.now(UTC)
            db.commit()
            emit(
                db,
                task_id=task.id,
                project_id=task.project_id,
                user_id=task.user_id,
                stage="completed",
                progress=100,
                event_type="task.completed",
                payload=task.result_json,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("task %s (%s) failed", task.id, task.task_type)
            task.status = "failed"
            task.error_code = "HANDLER_ERROR"
            task.error_message = str(exc)[:1000]
            task.finished_at = datetime.now(UTC)
            db.commit()
            emit(
                db,
                task_id=task.id,
                project_id=task.project_id,
                user_id=task.user_id,
                stage="failed",
                message=task.error_message,
                event_type="task.failed",
            )
    finally:
        db.close()


async def _loop() -> None:
    assert _stop_event is not None
    sem = asyncio.Semaphore(MAX_CONCURRENT_TASKS)

    async def _guarded(task_id: str) -> None:
        async with sem:
            await _run_task(task_id)

    while not _stop_event.is_set():
        db = SessionLocal()
        try:
            claimed = _claim_next_task(db)
        finally:
            db.close()

        if claimed is None:
            try:
                await asyncio.wait_for(_stop_event.wait(), timeout=POLL_INTERVAL_SECONDS)
            except asyncio.TimeoutError:
                pass
            continue

        asyncio.create_task(_guarded(claimed.id))


def start_worker() -> None:
    global _worker_task, _stop_event
    if _worker_task is not None and not _worker_task.done():
        return
    _stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(_loop(), name="np-task-worker")
    logger.info("NP task worker started with %d handler(s)", len(registry.list_types()))


async def stop_worker() -> None:
    global _worker_task, _stop_event
    if _stop_event is not None:
        _stop_event.set()
    if _worker_task is not None:
        try:
            await asyncio.wait_for(_worker_task, timeout=5.0)
        except asyncio.TimeoutError:
            _worker_task.cancel()
    _worker_task = None
    _stop_event = None
