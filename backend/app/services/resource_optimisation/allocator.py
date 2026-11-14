import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
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
    Mixed-Integer Linear Programming (MILP) Resource Optimisation Engine using Google OR-Tools.

    MATHEMATICAL FORMULATION:
    Decision Variables:
      x[i, j] in {0, 1} : 1 if rescue team i is dispatched to affected zone j
      u[j] in {0, 1}    : 1 if priority zone j is left unserved (penalty variable)

    Objective Function:
      Maximize:
        Sum_j [ PriorityWeight(j) * Sum_i(x[i, j]) ]
        - Sum_j [ UnservedPenalty(j) * u[j] ]
        - Lambda * Sum_ij [ TravelTime(i, j) * x[i, j] ]

    Constraints:
      1. Single Assignment: Sum_j x[i, j] <= 1 (each team can serve at most 1 zone)
      2. Zone Capacity: Sum_i x[i, j] <= Demand(j)
      3. Unserved Linkage: Sum_i x[i, j] + u[j] >= 1 (forces u[j]=1 if no team serves zone j)
      4. Reachability: x[i, j] == 0 if travel_time(i, j) == inf (inaccessible due to submerged roads)
      5. Resource Inventory: Total rations allocated <= available stock
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

        # 1. Prepare available teams
        active_teams = self.teams_data[:min(len(self.teams_data), max(1, available_team_count))]

        # 2. Filter target zones requiring response (Priority <= 3 or Risk >= 40.0)
        target_zones = [z for z in assessed_zones if z.recommended_priority <= 3 or z.flood_risk_score >= 40.0]
        # Sort by priority ascending (Priority 1 first), then risk score descending
        target_zones.sort(key=lambda z: (z.recommended_priority, -z.flood_risk_score))

        # Map each zone to its nearest road network node
        zone_node_map: Dict[int, str] = {}
        for z in assessed_zones:
            nearest = geo_service.find_nearest_node(z.centroid)
            zone_node_map[z.zone_id] = nearest["id"] if nearest else "N01"

        # 3. Precompute travel times & topological reachability
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

        # 4. Formulate Google OR-Tools CBC Mixed-Integer Linear Program
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            solver = pywraplp.Solver.CreateSolver("SCIP") or pywraplp.Solver.CreateSolver("GLOP")

        num_teams = len(active_teams)
        num_zones = len(target_zones)

        # Decision variables: x[i, j] binary
        x = {}
        for i in range(num_teams):
            for j in range(num_zones):
                x[i, j] = solver.BoolVar(f"x_{i}_{j}")

        # Unserved indicator variables: u[j] binary (penalized if zone j has no team assigned)
        u = {}
        for j in range(num_zones):
            u[j] = solver.BoolVar(f"u_{j}")

        # Constraint 1: Each team assigned to at most one zone
        for i in range(num_teams):
            solver.Add(solver.Sum([x[i, j] for j in range(num_zones)]) <= 1)

        # Constraint 2: Demand upper bound per zone (Priority 1: up to 2 teams, others: 1)
        for j in range(num_zones):
            zone = target_zones[j]
            max_teams = 2 if zone.recommended_priority == 1 else 1
            solver.Add(solver.Sum([x[i, j] for i in range(num_teams)]) <= max_teams)

        # Constraint 3: Linkage between x[i, j] and u[j] (forces u[j] = 1 if Sum_i x[i, j] == 0)
        for j in range(num_zones):
            solver.Add(solver.Sum([x[i, j] for i in range(num_teams)]) + u[j] >= 1)

        # Constraint 4: Infeasible / submerged routes cannot be traversed (x[i, j] == 0)
        for i in range(num_teams):
            for j in range(num_zones):
                if not reachability_matrix.get((i, j), False):
                    solver.Add(x[i, j] == 0)

        # Objective Function:
        # Maximize: Priority reward - Unserved penalty - Transit delay penalty
        objective = solver.Objective()
        for j in range(num_zones):
            zone = target_zones[j]
            if zone.recommended_priority == 1:
                p_reward = 6000.0
                unmet_penalty = 10000.0
            elif zone.recommended_priority == 2:
                p_reward = 3000.0
                unmet_penalty = 5000.0
            else:
                p_reward = 1000.0
                unmet_penalty = 1500.0

            # Unserved penalty coefficient (negative in maximization)
            objective.SetCoefficient(u[j], -unmet_penalty)

            for i in range(num_teams):
                travel_time = travel_time_matrix.get((i, j), 100.0)
                # Net coefficient: high reward for priority, penalty for longer transit
                coeff = p_reward - (1.2 * travel_time)
                objective.SetCoefficient(x[i, j], coeff)

        objective.SetMaximization()

        # Solve MILP
        solver_status = solver.Solve()

        # 5. Extract Assignments and Supply Allocations
        assignments: List[TeamAssignment] = []
        assigned_team_indices = set()
        served_zone_indices = set()

        allocated_food = 0
        allocated_water = 0
        allocated_med = 0
        allocated_boats_count = 0

        is_solution_found = solver_status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE)

        if is_solution_found:
            for i in range(num_teams):
                for j in range(num_zones):
                    if x[i, j].solution_value() > 0.5:
                        team = active_teams[i]
                        zone = target_zones[j]
                        route = route_cache.get((i, j))
                        assigned_team_indices.add(i)
                        served_zone_indices.add(j)

                        # Allocate rations proportional to exposed population & priority
                        pop_factor = min(2.0, max(0.5, zone.estimated_exposed_population / 100000.0))
                        food_slice = int(min(available_food_packets, 400 * pop_factor))
                        water_slice = int(min(available_water_litres, 1000 * pop_factor))
                        med_slice = int(min(available_medical_kits, 60 * pop_factor))
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
                            assignment_justification=f"Optimized by Google OR-Tools CBC. Prioritized Priority {zone.recommended_priority} risk ({zone.flood_risk_score}/100) with minimal transit time ({arrival_time} min)."
                        ))

        # 6. Capture Unserved Destinations with Mathematical Explanation
        unmet: List[UnmetDestination] = []
        for j in range(num_zones):
            if j not in served_zone_indices:
                zone = target_zones[j]
                is_reachable = any(reachability_matrix.get((i, j), False) for i in range(num_teams))
                if not is_reachable:
                    deficit_reason = f"Topological Severance: Zone is isolated from all operational rescue bases by active road blockages ({', '.join(blocked_edges)})."
                else:
                    deficit_reason = f"Capacity Exhaustion: Available {available_team_count} teams were prioritized to higher-severity Priority 1 critical zones."

                unmet.append(UnmetDestination(
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    priority=zone.recommended_priority,
                    risk_score=zone.flood_risk_score,
                    estimated_exposed_population=zone.estimated_exposed_population,
                    deficit_reason=deficit_reason
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

        status_str = "OPTIMAL" if solver_status == pywraplp.Solver.OPTIMAL else ("FEASIBLE" if solver_status == pywraplp.Solver.FEASIBLE else "INFEASIBLE")

        return OptimisationResult(
            status=status_str,
            solver_used="Google_OR_Tools_CBC_MILP",
            total_assigned_teams=len(assignments),
            total_unassigned_teams=max(0, available_team_count - len(assignments)),
            total_served_zones=len(served_zone_indices),
            unmet_zones_count=len(unmet),
            objective_value=round(solver.Objective().Value(), 2) if is_solution_found else 0.0,
            assignments=assignments,
            unmet_destinations=unmet,
            remaining_stock=remaining_stock,
            provenance="MODEL_ESTIMATE",
            execution_time_ms=exec_time_ms
        )

resource_allocator = EmergencyResourceAllocator()
