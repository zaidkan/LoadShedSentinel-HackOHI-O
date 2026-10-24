# Human 5 full recheck — LoadShed Sentinel

**The source-connected candidate is substantially more complete, but it is not ready to treat as the finished AEP demonstration.** Source dependency calculations and the production build pass; customer state synchronization, uncertainty messaging, risk estimation, estimate updates and several defensive checks remain defective. The candidate is a separate branch, not the current `main` release.

Audit date: October 24, 2026. This is an audit report only. No implementation, tests, contracts, dependencies or Git history were changed. Reviews used judge, practical-use, simulated AEP/domain, data-checking and integration/privacy perspectives; no actual judge or AEP employee participated.

## Revisions and teammate delivery

| Item | Observed state |
|---|---|
| Latest fetched `main` | `d86a083b2855740393687b4b05246b24d49e65be` |
| Source-connected candidate | `0e93b1465269fbba715ffca987e0a0f862bc2486`, `fix/aep-source-connected-demo`, 20 commits ahead of the fetched main |
| Earlier Human 5 audit | `6405848a331af5032c1f93d0545f8b26d03dc0e7`; its findings are reconciled below, not blindly repeated |
| Human 1 | Visible chat **“Continue implementation”** is idle. Its final handoff reports `fe2b266` on `codex/human1-source-integration`, with 84 tests passing in that environment. That branch is separate; the candidate uses an alternative 16-premise source adapter. |
| Human 2 | Engine/labor work is present on main; the latest relevant engine change is `3153034`. No separate current Human 2 chat was visible, so chat-level completion cannot be confirmed. |
| Human 3 | Delivered branch `feat/human3-frontend` ends at `2af130c`. Main/candidate contain a different map integration and frontend work. Branch ancestry alone does not prove that all delivered UI behavior is absent or present. Actual candidate browser behavior was checked. |
| Human 4 / integration | A substantial source-integration delivery is on the candidate branch. It is not on fetched main. No separate current Human 4 chat was visible. |
| Remote PR / CI status | Not verified: installed GitHub CLI has no authenticated account; unauthenticated repository PR/Actions API requests returned 404. A workflow file exists, but that is not evidence of a green remote run. |

## Validation performed

| Check | Main `d86a083` | Candidate `0e93b14` |
|---|---|---|
| Full backend suite | **54 passed, 2 failed, 34 subtests passed** | **61 passed, 1 failed, 34 subtests passed** |
| Backend test environment | Windows, original Python 3.14 venv; isolated main export | Same Python environment; fixed candidate checkout |
| Command | `PYTHONDONTWRITEBYTECODE=1`, `pytest -q -p no:cacheprovider` | Same command |
| Failure interpretation | Missing topology produces 503; POSIX mode assertion fails on Windows | Only the POSIX mode assertion fails on Windows |
| Production frontend build | Not rerun in this pass | **Pass:** actual `tsc && vite build`, Node 24.22.1 / Vite 6.4.5, exit 0 in an isolated temporary copy; repository source/lock unchanged |
| Actual browser | Not rerun in this pass | Chrome: four scenarios, asset selection, customer navigation/reset, battery and household inputs, 3D/2D, desktop and mobile checked |
| Full-source lineage | Not rebuilt separately for this revision | Full graph rebuilt **in memory**; all 16 sampled paths, 12 assets, 9 generalized positions, 27 relationships and 3 archive hashes match supplied source |
| Exhaustive source selection | Not applicable to old default groups | **448 combinations:** 64 valid selections match snapshot/customer/trace/counts; 384 expected rejections |

The shared failure is `tests/test_topology.py:207`: Windows returns mode `0666`, while the assertion requires POSIX `0600`. This alone does not establish an ACL or privacy exposure. Main's additional failure is `tests/test_api.py:41`, where topology lookup returns 503. The candidate's shipped source sample fixes that clean-checkout lookup failure.

