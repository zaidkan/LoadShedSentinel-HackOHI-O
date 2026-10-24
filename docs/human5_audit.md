# Human 5 audit — LoadShed Sentinel

Audit date: October 24, 2026. Target: `6405848a331af5032c1f93d0545f8b26d03dc0e7` (`origin/main` when the audit began). Findings apply to that fixed revision, not subsequent branches.

Scope: independent judge, practical-use, simulated AEP/domain, data-checking, and integration/privacy reviews. These are review perspectives; no actual competition judge or AEP employee participated. Audit only: no implementation, test, contract, or dependency changes.

## Priority issues

P1 means a demonstration blocker or materially incorrect customer/contract behavior. P2 means a narrower defect, omitted sponsor output, or unsupported claim. **Runtime** means reproduced in-process with FastAPI TestClient or a pure Python service. **Source** means traced in code and not browser-reproduced. **Gap** means required integration/output is absent, rather than a failing implemented calculation.

| ID | Priority | Issue and consequence | Owner | Verification | Primary location |
|---|---|---|---|---|---|
| H5-01 | P1 | Fresh checkout cannot follow the backend quickstart; topology lookup is unavailable. | Human 4 + Human 1 | Runtime / source | `README.md:68`; `api/main.py:36` |
| H5-02 | P1 | Unknown evidence produces a confirmed-outage alert while the customer screen says service is normal; initial alerts can also duplicate. | Human 4 + customer frontend | Runtime / source | `engine/customer.py:161`; `web/src/pages/CustomerPage.tsx:192` |
| H5-03 | P1 | Entering a real premise token does not select that customer's risk or restoration response. | Humans 1 and 4 | Gap / source | `web/src/pages/CustomerPage.tsx:88`; `api/main.py:124` |
| H5-04 | P1 | Advance persists invalid states and ignores stale incident/revision context. | Human 4 | Runtime | `api/main.py:148` |
| H5-05 | P1 | An “estimate updated” alert can announce an outlook change without changing the restoration estimate. | Human 4 using Human 2 services | Runtime / gap | `api/main.py:166` |
| H5-06 | P2 | Battery outputs invent energy at zero usable fraction; the UI can retain an old positive runtime after a zero input. | Human 4 + customer frontend | Runtime / source | `engine/customer.py:61`; `web/src/pages/CustomerPage.tsx:63` |
| H5-07 | P2 | Labor mapping silently converts an incompatible input quantity into construction units. | Human 2 | Runtime, pure service | `pipeline/import_labor.py:150` |
| H5-08 | P2 | An asset-unbound field report can confirm damage to whichever asset is selected. | Human 2 | Runtime, pure service | `engine/diagnosis.py:38` |
| H5-09 | P2 | Customer refresh races scenario selection and does not refresh a reset of the same scenario. | Human 4 + customer frontend | Source | `web/src/App.tsx:39`; `web/src/pages/CustomerPage.tsx:42` |
| H5-10 | P2 | Initial API failure leaves the app showing a permanent loading message with no recovery control. | Frontend / Human 4 | Source | `web/src/App.tsx:30`; `web/src/App.tsx:126` |
| H5-11 | P2 | Sponsor-required uncertainty, accessibility guidance, and alert eligibility/communication planning are incomplete. | Humans 3 and 4 | Gap / runtime / source | `web/src/pages/CustomerPage.tsx:205`; `engine/customer.py:74` |
| H5-12 | P2 | README claims physical substation tracing beyond the validated source boundary. | Humans 1 and 4 | Source comparison | `README.md:13` |
| H5-13 | P2 | Customer-safe evidence projection serializes internal asset identifiers. | Human 4 | Runtime, controlled projection | `engine/customer.py:214` |
| H5-14 | P2 | Malformed cached premise-token mappings are accepted and can return wrong/duplicate tokens. | Human 1 | Runtime, controlled malformed graph | `engine/topology.py:24` |

## Reproduction and expected behavior

### H5-01 — Reproducible setup

The quickstart runs `pip install -r requirements.txt`, but that file is absent from this revision. The topology loader requires ignored `data/processed/private/topology.json`; the quickstart does not generate it. In the fresh audit checkout, health returns `topology_loaded: false`; `GET /api/topology/lookup?premise_id=PREM-000001` returns **503**. The README's exact acceptance command (`README.md:98`) instead uses `premise_token`, which returns **422** because the required query parameter is `premise_id` (`api/main.py:186`). Supply a dependency manifest, explicit reproducible data preparation/startup steps, and a working verification command. This is a fresh-checkout failure, not a claim that the importer cannot produce the graph.

### H5-02 — Unknown state and duplicated initial alerts

After reset, select `{"scenario_id":"insufficient_evidence"}` via `POST /api/scenario/select`. The result is `UNDER_REVIEW`, risk `UNKNOWN`, zero affected premises, and unavailable restoration, yet notifications include `OUTAGE_CONFIRMED` and `ESTIMATE_UPDATED`. The pure generator correctly starts this case with no notifications (`engine/scenarios.py:130`); API FSM evaluation adds them. The customer page renders every non-`OUTAGE` status as “Service Operating Normally” and claims normal supply-line parameters (`CustomerPage.tsx:192–198`).

