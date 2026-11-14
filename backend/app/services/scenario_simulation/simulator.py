import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.database import ScenarioRunRecord, ActivityLogRecord, StoredScenarioRecord
from backend.app.schemas.risk import RiskSummaryResponse
from backend.app.schemas.resources import OptimisationResult
from backend.app.services.flood_intelligence.risk_engine import risk_engine
from backend.app.services.geospatial.geo_service import geo_service
from backend.app.services.resource_optimisation.allocator import resource_allocator

class ScenarioSimulatorService:
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.scenarios_list = self._load_scenarios()
        self.scenarios_by_id = {s["id"]: s for s in self.scenarios_list}
        self.active_scenario_id = "SCN-A"
        self.active_state_cache: Optional[Dict[str, Any]] = None

    def _load_scenarios(self) -> List[Dict[str, Any]]:
        path = self.data_dir / "scenarios.json"
        if not path.exists():
            raise FileNotFoundError(f"Scenarios data not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_scenarios(self) -> List[Dict[str, Any]]:
        return self.scenarios_list

    def get_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        return self.scenarios_by_id.get(scenario_id)

    def run_simulation(
        self,
        db: Session,
        scenario_id: Optional[str] = None,
        custom_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        target_id = scenario_id or self.active_scenario_id
        base_scenario = dict(self.scenarios_by_id.get(target_id, self.scenarios_list[0]))

        # Apply custom parameter overrides if provided
        if custom_params:
            for k, v in custom_params.items():
                if v is not None:
                    base_scenario[k] = v

        self.active_scenario_id = base_scenario["id"]

        rainfall = float(base_scenario["rainfall_intensity_mm"])
        water_level = float(base_scenario["water_level_index"])
        blocked_edges = list(base_scenario.get("blocked_edge_ids", []))
        teams_count = int(base_scenario.get("available_rescue_teams", 10))
        food_packs = int(base_scenario.get("available_food_packets", 5000))
        water_litres = int(base_scenario.get("available_drinking_water_litres", 12000))
        med_kits = int(base_scenario.get("available_medical_kits", 800))
        boats = int(base_scenario.get("available_inflatable_boats", 12))

        # 1. Run Flood Intelligence Engine
        risk_summary: RiskSummaryResponse = risk_engine.evaluate_all_zones(
            rainfall_mm=rainfall,
            water_level_index=water_level,
            is_simulated=True
        )

        zone_risk_dict = {z.zone_id: z.risk_category for z in risk_summary.zones}

        # 2. Update Facility Accessibility
        facility_status = geo_service.evaluate_facility_accessibility(
            blocked_edge_ids=blocked_edges,
            zone_risk_dict=zone_risk_dict
        )

        # 3. Run Google OR-Tools Resource Allocation Engine
        alloc_result: OptimisationResult = resource_allocator.optimize_allocation(
            assessed_zones=risk_summary.zones,
            available_team_count=teams_count,
            blocked_edge_ids=blocked_edges,
            available_food_packets=food_packs,
            available_water_litres=water_litres,
            available_medical_kits=med_kits,
            available_boats=boats
        )

        # 4. Generate Aggregated Command Centre Metrics
        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        critical_count = risk_summary.category_counts.get("Critical", 0) + risk_summary.category_counts.get("Very High", 0)
        
        # 5. Persist run record and log to database
        now_utc = datetime.now(timezone.utc)
        db_run = ScenarioRunRecord(
            id=run_id,
            scenario_name=base_scenario["name"],
            severity=base_scenario["severity"],
            rainfall_intensity_mm=rainfall,
            water_level_index=water_level,
            created_at=now_utc,
            total_affected_zones=risk_summary.total_zones,
            critical_zones_count=critical_count,
            estimated_exposed_population=risk_summary.total_exposed_population,
            assigned_teams_count=alloc_result.total_assigned_teams,
            blocked_roads_count=len(blocked_edges),
            operational_hospitals_count=facility_status["operational_hospitals"],
            zone_assessments_json=[z.model_dump() for z in risk_summary.zones],
            allocations_json=alloc_result.model_dump(),
            blocked_edges_json=blocked_edges,
            notes=f"Simulated {base_scenario['name']} at {now_utc.isoformat()}"
        )
        db.add(db_run)

        # Activity log entry
        db_log = ActivityLogRecord(
            timestamp=now_utc,
            action_type="SCENARIO_SIMULATED",
            severity="CRITICAL" if base_scenario["severity"] == "CRITICAL" else "WARNING",
            message=f"Executed {base_scenario['name']}. Rainfall: {rainfall}mm, Exposed: {risk_summary.total_exposed_population:,}, Assigned Teams: {alloc_result.total_assigned_teams}/{teams_count}.",
            details_json={"run_id": run_id, "scenario_id": base_scenario["id"]},
            provenance="SYSTEM_AUDIT"
        )
        db.add(db_log)
        db.commit()

        # Cache unified state
        unified_state = {
            "run_id": run_id,
            "scenario": base_scenario,
            "risk_summary": risk_summary.model_dump(),
            "facilities": facility_status,
            "allocations": alloc_result.model_dump(),
            "blocked_edge_ids": blocked_edges,
            "provenance_map": {
                "zones_geography": "HISTORICAL",
                "hospitals": "OBSERVED",
                "road_geometry": "OBSERVED",
                "rainfall_input": "SIMULATED",
                "water_level": "SIMULATED",
                "risk_scores": "MODEL_ESTIMATE",
                "optimal_routes": "MODEL_ESTIMATE",
                "resource_allocations": "MODEL_ESTIMATE"
            }
        }
        self.active_state_cache = unified_state
        return unified_state

    def reset_to_default(self, db: Session) -> Dict[str, Any]:
        """Reset scenario back to Scenario A (Moderate)."""
        now_utc = datetime.now(timezone.utc)
        db_log = ActivityLogRecord(
            timestamp=now_utc,
            action_type="SCENARIO_RESET",
            severity="INFO",
            message="Emergency scenario reset to baseline Scenario A (Moderate Monsoon Flooding).",
            details_json={"target": "SCN-A"},
            provenance="SYSTEM_AUDIT"
        )
        db.add(db_log)
        db.commit()
        return self.run_simulation(db, scenario_id="SCN-A")

simulator_service = ScenarioSimulatorService()

