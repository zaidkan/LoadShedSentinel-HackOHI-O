# Source ledger — Human 1 data section

This section covers data/graph/risk only. Engine/labor and integration owners
should add their own evidence separately.

| Source or result | Evidence | Meaning and limits |
|---|---|---|
| Organizer source archives | `aep_challenge_hack26/data/raw/{Data1,Data2,matched_upstream}.zip`; SHA-256 values in `data/processed/source_inventory.json` | Supplied challenge records; no live utility feed |
| Layer schemas and coverage | `pipeline/inspect_assets.py`; `source_inventory.json` | Actual counts, CRS, field names, null and duplicate-key counts; no personal values exported |
| Premise/transformer join | `pipeline/import_gis.py:AssetIndex`; `graph_summary.json` | Customer location/circuit plus text class/ID/location cross-check; 117,554 accepted paths; explicit rejection counts |
| Text sequence | `pipeline/parse_upstream.py`; `network_bundle.json` | Provided order of transformer/protective/circuit equipment; partial physical path, no fabricated conductors or substation |
| Selected source trace | `.data-private/lineage.json` locally only | Public token to original selected record and upstream line; private, ignored and never a browser asset |
| Public map | `network.geojson` and its coordinate metadata | Source geometry generalized on 0.02-degree WGS84 grid; line context has no asserted household connectivity |
| Historical damage | `damage_features.json`; private computation in `pipeline/build_graph.py` | All 1,659 records reduced to allowlisted categories/dates/flags; no exact geometry, free text, raw circuit labels or asserted damaged asset match |
| Spatial history factor | `network_bundle.json:risk_context` | Date/count aggregates within 2 km; no inferred asset failure or electrical connection |
| Ordinal risk | `engine/risk.py`; `data_handoff_example.json:risk` | Derived index combining supplied history and scenario storm; explicit assumed weights; not an empirical probability |
| Fault footprint/blockers | `engine/topology.py`; `data_handoff_example.json` | Simulated faults over supplied dependencies; union counts in selected scope, not confirmed outages |
| Scoped network adapter | `engine/topology.py:NetworkService`; `tests/test_data_adapters.py` | Real source geometry/paths through Human 4's existing network hook; fixture circuit aliases rejected, circuit map context filtered |
| Canonical risk preview | `engine/risk.py:RiskService.preview_risk`; `tests/test_data_adapters.py` | Customer-safe strings in the existing Risk shape; confidence unavailable because there is no calibrated model; separate from fixture snapshots |
| Comparison and overlap cases | `data_demo_cases.json` | Actual shared/differing text paths, with explicitly simulated 3-premise local and 8-premise upstream/union footprints |
| Workbook metadata | `source_inventory.json:workbook_metadata_only` | Sheet names/hash only; Human 2 owns units and labor interpretation |

The source repository's official data description is
[AEP challenge data inventory](https://github.com/hackohio/aep_challenge_hack26/blob/main/data/README.md).
Claims above are supported by the local supplied archives and reproducible code;
they do not rely on the older planning audit alone.

The import found a concrete mismatch: using a whole composite upstream token as
the GIS `eo_source_` key produces no direct equipment joins. Matching its class
and ID and validating the location produces 25,298 distribution-transformer and
6,656 fuse matches. Location disagreements are rejected rather than hidden.
The tests also prevent the local-repair/upstream-fault error and same-day damage
leakage. These are software checks, not measured field reliability or dispatch
accuracy.
