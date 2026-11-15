"""
NADI-NET — End-to-End Master Demonstration Scenario Test
Executes a complete, integrated 13-stage Chennai emergency response workflow:
1. Multiple affected zones with differentiated priorities
2. Scenario-based flood conditions affecting road network accessibility
3. Vehicle-specific physical wading route selection
4. Isolated / unavailable road segments
5. Multi-modal land-to-water rescue traversal via boat launch hubs
6. MILP team allocation with one-trip capacity constraints
7. Partial unmet demand under resource scarcity
8. Operational shelter allocation respecting physical capacities
9. Strict global inventory conservation
10. Mid-mission operational disruption (bridge collapse / team breakdown)
11. Dynamic replanning with completed assignment preservation
12. Critical-link restoration ranking
13. Historical audit trail persistence in SQLite
"""

import pytest
from sqlalchemy.orm import Session

from backend.app.database.session import SessionLocal
from backend.app.schemas.routing import RouteRequest
from backend.app.schemas.waterways import MultiModalRouteRequest
from backend.app.schemas.replanning import DisruptionEvent, ReplanningRequest
from backend.app.services.flood_intelligence.risk_engine import FloodIntelligenceEngine
from backend.app.services.flood_intelligence.flood_depth_engine import FloodDepthScenarioEngine
from backend.app.services.routing.rescue_router import FloodAwareRescueRouter
from backend.app.services.routing.multimodal_router import MultiModalRescueRouter
from backend.app.services.resource_optimisation.allocator import EmergencyResourceAllocator
from backend.app.services.resource_optimisation.replanner import DynamicEmergencyReplanner
from backend.app.services.resource_optimisation.link_ranker import CriticalLinkRanker
from backend.app.services.scenario_simulation.simulator import simulator_service
from backend.app.models.database import ScenarioRunRecord


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_full_integrated_chennai_emergency_demonstration(db: Session):
    # -------------------------------------------------------------------------
    # Stage 1: Multiple affected zones with different priorities
    # -------------------------------------------------------------------------
    risk_engine = FloodIntelligenceEngine()
    risk_summary = risk_engine.evaluate_all_zones(rainfall_mm=260.0, water_level_index=0.75)
    assert risk_summary.total_zones == 15
    priorities = {z.recommended_priority for z in risk_summary.zones}
    assert 1 in priorities and 2 in priorities  # Differentiated priorities

    # -------------------------------------------------------------------------
    # Stage 2: Flood scenario affecting road accessibility
    # -------------------------------------------------------------------------
    flood_depth_engine = FloodDepthScenarioEngine()
    flood_conditions = flood_depth_engine.generate_scenario_conditions(
        scenario_id="SCN-B",
        rainfall_intensity_mm=260.0,
        water_level_index=0.75,
        blocked_edge_ids=["E18", "E21", "E25"],
    )
    assert len(flood_conditions) > 0
    assert flood_conditions["E18"].flood_depth_expected_m is not None

    # -------------------------------------------------------------------------
    # Stage 3 & 4: Vehicle-specific route selection & unavailable segment
    # -------------------------------------------------------------------------
    router = FloodAwareRescueRouter()
    # E18 has 0.90m depth; standard ambulance cannot pass
    amb_req = RouteRequest(
        origin_node_id="N15",
        destination_node_id="N16",
        vehicle_type="AMBULANCE_STANDARD",
    )
    amb_resp = router.compute_route(amb_req, flood_conditions=flood_conditions)
    # If route is feasible, it must not use E18
    if amb_resp.primary_route.is_feasible:
        assert "E18" not in [e.edge_id for e in amb_resp.primary_route.edges]

    # -------------------------------------------------------------------------
    # Stage 5: Multi-modal rescue where valid waterway data exists
    # -------------------------------------------------------------------------
    mm_router = MultiModalRescueRouter()
    mm_req = MultiModalRouteRequest(
        origin_node_id="N15",
        destination_node_id="W04",
        primary_vehicle_type="RESCUE_4WD",
        watercraft_type="INFLATABLE_MOTORBOAT",
        allow_waterway=True,
    )
    mm_resp = mm_router.compute_route(mm_req)
    assert mm_resp.primary_route.is_feasible
    step_modes = [s.mode for s in mm_resp.primary_route.steps]
    assert "TRANSFER" in step_modes
    assert "WATER" in step_modes

    # -------------------------------------------------------------------------
    # Stage 6, 7, 8, 9: Resource Allocation, Capacity, Unmet Demand, Inventory
    # -------------------------------------------------------------------------
    allocator = EmergencyResourceAllocator()
    alloc_res = allocator.optimize_allocation(
        assessed_zones=risk_summary.zones,
        available_team_count=5,  # Constrained team inventory
        blocked_edge_ids=["E18", "E21", "E25"],
        available_food_packets=1200,
        available_water_litres=3000,
        available_medical_kits=150,
        available_boats=6,
    )

    assert alloc_res.status in ("OPTIMAL", "FEASIBLE")
    assert alloc_res.total_assigned_teams <= 5
    assert alloc_res.total_served_persons + alloc_res.total_unmet_persons == alloc_res.total_demand_persons
    assert alloc_res.remaining_stock.allocated_food_packets <= 1200
    assert alloc_res.remaining_stock.allocated_water_litres <= 3000
    assert alloc_res.remaining_stock.allocated_medical_kits <= 150

    # Verify shelter capacities are strictly respected
    for sa in alloc_res.shelter_assignments:
        assert sa.evacuees_assigned <= sa.shelter_capacity

    # -------------------------------------------------------------------------
    # Stage 10 & 11: Mid-mission disruption and dynamic replanning
    # -------------------------------------------------------------------------
    replanner = DynamicEmergencyReplanner(allocator=allocator)
    disruption_event = DisruptionEvent(
        event_id="DEMO-EV01",
        timestamp="2026-11-15T09:00:00Z",
        event_type="ROAD_BLOCKED",
        affected_entity_id="E08",
        description="Poonamallee High Road inundated near Kilpauk.",
    )

    completed_team = alloc_res.assignments[0].team_id if alloc_res.assignments else "TEAM-01"
    replan_req = ReplanningRequest(
        scenario_id="SCN-B",
        events=[disruption_event],
        active_assignments=alloc_res.assignments,
        completed_team_ids=[completed_team],
        evacuated_persons_count=20,
    )

    replan_res = replanner.replan(
        request=replan_req,
        current_assessed_zones=risk_summary.zones,
        base_blocked_edges=["E18", "E21", "E25"],
        base_teams=allocator.teams_data,
        base_shelters=allocator.facilities_data.get("shelters", []),
    )

    assert replan_res.status in ("OPTIMAL", "FEASIBLE")
    assert completed_team in [a.team_id for a in replan_res.preserved_assignments]

    # -------------------------------------------------------------------------
    # Stage 12: Critical-link restoration ranking
    # -------------------------------------------------------------------------
    ranker = CriticalLinkRanker()
    ranked_resp = ranker.rank_blocked_links(
        blocked_edge_ids=["E08", "E18", "E21", "E25"],
        scenario_id="SCN-B",
    )
    assert ranked_resp.total_blocked_links == 4
    assert len(ranked_resp.ranked_links) == 4
    assert ranked_resp.ranked_links[0].marginal_benefit_score >= ranked_resp.ranked_links[1].marginal_benefit_score

    # -------------------------------------------------------------------------
    # Stage 13: Historical audit recording in SQLite
    # -------------------------------------------------------------------------
    sim_state = simulator_service.run_simulation(db, scenario_id="SCN-B")
    run_id = sim_state["run_id"]
    db_record = db.query(ScenarioRunRecord).filter(ScenarioRunRecord.id == run_id).first()
    assert db_record is not None
    assert "Scenario B" in db_record.scenario_name
    assert db_record.total_affected_zones == 15
