"""Exercise Human 1's read models through Human 4's existing injection seams."""
import copy
import json
from pathlib import Path

import pytest

from engine.risk import RiskService
from engine.topology import NetworkService, UnknownCircuitError


ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def source_service():
    return NetworkService.load(ROOT / "data" / "processed")


def test_network_read_model_keeps_source_ids_consistent(source_service):
    network = source_service.get_network()
    assert network["source"] == "aep_challenge"
    assert network["coverage"]["known_premise_count"] == 16
    assert network["coverage"]["full_circuit_export"] is False
    assert len(network["geometry"]["features"]) == 85
    catalog = {p["token"] for p in source_service.get_premises()}
    assert catalog == {p["premise_token"] for p in network["paths"]}
    assert {f["properties"]["premise_token"] for f in network["geometry"]["features"]
            if "premise_token" in f["properties"]} == catalog
    assert all(p["source"] == "aep_challenge" for p in source_service.get_premises())


def test_no_fixture_alias_or_unknown_circuit_is_silently_attached(source_service):
    for missing in ("DEMO-CIRCUIT-A", "CIRCUIT-MISSING"):
        with pytest.raises(UnknownCircuitError):
            source_service.get_network(missing)
        with pytest.raises(UnknownCircuitError):
            source_service.get_premises(missing)
    original_count = len(source_service.get_network()["paths"])
    response = source_service.get_network()
    response["paths"].clear()
    response["geometry"]["features"].clear()
    assert len(source_service.get_network()["paths"]) == original_count


def test_network_rejects_geometry_from_a_different_export(source_service):
    geometry = copy.deepcopy(source_service.geometry)
    geometry["metadata"]["scope"] = "another_export"
    with pytest.raises(ValueError, match="matching source/scope"):
        NetworkService(source_service.bundle, geometry)
    geometry = copy.deepcopy(source_service.geometry)
    next(f for f in geometry["features"] if "premise_token" in f["properties"])["properties"]["premise_token"] = "MIXED-EXPORT"
    with pytest.raises(ValueError, match="mismatched premise tokens"):
        NetworkService(source_service.bundle, geometry)


def test_network_filter_does_not_include_another_circuits_map_or_paths():
    bundle = {"metadata": {}, "nodes": [{"asset_token": "A"}, {"asset_token": "B"}],
              "supply_paths": [
                  {"premise_token": "P1", "asset_tokens": ["A"], "circuit_token": "C1"},
                  {"premise_token": "P2", "asset_tokens": ["B"], "circuit_token": "C2"}],
              "edges": [{"upstream_token": "A", "downstream_token": "P1"},
                        {"upstream_token": "B", "downstream_token": "P2"}]}
    bundle["metadata"]["limitations"] = []
    features = [{"type": "Feature", "properties": {"premise_token": p}, "geometry": None} for p in ("P1", "P2")]
    features += [{"type": "Feature", "properties": {"role": "GIS_CONTEXT_ONLY", "circuit_token": c}, "geometry": None}
                 for c in ("C1", "C2")]
    service = NetworkService(bundle, {"type": "FeatureCollection", "metadata": bundle["metadata"], "features": features})
    result = service.get_network("C1")
    assert len(result["paths"]) == 1 and result["paths"][0]["premise_token"] == "P1"
    assert result["edges"] == [{"upstream_token": "A", "downstream_token": "P1"}]
    assert len(result["geometry"]["features"]) == 2
    assert "P2" not in json.dumps(result) and "C2" not in json.dumps(result)


def test_network_filter_does_not_borrow_edges_between_shared_assets():
    paths = [{"premise_token": "P1", "asset_tokens": ["A", "F", "R"], "circuit_token": "C1"},
             {"premise_token": "P2", "asset_tokens": ["B", "A", "R"], "circuit_token": "C2"}]
    edges = [{"upstream_token": parent, "downstream_token": downstream} for p in paths
             for downstream, parent in zip([p["premise_token"]] + p["asset_tokens"][:-1], p["asset_tokens"])]
    bundle = {"metadata": {"limitations": []}, "nodes": [{"asset_token": t} for t in ("A", "B", "F", "R")],
              "supply_paths": paths, "edges": edges}
    geometry = {"type": "FeatureCollection", "metadata": bundle["metadata"], "features": [
        {"type": "Feature", "properties": {"premise_token": p}, "geometry": None} for p in ("P1", "P2")]}
    selected = NetworkService(bundle, geometry).get_network("C1")
    assert {(e["upstream_token"], e["downstream_token"]) for e in selected["edges"]} == {
        ("A", "P1"), ("F", "A"), ("R", "F")}


