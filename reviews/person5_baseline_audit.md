# Person 5 baseline and regression audit — unified main

**Implementation integrity: FAIL. Baseline established; final demo readiness is not signed off.**

Audited revision: **`1ee72a24eea12b140182cb8f7ddd9cf83d2509d6`**, PR #4 integration. Audit date: **2026-10-25**, owner Bob, task **LRP-145**. This report records the pinned baseline, not subsequent polish. No production fixes were made during this audit.

The engine, privacy projection, workbook calculation, session isolation, and restoration gates pass the checks below. The integrated interface introduces five major findings: unsupported comparator claims, hash-route navigation loss, an older response replacing the latest selection, unreadable customer content, and disconnected feeder-map styles. Passing component tests do not establish presentation readiness.

## Executive assessment

| Severity | Count | Disposition |
|---|---:|---|
| P0 — complete application blocker | 0 | None found in the tested scope |
| P1 — major | 5 | F01–F05; resolve before final presentation |
| P2 — smaller scoped issue | 3 | F06–F08; documentation, semantics, initial payload |
| P3 — polish | 1 | F09; narrow controls and badge wrapping |

The six failed assertions in the primary browser matrix are reproducible product findings, not six separate root causes. Two are the same hash-routing defect; two concern the comparator. Additional contrast and feeder findings came from screenshot review, computed styles, and source matching.

### Technical quality score

The Impeccable audit workflow informed the technical review. Scores are a bounded engineering assessment, not a certification or a replacement for the readiness verdict.

| Dimension | Score / 4 | Evidence |
|---|---:|---|
| Accessibility | 2 | Labels and status announcements exist; customer contrast fails severely, landmarks are inconsistent, hash skip links lose the view |
| Performance | 2 | Scene is partly lazy loaded and has detail/fallback controls; initial JavaScript remains 1,182.06 kB |
| Responsive design | 3 | All four surfaces fit 390 px and 1440 px; smaller controls remain, physical touch untested |
| Theming | 1 | Paper tokens coexist with hardcoded dark customer colors; map stylesheet does not match its markup |
| Implementation integrity | 1 | Comparator asserts results the evidence cannot establish; async ordering and route integration regressions |
| **Total** | **9 / 20** | **Poor — major integration corrections required** |

## Baseline identity and method

The canonical repository was clean at audit start and pointed to the revision above. Its tracked application, test, data, and documentation files were archived into an isolated writable snapshot: **146 files**, with per-file SHA-256 recorded in [baseline.json](person5_baseline_audit/receipts/baseline.json). Existing installed dependencies and the raw challenge workbook were reused; no dependency installation or upgrade was performed. Node was **v25.9.0**, Python **3.13.15**, Vite **6.4.5**.

Canonical frontend output paths are outside this agent's write permissions. The requested commands were attempted there, with their actual failures retained, then completed against the identical archived source in the writable snapshot. This distinction matters: a write-permission failure is an execution constraint, not an application test failure.

The browser harness mounted the **actual built Root/App and all four pages**. It served production assets through Playwright request interception and passed API requests to the snapshot's real FastAPI application using a persistent Python TestClient subprocess. It did not replace the incident engine with canned snapshots. Fault cases deliberately injected API failures or delayed responses. This verifies integration within that transport, not a deployed HTTP server, proxy, or internet environment.

Chromium ran outside the restricted sandbox with software graphics, reduced motion, and emulated **1440 × 1000** and **390 × 844** viewports. All 16 primary screenshots were opened and reviewed. Four supplemental captures were also opened and reviewed; all **20** retained screenshots were inspected. The local launch denial is retained in `local-browser-attempt.log`; it was resolved by external execution, not by skipping browser verification.

Concurrent polish began in the canonical working tree after snapshot creation. The later tree still had HEAD `1ee72a2` but modified customer, comparator, 3D, stylesheet, and Vite files. Those uncommitted changes are **outside this report's verdict** and were not overwritten or assumed to fix any finding.

## Required verification receipts

