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
            token = record.get("premise_token")
            if not isinstance(token, str) or not token or token != graph["premise_tokens"][premise]:
                raise ValueError("Persisted premise token disagrees with catalog")
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
