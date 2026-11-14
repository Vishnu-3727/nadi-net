from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class RescueTeamSchema(BaseModel):
    id: str
    name: str
    agency: str
    base_id: str
    base_node_id: str
    personnel_count: int
    vehicle_type: str
    equipment: List[str]
    capacity_persons_per_trip: int
    speed_kmh: float
    status: str  # "AVAILABLE", "ASSIGNED", "EN_ROUTE", "UNAVAILABLE"
    specialty: str
    provenance: str = "OBSERVED"

class ResourceStockSchema(BaseModel):
    available_rescue_teams: int
    available_inflatable_boats: int
    available_food_packets: int
    available_drinking_water_litres: int
    available_medical_kits: int
    allocated_food_packets: int = 0
    allocated_water_litres: int = 0
    allocated_medical_kits: int = 0
    allocated_boats: int = 0
    provenance: str = "SIMULATED"

class TeamAssignment(BaseModel):
    team_id: str
    team_name: str
    agency: str
    assigned_zone_id: int
    assigned_zone_name: str
    destination_node_id: str
    zone_priority: int
    risk_score: float
    route_distance_km: float
    estimated_arrival_time_min: float
    vehicle_used: str
    allocated_supplies: Dict[str, int]
    route_nodes: List[str]
    assignment_justification: str

class UnmetDestination(BaseModel):
    zone_id: int
    zone_name: str
    priority: int
    risk_score: float
    estimated_exposed_population: int
    deficit_reason: str

class OptimisationResult(BaseModel):
    status: str  # "OPTIMAL", "FEASIBLE", "INFEASIBLE"
    solver_used: str = "Google_OR_Tools_CBC_MILP"
    total_assigned_teams: int
    total_unassigned_teams: int
    total_served_zones: int
    unmet_zones_count: int
    objective_value: float
    assignments: List[TeamAssignment]
    unmet_destinations: List[UnmetDestination]
    remaining_stock: ResourceStockSchema
    provenance: str = "MODEL_ESTIMATE"
    execution_time_ms: float
