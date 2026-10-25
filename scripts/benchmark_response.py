"""Run: python scripts/benchmark_response.py [--output path.json]."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.response_comparison import benchmark_response


def main():
    parser = argparse.ArgumentParser(description="Generate an explicitly simulated response-time benchmark, not measured savings.")
    parser.add_argument("--output", type=Path, default=ROOT / "data/processed/response_benchmark.json")
    args = parser.parse_args()
    output = args.output.resolve()
    # The benchmark has a dedicated output name and never overwrites source
    # archives, arbitrary JSON inputs or any other project's fixture.
    if output.name != "response_benchmark.json":
        parser.error("Output filename must be response_benchmark.json to protect unrelated inputs")
    if any(part.lower() in ("raw", ".data-private", "fixtures") for part in output.parts):
        parser.error("Refusing to write benchmark into raw/private/fixture input directories")
    result = benchmark_response()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print("Counterfactual simulation written to " + str(output))
    for case in result["cases"]:
        print(f"{case['id']}: {case['result']['savings_hours']['expected']:.3f} assumed expected hours saved")
    print("No empirical AEP hourly benefit or prevented outages established.")


if __name__ == "__main__":
    main()
