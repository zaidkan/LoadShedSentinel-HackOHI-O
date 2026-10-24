"""Run: python3 -m unittest discover -s tests -p test_topology.py -v.

Set AEP_DATA_DIR to the local raw-archive directory to include full-source checks.
"""
import io
import json
import os
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from engine.topology import Topology
from pipeline.build_graph import build_graph
from pipeline.import_gis import LAYERS, load_gis, match_equipment, point_records
from pipeline.inspect_assets import DEFAULT_DATA, dbf_records, inspect_assets, source_archives, write_json
from pipeline.parse_upstream import load_upstream, parse_line, parse_upstream

WGS84 = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984"]]'


def text_path(premise, transformer="0001", fuse="0200", breaker="0000027"):
    return (f"{premise}\teo_power_xfrmr_inst*{transformer}*Distribution*LOC-{transformer}"
            f"\teo_isolating_eqpt_inst*{fuse}*Fuse*LOC-{fuse}"
            f"\teo_circuit*0900*Circuit Breaker*{breaker}\r\n")


def dbf_bytes(fields, rows):
    # Tiny dBASE III writer used only for controlled archive fixtures.
    header = bytearray(32)
    header[0] = 3
    struct.pack_into("<IHH", header, 4, len(rows), 33 + 32 * len(fields), 1 + sum(w for _, w in fields))
    descriptors = bytearray()
    for name, width in fields:
        item = bytearray(32)
        item[:len(name)] = name.encode("ascii")
        item[11], item[16] = ord("C"), width
        descriptors.extend(item)
    records = [b" " + b"".join(row.get(n, "").encode("ascii").ljust(w) for n, w in fields) for row in rows]
    return bytes(header + descriptors) + b"\r" + b"".join(records) + b"\x1a"


