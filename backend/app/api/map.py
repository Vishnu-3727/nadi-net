from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.geospatial.geo_service import geo_service
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/map", tags=["Geospatial"])

@router.get("/zones")
def get_map_zones():
    return geo_service.get_zones_geojson()

@router.get("/roads")
def get_map_roads(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    blocked = state.get("blocked_edge_ids", [])
    return geo_service.get_road_network(blocked)

@router.get("/facilities")
def get_map_facilities(db: Session = Depends(get_db)):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
    return state.get("facilities", geo_service.get_facilities())

@router.get("/waterways")
def get_map_waterways():
    from backend.app.services.routing.waterway_network import waterway_manager
    return waterway_manager.get_network_schema()
