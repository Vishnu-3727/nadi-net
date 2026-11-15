# NADI-NET
### AI-Driven Urban Flood Response Intelligence & Emergency Resource Optimisation System for Chennai

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![OR-Tools](https://img.shields.io/badge/Google%20OR--Tools-CBC%20MILP-orange.svg)](https://developers.google.com/optimization)
[![NetworkX](https://img.shields.io/badge/NetworkX-Graph%20Routing-red.svg)](https://networkx.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Developed for **K! Hacks 4.0** (CEG Tech Forum, Anna University, Chennai)  
**Track:** Disaster Management  
**Focus City:** Greater Chennai Corporation (GCC), Tamil Nadu, India

---

## 1. Executive Summary

Urban flooding poses severe risks to emergency governance in Chennai through rapid road severance, population displacement, and disruption of medical infrastructure. While existing meteorological systems provide rainfall forecasts, disaster responders face a crucial decision gap:

> **The 5 Core Decision Questions Answered by NADI-NET:**
> 1. **WHERE** are the most critically impacted communities?
> 2. **WHO** requires life-safety evacuation and medical assistance first?
> 3. **WHICH** major hospitals and emergency shelters remain accessible?
> 4. **HOW** can rescue teams navigate around flooded river bridges safely?
> 5. **HOW** should scarce rescue teams and relief rations be distributed mathematically?

NADI-NET bridges this gap by unifying explainable multi-criteria risk intelligence, dynamic topological road routing, and mathematical resource optimisation into one operational command centre.

---

## 2. Key Modules & Technical Innovations

### 1. Emergency Command Centre
- Unified operational situation grid with real-time severity alerts, exposed population counts, hospital readiness index, and tactical dispatch summaries.
- Dark navy emergency operations center aesthetic designed for disaster planners.

### 2. Flood Intelligence Engine (Explainable MCDA AHP)
- Mathematically normalized Multi-Criteria Decision Analysis evaluating:
  $$\text{Score} = (w_r R_{\text{rain}} + w_e E_{\text{elev}} + w_h H_{\text{hist}} + w_d D_{\text{drain}} + w_w W_{\text{water}} + w_v V_{\text{vuln}}) \times 100$$
- Completely transparent factor attribution and configurable weight sliders. Zero unverified black-box claims.

### 3. Chennai Geospatial Operations Grid
- 15 Greater Chennai Corporation (GCC) zones with genuine demographic data.
- 8 Verified major Chennai hospitals (RGGGH, Stanley, Kilpauk, MIOT, Fortis Malar, etc.).
- 6 Evacuation shelters and 6 NDRF/TNFRS staging bases.
- 100% self-contained offline dataset requiring zero external API calls during demonstrations.

### 4. Flood-Aware Rescue Routing Engine (NetworkX)
- 25-node, 32-edge arterial Chennai road graph (Anna Salai, Poonamallee High Rd, 100ft Rd, OMR, GST Rd).
- Dijkstra shortest path with dynamic flood severance penalties.
- Yen's algorithm for alternative detour discovery when river bridges (e.g. Maraimalai Adigal Bridge over Adyar River) are submerged.
- Multi-vehicle support: Normal 4WD, High-Clearance Truck, Amphibious Motorboat.

### 5. Emergency Resource Optimisation Engine (Google OR-Tools MILP)
- Mixed-Integer Linear Programming (MILP) using the CBC solver.
- Maximizes life-safety coverage for Priority 1 zones while minimizing response transit time.
- Single-team capacity and inventory stock constraints.
- Explicit deficit reporting documenting why unmet zones could not be served.

### 6. Dynamic Scenario Simulator
- Preconfigured Scenarios:
  - **Scenario A:** Moderate Monsoon Flooding (85 mm, 1 road cut, 12 teams).
  - **Scenario B:** Severe Urban Inundation (245 mm, Adyar bridges submerged, 7 teams).
  - **Scenario C:** Critical Multi-Basin Emergency (430 mm deluge, major severance, 4 teams).
- Live parameter sliders propagating state changes deterministically across all modules without server restart.

### 7. v2 Additions
- **Flood-depth scenario engine** (`flood_depth_engine.py`): turns rainfall, tidal surge and blocked edges into per-road `[min, expected, max]` depth ranges. Transparent scenario assumptions, not a hydrodynamic forecast.
- **Vehicle accessibility** (`vehicle_accessibility.py`): each vehicle has a wading-depth limit, flow-velocity limit and banned structures (e.g. underpasses). A road is passable per vehicle, not just per scenario.
- **Multi-modal routing** (`multimodal_router.py`): road graph plus a synthetic waterway graph. Boats cannot use dry roads, trucks cannot enter water, and mode switches happen only at boat launch hubs.
- **Critical-link restoration ranking** (`link_ranker.py`): ranks blocked roads by how much population, hospital and shelter access is regained if crews reopen them.
- **Dynamic replanning** (`replanner.py`, `POST /allocations/replan`): injects events (road collapse, vehicle breakdown, shelter closure) and re-solves the MILP with minimal disruption, keeping completed missions intact.

---

## 3. How It Works

```
 Scenario inputs (rain mm, tide, blocked roads, team count)
            │
            ▼
 ┌──────────────────────┐   ┌─────────────────────────┐
 │ 1. Flood Intelligence │   │ 2. Flood depth per road │
 │  MCDA score per zone  │   │  min / expected / max   │
 └──────────┬───────────┘   └────────────┬────────────┘
            │ risk + priority            │ passable? per vehicle
            ▼                            ▼
        ┌─────────────────────────────────────┐
        │ 3. Routing: NetworkX Dijkstra + Yen │
        │    road graph (+ water graph)       │
        └──────────────────┬──────────────────┘
                           │ travel times, reachability
                           ▼
        ┌─────────────────────────────────────┐
        │ 4. Allocation: OR-Tools CBC MILP    │
        │    teams → zones, supplies → zones  │
        └──────────────────┬──────────────────┘
                           ▼
        FastAPI  ──►  SQLite log  ──►  React command centre
```

1. **Score risk.** For each of the 15 zones, six factors (rainfall, elevation, flood history, drainage, water level, social vulnerability) are normalised to 0-1 and combined with AHP weights into a 0-100 score. Every factor's contribution is reported, so a planner sees why a zone is critical. Missing inputs are imputed and lower a confidence value instead of being hidden.
2. **Estimate road conditions.** The scenario sets a depth range on each road segment. A vehicle profile (ambulance, 4WD, high-clearance truck, amphibious boat) decides whether that depth is passable.
3. **Route around damage.** Edges that are blocked or too deep for the vehicle get a severance penalty or are removed. Dijkstra finds the fastest path. If a bridge is submerged, Yen's k-shortest-paths returns detours. A destination with no path is reported as unreachable, never guessed.
4. **Allocate scarce resources.** A mixed-integer program assigns each rescue team to at most one zone and splits relief stock. It maximises covered high-priority population and minimises transit time. A penalty variable per zone makes leaving a critical zone unserved very expensive. Zones that still go unserved get an explicit deficit reason (no team, no stock, unreachable).
5. **Replan when things change.** New events re-run steps 3-4 with finished missions locked, so the plan changes as little as possible.
6. **Show it.** FastAPI serves results from the active scenario cache. Changing a slider re-runs the whole chain. Runs are logged to SQLite and survive restarts. The React UI (Leaflet dark map, 8 tabs) renders backend state only, with a provenance badge on every figure.

### Where each step lives

| Step | Code |
|---|---|
| Risk scoring | `backend/app/services/flood_intelligence/risk_engine.py` |
| Flood depth | `backend/app/services/flood_intelligence/flood_depth_engine.py` |
| Vehicle rules | `backend/app/services/routing/vehicle_accessibility.py` |
| Routing | `backend/app/services/routing/rescue_router.py`, `multimodal_router.py` |
| Allocation | `backend/app/services/resource_optimisation/allocator.py` |
| Replanning, link ranking | `replanner.py`, `link_ranker.py` (same folder as allocator) |
| Scenario orchestration | `backend/app/services/scenario_simulation/simulator.py` |

---

## 4. Data Provenance & Scientific Integrity

NADI-NET explicitly labels every data point with its provenance class:
- **OBSERVED:** Physical entities (Chennai hospitals, beds, road nodes, SRTM elevation).
- **HISTORICAL:** Empirical 2015 & 2023 Michaung flood vulnerability scores.
- **MODEL_ESTIMATE:** Algorithmic outputs (MCDA risk scores, NetworkX routes, OR-Tools allocations).
- **SIMULATED:** Scenario inputs (rainfall intensity, water level sensor index, road cut triggers).

---

## 5. Quick Start & Step-by-Step Run Guide

### Prerequisites
- **Python:** 3.10 to 3.13 (`python --version`)
- **Node.js:** 18+ and npm (`node -v` and `npm -v`)
- **Git:** (`git --version`)
- Supported OS: Windows 10/11, Ubuntu/Debian/Linux, macOS

---

### Step 1: Clone the Repository
Open your terminal (PowerShell, Git Bash, or Terminal):
```bash
git clone https://github.com/Vishnu-3727/nadi-net.git
cd nadi-net
```

---

### Step 2: Backend Setup & Launch

#### A. Create & Activate Virtual Environment (Recommended)
- **Windows (Git Bash):**
  ```bash
  python -m venv venv
  source venv/Scripts/activate
  ```
- **Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **Linux / macOS:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

#### B. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### C. Validate Datasets & Initialize Database
```bash
# 1. Verify CRS (EPSG:4326), zone boundaries and road graph topology (100% offline)
python scripts/validate_datasets.py

# 2. Seed database tables and execute baseline scenario
python scripts/seed_database.py
```

#### D. Start the FastAPI Backend Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 3: Frontend Setup & Launch
Open a **new, second terminal window** in the `nadi-net` directory:

```bash
cd frontend
npm install
npm run dev
```

The Command Centre web application will start immediately:
- **Application URL:** [http://localhost:5173](http://localhost:5173)

---

### Step 4: Run Verification Tests (80 / 80 Passing)
In the first terminal (with virtual environment active):
```bash
python -m pytest backend/tests -v
```
All 80 tests verify:
- MCDA flood risk calculations and confidence scoring.
- Scenario flood depth bounds and vehicle wading limits.
- Separate road and water routing with boat transfer ramps.
- OR-Tools MILP team exclusivity, shelter capacity, and supply conservation.
- Real-time dynamic replanning and critical road link restoration ranking.

---

## 6. Automated Verification & Testing

Run the automated backend test suite:
```bash
python -m pytest backend/tests -v
```
**Test Coverage Includes:**
- `test_risk_engine.py`: MCDA scoring, boundary limits, factor sums, sensitivity to rainfall.
- `test_routing.py`: Dijkstra reachability, bridge blockage rerouting, detour alternatives.
- `test_optimisation.py`: Google OR-Tools CBC MILP solver, capacity bounds, priority enforcement.
- `test_api.py`: FastAPI end-to-end endpoints, scenario lifecycle, reset verification.

---

## 7. Project Architecture

```
nadi-net/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── methodology.md
│   ├── data-sources.md
│   ├── api-reference.md
│   ├── demo-guide.md
│   └── limitations.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/config.py
│   │   ├── models/database.py
│   │   ├── database/session.py
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── flood_intelligence/risk_engine.py
│   │   │   ├── geospatial/geo_service.py
│   │   │   ├── routing/rescue_router.py
│   │   │   ├── resource_optimisation/allocator.py
│   │   │   └── scenario_simulation/simulator.py
│   │   └── api/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── data/demo/
│   ├── chennai_zones.json
│   ├── chennai_facilities.json
│   ├── chennai_road_network.json
│   ├── rescue_teams.json
│   └── scenarios.json
└── scripts/
    ├── seed_database.py
    └── setup_demo.py
```

---

## 8. License & Credits

Developed under the **MIT License**.  
Participating in **K! Hacks 4.0 — CEG Tech Forum, Anna University, Chennai**.
