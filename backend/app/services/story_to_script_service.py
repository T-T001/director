from __future__ import annotations

from datetime import UTC, datetime

from app.core.db import SessionLocal
from app.db.models.run import WorkflowEvent, WorkflowRun, WorkflowStep
from app.db.models.task import Task, TaskEvent

TASK_EVENT_PROCESSING = "task.processing"
TASK_EVENT_COMPLETED = "task.completed"
TASK_EVENT_FAILED = "task.failed"
RUN_EVENT_START = "run.start"
RUN_EVENT_STEP_START = "step.start"
RUN_EVENT_STEP_COMPLETE = "step.complete"
RUN_EVENT_COMPLETE = "run.complete"
RUN_EVENT_ERROR = "run.error"
ACTIVE_TASK_STATUSES = {"queued", "processing", "running"}


def run_story_to_script_task(task_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task is None or task.status not in ACTIVE_TASK_STATUSES:
            return

        run = db.query(WorkflowRun).filter(WorkflowRun.task_id == task.id).first()
        if run is None:
            return

        now = datetime.now(UTC)
        task.status = "processing"
        task.progress = 10
        task.started_at = now
        task.updated_at = now

        run.status = "running"
        run.updated_at = now

        step = (
            db.query(WorkflowStep)
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == "story_to_script")
            .first()
        )
        if step is None:
            step = WorkflowStep(
                run_id=run.id,
                step_key="story_to_script",
                step_title="Story to Script",
                status="running",
                current_attempt=1,
                step_index=1,
                step_total=1,
                started_at=now,
            )
            db.add(step)
        else:
            step.status = "running"
            step.current_attempt = max(1, step.current_attempt)
            step.started_at = step.started_at or now
            step.finished_at = None

        _append_task_event(
            db,
            task_id=task.id,
            project_id=task.project_id,
            user_id=task.user_id,
            event_type=TASK_EVENT_PROCESSING,
            payload={"stage": "processing", "progress": 10},
        )
        _append_run_event(
            db,
            run_id=run.id,
            project_id=run.project_id,
            user_id=run.user_id,
            event_type=RUN_EVENT_START,
            payload={"message": "Run started"},
        )
        _append_run_event(
            db,
            run_id=run.id,
            project_id=run.project_id,
            user_id=run.user_id,
            event_type=RUN_EVENT_STEP_START,
            step_key="story_to_script",
            payload={
                "stepKey": "story_to_script",
                "stepTitle": "Story to Script",
                "stepIndex": 1,
                "stepTotal": 1,
            },
        )
        db.commit()

        refreshed_task = db.query(Task).filter(Task.id == task.id).first()
        if refreshed_task is None or refreshed_task.status == "canceled":
            return

        output = _build_story_to_script_output(refreshed_task.payload_json or {})
        completed_at = datetime.now(UTC)

        refreshed_task.status = "completed"
        refreshed_task.progress = 100
        refreshed_task.result_json = output
        refreshed_task.finished_at = completed_at
        refreshed_task.updated_at = completed_at

        run_ref = db.query(WorkflowRun).filter(WorkflowRun.task_id == refreshed_task.id).first()
        if run_ref is not None:
            run_ref.status = "completed"
            run_ref.output_json = output
            run_ref.updated_at = completed_at

            step_ref = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.run_id == run_ref.id,
                    WorkflowStep.step_key == "story_to_script",
                )
                .first()
            )
            if step_ref is not None:
                step_ref.status = "completed"
                step_ref.finished_at = completed_at

            _append_run_event(
                db,
                run_id=run_ref.id,
                project_id=run_ref.project_id,
                user_id=run_ref.user_id,
                event_type=RUN_EVENT_STEP_COMPLETE,
                step_key="story_to_script",
                payload={
                    "stepKey": "story_to_script",
                    "stepTitle": "Story to Script",
                    "stepIndex": 1,
                    "stepTotal": 1,
                    "done": True,
                },
            )
            _append_run_event(
                db,
                run_id=run_ref.id,
                project_id=run_ref.project_id,
                user_id=run_ref.user_id,
                event_type=RUN_EVENT_COMPLETE,
                payload={"message": "Run completed", "result": output},
            )

        _append_task_event(
            db,
            task_id=refreshed_task.id,
            project_id=refreshed_task.project_id,
            user_id=refreshed_task.user_id,
            event_type=TASK_EVENT_COMPLETED,
            payload={"stage": "completed", "progress": 100},
        )
        db.commit()
    except Exception as error:
        db.rollback()
        _mark_failed(db, task_id=task_id, error_message=str(error))
    finally:
        db.close()


def _mark_failed(db, task_id: str, error_message: str) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None or task.status == "canceled":
        return

    failed_at = datetime.now(UTC)
    task.status = "failed"
    task.error_code = "INTERNAL_ERROR"
    task.error_message = error_message
    task.finished_at = failed_at
    task.updated_at = failed_at

    run = db.query(WorkflowRun).filter(WorkflowRun.task_id == task.id).first()
    if run is not None:
        run.status = "failed"
        run.error_code = "INTERNAL_ERROR"
        run.error_message = error_message
        run.updated_at = failed_at

        step = (
            db.query(WorkflowStep)
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == "story_to_script")
            .first()
        )
        if step is not None:
            step.status = "failed"
            step.finished_at = failed_at

        _append_run_event(
            db,
            run_id=run.id,
            project_id=run.project_id,
            user_id=run.user_id,
            event_type=RUN_EVENT_ERROR,
            step_key="story_to_script",
            payload={"errorCode": "INTERNAL_ERROR", "message": error_message},
        )

    _append_task_event(
        db,
        task_id=task.id,
        project_id=task.project_id,
        user_id=task.user_id,
        event_type=TASK_EVENT_FAILED,
        payload={"stage": "failed", "message": error_message},
    )
    db.commit()


def _build_story_to_script_output(payload_json: dict) -> dict:
    content = ""
    episode_name = ""
    if isinstance(payload_json, dict):
        content = str(payload_json.get("content") or "").strip()
        episode_name = str(payload_json.get("episode_name") or "").strip()

    source = content or episode_name or "Untitled story"
    normalized = " ".join(source.split())
    if len(normalized) > 280:
        normalized = normalized[:280]

    return {
        "script": {
            "title": episode_name or "Story Script",
            "summary": normalized,
            "scenes": [
                {
                    "scene_index": 1,
                    "description": normalized,
                }
            ],
        }
    }


def _append_task_event(
    db,
    task_id: str,
    project_id: str,
    user_id: str,
    event_type: str,
    payload: dict | None = None,
) -> None:
    db.add(
        TaskEvent(
            task_id=task_id,
            project_id=project_id,
            user_id=user_id,
            event_type=event_type,
            payload_json=payload or {},
        )
    )


def _append_run_event(
    db,
    run_id: str,
    project_id: str,
    user_id: str,
    event_type: str,
    step_key: str | None = None,
    payload: dict | None = None,
) -> None:
    last_seq = (
        db.query(WorkflowEvent.seq)
        .filter(WorkflowEvent.run_id == run_id)
        .order_by(WorkflowEvent.seq.desc())
        .first()
    )
    next_seq = (last_seq[0] if last_seq else 0) + 1
    db.add(
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
