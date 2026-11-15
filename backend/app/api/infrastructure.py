"""
NADI-NET — Infrastructure Decision Support API
Provides critical road-link restoration rankings and network redundancy metrics.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.replanning import CriticalLinksResponse
from backend.app.services.resource_optimisation.link_ranker import link_ranker_service
from backend.app.services.scenario_simulation.simulator import simulator_service

router = APIRouter(prefix="/infrastructure", tags=["Critical Infrastructure"])


@router.get("/critical-links", response_model=CriticalLinksResponse)
def get_critical_link_rankings(
    scenario_id: Optional[str] = Query(None, description="Scenario ID to evaluate (defaults to active scenario)"),
    blocked_edges: Optional[str] = Query(None, description="Comma-separated blocked edge IDs override"),
    db: Session = Depends(get_db)
):
    state = simulator_service.active_state_cache
    if not state:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")

    active_scenario = scenario_id or state.get("scenario", {}).get("id", "SCN-A")

    if blocked_edges:
        candidate_blocked = [e.strip() for e in blocked_edges.split(",") if e.strip()]
    else:
        candidate_blocked = state.get("blocked_edge_ids", [])

    return link_ranker_service.rank_blocked_links(
        blocked_edge_ids=candidate_blocked,
        scenario_id=active_scenario
    )
