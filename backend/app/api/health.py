from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database.session import get_db
from backend.app.core.config import settings

router = APIRouter(tags=["System"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_ok else "unreachable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "offline_demo_ready": True
    }

@router.get("/system/status")
def system_status():
    return {
        "system": settings.PROJECT_NAME,
        "mode": "DISASTER_OPERATIONS_OFFLINE_READY",
        "modules": {
            "flood_intelligence": "ACTIVE (MCDA AHP)",
            "geospatial_intelligence": "ACTIVE (Chennai Vector)",
            "rescue_routing": "ACTIVE (NetworkX Dijkstra/Yen)",
            "resource_optimisation": "ACTIVE (Google OR-Tools MILP)",
            "scenario_simulator": "ACTIVE (Dynamic State Propagation)"
        },
        "target_city": "Chennai, Tamil Nadu, India",
        "provenance_standards": {
            "OBSERVED": "Physical infrastructure, hospitals, road nodes, elevation",
            "HISTORICAL": "2015 & 2023 Michaung flood vulnerability scores",
            "MODEL_ESTIMATE": "Calculated risk scores, routing paths, optimal team allocations",
            "SIMULATED": "Emergency scenario rainfall, water level index, road blockages"
        }
    }
