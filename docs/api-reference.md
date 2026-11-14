# NADI-NET — REST API Specification

All endpoints are served under `/api` and return standardized JSON with HTTP status codes and Pydantic validation schemas.

## 1. System Endpoints
- `GET /api/health`
  - Returns service status, database connectivity, and offline demo readiness.
- `GET /api/system/status`
  - Returns engine subsystem health (MCDA, NetworkX, OR-Tools, Simulator).

## 2. Dashboard Endpoints
- `GET /api/dashboard/overview`
  - Returns active scenario metadata, 6 primary operational metric cards, critical alerts, recent activity feed, and provenance breakdown.
- `GET /api/dashboard/alerts`
  - Returns all high-priority emergency alerts requiring immediate tactical response.

## 3. Flood Intelligence Endpoints
- `GET /api/risk/zones`
  - Returns evaluated risk metrics for all 15 GCC zones (scores, categories, exposed population, priority).
- `GET /api/risk/zones/{zone_id}`
  - Returns detailed contributing factors (rainfall, elevation, historical, drainage) for a specific zone.
- `POST /api/risk/evaluate`
  - Evaluates custom rainfall, water level, and weight overrides on demand.

## 4. Geospatial Endpoints
- `GET /api/map/zones`
  - Returns GeoJSON FeatureCollection of Chennai administrative zones.
- `GET /api/map/roads`
  - Returns 25-node and 32-edge graph with dynamic `is_blocked` status.
- `GET /api/map/facilities`
  - Returns operational readiness of hospitals, evacuation shelters, and rescue staging posts.

## 5. Rescue Routing Endpoints
- `POST /api/routing/route`
  - Body: `{ origin_node_id, destination_node_id, vehicle_type, avoid_blocked_edges, blocked_edges_override }`
  - Returns primary feasible Dijkstra route, total distance, travel time, and up to 2 Yen alternative routes.

## 6. Resource Optimisation Endpoints
- `GET /api/resources`
  - Returns available rescue teams and emergency stock inventory.
- `GET /api/allocations`
  - Returns current MILP team-to-zone allocations and unmet demand list.
- `POST /api/allocations/optimise`
  - Triggers Google OR-Tools CBC solver to re-optimize allocations under active constraints.

## 7. Scenario Simulator Endpoints
- `GET /api/scenarios`
  - Lists available scenarios (Scenario A, B, C) and identifies the active one.
- `POST /api/scenarios/{scenario_id}/simulate`
  - Executes simulation for the given scenario with optional parameter overrides.
- `POST /api/scenarios/{scenario_id}/reset`
  - Restores baseline Scenario A (Moderate Monsoon Flooding).

## 8. Historical Analysis Endpoints
- `GET /api/history`
  - Returns past simulation runs from SQLite database.
- `GET /api/history/{run_id}`
  - Returns complete snapshot of state, allocations, and parameters for a specific run.
