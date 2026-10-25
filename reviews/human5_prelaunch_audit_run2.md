# Person 5 pre-launch audit — run 2

**Final pre-launch verdict: INCOMPLETE.** The previous P0 API failure is fixed, normal crew/access updates work, and all 117 tests pass. Seven prior findings are verified closed. Six are only partially resolved: late planning failures still poison saved context; the displayed hospital comparison is not bound to the selected facility footprint; and customer projection, escalation presentation, map bounds and release evidence retain gaps. One additional alert-history regression was reproduced.

**Fixed target:** `b19baebc78334a7e2e534ec537ade40d9900de79`, October 25, 2026. This is a fresh audit of the requested revision, not acceptance of the remediation summary. All **89 tracked files** were verified against the commit's reconstructed Git tree/index and copied into private staging. Source hashes were checked again after verification. No production source, Git state, live incident or submission was changed.

Reviewer: aj. Prior LRP-127 authorship of facility/risk components remains disclosed. Those unchanged components received fresh execution of independently calculated projection, nearest-anchor/path and scoring checks. No annotation/model repair or source workaround was used for API tests in this run.

## Fresh verification results

| Check | Result |
|---|---|
| Backend suite | **117 tests and 72 subtests passed**, no skips; exit 0, 6.27 s. One existing Starlette/httpx deprecation warning. |
| Web build | `npm run build` passed, including TypeScript; Vite 6.4.5, 1,982 modules, 3.44 s. JavaScript 1,064.57 kB / 291.40 kB gzip; chunk-size warning remains. |
| OpenAPI | `GET /openapi.json` **200**. |
| Scenario/sensitivity API | **1,400 checks passed**: all four scenarios × crew 2–8 × access 0–24 × selection/advance. Expected range, person-hours, planning-input echo, revision increment and customer expected-hours agreement verified. |
| Workbook | Direct worksheet XML reads reproduce **8.973957446808507 person-hours**; single 4.5 multiplier. |
| Facilities | **52 source records** reproject correctly; independent unit-sphere nearest ordering and explicit upstream-path tag checks pass. |
| Risk | **81 factor-level combinations** match independently expected bands; missing/conflicting inputs return UNKNOWN. |
| Battery | Zero usable fraction returns zero Wh/runtime; efficiencies -1, 0, .1 and 1.5 return **400**; .5, .85 and 1.0 return **200**. |
| Source failure | With AEP loading unavailable and synthetic fallback disabled, current scenario returns **503**, not a P-DEMO outage. |
| Map | Actual `FeederMap` server-side rendering produces **9 unique centers**; remaining target overlap/bounds issues are detailed below. |
| Immutable source/data | All 89 source hashes remain unchanged. All three archive hashes match the public bundle's metadata. |

The existing Python and Node dependencies were used; no fresh installation or production-server startup is claimed. Run 1 in this same session demonstrated sandbox denial of a local server bind and Chromium startup. Run 2 uses fresh API TestClient probes and actual component server-side rendering, **not a mounted browser**. No fresh 390px overflow, touch, GPU, 2D/3D interaction, contrast or screen-reader pass is claimed. The Impeccable detector returned `[]`; it does not prove those properties.

### Scenario behavior

| Scenario | Status / cutout | Dependent premises | Risk | Default expected restoration | First-selection alerts after reset |
|---|---|---:|---|---|---|
| Local protection | OUTAGE / OPEN | 3 | MODERATE | Unavailable: no selected repair package | One OUTAGE_CONFIRMED |
| Upstream feeder | OUTAGE / CLOSED | 16 | MODERATE | Unavailable: no selected repair package | One OUTAGE_CONFIRMED |
| Confirmed replacement | OUTAGE / OPEN | 3 | HIGH | 2.991319148936169 h, crew 3/access 0 | One OUTAGE_CONFIRMED; one initial ESTIMATE_UPDATED |
| Insufficient evidence | UNDER_REVIEW / UNKNOWN | Unconfirmed; affected list empty | UNKNOWN | Unavailable | None |

