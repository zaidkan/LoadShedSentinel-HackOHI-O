"""Public graph helper invariants; no API/schema or scenario engine changes."""
from copy import deepcopy
import json
import unittest

from engine.topology import Topology


def source_graph():
    nodes = {}
    for raw, token, kind in [("PRIVATE-T1", "ASSET-1", "Distribution"),
                             ("PRIVATE-T2", "ASSET-2", "Distribution"),
                             ("PRIVATE-T3", "ASSET-3", "Distribution"),
                             ("PRIVATE-F1", "ASSET-4", "Fuse"),
                             ("PRIVATE-F2", "ASSET-5", "Fuse"),
                             ("PRIVATE-R", "ASSET-6", "Recloser (Electronic)"),
                             ("PRIVATE-B", "ASSET-7", "Circuit Breaker")]:
        nodes[raw] = {"asset_token": token, "kind": kind, "gis_status": "UNKNOWN", "point": None}
    paths = {}
    arrangements = [("A", "PRIVATE-T1", "PRIVATE-F1"), ("B", "PRIVATE-T1", "PRIVATE-F1"),
                    ("C", "PRIVATE-T2", "PRIVATE-F1"), ("D", "PRIVATE-T3", "PRIVATE-F2")]
    for suffix, transformer, fuse in arrangements:
        paths["PRIVATE-" + suffix] = {"asset_ids": [transformer, fuse, "PRIVATE-R", "PRIVATE-B"],
                                     "premise_token": "PREM-" + suffix}
    return {"nodes": nodes, "paths": paths,
            "premise_tokens": {raw: p["premise_token"] for raw, p in paths.items()},
            "rejected": {"PRIVATE-MISSING": "missing_upstream_text"}}