| Requested check | Canonical result | Identical snapshot result / interpretation |
|---|---|---|
| `.venv/bin/pytest -o pythonpath=. -q tests/` | **Exit 0: 137 passed; 72 subtests passed**, 5.98 s | Ran with `PYTHONDONTWRITEBYTECODE=1`; no suite skipped |
| `cd web && npm test` | Exit 1: EPERM writing `dist-test` | **Exit 0**: component/API checks and **12/12 customer dashboard regressions** |
| `cd web && npm run build` | Exit 1: EPERM writing `.vite-temp` | **Exit 0**: TypeScript + Vite production build, 3.73 s |
| `python3 verification/verify_script.py docs/demo_script.md` | Assertions complete, then EPERM writing `verification/timecodes-and-words.json` | **Exit 0: 400 words, 180 planned seconds**, four contiguous speaker segments |
| Additional engine/API/workbook probe | Snapshot engine + actual FastAPI TestClient | **13/13 cases passed** |
| Primary full-app browser matrix | External Chromium on pinned snapshot | **13/19 passed; 6 product assertions failed**, timestamp `2026-10-25T12:29:22.963Z` |
| Supplemental browser checks | External Chromium on pinned snapshot | **3/4 distinct cases passed; map styling failed**; corrected planning rerun passed at `2026-10-25T12:42:45.999Z` |
| Impeccable deterministic detector | Pinned frontend source | One contextual low-impact warning: `transition: width` on a small preview chapter underline |

Logs: [canonical pytest](person5_baseline_audit/receipts/canonical-pytest.log), [canonical frontend attempt](person5_baseline_audit/receipts/canonical-frontend-test.log), [canonical build attempt](person5_baseline_audit/receipts/canonical-build.log), [canonical script attempt](person5_baseline_audit/receipts/canonical-demo-script.log), [frontend pass](person5_baseline_audit/receipts/snapshot-frontend-test.log), [production build](person5_baseline_audit/receipts/snapshot-build.log), [script verification](person5_baseline_audit/receipts/snapshot-demo-script.log), [13-case probe](person5_baseline_audit/receipts/backend-probe-results.json), [browser matrix](person5_baseline_audit/receipts/browser-audit.json).

Warnings: pytest reports a Starlette/httpx deprecation and two denied cache writes; Vite reports its large-chunk warning. Frontend test logs contain environment color/localStorage warnings. These did not fail the successful runs. The initial browser run had four locator errors; corrected locators produced the final matrix above. Initial custom probe assumptions about rounded numbers, zero-load responses, and public anonymous tokens were corrected against the actual contract; they are not product defects.

### Script timing verification

| Speaker | Slot | Planned duration | Spoken words | Narration / silent hold |
|---|---|---:|---:|---:|
| Person 1 — Data & Topology | 00:00–00:40 | 40 s | 89 | 38 / 2 s |
| Person 2 — Twin & Labor Engine | 00:40–01:25 | 45 s | 95 | 43 / 2 s |
| Person 3 — Utility Interface & Controls | 01:25–02:15 | 50 s | 109 | 48 / 2 s |
| Person 4 — Customer Concierge & Orchestration | 02:15–03:00 | 45 s | 107 | 43 / 2 s |
| **Total** | **00:00–03:00** | **180 s** | **400** | **172 / 8 s** |

Four `[UI Variation Note]` tags remain. The verifier counts whitespace-delimited words in the quoted narration and validates planned timecodes. It does not measure recorded video duration, validate the freshness of UI instructions, or validate narration claims. It also ignores the command-line filename and always reads its repository's `docs/demo_script.md`; that is the requested file here, so this receipt is valid for this audit.

## Claim and provenance matrix

