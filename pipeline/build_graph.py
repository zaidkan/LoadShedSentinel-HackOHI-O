"""Build a small real subnet, safe map, provenance and risk context from AEP ZIPs.

Run from the repository root: python -m pipeline.build_graph
Raw source identifiers/coordinates remain in memory or .data-private/ only.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import hmac
import json
from pathlib import Path
import secrets

from pyproj import Geod

from pipeline.import_gis import AssetIndex, generalize, key, load_assets, open_layer, project_point
from pipeline.inspect_assets import inspect_sources
from pipeline.parse_upstream import read_upstream


GEOD = Geod(ellps="WGS84")
KIND = {"Distribution": "TRANSFORMER", "Step": "STEP_TRANSFORMER", "Fuse": "FUSE",
        "Circuit Breaker": "CIRCUIT_BREAKER", "Recloser (Hydraulic)": "RECLOSER",
        "Recloser (Electronic)": "RECLOSER", "Sectionalizer": "SECTIONALIZER"}


class Tokenizer:
    def __init__(self, secret: bytes):
        if len(secret) < 32:
            raise ValueError("Token key must contain at least 32 random bytes")
        self.secret = secret

    def token(self, prefix: str, value: str) -> str:
        digest = hmac.new(self.secret, (prefix + "\0" + value).encode(), hashlib.sha256).hexdigest()[:16]
        return f"{prefix}-{digest.upper()}"


def load_customers(raw: Path):
    customers = {}
    with open_layer(raw, "customers") as layer:
        for ordinal, row, shape in layer.rows({"premise_nu", "aep_xfmr_l", "circuit_id"}, geometry=True):
            premise = key(row["premise_nu"])
            if not premise or premise in customers:
                raise ValueError("Empty/duplicate customer premise key; explicit resolution required")
            row.update(ordinal=ordinal, point=project_point(shape.points[0], layer.transform) if shape.points else None)
            customers[premise] = row
    return customers


def validate_paths(customers, upstream, index):
    validated, reasons, customer_join = {}, Counter(), Counter()
    for premise, customer in customers.items():
        transformer, customer_method = index.transformer_for_customer(customer)
        customer_join[customer_method] += 1
        if premise not in upstream:
            reasons["NO_TEXT_PATH"] += 1
            continue
        first, text_method = index.resolve(upstream[premise].equipment[0])
        if transformer is None:
            reasons[customer_method] += 1
        elif first is None:
            reasons["TEXT_" + text_method] += 1
        elif key(first["id"]) != key(transformer["id"]):
            reasons["CUSTOMER_TEXT_TRANSFORMER_CONFLICT"] += 1
        elif customer["point"] is None:
            reasons["MISSING_PREMISE_GEOMETRY"] += 1
        else:
            validated[premise] = upstream[premise]
    return validated, {"validated_premise_paths": len(validated), "rejected_customer_paths": dict(reasons),
                       "customer_transformer_join": dict(customer_join),
                       "customer_rows_without_text": len(customers.keys() - upstream.keys()),
                       "text_keys_without_customer": len(upstream.keys() - customers.keys())}


def choose_subnet(paths: dict, limit: int) -> list[str]:
    groups = defaultdict(list)
    for premise, path in paths.items():
        fuse = next((t for t in path.equipment[1:] if t.kind == "Fuse"), None)
        if fuse:
            groups[(path.equipment[-1].raw, fuse.raw)].append(premise)
    candidates = [(group, sorted(premises)) for group, premises in groups.items()
                  if 8 <= len(premises) <= min(40, limit)
                  and len({paths[p].equipment[0] for p in premises}) >= 2]
    if not candidates:
        raise ValueError("No validated multi-transformer fuse branch fits subnet limit")
    candidates.sort(key=lambda pair: (len(pair[1]), pair[0]))
    first, selected = candidates[0]
    # A second branch under the same breaker supports a meaningful path comparison.
    sibling = next((premises for group, premises in candidates if group[0] == first[0] and group != first
                    and len(selected) + len(premises) <= limit), [])
    return sorted(selected + sibling)


def load_damage(raw: Path, tokenizer: Tokenizer):
    public, private = [], []
    # Deliberately exclude reporting people, Media, free-text descriptions and life-support attributes.
    fields = {"Asset_Type", "Report_Tim", "Repaired_D", "Access_Iss", "Special_Eq"}
    with open_layer(raw, "damage") as layer:
        for ordinal, row, shape in layer.rows(fields, geometry=True):
            record = {"damage_token": tokenizer.token("DAMAGE", str(ordinal)),
                      "asset_class": key(row["Asset_Type"]) or "UNKNOWN",
                      "report_date": row["Report_Tim"].isoformat() if row["Report_Tim"] else None,
                      "repair_date": row["Repaired_D"].isoformat() if row["Repaired_D"] else None,
                      "access_issue_reported": key(row["Access_Iss"]).lower() == "yes",
                      "special_equipment_reported": bool(key(row["Special_Eq"])),
                      "damaged_asset_token": None, "match_method": "UNVERIFIED",
                      "provenance": "aep_challenge"}
            public.append(record)
            private.append({**record, "point": project_point(shape.points[0], layer.transform) if shape.points else None})
    return public, private


def history_context(point: list[float], damage: list[dict], radius_m: float = 2000) -> dict:
    counts = Counter()
    for record in damage:
        other = record["point"]
        if other is None or record["report_date"] is None:
            continue
        distance = GEOD.inv(*point, *other)[2]
        if distance <= radius_m:
            counts[record["report_date"]] += 1
    return {"radius_m": radius_m, "reports_by_date": [{"date": day, "count": n} for day, n in sorted(counts.items())],
            "limitation": "Spatial context only; no causal asset match, exposure denominator, or independent storm labels."}


def contextual_lines(raw: Path, circuits: set[str], points: list, tokenizer: Tokenizer, limit=60) -> list[dict]:
    result = []
    west, east = min(p[0] for p in points) - 0.02, max(p[0] for p in points) + 0.02
    south, north = min(p[1] for p in points) - 0.02, max(p[1] for p in points) + 0.02
    for name in ("primary", "secondary"):
        with open_layer(raw, name) as layer:
            for ordinal, row, _ in layer.rows({"circuit_id"}):
                if key(row["circuit_id"]) not in circuits:
                    continue
                shape = layer.reader.shape(ordinal)
                vertices = [project_point(p, layer.transform) for p in shape.points]
                if not any(west <= p[0] <= east and south <= p[1] <= north for p in vertices):
                    continue
                parts = list(shape.parts) + [len(vertices)]
                for start, end in zip(parts, parts[1:]):
                    coords = []
                    for point in vertices[start:end]:
                        coarse = generalize(point)
                        if not coords or coords[-1] != coarse:
                            coords.append(coarse)
                    if len(coords) < 2:
                        continue
                    result.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": coords},
                                   "properties": {"feature_token": tokenizer.token("GIS", f"{name}:{ordinal}:{start}"),
                                                  "kind": name.upper(), "role": "GIS_CONTEXT_ONLY",
                                                  "circuit_token": tokenizer.token("CIRCUIT", key(row["circuit_id"])),
                                                  "provenance": "aep_challenge", "electrical_connectivity": "UNVERIFIED"}})
                    if len(result) >= limit:
                        return result
    return result


def write_json(path: Path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True, allow_nan=False, sort_keys=True) + "\n", encoding="utf-8")


def build(raw: Path, output: Path, private_dir: Path, max_premises: int = 40) -> dict:
    if max_premises < 8:
        raise ValueError("max_premises must be at least eight")
    if private_dir.resolve().is_relative_to(output.resolve()):
        raise ValueError("Private lineage/key cannot be stored inside public output")
    output.mkdir(parents=True, exist_ok=True)
    private_dir.mkdir(parents=True, exist_ok=True)
    (private_dir / ".gitignore").write_text("*\n!.gitignore\n", encoding="utf-8")
    key_path = private_dir / "token.key"
    if not key_path.exists():
        key_path.write_bytes(secrets.token_bytes(32))
    tokenizer = Tokenizer(key_path.read_bytes())
    inventory = inspect_sources(raw)
    assets = load_assets(raw)
    index = AssetIndex(assets)
    customers = load_customers(raw)
    upstream, parse_report = read_upstream(raw)
    valid, joins = validate_paths(customers, upstream, index)
    selected = choose_subnet(valid, max_premises)
    source_counts = Counter(t.raw for path in valid.values() for t in path.equipment)
    tokens = {t.raw: t for p in selected for t in valid[p].equipment}
    nodes, paths, features, edges, lineage = [], [], [], {}, []
    for raw_token, token in sorted(tokens.items()):
        asset, method = index.resolve(token)
        public_token = tokenizer.token("ASSET", raw_token)
        point = generalize(asset["point"]) if asset and asset["point"] else None
        node = {"asset_token": public_token, "kind": KIND.get(token.kind, "UNKNOWN"),
                "provenance": "aep_challenge", "relationship_basis": "provided_upstream_sequence",
                "gis_join": method, "coordinates": point, "full_source_known_count": source_counts[raw_token]}
        nodes.append(node)
        if point is not None:
            features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": point},
                             "properties": {k: node[k] for k in ("asset_token", "kind", "provenance", "gis_join")}})
        lineage.append({"public_token": public_token, "source_token": raw_token, "gis_join": method,
                        "source_layer": asset["layer"] if asset else None, "source_row_zero_based": asset["ordinal"] if asset else None})
    public_damage, private_damage = load_damage(raw, tokenizer)
    risk_context = {}
    for premise in selected:
        path, customer = valid[premise], customers[premise]
        public_premise = tokenizer.token("PREM", premise)
        equipment = [tokenizer.token("ASSET", t.raw) for t in path.equipment]
        evidence = tokenizer.token("SOURCE", premise)
        limitations = ["Ordered equipment dependencies omit primary/secondary conductors and substation geometry.",
                       "Normal switch positions are not live state; no power-flow or alternate-feed feasibility is established."]
        unmatched = [tokenizer.token("ASSET", t.raw) for t in path.equipment if index.resolve(t)[0] is None]
        if unmatched:
            limitations.append("Some upstream equipment is supplied in text but has no validated GIS geometry.")
        paths.append({"premise_token": public_premise, "asset_tokens": equipment, "status": "PARTIAL",
                      "text_path_complete": True, "physical_path_complete": False,
                      "transformer_join": "CUSTOMER_LOCATION_CIRCUIT_AND_TEXT_CLASS_ID_LOCATION",
                      "unmapped_gis_tokens": unmatched, "evidence_refs": [evidence],
                      "provenance": "aep_challenge", "limitations": limitations,
                      "circuit_token": tokenizer.token("CIRCUIT", key(customer["circuit_id"]))})
        for downstream, parent in zip([public_premise] + equipment[:-1], equipment):
            edges[(parent, downstream)] = {"upstream_token": parent, "downstream_token": downstream,
                                           "basis": "provided_upstream_sequence", "provenance": "aep_challenge",
                                           "physical_line_geometry": False}
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": generalize(customer["point"])},
                         "properties": {"premise_token": public_premise, "kind": "PREMISE", "provenance": "aep_challenge"}})
        risk_context[public_premise] = history_context(customer["point"], private_damage)
        lineage.append({"public_token": public_premise, "source_premise": premise, "source_row_zero_based": customer["ordinal"],
                        "upstream_text_line_one_based": path.line, "evidence_ref": evidence})
    paths.sort(key=lambda p: p["premise_token"])
    circuits = {key(customers[p]["circuit_id"]) for p in selected}
    features.extend(contextual_lines(raw, circuits, [customers[p]["point"] for p in selected], tokenizer))
    gis_tokens = {t for path in upstream.values() for t in path.equipment}
    token_join = Counter(index.resolve(t)[1] for t in gis_tokens)
    token_join_by_kind = {kind: dict(Counter(index.resolve(t)[1] for t in gis_tokens if t.kind == kind))
                          for kind in sorted({t.kind for t in gis_tokens})}
    counts_by_kind = Counter(t.kind for t in gis_tokens)
    transformer_locations = {key(a["location_n"]) for a in assets if a["layer"] == "transformers"}
    report = {"source_counts": {r["layer"]: r["rows"] for r in inventory["layers"]},
              "upstream": parse_report, "joins": joins, "unique_equipment_tokens": len(gis_tokens),
              "equipment_gis_joins": dict(token_join), "equipment_kinds": dict(counts_by_kind),
              "equipment_gis_joins_by_kind": token_join_by_kind,
              "customer_transformer_location_key_exists": sum(key(c["aep_xfmr_l"]) in transformer_locations for c in customers.values()),
              "selected_premises": len(paths), "selected_assets": len(nodes), "selected_links": len(edges),
              "scope": "selected_subnet", "source": "aep_challenge",
              "limitations": ["Selected counts are not full-network impact counts.",
                              "GIS line context does not add electrical dependencies.",
                              "Historical damage Circuit labels do not match customer circuit_id; no circuit join is claimed.",
                              "NEAR_FID target layer is unverified; no damage-to-equipment assignment is claimed."]}
    metadata = {"schema_version": "data_slice_v1", "scope": "selected_subnet", "provenance": "aep_challenge",
                "coordinate_policy": {"crs": "EPSG:4326", "axis_order": "longitude_latitude", "grid_degrees": 0.02,
                                      "meaning": "Generalized source geometry; unsuitable for navigation or exact premises."},
                "source_archive_sha256": inventory["archive_sha256"],
                "limitations": report["limitations"]}
    bundle = {"metadata": metadata, "nodes": nodes, "supply_paths": paths,
              "edges": list(edges.values()), "risk_context": risk_context}
    write_json(output / "source_inventory.json", inventory)
    write_json(output / "network_bundle.json", bundle)
    write_json(output / "asset_nodes.json", nodes)
    write_json(output / "network.geojson", {"type": "FeatureCollection", "metadata": metadata, "features": features})
    write_json(output / "damage_features.json", {"metadata": {"provenance": "aep_challenge", "match_method": "UNVERIFIED",
                                                              "date_precision": "day", "geometry_exported": False}, "records": public_damage})
    write_json(output / "graph_summary.json", report)
    write_json(private_dir / "lineage.json", lineage)
    # A data-owned worked example for the integrator, not a new ScenarioSnapshot contract.
    from engine.risk import RiskService
    from engine.topology import Topology
    topology = Topology(bundle)
    chosen = paths[0]
    local, upstream_asset = chosen["asset_tokens"][0], next(t for t in chosen["asset_tokens"] if topology.nodes[t]["kind"] == "FUSE")
    faults = [{"fault_token": "SCENARIO-LOCAL", "asset_token": local, "state": "ACTIVE"},
              {"fault_token": "SCENARIO-UPSTREAM", "asset_token": upstream_asset, "state": "ACTIVE"}]
    example = {"selected_premise_token": chosen["premise_token"], "local_asset_token": local,
               "upstream_asset_token": upstream_asset, "supply_path": chosen,
               "risk": RiskService(bundle).get_risk(chosen["premise_token"], {"intensity": 0.7, "as_of": "2026-10-24"}),
               "active_faults": faults, "impact": topology.affected_premises(faults),
               "after_local_repair": topology.remaining_blockers(chosen["premise_token"], [{**faults[0], "state": "CLEARED"}, faults[1]]),
               "provenance": "scenario", "disclosure": "Faults are simulated on a real supplied dependency path."}
    write_json(output / "data_handoff_example.json", example)
    # Three branches for frontend/QA controls, chosen by dependence rather than geometry.
    selected_path = topology.paths[chosen["premise_token"]]
    local_set = set(topology.get_dependents(local)["premise_tokens"])
    upstream_set = set(topology.get_dependents(upstream_asset)["premise_tokens"])
    same_transformer = next((p for p in sorted(local_set) if p != chosen["premise_token"]), None)
    other_transformer = next((p for p in sorted(upstream_set - local_set)), None)
    other_branch = next((p for p in sorted(topology.paths) if p not in upstream_set
                         and selected_path["asset_tokens"][-1] in topology.paths[p]["asset_tokens"]), None)
    cases = {"source": "aep_challenge", "scope": "selected_subnet", "selected_premise_token": chosen["premise_token"],
             "same_transformer_premise_token": same_transformer,
             "other_transformer_same_fuse_premise_token": other_transformer,
             "other_fuse_same_breaker_premise_token": other_branch,
             "local_fault_asset_token": local, "upstream_fault_asset_token": upstream_asset,
             "cases": [{"id": "local_only", "faults": [faults[0]], "impact": topology.affected_premises([faults[0]])},
                       {"id": "upstream_only", "faults": [faults[1]], "impact": topology.affected_premises([faults[1]])},
                       {"id": "overlapping_faults", "faults": faults, "impact": topology.affected_premises(faults)}],
             "comparison": topology.compare_paths(chosen["premise_token"], other_branch) if other_branch else None,
             "limitation": "Faults/impacts are simulations over actual text paths; no physical proximity or live-state claim."}
    write_json(output / "data_demo_cases.json", cases)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=Path("aep_challenge_hack26/data/raw"))
    parser.add_argument("--output", type=Path, default=Path("data/processed"))
    parser.add_argument("--private-dir", type=Path, default=Path(".data-private"))
    parser.add_argument("--max-premises", type=int, default=40)
    args = parser.parse_args()
    report = build(args.raw, args.output, args.private_dir, args.max_premises)
    print(json.dumps({"selected_premises": report["selected_premises"], "selected_assets": report["selected_assets"],
                      "validated_source_paths": report["joins"]["validated_premise_paths"]}))


if __name__ == "__main__":
    main()