Candidate source scope is **16 public premises**, not the entire source graph. The reconstructed full graph contains **117,549 accepted paths, 93 unmatched customers and 32,600 equipment nodes**. The common sample breaker has **1,563 known full-source dependents**; the runtime sample and metadata distinguish that from the 16 sampled dependents. No raw household identifiers or household positions were found in inspected public bundle/map outputs.

## Earlier findings: current candidate status

| Earlier ID | Status | What changed or remains |
|---|---|---|
| H5-01 — Setup / topology | **Partially fixed** | Shipped sample topology works and README parameter is corrected. README still installs absent `requirements.txt` (`README.md:71`) and claims an outdated test count. |
| H5-02 — Unknown / duplicate alerts | **Open** | Unknown still emits confirmed-outage and estimate-update alerts; customer screen claims normal service. Initial duplicate confirmation and cross-premise estimate suppression persist. |
| H5-03 — Location / customer result | **Partially fixed** | API source selection, footprint, customer token and trace now agree. Customer trace text field does not select a new incident; forecast band remains hardcoded; mounted customer view misses same-scenario asset changes. |
| H5-04 — Invalid / stale mutations | **Open** | Arbitrary state strings persist; old incident/revision fields are ignored. |
| H5-05 — Estimate updates | **Open** | Update alerts do not recompute restoration planning. |
| H5-06 — Battery | **Partially fixed** | Browser zero-capacity input now clears the previous result. Backend zero usable fraction still invents 100 Wh; efficiency/range handling remains defective. |
| H5-07 — Labor units | **Open** | Mapper still rewrites 100 feet as 100 construction units. |
| H5-08 — Asset-unbound confirmation | **Open** | Equipment-specific confirmation still accepts `asset_id=None`. |
| H5-09 — Customer refresh | **Open; now browser-reproduced** | Same-scenario equipment change and reset leave customer data stale. Scenario selection now awaits the POST, so the earlier pre-POST ordering explanation is superseded. |
| H5-10 — Initial error recovery | **Open; now browser-reproduced** | Restarting the API does not refresh the initial request. Reset can recover the snapshot, but scenario/equipment catalogs stay empty until page reload. |
| H5-11 — Customer outputs | **Partially fixed** | A source-sample disclosure is visible. Forecast confidence/planning assumptions, accessibility guidance and alert eligibility/communication plan remain absent. |
| H5-12 — Substation overclaim | **Fixed** | `README.md:15` now states breaker-level boundary and unknown physical substation connectivity. |
| H5-13 — Evidence projection | **Open, controlled service case** | A row tagged customer-safe still serializes internal fields. No actual current PII exposure was established. |
| H5-14 — Cached token consistency | **Open, optional full-graph path** | Old `Topology` constructor still accepts catalog/path token disagreement. Actual supplied graph is consistent. |

## Current priorities and reproducers

### P1 — Missing source silently restores the synthetic fixture

`api/main.py:70–76` catches every exception from initial source scenario generation and loads the legacy fixture. With fresh `_current_snapshot` / `_aep_impact_instance` state, patch `AEPImpact.load` to raise `FileNotFoundError`. No files need to change.

`GET /api/scenario/current` and `GET /api/customer/snapshot` return **200**, a `P-DEMO-*` premise, **8 fabricated affected premises**, and `impact_source: null`. Source catalog, map and scenario-selection requests return **503**. This contradicts the candidate's advertised fail-closed behavior and creates a plausible-looking incident from unavailable data. Return controlled unavailability rather than this fallback. **Owner: Human 4. Runtime reproduced independently by two reviewers.** The new failure test checks the loader, not this API initialization path.

### P1 — Unknown evidence still produces contradictory customer claims

Select `insufficient_evidence`. API status is `UNDER_REVIEW`, risk is `UNKNOWN`, ETR is unavailable and confirmed footprint is empty. The API nevertheless adds `OUTAGE_CONFIRMED` and `ESTIMATE_UPDATED` (`engine/customer.py:161`, `:176`; `api/main.py:161`). The actual customer screen simultaneously says **“Service Operating Normally”** and normal supply-line parameters (`CustomerPage.tsx:205–211`).

