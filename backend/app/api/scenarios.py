from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.scenarios import ScenarioCreateOrUpdate
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("")
def list_scenarios():
    return {
        "scenarios": simulator_service.list_scenarios(),
        "active_scenario_id": simulator_service.active_scenario_id
    }

@router.get("/{scenario_id}")
def get_scenario(scenario_id: str):
    scn = simulator_service.get_scenario(scenario_id)
    if not scn:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return scn

@router.post("/{scenario_id}/simulate")
def simulate_scenario(
    scenario_id: str,
    override: ScenarioCreateOrUpdate = None,
    db: Session = Depends(get_db)
):
    custom_dict = override.dict(exclude_none=True) if override else None
    result = simulator_service.run_simulation(db, scenario_id=scenario_id, custom_params=custom_dict)
    return {
        "status": "success",
        "message": f"Simulation executed for scenario {scenario_id}",
        "data": result
    }

@router.post("/{scenario_id}/reset")
def reset_scenario(db: Session = Depends(get_db)):
    result = simulator_service.reset_to_default(db)
    return {
        "status": "success",
        "message": "Scenario reset to default baseline (Scenario A - Moderate).",
        "data": result
    }
