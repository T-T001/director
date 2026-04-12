from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_token,
    verify_password,
)
from app.db.models.user import RefreshToken, User

settings = get_settings()


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, username: str, password: str) -> User:
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Invalid username or password"},
            )
        return user

    def issue_tokens(self, user: User) -> tuple[str, str]:
        raw_refresh_token, token_hash = generate_refresh_token()
        expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
        refresh_token = RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        self.db.add(refresh_token)
        self.db.commit()
        access_token = create_access_token(user.id)
        return access_token, raw_refresh_token

    def rotate_refresh_token(self, raw_refresh_token: str) -> tuple[User, str, str]:
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Missing refresh token"},
            )
        token_hash = hash_token(raw_refresh_token)
        token_row = (
            self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        )
        if not token_row or token_row.expires_at < datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Refresh token is invalid or expired"},
            )

        user = self.db.query(User).filter(User.id == token_row.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "User not found"}
            )

        self.db.delete(token_row)
        self.db.commit()
        access_token, next_refresh = self.issue_tokens(user)
        return user, access_token, next_refresh

    def revoke_refresh_token(self, raw_refresh_token: str | None) -> None:
        if not raw_refresh_token:
            return
        token_hash = hash_token(raw_refresh_token)
        token_row = (
            self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        )
        if token_row:
            self.db.delete(token_row)
            self.db.commit()
