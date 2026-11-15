"""
NADI-NET — Dynamic Event-Driven Emergency Replanning Engine
Handles unexpected road collapses, vehicle breakdowns, shelter closures, and new disaster events
using minimal-disruption MILP re-optimisation.
Strictly preserves completed missions, prevents double-counting, and prioritizes life safety.
EPSG:4326 geospatial context.
"""

import time
from typing import List, Dict, Any, Optional, Set
from backend.app.schemas.replanning import (
    DisruptionEvent,
    ReplanningRequest,
    ReplanningResult,
)
from backend.app.schemas.resources import (
    TeamAssignment,
    UnmetDestination,
    ShelterAssignment,
    ResourceStockSchema,
)
from backend.app.schemas.risk import ZoneRiskAssessment
from backend.app.services.resource_optimisation.allocator import EmergencyResourceAllocator
from backend.app.services.routing.rescue_router import rescue_router


class DynamicEmergencyReplanner:
    """
    Manages state updates and executes minimal-disruption replanning.
    """

    def __init__(self, allocator: Optional[EmergencyResourceAllocator] = None):
        self.allocator = allocator or EmergencyResourceAllocator()

    def replan(
        self,
        request: ReplanningRequest,
        current_assessed_zones: List[ZoneRiskAssessment],
        base_blocked_edges: List[str],
        base_teams: List[Dict[str, Any]],
        base_shelters: List[Dict[str, Any]],
        available_food: int = 5000,
        available_water: int = 12000,
        available_med: int = 800,
        available_boats: int = 12,
    ) -> ReplanningResult:
        start_time = time.time()
        blocked_edges: Set[str] = set(base_blocked_edges)
        teams_pool: Dict[str, Dict[str, Any]] = {t["id"]: dict(t) for t in base_teams}
        shelters_pool: Dict[str, Dict[str, Any]] = {s["id"]: dict(s) for s in base_shelters}
        demand_overrides: Dict[int, int] = {}
        avail_food = max(0, available_food)
        avail_water = max(0, available_water)
        avail_med = max(0, available_med)
        avail_boats = max(0, available_boats)

        events_summary: List[str] = []

        # 1. Process all incoming disruption events
        for ev in request.events:
            ev_type = ev.event_type.strip().upper()
            target = ev.affected_entity_id

            if ev_type == "ROAD_BLOCKED":
                blocked_edges.add(target)
                events_summary.append(f"Road {target} blocked: {ev.description}")
            elif ev_type == "ROAD_REOPENED":
                blocked_edges.discard(target)
                events_summary.append(f"Road {target} reopened: {ev.description}")
            elif ev_type == "TEAM_UNAVAILABLE":
                if target in teams_pool:
                    teams_pool[target]["status"] = "UNAVAILABLE"
                    events_summary.append(f"Team {target} disabled: {ev.description}")
            elif ev_type == "TEAM_AVAILABLE":
                if target in teams_pool:
                    teams_pool[target]["status"] = "AVAILABLE"
                    events_summary.append(f"Team {target} restored: {ev.description}")
            elif ev_type == "SHELTER_CLOSED":
                if target in shelters_pool:
                    shelters_pool[target]["status"] = "CLOSED"
                    events_summary.append(f"Shelter {target} closed: {ev.description}")
            elif ev_type == "SHELTER_REOPENED":
                if target in shelters_pool:
                    shelters_pool[target]["status"] = "READY"
                    events_summary.append(f"Shelter {target} reopened: {ev.description}")
            elif ev_type == "SHELTER_CAPACITY_CHANGED":
                if target in shelters_pool and ev.new_state is not None:
                    shelters_pool[target]["capacity"] = max(0, int(ev.new_state))
                    events_summary.append(f"Shelter {target} capacity updated to {ev.new_state}")
            elif ev_type == "INVENTORY_CHANGED":
                if isinstance(ev.new_state, dict):
                    if "food" in ev.new_state:
                        avail_food = max(0, int(ev.new_state["food"]))
                    if "water" in ev.new_state:
                        avail_water = max(0, int(ev.new_state["water"]))
                    if "med" in ev.new_state:
                        avail_med = max(0, int(ev.new_state["med"]))
                    events_summary.append("Emergency inventory stock adjusted.")
            elif ev_type in ("ZONE_DEMAND_UPDATED", "NEW_EMERGENCY_ZONE"):
                try:
                    zid = int(target)
                    new_dem = max(0, int(ev.new_state or 0))
                    demand_overrides[zid] = new_dem
                    events_summary.append(f"Zone {zid} demand updated to {new_dem}.")
                except (ValueError, TypeError):
                    pass

        # 2. Assignment Preservation & Route Safety Verification
        # Separate completed assignments from active ones
        completed_set = set(request.completed_team_ids)
        preserved_assignments: List[TeamAssignment] = []
        cancelled_assignments: List[TeamAssignment] = []
        previous_team_zone_map: Dict[str, int] = {}

        for a in request.active_assignments:
            previous_team_zone_map[a.team_id] = a.assigned_zone_id

            # If team mission was already completed, strictly preserve it
            if a.team_id in completed_set:
                preserved_assignments.append(a)
                continue

            # Check if team is still operational
            team_info = teams_pool.get(a.team_id)
            if not team_info or team_info.get("status") != "AVAILABLE":
                cancelled_assignments.append(a)
                continue

            # Verify that team's route to assigned zone remains unsevered
            dest_node = a.destination_node_id
            base_node = team_info.get("base_node_id", "N01")
            is_route_safe = True
            for edge_id in a.route_nodes:
                if edge_id in blocked_edges:
                    is_route_safe = False
                    break

            if not is_route_safe:
                cancelled_assignments.append(a)
            else:
                preserved_assignments.append(a)

        # 3. Account for completed evacuations to avoid double-counting
        if request.evacuated_persons_count > 0:
            for z in current_assessed_zones:
                if z.zone_id in demand_overrides:
                    demand_overrides[z.zone_id] = max(0, demand_overrides[z.zone_id] - request.evacuated_persons_count)

        # 4. Prepare available teams for re-optimisation
        # Preserved teams have already been assigned; only unassigned available teams can be routed for new demand
        preserved_team_ids = {a.team_id for a in preserved_assignments}
        candidate_teams = [
            t for t in teams_pool.values()
            if t["id"] not in preserved_team_ids and t.get("status") in ("AVAILABLE", "READY")
        ]

        # Deduct supplies allocated to preserved teams to prevent inventory inflation
        for p in preserved_assignments:
            avail_food = max(0, avail_food - p.allocated_supplies.get("food_packets", 0))
            avail_water = max(0, avail_water - p.allocated_supplies.get("water_litres", 0))
            avail_med = max(0, avail_med - p.allocated_supplies.get("medical_kits", 0))

        # 5. Run OR-Tools Allocator on modified network
        candidate_shelters = list(shelters_pool.values())
        opt_res = self.allocator.optimize_allocation(
            assessed_zones=current_assessed_zones,
            available_team_count=len(candidate_teams),
            blocked_edge_ids=list(blocked_edges),
            available_food_packets=avail_food,
            available_water_litres=avail_water,
            available_medical_kits=avail_med,
            available_boats=avail_boats,
            teams_override=candidate_teams,
            shelters_override=candidate_shelters,
            evacuation_demand_override=demand_overrides if demand_overrides else None,
        )

        new_assignments = opt_res.assignments
        all_active_assignments = preserved_assignments + new_assignments

        # 6. Build execution summary and return result
        exec_time = round((time.time() - start_time) * 1000.0, 1)
        summary = (
            f"Dynamic replanning executed in {exec_time} ms. "
            f"Processed {len(request.events)} disruption events. "
            f"Preserved {len(preserved_assignments)} assignments, "
            f"cancelled {len(cancelled_assignments)} unsafe/disabled assignments, "
            f"deployed {len(new_assignments)} new/re-routed teams."
        )

        return ReplanningResult(
            status=opt_res.status,
            solver_used=opt_res.solver_used,
            preserved_assignments=preserved_assignments,
            new_assignments=new_assignments,
            cancelled_assignments=cancelled_assignments,
            active_assignments=all_active_assignments,
            updated_unmet_destinations=opt_res.unmet_destinations,
            shelter_assignments=opt_res.shelter_assignments,
            remaining_stock=opt_res.remaining_stock,
            replanning_summary=summary,
            events_processed=len(request.events),
            execution_time_ms=exec_time,
            provenance="MODEL_ESTIMATE",
        )


replanner_service = DynamicEmergencyReplanner()
