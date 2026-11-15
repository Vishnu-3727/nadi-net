"""
NADI-NET — Flood Depth Scenario Engine
Generates explainable, deterministic road-segment flood conditions and uncertainty ranges.
NOTE: This engine implements transparent scenario-based assumptions for emergency planning.
It is NOT an unvalidated hydrodynamic numerical simulation or real-time forecast.
EPSG:4326 geospatial context.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any

from backend.app.core.config import settings
from backend.app.schemas.flood_depth import RoadFloodCondition


class FloodDepthScenarioEngine:
    """
    Scenario-based flood depth generator for Chennai road network.
    Transforms scenario parameters (rainfall intensity, tidal surge, blocked edges)
    into deterministic edge-level depth ranges [min, expected, max] and structural restrictions.
    """

    def __init__(self, road_network_path: Optional[Path] = None):
        self.road_network_path = road_network_path or (settings.DATA_DIR / "chennai_road_network.json")
        self.edges_dict: Dict[str, Dict[str, Any]] = self._load_edges()

    def _load_edges(self) -> Dict[str, Dict[str, Any]]:
        if not self.road_network_path.exists():
            return {}
        with open(self.road_network_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {edge["id"]: edge for edge in data.get("edges", [])}

    def generate_scenario_conditions(
        self,
        scenario_id: str = "SCN-A",
        rainfall_intensity_mm: float = 120.0,
        water_level_index: float = 0.5,
        blocked_edge_ids: Optional[List[str]] = None,
        manual_overrides: Optional[Dict[str, str]] = None,
        manual_depths: Optional[Dict[str, float]] = None,
    ) -> Dict[str, RoadFloodCondition]:
        """
        Generates RoadFloodCondition objects for all edges in the road network.

        Uncertainty representation:
        - min_m: Lower scenario bound (-25% of expected or zero)
        - expected_m: Scenario expected depth
        - max_m: Upper scenario bound (+30% of expected)
        """
        blocked_set = set(blocked_edge_ids or [])
        overrides = manual_overrides or {}
        explicit_depths = manual_depths or {}
        conditions: Dict[str, RoadFloodCondition] = {}

        # Structural characteristics of known Chennai corridors
        structural_map: Dict[str, str] = {
            "E18": "BRIDGE",          # Maraimalai Adigal Bridge over Adyar River
            "E21": "CAUSEWAY",        # MIOT Adyar River Causeway
            "E25": "CAUSEWAY",        # Pallikaranai Marsh Causeway
            "E06": "UNDERPASS",       # Kolathur - Perambur Link (Low-lying subway)
            "E15": "UNDERPASS",       # T. Nagar Usman Road Subway corridor
        }

        for edge_id, edge in self.edges_dict.items():
            susceptibility = float(edge.get("flood_susceptibility", 0.5))
            struct = structural_map.get(edge_id)
            is_blocked = edge_id in blocked_set

            # 1. Determine expected depth
            if edge_id in explicit_depths:
                exp_depth = max(0.0, float(explicit_depths[edge_id]))
                source = "MANUAL_FIELD_REPORT"
                label = "MEDIUM"
                vel = 0.8 if exp_depth > 0.4 else 0.2
            elif is_blocked:
                # Blocked corridors represent severe water logging in scenario
                # Base depth between 0.60m and 1.40m based on susceptibility & water level
                base_depth = 0.50 + (0.60 * susceptibility) + (0.30 * water_level_index)
                exp_depth = round(base_depth, 2)
                source = "SCENARIO_ASSUMPTION"
                label = "SCENARIO_RANGE"
                # Submerged bridges/causeways experience higher flow velocity
                vel = 1.8 if struct in ("BRIDGE", "CAUSEWAY") else 0.6
            else:
                # Passable corridors under scenario rainfall
                if rainfall_intensity_mm < 100.0 and susceptibility < 0.5:
                    exp_depth = 0.05
                    vel = 0.1
                else:
                    # Mild ponding proportional to susceptibility and rainfall
                    exp_depth = round(0.10 + (0.25 * susceptibility * (rainfall_intensity_mm / 300.0)), 2)
                    vel = 0.3 if exp_depth > 0.2 else 0.1
                source = "SCENARIO_ASSUMPTION"
                label = "SCENARIO_RANGE"

            # 2. Compute uncertainty envelope
            min_depth = round(max(0.0, exp_depth * 0.75), 2) if exp_depth > 0 else 0.0
            max_depth = round(exp_depth * 1.30, 2) if exp_depth > 0 else 0.0

            override_val = overrides.get(edge_id)

            conditions[edge_id] = RoadFloodCondition(
                edge_id=edge_id,
                flood_depth_min_m=min_depth,
                flood_depth_expected_m=exp_depth,
                flood_depth_max_m=max_depth,
                depth_source=source,
                depth_scenario_id=scenario_id,
                is_simulated=True,
                confidence_or_reliability_label=label,
                flow_velocity_mps=vel,
                structural_restriction=struct,
                manual_override=override_val,
                data_timestamp=None,
                provenance="SCENARIO_INPUT (Demonstration Scenario Range)"
            )

        return conditions


# Singleton instance
flood_depth_engine = FloodDepthScenarioEngine()
