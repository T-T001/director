from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.run import WorkflowEvent, WorkflowRun, WorkflowStep
from app.db.models.task import Task, TaskEvent

ACTIVE_RUN_STATUSES = {"queued", "running", "canceling"}


class RunService:
    def __init__(self, db: Session):
        self.db = db

    def list_runs(
        self,
        user_id: str,
        project_id: str | None = None,
        workflow_type: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        episode_id: str | None = None,
        statuses: list[str] | None = None,
        limit: int = 50,
    ) -> list[WorkflowRun]:
        query = self.db.query(WorkflowRun).filter(WorkflowRun.user_id == user_id)
        if project_id:
            query = query.filter(WorkflowRun.project_id == project_id)
        if workflow_type:
            query = query.filter(WorkflowRun.workflow_type == workflow_type)
        if target_type:
            query = query.filter(WorkflowRun.target_type == target_type)
        if target_id:
            query = query.filter(WorkflowRun.target_id == target_id)
        if episode_id:
            query = query.filter(WorkflowRun.episode_id == episode_id)
        if statuses:
            query = query.filter(WorkflowRun.status.in_(statuses))
        return query.order_by(WorkflowRun.created_at.desc()).limit(max(1, min(limit, 200))).all()

    def get_run(self, user_id: str, run_id: str) -> WorkflowRun:
        run = (
            self.db.query(WorkflowRun)
            .filter(WorkflowRun.id == run_id, WorkflowRun.user_id == user_id)
            .first()
        )
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Run not found"},
            )
        return run

    def get_run_snapshot(self, user_id: str, run_id: str) -> tuple[WorkflowRun, list[WorkflowStep]]:
        run = self.get_run(user_id, run_id)
        steps = (
            self.db.query(WorkflowStep)
            .filter(WorkflowStep.run_id == run.id)
            .order_by(WorkflowStep.step_index.asc(), WorkflowStep.started_at.asc())
            .all()
        )
        return run, steps

    def list_events(
        self, user_id: str, run_id: str, after_seq: int = 0, limit: int = 200
    ) -> list[WorkflowEvent]:
        self.get_run(user_id, run_id)
        return (
            self.db.query(WorkflowEvent)
            .filter(
                WorkflowEvent.run_id == run_id,
                WorkflowEvent.user_id == user_id,
                WorkflowEvent.seq > after_seq,
            )
            .order_by(WorkflowEvent.seq.asc())
            .limit(limit)
            .all()
        )

    def ensure_run_visible(self, user_id: str, run_id: str) -> None:
        self.get_run(user_id, run_id)

    def cancel_run(self, user_id: str, run_id: str) -> WorkflowRun:
        run = self.get_run(user_id, run_id)
        if run.status not in ACTIVE_RUN_STATUSES:
            return run

        now = datetime.now(UTC)
        run.status = "canceled"
        run.error_code = "RUN_CANCELED"
        run.error_message = "Run cancelled by user"
        run.updated_at = now

        active_steps = (
            self.db.query(WorkflowStep)
            .filter(
                WorkflowStep.run_id == run.id,
                WorkflowStep.status.in_(["queued", "pending", "running"]),
            )
            .all()
        )
        for step in active_steps:
            step.status = "canceled"
            step.finished_at = now

        if run.task_id:
            task = (
                self.db.query(Task)
                .filter(Task.id == run.task_id, Task.user_id == user_id)
                .first()
            )
            if task and task.status in {"queued", "processing", "running"}:
                task.status = "canceled"
                task.error_code = "TASK_CANCELLED"
                task.error_message = "Task cancelled by user"
                task.finished_at = now
                task.updated_at = now
                self.db.add(
                    TaskEvent(
                        task_id=task.id,
                        project_id=task.project_id,
                        user_id=task.user_id,
                        event_type="task.failed",
                        payload_json={"stage": "cancelled", "message": "Task cancelled by user"},
                    )
                )

        self._append_run_event(
            run_id=run.id,
            project_id=run.project_id,
            user_id=run.user_id,
            event_type="run.canceled",
            payload={"message": "Run cancelled by user"},
        )
        self.db.commit()
        self.db.refresh(run)
        return run

    def _append_run_event(
        self,
        run_id: str,
        project_id: str,
        user_id: str,
        event_type: str,
        step_key: str | None = None,
        payload: dict | None = None,
    ) -> None:
        last_seq = (
            self.db.query(WorkflowEvent.seq)
            .filter(WorkflowEvent.run_id == run_id)
            .order_by(WorkflowEvent.seq.desc())
            .first()
        )
        next_seq = (last_seq[0] if last_seq else 0) + 1
        self.db.add(
            WorkflowEvent(
                run_id=run_id,
                project_id=project_id,
                user_id=user_id,
                event_type=event_type,
                step_key=step_key,
                seq=next_seq,
                payload_json=payload or {},
            )
        )
