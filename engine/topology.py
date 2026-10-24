"""Pure lookups over a sanitized source-derived slice, with explicit unknown coverage.

These are dependencies in supplied text, not power-flow or live switching results.
The API owner decides whether a re-energization event permits restoration.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path


class Topology:
    def __init__(self, bundle: dict):
        self.bundle = bundle
        self.nodes = {n["asset_token"]: n for n in bundle["nodes"]}
        self.paths = {p["premise_token"]: p for p in bundle["supply_paths"]}
        if len(self.nodes) != len(bundle["nodes"]) or len(self.paths) != len(bundle["supply_paths"]):
            raise ValueError("Duplicate public asset or premise tokens")
        self.reverse = {token: set() for token in self.nodes}
        for premise, path in self.paths.items():
            if not path["asset_tokens"] or len(set(path["asset_tokens"])) != len(path["asset_tokens"]):
                raise ValueError("Empty or cyclic supply path")
            for asset in path["asset_tokens"]:
                if asset not in self.nodes:
                    raise ValueError("Supply path references an unknown asset")
                self.reverse[asset].add(premise)

    @classmethod
    def load(cls, path: str | Path = "data/processed/network_bundle.json"):
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def get_supply_path(self, premise_token: str) -> dict:
        path = self.paths.get(premise_token)
        if path is None:
            return {"status": "UNKNOWN", "premise_token": premise_token, "asset_tokens": [],
                    "limitations": ["Premise is outside this validated slice; no nearest-asset fallback."]}
        return deepcopy(path)

    def get_dependents(self, asset_token: str) -> dict:
        if asset_token not in self.reverse:
            return {"status": "UNKNOWN", "asset_token": asset_token, "premise_tokens": [],
                    "known_count": None, "scope": "selected_subnet"}
        premises = sorted(self.reverse[asset_token])
        return {"status": "KNOWN_IN_SCOPE", "asset_token": asset_token, "premise_tokens": premises,
                "known_count": len(premises), "scope": "selected_subnet",
                "full_source_known_count": self.nodes[asset_token].get("full_source_known_count"),
                "limitation": "Count is text-path dependence, not confirmed outages or switch feasibility."}

    def remaining_blockers(self, premise_token: str, faults: list[dict]) -> dict:
        path = self.paths.get(premise_token)
        if path is None:
            return {"status": "UNKNOWN", "premise_token": premise_token, "blocking_fault_tokens": [],
                    "unknown_fault_tokens": [f["fault_token"] for f in faults], "clear_of_modeled_faults": None}
        blockers, unknown = set(), set()
        for fault in faults:
            state = fault.get("state", "UNKNOWN")
            if state not in {"ACTIVE", "REPAIRING", "CLEARED", "UNKNOWN"}:
                raise ValueError("Unsupported fault state")
            if state == "CLEARED":
                continue
            asset = fault.get("asset_token")
            if asset not in self.nodes or (state == "UNKNOWN" and asset in path["asset_tokens"]):
                unknown.add(fault["fault_token"])
            elif asset in path["asset_tokens"]:
                blockers.add(fault["fault_token"])
        return {"status": "UNKNOWN" if unknown else "KNOWN_IN_SCOPE", "premise_token": premise_token,
                "blocking_fault_tokens": sorted(blockers), "unknown_fault_tokens": sorted(unknown),
                "clear_of_modeled_faults": None if unknown else not blockers,
                "requires_explicit_reenergization": True}

    def affected_premises(self, faults: list[dict]) -> dict:
        states = [self.remaining_blockers(p, faults) for p in sorted(self.paths)]
        affected = [s["premise_token"] for s in states if s["blocking_fault_tokens"]]
        return {"premise_tokens": affected, "known_count": len(affected), "scope": "selected_subnet",
                "unknown_coverage_count": sum(s["status"] == "UNKNOWN" for s in states),
                "premise_states": states, "provenance": "scenario"}

    def compare_paths(self, premise_a: str, premise_b: str) -> dict:
        a, b = self.get_supply_path(premise_a), self.get_supply_path(premise_b)
        if a["status"] == "UNKNOWN" or b["status"] == "UNKNOWN":
            return {"status": "UNKNOWN", "shared_upstream_tokens": [], "reason": "Both paths are required."}
        a_tokens, b_tokens = a["asset_tokens"], b["asset_tokens"]
        shared = [t for t in a_tokens if t in b_tokens]
        return {"status": "KNOWN_IN_SCOPE", "premise_a": premise_a, "premise_b": premise_b,
                "shared_upstream_tokens": shared,
                "branch_a_tokens": [t for t in a_tokens if t not in shared],
                "branch_b_tokens": [t for t in b_tokens if t not in shared],
                "first_shared_upstream_token": shared[0] if shared else None,
                "limitation": "Supplied dependencies explain branch differences; geographic proximity proves no link."}


def get_supply_path(network: dict, premise_token: str) -> dict:
    return Topology(network).get_supply_path(premise_token)


def get_dependents(network: dict, asset_token: str) -> dict:
    return Topology(network).get_dependents(asset_token)


def compare_paths(network: dict, premise_a: str, premise_b: str) -> dict:
    return Topology(network).compare_paths(premise_a, premise_b)


def remaining_blockers(network: dict, premise_token: str, faults: list[dict]) -> dict:
    return Topology(network).remaining_blockers(premise_token, faults)
