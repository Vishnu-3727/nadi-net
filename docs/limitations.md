# NADI-NET — System Limitations & Future Research Roadmap

## 1. Current Known Limitations

### 1.1 Decision-Support Prototype vs Operational Mission-Critical System
- NADI-NET is engineered as an **interactive decision-support prototype** for municipal and disaster planners. It is not an operational governmental command harness directly coupled to live telemetry SCADA networks.
- Field deployment in an active municipal operations center would require formal integration with GCC's Integrated Command and Control Centre (ICCC) and Tamil Nadu State Emergency Operations Centre (TNSDMA SEOC).

### 1.2 Hydrological Elevation Model Resolution
- Current baseline elevations are derived from USGS SRTM 30m digital elevation models.
- While sufficient for macro-level zone vulnerability and basin drainage slope assessment, urban micro-topography (such as flyover underpasses and micro-drainage culverts) requires high-resolution LiDAR (1m–2m) datasets when made publicly available by state agencies.

### 1.3 Machine Learning Generalization
- The current flood risk engine relies on an explainable Multi-Criteria Decision Analysis (MCDA) AHP model.
- Gradient boosting (e.g., XGBoost) or graph neural network (GNN) models were deliberately excluded until physical IoT water-level sensor telemetry datasets are calibrated over multiple monsoon seasons.

### 1.4 Dynamic Traffic Congestion Coupling
- The routing engine dynamically accounts for flood severances, bridge submergences, and flood-risk speed degradation.
- Real-time vehicular traffic density (e.g. from Google Traffic API or city CCTV cameras) is currently represented as baseline road design capacity rather than real-time vehicular queue lengths.

---

## 2. Future Technical Roadmap

1. **IoT Water-Level Sensor Ingestion:**
   Integrate real-time LoRaWAN water-level sensors deployed along Adyar River, Cooum River, Buckingham Canal, and Otteri Nullah.
2. **Citizen SOS Dispatch Ingestion:**
   Provide a verified citizen emergency reporting channel via mobile app and SMS gateway with automated geo-triangulation.
3. **Multi-Period Fleet Dispatching (VRP with Time Windows):**
   Extend Google OR-Tools from single-period assignment to dynamic Vehicle Routing Problem with Time Windows (VRPTW) supporting battery and fuel replenishment cycles.
