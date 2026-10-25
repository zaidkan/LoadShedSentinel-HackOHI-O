# LoadShed Sentinel performance and rendering audit — LRP-148

Audited 2026-10-25 against the canonical `/Users/zaid/Larp-MAXXX/hackathon` source. Reviewer: Zk. Source snapshot and experiments: `../work/`; baseline source hashes: `../source-manifest.json` (72 source files, zero drift at verification). Canonical source was read only. This report is staged for integration at `reviews/performance_rendering_audit.md` because the canonical repository is outside this worker's writable roots.

## Verdict

**Not ready to certify instant loading, zero dropped frames, zero Cumulative Layout Shift (CLS), or complete WebGL resilience.** The bundle and two deterministic resilience defects are verified. Device rendering metrics are unavailable because Chromium cannot launch in this sandbox. No frame-rate or graphics-memory numbers have been invented.

The implementation retains product-specific provenance, sample disclosures and uncertainty. No product copy, backend logic, data, dependency or test was changed. The only application experiment changes route import boundaries in an isolated copy; it is supplied separately, not applied to the app.

Five actionable findings: **0 P0, 3 P1, 2 P2**. Performance: **2/4** (effective inspection demand loop, but eager heavy imports and incomplete visibility handling). Implementation integrity: **3/4** (product claims preserved; async ordering and chunk recovery need work). Accessibility, theming and responsive quality are outside this performance assignment; no fabricated whole-interface score is assigned.

## Evidence and reproducibility

All receipts below live one directory above this report.

| Check | Result | Receipt |
|---|---|---|
| Baseline `npm run build` | Pass; Vite 6.4.5, 2,593 modules; reported bundling 5.85 s | `baseline-build.log` |
| Baseline `npm test` | Pass: frontend integration checks plus 12/12 customer regressions | `baseline-frontend.log` |
| Backend `python -m pytest -q -p no:cacheprovider` | 137 passed, 72 subtests, 8.05 s; one existing Starlette/httpx deprecation warning | `baseline-backend.log` |
| Route-split `npm run build` | Pass; reported bundling 5.41 s | `split-build.log` |
| Route-split `npm test` | Pass, same checks | `split-frontend.log` |
| Real-source hook/request harness | Reproduces stale incident overwrite and missing hidden-tab gating; handles offline and HTTP 503 action failures | `audit-runtime.mjs`, `runtime-checks.log`, `runtime-observations.json` |
| API payload inspection | Six endpoints return 200; bounded sample payloads | `payload-receipts.json` |
| Bundle graph inspection | Exact file bytes, per-file gzip, static import closure for each route | `bundle-receipts.mjs`, `bundle-receipts.json`, `bundle-summary.log` |
| Impeccable detector | One layout-animation finding; exit 2 means finding present | `detector.log` |
| Browser launch | Exit 133: macOS MachPortRendezvous `bootstrap_check_in ... Permission denied (1100)` | `browser-launch.log` |

Commands run inside the isolated `work/web` copy for build/tests. Backend used the existing canonical virtual environment, with `PYTHONDONTWRITEBYTECODE=1`; it imported copied application code and disabled pytest cache writing. To reproduce deterministic experiments from the package root: `node audit-runtime.mjs` and `node bundle-receipts.mjs`. The latter expects the preserved `baseline-dist/` and experimental `work/web/dist/`. No new packages were installed.

**Coverage limits:** Hook tests execute compiled production functions with controlled hooks/fetch scheduling; they are not browser integration tests. API payload checks use FastAPI TestClient, not network throughput measurements. Build duration is one run per variant, excludes TypeScript timing in Vite's displayed duration, and is not a statistically meaningful speedup. Existing tests are not a graphics, scroll, layout or exhaustive offline test suite. The request mentioned 13 frontend tests; current `npm test` has integration blocks and a separate 12-case customer suite, not a 13-test framework summary. Both complete unchanged.

## Bundle benchmark and safe import boundaries

