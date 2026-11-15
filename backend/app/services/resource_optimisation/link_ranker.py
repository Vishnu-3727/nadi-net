"""
NADI-NET — Critical-Link Restoration Ranking Engine
Identifies which blocked arterial road segments deliver the highest marginal benefit
to emergency response if restored by Public Works / de-watering crews.
Evaluates population accessibility, hospital reconnection, shelter connectivity, and travel time.
EPSG:4326 geospatial context.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
import networkx as nx

from backend.app.core.config import settings
from backend.app.schemas.replanning import CriticalLinkScore, CriticalLinksResponse
from backend.app.services.geospatial.geo_service import geo_service


class CriticalLinkRanker:
    """
    Ranks candidate blocked edges by evaluating the marginal topological benefit of edge restoration.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.road_network = self._load_json("chennai_road_network.json")
        self.facilities = self._load_json("chennai_facilities.json")
        self.zones = self._load_json("chennai_zones.json")

    def _load_json(self, filename: str) -> Dict[str, Any]:
        path = self.data_dir / filename
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def rank_blocked_links(
        self,
        blocked_edge_ids: List[str],
        scenario_id: str = "SCN-A",
    ) -> CriticalLinksResponse:
        """
        Calculates marginal benefit of restoring each blocked edge individually.
        """
        unique_blocked = list(set(blocked_edge_ids or []))
        if not unique_blocked:
            return CriticalLinksResponse(
                total_blocked_links=0,
                ranked_links=[],
                evaluation_scenario=scenario_id,
                provenance="TOPOLOGICAL_ANALYSIS",
            )

        # 1. Build Base Graph (G_all)
        G_full = nx.Graph()
        edge_data_map = {}
        for n in self.road_network.get("nodes", []):
            G_full.add_node(n["id"], **n)

        for e in self.road_network.get("edges", []):
            edge_data_map[e["id"]] = e
            dist = float(e.get("distance_km", 1.0))
            speed = float(e.get("speed_limit_kmh", 40.0))
            t_min = (dist / max(10.0, speed)) * 60.0
            G_full.add_edge(e["u"], e["v"], id=e["id"], name=e["name"], cost=t_min, distance_km=dist)

        # Map facilities to nearest road nodes
        hosp_nodes: Dict[str, str] = {}
        for h in self.facilities.get("hospitals", []):
            nearest = geo_service.find_nearest_node(h["coordinates"])
            if nearest:
                hosp_nodes[h["id"]] = nearest["id"]

        shelter_nodes: Dict[str, str] = {}
        for s in self.facilities.get("shelters", []):
            nearest = geo_service.find_nearest_node(s["coordinates"])
            if nearest:
                shelter_nodes[s["id"]] = nearest["id"]

        zone_nodes: Dict[int, Tuple[str, int, int]] = {}
        for z in self.zones.get("zones", []):
            nearest = geo_service.find_nearest_node(z["centroid"])
            if nearest:
                zone_nodes[z["zone_id"]] = (nearest["id"], z["population"], z.get("vulnerability_index", 3))

        # Rescue depot bases as origin hubs
        depot_nodes = ["N01", "N09", "N16"]  # Central, Koyambedu, Guindy

        # 2. Evaluate Baseline Graph G_0 (with all candidate blocked edges removed)
        G_0 = G_full.copy()
        for b_id in unique_blocked:
            e_info = edge_data_map.get(b_id)
            if e_info and G_0.has_edge(e_info["u"], e_info["v"]):
                G_0.remove_edge(e_info["u"], e_info["v"])

        base_metrics = self._measure_network_reach(G_0, depot_nodes, hosp_nodes, shelter_nodes, zone_nodes)

        # 3. For each candidate link e, evaluate G_0 + e
        scored_links: List[CriticalLinkScore] = []

        for edge_id in unique_blocked:
            e_info = edge_data_map.get(edge_id)
            if not e_info:
                continue

            G_restored = G_0.copy()
            dist = float(e_info.get("distance_km", 1.0))
            speed = float(e_info.get("speed_limit_kmh", 40.0))
            t_min = (dist / max(10.0, speed)) * 60.0
            G_restored.add_edge(e_info["u"], e_info["v"], id=edge_id, name=e_info["name"], cost=t_min)

            restored_metrics = self._measure_network_reach(G_restored, depot_nodes, hosp_nodes, shelter_nodes, zone_nodes)

            # Marginal gains
            pop_gain = max(0, restored_metrics["reachable_population"] - base_metrics["reachable_population"])
            hosp_gain = max(0, restored_metrics["reachable_hospitals"] - base_metrics["reachable_hospitals"])
            shlt_gain = max(0, restored_metrics["reachable_shelters"] - base_metrics["reachable_shelters"])
            comp_reduced = max(0, base_metrics["connected_components"] - restored_metrics["connected_components"])
            time_saved = max(0.0, round(base_metrics["avg_travel_time"] - restored_metrics["avg_travel_time"], 1))
            demand_pts = max(0.0, restored_metrics["priority_demand_pts"] - base_metrics["priority_demand_pts"])

            # Transparent Multi-Criteria Benefit Score:
            # S = 0.001 * Pop + 50.0 * Hosp + 30.0 * Shlt + 40.0 * Comp + 2.0 * TimeSaved
            marginal_score = round(
                (0.0001 * pop_gain)
                + (50.0 * hosp_gain)
                + (30.0 * shlt_gain)
                + (40.0 * comp_reduced)
                + (2.0 * time_saved)
                + (5.0 * demand_pts),
                2
            )

            justification_parts = []
            if hosp_gain > 0:
                justification_parts.append(f"Re-establishes access to {hosp_gain} critical hospital(s)")
            if shlt_gain > 0:
                justification_parts.append(f"Restores route to {shlt_gain} evacuation shelter(s)")
            if pop_gain > 0:
                justification_parts.append(f"Reconnects {pop_gain:,} isolated residents")
            if comp_reduced > 0:
                justification_parts.append(f"Unifies {comp_reduced} severed road components")
            if time_saved > 0:
                justification_parts.append(f"Saves {time_saved} min response transit")

            justification = "; ".join(justification_parts) if justification_parts else "Improves local arterial redundancy."

            scored_links.append(CriticalLinkScore(
                edge_id=edge_id,
                edge_name=e_info["name"],
                restoration_rank=0,  # Assigned after sorting
                marginal_benefit_score=marginal_score,
                population_accessible_gained=pop_gain,
                priority_weighted_demand_reached=demand_pts,
                hospitals_reconnected=hosp_gain,
                shelters_reconnected=shlt_gain,
                travel_time_saved_min=time_saved,
                components_reduced=comp_reduced,
                restoration_justification=justification,
                provenance="TOPOLOGICAL_ANALYSIS",
            ))

        # 4. Deterministic sort: score descending, pop_gain descending, edge_id ascending
        scored_links.sort(key=lambda x: (-x.marginal_benefit_score, -x.population_accessible_gained, x.edge_id))

        for rank_idx, item in enumerate(scored_links, start=1):
            item.restoration_rank = rank_idx

        return CriticalLinksResponse(
            total_blocked_links=len(scored_links),
            ranked_links=scored_links,
            evaluation_scenario=scenario_id,
            provenance="TOPOLOGICAL_ANALYSIS",
        )

    def _measure_network_reach(
        self,
        G: nx.Graph,
        depot_nodes: List[str],
        hosp_nodes: Dict[str, str],
        shelter_nodes: Dict[str, str],
        zone_nodes: Dict[int, Tuple[str, int, int]],
    ) -> Dict[str, Any]:
        """Calculates reachability metrics from depots to all critical facilities and zones."""
        reachable_nodes = set()
        for depot in depot_nodes:
            if G.has_node(depot):
                reachable_nodes.update(nx.node_connected_component(G, depot))

        reachable_hosp = sum(1 for h_id, node in hosp_nodes.items() if node in reachable_nodes)
        reachable_shlt = sum(1 for s_id, node in shelter_nodes.items() if node in reachable_nodes)

        reachable_pop = 0
        priority_pts = 0.0
        for zid, (node, pop, vuln) in zone_nodes.items():
            if node in reachable_nodes:
                reachable_pop += pop
                priority_pts += (pop / 50000.0) * vuln

        components = nx.number_connected_components(G)

        # Average shortest path time from depots to reachable facilities
        times = []
        for depot in depot_nodes:
            if not G.has_node(depot):
                continue
            for h_node in hosp_nodes.values():
                if h_node in reachable_nodes and nx.has_path(G, depot, h_node):
                    times.append(nx.shortest_path_length(G, depot, h_node, weight="cost"))

        avg_time = sum(times) / len(times) if times else 0.0

        return {
            "reachable_population": reachable_pop,
            "reachable_hospitals": reachable_hosp,
            "reachable_shelters": reachable_shlt,
            "connected_components": components,
            "avg_travel_time": avg_time,
            "priority_demand_pts": round(priority_pts, 2),
        }


link_ranker_service = CriticalLinkRanker()
