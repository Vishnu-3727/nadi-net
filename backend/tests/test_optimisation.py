import pytest
from backend.app.services.flood_intelligence.risk_engine import FloodIntelligenceEngine
from backend.app.services.resource_optimisation.allocator import EmergencyResourceAllocator

@pytest.fixture
def engine():
    return FloodIntelligenceEngine()

@pytest.fixture
def allocator():
    return EmergencyResourceAllocator()

def test_or_tools_allocation_feasible(engine, allocator):
    summary = engine.evaluate_all_zones(rainfall_mm=200.0, water_level_index=0.6)
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=8,
        blocked_edge_ids=["E03", "E18"],
        available_food_packets=4000,
        available_water_litres=10000,
        available_medical_kits=600,
        available_boats=10
    )

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.total_assigned_teams > 0
    assert result.total_assigned_teams <= 8
    assert result.total_unassigned_teams == 8 - result.total_assigned_teams
    # Verify no team is assigned multiple times
    team_ids = [a.team_id for a in result.assignments]
    assert len(team_ids) == len(set(team_ids))

def test_allocation_prioritizes_critical_zones(engine, allocator):
    summary = engine.evaluate_all_zones(rainfall_mm=300.0, water_level_index=0.85)
    # Severe scenario: only 4 teams available
    result = allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=4,
        blocked_edge_ids=["E18", "E21", "E25"],
        available_food_packets=2000,
        available_water_litres=5000,
        available_medical_kits=300,
        available_boats=4
    )

    assert result.total_assigned_teams <= 4
    # All assigned teams should be sent to Priority 1 or Priority 2 zones
    for a in result.assignments:
        assert a.zone_priority in (1, 2)
    # Unmet destinations should record why they were not served
    for u in result.unmet_destinations:
        assert len(u.deficit_reason) > 0
