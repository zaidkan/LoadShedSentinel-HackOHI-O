# LRP-146 — Codebase refactor audit, rebased on 80de30a

## Result

The debloat patch is rebased on **`80de30a33b79e130bd2729cfa2d7c8bc6ad3d780`**. It trims **1,254 net production-source lines**, preserves all six safe file deletions, and retains the current LRP-149 customer contrast/layout rules. Across the 13 existing source/test files the net reduction is **1,220 lines**, after adding 34 regression-test lines. This report is the fourteenth patch path.

Verification in the fresh staging copy passes: **140 backend tests**, `npm test`, production build and demo-script validation. The original backend suite is retained, with three additional authorization regression cases. A fresh 772-record before/after API/scenario corpus against the canonical source is byte-identical.

**Target integration is pending.** All writes and build/test outputs are under `/Users/zaid/Larp-MAXXX/hive/agents/aj-mve9s7pw/`; no target repository write or Git command was performed. No Grub path was accessed. The previous base, patch, report and receipts are preserved under `lrp146-pre-80de30a/`.

## Rebase reconciliation

The old patch conflicted because `customer.css` received contrast, typography, input and layout changes. The rebased edit starts from the current file and removes only the suffix beginning `/* PR-4 Cursor dusk styles */`.

- **All 155 active CSS lines are preserved byte-for-byte**, including the complete “Shared Dusk reading, form, and disclosure conventions” block, state colors, input/caret contrast, focus indicators and responsive layout.
- The obsolete suffix still contains **780 lines**. Each of its **122 selector branches** requires a class absent from the remaining JSX. The removed `cust-enter` animation has no remaining code/style reference. The parser proof and active-prefix hash are recorded in `lrp146-css-proof.json`.
- Every non-CSS source/test/deletion base still matches the original delivery's exact before hash. Those changes are transplanted without revision.
- Current LRP-150 incident sequencing, Supply Path wording, pinned CI installation and evidence documentation remain byte-identical to the canonical snapshot. Hb's comparator/map/router/lockfile and current performance hardening are also retained.

## Audit findings and retained changes

1. **Unused customer components and chart:** the live `CustomerPage` renders `CustomerDashboard`. Removed the unreachable `BatteryPlanner.tsx`, `HouseholdNeeds.tsx` (`NeedsPicker`/`GuidanceList`), `time.ts`, `RangeChart.tsx`, `range-chart.css` and unimported `pole-diagram.css`. The live diagram's sizing remains in `utility.css`. Household needs, medical guidance, battery calculation, persistence, notification previews, error recovery and connection lookup remain in the live dashboard and its regression coverage.
2. **Dead styles:** removed only the older unused customer suffix. All current contrast/layout rules are retained as described above.
3. **Dead exports/imports:** removed `utcShort`, `clockAfter`, the now-orphaned `hoursWords`, and `GroupRef`/its `Group` type import. Deleted `time.ts` removes its two unused local-time helpers. Removed unused Python imports `math`, `RiskBand`, `Any`, `CustomerRisk` and unused `GEOJSON_PATH`.
4. **Repeated authorization logic:** normalize requested task/premise lists once, then validate/update once. Explicit demo authorization still defaults omitted or empty lists to all known entries; ordinary requests do not. Nonempty subsets remain subsets, unknown-task validation precedes unknown-premise validation, and errors commit no session state. Both the action field and legacy boolean remain supported. Three regression cases cover manual/action/legacy behavior.
5. **Redundant compatibility/state:** use pinned Pydantic 2's `model_dump()` directly instead of unreachable version-1 serialization fallbacks. Remove the write-only private `_last_etag`; the existing per-premise/incident/summary `_sent_keys` deduplication is unchanged.
6. **Repeated scenario workload:** derive the unprioritized two-task comparison from the same hospital workload, retaining reverse order and setting routine criticality. Person-hours, crews, prerequisites, counts and disclosure text remain identical.

All 13 Python files in `engine/` and `api/` and all 72 original frontend source/style files were covered by the original audit. The fresh TypeScript import/symbol and CSS checks cover the current frontend: all **66 remaining files are reachable**, with no unresolved relative imports or single-reference exported-declaration candidates. Both live Sentinel rendering paths remain. Different numeric/date validator contracts, privacy allowlists, source-path guards, session lifecycle, endpoint schemas, supported topology helpers and existing fetch wrappers are retained; they are not safe bulk-deletion candidates. Media-query/context selector repetition is not treated as automatically redundant.

## Line accounting

