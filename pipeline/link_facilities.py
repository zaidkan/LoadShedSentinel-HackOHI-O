"""Enrich the public sample with anonymous, approximate critical facility links.

Run: python -m pipeline.link_facilities [--data-dir RAW_DIR] [--bundle BUNDLE]
No facility coordinates, names, addresses or source identifiers are saved.
"""
import argparse
import json
from pathlib import Path

from engine.aep_impact import AEPImpact, BUNDLE_PATH
from engine.topology import link_critical_facilities
from pipeline.import_gis import load_critical_facilities
from pipeline.inspect_assets import DEFAULT_DATA


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--bundle", type=Path, default=BUNDLE_PATH)
    args = parser.parse_args()
    bundle = json.loads(args.bundle.read_text())
    model = AEPImpact(bundle)
    bundle["critical_facility_associations"] = link_critical_facilities(
        model.assets, list(model.paths.values()), load_critical_facilities(args.data_dir),
        point_key="coordinates", path_key="asset_tokens")
    checked = AEPImpact(bundle)
    # Keep one association catalog; node tags are recomputed on every load.
    for node in bundle["nodes"]:
        node.pop("critical_facilities", None)
        node.pop("critical_facility_count", None)
    args.bundle.write_text(json.dumps(bundle, indent=2, sort_keys=True, allow_nan=False) + "\n")
    print(json.dumps(checked.critical_facility_summary))


if __name__ == "__main__":
    main()
