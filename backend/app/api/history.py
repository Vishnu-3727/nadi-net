from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db
from backend.app.models.database import ScenarioRunRecord, ActivityLogRecord

router = APIRouter(prefix="/history", tags=["History & Auditing"])

@router.get("")
def list_history_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(ScenarioRunRecord).order_by(desc(ScenarioRunRecord.created_at)).limit(limit).all()
    return {
        "total": len(runs),
        "runs": [
            {
                "run_id": r.id,
                "scenario_name": r.scenario_name,
                "severity": r.severity,
                "rainfall_mm": r.rainfall_intensity_mm,
                "water_level": r.water_level_index,
                "timestamp": r.created_at.isoformat() if r.created_at else None,
                "affected_zones": r.total_affected_zones,
                "critical_zones": r.critical_zones_count,
                "exposed_population": r.estimated_exposed_population,
                "assigned_teams": r.assigned_teams_count,
                "blocked_roads": r.blocked_roads_count,
                "notes": r.notes
            }
            for r in runs
        ]
    }

@router.get("/{run_id}")
def get_history_run_detail(run_id: str, db: Session = Depends(get_db)):
    r = db.query(ScenarioRunRecord).filter(ScenarioRunRecord.id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Run record '{run_id}' not found.")
    return {
        "run_id": r.id,
        "scenario_name": r.scenario_name,
        "severity": r.severity,
        "rainfall_mm": r.rainfall_intensity_mm,
        "water_level": r.water_level_index,
        "timestamp": r.created_at.isoformat() if r.created_at else None,
        "metrics": {
            "affected_zones": r.total_affected_zones,
            "critical_zones": r.critical_zones_count,
            "exposed_population": r.estimated_exposed_population,
            "assigned_teams": r.assigned_teams_count,
            "blocked_roads": r.blocked_roads_count,
            "operational_hospitals": r.operational_hospitals_count
        },
        "zone_assessments": r.zone_assessments_json,
        "allocations": r.allocations_json,
        "blocked_edges": r.blocked_edges_json,
        "notes": r.notes
    }
