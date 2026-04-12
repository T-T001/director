from fastapi import APIRouter

from app.api.routes import auth, episodes, projects, runs, settings, sse

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(episodes.router)
api_router.include_router(settings.router)
api_router.include_router(runs.router)
api_router.include_router(sse.router)
