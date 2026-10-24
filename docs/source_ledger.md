# Source ledger — evidence, models and declared scenarios

Documentation snapshot: October 24, 2026. [Data inventory](data_inventory.md) records exact extract counts, archive hashes, columns, coordinate reference systems and rejected joins. This ledger describes what each input can support. A source archive, a modeled observation and an operator-selected scenario are different kinds of evidence even when they appear on one screen.

## Canonical provenance and quality

[api/schemas.py](../api/schemas.py) defines the authoritative provenance values: `aep_challenge`, `external_research`, `modeled_sensor`, `scenario`, `authorized_enterprise`. Quality is independently `observed`, `modeled`, `reported`, `field_confirmed` or `missing`. Preserve both fields, evidence IDs, incident/asset association and timestamps when the evidence schema applies. Static archive records are reported historical context; importing them does not turn them into current field confirmation.

Derived lookup/map artifacts carry `aep_challenge` provenance and explicit transformation/basis metadata. They are not new source observations. The plan's phrase `modeled_topology` describes a fallback basis, not a new schema provenance enum; any future synthetic fallback must use an allowed provenance such as `scenario` with that descriptive label. The current processed slice uses actual supplied equipment relationships and geometry, not that fallback.

## Provenance-to-use mapping

| Input / claim | Source and verifiable locator | Provenance / interpretation | Permitted use | Boundary |
|---|---|---|---|---|
| Customer service identity and transformer reference | `Customer_Clip.dbf`: premise_nu, aep_xfmr_l, circuit_id; Data1.zip | aep_challenge; reported source relationship | Private string-key joins to text/GIS | No household geometry, clinical/service flags or raw IDs in public payloads |
| Transformer and protection equipment | Transformer_Clip, Fuse_Bank_Clip, Recloser_Bank_Clip, Switch_Clip; Data1/Data2 | aep_challenge; static asset attributes | Context-qualified matches; generalized equipment positions | Duplicate location keys need disambiguation; normal switch state is not live telemetry |
| Supplied upstream paths | matched_upstream.zip → matched_upstream.txt | aep_challenge; provided ordered relationship | Validated premise path and set-union dependency footprint | Ends at breaker; physical substation extension UNKNOWN; no power flow, alternate-feed or energized-state inference |
| Poles and primary/secondary lines | Pole_Clip, Primary_ExportFeatures, Secondary_ExportFeatures | aep_challenge; inventoried geometry/attributes | Describe source coverage and future matching requirements | Not validated premise connectivity; proximity cannot supply missing links |
| Public facilities | Hospitals_Medic_Pairwis_Clip, Fire_Stations_E_Pairwis_Clip, Ambulance_Servi_Pairwis_Clip | aep_challenge; reported facility context | Inventory only in current import | No electrical dependence, facility capacity or emergency availability claim |
| Historical damage | Data1.zip → arcos_prod_damage_09_28_Clip.dbf: Asset_Type, Inform_Wor, Circuit, Substation, Report_Tim, Access_Iss, Special_Eq | aep_challenge; reported history | Category counts and source-labelled historical examples | NEAR_FID target unverified; no automatic selected-asset join; no current incident or hourly duration labels |
| Labor reference cells | Install_Labor_HackOHIO.xlsx; sheet and cell references retained by import_labor | aep_challenge; sourced reference rates | Candidate category/size/quantity-specific work package | Category averages are not an actual dispatched work order; missing size/units mean unavailable hours |
| 4.5 indirect-labor allowance | Workbook Indirect Labor Multiplier!B1 and instruction A3; supplied AEP Data Guide interpretation | aep_challenge reference plus explicit unit interpretation | Apply once to direct job-site person-hours | No duplicate drive, setup or safety adders; adjusted totals are not multiplied again |
| Pole/sensor twin | engine/scenarios.py and engine/energy.py; modeled cutout, heat/acoustics, state of charge and solar assumptions | modeled_sensor; modeled | Demonstrate how proposed sensing affects triage and buffering/runtime calculations | No installed AEP device, field-calibrated sensor accuracy or measured hardware endurance claim |
| Upstream trip, damage confirmation, incident footprint | engine/scenarios.py; explicitly chosen scenario/context | scenario; modeled, including simulated field_confirmed findings | Compare local protection, upstream interruption, confirmed-replacement and conflicting-evidence cases | A simulated finding remains scenario provenance; it is not an enterprise confirmation |
| Restoration schedule and crew resources | engine/restoration.py; quantities, operation, crew size, task prerequisites, duration factors, queue/access/energization assumptions | scenario; derived planning result | Fast/expected/difficult planning comparison and blocker review | Not calibrated quantiles, dispatch approval, switching feasibility or utility ETR commitment |
| Household needs and preparedness | Customer-declared demo inputs and engine/customer.py | scenario; declared demo profile | Personalize preparation and battery guidance | Never infer medical need from source customer flags or address/location |
| Notifications | api scenario state and engine/customer.py finite-state machine | scenario; demo delivery | Preview preparation, outage, estimate-update and restoration-complete messages | No real text/email delivery; status inputs are simulated, not authorization from a utility system |
| External research | No research dataset consumed by the current graph build | external_research only if actually supplied later | Explain future research separately | No research-derived field accuracy or outage probabilities claimed |
| Live utility authority | No authorized enterprise feed established by these artifacts | authorized_enterprise reserved for actual future authorized inputs | None in this documented demo | Cannot relabel scenario confirmation, status changes or historical ARCOS records as live authority |

