# Human 1 data inventory and integration handoff

Implemented against team repository commit `6470fce` on October 24, 2026. The data
module is independent of API routes, canonical incident schemas, the labor parser,
and the frontend. Human 4 still owns integration of these pure services.

## Run and verify

From the repository root, with Python 3.11 or later:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r pipeline/requirements-data.txt
.\.venv\Scripts\python.exe -m pipeline.build_graph
.\.venv\Scripts\python.exe -m pytest -q tests/test_data_pipeline.py tests/test_graph.py tests/test_risk.py
```

The checked-in processed slice works offline without installing the ingestion
dependencies: `engine/topology.py` and `engine/risk.py` use only the Python standard
library. Rebuilding needs the three existing archives in
`aep_challenge_hack26/data/raw/`; extraction is unnecessary. `pyshp` reads ZIP
members in memory and `pyproj` verifies/reprojects each layer's `.prj`. This avoids
adding the full GeoPandas stack for this small data handoff. No source files are
modified, geometry is not silently repaired, and missing CRS is an error.

For inventory alone, run `python -m pipeline.inspect_assets`. Complete field
names, missing-value counts, distinct-key counts, duplicate-key counts, CRS and
SHA-256 hashes are in `data/processed/source_inventory.json`. That report exports
counts and names only, including for private source fields.

## Verified source inventory

| Layer | Records | Source geometry |
|---|---:|---|
| Customers | 117,642 | POINTZ |
| Transformers | 26,959 | POINTZ |
| Fuse banks | 7,616 | POINTZ |
| Switches | 900 | POINTZ |
| Recloser banks | 331 | POINTZ |
| Poles | 107,013 | POINTZ |
| Primary lines | 62,788 | POLYLINE |
| Secondary lines | 127,403 | POLYLINE |
| ARCOS damage | 1,659 | POINTZ |
| Hospitals / fire stations / ambulance | 5 / 37 / 10 | POINTZ |
| Upstream text | 117,599 unique premise paths | Ordered relationships |

The full inventory records each layer's own CRS. Utility/customer/damage geometry
uses WGS84; facility layers have their own projected CRS. All exported coordinates
use EPSG:4326, longitude first. Z coordinates are omitted.

The workbook metadata reader verifies these sheet names only: `CNC`,
`Labor time material related`, `Labor only work`, `Indirect Labor Multiplier`,
`CU Group descriptions`. Human 2 owns cell interpretation, labor units and the
4.5 multiplier; this module does not calculate labor.

## Join results and rejection rules

Identifiers remain strings, including leading zeroes. An upstream token is
`source_class*source_id*equipment_kind*location`. The whole token is not the GIS
`eo_source_` field. Its class and ID select candidate records; its location must
also agree. Customer transformer matching requires a unique location/circuit
combination. Duplicate locations without unique circuit support are ambiguous.

| Check | Result |
|---|---:|
| Customer transformer location exists in transformer layer | 117,615 / 117,642 |
| Unique customer transformer match after circuit check | 117,615 |
| Customer rows without upstream text | 47 |
| Upstream keys without a customer row | 4 |
| Customer paths passing customer + transformer + text cross-check | 117,554 |
| Rejected: no text path | 47 |
| Rejected: no customer transformer match | 27 |
| Rejected: text location mismatch | 12 |
| Rejected: customer/text transformer conflict | 2 |
| Distribution tokens matching GIS class + ID + location | 25,298 / 25,302 |
| Fuse tokens matching GIS class + ID + location | 6,656 / 6,757 |

These rejection categories are disjoint. The graph does not attach rejected
premises to a nearby pole or transformer. The 32,600 distinct equipment tokens
include 31,954 valid GIS joins, 644 unmapped tokens and 2 location mismatches.
Reclosers, circuit breakers, step transformers and the sectionalizer remain
text-only nodes where there is no validated GIS match. In particular, no
recloser is joined to a differently keyed recloser-bank export by proximity.

`graph_summary.json` contains the complete counts and per-kind join breakdown.
The text provides ordered equipment dependence, not a complete physical network:
conductors and substation links are omitted. A path can have
`text_path_complete: true` and `physical_path_complete: false`.

## Delivered slice and map

The exporter selects two eight-premise fuse branches under a common terminal
breaker, with multiple transformers. It exports **16 premises, 12 equipment nodes
and 27 relational links**. The map contains 85 features: 16 generalized premise
points, 9 equipment points with validated geometry, and up to 60 line-context
features. Three equipment nodes have no GIS position and no position is invented.

Every map coordinate is snapped to a **0.02-degree grid**, roughly a kilometer or
more at this latitude. Positions can coincide. Line features are independently
generalized source GIS context, marked `GIS_CONTEXT_ONLY`; they do not prove a
household's conductor path. Relational edges are kept separately in the bundle,
directed upstream to downstream. This map is unsuitable for navigation.

Public IDs use keyed HMAC tokens, consistently across all exports. Source IDs,
precise premise positions, addresses, medical/critical-customer flags and free
text are absent. The random token key and selected-record lineage remain in
`.data-private/`; the builder writes a `.gitignore` inside that directory. Do not
share the key or lineage. Keeping the same key and archives makes rebuilds stable;
a new key deliberately generates different tokens. Consumers should load IDs
from the bundle/example rather than hard-code them.

## Files for teammates

| Artifact | Purpose |
|---|---|
| `network_bundle.json` | Nodes, ordered supply paths, relational edges, scoped metadata and risk context |
| `network.geojson` | Generalized, allowlisted map features |
| `asset_nodes.json` | Equipment tokens, kinds, GIS-match methods and source-dependent counts |
| `graph_summary.json` | Import/join coverage and limitations |
| `source_inventory.json` | Full schema inventory, counts, missingness and hashes |
| `damage_features.json` | All 1,659 sanitized historical records; date-only, no geometry or unverified asset assignment |
| `data_handoff_example.json` | One matching path/risk/multi-fault demonstration for integration |

Historical damage features use JSON rather than the blueprint's proposed Parquet
file so the runtime can load the handoff without pandas/Arrow. No consumer contract
exists in the source commit. The integrator can adapt these data-owned outputs to
its authoritative Pydantic schemas without changing the graph's meaning.

## Pure service signatures

```python
import json
from pathlib import Path
from engine.topology import Topology
from engine.risk import RiskService

