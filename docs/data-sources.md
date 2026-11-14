# NADI-NET — Data Sources, Baseline Assumptions & Provenance

## 1. Data Classification Standard
To ensure absolute scientific honesty and avoid presenting simulated inputs as real-world sensor telemetry, NADI-NET categorizes all system data into four explicit classes:

```
+------------------+-------------------------------------------------------------+
| Provenance Class | Description & NADI-NET Implementation                       |
+------------------+-------------------------------------------------------------+
| OBSERVED         | Verified physical entities (Chennai hospitals, shelters,   |
|                  | road network intersections, baseline elevations).           |
| HISTORICAL       | Empirical flood inundation data from 2015 & 2023 events     |
|                  | across GCC zones and drainage channels.                     |
| MODEL_ESTIMATE   | Computed algorithmic outputs (MCDA risk scores, NetworkX    |
|                  | Dijkstra paths, Google OR-Tools MILP allocations).          |
| SIMULATED        | Dynamic scenario parameters (rainfall intensity, water-body |
|                  | level indices, emergency road closures).                    |
+------------------+-------------------------------------------------------------+
```

---

## 2. Integrated Data Repositories

### 2.1 Chennai Municipal Administrative Zones (GCC)
- **Source:** Greater Chennai Corporation (GCC) & OpenStreetMap Administrative Boundaries.
- **Count:** 15 Zones (Thiruvottiyur to Sholinganallur).
- **Attributes:** Centroid coordinates, baseline elevation (USGS SRTM 30m), ward population (Census of India), historical flood risk factor, and primary drainage basin.
- **File:** `data/demo/chennai_zones.json`

### 2.2 Hospital & Medical Infrastructure
- **Source:** National Health Mission Tamil Nadu, GCC Health Department, OpenStreetMap verified points of interest.
- **Entities:**
  - Rajiv Gandhi Govt General Hospital (Park Town / Zone 5) — 2,700 Beds, 180 ICU
  - Govt Stanley Medical College Hospital (Royapuram / Zone 5) — 1,580 Beds, 120 ICU
  - Govt Kilpauk Medical College Hospital (Kilpauk / Zone 8) — 1,050 Beds, 95 ICU
  - Apollo Hospitals Main (Greams Rd / Zone 9) — 750 Beds, 110 ICU
  - Fortis Malar Hospital (Adyar / Zone 13) — 180 Beds, 45 ICU
  - MIOT International (Manapakkam / Zone 12) — 1,000 Beds, 140 ICU (Historically vulnerable river corridor)
  - Dr. Kamakshi Memorial Hospital (Pallikaranai / Zone 14) — 300 Beds, 50 ICU
  - Gleneagles Global Health City (Perumbakkam / Zone 15) — 450 Beds, 65 ICU
- **File:** `data/demo/chennai_facilities.json`

### 2.3 Emergency Relief Shelters & Evacuation Centers
- **Source:** GCC Disaster Management Division Community Centers & Tamil Nadu SDMA.
- **Entities:** Jawaharlal Nehru Stadium Relief Hub (Cap: 3500), Chennai Trade Centre (Cap: 2800), Anna University Hall (Cap: 2200), Ambattur Complex (Cap: 1500), Perungudi Multi-Purpose Shelter (Cap: 1200), Madhavaram Truck Terminal Post (Cap: 1800).
- **File:** `data/demo/chennai_facilities.json`

### 2.4 Chennai Arterial Road Network Graph
- **Source:** OpenStreetMap highway extract simplified to 25 critical nodes and 32 bidirectional arterial segments.
- **Critical Corridors:**
  - Anna Salai (Central to Gemini to Saidapet)
  - Poonamallee High Road (EVR Periyar Salai)
  - Maraimalai Adigal Bridge over Adyar River (Saidapet to Guindy) — High flood risk
  - MIOT Adyar River Causeway (Manapakkam to Guindy) — Critical flood risk
  - 200 Feet Radial Road (Kathipara to Pallikaranai)
  - Rajiv Gandhi Salai (OMR IT Corridor)
  - Inner Ring Road (Retteri to Koyambedu)
- **File:** `data/demo/chennai_road_network.json`

### 2.5 Tactical Rescue Teams
- **Source:** Tamil Nadu Fire & Rescue Services (TNFRS), National Disaster Response Force (NDRF 04 Battalion Arakkonam/Guindy Staging), State Disaster Response Force (SDRF), and Indian Coast Guard Air Station Meenambakkam.
- **Attributes:** Personnel, vehicle capability (Amphibious truck, 4WD rescue, inflatable motorboat), equipment payload, base location.
- **File:** `data/demo/rescue_teams.json`
