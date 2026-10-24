# Human 1 continuation on the current integrated app

Based on main commit `6405848`, including `b5d4834` and the later map/docs updates.
This branch preserves the current API, scenario
engine and frontend. It adds runtime data bootstrap, integrity checks, public
source contexts, topology helpers and ordinal risk for the current graph format.
The older `codex/human1-data` branch targets a different scaffold; do not merge
its old topology implementation over this one.

## Required startup step

From the repository root with Python 3.11 or later:

```powershell
python -m pipeline.build_graph
python -m pytest -q
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Run the data command before starting the current API. Its existing topology loader
checks for `data/processed/private/topology.json`; that private runtime file is
deliberately absent from Git. Before bootstrap the lookup route returns 503.
After bootstrap `/api/health` reports `topology_loaded: true` and
`/api/topology/lookup?premise_id=PREM-000001` returns 200 with four supplied
equipment tokens. No API edit is required for this explicit startup workflow.

The data pipeline and data services use only Python's standard library. The full
API tests also require FastAPI, Pydantic, HTTPX and pytest. This continuation was
verified with FastAPI 0.162.0, Pydantic 2.14.1, Uvicorn 0.54.0, HTTPX 0.28.1 and
pytest 9.1.1. API/frontend dependency manifests remain the integrator's scope.

Python entry point for automatic startup integration:

```python
from pipeline.build_graph import ensure_runtime_data

ready = ensure_runtime_data()
# ready: topology_path, reused, summary, public_slice_status
```

This is an explicit offline preparation operation, not work to repeat on every
GET request. An unchanged-source private graph is reused only after graph/token
validation and source archive SHA-256 checks. Missing, modified or partially
published public outputs are regenerated. `source_manifest.json` is written last
and binds the public file hashes to the source archive hashes. Corrupt persisted
private tokens fail closed. Replacing an input archive rebuilds the graph.

## Verified source coverage

The existing main importer continues to report:

| Check | Count |
|---|---:|
| Customer records | 117,642 |
| Transformer records | 26,959 |
| Fuse bank / switch / recloser bank records | 7,616 / 900 / 331 |
| Supplied text premise paths | 117,599 |
| Distinct supplied equipment nodes | 32,600 |
| Validated customer/text paths | 117,549 |
| Customer premises without a valid path | 93 |
| Text keys absent from customer records | 4 |
| Customer rows without text | 47 |
| Nodes with multiple supplied upstream parents | 60 |
| Equipment with accepted GIS geometry | 32,278 |
| Historical damage records | 1,659 |

The 97 rejected keys include the 93 customer premises and 4 text-only keys. The
complete report is `data/processed/graph_summary.json`; the full layer schemas,
missingness, duplicate keys, CRS, archive hashes and workbook sheet names are in
`inventory.json`. Labor units and interpretation remain with Human 2.

The current importer joins location, equipment type and circuit, then uses exact
source table/ID to resolve multiple candidates. It retains the match method.
This permits labeled semantic joins to differently keyed recloser-bank exports;
it is not nearest-point matching. Initial transformer and final breaker classes
are validated, customer transformer/circuit conflicts abstain, and numeric-looking
identifiers preserve leading zeroes. Per-premise supplied sequences are used
directly; multiple parents do not establish live switching or power-flow states.

The new constructor guard rejects a graph where a path's public premise token
disagrees with its token catalog. Otherwise mixed persisted exports could return
the wrong home token and duplicate tokens in an impact list.

## Private and public outputs

`data/processed/private/topology.json` contains raw premise/equipment identifiers
and precise equipment coordinates. Keep it ignored and local. Customer locations,
addresses, medical flags and free-text customer attributes do not enter the GIS
import. POSIX private file mode is 0600; Windows chmod has different semantics and
does not establish an owner-only ACL. The platform-specific test now reflects that.

| Public artifact | Purpose |
|---|---|
| `inventory.json` | Source schema, counts, missingness, CRS and hashes |
| `graph_summary.json` | Join coverage and limitations |
| `network.geojson` | Bounded equipment map and schematic relationships |
| `source_context.json` | First 50 validated public catalog entries and one bounded source scenario context |
| `risk_context.json` | Dated spatial-report aggregates for 54 matched transformers covering the published catalog/context |
| `source_manifest.json` | Source hashes and public-file integrity hashes |

Map equipment coordinates are generalized to 0.01 degrees; customer coordinates
are omitted. Links are labeled schematic supplied-path relations, not conductor
geometry. Source reports used for risk stay private during calculation; public
risk context includes only transformer tokens, radius and date/count aggregates.
No raw source IDs or precise coordinates are copied into these added outputs.

## Topology service additions

Existing calls remain compatible:

```python
from engine.topology import Topology

