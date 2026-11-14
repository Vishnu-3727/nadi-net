import pytest
from backend.app.services.flood_intelligence.risk_engine import FloodIntelligenceEngine
from backend.app.schemas.risk import RiskWeights

@pytest.fixture
def engine():
    return FloodIntelligenceEngine()

def test_risk_engine_baseline(engine):
    summary = engine.evaluate_all_zones(rainfall_mm=100.0, water_level_index=0.3, is_simulated=True)
    assert summary.total_zones == 15
    assert 0.0 <= summary.average_risk_score <= 100.0
    assert summary.total_exposed_population > 0
    assert "Low" in summary.category_counts or "Moderate" in summary.category_counts

def test_risk_monotonic_increase_with_rainfall(engine):
    low_rain = engine.evaluate_all_zones(rainfall_mm=50.0, water_level_index=0.2)
    high_rain = engine.evaluate_all_zones(rainfall_mm=400.0, water_level_index=0.9)

    assert high_rain.average_risk_score > low_rain.average_risk_score
    assert high_rain.total_exposed_population > low_rain.total_exposed_population

def test_custom_weights_effect(engine):
    # Give all weight to elevation
    w_elev = RiskWeights(rainfall=0.0, elevation=1.0, historical=0.0, drainage=0.0, water_level=0.0, vulnerability=0.0)
    summary = engine.evaluate_all_zones(rainfall_mm=100.0, water_level_index=0.5, weights=w_elev)
    # Zone 2 (Manali, elevation 3.1m) should have higher risk than Zone 7 (Ambattur, elevation 14.8m)
    manali = next(z for z in summary.zones if z.zone_id == 2)
    ambattur = next(z for z in summary.zones if z.zone_id == 7)
    assert manali.flood_risk_score > ambattur.flood_risk_score

def test_explainable_contributing_factors(engine):
    summary = engine.evaluate_all_zones(rainfall_mm=150.0, water_level_index=0.5)
    for z in summary.zones:
        cf = z.contributing_factors
        factor_sum = (
            cf.rainfall_contribution +
            cf.elevation_contribution +
            cf.historical_contribution +
            cf.drainage_contribution +
            cf.water_level_contribution +
            cf.vulnerability_contribution
        )
        assert abs(factor_sum - z.flood_risk_score) <= 1.0  # within rounding tolerance