The replacement range recalculates to **3.4956595744680845 h** with crew 6/access 2. Customer expected-hours values match the authoritative scenario in every sensitivity check. The priority comparison itself also updates with inputs: hospital-first 1 h versus 3 h at crew 3/access 0; 2.5 h versus 3.5 h at crew 6/access 2. These numbers work arithmetically; their connection to selected facilities remains F02 below.

## F01–F13 closure ledger

“Closed” means the original defect was freshly checked. “Partial” means a real improvement exists but the whole finding cannot be closed. UI-source checks do not claim browser verification.

| Prior finding | Status | Run-2 evidence |
|---|---|---|
| **F01 — incomplete advance/OpenAPI model** | **Closed** | `Union` is imported; OpenAPI and valid advance requests return 200 without a workaround. All requested scalar sensitivity combinations pass. |
| **F02 — criticality absent from delivered journey** | **Partial — P1** | A comparison is now present in API/schema/operator JSX and recalculates. It still invents the same hospital task on assets with zero facility associations and does not bind branch membership/customer counts to the selected footprint. |
| **F03 — rejected requests mutate state** | **Partial — P1** | The original invalid-cutout request returns 400 and leaves snapshot/context unchanged. A later calculation failure still commits invalid context before validation succeeds, returns 500, and breaks a subsequent valid update. |
| **F04 — silent synthetic AEP fallback** | **Closed** | With `SENTINEL_ALLOW_SYNTHETIC_FIXTURE=0`, a source-load failure returns 503. Synthetic fixtures now require an explicit opt-in. |
| **F05 — duplicate confirmations/spurious unavailable estimates** | **Closed for original case** | First selection after reset has one confirmation. Local/upstream have no ESTIMATE_UPDATED; contradictory evidence has no alerts. Reselecting an incident exposes the separate history regression R01. |
| **F06 — alert eligibility/escalation** | **Partial — P2** | NORMAL/MODERATE is now eligible and agrees with PRE_STORM; RESTORED has its own suppression reason. The API adds escalation policy, but the customer card/type do not expose it. |
| **F07 — unsupported fields ignored** | **Closed** | Extra fields on select, advance and battery requests return 422. |
| **F08 — invalid inverter efficiency accepted** | **Closed** | Invalid efficiencies return 400; valid endpoints and zero usable energy pass. This does not certify every possible nonfinite battery input. |
| **F09 — whole customer projection permits internal IDs** | **Partial — P2** | `alert_plan.basis` is now generic, but an internal-ID sentinel supplied through the valid scenario context still reaches customer restoration assumptions. No actual raw household PII leak was found. |
| **F10 — no accessibility declaration control** | **Closed at source/API level** | A checkbox updates `mobility_accessibility_needs`; the backend accessibility guidance still works. Browser interaction not tested. |
| **F11 — missing programmatic labels** | **Closed at source level** | Matching `htmlFor`/`id` pairs exist for premise, capacity and load. This is not a full WCAG conformance certification. |
| **F12 — documentation/narration contradict build** | **Partial — P2** | Main workbook numbers and HUD description are corrected. Browser pass claims still conflict; the recording script remains pinned to the prior revision and describes missing controls now present. README still says 45 degrees/energized. |
| **F13 — coincident feeder equipment** | **Partial — P2** | Centers are distinct. Hit areas still intersect and extend outside the SVG view box; the radius/margins were not adjusted to preserve full targets. |

**Remaining concerns:** two P1 findings, four partially resolved P2 findings and one new P2 regression. No original P0 remains. Runtime browser verification is a separate outstanding evidence gate.

## Findings that prevent full closure

### F03 — P1: late validation failure commits invalid planning context

**Location:** `api/main.py:249–264`, especially assignment at line 260 before `generate_scenario` at line 262.

Fresh, unmodified-HEAD reproduction:

