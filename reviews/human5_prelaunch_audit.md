# Person 5 pre-launch audit — LoadShed Sentinel

**Executive verdict: INCOMPLETE.** The fixed release has a working source-scoped scenario calculation and a correctly sourced transformer labor baseline. It does **not** have functioning crew/access advance controls: their API endpoint returns HTTP 500. Critical facility data and priority scheduling remain disconnected in the delivered incident journey. Several checked-off release claims also fail fresh probes. Do not call this build fully complete before resolving the findings and repeating the release checks.

**Target:** `0ed0ac3fab903c1ab904117adabbfe0c59f4a70a`, requested HEAD of `/Users/zaid/Larp-MAXXX/hackathon`. Reviewed October 24–25, 2026. Audit only; no implementation, target Git state, live service or external submission was changed.

## Review basis and limits

The audit reconstructed the Git index's root tree hash and matched it to the requested commit, then verified and copied every tracked blob. All **88 tracked files** matched the working tree at capture. Tests and probes ran against that private snapshot. The three supplied archive SHA-256 values and the workbook hash were verified against actual local bytes. This avoids attributing later working-tree changes to the requested revision.

Reviewer: aj, assigned this Person 5 task. **Independence disclosure:** aj authored the earlier LRP-127 facility/risk changes. Those components received fresh, separately implemented projection, nearest-distance, path-propagation and scoring checks; this is independent verification methodology, not independent authorship. Existing tests were not treated as proof by themselves.

