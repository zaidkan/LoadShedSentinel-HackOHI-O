import copy

import pytest

from engine.risk import RiskService


@pytest.fixture
def network():
    return {"nodes": [{"asset_token": "T"}], "supply_paths": [
        {"premise_token": "P", "asset_tokens": ["T"], "status": "PARTIAL", "limitations": [], "evidence_refs": ["SOURCE"]}],
        "risk_context": {"P": {"radius_m": 2000, "reports_by_date": [
            {"date": "2026-10-23", "count": 1}, {"date": "2026-10-24", "count": 100},
            {"date": "2026-10-25", "count": 100}]}}}


def test_storm_sensitivity_and_no_same_day_or_future_leakage(network):
    service = RiskService(network)
    before = copy.deepcopy(network)
    low = service.get_risk("P", {"intensity": 0, "as_of": "2026-10-24"})
    high = service.get_risk("P", {"intensity": 1, "as_of": "2026-10-24"})
    assert low["band"] == "LOW" and high["band"] == "HIGH"
    assert low["score"] == 4
    assert low["drivers"][1]["value"] == 1
    assert network == before


def test_unknown_premise_has_no_numeric_score(network):
    result = RiskService(network).get_risk("unknown", {"intensity": 1, "as_of": "2026-10-24"})
    assert result["band"] == "UNKNOWN"
    assert result["score"] is None


def test_missing_history_reduces_confidence_not_increases_risk(network):
    complete = RiskService(network).get_risk("P", {"intensity": 0.5, "as_of": "2026-10-24"})
    network.pop("risk_context")
    missing = RiskService(network).get_risk("P", {"intensity": 0.5, "as_of": "2026-10-24"})
    assert missing["confidence_kind"] == "insufficient_history"
    assert missing["score"] < complete["score"]
    assert "Historical spatial coverage" in missing["missing_inputs"]


@pytest.mark.parametrize("intensity", [-0.1, 1.1, float("nan"), float("inf"), True, "high", None])
def test_invalid_intensities_are_rejected(network, intensity):
    with pytest.raises(ValueError):
        RiskService(network).get_risk("P", {"intensity": intensity, "as_of": "2026-10-24"})
