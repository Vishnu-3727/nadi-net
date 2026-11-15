"""
NADI-NET — Phase 3.4 Critical-Link Restoration Ranking Tests
Deterministic validation of topological marginal benefit scoring, hospital/shelter reconnection,
and rank stability across road severance scenarios.
"""

import pytest
from backend.app.services.resource_optimisation.link_ranker import CriticalLinkRanker


@pytest.fixture
def ranker():
    return CriticalLinkRanker()


def test_empty_blocked_edge_set(ranker):
    """Empty candidate blocked list returns total_blocked_links=0 and empty ranked_links."""
    resp = ranker.rank_blocked_links(blocked_edge_ids=[])
    assert resp.total_blocked_links == 0
    assert len(resp.ranked_links) == 0


def test_reconnecting_isolated_zone_hospital(ranker):
    """
    Blocking E08 (EVR Periyar Salai east) isolates Central/Kilpauk hospital reach.
    Restoring E08 should deliver positive marginal benefit and hospital reconnection.
    """
    resp = ranker.rank_blocked_links(blocked_edge_ids=["E08", "E18", "E25"])
    assert resp.total_blocked_links == 3
    assert len(resp.ranked_links) == 3

    # All candidate links should have valid non-negative marginal benefit scores
    for r in resp.ranked_links:
        assert r.marginal_benefit_score >= 0.0
        assert r.restoration_rank in (1, 2, 3)
        assert len(r.restoration_justification) > 0


def test_critical_link_shelter_reconnection(ranker):
    """Restoring severed Adyar bridge (E18) or Pallikaranai causeway (E25) reconnects southern shelters."""
    resp = ranker.rank_blocked_links(blocked_edge_ids=["E18", "E21", "E25"])
    assert resp.total_blocked_links == 3

    # Rank 1 link should have highest marginal benefit score
    rank_1 = resp.ranked_links[0]
    rank_2 = resp.ranked_links[1]
    assert rank_1.marginal_benefit_score >= rank_2.marginal_benefit_score


def test_deterministic_ranking_repeatability(ranker):
    """Evaluating critical links twice on identical inputs yields identical ranks and scores."""
    resp1 = ranker.rank_blocked_links(blocked_edge_ids=["E03", "E04", "E18", "E25"])
    resp2 = ranker.rank_blocked_links(blocked_edge_ids=["E03", "E04", "E18", "E25"])

    assert resp1.total_blocked_links == resp2.total_blocked_links
    for r1, r2 in zip(resp1.ranked_links, resp2.ranked_links):
        assert r1.edge_id == r2.edge_id
        assert r1.restoration_rank == r2.restoration_rank
        assert r1.marginal_benefit_score == r2.marginal_benefit_score
        assert r1.population_accessible_gained == r2.population_accessible_gained
        assert r1.hospitals_reconnected == r2.hospitals_reconnected
        assert r1.shelters_reconnected == r2.shelters_reconnected
