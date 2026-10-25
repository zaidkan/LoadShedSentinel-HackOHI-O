# LRP-151 — client performance hardening

Ready for integration from `changes.patch`. Canonical `/Users/zaid/Larp-MAXXX/hackathon` was read only because it is outside this worker's writable roots. No git operations or dependency changes.

## Changes

- `web/src/App.tsx`: lazy named-export adapters for LandingPage, UtilityPage and CustomerPage, with an accessible Suspense status. Hash routing is unchanged.
- `web/src/three/sentinel/hooks.ts`: combines intersection and document visibility; initially hidden documents pause immediately, hiding always pauses, showing resumes only when intersecting, and cleanup removes the listener/observer. Works without IntersectionObserver. `SentinelScene.tsx` already consumes this hook and maps false to `frameloop='never'`, so it needs no edit.
- `web/src/components/map/SupplyPath.tsx`: trace results carry an incident/scenario/asset/premise-set/retry key. A mismatched result is excluded during render, before effects run. Superseded promises remain guarded by cleanup. Loading/error summaries and readouts cannot show the prior forest; the sheet reserves row-based height. Equivalent snapshot arrays reuse resolved static paths.
- `web/src/three/AssetViewport.tsx`: error boundary outside the lazy scene catches rejected module promises. The fallback is a real PoleDiagram, then the viewport disables 3D controls and provides explicit reload text/button. Reload performs a full page reload because React.lazy caches failed imports. UNKNOWN cutout positions remain unasserted.
- `web/test-performance.mjs` and `web/test-frontend.mjs`: five new regression checks run through `npm test` using React's existing reconciler. No test-only production exports or new packages.

No edits to CounterfactualCompareCard.tsx, FeederMap.tsx, router.tsx, incident.tsx, UtilityPage.tsx, SentinelScene.tsx, main.tsx, styles, data or backend files. All sample disclosures, 8.974 labor person-hours and modeled simulation/uncertainty claims remain unchanged.

## Verification

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | Exit 0 | `build.log` |
| `npm test` | Exit 0; existing integration checks, 12 customer cases and 5 performance cases | `frontend-tests.log` |
| Four source-reversion mutations | Each detected with exit 1; fixed source restored | `mutation-results.json`, `mutation-1.log` through `mutation-4.log` |
| Patch applied to pristine captured baseline | All six output files match after hashes | `patch-check.log`, `patch-verification.json` |
| Canonical owned-file baseline drift | None at packaging | `manifest.json` |
| Scoped Impeccable detector | Exit 0, no findings | `design-detect.log` |

New checks cover hidden/visible/intersection combinations, initial hidden state, fallback without IntersectionObserver, cleanup, synchronous suppression of old trees, reversed promise completion, same-incident premise changes, failed lookup/retry, equivalent-input cache reuse, rejected scene import and 2D/reload/disabled controls, accessible pending-route status, and navigation through `/`, `#/operator`, `#/customer`, `#/sentinel` using the real App/Root/router composition. The route test stubs page bodies/providers; the scene test injects a rejected import; these are deterministic React tests, not live browser or GPU tests.

## Bundle receipts

The repository already includes manual vendor chunk configuration added since LRP-148. It is preserved unchanged in both measurements. Compare complete static dependency closures rather than the smaller application entry file alone.

| JavaScript cost (bytes) | Fresh baseline | Hardened |
|---|---:|---:|
| Entry static closure, minified | 1,183,488 | 169,519 |
| Entry static closure, gzip | 330,288 | 54,368 |
| Customer route closure, minified | 1,183,488 | 191,754 |
| Customer route closure, gzip | 330,288 | 61,903 |

Customer gzip reduction: **81.3%**. `bundle-receipts.json` contains exact files/import graph and all four route costs; `bundle-receipts.mjs` reproduces the measurement against preserved `baseline/web/dist` and `work/web/dist`. These are bundle costs, not measured load-time or frame-rate improvements. Baseline and hardened builds both pass; current manual chunks keep each emitted script below 500 kB.

## Integration and limits

Use `changes.patch` and verify its SHA-256 plus all six before/after hashes in `manifest.json`. The new test file must be included; it is untracked in the delivery snapshot and cannot be omitted from a tracked-file-only diff. `before/` stores each modified baseline; `work/` stores the implementation. `check-delivery.py` reproduces the patch and roundtrip check. The local dependency symlink targets this worker's existing isolated dependency copy; it is not part of the patch.

No live browser QA, frame rate, GPU memory, actual visibility/minimize behavior, layout-shift metric or real WebGL context-loss result is claimed. Chromium launch was blocked by macOS sandbox permissions in LRP-148; the same environment remains in use. The older landing SentinelStage's page-visibility policy and route/preview-root chunk recovery were not added because they are outside this dispatch's owned files. This change hardens the requested inspection scene boundary only. Pending Aj incident-ordering work remains separate.
