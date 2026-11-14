import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["service"] == "NADI-NET"
    assert data["offline_demo_ready"] is True

def test_system_status(client):
    res = client.get("/api/system/status")
    assert res.status_code == 200
    data = res.json()
    assert "modules" in data
    assert "provenance_standards" in data

def test_dashboard_overview(client):
    res = client.get("/api/dashboard/overview")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert len(data["metrics"]) >= 5
    assert "hospital_readiness_pct" in data

def test_risk_zones(client):
    res = client.get("/api/risk/zones")
    assert res.status_code == 200
    data = res.json()
    assert data["total_zones"] == 15
    assert len(data["zones"]) == 15

def test_map_roads(client):
    res = client.get("/api/map/roads")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 20

def test_scenarios_lifecycle(client):
    # 1. List scenarios
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()["scenarios"]
    assert len(scenarios) >= 3

    # 2. Simulate Scenario B
    res_b = client.post("/api/scenarios/SCN-B/simulate")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["data"]["scenario"]["id"] == "SCN-B"
    assert len(data_b["data"]["blocked_edge_ids"]) >= 3

    # 3. Check dashboard reflects Scenario B
    dash_res = client.get("/api/dashboard/overview")
    assert dash_res.json()["active_scenario_id"] == "SCN-B"

    # 4. Reset to Scenario A
    res_reset = client.post("/api/scenarios/SCN-A/reset")
    assert res_reset.status_code == 200
    dash_reset = client.get("/api/dashboard/overview")
    assert dash_reset.json()["active_scenario_id"] == "SCN-A"