Baseline `App.tsx:6–8` statically imports all three working pages. `LandingPage.tsx:15` statically imports the older `src/sentinel/SentinelStage.tsx`, which imports React Three Fiber, Drei and Three.js. The newer inspection scene's `lazy()` in `AssetViewport.tsx` therefore does **not** remove the common graphics runtime from the initial entry. The sentinel preview is already lazy in `main.tsx`, but its entry still imports `App` eagerly.

`experiments/route-split.patch` changes only `web/src/App.tsx`: lazy named-export adapters for LandingPage, UtilityPage and CustomerPage, with one Suspense loading label. It preserves every page's implementation, data path and claims. There is no server-side rendering (SSR) or hydration in this application: `main.tsx` uses `ReactDOM.createRoot`. Existing static React rendering in tests is not a deployed SSR pipeline.

| Metric (decimal bytes) | Baseline | Route-split experiment | Change |
|---|---:|---:|---:|
| Entry JavaScript, minified | 1,182,055 | 169,709 | −85.6% |
| Entry JavaScript, gzip | 328,390 | 54,474 | −83.4% |
| Customer route closure, minified | 1,182,055 | 191,860 | −83.8% |
| Customer route closure, gzip | 328,390 | 61,982 | −81.1% |
| Landing route closure, gzip | 328,390 | 305,978 | −6.8% |
| Operator plus inspection scene closure, gzip | 363,206 | 345,670 | −4.8% |
| Sentinel preview plus both scenes closure, gzip | 365,075 | 331,547 | −9.2% |
| All emitted JavaScript, minified | 1,300,139 | 1,299,330 | −809 bytes |
| Sum of all emitted JavaScript gzip sizes | 365,075 | 368,764 | +3,689 bytes |
| Entry CSS, minified / gzip (decimal kB) | 103.36 / 20.10* | 20.34 / 5.23* | Route CSS moves to lazy chunks |

*CSS figures rounded in build receipts; JavaScript figures come from exact filesystem/gzip measurements. See build logs for authoritative displayed CSS sizes.

Closures sum unique static JavaScript dependencies, plus the known scene module when that route mounts it; dynamic imports are not all counted as startup dependencies. They exclude HTML/CSS, API data, transport headers and compression negotiation. These are asset-cost measurements, **not measured first contentful paint, largest contentful paint or interaction latency**. The landing and preview still load graphics. The heavy shared `SentinelAssembly` chunk remains 873.87 kB minified / 235.74 kB gzip, so the >500 kB warning correctly remains. Do not silence the warning or claim the graphics cost disappeared. A manual vendor split alone would rearrange bytes without removing the eager dependency.

**Lowest-risk recommendation:** integrate route splitting after adding route-level rejected-chunk recovery and testing direct hash URLs, history navigation and shell/loading layout on a real browser. A second, separate change can put the landing's entire graphics stage behind a lazy boundary while keeping its WebGL support check/error boundary lightweight; defer scene mounting until near view. Do not move the current boundary class while leaving an eager import of the same heavy module. Prefetch only in response to likely navigation, and measure on slow devices before adding it. No behavior-changing optimization is literally zero-risk; the report and offline benchmark themselves do not alter production behavior.

## Detailed findings

### P1 — Eager graphics on every working route

Location: baseline `web/src/App.tsx:6–8`, `web/src/pages/LandingPage.tsx:15`, `web/src/sentinel/SentinelStage.tsx:2–6`.

Impact: even a customer who needs no canvas must fetch and parse the 1.182 MB entry. The measured route-split experiment materially removes this cost for the customer route; landing still pays most of it. Apply the boundary recommendations above. Retain visible disclosures in every loading/error state. Suggested follow-up: `$impeccable optimize`.

### P1 — Older incident responses overwrite the newest selection

Location: `web/src/app/incident.tsx:46–118`; landing scenario buttons at `LandingPage.tsx:189–222`.

Evidence: the harness starts `chooseScenario('old')`, then `chooseScenario('new')`, resolves new first and old last. Final `selectedScenarioId` is **old**. `busy` is already **false** while the older request is still pending. The landing buttons expose `aria-busy` but are not disabled, so overlapping scenario actions are reachable. Operator selects disable while busy, reducing but not eliminating all cross-action races. `retry`, asset choice and reset also lack a common generation/serialization policy.

