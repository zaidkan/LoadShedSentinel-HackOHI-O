# Person 5 overnight recheck and regression audit

**Work:** LRP-140 / Lane W1 · **Auditor:** Aj · **Date:** October 25, 2026 UTC  
**Requested baseline:** `bafc1ee8d25ad10f0d73277b2f027aadbb55262b`

## Verdict

**Incomplete at the baseline.** The 3D integration compiles and its tested state/fallback logic passes. All **120 Python tests**, the frontend harness and the production build pass. The session memory fallback handles absent storage and failing storage methods, but two additional storage cases remain defective. All five W2 findings A1/A2/A4/A5/A6 reproduce before remediation. The separate A3 customer response race and A7 documentation drift also remain at this baseline.

Baseline open findings: **zero P0 observed, five P1, three P2**. These counts include the seven Run 3 findings plus one grouped P1 session-fallback finding below. They are prototype correctness findings, not a claim of physical switching or live dispatch risk.

**W2 follow-up is pending delivery.** The latest inspected commit initially differed only in the dispatch ledger; no W2 fix was present. Closure claims will be recorded only against an identified delivered source snapshot. The baseline report remains useful evidence and is not a certification of future commits.

Aj independently executed these checks and authored no fixes in this task. Aj previously authored topology/facility/risk code; this is independent verification activity, not an independent-author certification. No target repository writes, Git commands, deployment or real customer messages were performed.

## Tested source and commands

| SHA | Scope verified | Receipt |
|---|---|---|
| `bafc1ee8d25ad10f0d73277b2f027aadbb55262b` | Full requested baseline, all **125 tracked files** copied and blob/tree verified; fresh suites and probes below | [source manifest](../../lrp140-snapshot-manifest.json), `lrp140-audit-snapshot/` |
| `2fd6c0c6a41385b01f060de5345e5bfada50e8e0` | All 125 committed files captured. Only `docs/FINAL_SPRINT_EXECUTION_LEDGER.md` differs from baseline; application/tests/data are byte-identical. Baseline application receipts transfer by that identity; no separate suite run claimed. | [second manifest](../../lrp140-2fd6c0c-snapshot-manifest.json), [commit tracking](../../lrp140-commit-tracking.json) |

Snapshots were reconstructed against commit trees without Git commands. Tests ran against private copies with the existing Python virtual environment and an already installed, private dependency copy. The lockfile adds camera-controls as a direct dependency; package versions are unchanged from the prior dependency copy. No clean installation or hosted continuous integration run is claimed.

| Check | Exact command / method | Result | Log |
|---|---|---|---|
| Python | `/Users/zaid/Larp-MAXXX/hackathon/.venv/bin/pytest -o pythonpath=. tests/` | **120 passed**, no skips/failures, exit **0**, 4.49 seconds; one existing Starlette warning | [Python](../../lrp140-tests.log) |
| Production frontend | `cd web && npm run build` | TypeScript + Vite exit **0**, 2,568 modules, 3.51 seconds | [build](../../lrp140-build.log) |
| Committed frontend harness | `cd web && npm test` | Exit **0**; hardcoded output says **4/4**, with five actual assertion groups | [frontend](../../lrp140-frontend-tests.log) |
| Session red team | `node lrp140-session-probes.cjs` | All asserted checks and defect reproductions completed, exit **0** | [session log](../../lrp140-session-probes.log), [JSON](../../lrp140-session-probes.json) |
| 3D state/fallback red team | `node lrp140-3d-probes.cjs` | All assertions completed, exit **0** | [3D log](../../lrp140-3d-probes.log), [JSON](../../lrp140-3d-probes.json) |
| Backend gates / interleaving | Existing virtual-environment Python runs `lrp140-gates.py` | Exit **0**; original findings reproduced | [gate log](../../lrp140-gates.log), [JSON](../../lrp140-gates.json) |
| Scenario sensitivity | Same interpreter runs `lrp140-probes.py` | **1,400** checks, no failures; four scenarios × seven crew sizes × 25 access delays × select/advance | [probe log](../../lrp140-probes.log), [JSON](../../lrp140-probes.json) |
| Source arithmetic / facilities | Same interpreter runs `lrp140-calculations.py` | Workbook, **52 facilities**, **81 risk cases** pass | [calculation log](../../lrp140-calculations.log), [JSON](../../lrp140-calculations.json) |
| Customer async behavior | `node lrp140-frontend-effects.cjs` | App stale-response/reset guard passes; current customer race reproduces | [effect log](../../lrp140-frontend-effects.log), [JSON](../../lrp140-frontend-effects.json) |

