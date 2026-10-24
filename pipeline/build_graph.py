"""Build a private relational graph and bounded customer-safe GeoJSON slice, offline."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline.import_gis import load_gis, match_equipment
from pipeline.inspect_assets import DEFAULT_DATA, inspect_assets, source_archives, write_json
from pipeline.parse_upstream import load_upstream


def build_graph(upstream, gis):
    nodes, paths, rejected, edges = {}, {}, {}, Counter()
    geometry_conflicts = set()
    asset_tokens = {key: f"ASSET-{i:06d}" for i, key in enumerate(sorted(upstream["equipment"]), 1)}
    premise_tokens = {key: f"PREM-{i:06d}" for i, key in enumerate(sorted(gis["customers"]), 1)}
    for key, item in upstream["equipment"].items():
        nodes[key] = {**item, "asset_token": asset_tokens[key], "gis_status": "UNKNOWN",
                      "point": None, "provenance": "aep_challenge"}
    for premise in sorted(set(gis["customers"]) | set(upstream["paths"])):
        rows = gis["customers"].get(premise, [])
        path = upstream["paths"].get(premise)
        reason = None
        if len(rows) != 1:
            reason = "missing_or_duplicate_customer_key"
        elif not path:
            reason = "missing_upstream_text"
        else:
            first, last = (upstream["equipment"][path[i]] for i in (0, -1))
            row = rows[0]
            if first["location"] != row["transformer_location"] or last["location"] != row["circuit_id"]:
                reason = "customer_path_transformer_or_circuit_mismatch"
            else:
                transformer, method = match_equipment(first, gis, row["circuit_id"])
                if transformer is None:
                    reason = method
        if reason:
            rejected[premise] = reason
            continue
        paths[premise] = {"asset_ids": path, "premise_token": premise_tokens[premise],
                          "circuit_id": row["circuit_id"],
                          "station_label": transformer["station_label"] or None,
                          "match_method": method}
        for key in path:
            item = upstream["equipment"][key]
            matched, how = match_equipment(item, gis, row["circuit_id"])
            if matched and key not in geometry_conflicts:
                if nodes[key]["gis_status"] == "KNOWN" and nodes[key]["point"] != matched["point"]:
                    geometry_conflicts.add(key)
                    nodes[key].update({"gis_status": "UNKNOWN", "point": None})
                    continue
                nodes[key].update({"gis_status": "KNOWN", "point": matched["point"],
                                   "match_method": how, "gis_layer": matched["layer"]})
        edges.update(zip(path, path[1:]))
    parents = defaultdict(set)
    for child, parent in edges:
        parents[child].add(parent)
    summary = {**gis["audit"], "text_premises": len(upstream["paths"]),
               "text_keys_absent_from_customers": len(set(upstream["paths"]) - set(gis["customers"])),
               "customers_without_text": len(set(gis["customers"]) - set(upstream["paths"])),
               "matched_premises": len(paths), "rejected_premises": len(rejected),
               "unmatched_customer_premises": len(gis["customers"]) - len(paths),
               "rejection_reasons": dict(Counter(rejected.values())),
               "equipment_nodes": len(nodes), "relational_edges": len(edges),
               "multiple_upstream_parents": sum(len(v) > 1 for v in parents.values()),
               "geometry_matched_equipment": sum(n["gis_status"] == "KNOWN" for n in nodes.values()),
               "conflicting_equipment_geometries": len(geometry_conflicts),
               "provenance": "aep_challenge",
               "limitations": ["Edges are supplied path relationships, not measured line segments or live switch states.",
                               "Substation labels are reported GIS circuit metadata; physical station paths are UNKNOWN.",
                               "Only validated complete premise paths contribute to impact counts.",
                               "Impact counts are coverage-limited; unmatched customers may also be affected."]}
    return {"format_version": 1, "visibility": "operator_only", "nodes": nodes, "paths": paths,
            "rejected": rejected, "premise_tokens": premise_tokens,
            "edges": [{"downstream": a, "upstream": b, "supporting_premises": count,
                       "basis": "provided_ordered_text"} for (a, b), count in sorted(edges.items())],
            "summary": summary}


def main():
    from engine.topology import Topology
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed"))
    parser.add_argument("--premise", help="Private premise ID or public token for slice selection")
    parser.add_argument("--max-premises", type=int, default=12)
    args = parser.parse_args()
    graph = build_graph(load_upstream(source_archives(args.data_dir)[2]), load_gis(args.data_dir))
    topology = Topology(graph)
    # The private graph contains raw identifiers. Publish only network.geojson, never this directory.
    private_dir = args.output_dir / "private"
    private_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_dir.chmod(0o700)
    write_json(private_dir / "topology.json", graph, private=True)
    write_json(args.output_dir / "inventory.json", inspect_assets(args.data_dir))
    write_json(args.output_dir / "graph_summary.json", graph["summary"])
    seed = args.premise or next(iter(graph["paths"]), "")
    public_slice = topology.safe_geojson(seed, max_premises=args.max_premises)
    write_json(args.output_dir / "network.geojson", public_slice)
    print(json.dumps({**graph["summary"], "public_slice_status": public_slice["status"],
                      "public_features": len(public_slice["features"])}))


if __name__ == "__main__":
    main()
