import pytest
from backend.app.services.routing.rescue_router import FloodAwareRescueRouter
from backend.app.schemas.routing import RouteRequest

@pytest.fixture
def router():
    return FloodAwareRescueRouter()

def test_router_unblocked_path(router):
    req = RouteRequest(
        origin_node_id="N01", # Chennai Central
        destination_node_id="N16", # Kathipara Guindy
        vehicle_type="NORMAL_RESCUE",
        avoid_blocked_edges=True
    )
    res = router.compute_route(req, active_blocked_edges=[])
    assert res.primary_route.is_feasible is True
    assert res.primary_route.total_distance_km > 0.0
    assert len(res.primary_route.nodes) >= 2
    assert res.primary_route.nodes[0].node_id == "N01"
    assert res.primary_route.nodes[-1].node_id == "N16"

def test_router_blocked_edge_reroute(router):
    # E18 is Maraimalai Adigal Bridge over Adyar River between N15 and N16
    req = RouteRequest(
        origin_node_id="N01",
        destination_node_id="N16",
        vehicle_type="NORMAL_RESCUE",
        avoid_blocked_edges=True
    )
    # Clear route
    clear_res = router.compute_route(req, active_blocked_edges=[])
    # Blocked bridge E18
    blocked_res = router.compute_route(req, active_blocked_edges=["E18"])

    assert clear_res.primary_route.is_feasible is True
    assert blocked_res.primary_route.is_feasible is True
    # The blocked route should take an alternative corridor (e.g. via 100ft road or Arcot road)
    assert "E18" not in [e.edge_id for e in blocked_res.primary_route.edges]
    # Travel time should be longer with the detour
    assert blocked_res.primary_route.estimated_travel_time_min >= clear_res.primary_route.estimated_travel_time_min

def test_router_alternative_paths(router):
    req = RouteRequest(
        origin_node_id="N01",
        destination_node_id="N10", # Anna Nagar
        vehicle_type="NORMAL_RESCUE"
    )
    res = router.compute_route(req, active_blocked_edges=[])
    assert res.primary_route.is_feasible is True
    # Should have at least one alternative route
    assert len(res.alternatives) >= 1
