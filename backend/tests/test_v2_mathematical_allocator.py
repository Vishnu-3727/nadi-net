"""
NADI-NET — Phase 3.1 Mathematical Allocator Test Suite
Deterministic validation of OR-Tools CBC/SCIP Mixed-Integer Linear Program.

Tests all 18 mandatory mathematical specifications:
1. test_zero_available_teams_produces_zero_assignments
2. test_partial_unmet_demand_reported
3. test_demand_conservation_served_plus_unmet_equals_total
4. test_team_evacuation_capacity_never_exceeded
5. test_team_single_zone_assignment_constraint
6. test_shelter_occupancy_never_exceeds_capacity
7. test_closed_shelters_receive_zero_evacuees
8. test_fully_occupied_shelters_receive_zero_evacuees
9. test_delivered_food_never_exceeds_stock
10. test_delivered_water_never_exceeds_stock
11. test_delivered_medical_kits_never_exceeds_stock
12. test_multiple_zones_cannot_exceed_collective_inventory
13. test_unreachable_zones_not_assigned_infeasible_teams
14. test_higher_priority_demand_preferred
15. test_zero_demand_produces_no_unnecessary_assignments
16. test_missing_optional_inventory_handled_safely
17. test_no_mip_solver_error_handling
18. test_deterministic_repeatability_on_equivalent_inputs
"""

import pytest
from unittest.mock import patch
from typing import List, Dict, Any

from backend.app.services.flood_intelligence.risk_engine import FloodIntelligenceEngine
from backend.app.services.resource_optimisation.allocator import EmergencyResourceAllocator
from backend.app.schemas.risk import ZoneRiskAssessment, ContributingFactors


@pytest.fixture
def engine():
    return FloodIntelligenceEngine()


@pytest.fixture
def allocator():
    return EmergencyResourceAllocator()


def make_mock_zone(
    zone_id: int,
    name: str,
    priority: int,
    risk_score: float,
    centroid: List[float],
    population: int = 100000,
    exposed: int = 5000,
) -> ZoneRiskAssessment:
    """Helper to create a deterministic ZoneRiskAssessment for mathematical testing."""
    return ZoneRiskAssessment(
        zone_id=zone_id,
        name=name,
        region="Test Region",
        centroid=centroid,
        population=population,
        area_sq_km=20.0,
        baseline_elevation_m=6.0,
        flood_risk_score=risk_score,
        risk_category="High" if risk_score >= 60 else "Moderate",
        contributing_factors=ContributingFactors(
            rainfall_contribution=20.0,
            elevation_contribution=20.0,
            historical_contribution=20.0,
            drainage_contribution=15.0,
            water_level_contribution=15.0,
            vulnerability_contribution=10.0,
        ),
        estimated_exposed_population=exposed,
        recommended_priority=priority,
        data_confidence=0.95,
        data_source="TEST",
        provenance="SIMULATED",
    )


# ---------------------------------------------------------------------------
# Test 1: Zero Available Teams
# ---------------------------------------------------------------------------
def test_zero_available_teams_produces_zero_assignments(engine, allocator):
    """
    With 0 available teams, verify zero assignments, 0 served,
    100% unmet demand reported, status OPTIMAL, and no crash.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=0,
        blocked_edge_ids=[],
    )

    assert result.status == "OPTIMAL"
    assert len(result.assignments) == 0
    assert result.total_assigned_teams == 0
    assert result.total_served_persons == 0
    assert result.total_unmet_persons == result.total_demand_persons
    assert result.total_unmet_persons > 0
    assert len(result.unmet_destinations) > 0
    for u in result.unmet_destinations:
        assert "Zero rescue teams available" in u.deficit_reason


# ---------------------------------------------------------------------------
# Test 2: Partial Unmet Demand Reported
# ---------------------------------------------------------------------------
def test_partial_unmet_demand_reported(allocator):
    """
    Demand = 100, team capacity = 40.
    Verify 40 served, 60 unmet, demand conservation holds.
    """
    # Zone 5 is near N01 (Chennai Central)
    zone = make_mock_zone(5, "Royapuram", priority=1, risk_score=85.0, centroid=[13.0827, 80.2755], exposed=1000)
    custom_teams = [
        {
            "id": "TEAM-T1",
            "name": "Test Rescue Team",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 40,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        }
    ]
    custom_shelters = [
        {
            "id": "SHLT-T1",
            "name": "Test Shelter",
            "zone_id": 5,
            "coordinates": [13.0827, 80.2755],
            "capacity": 200,
            "current_occupancy": 0,
            "status": "READY",
        }
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[zone],
        available_team_count=1,
        teams_override=custom_teams,
        shelters_override=custom_shelters,
        evacuation_demand_override={5: 100},
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.total_demand_persons == 100
    assert result.total_served_persons == 40
    assert result.total_unmet_persons == 60
    assert result.total_served_persons + result.total_unmet_persons == result.total_demand_persons
    assert len(result.zone_evacuation_statuses) == 1
    assert result.zone_evacuation_statuses[0].served_persons == 40
    assert result.zone_evacuation_statuses[0].unmet_persons == 60
    assert not result.zone_evacuation_statuses[0].is_fully_served


# ---------------------------------------------------------------------------
# Test 3: Demand Conservation
# ---------------------------------------------------------------------------
def test_demand_conservation_served_plus_unmet_equals_total(engine, allocator):
    """
    Verify for every zone that served + unmet == total_demand.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=250.0, water_level_index=0.7)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        blocked_edge_ids=["E18"],
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.total_served_persons + result.total_unmet_persons == result.total_demand_persons
    for status in result.zone_evacuation_statuses:
        assert status.served_persons + status.unmet_persons == status.demand_persons


