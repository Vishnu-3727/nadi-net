"""
NADI-NET — Multi-Modal Rescue Router
Coordinates seamless transitions between land graph (G_road) and water graph (G_water).
Strictly enforces physical vehicle constraints:
- Inflatable boats cannot traverse dry road segments.
- Standard road vehicles cannot enter water without verified amphibious capability.
- Modal transitions can only occur at operational boat launch/recovery transfer hubs.
EPSG:4326 geospatial context. Water segments flagged as SYNTHETIC_DEMO.
"""

from typing import List, Optional, Dict, Any, Tuple
import networkx as nx

from backend.app.schemas.waterways import (
    MultiModalRouteRequest,
    MultiModalRouteResponse,
    MultiModalRouteDetail,
    MultiModalRouteStep,
)
from backend.app.schemas.routing import RouteRequest
from backend.app.services.routing.rescue_router import rescue_router
from backend.app.services.routing.waterway_network import waterway_manager
from backend.app.services.routing.vehicle_accessibility import get_vehicle_profile


class MultiModalRescueRouter:
    """
    Solves combined road, water, and hybrid rescue routes.
    """

    def __init__(self, road_router=None, water_mgr=None):
        self.road_router = road_router or rescue_router
        self.water_mgr = water_mgr or waterway_manager

    def compute_route(self, request: MultiModalRouteRequest) -> MultiModalRouteResponse:
        u = request.origin_node_id
        v = request.destination_node_id

        is_u_road = u in self.road_router.nodes_dict
        is_u_water = u in self.water_mgr.nodes_dict
        is_v_road = v in self.road_router.nodes_dict
        is_v_water = v in self.water_mgr.nodes_dict

        if not (is_u_road or is_u_water):
            raise ValueError(f"Origin node '{u}' not recognized in road or waterway network.")
        if not (is_v_road or is_v_water):
            raise ValueError(f"Destination node '{v}' not recognized in road or waterway network.")

        v_profile = get_vehicle_profile(request.primary_vehicle_type)
        boat_profile = get_vehicle_profile(request.watercraft_type)

        # 1. Reject physical impossibilities upfront
        if v_profile.is_watercraft and not v_profile.can_traverse_dry_roads:
            if is_u_road or is_v_road:
                return self._build_infeasible_response(
                    u, v, "Watercraft prohibited on dry road network without trailer transport or amphibious hull."
                )

        if not v_profile.is_amphibious and not v_profile.is_watercraft:
            if is_u_water and is_v_water and not request.allow_waterway:
                return self._build_infeasible_response(
                    u, v, f"Vehicle '{v_profile.name}' is a non-amphibious road vehicle and cannot traverse waterway segments."
                )

        # 2. Case A: Water-only routing (Origin & Destination both in water graph)
        if is_u_water and is_v_water:
            water_route = self._solve_water_path(u, v, boat_profile.name)
            if water_route.is_feasible:
                return MultiModalRouteResponse(
                    origin_node_id=u,
                    destination_node_id=v,
                    primary_route=water_route,
                    alternatives=[],
                )
            else:
                return self._build_infeasible_response(u, v, water_route.route_summary)

        # 3. Case B: Road-only routing (Direct land traversal)
        primary_detail: Optional[MultiModalRouteDetail] = None
        alternatives: List[MultiModalRouteDetail] = []

        if is_u_road and is_v_road:
            road_req = RouteRequest(
                origin_node_id=u,
                destination_node_id=v,
                vehicle_type=request.primary_vehicle_type,
                blocked_edges_override=request.blocked_edges,
            )
            road_resp = self.road_router.compute_route(road_req)
            if road_resp.primary_route.is_feasible:
                primary_detail = self._convert_road_detail_to_multimodal(
                    road_resp.primary_route, v_profile.name
                )

        # 4. Case C: Multi-modal Hybrid Routing (Road -> Launch Hub -> Waterway -> Recovery Hub -> Road)
        # Explored if requested or if direct road path is blocked
        if request.allow_waterway:
            hybrid_detail = self._solve_hybrid_route(request, is_u_road, is_u_water, is_v_road, is_v_water)
            if hybrid_detail and hybrid_detail.is_feasible:
                if primary_detail is None:
                    primary_detail = hybrid_detail
                elif hybrid_detail.total_duration_min < primary_detail.total_duration_min:
                    alternatives.append(primary_detail)
                    primary_detail = hybrid_detail
                else:
                    alternatives.append(hybrid_detail)

        if primary_detail and primary_detail.is_feasible:
            return MultiModalRouteResponse(
                origin_node_id=u,
                destination_node_id=v,
                primary_route=primary_detail,
                alternatives=alternatives,
                unreachable_reason=None,
            )

        return self._build_infeasible_response(
            u, v, f"No feasible road, water, or multi-modal connection exists between '{u}' and '{v}' under current flood blockages."
        )

    def _solve_water_path(self, u_water: str, v_water: str, craft_name: str) -> MultiModalRouteDetail:
        """Solves shortest navigable path on G_water."""
        G = nx.Graph()
        for nid, ndata in self.water_mgr.G_water.nodes(data=True):
            G.add_node(nid, **ndata)

        for u_e, v_e, edata in self.water_mgr.G_water.edges(data=True):
            is_nav, t_min, _ = self.water_mgr.evaluate_water_edge(edata["id"])
            if is_nav:
                G.add_edge(u_e, v_e, cost=t_min, **edata)

        if not nx.has_path(G, u_water, v_water):
            return MultiModalRouteDetail(
                is_feasible=False,
                total_distance_km=0.0,
                total_duration_min=0.0,
                steps=[],
                route_summary=f"Waterway corridor between {u_water} and {v_water} is unnavigable (depth/velocity limits or closure).",
            )

        path = nx.dijkstra_path(G, u_water, v_water, weight="cost")
        total_dist = 0.0
        total_time = 0.0
        edge_ids = []

        for i in range(len(path) - 1):
            ed = G[path[i]][path[i + 1]]
            edge_ids.append(ed["id"])
            total_dist += ed.get("distance_km", 1.0)
            total_time += ed.get("cost", 5.0)

        step = MultiModalRouteStep(
            step_number=1,
            mode="WATER",
            vehicle_or_craft=craft_name,
            start_node=u_water,
            end_node=v_water,
            edge_ids=edge_ids,
            distance_km=round(total_dist, 2),
            duration_min=round(total_time, 1),
            description=f"Direct water rescue navigation via {self.water_mgr.nodes_dict[u_water]['waterway']}.",
            accessibility_status="PASSABLE",
        )

        return MultiModalRouteDetail(
            is_feasible=True,
            total_distance_km=round(total_dist, 2),
            total_duration_min=round(total_time, 1),
            steps=[step],
            transfer_points_used=[],
            vehicles_used=[craft_name],
            route_summary=f"Direct water corridor: {round(total_dist, 2)} km in {round(total_time, 1)} min.",
        )

    def _solve_hybrid_route(
        self,
        request: MultiModalRouteRequest,
        is_u_road: bool,
        is_u_water: bool,
        is_v_road: bool,
        is_v_water: bool,
    ) -> Optional[MultiModalRouteDetail]:
        """
        Computes hybrid routes linking road transit and water transit via boat launch/recovery hubs.
        """
        u = request.origin_node_id
        v = request.destination_node_id
        blocked = set(request.blocked_edges or [])

        # Candidate transfer points
        operational_launches = [
            tp for tp in self.water_mgr.transfer_points.values() if tp.status == "OPERATIONAL"
        ]
        if not operational_launches:
            return None

        best_route: Optional[MultiModalRouteDetail] = None
        min_time = float("inf")

        # Case 1: Road Origin -> Water Destination
        if is_u_road and is_v_water:
            for launch in operational_launches:
                # Leg 1: Road from u to launch.road_node_id
                r_req = RouteRequest(
                    origin_node_id=u,
                    destination_node_id=launch.road_node_id,
                    vehicle_type=request.primary_vehicle_type,
                    blocked_edges_override=list(blocked),
                )
                r_resp = self.road_router.compute_route(r_req)
                if not r_resp.primary_route.is_feasible:
                    continue

                # Leg 2: Transfer boat launch
                t_time = launch.transfer_time_min

                # Leg 3: Water from launch.water_node_id to v
                w_detail = self._solve_water_path(launch.water_node_id, v, request.watercraft_type)
                if not w_detail.is_feasible:
                    continue

                total_time = r_resp.primary_route.estimated_travel_time_min + t_time + w_detail.total_duration_min
                if total_time < min_time:
                    min_time = total_time
                    steps = [
                        MultiModalRouteStep(
                            step_number=1,
                            mode="ROAD",
                            vehicle_or_craft=request.primary_vehicle_type,
                            start_node=u,
                            end_node=launch.road_node_id,
                            edge_ids=[e.edge_id for e in r_resp.primary_route.edges],
                            distance_km=r_resp.primary_route.total_distance_km,
                            duration_min=r_resp.primary_route.estimated_travel_time_min,
                            description=f"Road transport to boat launch ramp at {launch.name}.",
                        ),
                        MultiModalRouteStep(
                            step_number=2,
                            mode="TRANSFER",
                            vehicle_or_craft="WINCH_TRAILER",
                            start_node=launch.road_node_id,
                            end_node=launch.water_node_id,
                            distance_km=0.0,
                            duration_min=t_time,
                            description=f"Deploy {request.watercraft_type} from trailer into waterway ({t_time} min).",
                        ),
                        MultiModalRouteStep(
                            step_number=3,
                            mode="WATER",
                            vehicle_or_craft=request.watercraft_type,
                            start_node=launch.water_node_id,
                            end_node=v,
                            edge_ids=w_detail.steps[0].edge_ids if w_detail.steps else [],
                            distance_km=w_detail.total_distance_km,
                            duration_min=w_detail.total_duration_min,
                            description=f"Water rescue navigation to target location {v}.",
                        ),
                    ]
                    best_route = MultiModalRouteDetail(
                        is_feasible=True,
                        total_distance_km=round(r_resp.primary_route.total_distance_km + w_detail.total_distance_km, 2),
                        total_duration_min=round(total_time, 1),
                        steps=steps,
                        transfer_points_used=[launch.launch_id],
                        vehicles_used=[request.primary_vehicle_type, request.watercraft_type],
                        route_summary=f"Road-to-water multi-modal transit via {launch.name}.",
                    )

        # Case 2: Water Origin -> Road Destination
        elif is_u_water and is_v_road:
            for recovery in operational_launches:
                # Leg 1: Water from u to recovery.water_node_id
                w_detail = self._solve_water_path(u, recovery.water_node_id, request.watercraft_type)
                if not w_detail.is_feasible:
                    continue

                # Leg 2: Transfer boat recovery
                t_time = recovery.transfer_time_min

                # Leg 3: Road from recovery.road_node_id to v
                r_req = RouteRequest(
                    origin_node_id=recovery.road_node_id,
                    destination_node_id=v,
                    vehicle_type=request.primary_vehicle_type,
                    blocked_edges_override=list(blocked),
                )
                r_resp = self.road_router.compute_route(r_req)
                if not r_resp.primary_route.is_feasible:
                    continue

                total_time = w_detail.total_duration_min + t_time + r_resp.primary_route.estimated_travel_time_min
                if total_time < min_time:
                    min_time = total_time
                    steps = [
                        MultiModalRouteStep(
                            step_number=1,
                            mode="WATER",
                            vehicle_or_craft=request.watercraft_type,
                            start_node=u,
                            end_node=recovery.water_node_id,
                            edge_ids=w_detail.steps[0].edge_ids if w_detail.steps else [],
                            distance_km=w_detail.total_distance_km,
                            duration_min=w_detail.total_duration_min,
                            description=f"Water navigation to recovery hub {recovery.name}.",
                        ),
                        MultiModalRouteStep(
                            step_number=2,
                            mode="TRANSFER",
                            vehicle_or_craft="WINCH_TRAILER",
                            start_node=recovery.water_node_id,
                            end_node=recovery.road_node_id,
                            distance_km=0.0,
                            duration_min=t_time,
                            description=f"Recover {request.watercraft_type} from water onto trailer ({t_time} min).",
                        ),
                        MultiModalRouteStep(
                            step_number=3,
                            mode="ROAD",
                            vehicle_or_craft=request.primary_vehicle_type,
                            start_node=recovery.road_node_id,
                            end_node=v,
                            edge_ids=[e.edge_id for e in r_resp.primary_route.edges],
                            distance_km=r_resp.primary_route.total_distance_km,
                            duration_min=r_resp.primary_route.estimated_travel_time_min,
                            description=f"Road transit to final destination {v}.",
                        ),
                    ]
                    best_route = MultiModalRouteDetail(
                        is_feasible=True,
                        total_distance_km=round(w_detail.total_distance_km + r_resp.primary_route.total_distance_km, 2),
                        total_duration_min=round(total_time, 1),
                        steps=steps,
                        transfer_points_used=[recovery.launch_id],
                        vehicles_used=[request.watercraft_type, request.primary_vehicle_type],
                        route_summary=f"Water-to-road recovery transit via {recovery.name}.",
                    )

        # Case 3: Road Origin -> Road Destination via Waterway Bypass
        elif is_u_road and is_v_road:
            for l_in in operational_launches:
                for l_out in operational_launches:
                    if l_in.launch_id == l_out.launch_id:
                        continue

                    # Leg 1: Road u -> l_in
                    r1_req = RouteRequest(
                        origin_node_id=u,
                        destination_node_id=l_in.road_node_id,
                        vehicle_type=request.primary_vehicle_type,
                        blocked_edges_override=list(blocked),
                    )
                    r1_resp = self.road_router.compute_route(r1_req)
                    if not r1_resp.primary_route.is_feasible:
                        continue

                    # Leg 2: Water l_in -> l_out
                    w_detail = self._solve_water_path(l_in.water_node_id, l_out.water_node_id, request.watercraft_type)
                    if not w_detail.is_feasible:
                        continue

                    # Leg 3: Road l_out -> v
                    r2_req = RouteRequest(
                        origin_node_id=l_out.road_node_id,
                        destination_node_id=v,
                        vehicle_type=request.primary_vehicle_type,
                        blocked_edges_override=list(blocked),
                    )
                    r2_resp = self.road_router.compute_route(r2_req)
                    if not r2_resp.primary_route.is_feasible:
                        continue

                    t_total = (
                        r1_resp.primary_route.estimated_travel_time_min
                        + l_in.transfer_time_min
                        + w_detail.total_duration_min
                        + l_out.transfer_time_min
                        + r2_resp.primary_route.estimated_travel_time_min
                    )

                    if t_total < min_time:
                        min_time = t_total
                        dist_total = (
                            r1_resp.primary_route.total_distance_km
                            + w_detail.total_distance_km
                            + r2_resp.primary_route.total_distance_km
                        )
                        steps = [
                            MultiModalRouteStep(
                                step_number=1,
                                mode="ROAD",
                                vehicle_or_craft=request.primary_vehicle_type,
                                start_node=u,
                                end_node=l_in.road_node_id,
                                edge_ids=[e.edge_id for e in r1_resp.primary_route.edges],
                                distance_km=r1_resp.primary_route.total_distance_km,
                                duration_min=r1_resp.primary_route.estimated_travel_time_min,
                                description=f"Road transit to launch hub {l_in.name}.",
                            ),
                            MultiModalRouteStep(
                                step_number=2,
                                mode="TRANSFER",
                                vehicle_or_craft="WINCH_TRAILER",
                                start_node=l_in.road_node_id,
                                end_node=l_in.water_node_id,
                                distance_km=0.0,
                                duration_min=l_in.transfer_time_min,
                                description=f"Deploy {request.watercraft_type} into waterway.",
                            ),
                            MultiModalRouteStep(
                                step_number=3,
                                mode="WATER",
                                vehicle_or_craft=request.watercraft_type,
                                start_node=l_in.water_node_id,
                                end_node=l_out.water_node_id,
                                edge_ids=w_detail.steps[0].edge_ids if w_detail.steps else [],
                                distance_km=w_detail.total_distance_km,
                                duration_min=w_detail.total_duration_min,
                                description=f"Water bypass navigation along {self.water_mgr.nodes_dict[l_in.water_node_id]['waterway']}.",
                            ),
                            MultiModalRouteStep(
                                step_number=4,
                                mode="TRANSFER",
                                vehicle_or_craft="WINCH_TRAILER",
                                start_node=l_out.water_node_id,
                                end_node=l_out.road_node_id,
                                distance_km=0.0,
                                duration_min=l_out.transfer_time_min,
                                description=f"Recover {request.watercraft_type} to vehicle trailer.",
                            ),
                            MultiModalRouteStep(
                                step_number=5,
                                mode="ROAD",
                                vehicle_or_craft=request.primary_vehicle_type,
                                start_node=l_out.road_node_id,
                                end_node=v,
                                edge_ids=[e.edge_id for e in r2_resp.primary_route.edges],
                                distance_km=r2_resp.primary_route.total_distance_km,
                                duration_min=r2_resp.primary_route.estimated_travel_time_min,
                                description=f"Final road leg to destination {v}.",
                            ),
                        ]
                        best_route = MultiModalRouteDetail(
                            is_feasible=True,
                            total_distance_km=round(dist_total, 2),
                            total_duration_min=round(t_total, 1),
                            steps=steps,
                            transfer_points_used=[l_in.launch_id, l_out.launch_id],
                            vehicles_used=[request.primary_vehicle_type, request.watercraft_type],
                            route_summary=f"Multi-modal waterway bypass: {round(dist_total, 2)} km in {round(t_total, 1)} min bypassing road blockages.",
                        )

        return best_route

    def _convert_road_detail_to_multimodal(self, r_detail: Any, vehicle_name: str) -> MultiModalRouteDetail:
        step = MultiModalRouteStep(
            step_number=1,
            mode="ROAD",
            vehicle_or_craft=vehicle_name,
            start_node=r_detail.nodes[0].node_id if r_detail.nodes else "",
            end_node=r_detail.nodes[-1].node_id if r_detail.nodes else "",
            edge_ids=[e.edge_id for e in r_detail.edges],
            distance_km=r_detail.total_distance_km,
            duration_min=r_detail.estimated_travel_time_min,
            description="Continuous road network route.",
            accessibility_status="PASSABLE",
        )
        return MultiModalRouteDetail(
            is_feasible=True,
            total_distance_km=r_detail.total_distance_km,
            total_duration_min=r_detail.estimated_travel_time_min,
            steps=[step],
            transfer_points_used=[],
            vehicles_used=[vehicle_name],
            route_summary=f"Direct road route: {r_detail.total_distance_km} km in {r_detail.estimated_travel_time_min} min.",
        )

    def _build_infeasible_response(self, u: str, v: str, reason: str) -> MultiModalRouteResponse:
        return MultiModalRouteResponse(
            origin_node_id=u,
            destination_node_id=v,
            primary_route=MultiModalRouteDetail(
                is_feasible=False,
                total_distance_km=0.0,
                total_duration_min=0.0,
                steps=[],
                transfer_points_used=[],
                vehicles_used=[],
                route_summary=reason,
            ),
            alternatives=[],
            unreachable_reason=reason,
        )


multimodal_router = MultiModalRescueRouter()
