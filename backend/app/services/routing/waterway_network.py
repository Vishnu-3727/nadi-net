"""
NADI-NET — Waterway Network Manager
Maintains separate water graph (G_water), evaluates river navigability,
and manages boat launch / recovery transfer points connecting to the road network.
EPSG:4326 context. All waterway data is explicitly flagged as SYNTHETIC_DEMO.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import networkx as nx

from backend.app.core.config import settings
from backend.app.schemas.waterways import (
    WaterwayNode,
    WaterwayEdge,
    WaterwayNetworkData,
    TransferPoint,
)


class WaterwayNetworkManager:
    """
    Manages the G_water graph and transfer points connecting to G_road.
    """

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or (settings.DATA_DIR / "chennai_waterways.json")
        self.nodes_dict: Dict[str, Dict[str, Any]] = {}
        self.edges_dict: Dict[str, Dict[str, Any]] = {}
        self.transfer_points: Dict[str, TransferPoint] = {}
        self.G_water = self._build_water_graph()

    def _build_water_graph(self) -> nx.Graph:
        G = nx.Graph()
        if not self.data_path.exists():
            return G

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for n in data.get("nodes", []):
            self.nodes_dict[n["id"]] = n
            G.add_node(
                n["id"],
                name=n["name"],
                lat=n["lat"],
                lon=n["lon"],
                waterway=n["waterway"],
                node_type=n["node_type"],
                status=n.get("status", "OPERATIONAL"),
                road_transfer_id=n.get("road_node_transfer_id"),
                transfer_time_min=n.get("transfer_time_min", 0.0),
            )

            # Register transfer points
            if n.get("road_node_transfer_id"):
                self.transfer_points[n["id"]] = TransferPoint(
                    launch_id=n["id"],
                    name=n["name"],
                    road_node_id=n["road_node_transfer_id"],
                    water_node_id=n["id"],
                    transfer_time_min=n.get("transfer_time_min", 10.0),
                    status=n.get("status", "OPERATIONAL"),
                    is_simulated=True,
                )

        for e in data.get("edges", []):
            self.edges_dict[e["id"]] = e
            speed = max(5.0, e.get("speed_limit_kmh", 15.0))
            dist = e.get("distance_km", 1.0)
            base_time = (dist / speed) * 60.0

            G.add_edge(
                e["u"],
                e["v"],
                id=e["id"],
                name=e["name"],
                waterway=e["waterway"],
                distance_km=dist,
                speed_limit_kmh=speed,
                base_time_min=base_time,
                min_required_depth_m=e.get("min_required_depth_m", 0.40),
                max_permitted_current_mps=e.get("max_permitted_current_mps", 2.0),
                current_depth_m=e.get("current_depth_m", 1.0),
                current_flow_velocity_mps=e.get("current_flow_velocity_mps", 1.0),
                navigation_status=e.get("navigation_status", "OPERATIONAL"),
            )

        return G

    def get_transfer_point_for_road_node(self, road_node_id: str) -> Optional[TransferPoint]:
        """Finds an operational transfer hub associated with a road node."""
        for tp in self.transfer_points.values():
            if tp.road_node_id == road_node_id and tp.status == "OPERATIONAL":
                return tp
        return None

    def get_transfer_point_for_water_node(self, water_node_id: str) -> Optional[TransferPoint]:
        """Finds the transfer hub for a water launch node."""
        tp = self.transfer_points.get(water_node_id)
        if tp and tp.status == "OPERATIONAL":
            return tp
        return None

    def evaluate_water_edge(
        self,
        edge_id: str,
        depth_override: Optional[float] = None,
        velocity_override: Optional[float] = None,
    ) -> Tuple[bool, float, str]:
        """
        Evaluates physical navigability of a water edge.
        Returns: (is_navigable, travel_time_min, rejection_reason)
        """
        data = self.edges_dict.get(edge_id)
        if not data:
            return False, 0.0, f"Waterway edge {edge_id} not found."

        if data.get("navigation_status") != "OPERATIONAL":
            return False, 0.0, f"Waterway segment {data['name']} is closed ({data.get('navigation_status')})."

        depth = depth_override if depth_override is not None else data.get("current_depth_m", 1.0)
        min_depth = data.get("min_required_depth_m", 0.40)
        if depth < min_depth:
            return False, 0.0, f"Insufficient water depth ({depth:.2f}m < required {min_depth:.2f}m). Risk of grounding."

        velocity = velocity_override if velocity_override is not None else data.get("current_flow_velocity_mps", 1.0)
        max_vel = data.get("max_permitted_current_mps", 2.0)
        if velocity > max_vel:
            return False, 0.0, f"Excessive river current ({velocity:.2f} m/s > limit {max_vel:.2f} m/s). Risk of capsizing."

        dist = data.get("distance_km", 1.0)
        speed = max(5.0, data.get("speed_limit_kmh", 15.0))
        time_min = (dist / speed) * 60.0
        return True, time_min, "Navigable"

    def get_network_schema(self) -> WaterwayNetworkData:
        """Returns API representation of the waterway network."""
        nodes = [WaterwayNode(**n) for n in self.nodes_dict.values()]
        edges = [WaterwayEdge(**e) for e in self.edges_dict.values()]
        return WaterwayNetworkData(
            nodes=nodes,
            edges=edges,
            total_launch_points=len(self.transfer_points),
            provenance="SYNTHETIC_DEMO",
            warning="Demonstration waterway network. Synthetic coordinates for testing multi-modal boat deployment.",
        )


waterway_manager = WaterwayNetworkManager()
