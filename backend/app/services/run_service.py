from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.run import WorkflowEvent, WorkflowRun


class RunService:
    def __init__(self, db: Session):
        self.db = db

    def list_events(
        self, user_id: str, run_id: str, after_seq: int = 0, limit: int = 200
    ) -> list[WorkflowEvent]:
        events = (
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
        return events

    def ensure_run_visible(self, user_id: str, run_id: str) -> None:
        run = (
            self.db.query(WorkflowRun)
            .filter(WorkflowRun.id == run_id, WorkflowRun.user_id == user_id)
            .first()
        )
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Run not found"}
            )