class DataServiceTests(unittest.TestCase):
    def setUp(self):
        self.graph = source_graph()
        self.topology = Topology(self.graph)

    def test_persisted_token_catalog_must_match_each_path(self):
        self.graph["paths"]["PRIVATE-A"]["premise_token"] = "PREM-B"
        with self.assertRaisesRegex(ValueError, "public token catalog"):
            Topology(self.graph)

    def test_supply_path_and_dependents_remain_public(self):
        path = self.topology.get_supply_path("PREM-A")
        self.assertEqual(path, self.topology.premise_to_substation("PREM-A"))
        self.assertEqual(path["path"], ["ASSET-1", "ASSET-4", "ASSET-6", "ASSET-7"])
        self.assertEqual(self.topology.get_dependents("ASSET-4")["affected_premise_tokens"], ["PREM-A", "PREM-B", "PREM-C"])
        self.assertEqual(self.topology.get_dependents("UNKNOWN")["status"], "UNKNOWN")
        self.assertNotIn("PRIVATE-", json.dumps(path))

    def test_path_comparison_reports_branches_from_source_order(self):
        compared = self.topology.compare_paths("PREM-A", "PREM-D")
        self.assertEqual(compared["status"], "KNOWN")
        self.assertEqual(compared["shared_upstream_tokens"], ["ASSET-6", "ASSET-7"])
        self.assertEqual(compared["branch_a_tokens"], ["ASSET-1", "ASSET-4"])
        self.assertEqual(compared["branch_b_tokens"], ["ASSET-3", "ASSET-5"])
        self.assertNotIn("PRIVATE-", json.dumps(compared))
        self.assertEqual(self.topology.compare_paths("PREM-A", "MISSING")["status"], "UNKNOWN")

    def test_local_clearance_cannot_clear_upstream_fault(self):
        faults = [{"fault_token": "LOCAL", "asset_token": "ASSET-1", "state": "CLEARED"},
                  {"fault_token": "UPSTREAM", "asset_token": "ASSET-4", "state": "REPAIRING"}]
        before = deepcopy(faults)
        result = self.topology.remaining_blockers("PREM-A", faults)
        self.assertEqual(result["blocking_fault_tokens"], ["UPSTREAM"])
        self.assertIs(result["clear_of_modeled_faults"], False)
        self.assertIs(result["requires_explicit_reenergization"], True)
        faults[1]["state"] = "CLEARED"
        self.assertIs(self.topology.remaining_blockers("PREM-A", faults)["clear_of_modeled_faults"], True)
        self.assertEqual(before[0], faults[0])

    def test_unknown_fault_coverage_or_state_does_not_imply_clearance(self):
        for asset in ("ASSET-4", "MISSING"):
            result = self.topology.remaining_blockers("PREM-A", [{"fault_token": "F", "asset_token": asset, "state": "UNKNOWN"}])
            self.assertEqual(result["status"], "UNKNOWN")
            self.assertIsNone(result["clear_of_modeled_faults"])
            self.assertEqual(result["unknown_fault_tokens"], ["F"])
        # A known unrelated branch with unknown state does not affect this path.
        unrelated = self.topology.remaining_blockers("PREM-A", [{"fault_token": "F", "asset_token": "ASSET-5", "state": "UNKNOWN"}])
        self.assertIs(unrelated["clear_of_modeled_faults"], True)
        self.assertIsNone(self.topology.remaining_blockers("MISSING", [])["clear_of_modeled_faults"])

    def test_fault_input_validation_and_results_do_not_mutate_inputs(self):
        faults = [{"fault_token": "F", "asset_token": "ASSET-1", "state": "ACTIVE"}]
        before = deepcopy(faults)
        self.topology.remaining_blockers("PREM-A", faults)
        self.assertEqual(faults, before)
        with self.assertRaises(ValueError):
            self.topology.remaining_blockers("PREM-A", [{**faults[0], "state": "RESTORED"}])
        with self.assertRaises(ValueError):
            self.topology.remaining_blockers("PREM-A", faults + [{**faults[0], "state": "CLEARED"}])

    def test_catalog_is_bounded_and_does_not_export_private_fields(self):
        catalog = self.topology.premise_catalog(2)
        self.assertEqual([p["premise_token"] for p in catalog], ["PREM-A", "PREM-B"])
        self.assertTrue(all(set(p) == {"premise_token", "label", "source"} for p in catalog))
        self.assertNotIn("PRIVATE-", json.dumps(catalog))
        for limit in (0, True, 1.5, 1001):
            with self.assertRaises(ValueError):
                self.topology.premise_catalog(limit)

    def test_scenario_context_uses_nearest_complete_strict_superset(self):
        result = self.topology.scenario_context("PREM-A", 4)
        self.assertEqual(result["status"], "KNOWN")
        self.assertEqual(result["source"], "aep_challenge")
        self.assertEqual(result["context"], {
            "current_asset_id": "ASSET-1", "upstream_asset_id": "ASSET-4", "selected_premise_token": "PREM-A",
            "local_premise_tokens": ["PREM-A", "PREM-B"], "feeder_premise_tokens": ["PREM-A", "PREM-B", "PREM-C"]})
        self.assertNotIn("PRIVATE-", json.dumps(result))
        result["context"]["local_premise_tokens"].clear()
        self.assertEqual(len(self.topology.scenario_context("PREM-A")["context"]["local_premise_tokens"]), 2)

    def test_scenario_context_skips_equal_group_and_never_truncates(self):
        # PREM-D's local transformer and first fuse share one premise, so use the recloser.
        result = self.topology.scenario_context("PREM-D", 4)
        self.assertEqual(result["context"]["upstream_asset_id"], "ASSET-6")
        self.assertEqual(len(result["context"]["feeder_premise_tokens"]), 4)
        for premise, bound in [("PREM-A", 1), ("PREM-A", 2), ("PREM-D", 3), ("MISSING", 4)]:
            result = self.topology.scenario_context(premise, bound)
            self.assertEqual(result["status"], "UNKNOWN")
            self.assertIsNone(result["context"])
        for bound in (0, True, 1001):
            with self.assertRaises(ValueError):
                self.topology.scenario_context("PREM-A", bound)

    def test_superset_must_include_all_local_dependents(self):
        # Shared transformer metadata does not justify expanding another supplied path.
        self.graph["paths"]["PRIVATE-B"]["asset_ids"] = ["PRIVATE-T1", "PRIVATE-B"]
        topology = Topology(self.graph)
        self.assertEqual(topology.scenario_context("PREM-A", 4)["context"]["upstream_asset_id"], "ASSET-7")


if __name__ == "__main__":
    unittest.main()
