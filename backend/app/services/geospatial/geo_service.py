import json
import math
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings

def haversine_distance_km(coord1: List[float], coord2: List[float]) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class GeospatialService:
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.zones = self._load_json("chennai_zones.json")
        self.facilities = self._load_json("chennai_facilities.json")
        self.road_data = self._load_json("chennai_road_network.json")

    def _load_json(self, filename: str) -> Any:
        path = self.data_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Required dataset {filename} not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_zones_geojson(self) -> Dict[str, Any]:
        """Convert zone centroids and bounding approximations into GeoJSON FeatureCollection."""
        features = []
        for z in self.zones:
            lat, lon = z["centroid"]
            # Generate an illustrative polygonal approximation based on area
            radius_deg = math.sqrt(z["area_sq_km"]) / 111.0 / 2.0
            polygon = [
                [lon - radius_deg, lat - radius_deg],
                [lon + radius_deg, lat - radius_deg],
                [lon + radius_deg, lat + radius_deg],
                [lon - radius_deg, lat + radius_deg],
                [lon - radius_deg, lat - radius_deg]
            ]
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [polygon]
                },
                "properties": {
                    "zone_id": z["zone_id"],
                    "name": z["name"],
                    "region": z["region"],
                    "population": z["population"],
                    "elevation_m": z["baseline_elevation_m"],
                    "vulnerability_index": z["vulnerability_index"],
                    "historical_flood_risk": z["historical_flood_risk"],
                    "major_waterbody": z.get("major_waterbody"),
                    "centroid": [lat, lon],
                    "provenance": z.get("provenance", "HISTORICAL")
                }
            })
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_facilities(self) -> Dict[str, Any]:
        return self.facilities

    def get_road_network(self, blocked_edge_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        blocked_set = set(blocked_edge_ids or [])
        edges_with_status = []
        for e in self.road_data.get("edges", []):
            edge_copy = dict(e)
            edge_copy["is_blocked"] = edge_copy["id"] in blocked_set
            edges_with_status.append(edge_copy)
        
        return {
            "nodes": self.road_data.get("nodes", []),
            "edges": edges_with_status,
            "blocked_count": len(blocked_set),
            "provenance": "OBSERVED_NETWORK_SIMULATED_STATUS" if blocked_set else "OBSERVED"
        }

    def find_nearest_node(self, coord: List[float]) -> Dict[str, Any]:
        """Find the nearest road network node to given coordinates [lat, lon]."""
        min_dist = float("inf")
        nearest = None
        for n in self.road_data.get("nodes", []):
            dist = haversine_distance_km(coord, [n["lat"], n["lon"]])
            if dist < min_dist:
                min_dist = dist
                nearest = n
        return nearest

    def evaluate_facility_accessibility(
        self,
        blocked_edge_ids: Optional[List[str]] = None,
        zone_risk_dict: Optional[Dict[int, str]] = None
    ) -> Dict[str, Any]:
        """Assess hospital operational and accessibility readiness."""
        blocked_set = set(blocked_edge_ids or [])
        hospitals = []
        operational_count = 0

        for h in self.facilities.get("hospitals", []):
            h_copy = dict(h)
            z_risk = (zone_risk_dict or {}).get(h["zone_id"], "Moderate")
            
            # Hospital risk status combines facility structural vulnerability and surrounding zone flood
            if h["id"] == "HOSP-06" and ("E21" in blocked_set or z_risk in ("Very High", "Critical")):
                h_copy["emergency_status"] = "INACCESSIBLE_SUBMERGED"
                h_copy["reason"] = "Adyar river breach at Manapakkam; bridge E21 blocked."
            elif z_risk == "Critical":
                h_copy["emergency_status"] = "AT_RISK_SURGE"
                h_copy["reason"] = "Extreme perimeter water stagnation; boat/high-clearance access only."
                operational_count += 1
            elif h["id"] in ("HOSP-05", "HOSP-07") and ("E18" in blocked_set or "E25" in blocked_set):
                h_copy["emergency_status"] = "ACCESSIBLE_DETOUR"
                h_copy["reason"] = "Direct approach bridge submerged; bypass road operational."
                operational_count += 1
            else:
                h_copy["emergency_status"] = "FULLY_OPERATIONAL"
                h_copy["reason"] = "Direct arterial access verified clear."
                operational_count += 1

            hospitals.append(h_copy)

        total = len(hospitals)
        readiness_pct = round((operational_count / total * 100.0), 1) if total else 0.0

        return {
            "hospitals": hospitals,
            "shelters": self.facilities.get("shelters", []),
            "rescue_bases": self.facilities.get("rescue_bases", []),
            "readiness_percentage": readiness_pct,
            "total_hospitals": total,
            "operational_hospitals": operational_count,
            "provenance": "MODEL_ESTIMATE"
        }

geo_service = GeospatialService()
