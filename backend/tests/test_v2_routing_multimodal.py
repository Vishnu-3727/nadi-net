"""
NADI-NET — Phase 3.3 Multi-Modal Land and Water Rescue Routing Tests
Deterministic validation of separate road/water graphs, boat launch transfer hubs,
physical vehicle constraints, and waterway navigability.
"""

import pytest
from unittest.mock import patch

from backend.app.schemas.waterways import MultiModalRouteRequest
from backend.app.schemas.routing import RouteRequest
from backend.app.services.routing.multimodal_router import MultiModalRescueRouter
from backend.app.services.routing.waterway_network import WaterwayNetworkManager
from backend.app.services.routing.rescue_router import FloodAwareRescueRouter


@pytest.fixture
def mm_router():
    return MultiModalRescueRouter()


@pytest.fixture
def water_mgr():
    return WaterwayNetworkManager()


@pytest.fixture
def road_router():
    return FloodAwareRescueRouter()


def test_road_only_routing(mm_router):
    """Direct road routing between N01 and N08 produces feasible route with ROAD step."""
    req = MultiModalRouteRequest(
        origin_node_id="N01",
        destination_node_id="N08",
        primary_vehicle_type="RESCUE_4WD",
        allow_waterway=False,
    )
    resp = mm_router.compute_route(req)
    assert resp.primary_route.is_feasible
    assert len(resp.primary_route.steps) == 1
    assert resp.primary_route.steps[0].mode == "ROAD"
    assert resp.primary_route.total_distance_km > 0.0


def test_water_only_routing(mm_router):
    """Direct water routing between W01 and W03 on Adyar River produces WATER step."""
    req = MultiModalRouteRequest(
        origin_node_id="W01",
        destination_node_id="W03",
        primary_vehicle_type="INFLATABLE_MOTORBOAT",
        watercraft_type="INFLATABLE_MOTORBOAT",
        allow_waterway=True,
    )
    resp = mm_router.compute_route(req)
    assert resp.primary_route.is_feasible
    assert len(resp.primary_route.steps) == 1
    assert resp.primary_route.steps[0].mode == "WATER"
    assert resp.primary_route.steps[0].vehicle_or_craft == "Inflatable Rescue Motorboat (IRB)"


def test_road_to_water_transition(mm_router):
    """Routing from road node (N15) to water destination (W04) includes ROAD, TRANSFER, and WATER steps."""
    req = MultiModalRouteRequest(
        origin_node_id="N15",  # Saidapet Adyar Bridge
        destination_node_id="W04",  # Adyar Estuary reach
        primary_vehicle_type="RESCUE_4WD",
        watercraft_type="INFLATABLE_MOTORBOAT",
        allow_waterway=True,
    )
    resp = mm_router.compute_route(req)
    assert resp.primary_route.is_feasible
    modes = [step.mode for step in resp.primary_route.steps]
    assert "TRANSFER" in modes
    assert "WATER" in modes
    assert len(resp.primary_route.transfer_points_used) > 0


def test_water_to_road_recovery(mm_router):
    """Routing from water node W01 to road destination N19 includes WATER, TRANSFER, and ROAD legs."""
    req = MultiModalRouteRequest(
        origin_node_id="W01",
        destination_node_id="N19",  # Thiruvanmiyur ECR
        primary_vehicle_type="RESCUE_4WD",
        watercraft_type="INFLATABLE_MOTORBOAT",
        allow_waterway=True,
    )
    resp = mm_router.compute_route(req)
    assert resp.primary_route.is_feasible
    modes = [step.mode for step in resp.primary_route.steps]
    assert "TRANSFER" in modes
    assert "WATER" in modes


def test_closed_launch_point(mm_router):
    """Closed launch point cannot be used for boat transfer."""
    # Temporarily mark all transfer points CLOSED on the active router's water_mgr
    closed_points = {k: v.model_copy(update={"status": "CLOSED"}) for k, v in mm_router.water_mgr.transfer_points.items()}
    with patch.dict(mm_router.water_mgr.transfer_points, closed_points):
        req = MultiModalRouteRequest(
            origin_node_id="N15",
            destination_node_id="W04",
            allow_waterway=True,
        )
        resp = mm_router.compute_route(req)
        assert not resp.primary_route.is_feasible


def test_insufficient_water_depth(water_mgr):
    """Water edge with depth 0.20m (< 0.40m required) is rejected due to grounding risk."""
    is_nav, _, reason = water_mgr.evaluate_water_edge("WE01", depth_override=0.20)
    assert not is_nav
    assert "Insufficient water depth" in reason


def test_excessive_current(water_mgr):
    """Water edge with velocity 3.5 m/s (> 2.2 m/s limit) is rejected due to capsizing risk."""
    is_nav, _, reason = water_mgr.evaluate_water_edge("WE01", velocity_override=3.5)
    assert not is_nav
    assert "Excessive river current" in reason


def test_boat_prohibited_on_land(mm_router):
    """Inflatable motorboat requested for pure road traversal is rejected."""
    req = MultiModalRouteRequest(
        origin_node_id="N01",
        destination_node_id="N08",
        primary_vehicle_type="INFLATABLE_MOTORBOAT",
        allow_waterway=False,
    )
    resp = mm_router.compute_route(req)
    assert not resp.primary_route.is_feasible
    assert "Watercraft prohibited on dry road" in resp.unreachable_reason


def test_non_amphibious_vehicle_prohibited_on_water(mm_router):
    """Non-amphibious standard road vehicle cannot navigate pure water route without boat."""
    req = MultiModalRouteRequest(
        origin_node_id="W01",
        destination_node_id="W03",
        primary_vehicle_type="AMBULANCE_STANDARD",
        watercraft_type="AMBULANCE_STANDARD",
        allow_waterway=False,
    )
    resp = mm_router.compute_route(req)
    assert not resp.primary_route.is_feasible
    assert "non-amphibious road vehicle" in resp.unreachable_reason


def test_no_valid_multimodal_route(mm_router):
    """Isolated destination with no road or water connections reports unreachable."""
    req = MultiModalRouteRequest(
        origin_node_id="N01",
        destination_node_id="N04",
        primary_vehicle_type="RESCUE_4WD",
        blocked_edges=["E03", "E04"],
        allow_waterway=True,
    )
    resp = mm_router.compute_route(req)
    assert not resp.primary_route.is_feasible
    assert resp.unreachable_reason is not None


def test_synthetic_waterway_provenance(water_mgr):
    """Waterway network dataset is explicitly flagged as simulated demonstration data."""
    schema = water_mgr.get_network_schema()
    assert schema.provenance == "SYNTHETIC_DEMO"
    assert "Demonstration" in schema.warning
    for n in schema.nodes:
        assert n.is_simulated is True
    for e in schema.edges:
        assert e.is_simulated is True


def test_backward_compatibility_with_existing_road_routing(road_router):
    """Standard road routing requests continue working without modification."""
    req = RouteRequest(
        origin_node_id="N01",
        destination_node_id="N14",
        vehicle_type="NORMAL_RESCUE",
    )
    resp = road_router.compute_route(req)
    assert resp.primary_route.is_feasible
    assert len(resp.primary_route.edges) > 0