Impact: incident switching can show old assessment/affected-premise state and trigger stale navigation. This is a correctness risk with a performance symptom, not merely an unnecessary render. Recommended: serialize server-mutating actions per session, invalidate UI generations synchronously, gate success/error/finally, guard unmount, and apply equivalent navigation ordering. Aborting a browser request does not undo an already accepted server mutation; latest-client-response-wins alone does not establish backend ordering. Verify deliberately reversed completion, concurrent reset/select and failed newer requests. Suggested follow-up: `$impeccable harden`.

### P1 — Rejected lazy imports have no outer recovery boundary

Location: `web/src/main.tsx:6–27`, `web/src/three/AssetViewport.tsx:13,102`, `web/src/three/SentinelHero.tsx:9,55`.

Suspense handles pending imports, not rejected promises. `RendererBoundary` is **inside** the lazily imported `SentinelScene`; it cannot catch failure to download that module. The preview root also has only Suspense. A missing/stale chunk during offline navigation or an interrupted deployment can therefore fail above the renderer fallback and unmount the route. This is verified by boundary placement, not a live offline-browser reproduction.

Recommendation: an outer route/scene error boundary should keep the app shell and honest 2D equipment fallback available, with reload/recovery text. A cached React.lazy rejection generally needs a real reload or a newly created loader to retry; do not provide a retry button that only resets boundary state. Test an intentionally rejected importer independently of WebGL context loss. Suggested follow-up: `$impeccable harden`.

### P2 — Visibility hook does not implement hidden-tab gating

Location: `web/src/three/sentinel/hooks.ts:16–29`, `SentinelScene.tsx:121`; older stage `web/src/sentinel/SentinelStage.tsx:255–256`.

The hook comment claims offscreen **or hidden-tab** pausing. It only observes intersection. Harness result: after `document.hidden=true`, the hook stays true; no visibility listener is registered. The hero uses `frameloop='always'` whenever intersecting and motion is enabled. The older landing stage pauses after scrolling past the hero through parent state, but has no explicit page-visibility gate either. Browsers commonly throttle background animation frames; this does not prove app-owned pause behavior and must not be substituted for measurement.

Recommendation: combine intersection with `document.visibilityState`, handle absence of IntersectionObserver, and use a consistent visibility policy for both implementations. Pause on hidden pages; retain resources for inexpensive resume. Disposing/rebuilding the entire scene on every blur would add churn and is not necessary to pause. If release-on-long-hide is a product requirement, implement it separately and test resume. Verify cleanup and render counts across hide/show and offscreen/on-screen changes. Suggested follow-up: `$impeccable optimize`.

### P2 — Supply-path loading can keep the previous forest visible

Location: `web/src/components/map/SupplyPath.tsx:115–153`.

The effect sets `failed=false` and starts new premise lookups but does not clear or key the prior `traces`. Until the new promise resolves, `buildForest(traces)` can represent the old incident while fault/affected styling uses the new snapshot. The effect's live flag correctly rejects stale completions, but does not prevent this interim mixed state. The module-level promise cache also has no size limit: normal sample use is small, while repeated unique successful UNKNOWN lookups can retain arbitrary entered tokens for the session.

Recommendation: key resolved traces to the premise-set/incident generation and show an explicitly loading, reserved-height state until they match; keep cached source traces but cap cache entries or avoid caching UNKNOWN results. Check that same-sample scenario changes reuse valid static paths without unnecessary fetches. Suggested follow-up: `$impeccable harden`.

## WebGL lifecycle and render-loop profile

Two distinct model implementations are active; auditing only `src/three/` misses the landing's graphics.

