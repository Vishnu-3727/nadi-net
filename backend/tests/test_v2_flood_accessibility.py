"""
NADI-NET — Phase 3.2 Flood Depth Scenario & Physical Accessibility Tests
Deterministic validation of vehicle-specific wading limits, structural constraints,
uncertainty ranges, and flood-aware routing integration.
"""

import pytest
from backend.app.schemas.flood_depth import RoadFloodCondition, VehicleProfile
from backend.app.schemas.routing import RouteRequest
from backend.app.services.routing.vehicle_accessibility import (
    evaluate_edge_accessibility,
    get_vehicle_profile,
    VEHICLE_PROFILES,
)
from backend.app.services.flood_intelligence.flood_depth_engine import FloodDepthScenarioEngine
from backend.app.services.routing.rescue_router import FloodAwareRescueRouter


@pytest.fixture
def engine():
    return FloodDepthScenarioEngine()


@pytest.fixture
def router():
    return FloodAwareRescueRouter()


def test_known_safe_road():
    """Known safe road with minimal water is PASSABLE for standard ambulance."""
    edge = {"id": "E01", "name": "Rajaji Salai", "distance_km": 3.8, "speed_limit_kmh": 45}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_min_m=0.0,
        flood_depth_expected_m=0.05,
        flood_depth_max_m=0.10,
        depth_source="SCENARIO_ASSUMPTION",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "PASSABLE"
    assert res.cost_multiplier == 1.0


def test_depth_below_configured_threshold():
    """Depth (0.15m) below threshold (0.20m) for Ambulance is RESTRICTED (safe with slowdown)."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.15,
        depth_source="SCENARIO_ASSUMPTION",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "RESTRICTED"
    assert res.cost_multiplier > 1.0


def test_depth_above_configured_threshold():
    """Depth (0.35m) above threshold (0.20m) for Ambulance is BLOCKED."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.35,
        depth_source="SCENARIO_ASSUMPTION",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "BLOCKED"
    assert "exceeds vehicle operating threshold" in res.reason


def test_exact_threshold_boundary():
    """Depth exactly at threshold (0.20m) for Ambulance is RESTRICTED at crawl speed."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.20,
        depth_source="SCENARIO_ASSUMPTION",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "RESTRICTED"
    assert res.cost_multiplier == 3.0
    assert "exactly at maximum safe threshold" in res.reason


def test_unknown_water_depth():
    """Unknown water depth is UNKNOWN under conservative emergency safety protocol."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=None,
        depth_source="UNKNOWN",
    )
    res_cons = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond, conservative_unknown=True)
    assert res_cons.status == "UNKNOWN"
    assert res_cons.cost_multiplier == float("inf")

    # Non-conservative fallback
    res_non_cons = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond, conservative_unknown=False)
    assert res_non_cons.status == "RESTRICTED"


def test_missing_flow_velocity():
    """Missing flow velocity (None) is evaluated safely without crashing."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.10,
        flow_velocity_mps=None,
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "PASSABLE"


def test_excessive_flow_velocity():
    """Flow velocity (1.5 m/s) exceeding vehicle limit (0.5 m/s for Ambulance) is BLOCKED."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.10,
        flow_velocity_mps=1.5,
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "BLOCKED"
    assert "Excessive flow velocity" in res.reason


def test_bridge_restriction():
    """Bridge corridor under storm condition reflects causeway/bridge characteristics."""
    edge = {"id": "E18", "name": "Adyar Bridge"}
    cond = RoadFloodCondition(
        edge_id="E18",
        flood_depth_expected_m=0.50,
        structural_restriction="BRIDGE",
        flow_velocity_mps=1.8,
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "BLOCKED"  # Exceeds ambulance 0.20m depth and 0.5 m/s velocity


def test_underpass_restriction():
    """Standard ambulance entering an inundated underpass is prohibited by structural policy."""
    edge = {"id": "E06", "name": "Kolathur Subway"}
    cond = RoadFloodCondition(
        edge_id="E06",
        flood_depth_expected_m=0.18,  # Below 0.20m depth threshold
        structural_restriction="UNDERPASS",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "BLOCKED"
    assert "prohibited from entering inundated UNDERPASS" in res.reason


def test_manual_closure():
    """Manual closure overrides passable depth condition and blocks road."""
    edge = {"id": "E01"}
    cond = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.05,
        manual_override="FORCE_CLOSED",
    )
    res = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond)
    assert res.status == "BLOCKED"
    assert "Manual operator road closure active" in res.reason


