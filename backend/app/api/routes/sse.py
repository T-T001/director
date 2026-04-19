import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.db import get_db
from app.core.redis import get_redis
from app.db.models.task import Task, TaskEvent
from app.db.models.user import User

router = APIRouter(prefix="/sse", tags=["sse"])


@router.get("/projects/{project_id}")
def project_sse_stub(
    project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    get_project_for_user(project_id, current_user.id, db)
    return {
        "success": True,
        "data": {
            "project_id": project_id,
            "enabled": False,
            "message": "Use /api/sse/tasks/{task_id} for NP task progress streams.",
        },
    }


@router.get("/tasks/{task_id}")
async def task_sse(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream progress events for a single NP task via Server-Sent Events.

    On connect we replay persisted task_events from the DB, then tail Redis
    pub/sub channel `np:task:{task_id}` for new events. Finishes when the task
    reaches a terminal status (completed / failed / canceled).
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if task is None:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Task not found"}
        )

    async def stream():
        # Replay stored events first.
        replayed = (
            db.query(TaskEvent)
            .filter(TaskEvent.task_id == task_id)
            .order_by(TaskEvent.id.asc())
            .all()
        )
        for ev in replayed:
            yield _format_event(ev.event_type, ev.payload_json or {})

        # Tail Redis for live events.
        redis = get_redis()
        pubsub = redis.pubsub()
        channel = f"np:task:{task_id}"
        try:
            pubsub.subscribe(channel)
        except Exception:
            # Redis unavailable — fall back to DB polling.
            async for chunk in _db_tail(db, task_id):
                yield chunk
            return

        try:
            loop = asyncio.get_event_loop()
            while True:
                message = await loop.run_in_executor(None, pubsub.get_message, True, 1.0)
                if message and message.get("type") == "message":
                    data = message.get("data") or "{}"
                    try:
                        payload = json.loads(data)
                    except json.JSONDecodeError:
                        payload = {"raw": data}
                    yield _format_event("progress", payload)
                    stage = (payload or {}).get("stage")
                    if stage in {"completed", "failed", "canceled"}:
                        break
                else:
                    # No message — check if task is already in a terminal state
                    db.expire_all()
                    current = db.query(Task).filter(Task.id == task_id).first()
                    if current is None or current.status in {"completed", "failed", "canceled"}:
                        break
        finally:
            try:
                pubsub.unsubscribe(channel)
                pubsub.close()
            except Exception:
                pass

    return StreamingResponse(stream(), media_type="text/event-stream")


async def _db_tail(db: Session, task_id: str):
    last_event_id = 0
    while True:
        db.expire_all()
        events = (
            db.query(TaskEvent)
            .filter(TaskEvent.task_id == task_id, TaskEvent.id > last_event_id)
            .order_by(TaskEvent.id.asc())
            .all()
        )
        for ev in events:
            last_event_id = ev.id
            yield _format_event(ev.event_type, ev.payload_json or {})
            stage = (ev.payload_json or {}).get("stage")
            if stage in {"completed", "failed", "canceled"}:
                return
        task = db.query(Task).filter(Task.id == task_id).first()
        if task is None or task.status in {"completed", "failed", "canceled"}:
            return
        await asyncio.sleep(1.0)


def _format_event(event: str, payload: dict) -> str:
    data = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"