| Route | Rendering path | Idle / interaction policy from source | Resilience from source |
|---|---|---|---|
| `/` | Older `sentinel/SentinelStage` procedural model | Always while hero visible/full motion; demand for reduced motion; never after parent scroll pause. Hero rotation and 220 motes update each active frame | WebGL constructor check, outer WebGLBoundary, context-loss callback to PoleDiagram |
| `#/operator` | `AssetViewport` → lazy `three/sentinel/SentinelScene` | Demand while in view; camera damping, emphasis, cutout spring and light ignition invalidate while changing; never when out of view | Actual WebGL2 context probe, renderer boundary, context-loss callback to PoleDiagram |
| `#/customer` | CustomerDashboard | No mounted canvas, though baseline still downloads graphics runtime | Fetch errors and retry states; 12 deterministic customer regression checks pass |
| `#/sentinel` | SentinelHero and a separate AssetViewport | Hero always unless reduced motion/offscreen; inspection demand. Two canvases can mount even if inspection starts below fold | Hero shows textual graphics-unavailable state; inspection shows actual 2D equipment diagram. Preview does not require API |

Geometry/material cleanup is substantially implemented:

- `primitives.tsx:28–55` disposes each MaterialKit and custom RoundedBox/Lathe/Tube geometry. Declarative geometry ownership remains with React Three Fiber. `MaterialKit.dispose()` releases per-part materials and cloned tiled textures.
- `Stage.tsx` disposes floor/ring materials; cutout's primitive line explicitly disposes geometry and dashed material. This matters because React Three Fiber does not automatically dispose arbitrary primitive objects.
- CameraDirector disconnects DOM listeners and disposes camera controls; ContextWatcher removes its context-loss listener. Media query, ResizeObserver and IntersectionObserver effects disconnect their observers/listeners.
- The older stage's ContactShadow explicitly disposes its CanvasTexture; declarative procedural meshes use framework ownership.
- Installed React Three Fiber's `events-0e73ba93.cjs.prod.js:2110–2132` deactivates the root, disconnects events, disposes render lists and forces context loss during delayed (500 ms) canvas teardown. Rapid route/detail changes can temporarily overlap retained renderer resources; do not mistake a single immediate memory reading for a leak.
- `textures.ts:7` retains shared procedural source textures in a module Map without a release function. With current fixed texture names and fixed fade parameters this is bounded page-lifetime CPU retention, **not evidence of an unbounded GPU leak**. Per-kit cloned textures are separately disposed. Shared textures must not be disposed while the preview's other canvas still uses them. If explicit release is required, introduce final-owner reference counting and test simultaneous canvases; do not indiscriminately dispose the cache on every unmount.

The new scene computes local 2D procedural textures and one-frame studio environment maps; it needs no remote HDR or model URLs. High detail uses a 2048² shadow map, a 256-resolution environment and device pixel ratio caps of 2 (hero) / 1.75 (inspection); low detail disables shadows/antialiasing, lowers environment resolution to 64, and fixes pixel ratio at 1. The performance monitor reduces hero pixel ratio after decline. These are useful budgets, not measured GPU timings. Detail toggling keys the Canvas and intentionally rebuilds resources; rapid toggling needs device stress testing.

No measured idle frames/second, busy frames/second, p95 frame duration, GPU frame time, heap slope or renderer.info texture/geometry counts are available. Theoretical `demand` settling is supported by callback conditions, not a measured zero-frame steady state. Do not claim zero overhead for DOM hotspot projection, initial texture generation, shader compilation or hero motion.

## DOM, scrolling, layout and dataset boundaries

No read/write layout loop was found on incident switching. `useReveal` makes one bounding-box read per mounted reveal, then toggles dataset state; hero sizing uses ResizeObserver and clientWidth/clientHeight; map sizing uses observer contentRect. Landing scroll handling is passive and updates a CSS variable plus two state thresholds. It does not read element geometry after writing it. The smooth-scroll hook uses native `scrollIntoView`; Lenis is installed but not imported into application code. Avoid adding a second scrolling loop merely because the dependency exists.

The detector found only `.sp-chapters button::after { transition: width ... }` in `pages/sentinel-preview.css:61`. This small positioned underline can cause layout work during its animation; the detector's generic claim of visible “jank” was not observed. Treat as optional polish: keep a full-width underline and animate `transform: scaleX(...)`. Transform/opacity dominate other motion; reveal filters, backdrop blur and CSS hotspot pulses still need device traces before calling them cheap.

