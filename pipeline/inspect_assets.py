"""Reproducible source inventory containing field names/counts, never raw values."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

from pipeline.import_gis import LAYERS, fingerprint, inspect_layer


def inspect_sources(raw: Path) -> dict:
    workbook = raw.parent / "Install_Labor_HackOHIO.xlsx"
    sheets = []
    if workbook.exists():
        with ZipFile(workbook) as archive:
            xml = ElementTree.fromstring(archive.read("xl/workbook.xml"))
            sheets = [element.attrib["name"] for element in xml.iter() if element.tag.endswith("}sheet")]
    return {
        "source": "aep_challenge", "schema_version": "data_inventory_v1",
        "archive_sha256": {name: fingerprint(raw / name) for name in sorted({v[0] for v in LAYERS.values()} | {"matched_upstream.zip"})},
        "layers": [inspect_layer(raw, name) for name in LAYERS],
        "workbook_metadata_only": {"sheets": sheets, "labor_parser_owner": "Human 2",
                                   "sha256": fingerprint(workbook) if workbook.exists() else None},
        "limitations": ["Record counts are not necessarily counts of unique physical assets.",
                        "No live sensor observations or verified switching state are present.",
                        "Private customer flags and source attribute values are not exported."],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=Path("aep_challenge_hack26/data/raw"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/source_inventory.json"))
    args = parser.parse_args()
    report = inspect_sources(args.raw)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"layers": len(report["layers"]), "output": str(args.output)}))


if __name__ == "__main__":
    main()
