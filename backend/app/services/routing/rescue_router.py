import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import networkx as nx

from backend.app.core.config import settings
from backend.app.schemas.flood_depth import RoadFloodCondition, EdgeAccessibilityResult
from backend.app.services.routing.vehicle_accessibility import (
    evaluate_edge_accessibility,
    get_vehicle_profile,
)
from backend.app.schemas.routing import (
    RouteRequest,
    RouteResponse,
    RouteDetail,
    RouteAlternative,
    RouteNodeStep,
    RouteEdgeStep,
)

class FloodAwareRescueRouter:
    """
    Graph-based rescue routing engine for Chennai road network.
    Dynamically adjusts edge traversability, applies flood risk penalties,
    computes primary & alternative paths, and detects isolated nodes.
    """

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or (settings.DATA_DIR / "chennai_road_network.json")
        self.nodes_dict: Dict[str, Dict[str, Any]] = {}
        self.edges_dict: Dict[str, Dict[str, Any]] = {}
        self.base_graph = self._build_graph()

    def _build_graph(self) -> nx.Graph:
        if not self.data_path.exists():
            raise FileNotFoundError(f"Road network dataset not found at {self.data_path}")
        
        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        G = nx.Graph()
        for node in data.get("nodes", []):
            self.nodes_dict[node["id"]] = node
            G.add_node(
                node["id"],
                name=node["name"],
                lat=node["lat"],
                lon=node["lon"],
                zone_id=node["zone_id"],
            )

        for edge in data.get("edges", []):
            self.edges_dict[edge["id"]] = edge
            # Normal travel time in minutes
            speed = edge.get("speed_limit_kmh", 40.0)
            dist = edge.get("distance_km", 1.0)
            base_time_min = (dist / max(10.0, speed)) * 60.0

            G.add_edge(
                edge["u"],
                edge["v"],
                id=edge["id"],
                name=edge["name"],
                distance_km=dist,
                speed_limit_kmh=speed,
                base_time_min=base_time_min,
                road_type=edge.get("road_type", "ARTERIAL"),
                flood_susceptibility=edge.get("flood_susceptibility", 0.5),
            )
        return G

    def compute_route(
        self,
        request: RouteRequest,
        active_blocked_edges: Optional[List[str]] = None,
        flood_conditions: Optional[Dict[str, RoadFloodCondition]] = None,
    ) -> RouteResponse:
        u = request.origin_node_id
        v = request.destination_node_id

        if u not in self.nodes_dict or v not in self.nodes_dict:
            raise ValueError(f"Origin '{u}' or destination '{v}' not found in road network.")

        blocked = set(active_blocked_edges or [])
        if request.blocked_edges_override is not None:
            blocked = set(request.blocked_edges_override)

        # Build working graph with vehicle-specific weights
        G = nx.Graph()
        for node_id, data in self.base_graph.nodes(data=True):
            G.add_node(node_id, **data)

        encountered_blocked_segments = []
        rejected_reasons: List[str] = []

        for u_edge, v_edge, data in self.base_graph.edges(data=True):
            edge_id = data["id"]
            base_time = data["base_time_min"]
            susceptibility = data["flood_susceptibility"]

            # Phase 3.2: If fine-grained flood conditions are provided, evaluate physical accessibility
            if flood_conditions is not None:
                cond = flood_conditions.get(edge_id)
                eval_res = evaluate_edge_accessibility(
                    edge=data,
                    vehicle=request.vehicle_type,
                    flood_condition=cond,
                    conservative_unknown=request.conservative_unknown,
                )

                if eval_res.status in ("BLOCKED", "UNKNOWN"):
                    encountered_blocked_segments.append(edge_id)
                    rejected_reasons.append(f"Edge {edge_id} ({data.get('name', 'Segment')}): {eval_res.reason}")
                    continue
                elif eval_res.status == "RESTRICTED":
                    cost = base_time * eval_res.cost_multiplier
                    G.add_edge(u_edge, v_edge, cost=cost, edge_id=edge_id, is_blocked=False, accessibility=eval_res.model_dump(), **data)
                else:  # PASSABLE
                    risk_penalty = 1.0 + (0.3 * susceptibility)
                    cost = base_time * risk_penalty * eval_res.cost_multiplier
                    G.add_edge(u_edge, v_edge, cost=cost, edge_id=edge_id, is_blocked=False, accessibility=eval_res.model_dump(), **data)
            else:
                # Legacy binary blockage handling
                is_blocked = edge_id in blocked
                if is_blocked:
                    encountered_blocked_segments.append(edge_id)
                    if request.vehicle_type in ("AMPHIBIOUS_BOAT", "AMPHIBIOUS_CRAFT"):
                        # Boat / amphibious craft can cross flooded corridors at lower speed
                        cost = (data["distance_km"] / 15.0) * 60.0 * 1.5
                        G.add_edge(u_edge, v_edge, cost=cost, edge_id=edge_id, is_blocked=True, **data)
                    elif request.vehicle_type in ("HIGH_CLEARANCE", "HEAVY_CLEARANCE_TRUCK") and susceptibility < 0.8:
                        # High clearance can wade through moderate water with 3.5x penalty
                        cost = base_time * 3.5
                        G.add_edge(u_edge, v_edge, cost=cost, edge_id=edge_id, is_blocked=True, **data)
                    else:
                        # Standard rescue vehicles cannot pass blocked edges
                        continue
                else:
                    # Normal road with mild flood-risk slowdown penalty
                    risk_penalty = 1.0 + (0.3 * susceptibility)
                    cost = base_time * risk_penalty
                    G.add_edge(u_edge, v_edge, cost=cost, edge_id=edge_id, is_blocked=False, **data)

        # Check reachability
        if not nx.has_path(G, u, v):
            v_name = self.nodes_dict[v]["name"]
            rationale = "No feasible traversable path exists due to complete flood severance."
            if flood_conditions is not None:
                rationale = f"All connecting corridors exceed {request.vehicle_type} physical operating limits or structural restrictions."
            return RouteResponse(
                origin_node_id=u,
                destination_node_id=v,
                primary_route=RouteDetail(
                    is_feasible=False,
                    total_distance_km=0.0,
                    estimated_travel_time_min=0.0,
                    nodes=[],
                    edges=[],
                    blocked_segments_encountered=list(set(encountered_blocked_segments)),
                    selection_rationale=rationale,
                    vehicle_compatibility=f"Incompatible - Road corridor completely impassable for {request.vehicle_type}.",
                    provenance="MODEL_ESTIMATE",
                ),
                alternatives=[],
                unreachable_reason=f"Destination node {v} ({v_name}) is isolated. Arterial connections blocked by active flood inundation or vehicle depth limit.",
                rejected_alternatives_reasons=rejected_reasons[:5],
            )

        # Compute primary route via Dijkstra
        primary_node_path = nx.dijkstra_path(G, u, v, weight="cost")
        primary_detail = self._extract_route_detail(G, primary_node_path, request.vehicle_type, blocked)

        # Compute alternative routes (up to 2 alternatives using edge-penalized shortest paths)
        alternatives: List[RouteAlternative] = []
        try:
            # Generate k simple paths on unblocked graph
            simple_paths_gen = nx.shortest_simple_paths(G, u, v, weight="cost")
            count = 0
            for path in simple_paths_gen:
                if path == primary_node_path:
                    continue
                count += 1
                detail = self._extract_route_detail(G, path, request.vehicle_type, blocked)
                alternatives.append(RouteAlternative(
                    rank=count,
                    route_name=f"Alternative {count}: via {self.nodes_dict[path[len(path)//2]]['name']}",
                    total_distance_km=detail.total_distance_km,
                    estimated_travel_time_min=detail.estimated_travel_time_min,
                    nodes=detail.nodes,
                    edges=detail.edges,
                    difference_reason=f"Detour bypass avoiding primary arterial bottleneck (+{round(detail.estimated_travel_time_min - primary_detail.estimated_travel_time_min, 1)} min)."
                ))
                if count >= 2:
                    break
        except Exception:
            pass

        return RouteResponse(
            origin_node_id=u,
            destination_node_id=v,
            primary_route=primary_detail,
            alternatives=alternatives,
            unreachable_reason=None,
            rejected_alternatives_reasons=rejected_reasons[:5],
        )

    def _extract_route_detail(
        self,
        G: nx.Graph,
        path: List[str],
        vehicle_type: str,
        blocked_set: set
    ) -> RouteDetail:
        node_steps = []
        for nid in path:
            nd = self.nodes_dict[nid]
            node_steps.append(RouteNodeStep(
                node_id=nid,
                name=nd["name"],
                lat=nd["lat"],
                lon=nd["lon"]
            ))

        edge_steps = []
        total_dist = 0.0
        total_time = 0.0
        encountered_blocked = []

        for i in range(len(path) - 1):
            n1, n2 = path[i], path[i+1]
            edge_data = G[n1][n2]
            eid = edge_data.get("edge_id", f"{n1}-{n2}")
            is_bl = eid in blocked_set
            if is_bl:
                encountered_blocked.append(eid)
            
            d_km = edge_data.get("distance_km", 1.0)
            t_min = edge_data.get("cost", 2.0)
            total_dist += d_km
            total_time += t_min

            edge_steps.append(RouteEdgeStep(
                edge_id=eid,
                name=edge_data.get("name", "Road Link"),
                distance_km=d_km,
                speed_limit_kmh=edge_data.get("speed_limit_kmh", 40.0),
                travel_time_min=round(t_min, 1),
                road_type=edge_data.get("road_type", "ARTERIAL"),
                flood_susceptibility=edge_data.get("flood_susceptibility", 0.5),
                is_blocked=is_bl
            ))

        rationale = "Optimized for minimum travel time with flood avoidance."
        if encountered_blocked:
            rationale = f"Specialized route utilizing amphibious/high-clearance traversal across {len(encountered_blocked)} flooded corridors."

        return RouteDetail(
            is_feasible=True,
            total_distance_km=round(total_dist, 2),
            estimated_travel_time_min=round(total_time, 1),
            nodes=node_steps,
            edges=edge_steps,
            blocked_segments_encountered=encountered_blocked,
            selection_rationale=rationale,
            vehicle_compatibility=f"Verified compatible with {vehicle_type}.",
            provenance="MODEL_ESTIMATE"
        )

rescue_router = FloodAwareRescueRouter()
