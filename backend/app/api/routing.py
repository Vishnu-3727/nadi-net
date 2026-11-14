from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.routing import RouteRequest, RouteResponse
from backend.app.services.routing.rescue_router import rescue_router
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/routing", tags=["Rescue Routing"])

@router.post("/route", response_model=RouteResponse)
def calculate_route(req: RouteRequest, db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    
    active_blocked = state.get("blocked_edge_ids", [])
    try:
        return rescue_router.compute_route(req, active_blocked)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/alternatives", response_model=RouteResponse)
def calculate_alternatives(req: RouteRequest, db: Session = Depends(get_db)):
    return calculate_route(req, db)