The new main JavaScript bundle is **219.10 kB / 67.49 kB gzip**, versus 1,066.72 kB / 291.88 kB gzip in Run 3. The deferred SentinelScene chunk is **987.79 kB / 269.72 kB gzip**; the preview page adds 4.42 kB / 1.87 kB gzip when requested. This demonstrates code splitting, not measured frame rate or load latency. Vite still warns about the large deferred scene chunk.

## Integrated 3D Sentinel verification

**No P0/P1 3D-specific failure was reproduced within the available non-browser checks.** This is bounded by the browser limitation below.

- **Incident wiring:** UtilityPage passes `snapshot.cutout_status`, `current_asset_id` and `solar` into AssetViewport. The actual viewport function forwarded UNKNOWN and OFFLINE into inspection mode; its facts showed the injected modeled 42% charge and seven buffered events. No substituted incident values were used.
- **Cutout states:** Actual Cutout component trees showed OPEN hinge x=2.05 radians, CLOSED x=0, and no fuse door/hinge for UNKNOWN. Presentation without a supplied status draws an installed closed configuration without claiming an incident status. Shared mapping remains OPEN=-2.05 radians (~117.46 degrees), CLOSED=0, UNKNOWN=null; the mesh negates that mapping on its x-axis.
- **Transition:** With the real Cutout motion equation and real Three.js Group objects, 240 simulated 60-Hz frames settled CLOSED→OPEN to hinge x=2.05. The hook collecting frames and the material/primitive factory were mocked; no GPU scene was rendered.
- **Fallback:** Actual server rendering of AssetViewport in OPEN/CLOSED/UNKNOWN produced the SVG equipment diagram, disabled camera controls and explanatory fallback text. UNKNOWN has no `data-cutout-angle` and explicitly says its physical position is not shown. Receipts: [OPEN](../../lrp140-3d-fallback-open.html), [CLOSED](../../lrp140-3d-fallback-closed.html), [UNKNOWN](../../lrp140-3d-fallback-unknown.html).
- **Loss/detail controls:** Invoking the real onUnavailable callback with context-lost changed the viewport tree to PoleDiagram and a graphics-context-lost note. Low-detail control forwarded detail=low. This tests state handling, not an actual graphics-context-loss event.
- **Camera composition:** All **108** tested combinations of two modes, six catalog views, three aspect ratios and three configured offset patterns produced finite positive camera distances and finite vectors using the actual camera functions and Three.js objects. No screenshot-based framing claim follows.
- **Source boundaries:** Hero receives no incident cutout/link prop. Catalog and preview labels call hardware proposed/illustrative, and the preview is separate from the API-connected console. Textures are generated locally; no external image/HDR/font URL was found in the scene sources. The 3D assembly does not establish a surveyed installation or electrical safety clearance.
- **Motion/access/performance source review:** Reduced-motion code bypasses camera/hinge/idle animation; keyboard focus controls exist outside canvas; inspection uses demand rendering, low detail lowers segment/shadow/DPR settings, and IntersectionObserver stops offscreen frames. Actual touch scroll/orbit, keyboard navigation, hidden-tab behavior, frame rate and graphics resource cleanup remain unverified.

The audit harness explicitly adapts camera-controls' dual-export package for CommonJS loading to match the production ESM default import. That test-loader adaptation does not modify the application; the production Vite build passed without it.