The utility's unknown cutout/unavailable estimate presentation is appropriate; the customer output and notification gates are not. Initial known-outage selection also duplicates `OUTAGE_CONFIRMED`, because the generator seeds it and the FSM adds another (`engine/scenarios.py:140`; `api/main.py:169`). A shared FSM additionally suppresses premise B's estimate update after premise A receives the same incident/summary (`engine/customer.py:177–190`); this last case is a pure-service issue. **Owners: Human 4 and customer frontend. API and browser reproduced.**

### P1 — Customer data remains stale after source changes and reset

In Chrome, keep the customer page mounted. Change the selected transformer from a three-premise case to a five-premise case. The global header updates to five; the customer remains on the old three-premise token/count/trace. Navigating utility → customer refreshes it. Reset while still in the same scenario then yields a three-premise global header with the old five-premise customer result.

The customer reload effect depends only on `scenarioId` (`CustomerPage.tsx:42–44`). Asset changes and resets update the operator snapshot without changing that prop (`App.tsx:53–68`, `:173`). Bind the customer response to the confirmed snapshot identity/revision. **Owners: Human 4 and customer frontend. Browser reproduced.**

### P1 — “Forecast risk” is still a fixed scenario label

`engine/scenarios.py:154` returns `HIGH` for all three known-fault cases and `UNKNOWN` for the abstention case. The customer labels this “Forecast Risk Band” (`CustomerPage.tsx:241`). No storm input, historical signal or differentiated source context calculates the band; no pre-storm risk journey is demonstrated. AEP permits a transparent rules-based estimate, so this does not require new ML training. It does require a defined estimate using relevant signals. Source dependency impact is now real within the sample, but is not outage-risk prediction. **Owners: Humans 1/2 and 4. Source and API verified against supplied challenge requirements.**

### P1 — Invalid states and stale intentions mutate the active incident

Post `{"status":"BANANA","cutout_status":"BROKEN"}` to `/api/scenario/advance`. It returns **200**, and both subsequent customer/operator GETs return the invalid strings (`api/main.py:183–198`).

Separately, select local protection, retain its incident ID/revision, then select upstream. Send an advance carrying the old `incident_id`, `expected_revision`, `action_id` and `status:"RESTORED"`. It returns **200** and mutates the new upstream incident. Extra fields are silently ignored. Validate enum and target/revision context atomically; customer projection also needs a revision to verify agreement. **Owner: Human 4. Both releases reproduced.** The stale-action subcase is narrower P2; an explicit simulated restoration control is not itself treated as an authority defect.

### P1 — An estimate update does not update the estimate

Select local protection, save `restoration_planning`, then advance with `{"restoration_summary":"Crew size now 1; access blocked for 8 hours"}`. Another `ESTIMATE_UPDATED` is generated while the complete planning object remains unchanged at **2.25 expected hours**. The equivalent upstream case remains at **4.5 hours**. The route accepts a summary but no planning overrides (`api/main.py:183–208`). Connect existing crew/access/damage inputs to recalculation and derive notifications from changed results. **Owner: Human 4 using Human 2 functions. Both releases reproduced.**

### P2 — Battery runtime invents energy; newer tests preserve the error

`POST /api/customer/battery-runtime` with `{"capacity_wh":1000,"usable_fraction":0,"device_w":100}` returns **100 usable Wh, 0.85 theoretical hours, 0.72 conservative hours**. `engine/customer.py:61–62` clamps usable charge to at least 10% and efficiency to at least 50%. Preserve valid zero usable energy; reject invalid efficiency and unsupported ranges.

