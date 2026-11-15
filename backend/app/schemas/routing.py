from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class RouteRequest(BaseModel):
    origin_node_id: str
    destination_node_id: str
    vehicle_type: str = "NORMAL_RESCUE"  # "NORMAL_RESCUE", "HIGH_CLEARANCE", "AMPHIBIOUS_BOAT", "AMBULANCE_STANDARD", "RESCUE_4WD", "HEAVY_CLEARANCE_TRUCK", "AMPHIBIOUS_CRAFT", "INFLATABLE_MOTORBOAT"
    avoid_blocked_edges: bool = True
    blocked_edges_override: Optional[List[str]] = None
    conservative_unknown: bool = True

class RouteNodeStep(BaseModel):
    node_id: str
    name: str
    lat: float
    lon: float

class RouteEdgeStep(BaseModel):
    edge_id: str
    name: str
    distance_km: float
    speed_limit_kmh: float
    travel_time_min: float
    road_type: str
    flood_susceptibility: float
    is_blocked: bool

class RouteDetail(BaseModel):
    is_feasible: bool
    total_distance_km: float
    estimated_travel_time_min: float
    nodes: List[RouteNodeStep]
    edges: List[RouteEdgeStep]
    blocked_segments_encountered: List[str]
    selection_rationale: str
    vehicle_compatibility: str
    provenance: str = "MODEL_ESTIMATE"
    accessibility_summary: Optional[Dict[str, int]] = None

class RouteAlternative(BaseModel):
    rank: int
    route_name: str
    total_distance_km: float
    estimated_travel_time_min: float
    nodes: List[RouteNodeStep]
    edges: List[RouteEdgeStep]
    difference_reason: str

class RouteResponse(BaseModel):
    origin_node_id: str
    destination_node_id: str
    primary_route: RouteDetail
    alternatives: List[RouteAlternative] = []
    unreachable_reason: Optional[str] = None
    rejected_alternatives_reasons: List[str] = []
