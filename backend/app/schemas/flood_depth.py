"""
NADI-NET — Flood-Depth Scenario & Physical Accessibility Schemas
Defines representations for road flood conditions, vehicle profiles, and physical accessibility decisions.
EPSG:4326 geospatial context. All scenario values are explicitly distinguished from real observations.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RoadFloodCondition(BaseModel):
    """
    Physical flood condition metadata for a single road edge segment.
    Explicitly tracks depth scenario ranges, flow velocity, and provenance.
    """
    edge_id: str
    flood_depth_min_m: Optional[float] = Field(None, ge=0.0, description="Lower bound scenario depth (m)")
    flood_depth_expected_m: Optional[float] = Field(None, ge=0.0, description="Expected scenario depth (m)")
    flood_depth_max_m: Optional[float] = Field(None, ge=0.0, description="Upper bound scenario depth (m)")
    depth_source: str = Field(
        "SCENARIO_ASSUMPTION",
        description="Source classification: SCENARIO_ASSUMPTION, SENSOR_OBSERVED, MANUAL_FIELD_REPORT, SYNTHETIC_INTERPOLATION, UNKNOWN"
    )
    depth_scenario_id: Optional[str] = Field(None, description="Associated scenario identifier (e.g., SCN-A, SCN-B, SCN-C)")
    is_simulated: bool = Field(True, description="True if value originates from a simulation or scenario assumption")
    confidence_or_reliability_label: str = Field(
        "SCENARIO_RANGE",
        description="Reliability indicator: HIGH, MEDIUM, LOW, UNVERIFIED, SCENARIO_RANGE"
    )
    flow_velocity_mps: Optional[float] = Field(None, ge=0.0, description="Water flow velocity in metres per second, if available")
    structural_restriction: Optional[str] = Field(
        None,
        description="Structural vulnerability: UNDERPASS, BRIDGE, CAUSEWAY, SUBWAY, or None"
    )
    manual_override: Optional[str] = Field(
        None,
        description="Manual operational override: FORCE_CLOSED, FORCE_OPEN, or None"
    )
    data_timestamp: Optional[str] = Field(None, description="ISO timestamp of measurement or scenario generation")
    provenance: str = Field("SCENARIO_INPUT", description="Data provenance attribution")


class VehicleProfile(BaseModel):
    """
    Configurable vehicle profile defining physical wading limits and operational constraints.
    Default parameters are documented demonstration assumptions.
    """
    vehicle_type: str = Field(..., description="Unique vehicle profile key")
    name: str = Field(..., description="Human-readable vehicle name")
    max_operating_depth_m: float = Field(..., ge=0.0, description="Maximum water wading depth (m)")
    max_flow_velocity_mps: Optional[float] = Field(None, ge=0.0, description="Maximum allowable water velocity (m/s)")
    prohibited_structures: List[str] = Field(default_factory=list, description="Structures prohibited for this vehicle (e.g. UNDERPASS)")
    road_class_restrictions: List[str] = Field(default_factory=list, description="Road types this vehicle cannot traverse")
    is_amphibious: bool = Field(False, description="Whether vehicle can operate on both land and water")
    is_watercraft: bool = Field(False, description="Whether vehicle is a boat/vessel requiring water")
    can_traverse_dry_roads: bool = Field(True, description="Whether vehicle can drive on dry pavement")
    operational_status: str = Field("AVAILABLE", description="AVAILABLE, MAINTENANCE, DEPLOYED, UNAVAILABLE")
    provenance: str = Field("ASSUMED_DEMONSTRATION_PARAMETER", description="Source of threshold parameters")


class EdgeAccessibilityResult(BaseModel):
    """
    Explainable accessibility evaluation result for an edge-vehicle pair.
    """
    edge_id: str
    status: str = Field(..., description="PASSABLE, RESTRICTED, BLOCKED, UNKNOWN")
    reason: str = Field(..., description="Human-explainable justification of decision")
    applicable_threshold_m: float = Field(..., description="Vehicle wading depth limit used in evaluation")
    actual_depth_m: Optional[float] = Field(None, description="Actual or expected scenario depth evaluated")
    flow_velocity_mps: Optional[float] = Field(None, description="Water flow velocity evaluated")
    source_classification: str = Field("SCENARIO_ASSUMPTION", description="Provenance of flood information")
    scenario_id: Optional[str] = None
    cost_multiplier: float = Field(1.0, ge=1.0, description="Routing impedance multiplier (1.0 = normal, >1.0 = slowed, inf = impassable)")
