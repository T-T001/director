from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import clear_refresh_cookie, set_refresh_cookie
from app.db.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RefreshResponse, UserSummary
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict:
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(payload.username, payload.password)
    access_token, refresh_token = auth_service.issue_tokens(user)
    set_refresh_cookie(response, refresh_token)
    body = AuthResponse(user=UserSummary.model_validate(user), access_token=access_token)
    return {"success": True, "data": body.model_dump()}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> dict:
    body = UserSummary.model_validate(current_user)
    return {"success": True, "data": body.model_dump()}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    auth_service = AuthService(db)
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    user, access_token, next_refresh_token = auth_service.rotate_refresh_token(refresh_token or "")
    set_refresh_cookie(response, next_refresh_token)
    body = RefreshResponse(access_token=access_token)
    return {
        "success": True,
        "data": {
            **body.model_dump(),
            "user": UserSummary.model_validate(user).model_dump(),
        },
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    auth_service = AuthService(db)
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    auth_service.revoke_refresh_token(refresh_token)
    clear_refresh_cookie(response)
    return {"success": True, "data": {"logged_out": True}}