# ---------------------------------------------------------------------------
# Test 4: Team Evacuation Capacity Upper Bound
# ---------------------------------------------------------------------------
def test_team_evacuation_capacity_never_exceeded(engine, allocator):
    """
    Verify total served across all zones <= sum of capacities of assigned teams.
    Also verify for each zone: served <= sum of capacities of teams assigned to that zone.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=280.0, water_level_index=0.8)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=8,
        blocked_edge_ids=["E03", "E18"],
    )

    # Calculate total capacity of assigned teams
    team_cap_map = {t["id"]: t.get("capacity_persons_per_trip", 10) for t in allocator.teams_data}
    total_assigned_capacity = sum(team_cap_map.get(a.team_id, 10) for a in result.assignments)

    assert result.total_served_persons <= total_assigned_capacity

    # Verify per-zone capacity
    zone_assigned_caps: Dict[int, int] = {}
    for a in result.assignments:
        zone_assigned_caps[a.assigned_zone_id] = zone_assigned_caps.get(a.assigned_zone_id, 0) + team_cap_map.get(a.team_id, 10)

    for status in result.zone_evacuation_statuses:
        zone_cap = zone_assigned_caps.get(status.zone_id, 0)
        assert status.served_persons <= zone_cap


# ---------------------------------------------------------------------------
# Test 5: Team Single Zone Assignment Constraint
# ---------------------------------------------------------------------------
def test_team_single_zone_assignment_constraint(engine, allocator):
    """
    Verify each team is assigned to at most one zone (no duplicate assignments).
    """
    summary = engine.evaluate_all_zones(rainfall_mm=300.0, water_level_index=0.85)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=10,
    )

    assigned_team_ids = [a.team_id for a in result.assignments]
    assert len(assigned_team_ids) == len(set(assigned_team_ids))


# ---------------------------------------------------------------------------
# Test 6: Shelter Occupancy Never Exceeds Capacity
# ---------------------------------------------------------------------------
def test_shelter_occupancy_never_exceeds_capacity(allocator):
    """
    Create instance with shelter capacity 50, demand 100, 2 teams (capacity 50 each = 100 total capacity).
    Verify evacuees assigned to shelter <= 50, remainder unmet.
    """
    zone = make_mock_zone(5, "Royapuram", priority=1, risk_score=85.0, centroid=[13.0827, 80.2755], exposed=1000)
    custom_teams = [
        {
            "id": "TEAM-T1",
            "name": "Alpha",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 50,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        },
        {
            "id": "TEAM-T2",
            "name": "Bravo",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 50,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        },
    ]
    custom_shelters = [
        {
            "id": "SHLT-CAP50",
            "name": "Constrained Shelter",
            "zone_id": 5,
            "coordinates": [13.0827, 80.2755],
            "capacity": 50,
            "current_occupancy": 0,
            "status": "READY",
        }
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[zone],
        available_team_count=2,
        teams_override=custom_teams,
        shelters_override=custom_shelters,
        evacuation_demand_override={5: 100},
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.total_served_persons <= 50
    assert result.total_unmet_persons >= 50
    assert result.total_served_persons + result.total_unmet_persons == 100

    for shlt_assign in result.shelter_assignments:
        assert shlt_assign.evacuees_assigned <= 50


# ---------------------------------------------------------------------------
# Test 7: Closed Shelters Receive Zero Evacuees
# ---------------------------------------------------------------------------
def test_closed_shelters_receive_zero_evacuees(allocator):
    """
    Shelters with status != "READY"/"OPERATIONAL"/"OPEN" receive 0 evacuees.
    """
    zone = make_mock_zone(5, "Royapuram", priority=1, risk_score=85.0, centroid=[13.0827, 80.2755])
    custom_teams = [
        {
            "id": "TEAM-T1",
            "name": "Alpha",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 30,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        }
    ]
    custom_shelters = [
        {
            "id": "SHLT-CLOSED",
            "name": "Flooded Shelter",
            "zone_id": 5,
            "coordinates": [13.0827, 80.2755],
            "capacity": 500,
            "current_occupancy": 0,
            "status": "CLOSED",
        }
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[zone],
        available_team_count=1,
        teams_override=custom_teams,
        shelters_override=custom_shelters,
        evacuation_demand_override={5: 50},
    )

    # Since only a closed shelter is available, 0 evacuees should be sheltered
    assert len(result.shelter_assignments) == 0
    assert result.total_served_persons == 0
    assert result.total_unmet_persons == 50


# ---------------------------------------------------------------------------
# Test 8: Fully Occupied Shelters Receive Zero Evacuees
# ---------------------------------------------------------------------------
def test_fully_occupied_shelters_receive_zero_evacuees(allocator):
    """
    Shelters with capacity - occupancy == 0 receive 0 evacuees.
    """
    zone = make_mock_zone(5, "Royapuram", priority=1, risk_score=85.0, centroid=[13.0827, 80.2755])
    custom_teams = [
        {
            "id": "TEAM-T1",
            "name": "Alpha",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 30,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        }
    ]
    custom_shelters = [
        {
            "id": "SHLT-FULL",
            "name": "Full Shelter",
            "zone_id": 5,
            "coordinates": [13.0827, 80.2755],
            "capacity": 200,
            "current_occupancy": 200,
            "status": "OPERATIONAL",
        }
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[zone],
        available_team_count=1,
        teams_override=custom_teams,
        shelters_override=custom_shelters,
        evacuation_demand_override={5: 50},
    )

    assert len(result.shelter_assignments) == 0
    assert result.total_served_persons == 0
    assert result.total_unmet_persons == 50


# ---------------------------------------------------------------------------
# Test 9: Delivered Food Never Exceeds Stock
# ---------------------------------------------------------------------------
def test_delivered_food_never_exceeds_stock(engine, allocator):
    """
    Total food allocated across zones <= available food packets.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=250.0, water_level_index=0.7)
    available_food = 350
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        available_food_packets=available_food,
    )

    total_allocated_food = sum(a.allocated_supplies["food_packets"] for a in result.assignments)
    assert total_allocated_food <= available_food
    assert result.remaining_stock.allocated_food_packets == total_allocated_food
    assert result.remaining_stock.available_food_packets >= 0


