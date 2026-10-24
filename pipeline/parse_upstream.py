"""Parse supplied premise -> transformer -> protection -> breaker paths offline."""
from __future__ import annotations

import argparse
import io
import json
import zipfile
from collections import Counter
from pathlib import Path

try:
    from .inspect_assets import DEFAULT_DATA, source_archives, write_json
except ImportError:  # Direct script invocation.
    from inspect_assets import DEFAULT_DATA, source_archives, write_json


def parse_line(line, line_number=1):
    cells = line.rstrip("\r\n").split("\t")
    if len(cells) < 3 or not cells[0] or cells[0] != cells[0].strip():
        raise ValueError(f"Line {line_number}: missing premise or equipment path")
    equipment = []
    for cell in cells[1:]:
        fields = cell.split("*")
        if len(fields) != 4 or any(not x or x != x.strip() for x in fields):
            raise ValueError(f"Line {line_number}: invalid equipment entry")
        table, object_id, kind, location = fields
        equipment.append({"asset_id": f"{table}:{object_id}", "table": table,
                          "object_id": object_id, "kind": kind, "location": location})
    ids = [x["asset_id"] for x in equipment]
    if len(ids) != len(set(ids)):
        raise ValueError(f"Line {line_number}: repeated equipment/cyclic path")
    if equipment[0]["kind"] != "Distribution" or equipment[0]["table"] != "eo_power_xfrmr_inst":
        raise ValueError(f"Line {line_number}: unsupported first equipment")
    if equipment[-1]["kind"] != "Circuit Breaker" or equipment[-1]["table"] != "eo_circuit":
        raise ValueError(f"Line {line_number}: path has no supplied breaker endpoint")
    return cells[0], equipment


def parse_upstream(source):
    """Return private string-keyed paths, equipment and audit; reject corruption, never guess."""
    paths, equipment, lengths = {}, {}, Counter()
    for number, line in enumerate(source, 1):
        premise, entries = parse_line(line, number)
        if premise in paths:
            raise ValueError(f"Line {number}: duplicate premise path")
        for item in entries:
            old = equipment.get(item["asset_id"])
            if old is not None and old != item:
                raise ValueError(f"Line {number}: conflicting equipment metadata")
            equipment[item["asset_id"]] = item
        paths[premise] = [x["asset_id"] for x in entries]
        lengths[len(entries)] += 1
    return {"paths": paths, "equipment": equipment,
            "audit": {"premises": len(paths), "equipment": len(equipment),
                      "path_lengths": dict(sorted(lengths.items())),
                      "provenance": "aep_challenge", "direction": "downstream_to_upstream",
                      "basis": "provided_ordered_text_not_measured_conductors"}}


def load_upstream(path):
    path = Path(path)
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            names = [n for n in archive.namelist() if n.endswith(".txt")]
            if len(names) != 1:
                raise ValueError("Expected exactly one upstream text file")
            with archive.open(names[0]) as stream:
                return parse_upstream(io.TextIOWrapper(stream, encoding="utf8", errors="strict"))
    with path.open(encoding="utf8") as stream:
        return parse_upstream(stream)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?", default=source_archives(DEFAULT_DATA)[2])
    parser.add_argument("--output", type=Path, help="Private graph input; never publish raw IDs")
    args = parser.parse_args()
    parsed = load_upstream(args.source)
    if args.output:
        write_json(args.output, parsed, private=True)
    print(json.dumps(parsed["audit"]))