1. Select `confirmed_replacement` with default inputs.
2. Advance with `{"status":"RESTORED","access_hours":[3,1,2]}`.
3. Response is **500**, not a validation response. The snapshot remains OUTAGE at the same revision, but `_current_context.access_hours` becomes `[3.0,1.0,2.0]`.
4. Submit an otherwise valid `{"crew_size":6}` update. It also returns **500**, because it reuses the poisoned access range.

This is not the run-1 diagnostic annotation workaround: the defect is directly reachable at this HEAD. The request schema permits a list, and the range-order validation fails during calculation after context has already been saved. Catch calculation/validation errors and publish both context and snapshot only after all proposed values have succeeded. Add tests for late failures and the next valid request, not only invalid enum rejection. A valid select/reset or an explicit valid access override recovers the demo, but does not make the failed update atomic.

### F02 — P1: the visible hospital result is unconditional and not a source-bound decision

**Location:** `engine/scenarios.py:143–184`; `web/src/components/utility/PlanningPanels.tsx:48–63`.

The new panel is a material integration improvement. However, `hospital_service` is always created with 3 person-hours/one customer and `feeder_branch` with 6 person-hours/15 customers. `facility_count` is copied into output metadata **after** both plans are already computed; it does not determine task criticality, eligibility or membership.

For example, selecting transformer `ASSET-3D728064C2BE9061` yields **one dependent premise, zero associated facilities and zero hospitals**, but still enables a “hospital-first” result and says critical healthcare is restored at hour 1. The same happens on all four sample transformer anchors without facility records. Even the default selected fault affects three premises, while the comparison assumes 16 customers without identifying a separate footprint.

The unprioritized arm also adds a prerequisite from hospital work to feeder work that the priority arm does not have. The numerical result may still be feasible, but the comparison changes constraints as well as ordering. Neither the assumed 3/6 person-hours nor the 1/15-customer split is clearly presented as a separate illustrative workload; it is distinct from the sourced **8.973957**-person-hour replacement estimate.

Bind the comparison to a declared section/facility grouping supported by the selected context, or clearly present it as an independent hypothetical example. Expose its assumed work/customer values, preserve identical physical prerequisites across alternatives, and do not imply a hospital is attached to a zero-facility selected asset. A modest declared approximation is sufficient; no production switching model or optimizer is required.

### F09 — P2: generic alert basis fixes only one identifier path

**Location:** `engine/scenarios.py:135`; `engine/customer.py:273,280`.

Freshly generate replacement with `current_asset_id='PRIVATE-INTERNAL-SENTINEL'`, then call `project_customer_view`. The sentinel is absent from `alert_plan.basis`, **but remains in `restoration_planning.assumptions`**, which the customer page displays. The projection still copies those strings and `impact_source` wholesale.

Current normal API asset tokens are anonymized public tokens, so this does not establish a live PII breach. It establishes that the requested broader internal-ID boundary is not enforced by the projection. Use customer-safe structured explanations or explicit summaries for engineering assumptions rather than rely on one redacted sentence.

### F06 — P2: escalation policy is supplied but not shown to the customer

**Location:** `engine/customer.py:285–294`; `web/src/services/api.ts` alert-plan type; `web/src/pages/CustomerPage.tsx:286–296`.

The server eligibility fix passes: NORMAL/MODERATE now permits PRE_STORM updates, and RESTORED no longer uses the normal-service suppression reason. A server `escalation_policy` now exists. The frontend type still omits it and the card renders only eligibility, recipient, channel, cadence and suppression. A customer cannot read the added escalation condition. Add that field to the projected UI contract and card, keeping the existing simulation/no-delivery disclosure. The current wording describes proposed demo emergency-dispatch notifications; it does not prove actual emergency escalation.

### F13 — P2: offset symbols still have overlapping and out-of-bounds targets

**Location:** `web/src/components/map/FeederMap.tsx:123–148,173–184`.

Fresh server-side rendering of the **actual component** with the current API data produces nine different centers. That closes the exact-center collision. But the fixed radius is only **28 pixels**, while each hit circle has radius **22 pixels**:

