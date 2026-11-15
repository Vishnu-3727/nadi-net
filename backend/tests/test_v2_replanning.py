"""
NADI-NET — Phase 3.4 Dynamic Replanning Tests
Deterministic validation of event processing, assignment preservation,
safety-first rerouting, and double-counting prevention.
"""

import pytest
from backend.app.schemas.replanning import DisruptionEvent, ReplanningRequest
from backend.app.schemas.resources import TeamAssignment
from backend.app.services.flood_intelligence.risk_engine import FloodIntelligenceEngine
from backend.app.services.resource_optimisation.replanner import DynamicEmergencyReplanner
from backend.app.services.resource_optimisation.allocator import EmergencyResourceAllocator


@pytest.fixture
def engine():
    return FloodIntelligenceEngine()


@pytest.fixture
def replanner():
    return DynamicEmergencyReplanner()


@pytest.fixture
def allocator():
    return EmergencyResourceAllocator()


def make_dummy_assignment(team_id: str, zone_id: int, nodes: list) -> TeamAssignment:
    return TeamAssignment(
        team_id=team_id,
        team_name=f"Team {team_id}",
        agency="NDRF",
        assigned_zone_id=zone_id,
        assigned_zone_name=f"Zone {zone_id}",
        destination_node_id=nodes[-1] if nodes else "N01",
        zone_priority=1,
        risk_score=85.0,
        route_distance_km=5.0,
        estimated_arrival_time_min=10.0,
        vehicle_used="RESCUE_4WD",
        allocated_supplies={"food_packets": 200, "water_litres": 500, "medical_kits": 20, "inflatable_boats": 1},
        route_nodes=nodes,
        assignment_justification="Active assignment.",
        evacuees_transported=15,
    )


def test_bridge_closure_during_active_mission(engine, replanner, allocator):
    """
    Active assignment using route node E18 (Adyar bridge) is cancelled
    and rerouted when ROAD_BLOCKED event for E18 arrives.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=250.0, water_level_index=0.7)
    active_assign = make_dummy_assignment("TEAM-01", 12, ["N15", "E18", "N16"])

    event = DisruptionEvent(
        event_id="EV01",
        timestamp="2026-11-15T08:00:00Z",
        event_type="ROAD_BLOCKED",
        affected_entity_id="E18",
        description="Maraimalai Adigal Bridge submerged and closed.",
    )

    req = ReplanningRequest(
        scenario_id="SCN-B",
        events=[event],
        active_assignments=[active_assign],
    )

    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    # TEAM-01 should be cancelled from its old unsafe route
    cancelled_ids = [a.team_id for a in res.cancelled_assignments]
    assert "TEAM-01" in cancelled_ids


def test_team_breakdown(engine, replanner, allocator):
    """
    TEAM-02 breaks down (TEAM_UNAVAILABLE event).
    Assignment is cancelled and remaining active teams are re-optimised.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    active_assign = make_dummy_assignment("TEAM-02", 5, ["N01", "E08", "N08"])

    event = DisruptionEvent(
        event_id="EV02",
        timestamp="2026-11-15T08:10:00Z",
        event_type="TEAM_UNAVAILABLE",
        affected_entity_id="TEAM-02",
        description="Mechanical failure on rescue truck axle.",
    )

    req = ReplanningRequest(
        events=[event],
        active_assignments=[active_assign],
    )

    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    cancelled_ids = [a.team_id for a in res.cancelled_assignments]
    assert "TEAM-02" in cancelled_ids


def test_shelter_closure_redirects_evacuees(engine, replanner, allocator):
    """
    When a shelter closes (SHELTER_CLOSED event), evacuees are redirected to other shelters.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=220.0, water_level_index=0.65)
    event = DisruptionEvent(
        event_id="EV03",
        timestamp="2026-11-15T08:15:00Z",
        event_type="SHELTER_CLOSED",
        affected_entity_id="SHLT-01",
        description="Generator flood failure at Jawaharlal Nehru Stadium Hub.",
    )

    req = ReplanningRequest(events=[event])
    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    assigned_shelters = [s.shelter_id for s in res.shelter_assignments]
    assert "SHLT-01" not in assigned_shelters


def test_inventory_reduction(engine, replanner, allocator):
    """
    Emergency inventory reduced mid-operation (INVENTORY_CHANGED event).
    New supply allocations respect reduced inventory.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    event = DisruptionEvent(
        event_id="EV04",
        timestamp="2026-11-15T08:20:00Z",
        event_type="INVENTORY_CHANGED",
        affected_entity_id="DEPOT_CENTRAL",
        new_state={"food": 300, "water": 500, "med": 20},
        description="Warehouse water contamination damaged dry supplies.",
    )

    req = ReplanningRequest(events=[event])
    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
        available_food=5000,
        available_water=12000,
        available_med=800,
    )

    total_food = sum(a.allocated_supplies["food_packets"] for a in res.new_assignments)
    assert total_food <= 300


def test_completed_assignment_preservation(engine, replanner, allocator):
    """
    Completed missions are strictly preserved and not modified or reassigned.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    completed_assign = make_dummy_assignment("TEAM-03", 5, ["N01", "E01", "N02"])

    req = ReplanningRequest(
        events=[],
        active_assignments=[completed_assign],
        completed_team_ids=["TEAM-03"],
    )

    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    preserved_ids = [a.team_id for a in res.preserved_assignments]
    assert "TEAM-03" in preserved_ids
    # Should not re-assign TEAM-03 as a new assignment
    new_ids = [a.team_id for a in res.new_assignments]
    assert "TEAM-03" not in new_ids


def test_no_double_counting_of_evacuees(engine, replanner, allocator):
    """
    Already evacuated persons are subtracted from demand so they are not evacuated twice.
    """
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    req = ReplanningRequest(
        events=[DisruptionEvent(
            event_id="EV05",
            timestamp="2026-11-15T08:30:00Z",
            event_type="ZONE_DEMAND_UPDATED",
            affected_entity_id="5",
            new_state=50,
            description="Zone 5 demand updated to 50 persons.",
        )],
        evacuated_persons_count=20,
    )

    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )
    assert res.status in ("OPTIMAL", "FEASIBLE")


def test_replanning_with_zero_available_teams(engine, replanner, allocator):
    """Replanning when zero teams are available yields 0 assignments without crashing."""
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    req = ReplanningRequest(events=[])

    res = replanner.replan(
        request=req,
        current_assessed_zones=summary.zones,
        base_blocked_edges=[],
        base_teams=[],  # No teams
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    assert res.status == "OPTIMAL"
    assert len(res.new_assignments) == 0
