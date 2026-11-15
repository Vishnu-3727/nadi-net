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
    ShelterAssignment,
    ZoneEvacuationStatus,
)
from backend.app.services.routing.rescue_router import rescue_router
from backend.app.services.geospatial.geo_service import geo_service

class EmergencyResourceAllocator:
    """
    Mixed-Integer Linear Programming (MILP) Emergency Resource Allocator for Chennai.
    Uses Google OR-Tools CBC (COIN-OR Branch and Cut) solver.

    MATHEMATICAL FORMULATION (Phase 3.1):
    Decision Variables:
      x[i, j] in {0, 1} : Binary variable; 1 if available rescue team i is dispatched to zone j
      y[j, k] in Z+     : Integer variable; number of evacuees transported from zone j to shelter k
      s[j]    in Z+     : Integer variable; unmet evacuation demand (persons) in zone j
      w[j, r] in Z+     : Integer variable; units of emergency resource r delivered to zone j

    Objective Function:
      Maximize Z =
          Sum_j Sum_k [ V_evac(j) * y[j, k] ]
        - Sum_j       [ V_unmet(j) * s[j] ]
        + Sum_i Sum_j [ V_assign(j) * x[i, j] ]
        - Sum_i Sum_j [ Lambda_travel * TravelTime(i, j) * x[i, j] ]
        + Sum_j Sum_r [ V_res(j, r) * w[j, r] ]

    Constraints:
      1. Single Team Assignment:
         Sum_j x[i, j] <= 1, for all available teams i
      2. Zone Team Demand Upper Bound:
         Sum_i x[i, j] <= MaxTeams(j), for all zones j
      3. Evacuation Demand Conservation:
         Sum_k y[j, k] + s[j] = Demand(j), for all zones j
      4. One-Trip Team Evacuation Capacity:
         Sum_k y[j, k] <= Sum_i [ Capacity(i) * x[i, j] ], for all zones j
      5. Shelter Physical Capacity:
         Sum_j y[j, k] <= AvailableCapacity(k), for all operational shelters k
      6. Ingress Reachability:
         x[i, j] = 0 if road network route from base i to zone j is infeasible
      7. Egress Shelter Reachability:
         y[j, k] = 0 if road network route from zone j to shelter k is infeasible
      8. Resource Inventory Availability:
         Sum_j w[j, r] <= AvailableStock(r), for all resource types r
      9. Supply Delivery Linkage:
         w[j, r] <= NeededStock(j, r) * Sum_i x[i, j], for all zones j and resources r
    """

    # Conservative assumption: default one-trip capacity if missing or non-positive
    DEFAULT_ONE_TRIP_CAPACITY = 10

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.teams_data = self._load_teams()
        self.facilities_data = self._load_facilities()

    def _load_teams(self) -> List[Dict[str, Any]]:
        path = self.data_dir / "rescue_teams.json"
        if not path.exists():
            raise FileNotFoundError(f"Rescue teams data not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_facilities(self) -> Dict[str, Any]:
        path = self.data_dir / "chennai_facilities.json"
        if not path.exists():
            return {"shelters": [], "hospitals": [], "rescue_bases": []}
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
        teams_override: Optional[List[Dict[str, Any]]] = None,
        shelters_override: Optional[List[Dict[str, Any]]] = None,
        evacuation_demand_override: Optional[Dict[int, int]] = None,
        resource_demand_override: Optional[Dict[int, Dict[str, int]]] = None,
    ) -> OptimisationResult:
        start_time = time.time()
        blocked_edges = list(set(blocked_edge_ids or []))

        # 1. Input Sanitization & Clamping (Prevent negative inventories/capacities)
        avail_food = max(0, int(available_food_packets or 0))
        avail_water = max(0, int(available_water_litres or 0))
        avail_med = max(0, int(available_medical_kits or 0))
        avail_boats = max(0, int(available_boats or 0))
        target_team_count = max(0, int(available_team_count or 0))

        # 2. Prepare Available Rescue Teams (Strict status & availability validation)
        team_source = teams_override if teams_override is not None else self.teams_data
        qualified_teams = []
        for t in team_source:
            status = str(t.get("status", "AVAILABLE")).strip().upper()
            if status in ("AVAILABLE", "READY"):
                # Handle team capacity conservatively
                cap_raw = t.get("capacity_persons_per_trip")
                try:
                    cap = int(cap_raw) if cap_raw is not None else self.DEFAULT_ONE_TRIP_CAPACITY
                except (ValueError, TypeError):
                    cap = self.DEFAULT_ONE_TRIP_CAPACITY
                if cap <= 0:
                    cap = self.DEFAULT_ONE_TRIP_CAPACITY
                t_copy = dict(t)
                t_copy["capacity_persons_per_trip"] = cap
                qualified_teams.append(t_copy)

        # Slice up to target_team_count; zero if target is zero
        active_teams = qualified_teams[:target_team_count] if target_team_count > 0 else []

        # 3. Prepare Operational Evacuation Shelters (Capacity clamping & status check)
        shelter_source = shelters_override if shelters_override is not None else self.facilities_data.get("shelters", [])
        operational_shelters = []
        for s in shelter_source:
            s_status = str(s.get("status", "READY")).strip().upper()
            if s_status in ("READY", "OPERATIONAL", "OPEN"):
                try:
                    total_cap = max(0, int(s.get("capacity", 0)))
                    occupancy = max(0, int(s.get("current_occupancy", 0)))
                except (ValueError, TypeError):
                    total_cap, occupancy = 0, 0
                avail_cap = max(0, total_cap - occupancy)
                if avail_cap > 0:
                    operational_shelters.append({
                        **s,
                        "available_capacity": avail_cap,
                        "total_capacity": total_cap
                    })

        # 4. Filter Target Zones Requiring Emergency Response
        target_zones = [z for z in assessed_zones if z.recommended_priority <= 3 or z.flood_risk_score >= 40.0]
        # Deterministic sorting: priority ascending, risk score descending, zone_id ascending
        target_zones.sort(key=lambda z: (z.recommended_priority, -z.flood_risk_score, z.zone_id))

        # Map each zone and shelter to its representative road network node
        zone_node_map: Dict[int, str] = {}
        for z in assessed_zones:
            nearest = geo_service.find_nearest_node(z.centroid)
            zone_node_map[z.zone_id] = nearest["id"] if nearest else "N01"

        shelter_node_map: Dict[str, str] = {}
        for s in operational_shelters:
            nearest = geo_service.find_nearest_node(s["coordinates"])
            shelter_node_map[s["id"]] = nearest["id"] if nearest else "N01"

        # 5. Determine Evacuation and Resource Demands per Zone
        zone_demand_map: Dict[int, int] = {}
        zone_res_demand_map: Dict[int, Dict[str, int]] = {}

        for z in target_zones:
            # Evacuation demand in persons
            if evacuation_demand_override and z.zone_id in evacuation_demand_override:
                d_persons = max(0, int(evacuation_demand_override[z.zone_id]))
            else:
                if z.recommended_priority == 1:
                    d_persons = 35
                elif z.recommended_priority == 2:
                    d_persons = 20
                elif z.recommended_priority == 3:
                    d_persons = 10
                else:
                    d_persons = 0
            zone_demand_map[z.zone_id] = d_persons

            # Resource demands
            if resource_demand_override and z.zone_id in resource_demand_override:
                ov = resource_demand_override[z.zone_id]
                zone_res_demand_map[z.zone_id] = {
                    "food": max(0, int(ov.get("food", 0))),
                    "water": max(0, int(ov.get("water", 0))),
                    "med": max(0, int(ov.get("med", 0))),
                }
            else:
                if z.recommended_priority == 1:
                    zone_res_demand_map[z.zone_id] = {"food": 400, "water": 1000, "med": 50}
                elif z.recommended_priority == 2:
                    zone_res_demand_map[z.zone_id] = {"food": 250, "water": 600, "med": 25}
                elif z.recommended_priority == 3:
                    zone_res_demand_map[z.zone_id] = {"food": 100, "water": 250, "med": 10}
                else:
                    zone_res_demand_map[z.zone_id] = {"food": 0, "water": 0, "med": 0}

        # 6. Precompute Ingress (Base -> Zone) and Egress (Zone -> Shelter) Reachability
        num_teams = len(active_teams)
        num_zones = len(target_zones)
        num_shelters = len(operational_shelters)

        ingress_time_matrix: Dict[Tuple[int, int], float] = {}
        ingress_reach_matrix: Dict[Tuple[int, int], bool] = {}
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
                        ingress_time_matrix[(i, j)] = resp.primary_route.estimated_travel_time_min
                        ingress_reach_matrix[(i, j)] = True
                        route_cache[(i, j)] = resp.primary_route
                    else:
                        ingress_time_matrix[(i, j)] = 9999.0
                        ingress_reach_matrix[(i, j)] = False
                except Exception:
                    ingress_time_matrix[(i, j)] = 9999.0
                    ingress_reach_matrix[(i, j)] = False

        egress_reach_matrix: Dict[Tuple[int, int], bool] = {}
        for j, zone in enumerate(target_zones):
            z_node = zone_node_map[zone.zone_id]
            for k, shelter in enumerate(operational_shelters):
                s_node = shelter_node_map[shelter["id"]]
                if z_node == s_node:
                    egress_reach_matrix[(j, k)] = True
                else:
                    route_req = RouteRequest(
                        origin_node_id=z_node,
                        destination_node_id=s_node,
                        vehicle_type="NORMAL_RESCUE",
                        avoid_blocked_edges=True,
                        blocked_edges_override=blocked_edges
                    )
                    try:
                        resp = rescue_router.compute_route(route_req, blocked_edges)
                        egress_reach_matrix[(j, k)] = resp.primary_route.is_feasible
                    except Exception:
                        egress_reach_matrix[(j, k)] = False

        # 7. Check for Zero Available Teams Edge Case
        if num_teams == 0 or num_zones == 0:
            exec_time_ms = round((time.time() - start_time) * 1000.0, 1)
            unmet_list: List[UnmetDestination] = []
            evac_statuses: List[ZoneEvacuationStatus] = []
            total_dem = 0

            for zone in target_zones:
                dem = zone_demand_map.get(zone.zone_id, 0)
                total_dem += dem
                if dem > 0 or zone.recommended_priority <= 3:
                    unmet_list.append(UnmetDestination(
                        zone_id=zone.zone_id,
                        zone_name=zone.name,
                        priority=zone.recommended_priority,
                        risk_score=zone.flood_risk_score,
                        estimated_exposed_population=zone.estimated_exposed_population,
                        deficit_reason="Capacity Exhaustion: Zero rescue teams available in active deployment inventory.",
                        unmet_demand_persons=dem
                    ))
                evac_statuses.append(ZoneEvacuationStatus(
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    priority=zone.recommended_priority,
                    demand_persons=dem,
                    served_persons=0,
                    unmet_persons=dem,
                    is_fully_served=(dem == 0)
                ))

            rem_stock = ResourceStockSchema(
                available_rescue_teams=0,
                available_inflatable_boats=avail_boats,
                available_food_packets=avail_food,
                available_drinking_water_litres=avail_water,
                available_medical_kits=avail_med,
                allocated_food_packets=0,
                allocated_water_litres=0,
                allocated_medical_kits=0,
                allocated_boats=0,
                provenance="SIMULATED"
            )

            return OptimisationResult(
                status="OPTIMAL",
                solver_used="Google_OR_Tools_CBC_MILP",
                total_assigned_teams=0,
                total_unassigned_teams=0,
                total_served_zones=0,
                unmet_zones_count=len(unmet_list),
                objective_value=0.0,
                assignments=[],
                unmet_destinations=unmet_list,
                remaining_stock=rem_stock,
                provenance="MODEL_ESTIMATE",
                execution_time_ms=exec_time_ms,
                shelter_assignments=[],
                zone_evacuation_statuses=evac_statuses,
                total_demand_persons=total_dem,
                total_served_persons=0,
                total_unmet_persons=total_dem,
                solver_diagnostics="Zero available teams requested. Zero assignments generated with 100% unmet demand reported."
            )

        # 8. Formulate Google OR-Tools CBC Mixed-Integer Linear Program
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            # Fallback to SCIP if CBC not bundled; NEVER substitute continuous GLOP for MIP
            solver = pywraplp.Solver.CreateSolver("SCIP")

        if not solver:
            raise RuntimeError("No mixed-integer linear programming (MIP) solver available in OR-Tools (CBC/SCIP required).")

        # Decision Variables:
        # x[i, j] in {0, 1} : Team i assigned to zone j
        x: Dict[Tuple[int, int], Any] = {}
        for i in range(num_teams):
            for j in range(num_zones):
                x[i, j] = solver.BoolVar(f"x_{i}_{j}")

        # y[j, k] in Z+ : Evacuees from zone j to shelter k
        y: Dict[Tuple[int, int], Any] = {}
        for j in range(num_zones):
            d_j = zone_demand_map.get(target_zones[j].zone_id, 0)
            for k in range(num_shelters):
                s_cap = operational_shelters[k]["available_capacity"]
                y[j, k] = solver.IntVar(0, min(d_j, s_cap), f"y_{j}_{k}")

        # s[j] in Z+ : Unmet evacuation demand in zone j
        s: Dict[int, Any] = {}
        for j in range(num_zones):
            d_j = zone_demand_map.get(target_zones[j].zone_id, 0)
            s[j] = solver.IntVar(0, d_j, f"s_{j}")

        # w[j, r] in Z+ : Resource r delivered to zone j
        res_types = ["food", "water", "med"]
        res_stocks = {"food": avail_food, "water": avail_water, "med": avail_med}
        w: Dict[Tuple[int, str], Any] = {}
        for j in range(num_zones):
            z_id = target_zones[j].zone_id
            for r in res_types:
                needed = zone_res_demand_map[z_id][r]
                upper = min(needed, res_stocks[r])
                w[j, r] = solver.IntVar(0, upper, f"w_{j}_{r}")

        # Constraint 1: Single Team Assignment (Each team assigned to at most 1 zone)
        for i in range(num_teams):
            solver.Add(solver.Sum([x[i, j] for j in range(num_zones)]) <= 1)

        # Constraint 2: Zone Team Demand Upper Bound (P1: up to 2 teams, others: 1)
        for j in range(num_zones):
            zone = target_zones[j]
            max_teams = 2 if zone.recommended_priority == 1 else 1
            solver.Add(solver.Sum([x[i, j] for i in range(num_teams)]) <= max_teams)

        # Constraint 3: Evacuation Demand Conservation (Sum_k y[j, k] + s[j] = Demand[j])
        for j in range(num_zones):
            z_id = target_zones[j].zone_id
            d_j = zone_demand_map.get(z_id, 0)
            if num_shelters > 0:
                solver.Add(solver.Sum([y[j, k] for k in range(num_shelters)]) + s[j] == d_j)
            else:
                solver.Add(s[j] == d_j)

        # Constraint 4: One-Trip Team Evacuation Capacity (Sum_k y[j, k] <= Sum_i C_i * x[i, j])
        for j in range(num_zones):
            if num_shelters > 0:
                cap_terms = [active_teams[i]["capacity_persons_per_trip"] * x[i, j] for i in range(num_teams)]
                solver.Add(solver.Sum([y[j, k] for k in range(num_shelters)]) <= solver.Sum(cap_terms))

        # Constraint 5: Shelter Physical Capacity (Sum_j y[j, k] <= AvailableCapacity[k])
        for k in range(num_shelters):
            avail_k = operational_shelters[k]["available_capacity"]
            solver.Add(solver.Sum([y[j, k] for j in range(num_zones)]) <= avail_k)

        # Constraint 6: Ingress Reachability (x[i, j] == 0 if route from base i to zone j is severed)
        for i in range(num_teams):
            for j in range(num_zones):
                if not ingress_reach_matrix.get((i, j), False):
                    solver.Add(x[i, j] == 0)

        # Constraint 7: Egress Shelter Reachability (y[j, k] == 0 if route from zone j to shelter k is severed)
        for j in range(num_zones):
            for k in range(num_shelters):
                if not egress_reach_matrix.get((j, k), False):
                    solver.Add(y[j, k] == 0)

        # Constraint 8: Total Resource Inventory Availability (Sum_j w[j, r] <= AvailableStock[r])
        for r in res_types:
            solver.Add(solver.Sum([w[j, r] for j in range(num_zones)]) <= res_stocks[r])

        # Constraint 9: Supply Delivery Linkage (w[j, r] <= Needed[j, r] * Sum_i x[i, j])
        # Ensures supplies cannot be delivered without a team present to receive & distribute them
        for j in range(num_zones):
            z_id = target_zones[j].zone_id
            for r in res_types:
                needed = zone_res_demand_map[z_id][r]
                solver.Add(w[j, r] <= needed * solver.Sum([x[i, j] for i in range(num_teams)]))

        # 9. Formulate Objective Function
        # Explanatory Units:
        # V_evac: Value per evacuee served (Life safety)
        # V_unmet: Penalty per unmet evacuee
        # V_assign: Value per team operational presence
        # Lambda_travel: Penalty per transit minute
        # V_res: Value per unit of food, water, medical kits delivered
        objective = solver.Objective()

        for j in range(num_zones):
            zone = target_zones[j]
            p = zone.recommended_priority
            d_j = zone_demand_map.get(zone.zone_id, 0)

            if p == 1:
                v_evac = 50.0
                v_unmet = 100.0
                v_assign = 500.0
                v_food, v_water, v_med = 0.20, 0.10, 2.00
            elif p == 2:
                v_evac = 30.0
                v_unmet = 60.0
                v_assign = 250.0
                v_food, v_water, v_med = 0.10, 0.05, 1.00
            elif p == 3:
                v_evac = 15.0
                v_unmet = 30.0
                v_assign = 100.0
                v_food, v_water, v_med = 0.05, 0.02, 0.50
            else:
                v_evac = 5.0
                v_unmet = 10.0
                v_assign = 25.0
                v_food, v_water, v_med = 0.01, 0.01, 0.10

            # Suppress assignment reward if zone has zero demand and zero supply need
            if d_j == 0 and sum(zone_res_demand_map[zone.zone_id].values()) == 0:
                v_assign = 0.0

            # Objective: Evacuees served
            for k in range(num_shelters):
                objective.SetCoefficient(y[j, k], v_evac)

            # Objective: Unmet penalty (negative in maximization)
            objective.SetCoefficient(s[j], -v_unmet)

            # Objective: Team presence minus travel transit time
            lambda_travel = 0.50
            for i in range(num_teams):
                t_time = ingress_time_matrix.get((i, j), 100.0)
                net_team_coeff = v_assign - (lambda_travel * t_time)
                objective.SetCoefficient(x[i, j], net_team_coeff)

            # Objective: Resource deliveries
            objective.SetCoefficient(w[j, "food"], v_food)
            objective.SetCoefficient(w[j, "water"], v_water)
            objective.SetCoefficient(w[j, "med"], v_med)

        objective.SetMaximization()

        # 10. Solve
        solver_status = solver.Solve()

        exec_time_ms = round((time.time() - start_time) * 1000.0, 1)

        # 11. Process Results
        is_solution_found = solver_status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE)

        if solver_status == pywraplp.Solver.OPTIMAL:
            status_str = "OPTIMAL"
        elif solver_status == pywraplp.Solver.FEASIBLE:
            status_str = "FEASIBLE"
        elif solver_status == pywraplp.Solver.INFEASIBLE:
            status_str = "INFEASIBLE"
        else:
            status_str = "ABNORMAL"

        assignments: List[TeamAssignment] = []
        assigned_team_indices = set()
        served_zone_indices = set()

        allocated_food = 0
        allocated_water = 0
        allocated_med = 0
        allocated_boats_count = 0

        # Zone-level resource deliveries extracted from solver
        zone_deliv: Dict[int, Dict[str, int]] = {z.zone_id: {"food": 0, "water": 0, "med": 0} for z in target_zones}
        zone_teams_assigned: Dict[int, List[int]] = {z.zone_id: [] for z in target_zones}

        if is_solution_found:
            for j in range(num_zones):
                z_id = target_zones[j].zone_id
                for r in res_types:
                    val = int(round(w[j, r].solution_value()))
                    zone_deliv[z_id][r] = val
                    if r == "food":
                        allocated_food += val
                    elif r == "water":
                        allocated_water += val
                    elif r == "med":
                        allocated_med += val

            # Identify team assignments
            for i in range(num_teams):
                for j in range(num_zones):
                    if x[i, j].solution_value() > 0.5:
                        z_id = target_zones[j].zone_id
                        assigned_team_indices.add(i)
                        served_zone_indices.add(j)
                        zone_teams_assigned[z_id].append(i)

            # Build TeamAssignment objects
            for z_id, t_indices in zone_teams_assigned.items():
                if not t_indices:
                    continue
                zone = next(z for z in target_zones if z.zone_id == z_id)
                n_teams_in_zone = len(t_indices)

                # Divide supplies equitably among teams assigned to the zone with exact remainder preservation
                for order_idx, i in enumerate(t_indices):
                    team = active_teams[i]
                    j = next(idx for idx, z in enumerate(target_zones) if z.zone_id == z_id)
                    route = route_cache.get((i, j))

                    # Boats allocation bounded by available stock
                    has_boat_spec = "BOAT" in team.get("specialty", "") or "INFLATABLE" in str(team.get("equipment", []))
                    boats_for_team = 2 if has_boat_spec else 1
                    if allocated_boats_count + boats_for_team <= avail_boats:
                        allocated_boats_count += boats_for_team
                    else:
                        boats_for_team = max(0, avail_boats - allocated_boats_count)
                        allocated_boats_count += boats_for_team

                    rem_food = 1 if order_idx < (zone_deliv[z_id]["food"] % n_teams_in_zone) else 0
                    rem_water = 1 if order_idx < (zone_deliv[z_id]["water"] % n_teams_in_zone) else 0
                    rem_med = 1 if order_idx < (zone_deliv[z_id]["med"] % n_teams_in_zone) else 0

                    team_food = (zone_deliv[z_id]["food"] // n_teams_in_zone) + rem_food
                    team_water = (zone_deliv[z_id]["water"] // n_teams_in_zone) + rem_water
                    team_med = (zone_deliv[z_id]["med"] // n_teams_in_zone) + rem_med

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
                            "food_packets": team_food,
                            "water_litres": team_water,
                            "medical_kits": team_med,
                            "inflatable_boats": boats_for_team
                        },
                        route_nodes=route_nodes,
                        assignment_justification=f"Optimized by Google OR-Tools CBC. Prioritized Priority {zone.recommended_priority} risk ({zone.flood_risk_score}/100) with transit time {arrival_time} min and trip capacity {team['capacity_persons_per_trip']} persons.",
                        evacuees_transported=0
                    ))

        # Extract Shelter Assignments
        shelter_assignments_list: List[ShelterAssignment] = []
        shelter_occupied_counts: Dict[str, int] = {s["id"]: 0 for s in operational_shelters}

        if is_solution_found:
            for j in range(num_zones):
                zone = target_zones[j]
                for k in range(num_shelters):
                    val = int(round(y[j, k].solution_value()))
                    if val > 0:
                        sh = operational_shelters[k]
                        shelter_occupied_counts[sh["id"]] += val
                        shelter_assignments_list.append(ShelterAssignment(
                            shelter_id=sh["id"],
                            shelter_name=sh["name"],
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            evacuees_assigned=val,
                            shelter_capacity=sh["available_capacity"],
                            shelter_remaining_capacity=max(0, sh["available_capacity"] - shelter_occupied_counts[sh["id"]])
                        ))

        # Extract Zone Evacuation Statuses and Unmet Destinations
        zone_evacuation_statuses_list: List[ZoneEvacuationStatus] = []
        unmet_list: List[UnmetDestination] = []
        total_demand_all = 0
        total_served_all = 0
        total_unmet_all = 0

        for j in range(num_zones):
            zone = target_zones[j]
            z_id = zone.zone_id
            d_j = zone_demand_map.get(z_id, 0)
            total_demand_all += d_j

            if is_solution_found:
                served_j = sum(int(round(y[j, k].solution_value())) for k in range(num_shelters))
                unmet_j = int(round(s[j].solution_value()))
            else:
                served_j = 0
                unmet_j = d_j

            total_served_all += served_j
            total_unmet_all += unmet_j

            is_full = (unmet_j == 0)
            zone_evacuation_statuses_list.append(ZoneEvacuationStatus(
                zone_id=z_id,
                zone_name=zone.name,
                priority=zone.recommended_priority,
                demand_persons=d_j,
                served_persons=served_j,
                unmet_persons=unmet_j,
                is_fully_served=is_full
            ))

            if unmet_j > 0 or j not in served_zone_indices:
                is_reachable = any(ingress_reach_matrix.get((i, j), False) for i in range(num_teams))
                if not is_reachable:
                    deficit_reason = f"Topological Severance: Zone is isolated from all operational rescue bases by active road blockages ({', '.join(blocked_edges)})."
                elif len(assigned_team_indices) >= target_team_count:
                    deficit_reason = f"Capacity Exhaustion: Available {target_team_count} teams were prioritized to higher-severity Priority 1 critical zones."
                else:
                    deficit_reason = f"Capacity Shortfall: {served_j}/{d_j} evacuees served; remaining {unmet_j} unserved due to team trip capacity limits."

                unmet_list.append(UnmetDestination(
                    zone_id=z_id,
                    zone_name=zone.name,
                    priority=zone.recommended_priority,
                    risk_score=zone.flood_risk_score,
                    estimated_exposed_population=zone.estimated_exposed_population,
                    deficit_reason=deficit_reason,
                    unmet_demand_persons=unmet_j
                ))

        # Remaining Stock calculation
        rem_stock = ResourceStockSchema(
            available_rescue_teams=max(0, target_team_count - len(assigned_team_indices)),
            available_inflatable_boats=max(0, avail_boats - allocated_boats_count),
            available_food_packets=max(0, avail_food - allocated_food),
            available_drinking_water_litres=max(0, avail_water - allocated_water),
            available_medical_kits=max(0, avail_med - allocated_med),
            allocated_food_packets=allocated_food,
            allocated_water_litres=allocated_water,
            allocated_medical_kits=allocated_med,
            allocated_boats=allocated_boats_count,
            provenance="SIMULATED"
        )

        obj_val = round(solver.Objective().Value(), 2) if is_solution_found else 0.0

        return OptimisationResult(
            status=status_str,
            solver_used="Google_OR_Tools_CBC_MILP",
            total_assigned_teams=len(assignments),
            total_unassigned_teams=max(0, target_team_count - len(assigned_team_indices)),
            total_served_zones=len(served_zone_indices),
            unmet_zones_count=len(unmet_list),
            objective_value=obj_val,
            assignments=assignments,
            unmet_destinations=unmet_list,
            remaining_stock=rem_stock,
            provenance="MODEL_ESTIMATE",
            execution_time_ms=exec_time_ms,
            shelter_assignments=shelter_assignments_list,
            zone_evacuation_statuses=zone_evacuation_statuses_list,
            total_demand_persons=total_demand_all,
            total_served_persons=total_served_all,
            total_unmet_persons=total_unmet_all,
            solver_diagnostics=f"MILP solved to {status_str} in {exec_time_ms} ms. Total evacuees served: {total_served_all}/{total_demand_all}."
        )

resource_allocator = EmergencyResourceAllocator()
