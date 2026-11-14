# NADI-NET — 3-5 Minute Hackathon Judge Demonstration Script

Follow this exact workflow during live evaluation at **K! Hacks 4.0 (Anna University, CEG Tech Forum)**.

---

### Step 1 — Opening the Command Centre (0:00 – 0:45)
1. **Screen:** Command Centre (`LayoutDashboard`).
2. **Talking Points:**
   - *"Respected judges, during catastrophic urban flooding in Chennai—such as in 2015 and Cyclone Michaung—the primary breakdown is not forecasting rainfall, but deciding how to respond in real time: Where is the population most severely trapped? Which arterial river bridges are cut? Which hospitals remain accessible? And how should limited rescue teams be prioritized mathematically?"*
   - *"NADI-NET is an AI-assisted urban flood emergency decision-support platform engineered for the Greater Chennai Corporation (GCC) and State Disaster Management Authority."*
   - *"Notice our Command Centre: every number displayed is derived from real application state and verified Chennai infrastructure, backed by explicit data provenance classifications."*

---

### Step 2 — Flood Intelligence & Explainable MCDA (0:45 – 1:30)
1. **Action:** Click **Flood Intelligence** in the left sidebar.
2. **Demonstration:**
   - Show the 15 GCC Zones risk spectrum chart.
   - Point out that Zone 2 (Manali) and Zone 14 (Perungudi / Pallikaranai) have high risk scores due to low elevation (< 3.5m) and drainage basin stagnation.
   - Adjust the **Rainfall Intensity Slider** (e.g., from 180mm to 320mm) and click **Re-evaluate Risk Scores**.
   - Show the instant explainable recalculation: factor contributions (Rainfall, Elevation, Historical Flood, Drainage Density) sum up deterministically.
   - Emphasize: *"We do not present a black-box ML model without sensor training data; we use an explainable, configurable Multi-Criteria Decision Analysis model."*

---

### Step 3 — Geospatial Infrastructure & Hospital Accessibility (1:30 – 2:15)
1. **Action:** Click **Geospatial Operations**.
2. **Demonstration:**
   - Toggle layers: Zones, Road Network Graph, 8 Real Hospitals, 6 Relief Shelters.
   - Point out MIOT International (Manapakkam) on the Adyar river basin.
   - Show that hospital accessibility is evaluated in real time based on perimeter flood risk and bridge severances.

---

### Step 4 — Flood-Aware Rescue Routing & Road Severance (2:15 – 3:00)
1. **Action:** Click **Rescue Routing**.
2. **Demonstration:**
   - Select Origin: `N01: Chennai Central / Park Town`.
   - Select Destination: `N16: Kathipara Cloverleaf (Guindy)`.
   - Click **Calculate Rescue Route**.
   - Show the primary route using the Maraimalai Adigal Bridge over the Adyar River (E18).
   - Now toggle **E18 to Submerged / Blocked** and recalculate.
   - Show that the routing engine immediately identifies the bridge closure, avoids the impassable corridor, and computes a safe detour via the Jawaharlal Nehru 100ft arterial road (+9.4 min).
   - Switch vehicle to **Amphibious Motorboat** to demonstrate specialized transit capabilities.

---

### Step 5 — Emergency Resource Optimisation via Google OR-Tools (3:00 – 4:00)
1. **Action:** Click **Resource Optimisation**.
2. **Demonstration:**
   - Explain: *"When 10 zones are flooded but only 4 rescue teams are operational, naive nearest-neighbor assignment can leave critical life-safety zones stranded."*
   - Click **Re-run OR-Tools Solver**.
   - Point out the solver status: **OPTIMAL (Google OR-Tools CBC MILP)** executed in ~15 milliseconds.
   - Inspect the table: NDRF and TNFRS teams are allocated to Priority 1 zones with vehicle matching and supply payloads.
   - Point to the **Unserved Demand Gaps Table**: show how the system explicitly explains *why* lower-priority zones could not be served due to resource exhaustion or road severance.

---

### Step 6 — Escalating the Scenario & Conclusion (4:00 – 4:30)
1. **Action:** Click **Scenario Simulator**.
2. **Demonstration:**
   - Switch to **Scenario C — Critical Multi-Basin Emergency (430 mm deluge)**.
   - Click **Simulate & Propagate Scenario**.
   - Show how the entire application updates: Command Centre metrics shift to Critical, hospital readiness drops, Adyar and Kosasthalaiyar crossings are cut, and rescue allocations re-solve instantly.
   - Click **Restore Baseline Scenario A** to demonstrate deterministic, repeatable state recovery.
   - Conclude: *"NADI-NET is 100% self-contained, fully operable offline without external internet dependence, and bridges the gap between flood data and tactical life-saving action."*