## Session isolation and fallback

**Passing:** The actual TypeScript service was transpiled into isolated JavaScript virtual-machine realms. Each of ten service helpers attached the same nonempty X-Session-ID when storage worked, was absent, or threw from getItem/setItem from the outset. Two separate page realms generated distinct IDs; an existing stored ID was reused. Backend select/advance/reset operations in session A left session B's snapshot, planning context, notification keys, completion and authorization unchanged.

The ten checked helpers are current scenario, scenario catalog, select, customer snapshot, topology lookup, battery calculation, preparedness guidance, reset, advance and AEP assets. FeederMap's direct GeoJSON fetch does not use the session header; that endpoint is stateless public topology, so no isolation failure is inferred.

The committed `web/test-frontend.mjs` checks only the current-scenario helper's header and advance-body serialization. It does not test storage denial, transient storage readability, two real browser tabs or a live backend. Static CustomerPage rendering stops at its loading state and never executes its effects. The new red-team evidence supplements, rather than expands claims about, that committed harness.

### S1 · P1 · Session memory fallback misses accessor denial and existing-ID continuity

**Location:** `web/src/services/api.ts:73–96`.

**Repro 1 — storage getter denied:** Define a throwing getter for `globalThis.sessionStorage` in the service's execution realm, then call getSessionId. The first `typeof sessionStorage` at line 75 invokes that getter outside the try block and throws `AUDIT Storage SecurityError accessor`. No memory fallback is reached. This is a controlled JavaScript reproduction of denied property access, not a real browser policy test.

**Repro 2 — existing session becomes unreadable:** Seed storage with `sess_AUDIT_existing`. First getSessionId returns it. Make getItem throw. The next call returns a newly generated ID because the existing stored ID was never retained in `_memorySessionId`. Restore storage readability: the next call switches back to `sess_AUDIT_existing`.

**Impact:** Property-access failure can break every service request; changing storage availability can split one page's requests between different backend demo sessions and unexpectedly replace its selected incident. The successful missing-storage/method-error cases do not cover these paths.

**Correction:** Put storage property acquisition inside the try boundary and retain the last accepted session ID in memory, including IDs read from existing storage. Define a stable preference policy when storage availability changes. Add regressions for both cases and exercise all ten header helpers.

**Receipt:** [session JSON](../../lrp140-session-probes.json), `storage_accessor_error`, `storage_readability_change`; [runnable probe](../../lrp140-session-probes.cjs).

## Data provenance and numerical receipts

| Claim | Independent result and limit |
|---|---|
| **16-premise anonymized runtime sample** | The committed network bundle and scenario source use 16 supplied-path premise tokens and 12 equipment nodes. Current public API context uses this selected subnet, not all 117,549 offline accepted paths. No synthetic P-DEMO fallback appeared with source failure disabled; simulated load failure returned 503. No household coordinates or raw customer records were observed in the tested public projection. |
| **8.974 person-hours** | Raw workbook XML: sheet Labor time material related, C21=`1.1880851063829778`, D21=`0.80612765957446808`; Indirect Labor Multiplier B1=`4.5`. `(C21+D21)*4.5 = 8.973957446808507` person-hours. Workbook SHA-256 `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`. At three workers, labor-only expected duration is 2.991319148936169 hours; at six workers plus two hours access, 3.4956595744680847 hours. This is a declared 25-kVA replacement package, not measured GIS rating or utility ETR. |
| **Facility proximity caveat** | All 52 source records independently checked: five hospital, 37 fire, ten ambulance. Raw projection round-trip error ≤3.36e-9 metres; nearest anchors and explicit upstream tags agree. The public sample has two anchors and rounded association distances 1–36 km. All are ASSUMED proximity links, not verified electrical feeding relationships or proof a hospital was restored. No facility coordinates are saved in the public association records. |
| **Transparent risk** | All 81 independent point-level combinations match declared thresholds; missing/conflicting inputs return UNKNOWN. Risk remains an uncalibrated rule band, not an evaluated probability. |

