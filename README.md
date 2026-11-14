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

---

## 3. Data Provenance & Scientific Integrity

NADI-NET explicitly labels every data point with its provenance class:
- **OBSERVED:** Physical entities (Chennai hospitals, beds, road nodes, SRTM elevation).
- **HISTORICAL:** Empirical 2015 & 2023 Michaung flood vulnerability scores.
- **MODEL_ESTIMATE:** Algorithmic outputs (MCDA risk scores, NetworkX routes, OR-Tools allocations).
- **SIMULATED:** Scenario inputs (rainfall intensity, water level sensor index, road cut triggers).

---

## 4. Quick Start & Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.11, 3.12, 3.13)
- Node.js 18+ and npm
- Windows 11 / Linux / macOS

### 1. Clone & Setup Workspace
```bash
git clone https://github.com/your-org/nadi-net.git
cd nadi-net
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Initialize database & seed baseline Chennai datasets
python scripts/seed_database.py

# Run FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend Setup
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Automated Verification & Testing

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

## 6. Project Architecture

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

## 7. License & Credits

Developed under the **MIT License**.  
Participating in **K! Hacks 4.0 — CEG Tech Forum, Anna University, Chennai**.
