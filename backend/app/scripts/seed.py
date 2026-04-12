from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.db import SessionLocal, engine
from app.core.security import hash_password
from app.db.base import Base
from app.db.models.user import User, UserPreference

settings = get_settings()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.director_seed_username).first()
        if user is None:
            user = User(
                username=settings.director_seed_username,
                email=settings.director_seed_email,
                password_hash=hash_password(settings.director_seed_password),
            )
            db.add(user)
            db.flush()
            db.add(UserPreference(user_id=user.id))
            db.commit()
            print(f"Seeded user: {user.username}")
        else:
            print(f"Seed user already exists: {user.username}")
    except IntegrityError:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
