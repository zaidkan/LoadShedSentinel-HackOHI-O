"""Read-only supplied-path queries. No inferred electrical or energized-state connectivity."""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path


class Topology:
    def __init__(self, graph):
        self.graph = graph
        self.nodes = graph["nodes"]
        self.paths = graph["paths"]
        self.premises_by_token = {token: key for key, token in graph["premise_tokens"].items()}
        self.assets_by_token = {node["asset_token"]: key for key, node in self.nodes.items()}
        if len(self.assets_by_token) != len(self.nodes) or len(self.premises_by_token) != len(graph["premise_tokens"]):
            raise ValueError("Duplicate public topology tokens")
        self.reverse = defaultdict(set)
        for premise, record in self.paths.items():
            ids = record["asset_ids"]
            if not ids or len(ids) != len(set(ids)) or any(key not in self.nodes for key in ids):
                raise ValueError("Invalid persisted premise path")
            if premise not in graph["premise_tokens"] or not isinstance(premise, str):
                raise ValueError("Invalid persisted premise key")
            if record.get("premise_token") != graph["premise_tokens"][premise]:
                raise ValueError("Persisted premise token disagrees with the public token catalog")
            for key in ids:
                self.reverse[key].add(premise)

    @classmethod
    def load(cls, path):
        return cls(json.loads(Path(path).read_text()))

    def _premise(self, value):
        return self.premises_by_token.get(value, value) if isinstance(value, str) else None

    def _asset(self, value):
        return self.assets_by_token.get(value, value) if isinstance(value, str) else None

    def premise_to_substation(self, premise):
        """Public token path to supplied breaker; physical substation extension remains UNKNOWN."""
        key = self._premise(premise)
        record = self.paths.get(key)
        if record is None:
            return {"status": "UNKNOWN", "path": [], "substation_status": "UNKNOWN",
                    "reason": self.graph.get("rejected", {}).get(key, "unmapped_premise")}
        return {"status": "KNOWN", "premise_token": record["premise_token"],
                "path": [self.nodes[k]["asset_token"] for k in record["asset_ids"]],
                "equipment": [{"asset_token": self.nodes[k]["asset_token"],
                               "kind": self.nodes[k]["kind"],
                               "geometry_status": self.nodes[k]["gis_status"]}
                              for k in record["asset_ids"]],
                "direction": "premise_to_upstream", "endpoint": "Circuit Breaker",
                "substation_status": "UNKNOWN",
                "station_label_status": "REPORTED" if record.get("station_label") else "UNKNOWN",
                "basis": "aep_challenge_ordered_path_and_validated_customer_transformer_join",
                "limitations": ["Circuit station labels do not prove physical substation connectivity.",
                                "No live switch state, distance or switching feasibility is inferred."]}

    def affected_premises(self, asset_ids):
        """Union validated dependencies; unknown fault IDs never produce a known-zero footprint."""
        values = list(asset_ids) if isinstance(asset_ids, (list, tuple, set)) else [asset_ids]
        affected, unknown_count = set(), 0
        for value in values:
            key = self._asset(value)
            if key not in self.reverse:
                unknown_count += 1
            else:
                affected.update(self.reverse[key])
        tokens = sorted(self.paths[p]["premise_token"] for p in affected)
        return {"status": "UNKNOWN" if unknown_count else "KNOWN",
                "affected_premise_tokens": tokens, "affected_count": len(tokens),
                "unknown_asset_count": unknown_count,
                "coverage_partial": bool(self.graph.get("rejected")),
                "basis": "union_of_validated_supplied_paths",
                "disclosure": "Hypothetical dependency footprint; not an observed outage or complete service-territory count."}

    def get_supply_path(self, premise):
        """Public-token alias; the supplied breaker is not a physical substation."""
        return self.premise_to_substation(premise)

    def get_dependents(self, asset):
        """Return the existing coverage-aware impact shape for one supplied asset."""
        return self.affected_premises(asset)

    def compare_paths(self, premise_a, premise_b):
        a, b = self.get_supply_path(premise_a), self.get_supply_path(premise_b)
        result = {"status": "UNKNOWN", "source": "aep_challenge", "shared_upstream_tokens": [],
                  "branch_a_tokens": [], "branch_b_tokens": [],
                  "limitations": ["Comparison uses supplied dependencies, not proximity or live switching state."]}
        if a["status"] == "UNKNOWN" or b["status"] == "UNKNOWN":
            result["reason"] = "Both validated premise paths are required."
            return result
        shared = set(a["path"]) & set(b["path"])
        result.update({"status": "KNOWN", "premise_a": a["premise_token"], "premise_b": b["premise_token"],
                       "shared_upstream_tokens": [t for t in a["path"] if t in shared],
                       "branch_a_tokens": [t for t in a["path"] if t not in shared],
                       "branch_b_tokens": [t for t in b["path"] if t not in shared]})
        return result

    def remaining_blockers(self, premise, faults):
        """Evaluate declared fault states against one validated supplied path.

        Unknown coverage never means a known-zero footprint. Clearing all modeled
        blockers does not authorize restoration; the orchestrator must explicitly
        apply its re-energization event.
        """
        normalized = {}
        for fault in faults:
            token = fault.get("fault_token")
            if not isinstance(token, str) or not token:
                raise ValueError("Each fault requires a nonempty fault_token")
            state = fault.get("state", "UNKNOWN")
            if state not in {"ACTIVE", "REPAIRING", "CLEARED", "UNKNOWN"}:
                raise ValueError("Unsupported fault state")
            value = (self._asset(fault.get("asset_token")), state)
            if token in normalized and normalized[token] != value:
                raise ValueError("Conflicting duplicate fault_token")
            normalized[token] = value
        key = self._premise(premise)
        record = self.paths.get(key)
        result = {"status": "UNKNOWN", "blocking_fault_tokens": [], "unknown_fault_tokens": [],
                  "clear_of_modeled_faults": None, "requires_explicit_reenergization": True}
        if record is None:
            result["unknown_fault_tokens"] = sorted(t for t, (_, state) in normalized.items() if state != "CLEARED")
            return result
        blocking, unknown = set(), set()
        path = set(record["asset_ids"])
        for token, (asset, state) in normalized.items():
            if state == "CLEARED":
                continue
            if asset not in self.reverse:
                unknown.add(token)
            elif asset in path:
                (unknown if state == "UNKNOWN" else blocking).add(token)
        result.update({"status": "UNKNOWN" if unknown else "KNOWN",
                       "premise_token": record["premise_token"],
                       "blocking_fault_tokens": sorted(blocking), "unknown_fault_tokens": sorted(unknown),
                       "clear_of_modeled_faults": None if unknown else not blocking})
        return result

    @staticmethod
    def _bounded_count(value, name):
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 1000:
            raise ValueError(name + " must be an integer from 1 to 1000")
        return value

    def premise_catalog(self, limit=50):
        """Bounded selection entries with public tokens; no source keys or attributes."""
        self._bounded_count(limit, "limit")
        tokens = sorted(record["premise_token"] for record in self.paths.values())[:limit]
        return [{"premise_token": token, "label": f"Anonymized home {i + 1}", "source": "aep_challenge"}
                for i, token in enumerate(tokens)]

    def scenario_context(self, premise, max_premises=1000):
        """Return bounded real dependency groups for an explicitly simulated case.

        The nearest supplied protective device must have a strict superset of the
        transformer's dependent premises. Missing or oversized groups abstain;
        groups are never sampled, truncated or invented to fit a scenario.
        """
        self._bounded_count(max_premises, "max_premises")
        result = {"status": "UNKNOWN", "source": "aep_challenge", "context": None,
                  "limitations": ["Groups count validated supplied paths only; unmatched customers may also depend on the assets.",
                                  "Scenario context does not establish a live outage, switching feasibility or physical substation path."]}
        key = self._premise(premise)
        record = self.paths.get(key)
        if record is None:
            result["reason"] = "No validated premise supply path is available."
            return result
        local_asset = record["asset_ids"][0]
        local = self.reverse[local_asset]
        if len(local) > max_premises:
            result["reason"] = "The complete local dependency group exceeds max_premises."
            return result
        protective_kinds = {"Fuse", "Recloser (Hydraulic)", "Recloser (Electronic)", "Sectionalizer", "Circuit Breaker"}
        for asset in record["asset_ids"][1:]:
            if self.nodes[asset]["kind"] not in protective_kinds:
                continue
            feeder = self.reverse[asset]
            if not local < feeder or len(feeder) > max_premises:
                continue
            result.update({"status": "KNOWN", "context": {
                "current_asset_id": self.nodes[local_asset]["asset_token"],
                "upstream_asset_id": self.nodes[asset]["asset_token"],
                "selected_premise_token": record["premise_token"],
                "local_premise_tokens": sorted(self.paths[p]["premise_token"] for p in local),
                "feeder_premise_tokens": sorted(self.paths[p]["premise_token"] for p in feeder)}})
            return result
        result["reason"] = "No bounded supplied protective-device group strictly contains the complete local group."
        return result

    def safe_geojson(self, premise, max_premises=12):
        """Bounded equipment-only slice; no customer coordinates or raw source identifiers."""
        if isinstance(max_premises, bool) or not isinstance(max_premises, int) or not 1 <= max_premises <= 50:
            raise ValueError("max_premises must be an integer from 1 to 50")
        seed = self._premise(premise)
        collection = {"type": "FeatureCollection", "status": "UNKNOWN", "features": [],
                      "provenance": "aep_challenge", "premise_tokens": [],
                      "geometry_policy": "Equipment points generalized to 0.01 degrees; customer geometry omitted.",
                      "relationship_basis": "supplied_ordered_paths_not_measured_line_segments"}
        if seed not in self.paths:
            collection["reason"] = "unmapped_premise"
            return collection
        first = self.paths[seed]["asset_ids"][0]
        selected = [seed] + sorted(self.reverse[first] - {seed})[:max_premises - 1]
        chosen = set(k for p in selected for k in self.paths[p]["asset_ids"])
        positions, features = {}, []
        for key in sorted(chosen):
            node = self.nodes[key]
            point = node.get("point")
            if point is None:
                continue
            if len(point) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in point):
                raise ValueError("Invalid stored geometry")
            if not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90):
                raise ValueError("Stored geometry is not WGS84")
            generalized = [round(point[0], 2), round(point[1], 2)]
            positions[key] = generalized
            features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": generalized},
                             "properties": {"asset_token": node["asset_token"], "kind": node["kind"],
                                            "provenance": "aep_challenge", "geometry_quality": "generalized"}})
        links = set((a, b) for p in selected for a, b in zip(self.paths[p]["asset_ids"], self.paths[p]["asset_ids"][1:]))
        for a, b in sorted(links):
            if a in positions and b in positions:
                features.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": [positions[a], positions[b]]},
                                 "properties": {"downstream_token": self.nodes[a]["asset_token"],
                                                "upstream_token": self.nodes[b]["asset_token"],
                                                "relation": "provided_upstream_path",
                                                "geometry_quality": "schematic_link_not_conductor",
                                                "provenance": "aep_challenge"}})
        collection.update({"status": "KNOWN", "features": features,
                           "premise_tokens": sorted(self.paths[p]["premise_token"] for p in selected),
                           "selected_premise_token": self.paths[seed]["premise_token"],
                           "paths": [self.premise_to_substation(p)["path"] for p in selected],
                           "missing_geometry_tokens": sorted(self.nodes[k]["asset_token"] for k in chosen if k not in positions),
                           "available_peer_count": len(self.reverse[first]),
                           "truncated": len(self.reverse[first]) > len(selected)})
        return collection
