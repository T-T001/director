from sqlalchemy.orm import Session

from app.db.models.user import UserPreference
from app.schemas.settings import SettingsUpdate


class SettingsService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: str) -> UserPreference:
        preference = self.db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if preference:
            return preference
        preference = UserPreference(user_id=user_id)
        self.db.add(preference)
        self.db.commit()
        self.db.refresh(preference)
        return preference

    def update(self, user_id: str, payload: SettingsUpdate) -> UserPreference:
        preference = self.get_or_create(user_id)
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(preference, field_name, value)
        self.db.add(preference)
        self.db.commit()
        self.db.refresh(preference)
        return preference
