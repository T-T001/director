from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.novel_promotion import (
    CharacterAppearance,
    NovelPromotionCharacter,
)
from app.schemas.novel_promotion.entities import (
    AppearanceCreate,
    AppearanceUpdate,
    CharacterCreate,
    CharacterUpdate,
)
from app.services.novel_promotion.common import (
    apply_updates,
    ensure_character,
    ensure_np_project,
)


class CharacterService:
    def __init__(self, db: Session):
        self.db = db

    def list_(self, user_id: str, project_id: str) -> list[NovelPromotionCharacter]:
        np = ensure_np_project(self.db, user_id, project_id)
        return (
            self.db.query(NovelPromotionCharacter)
            .filter(NovelPromotionCharacter.np_project_id == np.id)
            .order_by(NovelPromotionCharacter.created_at.asc())
            .all()
        )

    def create(self, user_id: str, project_id: str, payload: CharacterCreate) -> NovelPromotionCharacter:
        np = ensure_np_project(self.db, user_id, project_id)
        char = NovelPromotionCharacter(
            np_project_id=np.id,
            name=payload.name.strip(),
            aliases=payload.aliases,
            introduction=payload.introduction,
        )
        self.db.add(char)
        self.db.commit()
        self.db.refresh(char)
        return char

    def get(self, user_id: str, project_id: str, character_id: str) -> NovelPromotionCharacter:
        return ensure_character(self.db, user_id, project_id, character_id)

    def update(
        self, user_id: str, project_id: str, character_id: str, payload: CharacterUpdate
    ) -> NovelPromotionCharacter:
        char = ensure_character(self.db, user_id, project_id, character_id)
        apply_updates(char, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(char)
        return char

    def delete(self, user_id: str, project_id: str, character_id: str) -> None:
        char = ensure_character(self.db, user_id, project_id, character_id)
        self.db.delete(char)
        self.db.commit()

    def confirm_profile(
        self, user_id: str, project_id: str, character_id: str, profile_data: str | None
    ) -> NovelPromotionCharacter:
        char = ensure_character(self.db, user_id, project_id, character_id)
        if profile_data is not None:
            char.profile_data = profile_data
        char.profile_confirmed = True
        self.db.commit()
        self.db.refresh(char)
        return char

    def batch_confirm_profile(
        self, user_id: str, project_id: str, character_ids: list[str]
    ) -> int:
        np = ensure_np_project(self.db, user_id, project_id)
        updated = (
            self.db.query(NovelPromotionCharacter)
            .filter(
                NovelPromotionCharacter.id.in_(character_ids),
                NovelPromotionCharacter.np_project_id == np.id,
            )
            .update({NovelPromotionCharacter.profile_confirmed: True}, synchronize_session=False)
        )
        self.db.commit()
        return updated


class AppearanceService:
    def __init__(self, db: Session):
        self.db = db

    def list_(
        self, user_id: str, project_id: str, character_id: str
    ) -> list[CharacterAppearance]:
        ensure_character(self.db, user_id, project_id, character_id)
        return (
            self.db.query(CharacterAppearance)
            .filter(CharacterAppearance.character_id == character_id)
            .order_by(CharacterAppearance.appearance_index.asc())
            .all()
        )

    def create(
        self, user_id: str, project_id: str, character_id: str, payload: AppearanceCreate
    ) -> CharacterAppearance:
        ensure_character(self.db, user_id, project_id, character_id)
        next_index = (
            self.db.query(CharacterAppearance)
            .filter(CharacterAppearance.character_id == character_id)
            .count()
        )
        appearance = CharacterAppearance(
            character_id=character_id,
            appearance_index=next_index,
            description=payload.description,
            image_prompt=payload.image_prompt,
            image_url=payload.image_url,
        )
        self.db.add(appearance)
        self.db.commit()
        self.db.refresh(appearance)
        return appearance

    def _fetch(
        self, user_id: str, project_id: str, character_id: str, appearance_id: str
    ) -> CharacterAppearance:
        ensure_character(self.db, user_id, project_id, character_id)
        a = (
            self.db.query(CharacterAppearance)
            .filter(
                CharacterAppearance.id == appearance_id,
                CharacterAppearance.character_id == character_id,
            )
            .first()
        )
        if a is None:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Appearance not found"},
            )
        return a

    def update(
        self,
        user_id: str,
        project_id: str,
        character_id: str,
        appearance_id: str,
        payload: AppearanceUpdate,
    ) -> CharacterAppearance:
        a = self._fetch(user_id, project_id, character_id, appearance_id)
        apply_updates(a, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(a)
        return a

    def confirm_selection(
        self, user_id: str, project_id: str, character_id: str, appearance_id: str
    ) -> CharacterAppearance:
        self.db.query(CharacterAppearance).filter(
            CharacterAppearance.character_id == character_id
        ).update({CharacterAppearance.selected: False}, synchronize_session=False)
        a = self._fetch(user_id, project_id, character_id, appearance_id)
        a.selected = True
        self.db.commit()
        self.db.refresh(a)
        return a

    def select_image(
        self,
        user_id: str,
        project_id: str,
        character_id: str,
        appearance_id: str,
        image_url: str | None,
        image_media_id: str | None,
    ) -> CharacterAppearance:
        a = self._fetch(user_id, project_id, character_id, appearance_id)
        if image_url is not None:
            a.image_url = image_url
        if image_media_id is not None:
            a.image_media_id = image_media_id
        a.selected = True
        self.db.commit()
        self.db.refresh(a)
        return a