- **Nine pairs** of hit circles intersect; center distances are about **32–39.60 pixels**, below their combined 44-pixel radius.
- Two hit circles extend outside the `0..640` SVG view box, reaching **x=-6** and **x=645**.

Thus the claim that markers no longer overlap and all targets retain their bounds is too broad. Size separation and projection margins for the complete hit areas, and keep selection/keyboard inspection working. This is an actual JSX-rendered SVG geometry check, **not** a measured 390px browser viewport or a claim about physical-device usability. The equipment dropdown remains a workaround.

### F12 — P2: the recording and verification documents are still inconsistent

**Location:** `docs/LAUNCH_CHECKLIST.md:89–91`; `docs/judge_evidence.md:40`; `docs/demo_script.md:5,23,50,80`; `README.md:25,41–42`.

The 25-kVA/three-worker/8.97-person-hour figures and current numeric restoration behavior are corrected in the main evidence notes. Remaining release inconsistencies are specific:

- Checklist says **13/13 browser cases passed**; judge evidence explicitly says browser execution is **not run/pending**. No current reproducible browser receipt is included in the tracked snapshot.
- The script accurately identifies its reviewed source as old commit `0ed0ac3`, but still directs a mobility API insert because there is no checkbox and calls priority scheduling a pure-engine insert without a dedicated screen. Both now have UI code. Update the recording plan for the release actually being filmed.
- README still calls the cutout's drop **45 degrees** and CLOSED **energized**. `OPEN.angle=-2.05` radians is about 117.5 degrees of modeled hinge rotation, and the interface deliberately does not assert live energization.

Attach revision-specific browser evidence or reopen that gate, and align recording text with verified current behavior. Historical script provenance is not itself a defect; treating it as the final current recording plan is the outstanding task.

### R01 — new P2 regression: reselecting the same incident discards visible notification history

**Location:** `engine/scenarios.py:196`; `api/main.py:173–190`; `engine/customer.py:178–207`.

After reset, select replacement: the response includes OUTAGE_CONFIRMED and its initial estimate update. Select the same scenario again without resetting: the new snapshot has **no notifications**. The generator creates a fresh empty list, while the shared notification state machine remembers the messages as already sent and suppresses re-emission. The customer history then says no alerts were dispatched even though the first selection did produce them.

Keep event history per incident/premise separately from duplicate-delivery suppression, or explicitly start a new replay identity when selecting a fresh demo. Do not reintroduce duplicate confirmations to preserve history. The first-selection duplicate defect F05 is closed; this is the separate history-retention regression.

## Source/calculation and privacy boundaries

Direct XML inspection again finds `Labor time material related!C21=1.1880851063829778`, `D21=0.80612765957446808`, and `Indirect Labor Multiplier!B1=4.5`:

`(C21 + D21) × 4.5 = 8.973957446808507 person-hours`.

The declared 25-kVA category average is not an observed asset rating or full structure work order. At crew 3/access 0 it yields 2.991319 hours; crew 6/access 2 yields 3.495660 hours. All 1,400 normal scalar API combinations preserve this basis. No multiplier is applied twice.

All 52 facility records remain present (5 hospital/37 fire/10 ambulance), with correct horizontal Web Mercator-to-WGS84 conversion, anonymous record tokens and no saved facility coordinates. Independently calculated nearest ordering and explicit upstream propagation pass. Public sample anchors remain generalized: two distinct anchors and **1–36 km rounded distances**, all explicitly ASSUMED, not verified service joins. Their mathematical consistency does not justify inventing a hospital branch on every selected transformer.

The risk rule passes all 81 combinations of its four 0–2-point levels and preserves UNKNOWN for missing/conflicting inputs. Thresholds remain declared, uncalibrated design assumptions. Existing sample/geometry/household privacy boundaries pass normal-data checks; no actual raw household PII or precise critical-facility geometry leak was found. Broader projection protection remains incomplete as described in F09.

