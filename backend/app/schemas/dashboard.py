from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class MetricCard(BaseModel):
    label: str
    value: str | int | float
    subtext: str
    status: str  # "normal", "warning", "critical", "good"
    provenance: str  # "OBSERVED", "MODEL_ESTIMATE", "SIMULATED"

class HighPriorityAlert(BaseModel):
    id: str
    zone_id: int
    zone_name: str
    severity: str
    message: str
    timestamp: str
    action_required: str
    provenance: str

class ActivityFeedItem(BaseModel):
    id: int
    timestamp: str
    action_type: str
    severity: str
    message: str
    provenance: str

class CommandCenterOverview(BaseModel):
    active_scenario_id: str
    active_scenario_name: str
    active_severity: str
    metrics: List[MetricCard]
    alerts: List[HighPriorityAlert]
    recent_activities: List[ActivityFeedItem]
    hospital_readiness_pct: float
    total_blocked_roads: int
    provenance_summary: Dict[str, str]
