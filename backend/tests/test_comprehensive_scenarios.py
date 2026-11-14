import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.database import ScenarioRunRecord
from backend.app.services.scenario_simulation.simulator import simulator_service
from backend.app.services.routing.rescue_router import rescue_router
from backend.app.services.geospatial.geo_service import geo_service
from backend.app.services.flood_intelligence.risk_engine import risk_engine
from backend.app.schemas.routing import RouteRequest

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

# 1. Test All Three Predefined Scenarios
def test_all_three_predefined_scenarios(client):
    """Verify that Scenario A, B, and C execute and produce monotonic severity escalation."""
    # Scenario A: Moderate
    res_a = client.post("/api/scenarios/SCN-A/simulate")
    assert res_a.status_code == 200
    data_a = res_a.json()["data"]
    rain_a = data_a["scenario"]["rainfall_intensity_mm"]
    exposed_a = data_a["risk_summary"]["total_exposed_population"]
    blocked_a = len(data_a["blocked_edge_ids"])

    # Scenario B: Severe
    res_b = client.post("/api/scenarios/SCN-B/simulate")
    assert res_b.status_code == 200
    data_b = res_b.json()["data"]
    rain_b = data_b["scenario"]["rainfall_intensity_mm"]
    exposed_b = data_b["risk_summary"]["total_exposed_population"]
    blocked_b = len(data_b["blocked_edge_ids"])

    # Scenario C: Critical
    res_c = client.post("/api/scenarios/SCN-C/simulate")
    assert res_c.status_code == 200
    data_c = res_c.json()["data"]
    rain_c = data_c["scenario"]["rainfall_intensity_mm"]
    exposed_c = data_c["risk_summary"]["total_exposed_population"]
    blocked_c = len(data_c["blocked_edge_ids"])

    # Strict Monotonic Escalation Checks
    assert rain_a < rain_b < rain_c, f"Rainfall must escalate: {rain_a} < {rain_b} < {rain_c}"
    assert exposed_a <= exposed_b <= exposed_c, f"Exposed population must increase with deluge: {exposed_a} <= {exposed_b} <= {exposed_c}"
    assert blocked_a < blocked_b < blocked_c, f"Road severances must increase: {blocked_a} < {blocked_b} < {blocked_c}"

# 2. Test Unreachable Destinations
def test_unreachable_destinations():
    """Verify routing engine handles severed/isolated destinations cleanly."""
    # Node N04 (Manali) connected only via E03 (from N03) and E04 (from N05)
    # If both E03 and E04 are blocked, normal rescue vehicle cannot reach N04
    req = RouteRequest(
        origin_node_id="N01", # Central
        destination_node_id="N04", # Manali
        vehicle_type="NORMAL_RESCUE",
        avoid_blocked_edges=True,
        blocked_edges_override=["E03", "E04"]
    )
    resp = rescue_router.compute_route(req, active_blocked_edges=["E03", "E04"])
    assert resp.primary_route.is_feasible is False
    assert resp.unreachable_reason is not None
    assert "isolated" in resp.unreachable_reason.lower() or "blocked" in resp.unreachable_reason.lower()
    assert len(resp.alternatives) == 0

# 3. Test Insufficient Rescue Resources
def test_insufficient_rescue_resources():
    """Verify OR-Tools allocator penalizes deficits and explains unserved destinations."""
    # Deluge scenario with 6 high-risk zones, but only 2 teams available
    summary = risk_engine.evaluate_all_zones(rainfall_mm=350.0, water_level_index=0.9)
    from backend.app.services.resource_optimisation.allocator import resource_allocator

    res = resource_allocator.optimize_allocation(
        assessed_zones=summary.zones,
        available_team_count=2, # Severely constrained
        blocked_edge_ids=["E03", "E18"],
        available_food_packets=1000,
        available_water_litres=2000,
        available_medical_kits=100,
        available_boats=2
    )

    assert res.total_assigned_teams == 2
    assert res.total_unassigned_teams == 0
    assert res.unmet_zones_count >= 3
    # Check that each unmet zone has an explicit mathematical rationale
    for unmet in res.unmet_destinations:
        assert len(unmet.deficit_reason) > 0
        assert "exhaustion" in unmet.deficit_reason.lower() or "severance" in unmet.deficit_reason.lower()