Separately, the first local scenario selection after reset can include two `OUTAGE_CONFIRMED` entries: one seeded by the generator and another appended by the FSM (`api/main.py:124–135`). Preserve an explicit unknown state across output and alerts; use one notification-generation/deduplication path.

The FSM also has a narrower per-premise deduplication defect (`engine/customer.py:177–190`): evaluate an outage/estimate summary for premise A, then the same incident/summary for premise B using the same FSM. A receives the estimate update; B receives only its outage alert, because shared `_last_etag` suppresses B despite its distinct premise key. This is a reproduced pure-service issue; the current API selects only one demo premise. Track estimate identity per premise/incident before integrating multiple households.

### H5-03 — Location is disconnected from the customer result

`handleTracePremise` only performs topology lookup and stores its trace. It never selects a premise in the customer snapshot. `/api/customer/snapshot` projects the global scenario; `/api/scenario/select` passes `{}` to the generator. The customer remains the fixture's `P-DEMO-001`, while the entered graph token uses `PREM-*`. Risk is fixed `HIGH` for every non-unknown canned scenario (`engine/scenarios.py:139`).

The supplied AEP challenge requires a selected anonymized location to receive its risk estimate. Connect premise selection, source context, risk, incident footprint and customer projection before presenting them as one journey. The source ledger already acknowledges this integration gap.

### H5-04 — Invalid strings poison the shared snapshot

`POST /api/scenario/advance` with `{"status":"BANANA","cutout_status":"BROKEN"}` returns **200**. Subsequent operator and customer GETs return those same invalid values. `AdvanceRequest` accepts free strings and assignments bypass model construction validation. Validate enum values before atomic mutation and leave state unchanged on rejection.

**Stale-context subfinding (P2):** select the local scenario and save its incident ID/revision; select the upstream scenario; submit an advance with the saved local `incident_id`, `expected_revision`, an `action_id`, and `status:"RESTORED"`. The request returns **200** and changes the new upstream incident to revision 2. Extra context fields are silently ignored. The blueprint explicitly calls for scenario revision checks (`FINAL_LOADSHET_IMPLEMENTATION.md:627`), and the customer projection omits revision (`engine/customer.py:230`). Reject stale incident/revision context and return the accepted revision to both views. This is a stale-action defect, not an assertion that the demo's restoration control needs real utility authorization.

An explicit simulated `RESTORED` control is not separately reported as an authorization defect: the project documents simulated status events. Invalid enum persistence remains a defect within that documented demo contract.

### H5-05 — An update message without an updated estimate

Select `local_protection`, save the customer restoration object, then post `{"restoration_summary":"Crew size now 1; access blocked for 8 hours"}` to `/api/scenario/advance`. It emits `ESTIMATE_UPDATED`, while the restoration object remains unchanged, including the 2.25-hour expectation. The route changes only state strings/revision and evaluates a free-text summary; it accepts no planning inputs for recalculation. Wire crew/access/damage assumptions into the existing engine and derive the notification from a changed estimate.

### H5-06 — Battery calculation and stale display

`POST /api/customer/battery-runtime` with `{"capacity_wh":1000,"usable_fraction":0,"device_w":100}` returns `usable_wh: 100`, theoretical `0.85` hours and conservative `0.72` hours. The clamp invents a minimum 10% usable charge. Zero efficiency is similarly converted to 50%. Preserve valid zero energy and reject invalid efficiency/range inputs.

In the frontend source, after a positive calculation, setting capacity or load to zero skips the request without clearing `batteryCalc`. The previous positive runtime remains eligible for display. Clear/invalidate the result on input changes and prevent older responses from replacing newer inputs. This display case was source-traced, not browser-reproduced.

### H5-07 — Quantity-unit mismatch

Pass `{"asset_type":"transformer","transformer_kva":25,"quantity":100,"quantity_unit":"feet"}` to `map_damage_to_work_packages` with the supplied workbook catalog. It returns quantity 100 in `construction_unit`, with no missing-input warning. The downstream estimator with three workers produces **897.3957 person-hours / 299.1319 expected hours**. Reject incompatible units before building the package. This affects the pure service; the canned scenario uses an illustrative workload instead.

### H5-08 — Confirmation needs an asset association

Provide a matching incident/time field report with `kind="field_damage"`, `value="transformer"`, `quality="field_confirmed"`, `provenance="authorized_enterprise"`, and `asset_id=None`. `usable_evidence` accepts it for an arbitrary current asset; assessment clears `requires_field_confirmation`, and crew recommendation returns `transformer_replacement` with `basis="field_confirmed"`. Require equipment-specific confirmation to identify the equipment. Crew `approved` correctly remains false. Canned scenarios currently supply asset IDs.

### H5-09 / H5-10 — Refresh and recovery

`App.handleSelectScenario` publishes `selectedScenarioId` before awaiting the POST. A mounted customer page reacts immediately and can GET the previous global snapshot; POST completion updates only the operator snapshot. There is no subsequent revision-triggered customer refresh. Resetting the same scenario ID also does not retrigger the customer's effect. Publish the confirmed mutation result/revision before refreshing both views.

