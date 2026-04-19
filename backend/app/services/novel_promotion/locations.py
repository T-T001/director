from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.novel_promotion import LocationImage, NovelPromotionLocation
from app.schemas.novel_promotion.entities import LocationCreate, LocationUpdate
from app.services.novel_promotion.common import (
    apply_updates,
    ensure_location,
    ensure_np_project,
)


class LocationService:
    def __init__(self, db: Session):
        self.db = db

    def list_(self, user_id: str, project_id: str) -> list[NovelPromotionLocation]:
        np = ensure_np_project(self.db, user_id, project_id)
        return (
            self.db.query(NovelPromotionLocation)
            .filter(NovelPromotionLocation.np_project_id == np.id)
            .order_by(NovelPromotionLocation.created_at.asc())
            .all()
        )

    def create(
        self, user_id: str, project_id: str, payload: LocationCreate
    ) -> NovelPromotionLocation:
        np = ensure_np_project(self.db, user_id, project_id)
        loc = NovelPromotionLocation(
            np_project_id=np.id, name=payload.name.strip(), summary=payload.summary
        )
        self.db.add(loc)
        self.db.commit()
        self.db.refresh(loc)
        return loc

    def update(
        self, user_id: str, project_id: str, location_id: str, payload: LocationUpdate
    ) -> NovelPromotionLocation:
        loc = ensure_location(self.db, user_id, project_id, location_id)
        apply_updates(loc, payload.model_dump(exclude_unset=True))
        self.db.commit()
        self.db.refresh(loc)
        return loc

    def delete(self, user_id: str, project_id: str, location_id: str) -> None:
        loc = ensure_location(self.db, user_id, project_id, location_id)
        self.db.delete(loc)
        self.db.commit()

    def select_image(
        self, user_id: str, project_id: str, location_id: str, image_id: str
    ) -> NovelPromotionLocation:
        loc = ensure_location(self.db, user_id, project_id, location_id)
        img = (
            self.db.query(LocationImage)
            .filter(LocationImage.id == image_id, LocationImage.location_id == location_id)
            .first()
        )
        if img is None:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Location image not found"},
            )
        loc.selected_image_id = img.id
        self.db.commit()
        self.db.refresh(loc)
        return loc
