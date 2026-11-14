# NADI-NET — Scientific Methodology & Mathematical Formulations

## 1. Flood Risk Intelligence: Multi-Criteria Decision Analysis (MCDA)

NADI-NET explicitly avoids claiming unverified black-box machine learning accuracy on simulated datasets. Instead, it utilizes an explainable, peer-reviewed Multi-Criteria Decision Analysis (MCDA) Analytical Hierarchy Process (AHP) formulation.

### 1.1 Input Feature Normalisation
Each environmental and geographical attribute is normalized to a dimensionless range $[0.0, 1.0]$:

1. **Rainfall Intensity ($R_{\text{norm}}$):**
   $$R_{\text{norm}} = \min\left(1.0, \max\left(0.0, \frac{\text{Rainfall (mm)}}{350.0}\right)\right)$$
   *Rationale:* 350 mm in 24 hours reflects the historical deluge observed during the 2015 Chennai event and Cyclone Michaung (2023).

2. **Topographical Elevation ($E_{\text{norm}}$):**
   $$E_{\text{norm}} = \max\left(0.0, \min\left(1.0, \frac{20.0 - \text{Elevation (m)}}{20.0}\right)\right)$$
   *Rationale:* Chennai's mean elevation ranges from 2m to 20m above sea level; low-lying areas (< 5m) experience extreme stagnation.

3. **Historical Flood Occurrence ($H_{\text{norm}}$):**
   Normalized frequency score $[0.0, 1.0]$ derived from Greater Chennai Corporation (GCC) records of 2015 and 2023 flood inundation maps.

4. **Drainage Density Deficit ($D_{\text{norm}}$):**
   $$D_{\text{norm}} = \max\left(0.0, \min\left(1.0, \frac{2.5 - \text{Drainage Density (\text{km/km}^2)}}{2.5}\right)\right)$$
   *Rationale:* Dense storm-water drain networks (> 2.0 km/km²) evacuate surface runoff rapidly, whereas low drainage densities (< 1.0) suffer water stagnation.

5. **Water Level Sensor Proxy ($W_{\text{norm}}$):**
   Direct telemetry index $[0.0, 1.0]$ indicating waterbody overflow near Adyar, Cooum, Kosasthalaiyar, and Buckingham Canal.

6. **Demographic Vulnerability ($V_{\text{norm}}$):**
   Socio-economic density index based on Census of India ward-level population density and slum distribution.

### 1.2 Composite Weighted Formulation
$$\text{Risk Score} = 100 \times \sum_{k \in \mathcal{K}} w_k \cdot X_{k, \text{norm}}$$
Subject to:
$$\sum_{k \in \mathcal{K}} w_k = 1.0, \quad w_k \ge 0$$
Default weights: $w_{\text{rain}} = 0.25$, $w_{\text{elev}} = 0.20$, $w_{\text{hist}} = 0.20$, $w_{\text{drain}} = 0.15$, $w_{\text{water}} = 0.10$, $w_{\text{vuln}} = 0.10$.

### 1.3 Risk Categorisation & Response Priorities
| Risk Score | Category | Response Priority | Recommended Tactical Action |
|---|---|---|---|
| 0 – 20 | Low | Priority 5 | Routine monitoring & storm-water surveillance |
| 21 – 40 | Moderate | Priority 4 | Pre-position relief rations & pump dewatering |
| 41 – 60 | High | Priority 3 | Stage volunteer teams & prepare evacuation shelters |
| 61 – 80 | Very High | Priority 2 | Urgent evacuation of ground-floor structures |
| 81 – 100 | Critical | Priority 1 | Immediate NDRF/TNFRS deployment; boat extraction |

---

## 2. Flood-Aware Rescue Routing: NetworkX Graph Formulation

### 2.1 Graph Topology
Let $G = (V, E)$ be the road network graph where:
- $V$: Intersections, bridges, and administrative centroids ($|V| = 25$).
- $E$: Road segments with distance $d_e$, base travel time $t_e$, and flood susceptibility $s_e \in [0, 1]$.

### 2.2 Dynamic Traversability & Cost Function
For each edge $e = (u, v) \in E$:
$$c(e) = \begin{cases}
\infty & \text{if } e \in E_{\text{blocked}} \text{ and vehicle is NORMAL\_RESCUE} \\
t_e \times 3.5 & \text{if } e \in E_{\text{blocked}}, s_e < 0.8, \text{ and vehicle is HIGH\_CLEARANCE} \\
\frac{d_e}{15.0} \times 60 \times 1.5 & \text{if } e \in E_{\text{blocked}} \text{ and vehicle is AMPHIBIOUS\_BOAT} \\
t_e \times (1.0 + 0.3 \cdot s_e) & \text{if } e \notin E_{\text{blocked}}
\end{cases}$$

Path determination uses Dijkstra's algorithm for the primary route and Yen's algorithm for $k$-shortest detour alternatives.

---

## 3. Resource Optimisation: Mixed-Integer Linear Programming (MILP)

### 3.1 Decision Variables
Let $x_{i, j} \in \{0, 1\}$ be 1 if rescue team $i$ is assigned to affected zone $j$, and 0 otherwise.

### 3.2 Objective Function
$$\max \sum_{j \in \mathcal{J}} \left( P_j \cdot M \cdot \sum_{i \in \mathcal{I}} x_{i, j} \right) - \sum_{i \in \mathcal{I}} \sum_{j \in \mathcal{J}} \lambda \cdot T_{i, j} \cdot x_{i, j}$$
Where:
- $P_j$: Priority weight ($P_{\text{Crit}} = 5000, P_{\text{VHigh}} = 2000, P_{\text{High}} = 800$).
- $T_{i, j}$: Shortest path transit time in minutes from team $i$'s base to zone $j$.
- $\lambda$: Transit penalty coefficient ($\lambda = 1.5$).
- $M$: Priority multiplier ($M = 1.0$).

### 3.3 Constraints
1. **Team Capacity:** Each team assigned to at most one zone:
   $$\sum_{j \in \mathcal{J}} x_{i, j} \le 1, \quad \forall i \in \mathcal{I}$$
2. **Zone Demand Bound:**
   $$\sum_{i \in \mathcal{I}} x_{i, j} \le D_j, \quad \forall j \in \mathcal{J}$$
3. **Route Feasibility:**
   $$x_{i, j} = 0, \quad \forall (i, j) \text{ where } T_{i, j} = \infty$$
