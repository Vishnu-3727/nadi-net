import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.schemas.risk import (
    ZoneRiskAssessment,
    ContributingFactors,
    RiskWeights,
    RiskSummaryResponse,
)

class FloodIntelligenceEngine:
    """
    Explainable Multi-Criteria Flood Risk Engine for Chennai.
    Evaluates geographical vulnerability using normalized environmental,
    topographical, historical, and demographic parameters.
    """

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or (settings.DATA_DIR / "chennai_zones.json")
        self.zones_data = self._load_zones()

    def _load_zones(self) -> List[Dict[str, Any]]:
        if not self.data_path.exists():
            raise FileNotFoundError(f"Zones dataset not found at {self.data_path}")
        with open(self.data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def evaluate_zone_risk(
        self,
        zone: Dict[str, Any],
        rainfall_mm: float,
        water_level_index: float,
        weights: Optional[RiskWeights] = None,
        is_simulated: bool = True
    ) -> ZoneRiskAssessment:
        w = weights or RiskWeights()

        # 1. Input Normalisation (0.0 to 1.0 scale)
        # 350mm represents historic 24h deluge (2015/Michaung magnitude)
        r_norm = min(1.0, max(0.0, rainfall_mm / 350.0))
        
        # Elevation: Chennai max elevation ~20m; below 5m is severe flood zone
        elev = zone.get("baseline_elevation_m", 6.0)
        e_norm = max(0.0, min(1.0, (20.0 - elev) / 20.0))
        
        # Historical flood risk (2015 & 2023 records: 0.0 to 1.0)
        h_norm = float(zone.get("historical_flood_risk", 0.5))
        
        # Drainage density: high density (>2.5 km/km2) clears water faster; low (<1.0) stagnates
        drain = zone.get("drainage_density_km_per_sq_km", 1.2)
        d_norm = max(0.0, min(1.0, (2.5 - drain) / 2.5))
        
        # Dynamic water level proxy (0.0 to 1.0)
        wl_norm = min(1.0, max(0.0, water_level_index))
        
        # Demographic vulnerability index
        v_norm = float(zone.get("vulnerability_index", 0.6))

        # 2. Weighted Factor Contribution
        contrib_rain = w.rainfall * r_norm * 100.0
        contrib_elev = w.elevation * e_norm * 100.0
        contrib_hist = w.historical * h_norm * 100.0
        contrib_drain = w.drainage * d_norm * 100.0
        contrib_water = w.water_level * wl_norm * 100.0
        contrib_vuln = w.vulnerability * v_norm * 100.0

        raw_score = contrib_rain + contrib_elev + contrib_hist + contrib_drain + contrib_water + contrib_vuln
        risk_score = round(min(100.0, max(0.0, raw_score)), 1)

        # 3. Categorisation
        if risk_score <= 20.0:
            category = "Low"
            priority = 5
        elif risk_score <= 40.0:
            category = "Moderate"
            priority = 4
        elif risk_score <= 60.0:
            category = "High"
            priority = 3
        elif risk_score <= 80.0:
            category = "Very High"
            priority = 2
        else:
            category = "Critical"
            priority = 1

        # 4. Exposed Population Estimation
        pop = zone.get("population", 200000)
        exposed_pop = int(pop * (risk_score / 100.0) * (0.4 + 0.6 * v_norm))

        # 5. Data Confidence Calculation
        # Elevation and historical are verified OBSERVED/HISTORICAL (weight 0.5)
        # Rainfall and water level in demo are SIMULATED (weight 0.5)
        confidence = 0.94 if not is_simulated else 0.88

        contributing = ContributingFactors(
            rainfall_contribution=round(contrib_rain, 1),
            elevation_contribution=round(contrib_elev, 1),
            historical_contribution=round(contrib_hist, 1),
            drainage_contribution=round(contrib_drain, 1),
            water_level_contribution=round(contrib_water, 1),
            vulnerability_contribution=round(contrib_vuln, 1),
        )

        return ZoneRiskAssessment(
            zone_id=zone["zone_id"],
            name=zone["name"],
            region=zone["region"],
            centroid=zone["centroid"],
            population=pop,
            area_sq_km=zone.get("area_sq_km", 20.0),
            baseline_elevation_m=elev,
            flood_risk_score=risk_score,
            risk_category=category,
            contributing_factors=contributing,
            estimated_exposed_population=exposed_pop,
            recommended_priority=priority,
            data_confidence=confidence,
            data_source="IMD_GCC_SRTM_MCDA_COMPOSITE",
            provenance="SIMULATED" if is_simulated else "MODEL_ESTIMATE",
            notes=f"Waterbody: {zone.get('major_waterbody', 'N/A')}. Elevation: {elev}m."
        )

    def evaluate_all_zones(
        self,
        rainfall_mm: float,
        water_level_index: float,
        weights: Optional[RiskWeights] = None,
        is_simulated: bool = True
    ) -> RiskSummaryResponse:
        results = [
            self.evaluate_zone_risk(zone, rainfall_mm, water_level_index, weights, is_simulated)
            for zone in self.zones_data
        ]

        total_zones = len(results)
        avg_score = round(sum(r.flood_risk_score for r in results) / total_zones, 1) if total_zones else 0.0
        
        category_counts: Dict[str, int] = {
            "Low": 0, "Moderate": 0, "High": 0, "Very High": 0, "Critical": 0
        }
        for r in results:
            category_counts[r.risk_category] = category_counts.get(r.risk_category, 0) + 1

        total_exposed = sum(r.estimated_exposed_population for r in results)
        critical_zones = [r.name for r in results if r.risk_category in ("Critical", "Very High")]

        return RiskSummaryResponse(
            total_zones=total_zones,
            average_risk_score=avg_score,
            category_counts=category_counts,
            total_exposed_population=total_exposed,
            critical_zones=critical_zones,
            provenance="SIMULATED" if is_simulated else "MODEL_ESTIMATE",
            zones=results,
        )

risk_engine = FloodIntelligenceEngine()