def shape_bytes(points):
    records = []
    for i, point in enumerate(points, 1):
        body = struct.pack("<idd", 1, *point) if point is not None else struct.pack("<i", 0)
        records.append(struct.pack(">ii", i, len(body) // 2) + body)
    header = bytearray(100)
    struct.pack_into(">i", header, 0, 9994)
    struct.pack_into(">i", header, 24, (100 + sum(map(len, records))) // 2)
    struct.pack_into("<ii", header, 28, 1000, 1)
    return bytes(header) + b"".join(records)


def fixture_archives(root):
    customers = [
        {"premise_nu": "PRIVATE-PREMISE-0001", "aep_xfmr_l": "LOC-0001", "circuit_id": "0000027", "critical_c": "PRIVATE-MEDICAL", "address": "PRIVATE-ADDRESS"},
        {"premise_nu": "PRIVATE-PREMISE-0002", "aep_xfmr_l": "LOC-0001", "circuit_id": "0000027"},
        {"premise_nu": "PRIVATE-PREMISE-0003", "aep_xfmr_l": "LOC-0002", "circuit_id": "0000027"},
        {"premise_nu": "PRIVATE-PREMISE-UNKNOWN", "aep_xfmr_l": "MISSING", "circuit_id": "0000027"}]
    rows = {
        "customer": customers,
        "transformer": [{"id": "0002", "location_n": "LOC-0002", "circuit_id": "0000027", "device_typ": "Distribution", "eo_source_": "eo_power_xfrmr_inst", "aep_statio": "STATION-X"},
                        {"id": "0001", "location_n": "LOC-0001", "circuit_id": "0000027", "device_typ": "Distribution", "eo_source_": "eo_power_xfrmr_inst", "aep_statio": "STATION-X"}],
        "fuse": [{"id": "0200", "location_n": "LOC-0200", "circuit_id": "0000027", "device_typ": "Fuse", "eo_source_": "eo_isolating_eqpt_inst"}],
        "recloser": [], "switch": []}
    fields = [(n, w) for n, w in [("premise_nu", 30), ("aep_xfmr_l", 24), ("circuit_id", 20),
                                 ("critical_c", 20), ("address", 40), ("id", 20), ("location_n", 24),
                                 ("device_typ", 32), ("eo_source_", 35), ("upstream_l", 24), ("aep_statio", 24)]]
    for filename in ("Data1.zip", "Data2.zip"):
        with zipfile.ZipFile(root / filename, "w") as archive:
            for layer, (source, kind) in LAYERS.items():
                if source == filename:
                    archive.writestr(layer + ".dbf", dbf_bytes(fields, rows[kind]))
                    archive.writestr(layer + ".shp", shape_bytes([[-80.123456 + i * 0.01, 37.123456] for i in range(len(rows[kind]))]))
                    archive.writestr(layer + ".prj", WGS84)
    with zipfile.ZipFile(root / "matched_upstream.zip", "w") as archive:
        archive.writestr("matched_upstream.txt", text_path("PRIVATE-PREMISE-0001") + text_path("PRIVATE-PREMISE-0002") + text_path("PRIVATE-PREMISE-0003", transformer="0002"))


class ParserTests(unittest.TestCase):
    def test_string_identifiers_and_path_order(self):
        premise, entries = parse_line(text_path("00000123"))
        self.assertEqual(premise, "00000123")
        self.assertEqual(entries[0]["object_id"], "0001")
        self.assertEqual(entries[-1]["location"], "0000027")
        self.assertEqual(entries[0]["asset_id"], "eo_power_xfrmr_inst:0001")

    def test_malformed_and_cyclic_paths_rejected(self):
        valid = text_path("001")
        bad = ["", "001\t", valid.replace("*Distribution*", "*Distribution*EXTRA*"),
               valid.replace("Circuit Breaker", "Mystery"), valid.replace("Distribution", "Fuse")]
        entries = valid.rstrip().split("\t")
        bad.append("\t".join(entries[:2] + [entries[1]] + entries[2:]))
        for line in bad:
            with self.subTest(line=line), self.assertRaises(ValueError):
                parse_line(line)

    def test_duplicate_and_conflicting_records_rejected(self):
        with self.assertRaises(ValueError):
            parse_upstream([text_path("001"), text_path("001")])
        with self.assertRaises(ValueError):
            parse_upstream([text_path("001"), text_path("002").replace("LOC-0001", "DIFFERENT")])

    def test_numeric_dbf_field_remains_string_and_truncation_fails(self):
        data = bytearray(dbf_bytes([("id", 8)], [{"id": "00000123"}]))
        data[32 + 11] = ord("N")
        self.assertEqual(list(dbf_records(io.BytesIO(data)))[0][1]["id"], "00000123")
        with self.assertRaises(ValueError):
            list(dbf_records(io.BytesIO(data[:-3])))

    def test_unknown_crs_and_invalid_geometry_rejected(self):
        for crs, points in [("PROJCS[UNKNOWN]", [[1, 1]]), (WGS84, [[181, 1]]), (WGS84, [[float("nan"), 1]])]:
            with self.assertRaises(ValueError):
                list(point_records(io.BytesIO(shape_bytes(points)), crs))


class TopologyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        fixture_archives(self.root)
        self.gis = load_gis(self.root)
        self.upstream = load_upstream(self.root / "matched_upstream.zip")
        self.graph = build_graph(self.upstream, self.gis)
        self.topology = Topology(self.graph)

    def test_archive_inventory_and_join_ignore_cross_layer_row_order(self):
        inventory = inspect_assets(self.root)
        self.assertEqual(inventory["upstream"]["premises"], 3)
        self.assertEqual(len(inventory["archives"]), 3)
        self.assertEqual(self.graph["summary"]["matched_premises"], 3)
        node = self.graph["nodes"]["eo_power_xfrmr_inst:0001"]
        self.assertEqual(node["point"], [-80.113456, 37.123456])
        self.assertNotIn("PRIVATE-ADDRESS", json.dumps(self.gis))
        self.assertNotIn("PRIVATE-MEDICAL", json.dumps(self.gis))

    def test_repeatable_path_and_breaker_not_invented_station(self):
        result = self.topology.premise_to_substation("PRIVATE-PREMISE-0001")
        self.assertEqual(result["status"], "KNOWN")
        self.assertEqual(result["substation_status"], "UNKNOWN")
        self.assertEqual(result["endpoint"], "Circuit Breaker")
        self.assertEqual(result, self.topology.premise_to_substation(result["premise_token"]))
        self.assertEqual(result["equipment"][0]["kind"], "Distribution")

    def test_unknown_premise_wrong_type_and_missing_text_abstain(self):
        for premise in ("NOT-MAPPED", "PRIVATE-PREMISE-UNKNOWN", 123):
            self.assertEqual(self.topology.premise_to_substation(premise)["status"], "UNKNOWN")
        self.assertEqual(self.topology.affected_premises("UNMAPPED-POLE")["status"], "UNKNOWN")
        self.assertEqual(self.topology.affected_premises(None)["status"], "UNKNOWN")

    def test_multifault_impact_is_union_and_repair_recomputes(self):
        local = "eo_power_xfrmr_inst:0001"
        upstream = "eo_isolating_eqpt_inst:0200"
        self.assertEqual(self.topology.affected_premises(local)["affected_count"], 2)
        total = self.topology.affected_premises([local, upstream, local])
        self.assertEqual(total["affected_count"], 3)
        self.assertEqual(total, self.topology.affected_premises([local, upstream]))
        self.assertEqual(self.topology.affected_premises([upstream])["affected_count"], 3)
        self.assertEqual(self.topology.affected_premises([])["affected_count"], 0)
        mixed = self.topology.affected_premises([local, "UNKNOWN"])
        self.assertEqual((mixed["status"], mixed["affected_count"], mixed["unknown_asset_count"]), ("UNKNOWN", 2, 1))

    def test_ambiguous_join_abstains_and_exact_source_id_can_resolve(self):
        item = self.upstream["equipment"]["eo_power_xfrmr_inst:0001"]
        originals = self.gis["assets_by_location"]["LOC-0001"]
        duplicate = {**originals[0], "object_id": "DIFFERENT"}
        originals.append(duplicate)
        self.assertIsNotNone(match_equipment(item, self.gis, "0000027")[0])
        originals[0]["object_id"] = "ALSO-DIFFERENT"
        graph = build_graph(self.upstream, self.gis)
        self.assertEqual(graph["summary"]["matched_premises"], 1)
        self.assertEqual(Topology(graph).premise_to_substation("PRIVATE-PREMISE-0001")["status"], "UNKNOWN")

    def test_customer_mismatch_and_duplicate_keys_rejected(self):
        self.gis["customers"]["PRIVATE-PREMISE-0001"][0]["circuit_id"] = "WRONG"
        self.gis["customers"]["PRIVATE-PREMISE-0002"].append(self.gis["customers"]["PRIVATE-PREMISE-0002"][0])
        graph = build_graph(self.upstream, self.gis)
        self.assertEqual(graph["summary"]["matched_premises"], 1)
        self.assertEqual(len(graph["rejected"]), 3)

    def test_public_slice_whitelists_tokens_and_generalizes_geometry(self):
        public = self.topology.safe_geojson("PRIVATE-PREMISE-0002", max_premises=1)
        serialized = json.dumps(public)
        for forbidden in ("PRIVATE-", "LOC-", "eo_power", "critical_c", "address", "circuit_id", "station_label", "37.123456"):
            self.assertNotIn(forbidden, serialized)
        self.assertEqual(len(public["premise_tokens"]), 1)
        self.assertIn(public["selected_premise_token"], public["premise_tokens"])
        self.assertTrue(public["truncated"])
        self.assertTrue(public["missing_geometry_tokens"])
        for feature in public["features"]:
            self.assertEqual(feature["properties"]["provenance"], "aep_challenge")
            if feature["geometry"]["type"] == "Point":
                self.assertEqual(feature["geometry"]["coordinates"][1], 37.12)
            else:
                self.assertEqual(feature["properties"]["geometry_quality"], "schematic_link_not_conductor")
        self.assertEqual(self.topology.safe_geojson("unknown")["features"], [])
        for cap in (0, 51, True, 1.5):
            with self.assertRaises(ValueError):
                self.topology.safe_geojson("PRIVATE-PREMISE-0001", cap)

    def test_persistence_rejects_path_corruption_and_keeps_private_mode(self):
        path = self.root / "private.json"
        write_json(path, self.graph, private=True)
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(Topology.load(path).affected_premises("eo_isolating_eqpt_inst:0200")["affected_count"], 3)
        self.graph["paths"]["PRIVATE-PREMISE-0001"]["asset_ids"].append("NONEXISTENT")
        with self.assertRaises(ValueError):
            Topology(self.graph)

    def test_shared_equipment_conflicting_parent_does_not_expand_other_paths(self):
        upstream = parse_upstream([text_path("PRIVATE-PREMISE-0001"),
                                   text_path("PRIVATE-PREMISE-0002", fuse="0201"),
                                   text_path("PRIVATE-PREMISE-0003", transformer="0002")])
        graph = build_graph(upstream, self.gis)
        topology = Topology(graph)
        self.assertEqual(graph["summary"]["multiple_upstream_parents"], 1)
        self.assertEqual(topology.affected_premises("eo_isolating_eqpt_inst:0201")["affected_count"], 1)


SOURCE_DATA = Path(os.environ.get("AEP_DATA_DIR", DEFAULT_DATA))


@unittest.skipUnless(all(p.exists() for p in source_archives(SOURCE_DATA)), "Local AEP archives not available")
class FullSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream = load_upstream(source_archives(SOURCE_DATA)[2])
        cls.gis = load_gis(SOURCE_DATA)
        cls.graph = build_graph(cls.upstream, cls.gis)
        cls.topology = Topology(cls.graph)

    def test_verified_archive_counts_and_join_coverage(self):
        self.assertEqual(len(self.upstream["paths"]), 117599)
        self.assertEqual(len(self.upstream["equipment"]), 32600)
        summary = self.graph["summary"]
        for key, expected in {"customer_rows": 117642, "transformer_location_keys": 26950,
                              "duplicate_transformer_locations": 8, "customer_transformer_key_exists_rows": 117615,
                              "distinct_referenced_transformer_keys_matched": 25303,
                              "text_keys_absent_from_customers": 4, "customers_without_text": 47,
                              "matched_premises": 117549, "unmatched_customer_premises": 93}.items():
            self.assertEqual(summary[key], expected, key)

    def test_every_accepted_path_reverse_index_and_leading_zero_id(self):
        zero_id = next(p for p in self.graph["paths"] if p.startswith("0"))
        self.assertEqual(self.topology.premise_to_substation(zero_id)["status"], "KNOWN")
        self.assertEqual(self.topology.premise_to_substation(int(zero_id))["status"], "UNKNOWN")
        for premise, path in self.graph["paths"].items():
            for key in path["asset_ids"]:
                self.assertIn(premise, self.topology.reverse[key])
        all_breakers = [k for k, n in self.graph["nodes"].items() if n["kind"] == "Circuit Breaker"]
        self.assertEqual(self.topology.affected_premises(all_breakers)["affected_count"], len(self.graph["paths"]))

    def test_real_safe_slice_and_unknown_rejection(self):
        seed = next(iter(self.graph["paths"]))
        public = self.topology.safe_geojson(seed)
        self.assertEqual(public["status"], "KNOWN")
        self.assertLessEqual(len(public["premise_tokens"]), 12)
        self.assertNotIn(seed, json.dumps(public))
        self.assertNotIn("location_n", json.dumps(public))
        for premise in self.graph["rejected"]:
            self.assertEqual(self.topology.premise_to_substation(premise)["status"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