# ---------------------------------------------------------------------------
# Test 10: Delivered Water Never Exceeds Stock
# ---------------------------------------------------------------------------
def test_delivered_water_never_exceeds_stock(engine, allocator):
    """
    Total water allocated across zones <= available water litres.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=250.0, water_level_index=0.7)
    available_water = 800
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        available_water_litres=available_water,
    )

    total_allocated_water = sum(a.allocated_supplies["water_litres"] for a in result.assignments)
    assert total_allocated_water <= available_water
    assert result.remaining_stock.allocated_water_litres == total_allocated_water
    assert result.remaining_stock.available_drinking_water_litres >= 0


# ---------------------------------------------------------------------------
# Test 11: Delivered Medical Kits Never Exceeds Stock
# ---------------------------------------------------------------------------
def test_delivered_medical_kits_never_exceeds_stock(engine, allocator):
    """
    Total medical kits allocated across zones <= available medical kits.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=250.0, water_level_index=0.7)
    available_med = 45
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        available_medical_kits=available_med,
    )

    total_allocated_med = sum(a.allocated_supplies["medical_kits"] for a in result.assignments)
    assert total_allocated_med <= available_med
    assert result.remaining_stock.allocated_medical_kits == total_allocated_med
    assert result.remaining_stock.available_medical_kits >= 0