## Historical damage → lookup → candidate labor package → customer narrative

There are two explicit review handoffs in this journey:

1. **Historical context to selected asset:** the 1,659 ARCOS records establish that damage classes occur in the extract. A presenter may filter the 74 transformer assessments as context, then deliberately choose an independently validated demo asset/path. That operator choice is a scenario assumption. No verified spatial/key crosswalk currently proves that the historical assessment belongs to the selected equipment. `NEAR_FID`, shared circuit label or nearest point alone cannot bridge that gap.
2. **Selected asset to proposed work package:** only after a declared or genuinely authorized confirmation should the presenter discuss replacement. Size/rating, quantity, operation and unit must be explicit. `map_damage_to_work_packages` maps categories to candidate references; its mapping is modeled, not an official ARCOS work-code crosswalk. The result remains review-only, never a dispatched or approved work order.

The graph path and customer scenario also need a declared integration handoff. The real graph uses `PREM-` / `ASSET-` tokens. At this source snapshot, `generate_scenario` uses `P-DEMO-` declared local/feeder groups, with its premise validator accepting `P-` tokens. Its 8-local/32-feeder defaults are illustrative groups, **not measured graph footprints**. Do not claim the same real customer or GIS incident flows through these defaults unless an integration adapter and corresponding checks demonstrate it. The video may show the graph proof, then visibly switch to the labelled scenario concierge. Documentation does not silently repair that code boundary.

## Hand-checked sourced labor example

The source workbook SHA256 is `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`. [import_labor.py](../pipeline/import_labor.py) returns reference `TRANSFORMER:25`, a 25-kVA category average from **Labor time material related!C21,D21**:

| Quantity | Value | Status |
|---|---:|---|
| Install reference | 1.1880851063829778 hours | Workbook C21 |
| Remove reference | 0.8061276595744681 hours | Workbook D21 |
| Operation / quantity | Replace / 1 construction unit | Declared example inputs; not inferred from ARCOS or GIS |
| Direct replacement workload | 1.994212765957446 hours | Sum of install + remove |
| Indirect multiplier | 4.5 once | Workbook B1 / Data Guide person-hour interpretation |
| Adjusted workload | 8.973957446808507 person-hours | Derived workload, not elapsed time |
| Qualified workers | 3 | Scenario assumption |
| Idealized labor-only elapsed baseline | 2.991319148936169 hours | Workload divided by declared crew size |
| Duration factors / queue / extra access / energization | 0.75,1,1.5 / 0 / 0 / 0 | Scenario assumptions, not measured conditions |
| Fast / expected / difficult result | 2.243489361702127 / 2.991319148936169 / 4.486978723404254 hours | Reproduced pure restoration function; no field calibration |

Rounded on-screen arithmetic: **1.9942 × 4.5 = 8.9740 person-hours**; with 3 workers, **2.9913 labor-only hours** before any separately justified constraints. The exact final digit can differ by floating-point display; quote the rounded values. Source rates do not imply that the selected GIS transformer is 25 kVA. This rating is explicitly declared for the example.

This example is separate from `generate_scenario('confirmed_replacement', {})`, whose direct 6-hour workload is explicitly illustrative, not read from the workbook. Do not show its 6-hour assumption beside C21/D21 and imply the cells produced it. For a workbook-backed video card, capture the existing pure importer/restoration output; if the integrated UI remains illustrative, label the calculation as a separate source-backed reference demonstration.

## Public disclosure and unknowns

The graph build accepts 117,549 premise paths and reports 93 unmatched customers plus 4 text-only keys. Counts and join status are documented in [data_inventory.md](data_inventory.md). Footprints are hypothetical coverage-limited dependencies, not observed outages. The public example has 3 equipment points generalized to 0.01 degrees, 2 schematic relationship links and 5 anonymous premise references. No household positions are drawn. Missing breaker geometry and substation connectivity stay explicit.

Persist labels on every captured screen: **AEP CHALLENGE DATA**, **MODELED SENSOR**, **SCENARIO ASSUMPTIONS**, **ESTIMATED RESTORATION**. Confidence/relative evidence scores are not trained probabilities. Declared crew capabilities are recommendations for review; `approved` remains false. Completing a local task cannot restore a home with remaining blockers; an explicit simulated re-energization/status event is distinct from task completion.

## Reproducibility and claim status

[inspect_assets.py](../pipeline/inspect_assets.py), [build_graph.py](../pipeline/build_graph.py), [topology.py](../engine/topology.py), [import_labor.py](../pipeline/import_labor.py), [restoration.py](../engine/restoration.py), [scenarios.py](../engine/scenarios.py), [customer.py](../engine/customer.py), [schemas.py](../api/schemas.py) and [main.py](../api/main.py) are the local evidence locators. These links describe code inspected for this ledger, not a claim of browser or end-to-end production validation.

LRP-118 recorded 17 passing topology tests, including complete-archive checks, and successful output/privacy/permission checks. For this documentation task, ARCOS aggregates and the sourced labor example were recalculated locally. No current customer-alert integration, submission logistics, cloud architecture, operational accuracy or savings claim was independently validated here. Rehearse the exact displayed build and disclose any separately captured evidence card in the [demo script](demo_script.md).