If initial `fetchCurrentScenario` fails, the app only logs the error. `loading` becomes false but `snapshot` remains null, so `loading || !snapshot` keeps showing “Loading LoadShed Sentinel...”. Render an error and retry path. Both findings are source-traced; browser timing/recovery remains unverified.

### H5-11 — Required customer outputs

- **Uncertainty:** the API provides `confidence_kind`, restoration assumptions and `disclosure` (`engine/customer.py:236–247`), but the customer page omits them beside risk/range output. Show the scenario/source basis and missing-data limits rather than presenting the band alone as a forecast.
- **Accessibility:** `POST /api/customer/preparedness` with `{"food_refrigeration":false,"communications_charging":false,"mobility_accessibility_needs":true}` returns `{"guidance":[]}`. The flag is accepted but never used in guidance. The actual challenge explicitly requires adapting preparation for declared accessibility needs.
- **Alert eligibility and plan:** the page displays generated history (`CustomerPage.tsx:355`); the response supplies no eligibility explanation, recommended channel/timing, or escalation trigger. These are sponsor requirement 4 outputs. A visible proposed plan is sufficient for a demo; real SMS/email integration is not required by this finding.

### H5-12 — Source boundary claim

README says validated paths run “back to feeding substations.” The source ledger and judge evidence say the supplied paths end at the breaker and physical substation connectivity remains unknown. State the validated breaker boundary consistently.

### H5-13 — Customer evidence needs a field allowlist

In a controlled projection test, construct an `Evidence` row marked `visibility="customer_safe"` with a synthetic private equipment identifier in `asset_id`, then call `project_customer_view`. `public_evidence` contains the entire serialized row, including that identifier. The visibility tag selects rows but does not strip operator fields (`api/schemas.py:25–35`; `engine/customer.py:214–216`). Use an explicit customer evidence model/field allowlist. All canned evidence rows are operator-only, so this finding does **not** establish an actual running PII leak or exposed customer coordinates.

### H5-14 — Cached token consistency is not validated

In a controlled malformed graph, change a path's `premise_token` so it disagrees with the corresponding entry in `graph["premise_tokens"]`. `Topology` accepts the graph: its constructor checks key membership and catalog uniqueness, not equality between the path token and catalog token. Lookup can return a different token from the requested one, and affected-footprint output can contain duplicate public tokens (`engine/topology.py:46`, `engine/topology.py:69`). Validate path/catalog agreement before serving a persisted graph. The full graph rebuilt from supplied sources is consistent; this is a cache-integrity defect, not observed corruption in the challenge data. The unmerged `fe2b266` branch contains the missing guard.

## Validation and limits

- Practical reviewer: Windows PowerShell, Python 3.14 from the existing original-repository environment; `PYTHONDONTWRITEBYTECODE=1`, `pytest -q -p no:cacheprovider` against the fixed fresh audit checkout. Result: **52 passed, 2 failed, 34 subtests passed**.
- `tests/test_api.py:41` fails because topology lookup returns 503 instead of 200 in that checkout. `tests/test_topology.py:207` assumes POSIX `0600`; Windows reports `0666`. That assertion alone does not demonstrate an ACL/privacy exposure.
- API examples used in-process FastAPI TestClient; pure-service examples used the supplied workbook. The single 4.5 multiplier and hand-checked workbook arithmetic were consistent.
- Frontend production build **passed** in an isolated temporary harness copied from the fixed revision: pnpm 11.25.0 imported the existing npm lock, installed frozen dependencies with install scripts disabled, then `pnpm run build` (`tsc && vite build`) exited **0**. Runtime: Node 24.22.1, Vite 6.4.5; 1,982 modules transformed. The large-chunk warning alone is not a demonstrated product defect. Source package/lock hashes were unchanged.
- Actual browser rendering/timing, WebGL fallback, accessibility/performance and final submission assets were **not verified**. Source-traced findings are labeled accordingly.
- Data checking rebuilt the full graph **in memory** from original supplied ZIPs: committed counts match **117,549 accepted paths, 93 unmatched customers and 32,600 equipment nodes**. Breaker-footprint union matches 117,549; safe GeoJSON matches regeneration; workbook hash matches the ledger; checked public map field whitelists are correct. These are not reported as defects.
- All five assigned review perspectives completed. Integration/privacy checks reproduced the stale-context, per-premise FSM and controlled evidence-projection cases above. They did not establish an additional current consent or household-PII leak.

## Separate branches are not integrated fixes

`fe2b266` (`codex/human1-source-integration`) adds source bootstrap/context/risk services and the cached-token consistency guard. Its handoff still requires premise-token acceptance and scenario wiring. `355306b` (`fix/aep-source-connected-demo`) adds a sanitized slice and standalone impact module; the data check found no caller/import connecting that module. Neither changes the audited `6405848` behavior. Re-audit the integrated revision after any merge; do not count branch availability as a passing end-to-end result.