# ---------------------------------------------------------------------------
# Test 12: Multiple Zones Cannot Exceed Collective Inventory
# ---------------------------------------------------------------------------
def test_multiple_zones_cannot_exceed_collective_inventory(allocator):
    """
    3 zones requesting 500 food each (1500 total). Only 800 available.
    Verify sum <= 800 and higher priority zones receive supplies first.
    """
    z1 = make_mock_zone(5, "Royapuram", priority=1, risk_score=85.0, centroid=[13.0827, 80.2755])
    z2 = make_mock_zone(8, "Anna Nagar", priority=2, risk_score=65.0, centroid=[13.0850, 80.2120])
    z3 = make_mock_zone(10, "Kodambakkam", priority=3, risk_score=45.0, centroid=[13.0415, 80.2330])

    custom_teams = [
        {"id": f"TEAM-T{i}", "name": f"Team {i}", "agency": "NDRF", "base_node_id": "N01", "capacity_persons_per_trip": 20, "status": "AVAILABLE", "vehicle_type": "HIGH_CLEARANCE_TRUCK"}
        for i in range(1, 4)
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[z1, z2, z3],
        available_team_count=3,
        teams_override=custom_teams,
        available_food_packets=800,
        resource_demand_override={
            5: {"food": 500, "water": 100, "med": 10},
            8: {"food": 500, "water": 100, "med": 10},
            10: {"food": 500, "water": 100, "med": 10},
        },
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    total_food_delivered = sum(a.allocated_supplies["food_packets"] for a in result.assignments)
    assert total_food_delivered <= 800

    # Zone 1 (Priority 1) should get full 500 before Zone 3
    food_by_zone: Dict[int, int] = {}
    for a in result.assignments:
        food_by_zone[a.assigned_zone_id] = food_by_zone.get(a.assigned_zone_id, 0) + a.allocated_supplies["food_packets"]

    z1_food = food_by_zone.get(5, 0)
    z3_food = food_by_zone.get(10, 0)
    assert z1_food == 500
    assert z3_food < 500


# ---------------------------------------------------------------------------
# Test 13: Unreachable Zones Not Assigned Infeasible Teams
# ---------------------------------------------------------------------------
def test_unreachable_zones_not_assigned_infeasible_teams(engine, allocator):
    """
    Verify unreachable zones receive 0 assigned teams and are placed in
    unmet_destinations with a clear deficit reason.
    E03 and E04 isolate N04 (Manali Expressway / Zone 2).
    """
    summary = engine.evaluate_all_zones(rainfall_mm=300.0, water_level_index=0.85)
    # Block E03 and E04, completely cutting off N04
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=8,
        blocked_edge_ids=["E03", "E04"],
    )

    # Check if Zone 2 is in assignments
    zone_2_assignments = [a for a in result.assignments if a.assigned_zone_id == 2]
    assert len(zone_2_assignments) == 0

    # Zone 2 must be recorded in unmet destinations with topological/routing deficit reason
    zone_2_unmet = [u for u in result.unmet_destinations if u.zone_id == 2]
    assert len(zone_2_unmet) > 0
    reason_lower = zone_2_unmet[0].deficit_reason.lower()
    assert any(term in reason_lower for term in ("isolated", "routing", "topological", "severance"))


