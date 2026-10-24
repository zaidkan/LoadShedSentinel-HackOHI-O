"""Read the supplied GIS ZIPs without extracting archives or exporting customer attributes."""
from __future__ import annotations

import argparse
import json
import math
import struct
import zipfile
from collections import Counter, defaultdict

try:
    from .inspect_assets import DEFAULT_DATA, dbf_records, source_archives, write_json
except ImportError:
    from inspect_assets import DEFAULT_DATA, dbf_records, source_archives, write_json

LAYERS = {
    "Customer_Clip": ("Data1.zip", "customer"),
    "Transformer_Clip": ("Data2.zip", "transformer"),
    "Fuse_Bank_Clip": ("Data1.zip", "fuse"),
    "Recloser_Bank_Clip": ("Data2.zip", "recloser"),
    "Switch_Clip": ("Data2.zip", "switch"),
}
CUSTOMER_FIELDS = {"premise_nu", "aep_xfmr_l", "circuit_id"}
ASSET_FIELDS = {"id", "location_n", "circuit_id", "aep_statio", "upstream_l",
                "eo_source_", "device_typ"}


def point_records(stream, crs_wkt):
    """Only supplied WGS84 point layers are supported; unknown CRS fails closed."""
    if not crs_wkt.startswith('GEOGCS["GCS_WGS_1984"'):
        raise ValueError("Unsupported CRS: geographic WGS84 required; no implicit projection")
    header = stream.read(100)
    if len(header) != 100 or struct.unpack_from(">i", header)[0] != 9994:
        raise ValueError("Invalid shapefile header")
    if struct.unpack_from("<i", header, 32)[0] not in (1, 11, 21):
        raise ValueError("Only point/pointZ/pointM layers can be imported")
    index = 0
    while True:
        record_header = stream.read(8)
        if not record_header:
            break
        if len(record_header) != 8:
            raise ValueError("Truncated shape record header")
        number, words = struct.unpack(">ii", record_header)
        if number != index + 1 or words < 2:
            raise ValueError("Invalid shape record numbering/length")
        record = stream.read(words * 2)
        if len(record) != words * 2:
            raise ValueError("Truncated shape record")
        kind = struct.unpack_from("<i", record)[0]
        if kind == 0:
            point = None
        elif kind in (1, 11, 21) and len(record) >= 20:
            x, y = struct.unpack_from("<dd", record, 4)
            if not (math.isfinite(x) and math.isfinite(y) and -180 <= x <= 180 and -90 <= y <= 90):
                raise ValueError("Invalid WGS84 point")
            point = [x, y]
        else:
            raise ValueError("Unsupported point record")
        yield index, point
        index += 1


def load_gis(data_dir=DEFAULT_DATA):
    archives = {p.name: p for p in source_archives(data_dir)}
    customers, assets = defaultdict(list), []
    layer_counts = {}
    for layer, (filename, kind) in LAYERS.items():
        with zipfile.ZipFile(archives[filename]) as archive:
            with archive.open(layer + ".dbf") as stream:
                rows = list(dbf_records(stream, columns=CUSTOMER_FIELDS if kind == "customer" else ASSET_FIELDS))
            layer_counts[layer] = len(rows)
            if kind == "customer":
                # No location, addresses, service attributes or life-support data enter this import.
                for _, row in rows:
                    if row.get("premise_nu"):
                        customers[row["premise_nu"]].append({"transformer_location": row["aep_xfmr_l"],
                                                            "circuit_id": row["circuit_id"]})
                continue
            crs = archive.read(layer + ".prj").decode("utf8")
            with archive.open(layer + ".shp") as stream:
                points = dict(point_records(stream, crs))
            for index, row in rows:
                if index not in points:
                    raise ValueError("DBF/shape record alignment mismatch")
                assets.append({"layer": kind, "object_id": row["id"],
                               "location": row["location_n"], "kind": row["device_typ"],
                               "circuit_id": row["circuit_id"], "station_label": row["aep_statio"],
                               "source_table": row["eo_source_"],
                               "upstream_location": row["upstream_l"], "point": points[index]})
    by_location = defaultdict(list)
    for asset in assets:
        if asset["location"]:
            by_location[asset["location"]].append(asset)
    transformer_locations = Counter(a["location"] for a in assets if a["layer"] == "transformer" and a["location"])
    return {"customers": dict(customers), "assets_by_location": dict(by_location),
            "audit": {"layer_counts": layer_counts,
                      "customer_rows": sum(len(v) for v in customers.values()),
                      "distinct_premises": len(customers),
                      "duplicate_premise_keys": sum(len(v) > 1 for v in customers.values()),
                      "transformer_location_keys": len(transformer_locations),
                      "duplicate_transformer_locations": sum(v > 1 for v in transformer_locations.values()),
                      "customer_transformer_key_exists_rows": sum(
                          row["transformer_location"] in transformer_locations
                          for rows in customers.values() for row in rows),
                      "distinct_referenced_transformer_keys_matched": len(
                          {row["transformer_location"] for rows in customers.values() for row in rows}
                          & transformer_locations.keys()),
                      "geometry_crs": "EPSG:4326", "geometry_repairs": 0,
                      "unsupported_connectivity": ["pole", "primary_line", "secondary_line", "facility"],
                      "privacy": "Customer coordinates and sensitive fields excluded from import"}}


def match_equipment(item, gis, circuit_id):
    """Location + type + circuit, optionally resolved by exact source ID; never nearest-point."""
    candidates = [x for x in gis["assets_by_location"].get(item["location"], [])
                  if x["kind"] == item["kind"] and x["circuit_id"] == circuit_id]
    method = "unique_location_type_circuit"
    if len(candidates) > 1:
        candidates = [x for x in candidates if x["object_id"] == item["object_id"]
                      and x["source_table"] == item["table"]]
        method = "exact_source_id_location_type_circuit"
    if len(candidates) != 1:
        return None, "ambiguous_or_missing_gis_match"
    return candidates[0], method


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default=DEFAULT_DATA)
    parser.add_argument("--output", help="Private normalized GIS input; do not serve publicly")
    args = parser.parse_args()
    gis = load_gis(args.data_dir)
    if args.output:
        write_json(args.output, gis, private=True)
    print(json.dumps(gis["audit"]))