| File | Action | Removed | Added | Net trimmed |
| --- | --- | ---: | ---: | ---: |
| `api/main.py` | modify | 33 | 16 | 17 |
| `engine/customer.py` | modify | 17 | 2 | 15 |
| `engine/scenarios.py` | modify | 6 | 1 | 5 |
| `tests/test_api.py` | modify | 0 | 34 | -34 |
| `web/src/components/customer/BatteryPlanner.tsx` | delete | 90 | 0 | 90 |
| `web/src/components/customer/HouseholdNeeds.tsx` | delete | 87 | 0 | 87 |
| `web/src/components/customer/customer.css` | modify | 780 | 0 | 780 |
| `web/src/components/customer/time.ts` | delete | 11 | 0 | 11 |
| `web/src/components/ui/RangeChart.tsx` | delete | 54 | 0 | 54 |
| `web/src/components/ui/range-chart.css` | delete | 166 | 0 | 166 |
| `web/src/components/utility/presentation.ts` | modify | 23 | 0 | 23 |
| `web/src/three/pole-diagram.css` | delete | 5 | 0 | 5 |
| `web/src/three/sentinel/primitives.tsx` | modify | 2 | 1 | 1 |
| **Production total** | | **1,274** | **20** | **1,254** |
| **Production plus tests** | | **1,274** | **54** | **1,220** |

## Fresh verification receipts

Logs and supporting scripts are beside `lrp146-stage/` in the private agent directory.

| Check | Result | Receipt |
| --- | --- | --- |
| `PYTHONPATH=. .venv/bin/pytest tests/` | Exit 0; **140 passed**, no skips; one existing Starlette/httpx deprecation warning | `lrp146-tests.log` |
| `cd web && npm test` | Exit 0; existing integration checks, Person 5 UI regressions, **12/12 customer checks**, **5/5 performance checks** all pass; includes the current customer-light-surface contrast regression | `lrp146-frontend-tests.log` |
| `cd web && npm run build` | Exit 0; TypeScript and Vite production build succeed | `lrp146-build.log` |
| `python3 verification/verify_script.py docs/demo_script.md` | Exit 0; passed, 180 seconds / 400 spoken words | `lrp146-demo-script.log` |
| Fresh canonical versus rebased API/scenario corpus | **772 records exactly identical**, including rejection details and published OpenAPI | `lrp146-contract-before.json`, `lrp146-contract-after.json`, corresponding logs |
| Current frontend graph and CSS proof | 66 reachable files, no unresolved imports; 122 removed selector branches checked; all 155 active CSS lines preserved | `lrp146-frontend-after.json`, `lrp146-css-proof.json` |
| Protected claim checks | 16 premises / 12 equipment nodes; default local 3 and upstream 16; replacement workload **8.973957446808507 person-hours**, displayed **8.974**; four modeled disclosures; all 16 physical-substation traces UNKNOWN | `lrp146-claims.json`, `lrp146-claims.log` |
| Patch applicability and replay | Zero-fuzz dry run on the canonical target; private replay matches all 14 final hashes/deletions | `lrp146-patch-dry-run.log`, `lrp146-patch-replay.log` |

The repository-root `PYTHONPATH=.` is the existing local-launcher environment fix; no backend import/test-runner change is included. The canonical-source contract probe used `python -B` and process-local TestClient calls, with outputs redirected into the private agent directory. Corpus SHA-256 before and after: `75249b6db1fea68e28e96a0e82de27aa5be2b81ec456984632047ac56e44a7f2`. Its 772 records comprise 171 scenario/customer projections across every selectable asset/staffing/access combination, 600 authorization endpoint cases, and one OpenAPI snapshot. Rejected requests retain the live snapshot; the added regression also checks stored completion, authorization, context and notification state.

The Person 5 boundary checks retain UNDER_REVIEW/UNKNOWN abstention, no asserted affected premises or duration under conflicting evidence, false crew approval, modeled solar/endurance labels and false live-outage/territory-count flags. Source data, fixtures, contracts, existing tests and unrelated code are unchanged outside the manifest paths.

## Integration

Use `lrp146-source.patch` and `lrp146-manifest.json` in the private agent directory. The patch contains Git-style file headers, full blob IDs, six explicit deletions and the new report. SHA-256 before/final hashes in the manifest are authoritative. Apply only the 14 manifest paths; the staging directory also holds unchanged inputs and copied dependencies. For BSD patch, use `patch -E --batch -p1` to remove deleted files. Harness-owned Git integration should check/apply against the stated base and rerun the required commands after other changes.

`lrp146-SHA256SUMS` covers the final delivery and receipts. No deployment, fresh install, hosted CI, browser rendering, touch or graphics pass is claimed. This rebase preserves current CSS by exact bytes and passes its source contrast regression; it is not a new visual or contrast-ratio audit. Prior monolithic bundle-size measurements are historical and are not presented as current-build results.
