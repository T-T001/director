from fastapi import APIRouter

from app.api.routes import (
    assets,
    auth,
    episodes,
    media,
    model_gateway,
    projects,
    runs,
    settings,
    sse,
    storyboards,
    tasks,
)
from app.api.routes.np import router as np_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(episodes.router)
api_router.include_router(settings.router)
api_router.include_router(assets.router)
api_router.include_router(tasks.router)
api_router.include_router(runs.router)
api_router.include_router(storyboards.router)
api_router.include_router(sse.router)
api_router.include_router(model_gateway.router)
api_router.include_router(media.router)
api_router.include_router(np_router)