bundle = json.loads(Path("data/processed/network_bundle.json").read_text())
example = json.loads(Path("data/processed/data_handoff_example.json").read_text())
topology = Topology(bundle)
premise = example["selected_premise_token"]

topology.get_supply_path(premise)
topology.get_dependents(example["upstream_asset_token"])
topology.compare_paths(premise, bundle["supply_paths"][-1]["premise_token"])
topology.remaining_blockers(premise, example["active_faults"])
topology.affected_premises(example["active_faults"])
RiskService(bundle).get_risk(premise, {"intensity": 0.7, "as_of": "2026-10-24"})
```

Equivalent module functions take `network` first. Instantiate a service once for
repeated requests. Unknown premises return `status: UNKNOWN`; unknown assets have
`known_count: null`. No numeric zero is used to assert an unknown asset has no
dependents. Every enumerated dependent list/count is scoped to `selected_subnet`.
Node `full_source_known_count` counts dependence among the 117,554 validated source
paths, not confirmed outages or the entire utility territory.

Fault dictionaries have `fault_token`, `asset_token`, and state `ACTIVE`,
`REPAIRING`, `CLEARED` or `UNKNOWN`. Impact uses the union of dependent premises.
Unknown fault coverage is returned separately. `remaining_blockers` never emits a
restored status: even after all modeled blockers clear, an explicit simulated
re-energization event remains the orchestrator's responsibility. The worked
example affects eight distinct premises; clearing its local transformer leaves
the selected premise blocked by the upstream fuse.

## Risk interpretation and limitations

Risk is an ordinal scenario index with LOW / MODERATE / HIGH / UNKNOWN bands.
The index is `80 * intensity + min(20, 4 * historical_report_count)` with assumed
thresholds 30 and 65. Storm intensity is a scenario value in [0, 1]. Nearby
historical reports are within a geodesic 2,000 meters of the source premise and
strictly before `as_of`; same-day reports are excluded because timestamps have
day precision. Only aggregate dates/counts enter the public bundle. No same-case
confirmed damage is accepted as a risk feature.

The factor weights and band thresholds are explicit demonstration assumptions,
not trained or calibrated statistics. Counts have no exposure denominator and do
not measure outage probabilities. Missing history reduces the confidence tag;
an unknown premise gets UNKNOWN with no numeric score. Missing measured weather,
live switching state, physical conductor links and calibration are reported.

ARCOS `Circuit` labels do not match customer `circuit_id`; no inferred renaming
is applied. `NEAR_FID` target-layer semantics remain unverified. Accordingly,
damage records have `damaged_asset_token: null` and `match_method: UNVERIFIED`.
No damage-to-pole spatial assignment, causal failure diagnosis, live energized
state, historical restoration-hour model or alternate-feed feasibility is claimed.

## Validation and remaining integration

Tests exercise wrong/missing CRS, leading zeroes, duplicate and conflicting keys,
unknown premise/asset behavior, multi-fault union and remaining blockers, branch
comparison, privacy allowlists, generalized coordinates, invalid storm inputs,
storm sensitivity and temporal leakage. Source-backed assertions verify the
checked-in slice against the measured inventory and path rules.

Validation on October 24: **24 tests passed**. A second full rebuild using the
same source archives and private token key produced byte-identical content for
all seven processed exports. The measured full import took about 24 seconds on
this machine; this is not an application latency benchmark.

Human 4 still needs to freeze schemas and wire network/risk/scenario routes.
Human 3 can consume the GeoJSON plus separate relational edges. Human 2 can use
the blocker/dependent helpers and sanitized damage classes; repair scheduling and
labor interpretation remain with Human 2. There is no running application or
end-to-end UI claim in this handoff. Video recording follows the integrated build.
