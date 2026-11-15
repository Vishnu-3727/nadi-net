"""
NADI-NET — Multi-Modal Waterway & Rescue Routing Schemas
Defines representations for navigable waterways, boat launch/recovery transfer hubs,
and multi-modal (road + water) route structures.
EPSG:4326 geospatial context. Waterway routes are explicitly flagged as SYNTHETIC_DEMO.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WaterwayNode(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    waterway: str
    node_type: str  # "WATER_INTERSECTION", "BOAT_LAUNCH_RAMP", "RECOVERY_POINT"
    road_node_transfer_id: Optional[str] = None
    transfer_time_min: float = 0.0
    status: str = "OPERATIONAL"  # "OPERATIONAL", "CLOSED", "HAZARDOUS"
    is_simulated: bool = True


class WaterwayEdge(BaseModel):
    id: str
    u: str
    v: str
    name: str
    waterway: str
    distance_km: float
    speed_limit_kmh: float
    min_required_depth_m: float
    max_permitted_current_mps: float
    current_depth_m: float
    current_flow_velocity_mps: float
    navigation_status: str = "OPERATIONAL"  # "OPERATIONAL", "RESTRICTED", "HAZARDOUS"
    is_simulated: bool = True


class WaterwayNetworkData(BaseModel):
    nodes: List[WaterwayNode]
    edges: List[WaterwayEdge]
    total_launch_points: int
    provenance: str = "SYNTHETIC_DEMO"
    warning: str


class TransferPoint(BaseModel):
    launch_id: str
    name: str
    road_node_id: str
    water_node_id: str
    transfer_time_min: float
    status: str
    equipment_required: List[str] = ["TRAILER", "WINCH"]
    is_simulated: bool = True


class MultiModalRouteStep(BaseModel):
    step_number: int
    mode: str  # "ROAD", "WATER", "TRANSFER"
    vehicle_or_craft: str
    start_node: str
    end_node: str
    edge_ids: List[str] = []
    distance_km: float
    duration_min: float
    description: str
    accessibility_status: str = "PASSABLE"
    restrictions: List[str] = []


class MultiModalRouteDetail(BaseModel):
    is_feasible: bool
    total_distance_km: float
    total_duration_min: float
    steps: List[MultiModalRouteStep] = []
    transfer_points_used: List[str] = []
    vehicles_used: List[str] = []
    route_summary: str
    provenance: str = "SYNTHETIC_DEMO"


class MultiModalRouteRequest(BaseModel):
    origin_node_id: str  # Can be road node (e.g. N15) or water node (W01)
    destination_node_id: str
    primary_vehicle_type: str = "RESCUE_4WD"
    watercraft_type: str = "INFLATABLE_MOTORBOAT"
    allow_waterway: bool = True
    blocked_edges: Optional[List[str]] = None
    conservative_safety: bool = True


class MultiModalRouteResponse(BaseModel):
    origin_node_id: str
    destination_node_id: str
    primary_route: MultiModalRouteDetail
    alternatives: List[MultiModalRouteDetail] = []
    unreachable_reason: Optional[str] = None
    provenance: str = "SYNTHETIC_DEMO"
