from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
import wave

from app.core.db import SessionLocal
from app.db.models.episode import Episode
from app.db.models.run import WorkflowEvent, WorkflowRun, WorkflowStep
from app.db.models.task import Task, TaskEvent
from app.services.asset_service import AssetService

TASK_EVENT_PROCESSING = "task.processing"
TASK_EVENT_COMPLETED = "task.completed"
TASK_EVENT_FAILED = "task.failed"
RUN_EVENT_START = "run.start"
RUN_EVENT_STEP_START = "step.start"
RUN_EVENT_STEP_COMPLETE = "step.complete"
RUN_EVENT_COMPLETE = "run.complete"
RUN_EVENT_ERROR = "run.error"
ACTIVE_TASK_STATUSES = {"queued", "processing", "running"}
VOICE_GENERATE_STEP_KEY = "voice_generate"


def run_voice_generate_task(task_id: str) -> None:
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
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == VOICE_GENERATE_STEP_KEY)
            .first()
        )
        if step is None:
            step = WorkflowStep(
                run_id=run.id,
                step_key=VOICE_GENERATE_STEP_KEY,
                step_title="Voice Generate",
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
            step_key=VOICE_GENERATE_STEP_KEY,
            payload={
                "stepKey": VOICE_GENERATE_STEP_KEY,
                "stepTitle": "Voice Generate",
                "stepIndex": 1,
                "stepTotal": 1,
            },
        )
        db.commit()

        refreshed_task = db.query(Task).filter(Task.id == task.id).first()
        if refreshed_task is None or refreshed_task.status == "canceled":
            return

        output = _build_voice_output(db, refreshed_task)
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
                .filter(WorkflowStep.run_id == run_ref.id, WorkflowStep.step_key == VOICE_GENERATE_STEP_KEY)
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
                step_key=VOICE_GENERATE_STEP_KEY,
                payload={
                    "stepKey": VOICE_GENERATE_STEP_KEY,
                    "stepTitle": "Voice Generate",
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


def _build_voice_output(db, task: Task) -> dict:
    if not task.episode_id:
        raise ValueError("Task episode_id is required")

    episode = db.query(Episode).filter(Episode.id == task.episode_id).first()
    if episode is None:
        raise ValueError("Episode not found")

    payload = task.payload_json if isinstance(task.payload_json, dict) else {}
    transcript = _normalize_text(
        str(
            payload.get("line_text")
            or payload.get("transcript")
            or payload.get("content")
            or episode.srt_content
            or episode.novel_text
            or ""
        )
    )
    if not transcript:
        transcript = f"Voice render for episode {episode.name}"

    line_count = max(1, len([line for line in transcript.splitlines() if line.strip()]))
    wav_bytes = _build_wav_bytes(line_count)
    media = AssetService.upload_media(
        user_id=task.user_id,
        filename=f"episode-{episode.id}-voice.wav",
        content_type="audio/wav",
        contents=wav_bytes,
    )

    episode.audio_media_id = media.id
    db.add(episode)
    db.flush()

    return {
        "episode_id": episode.id,
        "audio_media_id": media.id,
        "audio_url": AssetService.build_media_url(media),
        "transcript_excerpt": transcript[:280],
        "line_text": _normalize_text(str(payload.get("line_text") or "")) or None,
    }


def _build_wav_bytes(line_count: int) -> bytes:
    sample_rate = 16000
    duration_seconds = max(1, min(8, line_count))
    frame_count = sample_rate * duration_seconds
    buffer = BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b"\x00\x00" * frame_count)
    return buffer.getvalue()


def _normalize_text(value: str) -> str:
    return " ".join(value.split()).strip()


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
            .filter(WorkflowStep.run_id == run.id, WorkflowStep.step_key == VOICE_GENERATE_STEP_KEY)
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
            step_key=VOICE_GENERATE_STEP_KEY,
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
