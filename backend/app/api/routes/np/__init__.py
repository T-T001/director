from fastapi import APIRouter

from app.api.routes.np.analyze import router as analyze_router
from app.api.routes.np.characters import router as characters_router
from app.api.routes.np.episodes import router as episodes_router
from app.api.routes.np.locations import router as locations_router
from app.api.routes.np.media import router as media_router
from app.api.routes.np.projects import router as projects_router
from app.api.routes.np.storyboards import router as storyboards_router
from app.api.routes.np.voice import router as voice_router

router = APIRouter(prefix="/novel-promotion", tags=["novel-promotion"])

# Order matters only for overlap; FastAPI picks first match. Our paths are disjoint.
router.include_router(projects_router)
router.include_router(episodes_router)
router.include_router(characters_router)
router.include_router(locations_router)
router.include_router(storyboards_router)
router.include_router(voice_router)
router.include_router(analyze_router)
router.include_router(media_router)
