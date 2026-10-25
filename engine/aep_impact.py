"""Impact simulation over anonymized dependency paths extracted from the official AEP challenge.

This is NOT a live outage feed, measured conductor geometry, a switching model, or
a whole-territory count. The checked-in data is a validated 16-premise source slice.
No synthetic P-DEMO premises are used in the default app path.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from engine.topology import tag_critical_facilities

BUNDLE_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "network_bundle.json"


class UnknownAEPAsset(ValueError):
    pass


class AEPImpact:
    def __init__(self, bundle: dict):
        meta = bundle.get("metadata", {})
        if meta.get("provenance") != "aep_challenge" or meta.get("scope") != "selected_subnet":
            raise ValueError("Expected AEP-derived, explicitly scoped public network bundle")
        nodes, paths = bundle["nodes"], bundle["supply_paths"]
        self.metadata = meta
        self.bundle_edges = bundle.get("edges", [])
        self.assets = {n["asset_token"]: n for n in nodes}
        self.paths = {p["premise_token"]: p for p in paths}
        if len(self.assets) != len(nodes) or len(self.paths) != len(paths) or not self.paths:
            raise ValueError("Duplicate or missing asset/premise tokens")
        self.reverse = defaultdict(set)
        for premise, path in self.paths.items():
            tokens = path["asset_tokens"]
            if not tokens or len(tokens) != len(set(tokens)) or any(t not in self.assets for t in tokens):
                raise ValueError("Invalid source-supplied dependency path")
            if path.get("provenance") != "aep_challenge":
                raise ValueError("Path lacks AEP provenance")
            for token in tokens:
                self.reverse[token].add(premise)
        self.critical_facility_summary = tag_critical_facilities(
            self.assets, list(self.paths.values()), bundle.get("critical_facility_associations", []),
            path_key="asset_tokens")
        self.default_premise = sorted(self.paths)[0]

    @classmethod
    def load(cls, path: str | Path = BUNDLE_PATH) -> "AEPImpact":
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def affected(self, asset_token: str) -> list[str]:
        if asset_token not in self.assets:
            raise UnknownAEPAsset("Asset not found in the validated AEP sample")
        return sorted(self.reverse[asset_token])

    def affected_critical_facilities(self, asset_token: str) -> dict:
        if asset_token not in self.assets:
            raise UnknownAEPAsset("Asset not found in the validated AEP sample")
        records = self.assets[asset_token]["critical_facilities"]
        return {**self.critical_facility_summary, "facility_count": len(records),
                "critical_facilities": records}

    def _on_path(self, premise: str, kind: str) -> str:
        tokens = self.paths[premise]["asset_tokens"]
        choices = [t for t in tokens if self.assets[t]["kind"] == kind]
        if not choices:
            raise UnknownAEPAsset("Source path does not contain required " + kind)
        # Supplied paths are ordered from household toward upstream protection.
        return choices[0] if kind == "TRANSFORMER" else choices[-1]

    def scenario_context(self, scenario_id: str, asset_token: str | None = None,
                         premise_token: str | None = None) -> dict:
        if scenario_id not in ("local_protection", "upstream_feeder",
                               "confirmed_replacement", "insufficient_evidence"):
            raise ValueError("Unknown scenario")
        if premise_token is not None and premise_token not in self.paths:
            raise UnknownAEPAsset("Premise outside validated AEP sample")
        seed = premise_token or self.default_premise
        kind = "CIRCUIT_BREAKER" if scenario_id == "upstream_feeder" else "TRANSFORMER"
        selected_asset = asset_token or self._on_path(seed, kind)
        if selected_asset not in self.assets or self.assets[selected_asset]["kind"] != kind:
            raise UnknownAEPAsset("Selected asset must be an AEP " + kind)
        affected = self.affected(selected_asset)
        if not affected:
            raise ValueError("Selected asset has no validated dependents")
        if premise_token is not None and premise_token not in affected:
            raise UnknownAEPAsset("Selected premise does not depend on the selected fault asset")
        selected_premise = seed if seed in affected else affected[0]
        local_asset = self._on_path(selected_premise, "TRANSFORMER")
        breaker_asset = self._on_path(selected_premise, "CIRCUIT_BREAKER")
        local_tokens = self.affected(local_asset)
        feeder_tokens = self.affected(breaker_asset)
        if not set(local_tokens) < set(feeder_tokens):
            raise ValueError("Validated sample cannot distinguish local and upstream impacts")
        if not set(affected) <= set(feeder_tokens):
            raise ValueError("Fault footprint escapes validated upstream sample")
        node = self.assets[selected_asset]
        return {
            "current_asset_id": local_asset,
            "upstream_asset_id": breaker_asset,
            "selected_premise_token": selected_premise,
            "local_premise_tokens": local_tokens,
            "feeder_premise_tokens": feeder_tokens,
            "source_impact": {
                "provenance": "aep_challenge",
                "scope": "selected_subnet",
                "basis": "provided_upstream_sequence_not_live_outage",
                "fault_asset_token": selected_asset,
                "fault_asset_kind": kind,
                "affected_count_in_sample": len(affected),
                "sample_premise_count": len(self.paths),
                "full_source_known_dependent_count": node.get("full_source_known_count"),
                "critical_facility_impact": self.affected_critical_facilities(selected_asset),
            },
        }

    def selectable_assets(self) -> list[dict]:
        return [
            {"asset_token": token, "kind": node["kind"],
             "dependent_premises_in_sample": len(self.reverse[token]),
             "full_source_known_dependent_count": node.get("full_source_known_count"),
             "critical_facility_count": node["critical_facility_count"],
             "critical_facility_status": self.critical_facility_summary["status"]}
            for token, node in sorted(self.assets.items())
            if node["kind"] in ("TRANSFORMER", "CIRCUIT_BREAKER")
        ]

    def geojson(self) -> dict:
        """Schematic map from the very same source bundle used for outage impact.

        Only generalized equipment points; no premise location or conductor lines.
        Missing GIS joins stay missing, never guessed.
        """
        features, locations = [], {}
        for token, node in sorted(self.assets.items()):
            point = node.get("coordinates")
            if point is None:
                continue
            if (not isinstance(point, list) or len(point) != 2 or
                    any(not isinstance(v, (int, float)) or isinstance(v, bool) for v in point) or
                    not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90)):
                raise ValueError("Invalid generalized AEP equipment coordinate")
            locations[token] = point
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": point},
                "properties": {"asset_token": token, "kind": node["kind"],
                               "provenance": "aep_challenge", "geometry_quality": "generalized"},
            })
        for edge in self.bundle_edges:
            lower, upper = edge["downstream_token"], edge["upstream_token"]
            if lower in locations and upper in locations and locations[lower] != locations[upper]:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString",
                                 "coordinates": [locations[lower], locations[upper]]},
                    "properties": {"downstream_token": lower, "upstream_token": upper,
                                   "provenance": "aep_challenge",
                                   "relation": "provided_upstream_sequence",
                                   "geometry_quality": "schematic_link_not_conductor"},
                })
        return {
            "type": "FeatureCollection", "status": "KNOWN", "features": features,
            "provenance": "aep_challenge", "scope": "selected_subnet",
            "missing_geometry_tokens": sorted(set(self.assets) - set(locations)),
            "geometry_policy": "Generalized AEP equipment locations (0.02-degree grid); "
                               "links are schematic dependencies, NOT conductors.",
            "relationship_basis": "supplied_upstream_sequence_not_live_energization",
        }

    def trace(self, premise_token: str) -> dict:
        path = self.paths.get(premise_token)
        if path is None:
            return {"status": "UNKNOWN", "path": [], "substation_status": "UNKNOWN",
                    "reason": "premise_not_in_public_source_slice"}
        tokens = path["asset_tokens"]
        return {
            "status": "KNOWN", "premise_token": premise_token, "path": tokens,
            "equipment": [{"asset_token": token, "kind": self.assets[token]["kind"]}
                          for token in tokens],
            "direction": "premise_to_upstream", "endpoint": "Circuit Breaker",
            "substation_status": "UNKNOWN", "basis": "aep_challenge_provided_upstream_sequence",
            "scope": "selected_subnet",
            "limitations": ["No live energization status or physical line geometry.",
                            "Upstream breaker path does not identify a physical substation."],
        }
