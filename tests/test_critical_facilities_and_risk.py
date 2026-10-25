"""Spatial reprojection/association, privacy, propagation and risk regression checks."""
import copy
import io
import json
import math
import os
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from engine.aep_impact import AEPImpact, BUNDLE_PATH
from engine.outage_risk import calculate_outage_risk
from engine.scenarios import generate_scenario
from engine.topology import Topology, link_critical_facilities, tag_critical_facilities
from pipeline.build_graph import build_graph
from pipeline.import_gis import FACILITY_WKT, load_critical_facilities, load_gis, point_records
from pipeline.inspect_assets import DEFAULT_DATA, source_archives
from pipeline.parse_upstream import load_upstream
from test_topology import fixture_archives, shape_bytes


def facility(token="CF-HOSPITAL-001", kind="HOSPITAL", point=None):
    return {"facility_token": token, "kind": kind, "point": point or [-80, 37],
            "source_crs": "EPSG:3857 + NAVD88"}


class FacilityTests(unittest.TestCase):
    def test_web_mercator_reprojection_and_unknown_projection_rejection(self):
        # Independent reference pair: lon=-80, lat=37 in EPSG:3857 metres.
        shape = shape_bytes([[-8905559.263461886, 4439106.787250586], [0, 0]])
        points = dict(point_records(io.BytesIO(shape), FACILITY_WKT))
        self.assertAlmostEqual(points[0][0], -80, places=10)
        self.assertAlmostEqual(points[0][1], 37, places=10)
        self.assertEqual(points[1], [0, 0])
        with self.assertRaises(ValueError):
            list(point_records(io.BytesIO(shape), FACILITY_WKT.replace('Central_Meridian",0.0', 'Central_Meridian",10.0')))
        for point in ([math.inf, 0], [0, math.nan], [30_000_000, 0]):
            with self.subTest(point=point), self.assertRaises(ValueError):
                list(point_records(io.BytesIO(shape_bytes([point])), FACILITY_WKT))

    def test_nearest_ties_missing_geometry_and_explicit_upstream_paths(self):
        nodes = {key: {"asset_token": key, "kind": kind, "point": point} for key, kind, point in [
            ("T-A", "TRANSFORMER", [-80, 37]), ("T-B", "TRANSFORMER", [-80, 37]),
            ("T-C", "TRANSFORMER", [-81, 37]), ("T-MISSING", "TRANSFORMER", None),
            ("F-A", "FUSE", [-80, 37]), ("F-B", "FUSE", None), ("BREAKER", "CIRCUIT_BREAKER", None)]}
        paths = [{"asset_ids": p} for p in [["T-A", "F-A", "BREAKER"], ["T-A", "F-B", "BREAKER"],
                                           ["T-B", "BREAKER"], ["T-C", "F-B", "BREAKER"]]]
        records = link_critical_facilities(nodes, paths, [facility()])
        self.assertEqual(records[0]["nearest_asset_token"], "T-A")
        self.assertEqual(records[0]["distance_km"], 0)
        tag_critical_facilities(nodes, paths, records)
        for key in ("T-A", "F-A", "F-B", "BREAKER"):
            self.assertEqual(nodes[key]["critical_facility_count"], 1)
        # F-B's other downstream transformer must not inherit the hospital.
        for key in ("T-B", "T-C", "T-MISSING"):
            self.assertEqual(nodes[key]["critical_facility_count"], 0)
        for bad in ([181, 0], [False, 0], [math.nan, 0]):
            with self.subTest(point=bad), self.assertRaises(ValueError):
                link_critical_facilities(nodes, paths, [facility(point=bad)])
        with self.assertRaises(ValueError):
            link_critical_facilities({}, [], [facility()])
        with self.assertRaises(ValueError):
            tag_critical_facilities(nodes, paths, records + records)
        for bad in (None, {}, [None], [{**records[0], "nearest_asset_token": []}]):
            with self.subTest(records=bad), self.assertRaises(ValueError):
                tag_critical_facilities(nodes, paths, bad)
        records[0]["nearest_asset_token"] = "F-A"
        with self.assertRaises(ValueError):
            tag_critical_facilities(nodes, paths, records)

    def test_topology_constructor_persistence_and_multifault_deduplication(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            fixture_archives(root)
            graph = build_graph(load_upstream(root / "matched_upstream.zip"), load_gis(root))
            transformer = next(k for k, v in graph["nodes"].items() if v["kind"] == "Distribution" and v["point"])
            topology = Topology(graph, [facility(point=graph["nodes"][transformer]["point"])])
            query = topology.affected_critical_facilities([transformer, transformer])
            self.assertEqual(query["facility_count"], 1)
            self.assertEqual(query["status"], "ASSUMED")
            self.assertEqual(topology.affected_premises([transformer])["critical_facility_impact"]["facility_count"], 1)
            self.assertEqual(topology.affected_critical_facilities(["missing"])["status"], "UNKNOWN")
            saved = root / "graph.json"
            saved.write_text(json.dumps(graph))
            self.assertEqual(Topology.load(saved).affected_critical_facilities(transformer), query)
            self.assertNotIn("point", query["critical_facilities"][0])
            self.assertIn("not a verified", query["disclosure"])

    def test_shipped_sample_has_all_records_and_safe_runtime_projection(self):
        bundle = json.loads(BUNDLE_PATH.read_text())
        records = bundle["critical_facility_associations"]
        self.assertEqual(Counter(r["kind"] for r in records), {"HOSPITAL": 5, "FIRE": 37, "AMBULANCE": 10})
        self.assertEqual(len({r["facility_token"] for r in records}), 52)
        allowed = {"facility_token", "kind", "nearest_asset_token", "distance_km", "basis", "status",
                   "source_crs", "matching_crs", "equipment_geometry"}
        self.assertTrue(all(set(r) == allowed and r["equipment_geometry"] == "generalized" for r in records))
        model = AEPImpact(bundle)
        self.assertEqual(len(model.paths), 16)
        breaker = model.scenario_context("upstream_feeder")["upstream_asset_id"]
        self.assertEqual(model.affected_critical_facilities(breaker)["facility_count"], 52)
        snap = generate_scenario("upstream_feeder", {})
        self.assertEqual(snap.impact_source["critical_facility_impact"]["facility_count"], 52)
        self.assertEqual(len(snap.affected_premise_tokens), 16)
        self.assertTrue(all(r["status"] == "ASSUMED" for r in snap.impact_source["critical_facility_impact"]["critical_facilities"]))
        bare = copy.deepcopy(bundle)
        del bare["critical_facility_associations"]
        self.assertEqual(AEPImpact(bare).critical_facility_summary["status"], "UNKNOWN")
        self.assertEqual(model.trace(model.default_premise)["substation_status"], "UNKNOWN")

    def test_all_source_records_reproject_and_reproduce_saved_associations(self):
        data = Path(os.environ.get("AEP_DATA_DIR", DEFAULT_DATA))
        if not source_archives(data)[0].exists():
            self.skipTest("Official AEP archives unavailable")
        facilities = load_critical_facilities(data)
        self.assertEqual(Counter(f["kind"] for f in facilities), {"HOSPITAL": 5, "FIRE": 37, "AMBULANCE": 10})
        self.assertTrue(all(-180 <= f["point"][0] <= 180 and -90 <= f["point"][1] <= 90 for f in facilities))
        bundle = json.loads(BUNDLE_PATH.read_text())
        model = AEPImpact(bundle)
        records = link_critical_facilities(model.assets, list(model.paths.values()), facilities,
                                           point_key="coordinates", path_key="asset_tokens")
        self.assertEqual(records, bundle["critical_facility_associations"])


class OutageRiskTests(unittest.TestCase):
    benign = {"wind_kph": 10, "ambient_temperature_c": 20, "transformer_load_factor": .5, "health_index": 95}

    def test_bands_change_with_context_and_all_four_factors_contribute(self):
        self.assertEqual(calculate_outage_risk(self.benign)["band"], "LOW")
        extreme = dict(wind_kph=90, ambient_temperature_c=45, transformer_load_factor=1.2, health_index=20)
        self.assertEqual(calculate_outage_risk(extreme)["band"], "HIGH")
        # Two baseline points plus each factor's mild threshold must cross to MODERATE.
        for key, mild in (("wind_kph", 35), ("ambient_temperature_c", 35),
                          ("transformer_load_factor", .85), ("health_index", 70)):
            baseline = dict(self.benign)
            other = "health_index" if key != "health_index" else "wind_kph"
            baseline[other] = 40 if other == "health_index" else 65
            self.assertEqual(calculate_outage_risk(baseline)["band"], "LOW")
            baseline[key] = mild
            result = calculate_outage_risk(baseline)
            self.assertEqual(result["band"], "MODERATE")
            self.assertIn("Score 3/8", " ".join(result["drivers"]))
        self.assertIn("2/2", calculate_outage_risk({**self.benign, "ambient_temperature_c": -15})["drivers"][1])
        self.assertEqual(calculate_outage_risk(extreme)["confidence_kind"], "declared_rule_not_calibrated")

    def test_missing_invalid_and_conflicting_data_abstain(self):
        for inputs in (None, {}, {**self.benign, "unknown": 1}):
            self.assertEqual(calculate_outage_risk(inputs)["band"], "UNKNOWN")
        for key in self.benign:
            for invalid in (True, None, "35", math.nan, math.inf):
                with self.subTest(key=key, invalid=invalid):
                    self.assertEqual(calculate_outage_risk({**self.benign, key: invalid})["band"], "UNKNOWN")
        for key, invalid in (("wind_kph", -1), ("ambient_temperature_c", 66),
                             ("transformer_load_factor", 3.1), ("health_index", 101)):
            self.assertEqual(calculate_outage_risk({**self.benign, key: invalid})["band"], "UNKNOWN")
        self.assertEqual(calculate_outage_risk(self.benign, conflicting_evidence=True)["band"], "UNKNOWN")

    def test_actual_scenario_uses_rule_instead_of_fault_implies_high(self):
        snap = generate_scenario("local_protection", {"risk_inputs": self.benign})
        self.assertEqual((snap.status, snap.customer_risk.band), ("OUTAGE", "LOW"))
        self.assertEqual(generate_scenario("local_protection", {}).customer_risk.band, "MODERATE")
        self.assertEqual(generate_scenario("confirmed_replacement", {}).customer_risk.band, "HIGH")
        self.assertEqual(generate_scenario("local_protection", {"risk_inputs": {}}).customer_risk.band, "UNKNOWN")
        self.assertEqual(generate_scenario("insufficient_evidence", {"risk_inputs": self.benign}).customer_risk.band, "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
