"""Build a private relational graph and bounded customer-safe GeoJSON slice, offline."""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
import math
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline.import_gis import load_gis, match_equipment, point_records
from pipeline.inspect_assets import DEFAULT_DATA, dbf_records, inspect_assets, source_archives, write_json
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


DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data/processed"
PUBLIC_OUTPUTS = ("inventory.json", "graph_summary.json", "network.geojson", "source_context.json", "risk_context.json")


def _source_hashes(data_dir):
    hashes = {}
    for path in source_archives(data_dir):
        with path.open("rb") as stream:
            hashes[path.name] = hashlib.file_digest(stream, "sha256").hexdigest()
    return hashes


def _damage_reports(data_dir):
    """Read only report date and equipment-report geometry; never customer coordinates."""
    stem = "arcos_prod_damage_09_28_Clip"
    with zipfile.ZipFile(source_archives(data_dir)[0]) as archive:
        if stem + ".dbf" not in archive.namelist():
            return [], {"status": "UNAVAILABLE", "reason": "Damage layer absent from source archive"}
        with archive.open(stem + ".dbf") as stream:
            rows = list(dbf_records(stream, columns={"Report_Tim"}))
        crs = archive.read(stem + ".prj").decode("utf8")
        with archive.open(stem + ".shp") as stream:
            points = dict(point_records(stream, crs))
        records, missing = [], 0
        for index, row in rows:
            try:
                day = date.fromisoformat(row.get("Report_Tim", "")).isoformat()
            except ValueError:
                missing += 1
                continue
            point = points.get(index)
            if point is None:
                missing += 1
                continue
            records.append((day, point))
        return records, {"status": "AVAILABLE", "source_records": len(rows),
                         "usable_dated_points": len(records), "missing_date_or_geometry": missing}


def _distance_m(a, b):
    lon1, lat1, lon2, lat2 = map(math.radians, [*a, *b])
    value = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371008.8 * 2 * math.asin(math.sqrt(min(1, max(0, value))))


def build_risk_context(topology, data_dir, premises, radius_m=2000):
    reports, coverage = _damage_reports(data_dir)
    assets = {}
    for premise in sorted(premises):
        key = topology._premise(premise)
        record = topology.paths.get(key)
        if record is None:
            continue
        node = topology.nodes[record["asset_ids"][0]]
        token, point = node["asset_token"], node.get("point")
        if token in assets or point is None or coverage["status"] != "AVAILABLE":
            continue
        counts = Counter(day for day, other in reports if _distance_m(point, other) <= radius_m)
        assets[token] = {"radius_m": radius_m, "reference": "matched_transformer_gis",
                         "reports_by_date": [{"date": day, "count": count} for day, count in sorted(counts.items())]}
    return {"format_version": 1, "source": "aep_challenge", "scope": "published_catalog_and_demo_context",
            "coverage": coverage, "assets": assets,
            "distance_model": "spherical_great_circle_mean_earth_radius",
            "limitations": ["Reference is the matched transformer, not an exact household location.",
                            "Nearby reports do not establish a causal failure or electrical dependence.",
                            "Counts have no comparable exposure denominator or independent storm labels."]}


def _publish_runtime(graph, data_dir, output_dir, premise=None, max_premises=12):
    from engine.topology import Topology
    topology = Topology(graph)
    seed = premise or next(iter(graph["paths"]), "")
    public_slice = topology.safe_geojson(seed, max_premises=max_premises)
    catalog = topology.premise_catalog(limit=50)
    scenario = topology.scenario_context(seed)
    selected = {p["premise_token"] for p in catalog} | set(public_slice.get("premise_tokens", []))
    if scenario["status"] == "KNOWN":
        selected.update(scenario["context"]["feeder_premise_tokens"])
    write_json(output_dir / "inventory.json", inspect_assets(data_dir))
    write_json(output_dir / "graph_summary.json", graph["summary"])
    write_json(output_dir / "network.geojson", public_slice)
    write_json(output_dir / "source_context.json", {"catalog": catalog, **scenario})
    write_json(output_dir / "risk_context.json", build_risk_context(topology, data_dir, selected))
    # Publish the marker last, so interrupted/partial updates cannot look fresh.
    write_json(output_dir / "source_manifest.json", {
        "format_version": 1, "source_archive_sha256": graph["source_archive_sha256"],
        "public_file_sha256": {name: hashlib.sha256((output_dir / name).read_bytes()).hexdigest() for name in PUBLIC_OUTPUTS}})
    return public_slice


def _public_outputs_match(output_dir, source_hashes):
    try:
        manifest = json.loads((output_dir / "source_manifest.json").read_text())
        if manifest.get("source_archive_sha256") != source_hashes:
            return False
        hashes = manifest.get("public_file_sha256", {})
        return all(hashes.get(name) == hashlib.sha256((output_dir / name).read_bytes()).hexdigest() for name in PUBLIC_OUTPUTS)
    except (FileNotFoundError, ValueError):
        return False


def ensure_runtime_data(data_dir=DEFAULT_DATA, output_dir=None):
    """Explicit offline bootstrap for API startup; never commit the private graph.

    A cache is reused only after source-hash and persisted-token validation.
    The API owner may call this once at startup rather than on each GET request.
    """
    from engine.topology import Topology
    output_dir = Path(output_dir) if output_dir is not None else DEFAULT_OUTPUT
    private_dir = output_dir / "private"
    path = private_dir / "topology.json"
    source_hashes = _source_hashes(data_dir)
    reused = False
    graph = None
    if path.exists():
        graph = json.loads(path.read_text())
        Topology(graph)  # Fail closed on a corrupt/mixed persisted graph.
        reused = graph.get("source_archive_sha256") == source_hashes
    if not reused:
        graph = build_graph(load_upstream(source_archives(data_dir)[2]), load_gis(data_dir))
        graph["source_archive_sha256"] = source_hashes
        Topology(graph)
        private_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        private_dir.chmod(0o700)
        (private_dir / ".gitignore").write_text("*\n!.gitignore\n")
        write_json(path, graph, private=True)
    if not reused or not _public_outputs_match(output_dir, source_hashes):
        public_slice = _publish_runtime(graph, data_dir, output_dir)
        status = public_slice["status"]
    else:
        status = json.loads((output_dir / "network.geojson").read_text())["status"]
    return {"topology_path": str(path), "reused": reused, "summary": graph["summary"], "public_slice_status": status}


def main():
    from engine.topology import Topology
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--premise", help="Private premise ID or public token for slice selection")
    parser.add_argument("--max-premises", type=int, default=12)
    args = parser.parse_args()
    result = ensure_runtime_data(args.data_dir, args.output_dir)
    if args.premise is not None or args.max_premises != 12:
        graph = Topology.load(result["topology_path"]).graph
        public_slice = _publish_runtime(graph, args.data_dir, args.output_dir, args.premise, args.max_premises)
        result["public_slice_status"] = public_slice["status"]
    print(json.dumps(result))


if __name__ == "__main__":
    main()
