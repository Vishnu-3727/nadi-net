import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from ortools.linear_solver import pywraplp

from backend.app.core.config import settings
from backend.app.schemas.risk import ZoneRiskAssessment
from backend.app.schemas.routing import RouteRequest
from backend.app.schemas.resources import (
    RescueTeamSchema,
    ResourceStockSchema,
    TeamAssignment,
    UnmetDestination,
    OptimisationResult,
)
from backend.app.services.routing.rescue_router import rescue_router
from backend.app.services.geospatial.geo_service import geo_service

class EmergencyResourceAllocator:
    """
    Mixed-Integer Linear Programming (MILP) Resource Optimisation Engine.
    Uses Google OR-Tools CBC solver to assign rescue teams and emergency supplies
    to prioritize life-safety at critical zones while minimizing response transit time.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.teams_data = self._load_teams()

    def _load_teams(self) -> List[Dict[str, Any]]:
        path = self.data_dir / "rescue_teams.json"
        if not path.exists():
            raise FileNotFoundError(f"Rescue teams data not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def optimize_allocation(
        self,
        assessed_zones: List[ZoneRiskAssessment],
        available_team_count: int = 10,
        blocked_edge_ids: Optional[List[str]] = None,
        available_food_packets: int = 5000,
        available_water_litres: int = 12000,
        available_medical_kits: int = 800,
        available_boats: int = 12,
    ) -> OptimisationResult:
        start_time = time.time()
        blocked_edges = blocked_edge_ids or []

        # 1. Filter and prepare active teams
        active_teams = self.teams_data[:min(len(self.teams_data), available_team_count)]

        # 2. Filter priority zones requiring assistance (Priority <= 3 or Risk > 40)
        target_zones = [z for z in assessed_zones if z.recommended_priority <= 3 or z.flood_risk_score >= 40.0]
        # Sort by priority ascending (1 is highest), then risk score descending
        target_zones.sort(key=lambda z: (z.recommended_priority, -z.flood_risk_score))

        # Map each zone to a representative road network node
        zone_node_map: Dict[int, str] = {}
        for z in assessed_zones:
            nearest = geo_service.find_nearest_node(z.centroid)
            zone_node_map[z.zone_id] = nearest["id"] if nearest else "N01"

        # 3. Precompute travel times and reachability matrix T[team_idx][zone_idx]
        travel_time_matrix: Dict[Tuple[int, int], float] = {}
        reachability_matrix: Dict[Tuple[int, int], bool] = {}
        route_cache: Dict[Tuple[int, int], Any] = {}

        for i, team in enumerate(active_teams):
            origin_node = team.get("base_node_id", "N01")
            vtype = team.get("vehicle_type", "NORMAL_RESCUE")
            for j, zone in enumerate(target_zones):
                dest_node = zone_node_map[zone.zone_id]
                route_req = RouteRequest(
                    origin_node_id=origin_node,
                    destination_node_id=dest_node,
                    vehicle_type=vtype,
                    avoid_blocked_edges=True,
                    blocked_edges_override=blocked_edges
                )
                try:
                    resp = rescue_router.compute_route(route_req, blocked_edges)
                    if resp.primary_route.is_feasible:
                        travel_time_matrix[(i, j)] = resp.primary_route.estimated_travel_time_min
                        reachability_matrix[(i, j)] = True
                        route_cache[(i, j)] = resp.primary_route
                    else:
                        travel_time_matrix[(i, j)] = 9999.0
                        reachability_matrix[(i, j)] = False
                except Exception:
                    travel_time_matrix[(i, j)] = 9999.0
                    reachability_matrix[(i, j)] = False

        # 4. Formulate Google OR-Tools MILP Model
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            # Fallback solver if CBC unavailable
            solver = pywraplp.Solver.CreateSolver("SCIP") or pywraplp.Solver.CreateSolver("GLOP")

        num_teams = len(active_teams)
        num_zones = len(target_zones)

        # Decision variables: x[i, j] = 1 if team i assigned to zone j
        x = {}
        for i in range(num_teams):
            for j in range(num_zones):
                x[i, j] = solver.BoolVar(f"x_{i}_{j}")

        # Constraint 1: Each team assigned to at most one zone
        for i in range(num_teams):
            solver.Add(solver.Sum([x[i, j] for j in range(num_zones)]) <= 1)

        # Constraint 2: Respect zone capacity and max team demand
        for j in range(num_zones):
            zone = target_zones[j]
            # Priority 1: up to 2 teams; Priority 2: up to 1 team; Priority 3: 1 team
            max_teams_for_zone = 2 if zone.recommended_priority == 1 else 1
            solver.Add(solver.Sum([x[i, j] for i in range(num_teams)]) <= max_teams_for_zone)

        # Constraint 3: Infeasible routes cannot be assigned (x[i, j] == 0)
        for i in range(num_teams):
            for j in range(num_zones):
                if not reachability_matrix.get((i, j), False):
                    solver.Add(x[i, j] == 0)

        # Objective Function:
        # Maximize: Sum_j [ PriorityWeight(j) * 1000 * Sum_i(x[i,j]) ] - Sum_ij [ TravelTime(i,j) * x[i,j] ]
        objective = solver.Objective()
        for j in range(num_zones):
            zone = target_zones[j]
            # Priority weights: P1=5000, P2=2000, P3=800, P4=200, P5=50
            if zone.recommended_priority == 1:
                p_weight = 5000.0
            elif zone.recommended_priority == 2:
                p_weight = 2000.0
            else:
                p_weight = 800.0

            for i in range(num_teams):
                travel_time = travel_time_matrix.get((i, j), 100.0)
                # Net coefficient: high reward for priority, penalty for longer travel
                coeff = p_weight - (1.5 * travel_time)
                objective.SetCoefficient(x[i, j], coeff)

        objective.SetMaximization()

        # Solve
        solver_status = solver.Solve()

        # 5. Extract assignments and supply distributions
        assignments: List[TeamAssignment] = []
        assigned_team_indices = set()
        served_zone_indices = set()

        allocated_food = 0
        allocated_water = 0
        allocated_med = 0
        allocated_boats_count = 0

        if solver_status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            for i in range(num_teams):
                for j in range(num_zones):
                    if x[i, j].solution_value() > 0.5:
                        team = active_teams[i]
                        zone = target_zones[j]
                        route = route_cache.get((i, j))
                        assigned_team_indices.add(i)
                        served_zone_indices.add(j)

                        # Calculate supply slice based on exposed population and priority
                        food_slice = min(1000, available_food_packets // max(1, num_zones))
                        water_slice = min(2500, available_water_litres // max(1, num_zones))
                        med_slice = min(150, available_medical_kits // max(1, num_zones))
                        boat_slice = 2 if "BOAT" in team.get("specialty", "") or "INFLATABLE" in str(team.get("equipment", [])) else 1

                        allocated_food += food_slice
                        allocated_water += water_slice
                        allocated_med += med_slice
                        allocated_boats_count += boat_slice

                        route_nodes = [n.node_id for n in route.nodes] if route else []
                        route_dist = route.total_distance_km if route else 0.0
                        arrival_time = route.estimated_travel_time_min if route else 0.0

                        assignments.append(TeamAssignment(
                            team_id=team["id"],
                            team_name=team["name"],
                            agency=team["agency"],
                            assigned_zone_id=zone.zone_id,
                            assigned_zone_name=zone.name,
                            destination_node_id=zone_node_map[zone.zone_id],
                            zone_priority=zone.recommended_priority,
                            risk_score=zone.flood_risk_score,
                            route_distance_km=route_dist,
                            estimated_arrival_time_min=arrival_time,
                            vehicle_used=team.get("vehicle_type", "4WD_RESCUE"),
                            allocated_supplies={
                                "food_packets": food_slice,
                                "water_litres": water_slice,
                                "medical_kits": med_slice,
                                "inflatable_boats": boat_slice
                            },
                            route_nodes=route_nodes,
                            assignment_justification=f"Assigned by MILP optimization. Prioritizes Priority {zone.recommended_priority} risk ({zone.flood_risk_score}/100) with shortest verified route."
                        ))

        # 6. Identify unmet destinations
        unmet: List[UnmetDestination] = []
        for j in range(num_zones):
            if j not in served_zone_indices:
                zone = target_zones[j]
                # Check reason: Was it unreachable or exhausted teams?
                is_reachable_by_any = any(reachability_matrix.get((i, j), False) for i in range(num_teams))
                if not is_reachable_by_any:
                    reason = f"Completely unreachable from all operational rescue bases due to road blockages ({', '.join(blocked_edges)})."
                else:
                    reason = f"Rescue team capacity exhausted on higher-severity Priority {min(z.recommended_priority for z in target_zones)} zones."

                unmet.append(UnmetDestination(
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    priority=zone.recommended_priority,
                    risk_score=zone.flood_risk_score,
                    estimated_exposed_population=zone.estimated_exposed_population,
                    deficit_reason=reason
                ))

        remaining_stock = ResourceStockSchema(
            available_rescue_teams=max(0, available_team_count - len(assigned_team_indices)),
            available_inflatable_boats=max(0, available_boats - allocated_boats_count),
            available_food_packets=max(0, available_food_packets - allocated_food),
            available_drinking_water_litres=max(0, available_water_litres - allocated_water),
            available_medical_kits=max(0, available_medical_kits - allocated_med),
            allocated_food_packets=allocated_food,
            allocated_water_litres=allocated_water,
            allocated_medical_kits=allocated_med,
            allocated_boats=allocated_boats_count,
            provenance="SIMULATED"
        )

        exec_time_ms = round((time.time() - start_time) * 1000.0, 1)

        return OptimisationResult(
            status="OPTIMAL" if solver_status == pywraplp.Solver.OPTIMAL else "FEASIBLE",
            solver_used="Google_OR_Tools_CBC_MILP",
            total_assigned_teams=len(assignments),
            total_unassigned_teams=max(0, available_team_count - len(assignments)),
            total_served_zones=len(served_zone_indices),
            unmet_zones_count=len(unmet),
            objective_value=round(solver.Objective().Value(), 2) if solver_status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE) else 0.0,
            assignments=assignments,
            unmet_destinations=unmet,
            remaining_stock=remaining_stock,
            provenance="MODEL_ESTIMATE",
            execution_time_ms=exec_time_ms
        )

resource_allocator = EmergencyResourceAllocator()
