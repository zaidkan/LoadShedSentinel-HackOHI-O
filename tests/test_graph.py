import copy
import json
from pathlib import Path

import pytest

from engine.topology import Topology


@pytest.fixture
def network():
    return {
        "nodes": [{"asset_token": token} for token in ("TX-A", "TX-B", "FUSE", "BREAKER")],
        "supply_paths": [
            {"premise_token": "HOME-A", "asset_tokens": ["TX-A", "FUSE", "BREAKER"], "status": "PARTIAL", "limitations": []},
            {"premise_token": "HOME-B", "asset_tokens": ["TX-B", "FUSE", "BREAKER"], "status": "PARTIAL", "limitations": []},
        ],
    }


def test_upstream_fault_still_blocks_after_local_repair(network):
    topology = Topology(network)
    faults = [{"fault_token": "local", "asset_token": "TX-A", "state": "CLEARED"},
              {"fault_token": "upstream", "asset_token": "FUSE", "state": "ACTIVE"}]
    result = topology.remaining_blockers("HOME-A", faults)
    assert result["blocking_fault_tokens"] == ["upstream"]
    assert result["clear_of_modeled_faults"] is False
    faults[1]["state"] = "CLEARED"
    assert topology.remaining_blockers("HOME-A", faults)["clear_of_modeled_faults"] is True
    assert result["requires_explicit_reenergization"] is True


def test_impact_is_union_not_sum(network):
    topology = Topology(network)
    faults = [{"fault_token": "local", "asset_token": "TX-A", "state": "ACTIVE"},
              {"fault_token": "upstream", "asset_token": "FUSE", "state": "REPAIRING"}]
    before = copy.deepcopy(faults)
    assert topology.affected_premises(faults)["premise_tokens"] == ["HOME-A", "HOME-B"]
    assert faults == before


def test_unknown_premise_and_fault_never_imply_zero_impact(network):
    topology = Topology(network)
    assert topology.get_supply_path("MISSING")["status"] == "UNKNOWN"
    assert topology.get_dependents("UNKNOWN-POLE")["known_count"] is None
    faults = [{"fault_token": "unknown", "asset_token": "UNKNOWN-POLE", "state": "ACTIVE"}]
    assert topology.remaining_blockers("HOME-A", faults)["clear_of_modeled_faults"] is None
    assert topology.affected_premises(faults)["unknown_coverage_count"] == 2


def test_compare_validated_branch_dependencies(network):
    result = Topology(network).compare_paths("HOME-A", "HOME-B")
    assert result["shared_upstream_tokens"] == ["FUSE", "BREAKER"]
    assert result["branch_a_tokens"] == ["TX-A"]
    assert result["branch_b_tokens"] == ["TX-B"]
    assert Topology(network).compare_paths("HOME-A", "missing")["status"] == "UNKNOWN"


def test_path_results_do_not_mutate_service_state(network):
    topology = Topology(network)
    result = topology.get_supply_path("HOME-A")
    result["asset_tokens"].clear()
    result["limitations"].append("changed by consumer")
    assert topology.get_supply_path("HOME-A")["asset_tokens"] == ["TX-A", "FUSE", "BREAKER"]
    assert topology.get_supply_path("HOME-A")["limitations"] == []


def test_reject_duplicate_tokens_and_missing_assets(network):
    bad = copy.deepcopy(network)
    bad["nodes"].append(bad["nodes"][0])
    with pytest.raises(ValueError, match="Duplicate"):
        Topology(bad)
    network["supply_paths"][0]["asset_tokens"].append("MISSING")
    with pytest.raises(ValueError, match="unknown asset"):
        Topology(network)


def test_source_slice_has_grounded_multi_fault_example():
    root = Path(__file__).resolve().parents[1] / "data" / "processed"
    bundle = json.loads((root / "network_bundle.json").read_text())
    example = json.loads((root / "data_handoff_example.json").read_text())
    topology = Topology(bundle)
    premise = example["selected_premise_token"]
    path = topology.get_supply_path(premise)
    assert path["transformer_join"] == "CUSTOMER_LOCATION_CIRCUIT_AND_TEXT_CLASS_ID_LOCATION"
    assert path["physical_path_complete"] is False
    assert len(topology.get_dependents(example["upstream_asset_token"])["premise_tokens"]) > 1
    assert example["after_local_repair"]["blocking_fault_tokens"] == ["SCENARIO-UPSTREAM"]
    assert example["impact"]["known_count"] == len(set(example["impact"]["premise_tokens"]))
