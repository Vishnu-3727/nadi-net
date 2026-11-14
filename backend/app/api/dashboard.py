from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db
from backend.app.models.database import ScenarioRunRecord, ActivityLogRecord
from backend.app.schemas.dashboard import CommandCenterOverview, MetricCard, HighPriorityAlert, ActivityFeedItem
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview", response_model=CommandCenterOverview)
def get_dashboard_overview(db: Session = Depends(get_db)):
    # If no simulation run yet, run default Scenario A
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")

    scn = state["scenario"]
    risk = state["risk_summary"]
    alloc = state["allocations"]
    facilities = state["facilities"]
    blocked = state["blocked_edge_ids"]

    # Metric Cards
    metrics = [
        MetricCard(
            label="Emergency Severity",
            value=scn.get("severity", "MODERATE"),
            subtext=f"{scn.get('name', 'Active Scenario')}",
            status="critical" if scn.get("severity") == "CRITICAL" else ("warning" if scn.get("severity") == "SEVERE" else "normal"),
            provenance="SIMULATED"
        ),
        MetricCard(
            label="Total Affected Locations",
            value=f"{risk.get('total_zones', 15)} GCC Zones",
            subtext=f"{risk.get('category_counts', {}).get('Critical', 0)} Critical, {risk.get('category_counts', {}).get('Very High', 0)} Very High",
            status="critical" if risk.get('category_counts', {}).get('Critical', 0) > 0 else "warning",
            provenance="MODEL_ESTIMATE"
        ),
        MetricCard(
            label="Exposed Population",
            value=f"{risk.get('total_exposed_population', 0):,}",
            subtext="Estimated residents in vulnerable flood perimeters",
            status="critical" if risk.get('total_exposed_population', 0) > 400000 else "warning",
            provenance="MODEL_ESTIMATE"
        ),
        MetricCard(
            label="Active Rescue Teams",
            value=f"{alloc.get('total_assigned_teams', 0)} / {scn.get('available_rescue_teams', 10)} Assigned",
            subtext=f"{alloc.get('unmet_zones_count', 0)} Unmet priority zones ({alloc.get('total_unassigned_teams', 0)} in reserve)",
            status="good" if alloc.get('unmet_zones_count', 0) == 0 else "warning",
            provenance="MODEL_ESTIMATE"
        ),
        MetricCard(
            label="Blocked Road Segments",
            value=f"{len(blocked)} Critical Corridors",
            subtext="Adyar & Kosasthalaiyar river crossings",
            status="critical" if len(blocked) >= 4 else ("warning" if len(blocked) > 0 else "good"),
            provenance="SIMULATED"
        ),
        MetricCard(
            label="Accessible Hospitals",
            value=f"{facilities.get('operational_hospitals', 0)} / {facilities.get('total_hospitals', 8)} Operational",
            subtext=f"{facilities.get('readiness_percentage', 100)}% Readiness index",
            status="good" if facilities.get('readiness_percentage', 100) >= 80 else "warning",
            provenance="MODEL_ESTIMATE"
        ),
    ]

    # Alerts for Critical and Very High zones
    alerts = []
    for z in risk.get("zones", []):
        if z.get("risk_category") in ("Critical", "Very High"):
            alerts.append(HighPriorityAlert(
                id=f"ALT-{z['zone_id']}",
                zone_id=z["zone_id"],
                zone_name=z["name"],
                severity=z["risk_category"],
                message=f"High inundation danger. Risk Score: {z['flood_risk_score']}/100. Priority {z['recommended_priority']} evacuation required.",
                timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                action_required="Deploy high-clearance truck / motorboat rescue team",
                provenance="MODEL_ESTIMATE"
            ))

    # Activity feed from DB
    db_activities = db.query(ActivityLogRecord).order_by(desc(ActivityLogRecord.timestamp)).limit(6).all()
    recent = []
    for a in db_activities:
        recent.append(ActivityFeedItem(
            id=a.id,
            timestamp=a.timestamp.strftime("%H:%M:%S"),
            action_type=a.action_type,
            severity=a.severity,
            message=a.message,
            provenance=a.provenance
        ))

    return CommandCenterOverview(
        active_scenario_id=scn["id"],
        active_scenario_name=scn["name"],
        active_severity=scn["severity"],
        metrics=metrics,
        alerts=alerts,
        recent_activities=recent,
        hospital_readiness_pct=facilities.get("readiness_percentage", 100.0),
        total_blocked_roads=len(blocked),
        provenance_summary=state["provenance_map"]
    )

@router.get("/alerts")
def get_dashboard_alerts(db: Session = Depends(get_db)):
    overview = get_dashboard_overview(db)
    return {"alerts": overview.alerts, "count": len(overview.alerts)}
