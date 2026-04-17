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
PROMPT_MODIFY_STEP_KEY = "prompt_modify"
PROMPT_SOURCE_APPEND_STEP_KEY = "prompt_source_append"


def run_prompt_modify_task(task_id: str) -> None:
    _run_prompt_task(task_id, workflow_kind="modify")


def run_prompt_source_append_task(task_id: str) -> None:
    _run_prompt_task(task_id, workflow_kind="append_source")


def _run_prompt_task(task_id: str, *, workflow_kind: str) -> None:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task is None or task.status not in ACTIVE_TASK_STATUSES:
            return

        run = db.query(WorkflowRun).filter(WorkflowRun.task_id == task.id).first()
        if run is None:
            return

        step_key = PROMPT_MODIFY_STEP_KEY if workflow_kind == "modify" else PROMPT_SOURCE_APPEND_STEP_KEY
        step_title = "Prompt Modify" if workflow_kind == "modify" else "Append Prompt Source"

        now = datetime.now(UTC)
        task.status = "processing"
        task.progress = 10
        task.started_at = now
        task.updated_at = now

        run.status = "running"
        run.updated_at = now

        step = (
            db.query(WorkflowStep)
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == step_key)
            .first()
        )
        if step is None:
            step = WorkflowStep(
                run_id=run.id,
                step_key=step_key,
                step_title=step_title,
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
            step_key=step_key,
            payload={
                "stepKey": step_key,
                "stepTitle": step_title,
                "stepIndex": 1,
                "stepTotal": 1,
            },
        )
        db.commit()

        refreshed_task = db.query(Task).filter(Task.id == task.id).first()
        if refreshed_task is None or refreshed_task.status == "canceled":
            return

        if workflow_kind == "modify":
            output = _apply_prompt_modify(db, refreshed_task)
        else:
            output = _apply_prompt_source_append(db, refreshed_task)

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
                .filter(WorkflowStep.run_id == run_ref.id, WorkflowStep.step_key == step_key)
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
                step_key=step_key,
                payload={
                    "stepKey": step_key,
                    "stepTitle": step_title,
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
        _mark_failed(db, task_id=task_id, error_message=str(error), workflow_kind=workflow_kind)
    finally:
        db.close()


def _apply_prompt_modify(db, task: Task) -> dict:
    panel = (
        db.query(StoryboardPanel)
        .join(Storyboard, Storyboard.id == StoryboardPanel.storyboard_id)
        .filter(StoryboardPanel.id == task.target_id, Storyboard.project_id == task.project_id)
        .first()
    )
    if panel is None:
        raise ValueError("Panel not found")

    payload = task.payload_json if isinstance(task.payload_json, dict) else {}
    current_prompt = _normalize_text(str(payload.get("prompt") or panel.image_prompt or ""))
    instruction = _normalize_text(str(payload.get("instruction") or ""))
    characters = _normalize_list(payload.get("mentioned_characters") or payload.get("characters"))
    locations = _normalize_list(payload.get("mentioned_locations") or payload.get("locations"))

    base_prompt = current_prompt or _build_base_prompt(panel.description)
    segments = [segment for segment in [base_prompt] if segment]
    if instruction:
        segments.append(f"Refinement: {instruction}")
    if characters:
        segments.append(f"Characters: {', '.join(characters)}")
    if locations:
        segments.append(f"Locations: {', '.join(locations)}")

    next_prompt = "\n\n".join(segments).strip() or None
    panel.image_prompt = next_prompt
    db.add(panel)
    db.flush()

    return {
        "panel": {
            "id": panel.id,
            "storyboard_id": panel.storyboard_id,
            "image_prompt": panel.image_prompt,
            "video_prompt": panel.video_prompt,
        },
        "mode": "modified",
    }


def _apply_prompt_source_append(db, task: Task) -> dict:
    if not task.episode_id:
        raise ValueError("Task episode_id is required")

    payload = task.payload_json if isinstance(task.payload_json, dict) else {}
    source_text = _normalize_text(
        str(
            payload.get("content")
            or payload.get("source_text")
            or payload.get("source")
            or payload.get("text")
            or ""
        )
    )
    if not source_text:
        episode = db.query(Episode).filter(Episode.id == task.episode_id).first()
        source_text = _normalize_text(str(episode.srt_content or episode.novel_text or "")) if episode else ""
    if not source_text:
        raise ValueError("Prompt source content is required")

    panels = (
        db.query(StoryboardPanel)
        .join(Storyboard, Storyboard.id == StoryboardPanel.storyboard_id)
        .filter(Storyboard.project_id == task.project_id, Storyboard.episode_id == task.episode_id)
        .order_by(Storyboard.created_at.asc(), StoryboardPanel.panel_index.asc())
        .all()
    )
    if not panels:
        raise ValueError("Generate storyboard before appending prompt source")

    segments = _split_segments(source_text)
    updated_panel_ids: list[str] = []
    for index, panel in enumerate(panels):
        addition = segments[index % len(segments)] if segments else source_text
        base_prompt = _normalize_text(panel.image_prompt or "") or _build_base_prompt(panel.description)
        panel.image_prompt = f"{base_prompt}\n\nSource addendum: {addition}".strip()
        db.add(panel)
        updated_panel_ids.append(panel.id)

    db.flush()
    return {
        "episode_id": task.episode_id,
        "updated_panel_ids": updated_panel_ids,
        "updated_count": len(updated_panel_ids),
        "source_excerpt": source_text[:280],
    }


def _build_base_prompt(description: str | None) -> str:
    normalized = _normalize_text(description or "")
    if not normalized:
        return "Cinematic scene, keep character continuity"
    return f"Cinematic scene, keep character continuity, {normalized}"


def _split_segments(source_text: str) -> list[str]:
    cleaned = _normalize_text(source_text)
    if not cleaned:
        return []
    parts = [segment.strip() for segment in cleaned.replace("\n", " ").split(".") if segment.strip()]
    if not parts:
        return [cleaned]
    return [part[:280] for part in parts]


def _normalize_text(value: str) -> str:
    return " ".join(value.split()).strip()


def _normalize_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        normalized = _normalize_text(str(item or ""))
        if normalized:
            items.append(normalized)
    return items


def _mark_failed(db, task_id: str, error_message: str, *, workflow_kind: str) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None or task.status == "canceled":
        return

    step_key = PROMPT_MODIFY_STEP_KEY if workflow_kind == "modify" else PROMPT_SOURCE_APPEND_STEP_KEY
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
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == step_key)
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
            step_key=step_key,
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