| Requirement | Engine / source evidence | Integrated presentation verdict |
|---|---|---|
| 16-premise anonymized interactive sample | Public bundle/API: **16 premises, 12 equipment nodes** | Pass in landing disclosure, incident bar, operator brief, footer; comparator's local count is hardcoded — F01 |
| Offline path scale | Graph summary: **117,549 accepted paths**; full preprocessing is separate | Scope distinction is visible; no territory-wide live outage count verified |
| Workbook labor baseline | Independent XML read reproduces **8.973957446808507 person-hours**, multiplier applied once | PlanningPanels separates labor from elapsed hours; comparator rebrands replacement effort as avoided work — F01 |
| Modeled telemetry | Scenario evidence has `scenario` / `modeled_sensor` provenance, not live feeds | HUD says **Modeled Simulation** and explains no live SCADA; comparator's physical confirmation language contradicts it — F01 |
| Facilities | **52 associations: 5 hospitals, 37 fire, 10 ambulance; all ASSUMED** | Disclosure and priority panel state assumed associations; proximity does not establish electrical service |
| Epistemic abstention | Scenario 4: UNDER_REVIEW, UNKNOWN risk/cutout, empty footprint, unavailable duration, no confirmed-outage notification | Brief, HUD, diagnosis, planning preserve uncertainty; comparator continues asserting dispatch/energization results — F01 |
| Repair/authorization gates | Premature RESTORED: 400; blockers cleared without authorization: 400; both satisfied: 200/CLOSED | Review-only work package and unapproved crew labels remain; no real dispatch authority established |
| Customer privacy | Operator-only records/private assumption tokens excluded; known/unknown lookups bounded | Public anonymous `ASSET-*` tokens in source metadata are intentional, not private utility identifiers |
| Session separation | Independent X-Session-ID state and reset pass | Headers attached by frontend service; session IDs are demo state keys, not proof of authentication or durable production tenancy |
| Physical connectivity boundary | Supplied trace ends at circuit breaker; physical substation remains UNKNOWN | SupplyPath placeholder respects unknowns, but its section description overstates transmission coverage — F06 |

### Independent labor calculation

Raw workbook SHA-256: `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`.

```text
C21 = 1.1880851063829778
D21 = 0.8061276595744681
(C21 + D21) × 4.5 = 8.973957446808507 person-hours
8.973957446808507 ÷ 3 = 2.991319148936169 elapsed labor hours
```

This is the **declared 25-kVA category example**, not a measured rating for the selected GIS transformer or a dispatched job. Six workers and zero access delay produce **1.4956595744680845 h**; six workers and two access hours produce **3.4956595744680845 h**. Customer and operator planning values agree in the API probe. A stale revision returns 409 and leaves the accepted snapshot unchanged.

The facility associations use nearest transformers **within the selected slice**, generalized equipment positions, and unions of supplied upstream paths. Distant matches are retained and rounded; they are not a verified utility feeding relationship. The priority comparison is an illustrative schedule, not evidence that switching the mapped breaker restores a hospital.

### Engine/API negative controls

| Case | Verified result |
|---|---|
| Local protection | OPEN; default 3 affected sample premises; diagnostic troubleshooting recommendation; no sourced repair duration |
| Upstream interruption | CLOSED; 16 affected sample premises; feeder/protection investigation; no local replacement inferred |
| Replacement | OPEN; scenario-supplied confirmation; workbook workload; conditional planning duration; crew approval false |
| Contradictory evidence | UNKNOWN; no claimed footprint or repair duration; no OUTAGE_CONFIRMED notification |
| Every selectable transformer | Footprints **1, 1, 4, 3, 5, 2**, contradicting a universal count of three |
| Battery reserve | 1000 Wh, 85% usable, 120 W, 85% inverter efficiency, 15% reserve → **6.02 theoretical h / 5.12 conservative h**, 850 Wh usable, 141.2 W effective load |
| Battery boundaries | Zero usable capacity and zero load return bounded zero results; negative capacity rejected (400); customer UI separately suppresses invalid/no-battery estimates |
| Privacy injection | Private current asset and private assumption token sanitized; operator-only evidence excluded; safe record fields limited to id/kind/value/unit/label |
| Lookup unknown | Unrecognized premise returns UNKNOWN; known trace ends at Circuit Breaker, substation UNKNOWN |
| Alert delivery | Notifications remain demo previews; escalation policy discloses simulation; no actual delivery performed |

These are source/contract and deterministic simulation checks. They do not verify physical sensors, clinical advice, real outage states, or field restoration.

## Surface and runtime matrix