Sticky headers and customer sidebar rules are present; scene containers reserve CSS height, reducing canvas-load shift. Preview Suspense currently returns null at the root; API arrival changes receipt sections, incident chips and dashboard loading states. These are possible shift points. **CLS=0 is unverified** and cannot be inferred from reserved canvas height. No network font import or @font-face was found in app source; declared font family names fall back to available local/system fonts. Do not attribute frame delays to downloading installed-but-unused font packages.

The full offline graph is not imported into the browser source. `SOURCE_FIGURES` contains nine numeric ledger rows, including 117,549 accepted paths, not the paths themselves. Backend `api/main.py:481` serves the sanitized AEP impact GeoJSON, not the private topology file. Actual default-session payload measurements:

| Endpoint | Response bytes | Observed bound |
|---|---:|---|
| `/api/scenario/current` | 6,228 | 3 affected sample premises; no top-level `paths` key |
| `/api/scenarios` | 1,089 | 4 scenario metadata records |
| `/api/aep/assets` | 1,397 | 7 source assets |
| `/api/aep/source` | 618 | Summary/disclosures |
| `/api/topology/geojson` | 2,297 | 9 sanitized features |
| `/api/customer/snapshot` | 5,067 | Customer-specific snapshot |

The source uses a 16-premise sample. `SupplyPath` requests affected/selected/manually added premise traces; its promise cache reuses static traces. Feeder parsing and coordinate projection are memoized. No virtualization is justified for this sample. No `JSON.stringify` dump of the private graph appears in application markup. The DOM check is source and API evidence, not a browser node-count measurement, and is not a guarantee for arbitrary future backend payloads.

## Async and claim preservation

Offline fetch rejection and HTTP 503 action responses are caught and produce an actionable incident error in the deterministic harness. Customer generation checks gate success, catch and finally, invalidate synchronously on edits/retry and on unmount, and validate battery estimates. Operator planning uses a 300 ms debounce, live cleanup and incident/revision/asset/input checks. Map and source-summary fetches have rejection handlers. API helpers do not impose request deadlines or abort obsolete reads, so a never-settling fetch can leave a loading state pending; add bounded read timeouts only with a defined retry policy. Unhandled camera-control promise behavior during interruption was not verified; `void` calls alone are not proof that a library can never reject.

All baseline backend tests, including claim tests, pass. The isolated import-only experiment changes no 16-premise sample text, 8.974 labor person-hours, modeled simulation labels, abstention conditions or restoration assumptions. It changes no battery math or provenance. Source hashes preserve the complete baseline for review. Existing source describes 8.974 as **labor person-hours**, not an hourly currency rate; keep its actual unit.

## Remaining acceptance gate and prioritized actions

1. **P1 `$impeccable harden`:** fix incident mutation ordering and stale navigation; add outer lazy-load recovery. Reproduce the harness failures before fixes and make the corrected cases pass.
2. **P1 `$impeccable optimize`:** integrate the measured route split, then evaluate lazy landing graphics separately. Maintain honest shell/loading/error content; confirm all four direct routes and history transitions.
3. **P2 `$impeccable optimize` / `$impeccable harden`:** share explicit page-visibility policy across both scenes; key supply-path data to its requested premise set and bound optional caches.
4. Run an actual Chromium desktop and mobile-profile session against a production build with the API: record cold/warm route requests, first/largest contentful paint, interaction latency, CLS, long tasks and 10-second frame distributions for idle/orbit/zoom/focus, both motion settings and detail levels. Repeat route/detail switching, background/foreground and offscreen/onscreen cycles, waiting past Fiber's 500 ms teardown before comparing renderer.info and heap trends. Test unavailable WebGL, actual `WEBGL_lose_context`, rejected chunks, offline/503 and rapidly reversed responses. Keep 2D controls usable and disclosures visible.
5. **`$impeccable polish`:** optional underline transform after functional and measured performance gates pass.

These live-browser checks are outstanding, not passed. The audit package supplies concrete benchmark evidence and verified defects; it does not certify an unmeasured rendering guarantee.

Tooling context notes: Impeccable reports DESIGN.md/sidecar drift and no configured buildPath; neither was changed. Its `document` workflow can reconcile the sidecar separately. A newer Impeccable (v4.5.2) is available; updating with `npx impeccable update` is a separate task.