The 3D geometry and proposed sensor node add no new source observation. Modeled battery/solar/link facts stay labelled modeled. The [calculation JSON](../../lrp140-calculations.json) records source values; the [source manifest](../../lrp140-snapshot-manifest.json) binds data/code to the tested commit.

## W2 regression tracking

All repros below were freshly executed on the exact baseline. They are not assumed to survive an untested correction.

| Finding | Severity | Baseline reproduction | W2 delivery/recheck |
|---|---|---|---|
| **A1 — rejected event mutation** | P1 | Select confirmed_replacement at revision 1. Advance with `status=RESTORED`, `action=record_demo_authorization`, `access_hours=[1,2]`: **400**, unchanged visible snapshot/context, but all completion and affected-premise authorization sets retained. Next plain RESTORED succeeds **200**. Invalid-premise/partial-restoration cases also retain state. | **Pending delivered fix** |
| **A2 — hospital field mismatch** | P1 | `ASSET-4D3811483AD1FB8F` has seven facilities including one `kind=HOSPITAL`, but comparison disabled and says no hospitals. `ASSET-253FD0B7C3F209A9` has four hospitals among 45 facilities and is also disabled. Consumer checks `facility_type='hospital'`. | **Pending delivered fix** |
| **A4 — concurrent same-session revision** | P1 | Deterministic barrier after checks, before the real calculator/commit. Two writes with expected_revision=1 both return **200**; final revision **3**. The barrier controls scheduling, not calculated values. | **Pending delivered fix** |
| **A5 — restored with open cutout** | P2 | Advance with `status=RESTORED`, demo authorization action and explicit cutout_status=OPEN returns **200 / RESTORED / OPEN**, including RESTORATION_COMPLETE. | **Pending delivered fix** |
| **A6 — capacity/LRU claim** | P2 | 55 fresh session IDs leave **55** stored states. An aged entry is pruned after the threshold, but no fresh-session cap or least-recently-used eviction exists. | **Pending delivered fix** |

Exact requests, response values and mutable sets: [gate JSON](../../lrp140-gates.json), [runnable gate probe](../../lrp140-gates.py). Once A4 is corrected, the baseline two-party barrier must be changed: holding the calculator under a real per-session lock would intentionally block the second request from entering that barrier. Follow-up must test serialization rather than reuse an incompatible probe.

### Other findings retained at the baseline

- **A3 · P1:** Current inputs medical=true/load=240 W can show old nonmedical guidance and old 120 W runtime after obsolete responses arrive last. Actual-source deterministic effect probe reproduced this again. App scenario/reset mutationSeq guard, household persistence and inline Retry controls passed their separate probes. [Effects](../../lrp140-frontend-effects.json).
- **A7 · P2:** The checked-in launch checklist still marks criticality and an end-to-end gate complete, includes old 45-degree/healthy-core/fuse-crew recording claims, and includes PREM-000001 without the shipped-sample distinction. The new sprint ledger openly lists lane work; it does not update those older actionable instructions. The new 3D integration note itself correctly discloses illustrative/modelled geometry and shared state.

## Browser limit and outstanding proof

A fresh localhost bind returned `Operation not permitted`. A fresh installed Chromium headless-shell launch exited **-5 / SIGTRAP**, with MachPortRendezvousServer `Permission denied (1100)`. [Limit receipt](../../lrp140-browser-limitations.json), [Chromium log](../../lrp140-chromium.log).

No live server/browser remains running. There is no current screenshot, real graphics render, mobile overflow result, real touch-gesture result, browser-storage-policy test or hosted continuous integration receipt. Static HTML, actual component functions and CPU geometry do not establish those outcomes. No production readiness, field accuracy or final competition submission is certified.

## Follow-up verification record

No W2 implementation delivery had been observed when the baseline section was written. This section will record each delivered candidate SHA, the regressions exercised and any remaining or new failures; the audit remains active while that requested follow-up is pending.