| Surface / interaction | Result | Receipt / scope |
|---|---|---|
| Landing desktop and mobile | Pass | Dusk hero, hardware, source ledger, scenarios, both audience links render; no document overflow |
| Primary landing navigation | Pass | Operator then customer reached through actual shared shell |
| Operator desktop and mobile | Pass for loading/layout | Decision brief, evidence, HUD, planning, supply path, map and comparator mount; content failures listed separately |
| Customer desktop and mobile | Pass for loading/layout | Status, priorities, battery and preview mount; **contrast failure remains** |
| Sentinel desktop and mobile | Pass for loading/layout | Hero and inspection canvases render; no uncaught page errors |
| `#/operator` next-action anchor | **Fail — F02** | `#utility-work-heading` replaces route; landing page mounts |
| `#/customer` household anchor | **Fail — F02** | `#household-plan` replaces route; concierge disappears |
| Scenario 4 comparator | **Fail — F01** | UNDER_REVIEW still shows energization confirmation, prevented misdispatch and required dispatch |
| Alternate selected asset | **Fail — F01** | Brief says 1 of 16; active comparator says 3 premises |
| Rapid scenario selection | **Fail — F03** | Latest request upstream; final displayed heading replacement after delayed older response |
| Household persistence + battery recovery | Pass | Medical, refrigerated medication, mobility persist across reload; retry succeeds; zero load clears estimate; no-battery state explicit |
| Initial API failure | Pass | Clear connection error and working Retry connection |
| Operator 3D / 2D control | Pass | Diagram switch preserves usable fallback |
| Sentinel OPEN/CLOSED/UNKNOWN | State assertions pass | DOM status agrees with selected preview control; unknown renders an unasserted-position visual |
| Sentinel Back to console | **Fail — F02** | Destination `#` returns landing |
| No WebGL on mobile | Pass | Readable procedural diagram fallback remains |

The eight basic surface cases check visible input labels, duplicate IDs, exact document width, and absence of uncaught page errors. They do **not** assert semantic truth, contrast, or actual touch gestures. All widths matched their 1440 px / 390 px viewport. Browser observations list smaller targets separately; absence of horizontal overflow does not prove touch usability.

Primary evidence: [landing](person5_baseline_audit/screenshots/landing-desktop.png), [mobile landing](person5_baseline_audit/screenshots/landing-mobile.png), [operator](person5_baseline_audit/screenshots/operator-desktop.png), [mobile operator](person5_baseline_audit/screenshots/operator-mobile.png), [customer](person5_baseline_audit/screenshots/customer-desktop.png), [mobile customer](person5_baseline_audit/screenshots/customer-mobile.png), [Sentinel](person5_baseline_audit/screenshots/sentinel-desktop.png), [mobile Sentinel](person5_baseline_audit/screenshots/sentinel-mobile.png).

## Findings

### F01 — P1: Comparator overrides the evidence with fixed dispatch and savings claims

**Category:** implementation integrity / claim provenance. **Location:** `web/src/components/utility/CounterfactualCompareCard.tsx:78–134`; `web/test-frontend.mjs:130–143`.

The card always presents an OPEN local cutout, **3 premises**, a fuse-link crew, a CLOSED upstream device, **16 premises**, and a substation patrol. Only the active pill changes with the selected scenario. For `ASSET-253FD0B7C3F209A9`, the actual incident brief and engine report one sample premise; the active card still says three. The six valid transformer footprints vary from one to five. An OPEN cutout does not itself establish a blown fuse or a replacement requirement.

The unconditional banner says misdispatch was prevented and cutout telemetry confirms transformer energization. It claims about **8.974 saved person-hours** and an **estimated $12,000 deployment cost** per false incident. The workbook establishes replacement workload, not avoided effort. No calculation, calibrated counterfactual, dispatch event, or cost source supports the stated savings. The estimated qualifier does not supply a cost model. The repository's own release claim ledger excludes financial figures from the presentation and requires operator review.

**Reproduction:** select Scenario 4 or a one-premise transformer. The surrounding brief correctly abstains or updates the footprint while C-02 keeps the same operational conclusions. See [abstention](person5_baseline_audit/screenshots/operator-abstention.png) and [alternate asset](person5_baseline_audit/screenshots/operator-alternate-asset.png).

**Impact:** the flagship feature directly contradicts the application's evidence boundary and suggests certainty before diagnosis. It appears before telemetry and uncertainty, so the judge encounters unsupported conclusions first.