## Sponsor and judging assessment

| AEP sponsor requirement | Current assessment |
|---|---|
| Risk estimate, context, factors and uncertainty | Supported as a disclosed rules-based prototype. No calibrated/live forecast claim. |
| Responsive restoration range and operations | Improved substantially: sourced range and real advance sensitivity work. Partial until late-failure atomicity and the facility/section comparison are corrected. |
| Personalized preparation | Supported for declared medical, medication, mobility and sump-pump needs at source/API level. Browser usability and changing risk/duration-sensitive advice are not fully demonstrated. |
| Eligibility and proactive communication | Improved eligibility, first-selection alerts and server policy. Partial because escalation is not shown and replay loses visible history. |
| Explainability, privacy and fallback | Good source/confidence/unknown disclosures and default fail-closed behavior. Partial whole-projection identifier boundary and ambiguous priority assumptions remain. |

| Official judging criterion | Evidence-based assessment |
|---|---|
| Innovation | Credible prototype combination of source topology, rule-based context, labor arithmetic and preparation; no novelty/market-superiority proof asserted. |
| Curiosity | Supported by negative controls, source checks and independent counterexamples. |
| Communication | Improved arithmetic and customer uncertainty; inconsistent recording/browser evidence still needs correction. |
| Project Breadth and Complexity | Strong multi-domain implementation; the displayed priority comparison still lacks a defensible relationship to selected source context. |
| Impact | Useful conditional planning can be demonstrated. A selected-facility restoration advantage and measured field benefits are not established. |
| Growth Mindset | Multiple concrete fixes and new regression tests are verified; these remaining failures show why passing counts alone cannot close the audit. |

These are evidence assessments, not official numerical scores, weights or prize predictions. Browser-dependent technical dimensions remain unscored in this run. Source-level label/accessibility changes are positive; bundle performance, mobile behavior and 3D/2D interaction still require measured verification. No trained model, live dispatch, real SMS service, perfect topology or globally optimal scheduler is demanded for this focused prototype.

## Submission and final gate

README/checklist retain the correct route: official **Google Form shared through Discord**, deadline **October 25, 2026, 10:00 a.m. EDT**, video **at most three minutes**, prerecorded presentation and Zoom Q&A. The [official overview](https://hackohio2026.devpost.com/) and [rules](https://hackohio2026.devpost.com/rules) were reopened in this run. Devpost entries do not qualify; prior work/event-built contributions must be disclosed.

Actual form access, final video duration/permissions, accepted receipt and assigned judging session were not verified. No external submission was performed. Fix the two remaining P1 issues, resolve the customer/map/evidence gaps, and verify the final recording path at its exact commit before declaring full pre-launch completion. Suggested frontend follow-ups are `$impeccable harden` for customer data/error presentation, `$impeccable adapt` for bounded touch targets, then `$impeccable polish` after behavior is verified.

## Private reproduction evidence

All artifacts are in `/Users/zaid/Larp-MAXXX/hive/agents/aj-mve9s7pw/`:

- `lrp131-snapshot-manifest.json`, `lrp131-source-verification.json`: exact commit/tree, 89 unchanged tracked-file hashes, current archive hashes.
- `lrp131-tests.log`, `lrp131-build.log`: fresh suite/build results.
- `lrp131-probes.py`, `lrp131-probes.json`, `lrp131-probes.log`: 1,400 sensitivity checks, closure counterexamples and scope/privacy/notification probes.
- `lrp131-calculations.py`, `lrp131-calculations.json`, `lrp131-calculations.log`: workbook XML, 52-record spatial checks and 81 risk combinations.
- `lrp131-map-ssr.cjs`, `lrp131-map-ssr.html`, `lrp131-map-ssr.json`, `lrp131-map-ssr.log`: actual component server-side rendering and target geometry analysis.
- `lrp131-ui-detector.json`: deterministic detector result.

Only `reviews/human5_prelaunch_audit_run2.md` is the requested integration artifact. No production fixes were made during this audit.