def test_manual_reopening_subject_to_safety_constraints():
    """
    Manual reopen succeeds for normal roads with moderate water,
    but is REJECTED when severe structural hazards (submerged underpass > 1.0m) exist.
    """
    edge = {"id": "E01"}
    cond_safe = RoadFloodCondition(
        edge_id="E01",
        flood_depth_expected_m=0.15,
        manual_override="FORCE_OPEN",
    )
    res_safe = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond_safe)
    assert res_safe.status == "PASSABLE"

    cond_hazard = RoadFloodCondition(
        edge_id="E06",
        flood_depth_expected_m=1.80,
        structural_restriction="UNDERPASS",
        manual_override="FORCE_OPEN",
    )
    res_hazard = evaluate_edge_accessibility(edge, "AMBULANCE_STANDARD", cond_hazard)
    assert res_hazard.status == "BLOCKED"
    assert "Manual reopen rejected" in res_hazard.reason


def test_alternative_routing_around_flooded_segments(router, engine):
    """
    When arterial E18 (Adyar Bridge) has 0.70m water, Standard Ambulance (max 0.20m)
    detours around it, while Heavy Truck (max 0.90m) can traverse it.
    """
    conditions = engine.generate_scenario_conditions(
        scenario_id="SCN-B",
        manual_depths={"E18": 0.70},
    )

    req_amb = RouteRequest(
        origin_node_id="N15",  # Saidapet
        destination_node_id="N16",  # Kathipara Guindy
        vehicle_type="AMBULANCE_STANDARD",
    )
    resp_amb = router.compute_route(req_amb, flood_conditions=conditions)

    # Ambulance should avoid E18 directly
    if resp_amb.primary_route.is_feasible:
        edge_ids = [e.edge_id for e in resp_amb.primary_route.edges]
        assert "E18" not in edge_ids

    # Heavy Clearance Truck can traverse E18 at 0.70m depth
    req_truck = RouteRequest(
        origin_node_id="N15",
        destination_node_id="N16",
        vehicle_type="HEAVY_CLEARANCE_TRUCK",
    )
    resp_truck = router.compute_route(req_truck, flood_conditions=conditions)
    assert resp_truck.primary_route.is_feasible
    edge_ids_truck = [e.edge_id for e in resp_truck.primary_route.edges]
    assert "E18" in edge_ids_truck


def test_completely_unreachable_destination(router):
    """When all egress/ingress edges are submerged beyond limits, destination is reported unreachable."""
    # Isolate N04 by blocking E03 and E04 with 2.0m depth
    conditions = {
        "E03": RoadFloodCondition(edge_id="E03", flood_depth_expected_m=2.0),
        "E04": RoadFloodCondition(edge_id="E04", flood_depth_expected_m=2.0),
    }
    req = RouteRequest(
        origin_node_id="N01",
        destination_node_id="N04",
        vehicle_type="AMBULANCE_STANDARD",
    )
    resp = router.compute_route(req, flood_conditions=conditions)
    assert not resp.primary_route.is_feasible
    assert resp.unreachable_reason is not None
    assert len(resp.rejected_alternatives_reasons) > 0


def test_legacy_requests_without_flood_depth_information(router):
    """Existing requests specifying active_blocked_edges but no flood_conditions continue working."""
    req = RouteRequest(
        origin_node_id="N01",
        destination_node_id="N08",
        vehicle_type="NORMAL_RESCUE",
    )
    resp = router.compute_route(req, active_blocked_edges=["E08"])
    assert resp.primary_route.is_feasible
    edge_ids = [e.edge_id for e in resp.primary_route.edges]
    assert "E08" not in edge_ids


def test_deterministic_repeated_scenario_execution(engine):
    """Generating scenario conditions twice on identical inputs produces identical outputs."""
    cond1 = engine.generate_scenario_conditions("SCN-B", rainfall_intensity_mm=250.0, water_level_index=0.8)
    cond2 = engine.generate_scenario_conditions("SCN-B", rainfall_intensity_mm=250.0, water_level_index=0.8)

    assert set(cond1.keys()) == set(cond2.keys())
    for k in cond1:
        assert cond1[k].flood_depth_expected_m == cond2[k].flood_depth_expected_m
        assert cond1[k].flood_depth_min_m == cond2[k].flood_depth_min_m
        assert cond1[k].flood_depth_max_m == cond2[k].flood_depth_max_m
        assert cond1[k].flow_velocity_mps == cond2[k].flow_velocity_mps


def test_synthetic_data_correctly_labelled_as_simulated(engine):
    """Verify is_simulated is True and provenance metadata clearly marks scenario range."""
    conds = engine.generate_scenario_conditions("SCN-A")
    for k, v in conds.items():
        assert v.is_simulated is True
        assert "SCENARIO" in v.provenance
