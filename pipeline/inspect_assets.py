"""Offline ZIP/DBF inventory. IDs and dates are deliberately never coerced to numbers."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

DEFAULT_DATA = Path(__file__).resolve().parents[1] / "aep_challenge_hack26/data/raw"


def source_archives(data_dir):
    root = Path(data_dir)
    if not (root / "Data1.zip").exists() and (root / "raw").is_dir():
        root = root / "raw"
    return [root / name for name in ("Data1.zip", "Data2.zip", "matched_upstream.zip")]


def dbf_header(stream):
    header = stream.read(32)
    if len(header) != 32:
        raise ValueError("Truncated DBF header")
    count, header_size, record_size = struct.unpack_from("<IHH", header, 4)
    if header_size < 33 or (header_size - 33) % 32:
        raise ValueError("Unsupported DBF field layout")
    descriptors = stream.read(header_size - 32)
    if len(descriptors) != header_size - 32 or descriptors[-1:] != b"\r":
        raise ValueError("Truncated DBF descriptors")
    fields = []
    for offset in range(0, len(descriptors) - 1, 32):
        item = descriptors[offset:offset + 32]
        fields.append({"name": item[:11].split(b"\0")[0].decode("ascii"),
                       "type": chr(item[11]), "width": item[16], "decimals": item[17]})
    if sum(f["width"] for f in fields) + 1 != record_size:
        raise ValueError("DBF record width disagrees with fields")
    return count, record_size, fields


def dbf_records(stream, header=None, columns=None):
    count, record_size, fields = header or dbf_header(stream)
    for index in range(count):
        record = stream.read(record_size)
        if len(record) != record_size:
            raise ValueError("Truncated DBF record")
        if record[:1] not in (b" ", b"*"):
            raise ValueError("Invalid DBF deletion marker")
        if record[:1] == b"*":
            continue
        offset, values = 1, {}
        for field in fields:
            end = offset + field["width"]
            if columns is None or field["name"] in columns:
                # Exact digit strings, including leading zeroes, survive this boundary.
                values[field["name"]] = record[offset:end].decode("latin1").strip()
            offset = end
        yield index, values


def inspect_assets(data_dir=DEFAULT_DATA):
    result = {"provenance": "aep_challenge", "archives": [], "layers": []}
    for path in source_archives(data_dir):
        with path.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        result["archives"].append({"name": path.name, "sha256": digest,
                                   "bytes": path.stat().st_size})
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if not name.endswith(".dbf"):
                    continue
                with archive.open(name) as stream:
                    header = dbf_header(stream)
                    nulls = Counter()
                    keys = {f["name"]: Counter() for f in header[2]
                            if f["name"] in {"id", "premise_nu", "location_n", "aep_xfmr_l"}}
                    active = 0
                    for _, row in dbf_records(stream, header):
                        active += 1
                        for key, value in row.items():
                            if not value:
                                nulls[key] += 1
                            elif key in keys:
                                keys[key][value] += 1
                shape_name = name[:-4] + ".shp"
                with archive.open(shape_name) as stream:
                    shape_header = stream.read(100)
                    if len(shape_header) != 100 or struct.unpack_from(">i", shape_header)[0] != 9994:
                        raise ValueError("Invalid shapefile header")
                    shape_type = struct.unpack_from("<i", shape_header, 32)[0]
                result["layers"].append({
                    "archive": path.name, "layer": name[:-4], "records": header[0],
                    "active_records": active, "shape_type": shape_type,
                    "crs_wkt": archive.read(name[:-4] + ".prj").decode("utf8"),
                    "columns": [{**f, "null_count": nulls[f["name"]],
                                 "null_rate": nulls[f["name"]] / active if active else None}
                                for f in header[2]],
                    "keys": {k: {"distinct_nonempty": len(v),
                                  "duplicate_values": sum(n > 1 for n in v.values()),
                                  "duplicate_rows": sum(n - 1 for n in v.values())}
                             for k, v in keys.items()}})
    try:
        from .parse_upstream import load_upstream
    except ImportError:
        from parse_upstream import load_upstream
    result["upstream"] = load_upstream(source_archives(data_dir)[2])["audit"]
    result["upstream"]["columns"] = ["premise_id", "ordered table*object_id*kind*location entries"]
    workbook = source_archives(data_dir)[0].parent.parent / "Install_Labor_HackOHIO.xlsx"
    if workbook.exists():
        with zipfile.ZipFile(workbook) as archive:
            tree = ET.fromstring(archive.read("xl/workbook.xml"))
            result["workbook"] = {"name": workbook.name,
                                  "sheets": [x.attrib["name"] for x in tree.iter() if x.tag.endswith("}sheet")],
                                  "unit_validation": "Delegated to labor importer; no units inferred here"}
    result["limitations"] = ["DBF dates retain their source precision; 19000101 may be a sentinel.",
                              "Inventory metadata contains no customer field values.",
                              "Counts represent extract records, not unique physical sites."]
    return result


def write_json(path, value, private=False):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600 if private else 0o644)
    with os.fdopen(descriptor, "w") as stream:
        if private:
            os.fchmod(stream.fileno(), 0o600)
        json.dump(value, stream, ensure_ascii=True, allow_nan=False)
        stream.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    inventory = inspect_assets(args.data_dir)
    if args.output:
        write_json(args.output, inventory)
    print(json.dumps({"layers": [{"layer": x["layer"], "records": x["records"]}
                                for x in inventory["layers"]]}))