# ---------------------------------------------------------------------------
# Test 14: Higher Priority Demand Preferred Under Scarcity
# ---------------------------------------------------------------------------
def test_higher_priority_demand_preferred(allocator):
    """
    Zone A (Priority 1, demand 50), Zone B (Priority 3, demand 50).
    Only 1 team (capacity 50) and 1 shelter (capacity 50).
    Verify Zone A is served first.
    """
    zone_a = make_mock_zone(5, "Royapuram", priority=1, risk_score=90.0, centroid=[13.0827, 80.2755])
    zone_b = make_mock_zone(8, "Anna Nagar", priority=3, risk_score=45.0, centroid=[13.0850, 80.2120])

    custom_teams = [
        {
            "id": "TEAM-T1",
            "name": "Alpha",
            "agency": "NDRF",
            "base_node_id": "N01",
            "capacity_persons_per_trip": 50,
            "status": "AVAILABLE",
            "vehicle_type": "HIGH_CLEARANCE_TRUCK",
        }
    ]
    custom_shelters = [
        {
            "id": "SHLT-T1",
            "name": "Central Shelter",
            "zone_id": 5,
            "coordinates": [13.0827, 80.2755],
            "capacity": 50,
            "current_occupancy": 0,
            "status": "READY",
        }
    ]

    result = allocator.optimize_allocation(
        assessed_zones=[zone_a, zone_b],
        available_team_count=1,
        teams_override=custom_teams,
        shelters_override=custom_shelters,
        evacuation_demand_override={5: 50, 8: 50},
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert len(result.assignments) == 1
    assert result.assignments[0].assigned_zone_id == 5  # Zone A assigned

    status_map = {s.zone_id: s for s in result.zone_evacuation_statuses}
    assert status_map[5].served_persons == 50
    assert status_map[5].is_fully_served
    assert status_map[8].served_persons == 0
    assert status_map[8].unmet_persons == 50


# ---------------------------------------------------------------------------
# Test 15: Zero Demand Produces No Unnecessary Evacuations
# ---------------------------------------------------------------------------
def test_zero_demand_produces_no_unnecessary_assignments(allocator):
    """
    Zone with 0 demand and low risk receives 0 evacuees and no wasted resources.
    """
    z_low = make_mock_zone(1, "Thiruvottiyur", priority=5, risk_score=15.0, centroid=[13.1650, 80.2750], exposed=0)

    result = allocator.optimize_allocation(
        assessed_zones=[z_low],
        available_team_count=2,
        evacuation_demand_override={1: 0},
    )

    assert result.status == "OPTIMAL"
    assert len(result.assignments) == 0
    assert result.total_served_persons == 0
    assert result.total_unmet_persons == 0


# ---------------------------------------------------------------------------
# Test 16: Missing Optional Inventory Handled Safely
# ---------------------------------------------------------------------------
def test_missing_optional_inventory_handled_safely(engine, allocator):
    """
    Calling allocator without inventory dict or with None values defaults safely without crashing.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=150.0, water_level_index=0.5)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=3,
        available_food_packets=None,
        available_water_litres=None,
        available_medical_kits=None,
        available_boats=None,
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.remaining_stock.available_food_packets == 0
    assert result.remaining_stock.available_drinking_water_litres == 0
    assert result.remaining_stock.available_medical_kits == 0


# ---------------------------------------------------------------------------
# Test 17: No MIP Solver Error Handling
# ---------------------------------------------------------------------------
def test_no_mip_solver_error_handling(engine, allocator):
    """
    Mocking solver unavailability raises RuntimeError with clear diagnostic message.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    with patch("ortools.linear_solver.pywraplp.Solver.CreateSolver", return_value=None):
        with pytest.raises(RuntimeError) as exc_info:
            allocator.optimize_allocation(
                assessed_zones=summary.zones,
                available_team_count=4,
            )
        assert "No mixed-integer linear programming (MIP) solver available" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 18: Deterministic Repeatability on Equivalent Inputs
# ---------------------------------------------------------------------------
def test_deterministic_repeatability_on_equivalent_inputs(engine, allocator):
    """
    Running the allocator twice on identical inputs produces identical assignments and metrics.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=220.0, water_level_index=0.65)

    res1 = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        blocked_edge_ids=["E08", "E18"],
        available_food_packets=3000,
        available_water_litres=8000,
    )

    res2 = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=6,
        blocked_edge_ids=["E08", "E18"],
        available_food_packets=3000,
        available_water_litres=8000,
    )

    assert res1.status == res2.status
    assert res1.objective_value == res2.objective_value
    assert res1.total_assigned_teams == res2.total_assigned_teams
    assert res1.total_served_persons == res2.total_served_persons
    assert res1.total_unmet_persons == res2.total_unmet_persons

    teams1 = [(a.team_id, a.assigned_zone_id, a.allocated_supplies["food_packets"]) for a in res1.assignments]
    teams2 = [(a.team_id, a.assigned_zone_id, a.allocated_supplies["food_packets"]) for a in res2.assignments]
    assert teams1 == teams2
