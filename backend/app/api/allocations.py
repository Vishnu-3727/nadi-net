"""
NADI-NET — Allocations & Dynamic Replanning API
Supports dynamic event injection and minimal-disruption response re-optimisation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.replanning import ReplanningRequest, ReplanningResult
from backend.app.schemas.risk import ZoneRiskAssessment
from backend.app.services.resource_optimisation.replanner import replanner_service
from backend.app.services.resource_optimisation.allocator import resource_allocator
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/allocations", tags=["Allocations & Replanning"])


@router.post("/replan", response_model=ReplanningResult)
def execute_replanning(req: ReplanningRequest, db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id=req.scenario_id or "SCN-A")

    risk_zones_raw = state["risk_summary"]["zones"]
    assessed_zones = [ZoneRiskAssessment(**z) for z in risk_zones_raw]

    scenario_info = state.get("scenario", {})
    blocked_edges = state.get("blocked_edge_ids", [])

    teams_data = resource_allocator.teams_data
    shelters_data = resource_allocator.facilities_data.get("shelters", [])

    avail_food = scenario_info.get("available_food_packets", 5000)
    avail_water = scenario_info.get("available_drinking_water_litres", 12000)
    avail_med = scenario_info.get("available_medical_kits", 800)
    avail_boats = scenario_info.get("available_inflatable_boats", 12)

    try:
        result = replanner_service.replan(
            request=req,
            current_assessed_zones=assessed_zones,
            base_blocked_edges=blocked_edges,
            base_teams=teams_data,
            base_shelters=shelters_data,
            available_food=avail_food,
            available_water=avail_water,
            available_med=avail_med,
            available_boats=avail_boats,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replanning execution failed: {str(e)}")