def test_data_demo_cases_distinguish_shared_transformer_fuse_and_breaker(source_service):
    cases = json.loads((ROOT / "data/processed/data_demo_cases.json").read_text())
    topology = source_service.topology
    selected = cases["selected_premise_token"]
    same_transformer = cases["same_transformer_premise_token"]
    other_transformer = cases["other_transformer_same_fuse_premise_token"]
    other_branch = cases["other_fuse_same_breaker_premise_token"]
    assert all((selected, same_transformer, other_transformer, other_branch))
    local = topology.get_dependents(cases["local_fault_asset_token"])["premise_tokens"]
    upstream = topology.get_dependents(cases["upstream_fault_asset_token"])["premise_tokens"]
    assert selected in local and same_transformer in local
    assert other_transformer in upstream and other_transformer not in local
    assert other_branch not in upstream
    by_id = {c["id"]: c for c in cases["cases"]}
    assert by_id["local_only"]["impact"]["known_count"] == 3
    assert by_id["upstream_only"]["impact"]["known_count"] == 8
    assert by_id["overlapping_faults"]["impact"]["known_count"] == 8
    shared = topology.compare_paths(selected, other_branch)["shared_upstream_tokens"]
    assert shared and all(topology.nodes[t]["kind"] != "FUSE" for t in shared)


@pytest.fixture
def preview_client(source_service):
    pytest.importorskip("fastapi")
    from fastapi import HTTPException
    from fastapi.testclient import TestClient
    from api.main import create_app
    from api.schemas import Risk
    from api.services import TeamServices

    risk_service = RiskService(source_service.bundle)

    def network(circuit_id):
        try:
            return source_service.get_network(circuit_id)
        except UnknownCircuitError as exc:
            raise HTTPException(404, str(exc)) from exc

    def risk(request):
        if request.scenario_id != "source_preview":
            raise HTTPException(404, "Source risk preview is separate from fixture incident scenarios")
        return Risk.model_validate(risk_service.preview_risk(request.premise_token, request.storm_scenario, as_of="2026-10-24"))

    with TestClient(create_app(TeamServices(network=network, risk=risk))) as client:
        yield client


def test_existing_api_hooks_return_real_network_and_customer_safe_risk(preview_client, source_service):
    circuit = source_service.circuits[0]
    response = preview_client.get("/api/network", params={"circuit_id": circuit})
    assert response.status_code == 200
    assert response.json()["source"] == "aep_challenge"
    assert response.json()["geometry"]["type"] == "FeatureCollection"
    # The fixture alias cannot silently become a real circuit.
    assert preview_client.get("/api/network").status_code == 404
    premise = source_service.get_premises()[0]["token"]
    response = preview_client.post("/api/risk", json={"scenario_id": "source_preview", "premise_token": premise,
                                                     "storm_scenario": "severe"})
    assert response.status_code == 200
    risk = response.json()
    assert risk["band"] == "HIGH" and risk["confidence_kind"] == "unavailable"
    assert "AEP challenge" in risk["drivers"][0]
    text = json.dumps(risk)
    assert "ASSET-" not in text and "PREM-" not in text


def test_source_risk_preview_unknowns_never_fall_back_to_fixture_or_zero(preview_client, source_service):
    premise = source_service.get_premises()[0]["token"]
    for token, storm in [(premise, "unknown"), ("P-DEMO-001", "severe"), ("MISSING", "severe")]:
        response = preview_client.post("/api/risk", json={"scenario_id": "source_preview", "premise_token": token,
                                                         "storm_scenario": storm})
        assert response.status_code == 200
        assert response.json()["band"] == "UNKNOWN"
        assert response.json()["confidence_kind"] == "unavailable"
    assert preview_client.post("/api/risk", json={"scenario_id": "multi_fault", "premise_token": premise,
                                                 "storm_scenario": "severe"}).status_code == 404


def test_source_previews_do_not_mutate_incident_state_or_send_alerts(preview_client, source_service):
    before = preview_client.get("/api/incidents/multi_fault/snapshot").json()
    premise = source_service.get_premises()[0]["token"]
    for _ in range(2):
        preview_client.get("/api/network", params={"circuit_id": "selected_subnet"})
        preview_client.post("/api/risk", json={"scenario_id": "source_preview", "premise_token": premise,
                                              "storm_scenario": "moderate"})
    after = preview_client.get("/api/incidents/multi_fault/snapshot").json()
    assert before == after
    assert after["selected_supply_path"]["provenance"] == "synthetic_fixture"
    assert after["notifications"] == []