Read the supplied AEP Challenge Brief DOCX directly, including its five requirements and minimum demonstration. Reopened the [official event overview](https://hackohio2026.devpost.com/) and [rules](https://hackohio2026.devpost.com/rules). The linked Google rubric/guidebook could not be fetched during this run. The six published criterion names are verified from the event overview; no official numerical rating, weighting or award prediction is assigned. Earlier `reviews/human5_*` reports provide context, not fresh verification of their old claims.

Browser execution was attempted and blocked by this environment: the local isolated HTTP server could not bind (`EPERM`), and Chromium terminated on a denied macOS Mach-port registration. **No fresh screenshots, rendered 390px overflow measurement, touch gesture check or WebGL runtime pass is claimed.** No committed screenshot goldens were available as a substitute. This is a verification limit, not proof that those views fail.

## What passed

| Check | Fresh result | Practical boundary |
|---|---|---|
| Existing backend suite | **111 tests, 72 subtests passed**, no skips, exit 0 | One existing Starlette/httpx deprecation warning. The suite does not exercise the broken advance route. |
| TypeScript and production build | `npm run build`, exit 0; Vite 6.4.5, 1,982 modules, 2.36 s | JavaScript chunk 1,062.20 kB / 290.78 kB gzip; build warning about chunk size. This is not a browser/performance certification. |
| Four scenario selections | HTTP 200, source-scoped impacts, expected diagnostic distinctions | Modeled evidence and scenario field confirmation, not live observations. |
| Crew/access selection sensitivity | **700 combinations**: 4 scenarios × crew 2–8 × access 0–24, no mismatches | `POST /api/scenario/select` works; slider-driven `/advance` does not. Only replacement has a chosen repair package. |
| Workbook baseline | Direct XML reads reproduce **8.973957446808507 person-hours** | One declared 25-kVA replacement construction unit, not a verified GIS rating or complete structure bill of materials. |
| Critical facilities | All **52 source records** reproject and match independently calculated nearest anchors/path tags | Assumed links within the public slice, not verified feeders or observed facility outages. |
| Risk rule | **81 independent factor-level combinations** match expected bands; missing/conflicting inputs abstain | Declared prototype thresholds and scenario values, not calibrated probabilities. |
| Pure scheduling | A hospital task finishes at hour 1 instead of hour 3 when its criticality is supplied | Priority metadata is not supplied by the incident/API path. |
| Customer uncertainty | UNDER_REVIEW has unknown risk, no estimate and no confirmation/update alerts; explicit frontend review copy exists | Frontend rendering was source-reviewed, not exercised in a browser. |
| Battery arithmetic | Zero usable fraction gives zero Wh/hours; normal reference gives 6.02 theoretical / 5.12 conservative hours | Invalid inverter-efficiency inputs are silently accepted; see F08. |
| Evidence projection | Synthetic operator asset ID is excluded from `public_evidence`; only five allowed keys remain | Other customer fields can reintroduce an internal ID; see F09. |
| Submission instructions | README/checklist now give the correct form route, deadline and video limit | Actual Discord form, video duration/access and accepted receipt remain unverified. |

Environment: Python 3.13.15; FastAPI 0.162.0; Pydantic 2.14.1; pytest 9.1.1; httpx 0.28.1; Node 25.9.0; npm 11.16.0. Existing dependencies were used, not a fresh installation. Uvicorn is declared in requirements but absent from the inspected virtual environment. API tests use TestClient; no ASGI server startup is certified.

## Four-scenario results

| Scenario | Status / cutout | Dependent premises | Risk | Restoration at default crew/access |
|---|---|---:|---|---|
| `local_protection` | OUTAGE / OPEN | 3 | MODERATE | Unavailable: no selected repair construction unit |
| `upstream_feeder` | OUTAGE / CLOSED | 16 | MODERATE | Unavailable: no selected repair construction unit |
| `confirmed_replacement` | OUTAGE / OPEN | 3 | HIGH | 2.991319148936169 expected hours, crew 3 / access 0 |
| `insufficient_evidence` | UNDER_REVIEW / UNKNOWN | Unconfirmed; returned affected list empty | UNKNOWN | Unavailable |

Local diagnosis remains protection operation with equipment condition unconfirmed. Upstream diagnosis does not infer local transformer replacement. Replacement requires a **declared scenario** field confirmation, keeps crew approval false, and cites its workbook inputs. The contradictory case abstains correctly. Do not describe the first two cases as providing numerical restoration ranges at this revision.

### Workbook, spatial and risk detail

Direct workbook inspection found `Labor time material related!C21 = 1.1880851063829778` and `D21 = 0.80612765957446808`. `Indirect Labor Multiplier!B1 = 4.5`, with the instruction at A3 covering travel, safety discussion and setup. Thus:

`(C21 + D21) × 4.5 = 8.973957446808507 person-hours`

With six workers and two additional, non-overlapping access hours, the expected duration is **3.4956595744680845 hours**. All tested selection combinations preserve the same person-hours and apply the multiplier once. The workload is a component/category average; omitted associated hardware and assessment labor are disclosed. Workbook SHA-256: `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`.

The 52 records comprise **5 hospital, 37 fire and 10 ambulance** records. A separate forward Web Mercator calculation reproduces raw source coordinates from imported WGS84 points, maximum round-trip error below `1e-5` metres. An independent three-dimensional unit-sphere distance ordering reproduces the nearest anchors; explicit path membership reproduces every node's tag set. No facility coordinates appear in saved association records. The public sample uses generalized equipment geometry: **two distinct anchors, rounded distances 1–36 km**. This is an approximation ceiling, not evidence of actual service at those facilities. Record counts are not deduplicated physical sites or additional premise counts.

The rule uses four 0–2 point contributions: wind 35/65 km/h; ambient <=0 or >=35 C / <=-15 or >=40 C; load factor .85/1.10; health index <=70/<=40, with 100 healthy. Totals 0–2/3–5/6–8 map to LOW/MODERATE/HIGH. Drivers and confidence disclose the rule. Missing or conflicting data returns UNKNOWN. Thresholds are design assumptions. No current risk-input API control or trained/calibrated forecast is implied.

## Findings

Severity counts: **1 P0, 4 P1, 8 P2**. P0 blocks a requested demonstration path; P1 materially affects behavior, integration or accessibility; P2 has a narrower impact or workaround. There are no cosmetic P3 findings.

### F01 — P0: advance controls and OpenAPI fail with an incomplete request model

**Location:** `api/main.py:4,198–205`; `web/src/pages/UtilityPage.tsx:43–48`.

`AdvanceRequest.access_hours` references `Union`, but the module does not import it. Fresh `POST /api/scenario/advance` with `{"crew_size":6,"access_hours":2}` returns **500**; `GET /openapi.json` also returns **500**. Pydantic reports: `AdvanceRequest is not fully defined; you should define Union`.

The crew/access sliders call this exact route, so their successful build does not establish working sensitivity updates. Import/resolve the type and add actual HTTP advance and OpenAPI regressions. The existing six API tests omit both checks.

Minimal reproduction in the private snapshot:

```python
from fastapi.testclient import TestClient
from api.main import app
client = TestClient(app, raise_server_exceptions=False)
print(client.post('/api/scenario/advance', json={'crew_size': 6, 'access_hours': 2}).status_code)
print(client.get('/openapi.json').status_code)
# 500, 500
```

### F02 — P1: facility associations do not influence the delivered restoration decision

**Location:** `engine/scenarios.py:124–143`; `engine/restoration.py:130–138`; `engine/aep_impact.py:114`; `contracts/types.ts:86–97`.

The association catalog is real, and the pure scheduler handles `criticality` and `customer_count`. However, scenario construction passes one replacement package to the estimator; the created `repair` task has neither field. No API/frontend caller supplies section tasks, invokes staged readiness, or compares who restores first. Facility information exists in `impact_source`, but is absent from the frontend impact type and unused by its views.

The pure comparison is meaningful: one shared three-person crew, ordinary work 6 person-hours and hospital work 3 person-hours. Criticality changes the hospital's finish from hour **3 to 1**, while total completion stays 3 hours. That result is not delivered through the incident UI. Connect one declared limited-crew, multi-section example to the source-derived facility metadata and show both permissible sequences, restored-customer values and explicit authorization/blocker limits. A heuristic is sufficient; no optimal dispatch or real switching is required.

### F03 — P1: a rejected advance can mutate state without changing revision

**Location:** `api/main.py:218–252`.

**Diagnostic qualification:** F01 prevents normal HTTP access at HEAD. To inspect the underlying handler, only the missing type was resolved **in memory in a disposable probe process**; no source was changed and this is not counted as a passing HEAD control.

After selecting replacement, submit `{"status":"RESTORED","cutout_status":"INVALID"}`. The response is **400**, but current status changes **OUTAGE → RESTORED**, and revision stays **1**. Status is assigned before the later validation fails. Planning validation likewise occurs after status/cutout assignments. Validate the complete proposed update first, then publish a copied snapshot/context and increment revision atomically. Verify rejected requests leave state and notifications unchanged.

Direct UNDER_REVIEW → RESTORED also succeeds after that diagnostic type resolution and emits RESTORATION_COMPLETE without using the pure blocker helper. Treat it only as a manually declared demonstration transition; it does not prove staged release or utility authorization.

### F04 — P1: missing AEP input silently returns a synthetic outage

**Location:** `api/main.py:71–77`; `fixtures/scenario_fixture.json`.

With `AEPImpact.load` made to raise `FileNotFoundError` in an isolated process, `GET /api/scenario/current` returns **200**, `OUTAGE`, premise **P-DEMO-001**, asset **T-DEMO-104**, and `impact_source: null`. The broad startup exception handler substitutes the legacy fixture. This contradicts the normal source-scoped path's fail-closed policy and can disguise a broken data installation. Return a visible unavailable response; allow a synthetic fixture only through an explicit, disclosed demo selection.

### F05 — P2: scenario selection duplicates outage confirmation and invents an estimate update

**Location:** `engine/scenarios.py:153–155`; `api/main.py:173–181`; `engine/customer.py:177–207`.

After reset or a fresh process, each known-outage scenario selection returns **two OUTAGE_CONFIRMED** items and **one ESTIMATE_UPDATED**. The generator seeds confirmation, then the notification state machine adds another. The API also passes a declaration summary as if it were a changed estimate; local/upstream have no estimate at all. UNDER_REVIEW correctly emits none.

Give one component ownership of confirmation and trigger estimate updates from a changed, available canonical range. Add fresh/reset/reselection and changed-crew tests at the API boundary. The checklist's duplicate-alert item is not closed by this revision.

### F06 — P2: alert eligibility disagrees with the pre-storm trigger and omits escalation

**Location:** `engine/customer.py:162–175,273–286`; `web/src/pages/CustomerPage.tsx:285–297`.

For NORMAL status with MODERATE risk, the card returns `eligible: false` and “Normal service operating conditions,” while the same state machine produces **PRE_STORM**. The plan includes recipient/channel/cadence but no explicit escalation trigger; RESTORED also receives the normal-service suppression reason. Derive eligibility/reasons from the same documented policy as notifications and supply a concise uncertainty/emergency escalation condition. Real delivery and real contact verification are not required; the UI already discloses their simulation.

### F07 — P2: unsupported planning/risk request fields are silently ignored

**Location:** `api/main.py:143–148,198–205`.

Selecting replacement with `damage_quantity:3` or an additional `risk_inputs` object returns **200** and the same range/risk. These are not supported request fields, but default Pydantic extra-field handling discards them. A caller can believe an operating assumption was applied when it was not. Reject unsupported fields, or implement/document their meaning. This finding does not require expanding scope to add every possible input.

### F08 — P2: invalid battery efficiency is accepted despite a checked rejection requirement

**Location:** `api/main.py:297–313`; `engine/customer.py:57–78`; `docs/LAUNCH_CHECKLIST.md:20–22`.

The zero-usable-energy fix passes. The normal formula also passes: `1000 × .85 / (120/.85)`, then a .15 reserve, gives **6.02 / 5.12 hours** after rounding. But inverter efficiencies **-1, 0, .1 and 1.5 all return HTTP 200**. Nonpositive inputs collapse to zero; other invalid values clamp to .5 or 1.0. Validate finite ranges at the boundary and reject invalid entries rather than report a seemingly valid estimate. The checked item currently promises rejection in `.5..1.0`.

### F09 — P2: evidence allowlisting does not make the whole customer projection safe for internal identifiers

**Location:** `engine/customer.py:261,268,279`; `engine/scenarios.py:135`.

`public_evidence` correctly excludes `asset_id`. However, `alert_plan.basis` interpolates `snapshot.current_asset_id` directly; a synthetic internal-ID sentinel survives unchanged in that customer field. Restoration assumptions and all `impact_source` fields are also copied wholesale. Current canned asset tokens are anonymized public tokens, and this audit found **no raw household PII or precise facility-coordinate leak**. The narrower defect is the advertised whole-payload internal-field boundary: evidence filtering alone does not enforce it. Project customer-safe summaries and retain public topology identifiers only where intentionally allowed.

### F10 — P2: residential users cannot declare accessibility needs in the UI

**Location:** `web/src/pages/CustomerPage.tsx:38–49,304–337`; `engine/customer.py:107–114`.

The backend produces actionable ACCESSIBILITY guidance when requested. The page initializes `mobility_accessibility_needs` to false and exposes controls only for life-critical devices, refrigerated medicine and sump pumps; there is no control that changes the accessibility field. Expose that declaration so the supported guidance can reach the intended customer. No inference of disability is needed.

### F11 — P1: customer battery fields lack programmatic labels

**Location:** `web/src/pages/CustomerPage.tsx:375–389`.

The visible capacity/load labels are sibling elements without `htmlFor`, and the inputs have no matching `id`, wrapping label, `aria-label` or `aria-labelledby`. Assistive technology cannot reliably associate the question with each numeric field. Associate them explicitly; check the resulting accessible names and keyboard path. This is a source-verifiable labeling defect under WCAG 1.3.1/4.1.2, not a claim of a completed accessibility conformance audit. The premise field also relies on adjacent text/placeholder rather than an explicit label association.

### F12 — P2: release narration and completion claims contradict the fixed build

**Location:** `README.md:25–27,41–44`; `docs/judge_evidence.md:36,99`; `docs/demo_script.md:47`; `docs/LAUNCH_CHECKLIST.md:13,19,54–56,74–76,87`.

README still describes a 50-kVA replacement/four-person crew and healthy local transformer, while the implemented sourced package declares **25 kVA**, defaults to three workers, and leaves local equipment condition unconfirmed. Judge notes still advertise **2.25/4.5/9-hour** ranges and illustrative 1/3/6 direct hours; current ranges are unavailable/unavailable/**2.9913**. The script calls the workbook example separate although it is now integrated. README's oil-temperature/vibration/load/weather HUD description also exceeds the actual protective-cutout, modeled battery and solar/communications HUD.

The checklist marks duplicate suppression, advance sensitivity and a 13-case browser pass complete, while fresh API probes contradict the first two and no reproducible current browser receipt is checked in. Historical evidence may exist elsewhere; this audit cannot certify it. Rewrite narration around actual outputs, attach revision-specific receipts, and reopen failed gates before recording.

### F13 — P2: generalized feeder points collapse distinct selectable assets onto two targets

**Location:** `web/src/components/map/FeederMap.tsx:69–75,146–156`; public GeoJSON from `engine/aep_impact.py`.

The current map has **9 point features at only 2 distinct coordinates** (groups of 4 and 5). The projection uses only coordinate values, so those assets produce identical SVG centres and overlapping hit circles/labels. The equipment inspector dropdown remains a workaround, but direct tapping cannot distinguish coincident symbols. Cluster or deliberately separate schematic symbols while preserving the generalized-coordinate disclosure. This is a deterministic source/data finding; the rendered severity and mobile appearance still need browser verification.

## Frontend and visual QA status

| Surface | Verified from source/build | Still unverified |
|---|---|---|
| Mobile layout | `min-width:0`, wrapping tokens/navigation, one-column breakpoints, 44px utility controls and native range inputs exist | Actual 390px `scrollWidth <= clientWidth`, clipping, zoomed text, touch slider/orbit interaction and nav/customer target measurements |
| FeederMap | Validates GeoJSON, bounds fit, labels schematic links, keyboard/select inspection and retry/unknown states exist | Actual tap/hover/focus behavior and visual overlap; source collision is F13 |
| 3D / 2D model | Common OPEN/CLOSED/UNKNOWN mapping; unknown position omitted; demand rendering, reduced-motion handling, camera buttons, error/context-loss fallback exist | GPU rendering, context-loss recovery, orbit/zoom/touch and state transitions in a mounted browser |
| Telemetry HUD | Reads current incident/asset cutout evidence; labels modeled battery/solar; finite battery guard | Rendered legibility, viewport behavior and GPU/UI synchronization |
| Customer console | Explicit UNDER_REVIEW text, risk confidence, planning assumptions/disclosure and server alert-plan fields are rendered in source | Mounted scenario/revision synchronization and final visual/accessibility checks |

Impeccable's deterministic detector returned `[]`; this is not proof of accessibility, semantic correctness or rendered quality. A provisional **code-review-only technical score is 10/20**: accessibility 2, performance 2, responsive design 2, theming 2, implementation integrity 2 (each /4). It is not the competition rubric or a browser-based health score. Existing utility tokens, fallback design and keyboard controls are useful; labels, map collisions, heavy bundle and blocked behavior limit the score. A dark-mode switch is not required for this fixed dark interface.

## Sponsor requirements and competition rubric

| AEP requirement | Verdict at this revision | Evidence |
|---|---|---|
| Outage risk/context/explanation | Supported as a declared prototype rule | Known sample context, scored factors, confidence label and UNKNOWN fallback; no calibrated or live prediction claimed |
| Credible, responsive restoration range | Partial | Sourced replacement arithmetic and select sensitivity work; advance control fails and no section/criticality comparison reaches the user |
| Personalized preparation | Partial | Medical/medicine/pump guidance exists; accessibility is backend-only and guidance is driven by needs rather than changing risk/duration |
| Eligibility/proactive communications | Partial | Demo messages and a plan exist; duplicate/declaration updates, policy mismatch and missing escalation remain |
| Explainability/privacy/fallback | Partial | Good uncertainty/source disclosures and evidence allowlist; synthetic startup fallback and broader internal-ID projection remain |

| Official criterion | Evidence assessment | What can be presented honestly |
|---|---|---|
| Innovation | Supported at prototype level | An explainable combination of topology, declared context risk, sourced labor and preparation; no independent novelty/market superiority claim |
| Curiosity | Supported | Negative/unknown controls and fresh investigations expose missing joins, input and integration problems |
| Communication | Partial | Clear uncertainty and calculation factors exist; stale narration and unverified final rendering weaken the story |
| Project Breadth and Complexity | Supported, integration incomplete | Graph/GIS, equipment modeling, labor scheduling, customer needs and API/UI layers are implemented; criticality is still a separate component |
| Impact | Partial | A useful assumed decision aid can be explained; no measured outage reduction, operational deployment or delivered criticality-order benefit is established |
| Growth Mindset | Partially evidenced | Source-backed labor and uncertainty improvements respond to earlier findings; closing this audit's real route failures with demonstrable behavior is still required |

A rule-based focused prototype is acceptable under the Challenge Brief. Lack of live OMS/SCADA, real SMS delivery, a trained model, perfect topology, complete pole hardware quantities or an optimal scheduler is **not** treated as a defect by itself. The unresolved defects concern the actual advertised journey and its evidence.

## Submission and release decision

README and checklist correctly require the **official Google Form distributed through Discord**, a deadline of **October 25, 2026, 10:00 a.m. EDT**, and a video of **at most three minutes**. Devpost entries do not qualify. Prerecorded video plus assigned Zoom Q&A and disclosure of prior work/event-built contributions match the [official overview](https://hackohio2026.devpost.com/) and [rules](https://hackohio2026.devpost.com/rules).

**Not established:** actual form URL/access, completed submission, confirmation receipt, final recording duration/permissions, assigned judging session or prior-work disclosure content. Documentation correctness does not establish submission completion.

Before calling the release complete: fix F01 and atomic/fallback behavior; connect one criticality-aware comparison; correct alert behavior and customer inputs/labels; reconcile narration; rerun a fresh route-level regression suite; then use an environment that can run Chromium to measure 390px overflow and exercise all four scenarios, sensitivity, customer synchronization and 2D/3D fallback. Record the exact tested commit and receipts. Suggested frontend follow-up commands are `$impeccable harden` for labels/error behavior, `$impeccable adapt` for measured mobile behavior, then `$impeccable polish` after functional fixes.

## Reproduction artifacts

Private audit workspace: `/Users/zaid/Larp-MAXXX/hive/agents/aj-mve9s7pw/`.

- `lrp130-snapshot-manifest.json`: exact commit/tree and 88 tracked-file hashes; unchanged after verification.
- `lrp130-tests.log`, `lrp130-build.log`: fresh suite/build receipts.
- `lrp130-probes.py`, `lrp130-probes.json`, `lrp130-probes.log`: 700 API selections, source workbook arithmetic, 52-record spatial verification, 81 risk combinations, priority/authorization checks and diagnostic mutation probes.
- `lrp130-extra-probes.py`, `lrp130-extra-probes.json`, `lrp130-extra-probes.log`: source-load fallback, pre-storm policy mismatch, evidence allowlist and actual archive hashes.
- `lrp130-browser-limitations.json`, `lrp130-server.log`: explicit runtime verification limits.
- `lrp130-ui-detector.json`: detector output, not a browser pass.

The report is the requested integration artifact. Support scripts/logs and the isolated snapshot are review evidence, not production changes. No findings were repaired during this audit.
