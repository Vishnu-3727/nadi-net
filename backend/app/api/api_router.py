from fastapi import APIRouter

from backend.app.api.health import router as health_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.risk import router as risk_router
from backend.app.api.map import router as map_router
from backend.app.api.routing import router as routing_router
from backend.app.api.resources import router as resources_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.history import router as history_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(dashboard_router)
api_router.include_router(risk_router)
api_router.include_router(map_router)
api_router.include_router(routing_router)
api_router.include_router(resources_router)
api_router.include_router(scenarios_router)
api_router.include_router(history_router)