# 4. Test Unavailable Facilities
def test_unavailable_facilities():
    """Verify hospital accessibility degrades when approaching bridges are submerged."""
    # Baseline clear
    status_clear = geo_service.evaluate_facility_accessibility(blocked_edge_ids=[])
    miot_clear = next(h for h in status_clear["hospitals"] if h["id"] == "HOSP-06")
    assert miot_clear["emergency_status"] in ("FULLY_OPERATIONAL", "ACCESSIBLE_CAUTION")

    # Bridge E21 (MIOT Bridge over Adyar River) blocked
    status_blocked = geo_service.evaluate_facility_accessibility(
        blocked_edge_ids=["E21"],
        zone_risk_dict={12: "Critical"}
    )
    miot_blocked = next(h for h in status_blocked["hospitals"] if h["id"] == "HOSP-06")
    assert miot_blocked["emergency_status"] in ("INACCESSIBLE_SUBMERGED", "AT_RISK_SURGE")
    assert status_blocked["readiness_percentage"] < status_clear["readiness_percentage"]

# 5. Test Invalid Inputs
def test_invalid_inputs(client):
    """Verify that malformed requests and edge inputs are safely handled."""
    # Invalid zone ID -> 404
    res_bad_zone = client.get("/api/risk/zones/999")
    assert res_bad_zone.status_code == 404

    # Invalid scenario ID -> 404
    res_bad_scn = client.get("/api/scenarios/SCN-NONEXISTENT")
    assert res_bad_scn.status_code == 404

    # Invalid routing nodes -> 400
    res_bad_route = client.post("/api/routing/route", json={
        "origin_node_id": "INVALID_ORIGIN",
        "destination_node_id": "N16"
    })
    assert res_bad_route.status_code == 400

    # Negative rainfall rejected with 422 Validation Error
    res_neg_rain = client.post("/api/risk/evaluate", json={
        "rainfall_intensity_mm": -100.0,
        "water_level_index": 0.5
    })
    assert res_neg_rain.status_code == 422

# 6. Test Scenario Reset
def test_scenario_reset(client):
    """Verify scenario reset restores baseline Scenario A."""
    # Escalate to Scenario C
    client.post("/api/scenarios/SCN-C/simulate")
    ov_c = client.get("/api/dashboard/overview").json()
    assert ov_c["active_scenario_id"] == "SCN-C"

    # Reset
    res_reset = client.post("/api/scenarios/SCN-A/reset")
    assert res_reset.status_code == 200
    ov_reset = client.get("/api/dashboard/overview").json()
    assert ov_reset["active_scenario_id"] == "SCN-A"
    assert ov_reset["active_severity"] == "MODERATE"

# 7. Test Persistence Across Backend Restarts
def test_persistence_across_backend_restarts():
    """Verify database run records persist across database session restarts."""
    # Run a simulation and capture run ID
    db = SessionLocal()
    try:
        run_state = simulator_service.run_simulation(db, scenario_id="SCN-B")
        saved_run_id = run_state["run_id"]
    finally:
        db.close()

    # Simulate fresh restart: create a new isolated session and query
    new_db = SessionLocal()
    try:
        record = new_db.query(ScenarioRunRecord).filter(ScenarioRunRecord.id == saved_run_id).first()
        assert record is not None, f"Run {saved_run_id} must persist in SQLite database"
        assert record.scenario_name == "Scenario B — Severe Urban Inundation"
        assert record.rainfall_intensity_mm == 245.0
        assert record.total_affected_zones == 15
        assert len(record.zone_assessments_json) == 15
        assert record.allocations_json is not None
    finally:
        new_db.close()
