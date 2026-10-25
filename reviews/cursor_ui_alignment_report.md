# LRP-147 · Cursor Dusk UI alignment

Verified 2026-10-25. **Implementation is complete in the private staging copy; canonical integration and browser acceptance remain pending.** The canonical repository is outside this agent's writable roots. No canonical source or Git metadata was modified. No files under `/Users/zaid/Projects/Grub-App` were opened or changed.

## Changes

- Mapped the active operator `--u-*` aliases and customer palette to the existing paper, ink, hairline, accent, and state tokens. Both legacy stylesheets now contain zero literal colors. Existing Cursor rules, `DESIGN.md`, `tokens.css`, `AppFrame`, and landing source remain unchanged.
- Operator reading surface now uses periwinkle paper and ink, with serif headings, Hanken body tokens, Geist identifier/time tokens, pill controls and badges, and ruled sections. DecisionSummary stays first, before comparator, telemetry, evidence, planning, and network context.
- Comparator is a two-column ruled comparison on desktop and a stacked ledger below 900px. Retained every hypothesis, metric, claim, button, and scenario callback. Replaced Tailwind sky/emerald/amber presentation utilities with named Dusk classes; selection uses ultraviolet.
- Customer service, household, guidance, battery, notification, and connection lookup retain their content and behavior. Cards use the shared radius/shadow, fields and buttons use Dusk treatments, runtime is ink rather than green, and status colors distinguish unknown, at-risk, outage, and normal. A `data-status` attribute makes the existing at-risk state amber without changing its plain-language copy.
- Inspection stays a Dusk night surface with readable night foregrounds, violet hotspots, and themed 2D labels. The Sentinel assembly, AssetViewport, camera controls, procedural geometry, cutout angles, detail selection and fallback behavior remain intact. Three.js/SVG cutout fills match the existing token values; UNKNOWN still has no asserted angle.
- Vite splits the existing Three.js core and renderer modules, plus React, into independent cacheable chunks. Largest JavaScript chunk is 364.74 kB; no warning threshold was raised. The emitted static chunk import graph is acyclic.

## Preservation evidence

`preservation-checks.json` records unchanged hashes for DecisionSummary, PlanningPanels, EvidencePanel, TelemetryHUD, SupplyPath, AssetViewport, SentinelAssembly, LandingPage, AppFrame, tokens, and API services. Backend, contracts, fixtures, data and tests are unchanged.

`alignment-checks.json` records identical comparator markup content (ignoring presentation attributes and icons) for all four scenarios and exercises each scenario-switch callback. Customer markup content and controls match the baseline in NORMAL, AT_RISK, OUTAGE, UNDER_REVIEW, and RESTORED.

The 16-premise anonymized sample disclosures, 8.974 person-hour workbook figure, modeled sensor labels, abstention notices, and facility association/proximity limitations are preserved. Existing comparator text including its $12,000 assertion is unchanged; this style task does not independently substantiate the assertion. No new operational, cost, telemetry, or customer-impact claims were introduced.

## Verification receipts

Executed from `lrp147-work`, using copied project source and read-only canonical dependencies/data archive references:

| Check | Result | Receipt |
| --- | --- | --- |
| `cd web && npm test && npm run build` | Exit 0; all frontend integration checks and 12/12 customer regressions pass; build has 0 errors and 0 warnings | `frontend-tests-build.log`, `frontend-receipt.json` |
| `.venv/bin/pytest -o pythonpath=. -q tests/` | Exit 0; **137 passed, 72 subtests passed, 1 warning** | `python-tests.log`, `python-receipt.json` |
| Comparator/customer baseline content and callback comparison; static chunk graph | Pass | `alignment-checks.json`, `verify-alignment.mjs` |
| Impeccable detector on changed styles/components | No findings (`[]`) | `design-detector.json` |
| Scoped canonical base hashes and unchanged feature source | Pass at packaging | `manifest.json`, `preservation-checks.json` |

Frontend verification uses bundled Node **24.22.1** on PATH. Conflicting inherited `FORCE_COLOR`/`NO_COLOR` variables were removed; no warning suppression flags were used. Initial Node 25 verification passed but emitted environment/localStorage warnings. Initial build emitted the large-chunk warning, fixed by the explicit chunk split.

Python's single warning is `StarletteDeprecationWarning`: installed FastAPI's TestClient uses deprecated httpx support. Dependencies were not changed or warnings hidden. Do not report Python as warning-free.

## Acceptance limits

Live desktop/mobile screenshots and interactive WebGL acceptance could not run in this sandbox. Uvicorn on 127.0.0.1:8017 and Vite on 127.0.0.1:3147 both fail to bind with EPERM. Playwright's default browser revision is absent; launching an already installed Chromium also exits before a page opens. No browser or screenshot pass is claimed. Test the landing, `#/operator`, and `#/customer` after integration, including model focus/orbit/zoom/reset, low detail, 2D fallback, scenario comparison, household edits, and mobile overflow/focus.

Typography uses the existing shared font-family tokens and their fallback stacks. This task does not change global font asset delivery. The existing Impeccable sidecar is older than DESIGN.md; DESIGN.md and tokens.css were the authority, and no unrelated context repair was made.

## Integration

Delivery directory: `/Users/zaid/Larp-MAXXX/hive/agents/hbangela-mve9reh5/lrp147-delivery`.

Apply only `source.patch` after verifying every existing file's `base_sha256` in `manifest.json`. It contains eight changed production files and this new report at `reviews/cursor_ui_alignment_report.md`. All base hashes matched at packaging. Private source support copies, the `.venv`/archive references, dependency links, generated dist files, the temporary preview configuration and verification scripts are excluded from the integration payload. No commit, index, merge, or remote operation was performed.
