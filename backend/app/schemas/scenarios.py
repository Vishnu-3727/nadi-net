from typing import List, Optional
from pydantic import BaseModel, Field

class ScenarioBase(BaseModel):
    id: str
    name: str
    severity: str
    rainfall_intensity_mm: float
    water_level_index: float
    description: str
    blocked_edge_ids: List[str]
    available_rescue_teams: int
    available_inflatable_boats: int
    available_food_packets: int
    available_drinking_water_litres: int
    available_medical_kits: int
    provenance: str = "SIMULATED"

class ScenarioCreateOrUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[str] = None
    rainfall_intensity_mm: Optional[float] = Field(None, ge=0.0, le=800.0)
    water_level_index: Optional[float] = Field(None, ge=0.0, le=1.0)
    description: Optional[str] = None
    blocked_edge_ids: Optional[List[str]] = None
    available_rescue_teams: Optional[int] = Field(None, ge=1, le=50)
    available_inflatable_boats: Optional[int] = Field(None, ge=0, le=100)
    available_food_packets: Optional[int] = Field(None, ge=0)
    available_drinking_water_litres: Optional[int] = Field(None, ge=0)
    available_medical_kits: Optional[int] = Field(None, ge=0)

class SimulationComparison(BaseModel):
    scenario_id: str
    rainfall_delta_mm: float
    water_level_delta: float
    exposed_population_delta: int
    critical_zones_delta: int
    blocked_roads_delta: int
    assigned_teams_delta: int