**Recommendation:** `$impeccable clarify` then `$impeccable harden`: describe a conditional comparison, bind active counts/evidence/capabilities to the selected asset, separate illustrative alternatives from accepted facts, suppress conclusions under review, and remove unsupported savings/energization claims. Retain 8.974 only as the declared replacement workload. Replace tests that assert the presence of $12,000 and fixed 3/16 counts with state- and source-sensitive negative controls. No external standard is asserted; this violates the project's Person 5 claim rules.

### F02 — P1: Local anchors discard supported hash routes

**Category:** navigation / accessibility. **Location:** `web/src/app/router.tsx:7–16`; `components/utility/DecisionSummary.tsx:40`; `pages/UtilityPage.tsx:91–95`; `components/customer/CustomerDashboard.tsx:63`; `components/shell/AppFrame.tsx:10`; `pages/SentinelPreviewPage.tsx:27` (paths relative to `web/src`).

At pathname `/`, route recognition depends on `#/operator` or `#/customer`. A plain local fragment overwrites that route, and normalization falls back to landing. Clicking “Review work package” from the requested `#/operator` route goes to `/#utility-work-heading`; clicking “Update household needs” from `#/customer` goes to `/#household-plan`. The same source pattern affects review navigation and skip links. Pathname routes do not rely on that fragment and provide a workaround. Separately, the preview's “Back to console” is `href="#"` and returns landing even though the label promises the console.

**Impact:** the main next-action controls eject users from their task; keyboard bypass links are also affected by the routing design. [Captured landing after operator action](person5_baseline_audit/screenshots/operator-hash-anchor-result.png).

**Recommendation:** `$impeccable harden`: use a route-preserving scroll/focus action, or unify supported route and fragment handling. Point the preview back link at an actual operator route. Exercise each anchor and skip link from both pathname and documented hash entry points, plus back/forward behavior. The preview destination alone is P2; it is grouped here as the same navigation repair area.

### F03 — P1: Older scenario responses can replace the latest operator selection

**Category:** state integrity. **Location:** `web/src/app/incident.tsx:63–120`; comparator buttons `CounterfactualCompareCard.tsx:33–62`.

`chooseScenario`, asset selection, reset and snapshot publication commit results without a request-generation guard. Native incident selectors disable while busy, but comparator actions remain callable. Browser reproduction selects replacement, delays that response 1000 ms, then uses the comparator to select upstream with a 20 ms response delay. The API processes the requests in order; response delivery is reordered. The final UI returns to **Transformer replacement assessment** despite the latest request being upstream. [Race capture](person5_baseline_audit/screenshots/operator-response-race.png).

**Impact:** the console can display an older incident than the latest requested/server state, affecting all downstream views and planning context. The existing customer hook's stale-response tests do not cover this shared provider.

**Recommendation:** `$impeccable harden`: consistently gate publication, errors and busy/finally handlers by the active request generation; coordinate scenario, asset, reset and planning writes. Disable all competing selectors while pending if that is the intended interaction policy. Add a real-provider out-of-order regression, including an obsolete error response. A request abort alone does not establish ordering of already committed backend mutations.

### F04 — P1: Customer text fails contrast after integration into the paper shell

**Category:** accessibility / theming. **Location:** `web/src/components/customer/customer.css:1–20`; `web/src/styles/base.css:27–35`; `web/src/styles/tokens.css:29`; comparator label rule in `components/utility/utility.css:290`.

Customer sections inherit a pale `#f3f1fa` canvas, while headings use `#f8fafc` and body copy uses `#cbd5e1`. Their containers do not supply the dark backgrounds assumed by those foregrounds. Dark service/checkbox cards remain readable, but headings, household guidance, battery explanations and notification copy are nearly invisible. This is visible on both desktop and mobile, including after medical/mobility selection.

| Computed foreground / background | Sample | Contrast |
|---|---|---:|
| `#f8fafc` / `#f3f1fa` | Customer heading, battery heading, next-step heading, alerts heading | **1.069:1** |
| `#cbd5e1` / `#f3f1fa` | Customer introductory copy | **1.327:1** |
| `#64748b` / `#0d1721` | Comparator 11 px metric labels | **3.799:1** |

