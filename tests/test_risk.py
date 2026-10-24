import copy
import math
from zipfile import ZipFile

import pytest

from api.schemas import CustomerRisk
from engine.risk import RiskService
from engine.topology import Topology
from pipeline.build_graph import build_graph, build_risk_context
from pipeline.import_gis import load_gis
from pipeline.parse_upstream import load_upstream
from test_topology import WGS84, dbf_bytes, fixture_archives, shape_bytes


@pytest.fixture
def service(tmp_path):
    fixture_archives(tmp_path)
    topology = Topology(build_graph(load_upstream(tmp_path / "matched_upstream.zip"), load_gis(tmp_path)))
    token = topology.premise_to_substation("PRIVATE-PREMISE-0001")["path"][0]
    history = {"assets": {token: {"radius_m": 2000, "reports_by_date": [
        {"date": "2026-10-23", "count": 1}, {"date": "2026-10-24", "count": 99},
        {"date": "2026-10-25", "count": 99}]}}}
    return RiskService(topology, history)


def test_source_risk_changes_with_storm_without_same_day_or_future_leakage(service):
    before = copy.deepcopy(service.history)
    low = service.get_risk("PREM-000001", {"intensity": 0, "as_of": "2026-10-24"})
    high = service.get_risk("PREM-000001", {"intensity": 1, "as_of": "2026-10-24"})
    assert low["score"] == 4 and low["band"] == "LOW"
    assert high["score"] == 84 and high["band"] == "HIGH"
    assert low["drivers"][1]["value"] == 1
    assert service.history == before


def test_unknown_path_does_not_get_a_score(service):
    result = service.get_risk("PREM-MISSING", {"intensity": 1, "as_of": "2026-10-24"})
    assert result["band"] == "UNKNOWN" and result["score"] is None


def test_missing_history_lowers_confidence_without_claiming_zero_reports(service):
    service.history = {"assets": {}}
    result = service.get_risk("PREM-000001", {"intensity": .5, "as_of": "2026-10-24"})
    assert result["confidence_kind"] == "insufficient_history"
    assert "Historical spatial coverage" in result["missing_inputs"]
    assert len(result["drivers"]) == 1


def test_customer_projection_matches_current_schema_without_sensitive_tokens(service):
    preview = service.preview_risk("PREM-000001", "moderate", as_of="2026-10-24")
    CustomerRisk.model_validate(preview)
    text = str(preview)
    assert "PRIVATE-" not in text and "ASSET-" not in text and "PREM-" not in text
    assert service.preview_risk("PREM-000001", "unknown", as_of="2026-10-24")["band"] == "UNKNOWN"


@pytest.mark.parametrize("value", [True, "high", None, -1, 2, math.nan, math.inf])
def test_invalid_storm_intensity_is_rejected(service, value):
    with pytest.raises(ValueError):
        service.get_risk("PREM-000001", {"intensity": value, "as_of": "2026-10-24"})


def test_absent_damage_layer_is_reported_as_unavailable(tmp_path, service):
    fixture_archives(tmp_path)
    result = build_risk_context(service.topology, tmp_path, ["PREM-000001"])
    assert result["coverage"]["status"] == "UNAVAILABLE"
    assert result["assets"] == {}


def test_damage_pipeline_uses_source_dates_transformer_distance_and_no_private_geometry(tmp_path, service):
    fixture_archives(tmp_path)
    path = service.topology.paths["PRIVATE-PREMISE-0001"]
    point = service.topology.nodes[path["asset_ids"][0]]["point"]
    stem = "arcos_prod_damage_09_28_Clip"
    dates = ["20261023", "20261024", "20261025", "20260101", "BAD-DATE"]
    with ZipFile(tmp_path / "Data1.zip", "a") as archive:
        archive.writestr(stem + ".dbf", dbf_bytes([("Report_Tim", 8)], [{"Report_Tim": d} for d in dates]))
        archive.writestr(stem + ".shp", shape_bytes([point, point, point, [-70, 37], point]))
        archive.writestr(stem + ".prj", WGS84)
    context = build_risk_context(service.topology, tmp_path, ["PREM-000001"])
    assert context["coverage"]["source_records"] == 5
    assert context["coverage"]["usable_dated_points"] == 4
    assert context["coverage"]["missing_date_or_geometry"] == 1
    asset = service.topology.premise_to_substation("PREM-000001")["path"][0]
    assert sum(r["count"] for r in context["assets"][asset]["reports_by_date"]) == 3
    result = RiskService(service.topology, context).get_risk("PREM-000001", {"intensity": 0, "as_of": "2026-10-24"})
    assert result["score"] == 4
    assert "PRIVATE" not in str(context) and "coordinates" not in str(context)
    assert str(point[0]) not in str(context)
