"""
NADI-NET — Dynamic Replanning & Critical-Link Restoration Schemas
Defines event models, replanning inputs/outputs, and infrastructure restoration ranking metrics.
EPSG:4326 geospatial context.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.resources import (
    TeamAssignment,
    UnmetDestination,
    ShelterAssignment,
    ZoneEvacuationStatus,
    ResourceStockSchema,
)


class DisruptionEvent(BaseModel):
    """
    Standardized operational event model for dynamic replanning.
    """
    event_id: str
    timestamp: str
    event_type: str = Field(
        ...,
        description="ROAD_BLOCKED, ROAD_REOPENED, TEAM_UNAVAILABLE, TEAM_AVAILABLE, "
                    "SHELTER_CLOSED, SHELTER_REOPENED, SHELTER_CAPACITY_CHANGED, "
                    "INVENTORY_CHANGED, NEW_EMERGENCY_ZONE, ZONE_DEMAND_UPDATED"
    )
    affected_entity_id: str = Field(..., description="ID of affected road, team, shelter, or zone")
    previous_state: Optional[Any] = None
    new_state: Optional[Any] = None
    source: str = Field("FIELD_COMMAND", description="Event source attribution")
    description: str = Field(..., description="Human-readable description of operational event")


class ReplanningRequest(BaseModel):
    """
    Input payload for dynamic response replanning.
    """
    scenario_id: str = "SCN-A"
    events: List[DisruptionEvent]
    active_assignments: List[TeamAssignment] = []
    completed_team_ids: List[str] = Field(default_factory=list, description="Teams with completed missions (preserved)")
    evacuated_persons_count: int = Field(0, ge=0, description="Evacuees already safely delivered (not double-counted)")


class ReplanningResult(BaseModel):
    """
    Output payload of the minimal-disruption replanning engine.
    """
    status: str  # "OPTIMAL", "FEASIBLE", "NO_CHANGE_NEEDED"
    solver_used: str = "Google_OR_Tools_CBC_MILP"
    preserved_assignments: List[TeamAssignment] = []
    new_assignments: List[TeamAssignment] = []
    cancelled_assignments: List[TeamAssignment] = []
    active_assignments: List[TeamAssignment] = []
    updated_unmet_destinations: List[UnmetDestination] = []
    shelter_assignments: List[ShelterAssignment] = []
    remaining_stock: ResourceStockSchema
    replanning_summary: str
    events_processed: int
    execution_time_ms: float
    provenance: str = "MODEL_ESTIMATE"


class CriticalLinkScore(BaseModel):
    """
    Multi-criteria restoration metrics for a blocked road segment.
    All scores are explicit, transparent, and separate.
    """
    edge_id: str
    edge_name: str
    restoration_rank: int
    marginal_benefit_score: float
    population_accessible_gained: int
    priority_weighted_demand_reached: float
    hospitals_reconnected: int
    shelters_reconnected: int
    travel_time_saved_min: float
    components_reduced: int
    restoration_justification: str
    provenance: str = "TOPOLOGICAL_ANALYSIS"


class CriticalLinksResponse(BaseModel):
    total_blocked_links: int
    ranked_links: List[CriticalLinkScore]
    evaluation_scenario: str
    provenance: str = "TOPOLOGICAL_ANALYSIS"
