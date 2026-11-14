from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class RiskWeights(BaseModel):
    rainfall: float = 0.25
    elevation: float = 0.20
    historical: float = 0.20
    drainage: float = 0.15
    water_level: float = 0.10
    vulnerability: float = 0.10

class ContributingFactors(BaseModel):
    rainfall_contribution: float
    elevation_contribution: float
    historical_contribution: float
    drainage_contribution: float
    water_level_contribution: float
    vulnerability_contribution: float

class ZoneRiskAssessment(BaseModel):
    zone_id: int
    name: str
    region: str
    centroid: List[float]
    population: int
    area_sq_km: float
    baseline_elevation_m: float
    flood_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_category: str  # "Low", "Moderate", "High", "Very High", "Critical"
    contributing_factors: ContributingFactors
    estimated_exposed_population: int
    recommended_priority: int  # 1 (Highest) to 5 (Routine)
    data_confidence: float = Field(..., ge=0.0, le=1.0)
    data_source: str = "IMD_GCC_SRTM_HYBRID"
    provenance: str = "MODEL_ESTIMATE"  # "OBSERVED", "HISTORICAL", "MODEL_ESTIMATE", "SIMULATED"
    imputed_features: List[str] = []
    notes: Optional[str] = None

class RiskEvaluationRequest(BaseModel):
    rainfall_intensity_mm: float = Field(120.0, ge=0.0, le=800.0)
    water_level_index: float = Field(0.5, ge=0.0, le=1.0)
    weights: Optional[RiskWeights] = None

class RiskSummaryResponse(BaseModel):
    total_zones: int
    average_risk_score: float
    category_counts: Dict[str, int]
    total_exposed_population: int
    critical_zones: List[str]
    provenance: str = "MODEL_ESTIMATE"
    zones: List[ZoneRiskAssessment]
