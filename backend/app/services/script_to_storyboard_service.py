from __future__ import annotations

from datetime import UTC, datetime

from app.core.db import SessionLocal
from app.db.models.episode import Episode
from app.db.models.run import WorkflowEvent, WorkflowRun, WorkflowStep
from app.db.models.storyboard import Storyboard, StoryboardPanel
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


def run_script_to_storyboard_task(task_id: str) -> None:
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
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == "script_to_storyboard")
            .first()
        )
        if step is None:
            step = WorkflowStep(
                run_id=run.id,
                step_key="script_to_storyboard",
                step_title="Script to Storyboard",
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
            step_key="script_to_storyboard",
            payload={
                "stepKey": "script_to_storyboard",
                "stepTitle": "Script to Storyboard",
                "stepIndex": 1,
                "stepTotal": 1,
            },
        )
        db.commit()

        refreshed_task = db.query(Task).filter(Task.id == task.id).first()
        if refreshed_task is None or refreshed_task.status == "canceled":
            return

        output = _build_script_to_storyboard_output(db, refreshed_task)
        storyboard = _persist_storyboard_output(db, refreshed_task, output)
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
                    WorkflowStep.step_key == "script_to_storyboard",
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
                step_key="script_to_storyboard",
                payload={
                    "stepKey": "script_to_storyboard",
                    "stepTitle": "Script to Storyboard",
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
                payload={
                    "message": "Run completed",
                    "storyboard_id": storyboard.id,
                    "panel_count": storyboard.panel_count,
                    "result": output,
                },
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
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == "script_to_storyboard")
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
            step_key="script_to_storyboard",
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


def _build_script_to_storyboard_output(db, task: Task) -> dict:
    episode = None
    if task.episode_id:
        episode = db.query(Episode).filter(Episode.id == task.episode_id).first()

    payload = task.payload_json if isinstance(task.payload_json, dict) else {}
    source_script = _resolve_source_script(db, task, episode, payload)
    panel_texts = _split_script_to_panels(source_script)

    panels = []
    for index, text in enumerate(panel_texts, start=1):
        base_prompt = _build_base_prompt(text)
        panels.append(
            {
                "panel_index": index,
                "description": text,
                "image_prompt": base_prompt,
                "video_prompt": base_prompt,
            }
        )

    return {
        "storyboard": {
            "episode_id": task.episode_id,
            "panel_count": len(panels),
            "source_script": source_script,
            "panels": panels,
        }
    }


def _resolve_source_script(db, task: Task, episode: Episode | None, payload: dict) -> str:
    payload_script = payload.get("script")
    if isinstance(payload_script, str) and payload_script.strip():
        return " ".join(payload_script.split())

    if task.episode_id:
        story_to_script_task = (
            db.query(Task)
            .filter(
                Task.user_id == task.user_id,
                Task.project_id == task.project_id,
                Task.episode_id == task.episode_id,
                Task.task_type == "story_to_script_run",
                Task.status == "completed",
            )
            .order_by(Task.updated_at.desc())
            .first()
        )
        if story_to_script_task and isinstance(story_to_script_task.result_json, dict):
            result_script = story_to_script_task.result_json.get("script")
            if isinstance(result_script, dict):
                summary = result_script.get("summary")
                if isinstance(summary, str) and summary.strip():
                    return " ".join(summary.split())

    if episode and isinstance(episode.novel_text, str) and episode.novel_text.strip():
        return " ".join(episode.novel_text.split())

    return "Untitled storyboard script"


def _split_script_to_panels(source_script: str) -> list[str]:
    cleaned = " ".join(source_script.split())
    if not cleaned:
        return ["Untitled panel"]

    sentence_candidates = [segment.strip() for segment in cleaned.split(".") if segment.strip()]
    if not sentence_candidates:
        sentence_candidates = [cleaned]

    max_panels = 6
    selected = sentence_candidates[:max_panels]
    return [segment[:280] for segment in selected]


def _build_base_prompt(text: str) -> str:
    normalized = " ".join(text.split())
    return (
        "cinematic storyboard frame, coherent character identity, "
        f"{normalized}"
    )


def _persist_storyboard_output(db, task: Task, output: dict) -> Storyboard:
    storyboard_data = output.get("storyboard") if isinstance(output, dict) else None
    if not isinstance(storyboard_data, dict):
        raise ValueError("Invalid storyboard output")

    panels_data = storyboard_data.get("panels")
    if not isinstance(panels_data, list):
        raise ValueError("Invalid storyboard panels")

    if not task.episode_id:
        raise ValueError("Task episode_id is required")

    storyboard = Storyboard(
        user_id=task.user_id,
        project_id=task.project_id,
        episode_id=task.episode_id,
        panel_count=len(panels_data),
        source_task_id=task.id,
    )
    db.add(storyboard)
    db.flush()

    for panel in panels_data:
        if not isinstance(panel, dict):
            continue
        panel_index = panel.get("panel_index")
        description = panel.get("description")
        image_prompt = panel.get("image_prompt")
        video_prompt = panel.get("video_prompt")

        db.add(
            StoryboardPanel(
                storyboard_id=storyboard.id,
                panel_index=int(panel_index) if isinstance(panel_index, int) else 1,
                description=str(description or ""),
                image_prompt=str(image_prompt) if image_prompt is not None else None,
                video_prompt=str(video_prompt) if video_prompt is not None else None,
            )
        )

    return storyboard


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
