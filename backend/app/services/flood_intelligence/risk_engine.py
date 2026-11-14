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
    Explainable Multi-Criteria Flood Risk Engine for Chennai (AHP MCDA).
    
    IMPORTANT SCIENTIFIC STATEMENT:
    This model is a deterministic Multi-Criteria Decision Analysis (MCDA) model,
    NOT a trained black-box machine learning model. It evaluates vulnerability using
    mathematically normalized environmental, elevation, drainage, and historical records.
    """

    # Macro-regional baseline defaults for missing value imputation
    DEFAULT_ELEVATION_M = 6.5
    DEFAULT_HISTORICAL_RISK = 0.50
    DEFAULT_DRAINAGE_DENSITY = 1.20
    DEFAULT_VULNERABILITY = 0.60
    DEFAULT_POPULATION = 200000

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or (settings.DATA_DIR / "chennai_zones.json")
        self.zones_data = self._load_zones()

    def _load_zones(self) -> List[Dict[str, Any]]:
        if not self.data_path.exists():
            raise FileNotFoundError(f"Zones dataset not found at {self.data_path}")
        with open(self.data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, dict) and "zones" in raw:
            return raw["zones"]
        return raw

    def evaluate_zone_risk(
        self,
        zone: Dict[str, Any],
        rainfall_mm: float,
        water_level_index: float,
        weights: Optional[RiskWeights] = None,
        is_simulated: bool = True
    ) -> ZoneRiskAssessment:
        w = weights or RiskWeights()
        imputed_features: List[str] = []

        # 1. Feature Normalisation & Missing Data Handling
        
        # Rainfall: clamp between 0.0 and 800.0 mm
        clamped_rain = max(0.0, min(800.0, float(rainfall_mm)))
        r_norm = min(1.0, clamped_rain / 350.0)

        # Elevation (SRTM): handle missing or non-positive values
        raw_elev = zone.get("baseline_elevation_m")
        if raw_elev is None or raw_elev <= 0:
            elev = self.DEFAULT_ELEVATION_M
            imputed_features.append("baseline_elevation_m")
        else:
            elev = float(raw_elev)
        # Normalisation: lower elevation (towards sea level) = higher vulnerability
        e_norm = max(0.0, min(1.0, (20.0 - elev) / 20.0))

        # Historical flood risk: handle missing
        raw_hist = zone.get("historical_flood_risk")
        if raw_hist is None or not (0.0 <= raw_hist <= 1.0):
            hist = self.DEFAULT_HISTORICAL_RISK
            imputed_features.append("historical_flood_risk")
        else:
            hist = float(raw_hist)
        h_norm = hist

        # Drainage density: handle missing
        raw_drain = zone.get("drainage_density_km_per_sq_km")
        if raw_drain is None or raw_drain <= 0:
            drain = self.DEFAULT_DRAINAGE_DENSITY
            imputed_features.append("drainage_density_km_per_sq_km")
        else:
            drain = float(raw_drain)
        # Lower density (< 1.0) = slower runoff evacuation = higher risk
        d_norm = max(0.0, min(1.0, (2.5 - drain) / 2.5))

        # Water level proxy: clamp between 0.0 and 1.0
        wl_norm = max(0.0, min(1.0, float(water_level_index)))

        # Demographic vulnerability index
        raw_vuln = zone.get("vulnerability_index")
        if raw_vuln is None or not (0.0 <= raw_vuln <= 1.0):
            vuln = self.DEFAULT_VULNERABILITY
            imputed_features.append("vulnerability_index")
        else:
            vuln = float(raw_vuln)
        v_norm = vuln

        # 2. Weighted Factor Contribution Breakdown
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

        # 4. Population Exposure Calculation
        pop = int(zone.get("population") or self.DEFAULT_POPULATION)
        exposed_pop = int(pop * (risk_score / 100.0) * (0.4 + 0.6 * v_norm))

        # 5. Data Confidence Calculation
        # Base confidence: 0.96 for complete verified records
        # Deduct 0.08 if simulated scenario inputs
        # Deduct 0.15 for each imputed missing feature
        confidence = 0.96
        if is_simulated:
            confidence -= 0.08
        confidence -= (len(imputed_features) * 0.15)
        confidence = round(max(0.10, min(1.0, confidence)), 2)

        contributing = ContributingFactors(
            rainfall_contribution=round(contrib_rain, 1),
            elevation_contribution=round(contrib_elev, 1),
            historical_contribution=round(contrib_hist, 1),
            drainage_contribution=round(contrib_drain, 1),
            water_level_contribution=round(contrib_water, 1),
            vulnerability_contribution=round(contrib_vuln, 1),
        )

        provenance = "SIMULATED" if is_simulated else "MODEL_ESTIMATE"

        return ZoneRiskAssessment(
            zone_id=zone["zone_id"],
            name=zone["name"],
            region=zone["region"],
            centroid=zone["centroid"],
            population=pop,
            area_sq_km=float(zone.get("area_sq_km", 20.0)),
            baseline_elevation_m=elev,
            flood_risk_score=risk_score,
            risk_category=category,
            contributing_factors=contributing,
            estimated_exposed_population=exposed_pop,
            recommended_priority=priority,
            data_confidence=confidence,
            data_source="IMD_GCC_SRTM_MCDA_COMPOSITE",
            provenance=provenance,
            imputed_features=imputed_features,
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
