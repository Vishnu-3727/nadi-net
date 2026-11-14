from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.risk import RiskEvaluationRequest, RiskSummaryResponse, ZoneRiskAssessment
from backend.app.services.flood_intelligence.risk_engine import risk_engine
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/risk", tags=["Flood Intelligence"])

@router.get("/zones", response_model=RiskSummaryResponse)
def get_risk_zones(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    return state["risk_summary"]

@router.get("/zones/{zone_id}", response_model=ZoneRiskAssessment)
def get_zone_by_id(zone_id: int, db: Session = Depends(get_db)):
    zones_resp = get_risk_zones(db)
    zones_list = zones_resp["zones"] if isinstance(zones_resp, dict) else zones_resp.zones
    for z in zones_list:
        zid = z["zone_id"] if isinstance(z, dict) else z.zone_id
        if zid == zone_id:
            return z
    raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found in Chennai risk registry.")

@router.post("/evaluate", response_model=RiskSummaryResponse)
def evaluate_custom_risk(req: RiskEvaluationRequest):
    return risk_engine.evaluate_all_zones(
        rainfall_mm=req.rainfall_intensity_mm,
        water_level_index=req.water_level_index,
        weights=req.weights,
        is_simulated=True
    )