New `tests/test_customer.py:110–117` explicitly expects zero efficiency to become 50% and negative usable charge to create 100 Wh. Passing these tests does not fix the physical error. The prior zero-input display bug **is fixed**: Chrome clears the calculation at zero capacity; 2,000 Wh / 120 W displays the expected 12.04 hours under declared efficiency/reserve assumptions. **Owner: Human 4. Runtime and browser verified.**

### P2 — Labor units and field-confirmation association remain unsafe pure-service inputs

- `pipeline/import_labor.py:150`: transformer 25 kVA, quantity 100, `quantity_unit="feet"` becomes **100 construction units**, with no missing-input warning. The estimator produces **897.39574468 person-hours / 299.13191489 expected hours** for three workers. The downstream unit guard cannot help after the mapper overwrites the input unit. **Owner: Human 2.**
- `engine/diagnosis.py:38`: a matching incident/time `field_damage="transformer"`, quality `field_confirmed`, provenance `authorized_enterprise`, with `asset_id=None`, is accepted for an arbitrary selected asset. Assessment clears the confirmation requirement; crew basis becomes `field_confirmed` / `transformer_replacement`. Require exact equipment association. Crew `approved` correctly stays false. **Owner: Human 2.**

Both are re-reproduced pure-service defects; canned scenarios do not currently exercise the malformed inputs.

### P2 — Required customer uncertainty, needs and communication outputs remain incomplete

The API provides `confidence_kind="scenario_only"`, planning assumptions and disclosure, but the customer risk/range cards omit them (`CustomerPage.tsx:223–249`; `engine/customer.py:237–248`). Scenario direct workloads are illustrative **1 / 3 / 6 hours**, not workbook rates; utility planning panels expose assumptions, but the customer numeric range does not explain that basis.

Preparedness with food/communications false and `mobility_accessibility_needs:true` returns `{"guidance":[]}`. Alert history still lacks a qualification decision/reason and proposed channel/timing/escalation plan. These remain explicit sponsor-output gaps. Guidance cards also lack source URLs; this is an attribution improvement, not evidence that their advice is factually wrong or an independently established additional sponsor requirement. **Owners: Humans 3 and 4. API, source and supplied challenge review.**

### P2 — Mobile navigation overflows the viewport

At **390 × 844**, Chrome measures a **986 px body width**. Reset, Utility and Customer controls lie at approximately x=705/790/882, beyond the initial viewport. The fixed horizontal nav groups in `App.tsx:78–129` cannot fit the selectors and actions. Reflow or otherwise make the primary controls reachable at the intended mobile width. **Owner: Human 3 / shared app integrator. Browser reproduced.**

### P2 — Generalized map positions collapse the source relationships

The actual map renders **9 equipment nodes at only 2 positions and no relationship polylines**. These are valid generalized source coordinates, not a source/schema mismatch: `engine/aep_impact.py:138` suppresses edges with missing or coincident endpoint geometry. Rendering those points directly also overlaps nodes and labels (`FeederMap.tsx:68–75`, `:147–150`). The shipped sample's **27 dependency relationships are valid**, but the displayed map does not make those paths readable. Use a distinct schematic layout for supplied relationships while preserving generalized geographic context; do not solve this by exposing precise coordinates. **Owner: Human 3 / source-map integration. Browser and source verified; presentation limitation.**

### P2 — Setup and documentation do not describe the tested release consistently

README still runs `pip install -r requirements.txt`, but the file does not exist (`README.md:71`). It also claims “54/54 tests pass”; the tested candidate has a different suite and a Windows-only failure. The source ledger (`docs/source_ledger.md:38`), judge crosswalk (`docs/judge_evidence.md:14`) and video script (`docs/demo_script.md:11`) still describe the superseded disconnected `P-DEMO` groups and token limitation. Update the startup/evidence package around the actual release commit and runtime sample. **Owner: Human 4 with module owners. Source verified.** No checked-in final recording or submission receipt was found; that does not prove none exists externally.

### P2 — Defensive projection and cache validation gaps are controlled cases