topology = Topology.load("data/processed/private/topology.json")
topology.get_supply_path("PREM-000001")       # alias of premise_to_substation
topology.get_dependents("ASSET-011856")       # coverage-aware affected_premises shape
topology.premise_catalog(limit=50)
topology.compare_paths("PREM-000001", "PREM-000002")
topology.scenario_context("PREM-000001", max_premises=1000)
```

`scenario_context` returns `status`, `source`, `context` and limitations. A KNOWN
context has `current_asset_id`, `upstream_asset_id`, `selected_premise_token`,
`local_premise_tokens` and `feeder_premise_tokens`. The latter legacy field name
means the selected upstream device's complete known dependency group, not an
assertion of full-feeder or full-territory coverage. The nearest supplied
protective device must have a strict superset of the transformer group, and both
groups must fit the bound. Oversized or unavailable groups return UNKNOWN with
`context: null`; no sampling, invented membership or silent truncation occurs.

The source example for `PREM-000001` has **5 local and 33 upstream** dependents.
Of the first 50 catalog entries, 45 have a context within the 1,000-premise bound;
the other five still have known supply paths but no eligible bounded context.

For staged restoration:

```python
context = topology.scenario_context("PREM-000001")["context"]
faults = [
    {"fault_token": "LOCAL", "asset_token": context["current_asset_id"], "state": "CLEARED"},
    {"fault_token": "UPSTREAM", "asset_token": context["upstream_asset_id"], "state": "ACTIVE"},
]
topology.remaining_blockers(context["selected_premise_token"], faults)
# blocking_fault_tokens == ["UPSTREAM"], clear_of_modeled_faults == False
```

Unknown premise/fault coverage yields UNKNOWN and `clear_of_modeled_faults: null`.
Even a clear result requires an explicit re-energization event; the helper never
sets a restored status. Duplicate conflicting fault tokens are rejected. Impact
continues to use unions of the validated supplied dependencies.

## Risk service for the current schema

```python
from engine.risk import RiskService

risk = RiskService.load()
full = risk.get_risk("PREM-000001", {"intensity": 0.5, "as_of": "2026-10-24"})
customer = risk.preview_risk("PREM-000001", "moderate", as_of="2026-10-24")
```

The customer result validates as the current `api.schemas.CustomerRisk` and
contains no equipment IDs, other-household tokens or private coordinates.
`as_of` is an explicit calendar cutoff; same-day and future reports are excluded.
Named storm intensities are calm 0.1, moderate 0.5 and severe 0.9; unknown intensity
gives UNKNOWN. Invalid/non-finite intensity inputs are rejected.

The assumed ordinal index is `80 * intensity + min(20, 4 * earlier_report_count)`.
Bands are LOW below 30, MODERATE below 65 and HIGH otherwise. The report count is
within 2,000 meters of the **matched transformer**, using spherical great-circle
distance; it does not use a household location. The weights/bands are transparent
demo assumptions, not trained or calibrated probabilities. Spatial proximity is
not causal failure evidence and counts have no exposure denominator.

The source example returns MODERATE for the moderate scenario, with 40 earlier
reports and `confidence_kind: limited_source_coverage`. Missing historical
coverage is distinguished from an observed zero count; it produces
`insufficient_history`. An unmapped premise gets UNKNOWN with no numeric score.

## Remaining owner handoffs

Human 2/4 must allow the graph's `PREM-...` public tokens in
`engine.scenarios._identifier(..., premise=True)`; its current `P-...` expression
rejects real source contexts. Do not rename source tokens to fixture aliases.

Human 4 must pass a chosen `scenario_context(...)["context"]` into
`generate_scenario` and project the source risk result into `customer_risk` when
enabling source mode. The current `/api/scenario/select` passes `{}`, so its
8/32-household P-DEMO groups remain declared synthetic groups. Topology lookup
does not itself select or mutate the current incident. Automatic bootstrap, if
desired, should call `ensure_runtime_data` once before the API's file-existence
guard. No API, canonical schema, scenario-engine or frontend edits are included
in this data branch.

## Verification

After bootstrap: **84 tests pass**, plus 34 unittest subtests. This includes the
current API tests, full-source graph checks, runtime rebuild/cache/manifest tests,
persisted-token corruption, public-output privacy, bounded context abstention,
both local/upstream blocker cases, source date parsing, storm sensitivity and
same-day/future leakage checks, plus identical public exports from identical
archives. Two subagents independently implemented and
checked the topology helpers and runtime tests. The API smoke check reports
`topology_loaded: true` and a known four-equipment source path.
