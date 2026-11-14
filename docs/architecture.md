# NADI-NET — System Architecture & Design Specification

## 1. Executive Summary
**NADI-NET** is an AI-driven urban flood response intelligence and emergency resource optimisation platform engineered specifically for Chennai, India. It bridges the critical operational gap between raw hydrological forecasting and coordinated municipal emergency response during monsoon and cyclonic deluge events.

```
+-------------------------------------------------------------------------------+
|                           NADI-NET FRONTEND (React 19 / Vite)                 |
|  Command Centre | Flood Intelligence | Geospatial Grid | Routing | OR-Tools   |
+-------------------------------------------------------------------------------+
                                      |
                           REST API (HTTP/JSON)
                                      v
+-------------------------------------------------------------------------------+
|                           FASTAPI APPLICATION SERVER                          |
|  - /api/dashboard    - /api/risk       - /api/map                             |
|  - /api/routing      - /api/resources  - /api/scenarios                       |
+-------------------------------------------------------------------------------+
           |                     |                     |                  |
           v                     v                     v                  v
+--------------------+ +--------------------+ +-----------------+ +-------------+
| Flood Intelligence | | Rescue Router      | | MILP Allocator  | | Simulator   |
| Engine (AHP MCDA)  | | (NetworkX Dijkstra)| | (OR-Tools CBC)  | | Engine      |
+--------------------+ +--------------------+ +-----------------+ +-------------+
           |                     |                     |                  |
           +---------------------+---------------------+------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                      PERSISTENCE & REPOSITORIES (SQLite / JSON)               |
|  - SQLite (Runs, Logs, Audits)  - Verified Chennai Geo Datasets (15 Zones)    |
|  - Authentic Hospital Network   - Routable 25-Node Arterial Road Graph        |
+-------------------------------------------------------------------------------+
```

---

## 2. Modular Subsystems

### 2.1 Module 1 — Emergency Command Centre
The central dashboard continuously aggregates:
- Active scenario severity (Moderate, Severe, Critical).
- Total exposed population calculated by MCDA.
- Active tactical rescue team deployments.
- Submerged arterial river bridges.
- Hospital operational readiness status.

### 2.2 Module 2 — Flood Intelligence Engine (MCDA AHP)
Computes explainable risk scores ($0 - 100$) for each of Chennai's 15 municipal zones:
$$\text{Score} = (w_r R_{\text{rain}} + w_e E_{\text{elev}} + w_h H_{\text{hist}} + w_d D_{\text{drain}} + w_w W_{\text{water}} + w_v V_{\text{vuln}}) \times 100$$
Each parameter is normalized into $[0, 1]$ before weighted accumulation.

### 2.3 Module 3 — Chennai Geospatial Operations
Maintains topological layers:
- 15 GCC Zones (centroids, bounding coordinates, population, historical flood frequency).
- 25-Node Arterial Road Graph connecting key interchanges (Anna Salai, Poonamallee High Rd, 100ft Road, OMR, GST Road).
- 8 Verified Hospitals (RGGGH, Stanley, Kilpauk, MIOT, Fortis Malar, Kamakshi, etc.).
- 6 Verified Evacuation Shelters & 6 NDRF/TNFRS staging bases.

### 2.4 Module 4 — Flood-Aware Rescue Routing Engine
Represents Chennai road network as a NetworkX directed/undirected graph with dynamic flood penalties. Submerged edges (e.g. Maraimalai Adigal Bridge over Adyar River) receive infinite edge costs for standard rescue vehicles, forcing the algorithm to discover viable detours (e.g., via Jawaharlal Nehru 100ft Road).

### 2.5 Module 5 — Google OR-Tools Resource Allocator (MILP)
Solves a Mixed-Integer Linear Program (MILP) using the CBC solver:
- Prioritizes Priority 1 (Critical) zones.
- Minimizes total travel transit delay.
- Enforces single-team-per-destination and resource inventory bounds.
- Captures unmet destinations and records mathematical justifications.

### 2.6 Module 6 — Emergency Scenario Simulator
Supports immediate state transitions across predefined scenarios (A: Moderate, B: Severe, C: Critical) and custom sliders without server restart. Updates propagate through the entire pipeline deterministically.
