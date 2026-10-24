"""AEP source provenance, impact calculation and fail-closed behavior."""
import copy
import json
import unittest

from engine.aep_impact import AEPImpact, UnknownAEPAsset, BUNDLE_PATH
from engine.scenarios import generate_scenario


class AEPImpactTests(unittest.TestCase):
    def setUp(self):
        self.source = AEPImpact.load()

    def test_real_supplied_path_counts_drive_default_scenarios(self):
        local = self.source.scenario_context("local_protection")
        upstream = self.source.scenario_context("upstream_feeder")
        self.assertEqual(len(local["local_premise_tokens"]), 3)
        self.assertEqual(len(upstream["feeder_premise_tokens"]), 16)
        self.assertTrue(set(local["local_premise_tokens"]) < set(upstream["feeder_premise_tokens"]))
        self.assertEqual(self.source.assets[local["current_asset_id"]]["kind"], "TRANSFORMER")
        self.assertEqual(self.source.assets[upstream["upstream_asset_id"]]["kind"], "CIRCUIT_BREAKER")
        self.assertEqual(self.source.metadata["provenance"], "aep_challenge")
        self.assertEqual(self.source.metadata["scope"], "selected_subnet")
        self.assertTrue(set(upstream["feeder_premise_tokens"]) <= set(self.source.paths))

    def test_data_modification_recalculates_impact_not_hardcoded_counts(self):
        fixture = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
        model = AEPImpact(fixture)
        local = model.scenario_context("local_protection")
        transformer = local["current_asset_id"]
        self.assertEqual(len(model.affected(transformer)), 3)
        # Move one source-path fixture to another valid transformer. This deliberately
        # changes only the validation fixture, not the checked-in AEP data.
        altered = copy.deepcopy(fixture)
        first = next(p for p in altered["supply_paths"] if p["premise_token"] == local["selected_premise_token"])
        other = next(p for p in altered["supply_paths"] if p["asset_tokens"][0] != transformer)
        first["asset_tokens"] = list(other["asset_tokens"])
        recomputed = AEPImpact(altered)
        self.assertEqual(len(recomputed.affected(transformer)), 2)
        self.assertEqual(len(model.affected(transformer)), 3)

    def test_select_another_real_transformer_recomputes_and_rejects_bad_tokens(self):
        other = next(asset for asset in self.source.selectable_assets()
                     if asset["kind"] == "TRANSFORMER" and asset["dependent_premises_in_sample"] != 3)
        context = self.source.scenario_context("confirmed_replacement", asset_token=other["asset_token"])
        snapshot = generate_scenario("confirmed_replacement", context)
        self.assertEqual(snapshot.impact_source["fault_asset_token"], other["asset_token"])
        self.assertEqual(len(snapshot.affected_premise_tokens), other["dependent_premises_in_sample"])
        self.assertEqual(snapshot.current_asset_id, other["asset_token"])
        with self.assertRaises(UnknownAEPAsset):
            self.source.scenario_context("local_protection", asset_token="T-DEMO-104")
        with self.assertRaises(UnknownAEPAsset):
            self.source.scenario_context("upstream_feeder", asset_token=other["asset_token"])
        with self.assertRaises(UnknownAEPAsset):
            self.source.scenario_context("upstream_feeder", premise_token="PREM-MADEUP")

    def test_abstention_does_not_claim_confirmed_affected_premises(self):
        snap = generate_scenario("insufficient_evidence", {})
        self.assertEqual(snap.status, "UNDER_REVIEW")
        self.assertEqual(snap.affected_premise_tokens, [])
        self.assertEqual(snap.impact_source["scope"], "selected_subnet")

    def test_public_trace_and_geojson_match_impact_asset_tokens(self):
        snap = generate_scenario("local_protection", {})
        trace = self.source.trace(snap.selected_premise_token)
        self.assertEqual(trace["status"], "KNOWN")
        self.assertEqual(trace["path"][0], snap.current_asset_id)
        self.assertEqual(trace["path"][-1], self.source.scenario_context("upstream_feeder")["upstream_asset_id"])
        geo = self.source.geojson()
        self.assertEqual(geo["scope"], "selected_subnet")
        self.assertTrue(all(p["properties"]["asset_token"] in self.source.assets
                            for p in geo["features"] if p["geometry"]["type"] == "Point"))
        self.assertFalse(any(p["properties"].get("premise_token") for p in geo["features"]))
        self.assertEqual(self.source.trace("PREM-DOES-NOT-EXIST")["status"], "UNKNOWN")

    def test_missing_bundle_and_bad_graph_fail_closed(self):
        with self.assertRaises(FileNotFoundError):
            AEPImpact.load("does-not-exist-aep-network.json")
        corrupted = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
        corrupted["supply_paths"][0]["asset_tokens"] = ["ASSET-UNKNOWN"]
        with self.assertRaises(ValueError):
            AEPImpact(corrupted)
        corrupted = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
        corrupted["metadata"]["scope"] = "full_territory"
        with self.assertRaises(ValueError):
            AEPImpact(corrupted)


if __name__ == "__main__":
    unittest.main()
