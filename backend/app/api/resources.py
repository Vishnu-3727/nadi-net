from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.resources import OptimisationResult
from backend.app.services.resource_optimisation.allocator import resource_allocator
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/resources", tags=["Resource Management"])

@router.get("")
def get_resource_inventory(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")

    return {
        "teams": resource_allocator.teams_data,
        "active_scenario_stock": {
            "teams_available": state["scenario"].get("available_rescue_teams", 10),
            "boats_available": state["scenario"].get("available_inflatable_boats", 12),
            "food_packets": state["scenario"].get("available_food_packets", 5000),
            "water_litres": state["scenario"].get("available_drinking_water_litres", 12000),
            "medical_kits": state["scenario"].get("available_medical_kits", 800),
        },
        "provenance": "SIMULATED_RESOURCES"
    }

@router.get("/allocations", response_model=OptimisationResult)
def get_current_allocations(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    return state["allocations"]

@router.post("/optimise", response_model=OptimisationResult)
def run_optimisation(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    
    # Rerun allocator on current state
    risk_zones = state["risk_summary"]["zones"]
    # Re-evaluate
    from backend.app.schemas.risk import ZoneRiskAssessment
    zones_objs = [ZoneRiskAssessment(**z) for z in risk_zones]

    res = resource_allocator.optimize_allocation(
        assessed_zones=zones_objs,
        available_team_count=state["scenario"].get("available_rescue_teams", 10),
        blocked_edge_ids=state["blocked_edge_ids"],
        available_food_packets=state["scenario"].get("available_food_packets", 5000),
        available_water_litres=state["scenario"].get("available_drinking_water_litres", 12000),
        available_medical_kits=state["scenario"].get("available_medical_kits", 800),
        available_boats=state["scenario"].get("available_inflatable_boats", 12),
    )
    state["allocations"] = res.dict()
    return res