- A synthetic `customer_safe` evidence row passes its full internal `Evidence` serialization, including `asset_id`, through `engine/customer.py:214–216`. Use a permitted-field projection. Current canned rows are operator-only; **no actual current PII exposure was established**. **Owner: Human 4.**
- Optional full-graph `Topology` loading accepts a path token that disagrees with its token catalog (`engine/topology.py:24`), yielding a wrong/duplicate public token. The actual full source graph is consistent. **Owner: Human 1.**
- `AEPImpact` trusts `bundle_edges` separately from its validated paths (`engine/aep_impact.py:27`, `:136–145`). A controlled extra edge absent from all paths is accepted and rendered as a supplied sequence. All **27 shipped relationships are correct**; this is a corruption-handling gap, not observed false source data. **Owner: source adapter / Human 4.**

### P2 — Startup recovery leaves the selectors unavailable

Stop the owned audit API and load the frontend. It shows empty scenario/equipment selectors and the loading message. Restarting the API does not retry initialization. Reset recovers a snapshot, but the catalogs remain absent until page reload. `App.tsx:21–38` only initializes once; `:63–68` resets the snapshot without reloading the catalogs; `:168–173` retains the loading display when no snapshot exists. Provide visible failure/retry handling that restores both snapshot and catalogs. **Owner: Human 4 / shared app. Browser and source reproduced.**

## Browser evidence

All four scenarios and utility/customer navigation rendered in actual Chrome. Known source traces, source equipment selection, upstream closed-cutout state, replacement **27 person-hours / 9 expected hours**, unknown utility presentation, loaded 3D and explicit 2D mode were checked. Critical-needs guidance appeared, and normal tested flows produced no console errors. This is targeted browser coverage, not a certified performance/accessibility or exhaustive cross-browser test.

| Capture | What the image actually shows |
|---|---|
| [Initial utility](audit-evidence/0e93b14/utility-initial.jpg) | Loaded 3D utility view and collapsed map positions. |
| [Stale customer after asset change](audit-evidence/0e93b14/customer-asset-stale.jpg) | Global header has five affected premises while customer output retains the old three-premise incident/trace. |

Unknown customer text, mobile overflow geometry and startup/reset recovery were checked through browser DOM and API output; their claims do not depend on screenshots. The two linked captures were visually checked. Audit-owned API/Vite processes were stopped; their ports 8095/5195 no longer listened. The browser tabs used for this check were closed and viewport settings restored.

## Correct calculations and boundaries verified

The workbook example remains correct: **1.994212765957446 direct hours × 4.5 = 8.973957446808507 person-hours**, then **2.991319148936169 labor-only hours** with three workers. The multiplier is applied once. Pure upstream-blocker and explicit-energization guards pass. The modeled node energy example uses **0.648 Wh/day**, leaving **40.352 Wh** from 41 Wh over 24 hours without harvest. These pure functions do not establish that API scenario durations are workbook-derived or that browser status controls enforce the pure schedule.

Actual source selection is now wired into API, scenarios and map data. The earlier statement that the impact module had no callers is obsolete for this candidate. Known/unknown source selections, scoped counts and matching traces passed; source-sample and breaker-level boundary disclosures are improved.

## Release assessment

Human 4 should first resolve the fabricated initial fallback, unknown messaging, invalid/stale mutations and disconnected estimate updates; Humans 3/4 should synchronize customer state and make mobile controls usable. The data/engine owners should complete a transparent risk calculation and address the pure-service unit/association guards. Refresh evidence documents after choosing the release revision, then rerun only the affected regressions plus the full release gates.

The present candidate can demonstrate source-derived dependency impact, modeled diagnosis, planning arithmetic, household-needs guidance and battery calculations. It cannot yet support a claim of complete AEP sponsor acceptance. Production deployment security, real utility operation, live notification delivery, and external submission completion were not certified by this audit. All five review perspectives are complete. A final fetch still showed the exact main/candidate revisions recorded above.
