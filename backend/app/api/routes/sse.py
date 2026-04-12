from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_project_for_user
from app.core.db import get_db
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
            "message": "Project SSE is reserved for Phase 2.",
        },
    }
