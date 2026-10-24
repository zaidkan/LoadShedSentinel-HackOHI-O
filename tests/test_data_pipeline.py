from io import StringIO
import json
from pathlib import Path

import pytest
from pyproj import CRS

from pipeline.build_graph import Tokenizer
from pipeline.import_gis import AssetIndex, generalize, project_point, wgs84_transform
from pipeline.parse_upstream import EquipmentToken, parse_lines


def test_preserve_leading_zero_ids_and_reject_malformed_paths():
    paths, report = parse_lines(StringIO("00042\teo_power_xfrmr_inst*001*Distribution*003\teo_circuit*004*Circuit Breaker*005\n"))
    assert paths["00042"].equipment[0].source_id == "001"
    assert report["accepted_paths"] == 1
    paths, report = parse_lines(["00042\tbroken"])
    assert not paths
    assert len(report["rejected_rows"]) == 1


def test_conflicting_or_cyclic_path_abstains():
    first = "eo_power_xfrmr_inst*1*Distribution*10"
    end = "eo_circuit*5*Circuit Breaker*50"
    paths, report = parse_lines([f"00042\t{first}\t{end}", f"00042\t{first}\teo_circuit*6*Circuit Breaker*60"])
    assert not paths and report["conflicting_premises"] == 1
    paths, report = parse_lines([f"00042\t{first}\t{first}\t{end}"])
    assert not paths


def test_class_id_and_location_must_all_match():
    rows = [{"eo_source_": "eo_power_xfrmr_inst", "id": "001", "location_n": "003", "circuit_id": "C1", "layer": "transformers"}]
    index = AssetIndex(rows)
    token = EquipmentToken.parse("eo_power_xfrmr_inst*001*Distribution*003")
    assert index.resolve(token)[1] == "CLASS_ID_LOCATION"
    wrong = EquipmentToken.parse("eo_power_xfrmr_inst*001*Distribution*999")
    assert index.resolve(wrong) == (None, "LOCATION_MISMATCH")
    rows.append({**rows[0], "id": "002"})
    index = AssetIndex(rows)
    assert index.transformer_for_customer({"aep_xfmr_l": "003", "circuit_id": "C1"}) == (None, "AMBIGUOUS")


def test_crs_is_required_and_projected_coordinates_are_transformed():
    with pytest.raises(ValueError, match="Missing source CRS"):
        wgs84_transform("")
    transform = wgs84_transform(CRS.from_epsg(3857).to_wkt())
    point = project_point([111319.490793, 111325.142866], transform)
    assert point == pytest.approx([1, 1], abs=1e-8)
    with pytest.raises(ValueError):
        project_point([500, 500], wgs84_transform(CRS.from_epsg(4326).to_wkt()))
    assert generalize([-81.123456, 37.654321]) == [-81.12, 37.66]
    with pytest.raises(ValueError):
        generalize([1, 2], 0.00001)


def test_tokens_are_stable_with_key_and_do_not_embed_source_id():
    tokens = Tokenizer(b"a" * 32)
    assert tokens.token("PREM", "00042") == tokens.token("PREM", "00042")
    assert tokens.token("PREM", "00042") != tokens.token("ASSET", "00042")
    assert tokens.token("PREM", "00042") != Tokenizer(b"b" * 32).token("PREM", "00042")


def test_export_is_allowlisted_and_positions_are_generalized():
    root = Path(__file__).resolve().parents[1] / "data" / "processed"
    geojson = json.loads((root / "network.geojson").read_text())
    allowed = {"asset_token", "premise_token", "kind", "provenance", "gis_join", "feature_token", "role", "circuit_token", "electrical_connectivity"}
    for feature in geojson["features"]:
        assert set(feature["properties"]) <= allowed
        coordinates = feature["geometry"]["coordinates"]
        if feature["geometry"]["type"] == "Point":
            coordinates = [coordinates]
        for point in coordinates:
            assert generalize(point) == point
    bundle = json.loads((root / "network_bundle.json").read_text())
    assert all(p["premise_token"].startswith("PREM-") for p in bundle["supply_paths"])
    report = json.loads((root / "graph_summary.json").read_text())
    assert report["source_counts"]["customers"] == 117642
    assert report["joins"]["customer_rows_without_text"] == 47
    assert report["joins"]["text_keys_without_customer"] == 4
    assert report["customer_transformer_location_key_exists"] == 117615


def test_duplicate_locations_can_be_resolved_only_with_unique_circuit():
    index = AssetIndex([
        {"eo_source_": "eo_power_xfrmr_inst", "id": "001", "location_n": "003", "circuit_id": "C1", "layer": "transformers"},
        {"eo_source_": "eo_power_xfrmr_inst", "id": "002", "location_n": "003", "circuit_id": "C2", "layer": "transformers"},
    ])
    row, method = index.transformer_for_customer({"aep_xfmr_l": "003", "circuit_id": "C2"})
    assert row["id"] == "002" and method == "LOCATION_CIRCUIT"
    assert index.transformer_for_customer({"aep_xfmr_l": "003", "circuit_id": "C3"})[0] is None