Computed colors were read from the mounted page and nearest opaque ancestor, then evaluated using relative luminance. These are solid backgrounds in the inspected regions. Operator source-legend and supply-path helper copy also appear dark on the dark panel in the screenshots; include them in the same surface-aware contrast sweep, without treating the sampled ratios as a full-page inventory. Ratios fall below the **4.5:1 ordinary-text** or **3:1 large-text** minima in [WCAG 2.2, Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This is a scoped contrast failure, not a complete WCAG conformance assessment. [Measured values](person5_baseline_audit/receipts/measured-contrast.json), [customer capture](person5_baseline_audit/screenshots/customer-desktop.png), [priority guidance](person5_baseline_audit/screenshots/customer-needs-and-recovery.png).

**Recommendation:** `$impeccable colorize`: pair foreground/background tokens within each actual surface, including transparent sections, help text, links, and error states. Re-measure computed contrast after integration and check both viewport sizes; component-only render tests cannot catch this inherited background regression.

### F05 — P1: Feeder stylesheet selectors do not match the rendered map

**Category:** theming / implementation integrity. **Location:** `web/src/components/map/feeder-map.css:1–160`; `web/src/components/map/FeederMap.tsx:155–206`.

The stylesheet defines `.feeder-body`, `.feeder-svg`, `.feeder-hit`, `.feeder-symbol`, `.feeder-node`, etc. The component emits **`.utility-feeder-*`** throughout. State selectors also differ: CSS expects `data-state` / `data-current`, while markup emits state/current classes. Thus SVG hit regions fall back to opaque black fill, symbols lose their intended stroke/fill, labels are dark on a dark panel, and selection/state styling is absent. Both primary operator captures show the black circles. A supplemental browser measurement confirms the hit-region fill is `rgb(0, 0, 0)` and both its stroke and the symbol stroke are `none`. This is broader than previously documented label crowding.

**Impact:** the map mounts and remains selectable but fails to communicate equipment types, selected asset and state clearly. Its presence in the DOM does not satisfy feeder-map integration acceptance.

**Recommendation:** `$impeccable harden` then `$impeccable colorize`: align selectors and state hooks with the component contract, then verify transparent hit regions, distinguishable symbols, selected/unknown styling, keyboard focus, and narrow layouts. Preserve energization caveats. The actual public geometry intentionally has **no conductor LineStrings**; absent arrows in this dataset are a source limitation, not proof of an arrow algorithm defect. Do not fabricate missing conductor geometry to repair styling.

### F06 — P2: Recording and source documents describe superseded behavior

**Category:** claim provenance / documentation. **Location:** `docs/demo_script.md:23,62`; `docs/source_ledger.md:59,63`; `PRODUCT.md:28`; `docs/RELEASE_CLAIM_LEDGER.md:41`; `web/src/pages/UtilityPage.tsx:119`.

The script says hospital comparison is disabled by a `facility_type`/`kind` mismatch; current scenario code uses `kind == 'HOSPITAL'`, and eligible replacement planning exposes the comparison. The source ledger still describes replacement as a separate illustrative six-hour workload and an old five-premise/three-point/two-link public sample. Current engine and bundle use the workbook workload and 16/12 scope. PRODUCT describes globally shared scenario state, while X-Session-ID isolation passes. Historical release ledger entries remain useful but must not be presented as current evidence. Script wording about latest selections also conflicts with F03. Customer shot instructions retain an older alert-plan presentation.

The Supply path section says it traces from **transmission**; supplied data terminates at a circuit breaker and cannot identify its physical substation. The actual tree marks the substation unknown, so the subtitle should match that evidence.

**Impact:** presenters can record obsolete workarounds or overstate topology despite a passing word/timecode verifier.

**Recommendation:** `$impeccable document` and `$impeccable clarify`: refresh one current claim crosswalk and recording script after the P1 fixes; retain historical reports with their revision labels. Re-run the timing verifier and manually verify every shot against the integrated build. Do not infer actual video duration from the planned schedule.

### F07 — P2: Main landmarks are inconsistent across routes

**Category:** accessibility / semantics. **Location:** `web/src/components/shell/AppFrame.tsx:13`; `web/src/components/customer/CustomerDashboard.tsx:59`; `web/src/pages/SentinelPreviewPage.tsx`.

The customer route nests a `<main>` inside the shell's `<main>`; browser observations count two. The dedicated preview has zero `<main>` landmarks. Other ordinary routes have one.

**Impact:** landmark navigation is inconsistent and customer content has competing main regions. Input labels and status announcements do not resolve the page-level structure.

**Recommendation:** `$impeccable harden`: keep one main region per full page, use a section/div for embedded customer content, and provide an appropriate main landmark for the standalone preview. Verify with a semantic tree and keyboard/screen-reader navigation. A full assistive-technology assessment was not performed.

### F08 — P2: Initial JavaScript remains heavy despite scene splitting

**Category:** performance. **Location:** `web/src/pages/LandingPage.tsx`, `web/src/sentinel/SentinelStage.tsx`, production build output.

The entry chunk is **1,182.06 kB minified / 328.39 kB gzip**, before its **103.36 kB CSS / 20.10 kB gzip**. The separate SentinelScene chunk is **113.66 kB / 34.82 kB gzip**. Landing's eagerly imported SentinelStage brings the 3D stack into the entry graph, so lazy operator inspection alone does not make the application entry small. Vite emits its >500 kB warning.

**Impact:** added initial download/parse work may affect slower phones or presentation networks. This audit measured artifact sizes, not load-time regression, frames per second, memory, or Core Web Vitals.

**Recommendation:** `$impeccable optimize`: profile the built landing and working routes under a representative network/CPU setting, then choose whether delayed 3D loading or shared chunk boundaries improve measured loading while preserving the hero. Keep accessible static/fallback content available. Do not claim a measured performance improvement from chunk splitting alone.

### F09 — P3: Some controls remain compact and a mobile badge wraps awkwardly

**Category:** responsive polish. **Location:** shared header/footer controls, preview chapter/back links, `web/src/three/AssetViewport.tsx` / scene heading styles.

Browser observations record several 26–40 px-high links/buttons; the 390 px Sentinel inspection badge breaks “Illustrative” across lines. Content fits the document width and core inspection buttons remain available. The detector's single width-transition warning concerns a small decorative underline; it is not evidence of measured animation jank.

**Impact:** compact controls may be less comfortable on touch; badge wrapping weakens an otherwise clear hardware preview. **44 × 44 px is the audit's ergonomic target, not a claim that every smaller control violates WCAG AA.** Physical touch/gesture testing was not performed.

**Recommendation:** `$impeccable adapt`, then `$impeccable polish`: expand practical hit areas where needed, protect badge text from mid-word wrapping, and verify real touch/zoom behavior. Treat the bounded underline warning as optional polish unless profiling demonstrates a cost.

## 3D Sentinel verification

The landing/preview adapter and operator inspection use the same procedural **SentinelAssembly**. They are not separate unrelated pole models. The operator retains AssetViewport, camera controls, focus controls, detail switching, and the 2D diagram fallback. Both the landing hero and inspection view actually painted in the reviewed desktop/mobile captures.

`web/src/three/visual-state.ts` sets OPEN to **−2.05 radians (~117.5°)** and CLOSED to zero. UNKNOWN has no asserted angle; `parts/Cutout.tsx` renders the separate unknown-position representation rather than a known hinge pose. Reduced-motion handling preserves state and avoids the normal spring transition; the spring uses bounded substeps. These are code-contract observations, not proof of physical pole geometry or energized conditions.

Preview controls update the inspection cutout state for OPEN/CLOSED/UNKNOWN. The preview is explicitly illustrative hardware, with telemetry not supplied. [UNKNOWN capture](person5_baseline_audit/screenshots/sentinel-unknown.png) shows the unasserted-position treatment. [No-WebGL capture](person5_baseline_audit/screenshots/operator-webgl-fallback.png) shows the usable mobile diagram. The hero may remain a concept overview while inspection controls change the inspection model; no live hardware control is implied.

## Coverage gaps and positive controls to preserve

The green frontend suite includes a comparator test that explicitly requires the unsupported dollar and labor-saving strings. It verifies literal rendering, not provenance. The customer hook has meaningful response-generation tests, but the new shared IncidentProvider does not inherit that protection. Full-page CSS and hash-route behavior likewise escape the current component checks. Add narrow tests at these integration boundaries rather than duplicating all existing rendering assertions.

Preserve the working controls: source-scoped anonymous projections; explicit modeled labels; scenario confirmation distinguished from real field observation; absent repair duration for unknown work; unchanged state after stale revisions; separate task-clearance and authorization gates; household persistence; battery reserve/efficiency and retry behavior; demo-only alert policy; and 3D unknown/fallback states.

The core baseline tests and 13 additional probes passed. Remaining limits: no physical devices, Safari/Firefox, screen-reader session, synthesized touch gestures, text-zoom matrix, deployed API/proxy, persistence across backend restart, load/concurrency/security assessment, real sensors, utility switching, live notification delivery, or recorded-media timing. These are unverified areas, not automatic failures. Browser graphics use software rendering and reduced motion; no device frame-rate claim is made. The full offline preprocessing pipeline was not rebuilt; checked-in counts, source boundaries and independent workbook cells were audited.

## Readiness sign-off and next verification

**Signed off:** a reproducible pinned baseline and its passing engine, frontend, build, and planned-script checks, with the execution constraints disclosed.

**Not signed off:** final UI, flagship comparator claims, or presentation readiness. Resolve F01–F05 before recording a final walkthrough. F06 should be refreshed before narration is approved. No P0 issue was identified in this tested prototype scope.

Suggested order: **`$impeccable clarify`** (F01/F06), **`$impeccable harden`** (F01–F03/F05/F07), **`$impeccable colorize`** (F04/F05), **`$impeccable optimize`** (F08), **`$impeccable adapt`** (F09), a fresh **`$impeccable audit`** against the resulting commit, then **`$impeccable polish`**. These are recommendations; no remediation was executed by this audit.

Re-run the three requested gate groups on the resulting revision and the targeted failing browser cases; verify actual map symbols and computed contrast in the full shared shell. Recheck all four scenarios and alternate asset counts, hash and pathname entry points, competing scenario responses, customer planning synchronization, and fallback behavior. A new green report must identify its resulting revision; this report must remain tied to `1ee72a2`.

## Evidence index

Portable evidence lives under **`reviews/person5_baseline_audit/`** alongside this report. It contains successful and constrained command logs, baseline hashes, backend probes, primary browser results, computed contrast, detector output, and screenshots. Audit harnesses are included under `tools/` for reproducibility; dependency and raw data paths may need environment overrides. Raw challenge data and installed dependencies are not repackaged.

The primary browser receipt is authoritative over the saved initial run. Initial assumption/locator mistakes are retained for audit traceability and are excluded from product severity counts. Any supplemental matrix is recorded separately below; it does not silently replace the primary receipt.

### Supplemental runtime receipt

The [four-case supplemental matrix](person5_baseline_audit/receipts/browser-supplemental.json) and [final isolated planning run](person5_baseline_audit/receipts/browser-planning.json) establish **three passing cases and one failing map-style case**. Combined with the primary matrix, that is **23 distinct browser cases: 16 pass, 7 product assertion failures**, grouped into the existing findings rather than new issue counts.

| Supplemental case | Final classification | Evidence |
|---|---|---|
| Map computed styles | **Fail — F05** | Hit fill black, hit stroke none, symbol stroke none |
| Keyboard sensitivity + shared customer planning + hospital comparison | **Pass** | Six workers + two access hours: operator lower/expected/upper **3.12 / 3.5 / 4.24 h**; customer rounded window **3.1–4.2 h**; assumed-association comparison visible |
| Customer Scenario 4 | **Pass** | Under review; no confirmed outage or repair window |
| Feeder keyboard selection, API error, retry, empty geometry | **Pass** | Enter selects node; Retry topology moves failed request to explicit empty state |

The supplemental harness initially expected a trailing zero and a different status label; these were corrected. A second planning assertion read the service-loading placeholder before the independent customer fetch completed. The isolated final check waits for that fetch and passes. These harness problems are retained in receipts and **excluded** from product failure counts. The final product/style assertions remain unmodified. All 23 distinct cases use the unchanged pinned production source.

Supplemental captures: [planning and priority](person5_baseline_audit/screenshots/operator-planning-and-priority.png), [shared customer planning](person5_baseline_audit/screenshots/customer-shared-planning.png), [customer abstention](person5_baseline_audit/screenshots/customer-abstention.png), [empty feeder](person5_baseline_audit/screenshots/operator-empty-feeder.png).
