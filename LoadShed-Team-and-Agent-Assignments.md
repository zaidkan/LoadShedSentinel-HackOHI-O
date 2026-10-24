# LoadShed: four people, five coding-agent roles

Based on the updated `FINAL_LOADSHET_IMPLEMENTATION.md` supplied October 24, 2026. This is an allocation and handoff plan, not an instruction to start new sessions or modify the implementation. Preserve working code already built; do not restart to match a new tool allocation.

## Recommended assignment

Use **Codex for data, reasoning/restoration and integration, and Claude Code for the visual frontend**. This reflects the user's updated assignments for humans 2 and 3. Use a fifth repo-connected coding agent for the customer UI initially, then independent QA. A normal chat-only ChatGPT session is useful for reviewing explanations and rehearsing Q&A, but should not be a critical implementation handoff requiring people to copy large code blocks.

This is a practical workflow assignment, not a measured claim that a particular brand is inherently best at GIS, electrical reasoning or design. Human familiarity and the ability to edit/run/test the actual repository take precedence. If the whole team is already productive in Codex, using Codex for all four workstreams is reasonable; do not spend the build window migrating tools. Use the strongest suitable coding model already available in each tool for initial domain reasoning and integration, and ordinary/default effort for repetitive implementation. No current model leaderboard or subscription entitlement has been assumed.

| Human | Primary tool | Responsibility | First useful deliverable |
|---|---|---|---|
| **1. Data and network owner** — careful with data/identifiers | **Codex** | GIS ingestion, CRS, topology joins, sanitized subnet, risk features, affected-premise lookup, source coverage. Later owns video script/recording with the UI owner helping. | One real anonymized premise path, safe GeoJSON and matching risk response. |
| **2. Reasoning and restoration owner** — strongest at checking assumptions/math | **Codex** | Labor workbook parser, damage/work packages, evidence rules/unknown, crew capabilities, task dependencies, step restoration and scenario ranges. Bounded node-energy model after that works. | Importable pure functions with a hand-checked labor example and a local-versus-upstream case. |
| **3. Frontend owner** — strongest visual judgment | **Claude Code** | Visual system, utility screen, procedural 3D, map/panels, responsive customer screen ownership, browser verification. Supervises agent 5's customer-screen work. | Both views render the shared fixture; one incident visibly changes the 3D state and customer output. |
| **4. Integration lead** — strongest at debugging across modules/Git | **Codex** | Bootstrap, canonical schemas, API routing, shared client/store, scenario progression, customer guidance/notification logic, server-side customer projection, integration and final submission. | Running API + frontend, one canonical incident snapshot, one reset/advance path. |

**Human 4 should not also be the customer layout designer, video editor and every module's bug fixer.** This is the main correction to the uploaded ownership split. Human 3 owns frontend quality across both views; human 1 owns the recording package after its data handoff. Human 4 owns the final submission check.

## Agent 5: customer UI first, QA second

If five concurrent coding sessions are available, place the fifth in its own branch/worktree and give it only the customer page and customer-only components. Use another Claude Code or Codex session with repository access. Human 3 supplies design tokens and reviews the page. Human 4 supplies the typed customer projection/actions and backend behavior.

Once the customer-page commit is merged and the UI owner accepts it, stop agent 5's frontend edits. Reassign that session, or a fresh independent context if convenient, to integrated QA under human 4. It should reproduce problems and propose narrow changes; module owners fix their own code. It is not an unrestricted agent rewriting all four modules.

If only four coding sessions are available, human 3's agent builds the customer page after the utility scaffold. Keep it a compact screen using the same components. The team performs targeted cross-review. A fifth product or separate service is unnecessary.

## Exact file ownership

The app's Python API is the calculation authority. Both screens consume the same server revision, with a server-filtered customer projection; animations must not independently create diagnoses or ETRs.

| Owner | Editable scope | Exclusions / coordination |
|---|---|---|
| **1 — Data** | `pipeline/inspect_assets.py`, `pipeline/import_gis.py`, `pipeline/parse_upstream.py`, `pipeline/build_graph.py`; `engine/topology.py`, `engine/risk.py`; `data/processed/`; data/graph/risk tests; `docs/data_inventory.md`, data portion of `docs/source_ledger.md` | **Does not own `pipeline/import_labor.py`.** Supplies pure services/results, not changes to `api/main.py`. |
| **2 — Engine** | `pipeline/import_labor.py`; `engine/diagnosis.py`, `engine/crew.py`, `engine/restoration.py`, `engine/energy.py`; corresponding tests; labor/engine source notes | Reads the workbook immediately instead of waiting for owner 1. Requests schema changes from owner 4. |
| **3 — Frontend** | `web/src/three/`, `web/src/pages/UtilityPage.tsx`, utility/shared visual components and styles; frontend dependency/lockfile updates **after bootstrap ownership is handed over** | Receives snapshot/read-model props and callbacks. Coordinates customer visual tokens; does not edit shared API/state contracts. |
| **4 — Integrator** | `api/`, `contracts/`, `engine/customer.py` and notification backend logic; `web/src/app.tsx`, `web/src/services/api.ts`, `web/src/state/incidentStore.ts`; startup/configuration, integration tests, final evidence index | Only owner who changes canonical schemas, top-level routes, shared store or final integration branch. Does not invent business rules for another owner's module. |
| **5 — Customer UI, then QA** | Initially `web/src/pages/CustomerPage.tsx` and **customer-only** components/styles under an agreed directory. Later QA findings/reproducers in assigned test/report paths | Does not install dependencies, change global styles, alter the API or merge to main. After customer handoff, no further UI changes without reassignment. |

Clarify any current paths that differ before beginning; these are ownership boundaries, not a request to restructure working code. One writer per shared file. An agent's file restrictions should appear in its initial prompt, not only in the human chat.

## First coordination gate: 20–30 minutes

Human 4 establishes or verifies one runnable scaffold, one canonical schema and a shared fixture. Everyone then builds against that commit. Do not wait for the entire dataset or polished 3D.

Agree on:

- Canonical asset/premise IDs and the `UNKNOWN` enum values.
- `scenario_id`, `incident_id`, selected premise, `revision` and UTC timestamps.
- Source labels for challenge records, modeled sensors and scenario confirmations.
- Restoration duration units, the reference time/start point, total person-hours and crew assumptions.
- A server-generated customer-safe payload. Hiding operator fields in React is not a server privacy filter.
- Reset, advance and revise-input actions; replay must not duplicate alerts.
- What represents an unavailable estimate versus a genuine zero-hour result.

The shared JSON fixture should have internally consistent counts/IDs. For example, the uploaded example reports eight affected premises but enumerates two tokens; either enumerate the complete set or explicitly identify a partial preview and a separate total count.

**Human 4 owns Pydantic schemas as the authoritative structure and keeps TypeScript types/fixtures synchronized.** Generating frontend types from OpenAPI is optional if the team already knows the workflow; schema validation plus a frozen fixture is adequate for this build. Do not let multiple agents redesign the contract independently.

## Handoffs and acceptance

| From → to | Handoff | Accept only when |
|---|---|---|
| 4 → everyone | Schema, fixtures, service signatures, startup commands | API/fixture loads and all agents use the same version. |
| 1 → 2/4 | Graph slice, affected-premise lookup, match provenance | One actual path is traceable; unknown IDs return unknown, not nearest invented connectivity. |
| 1 → 3 | Sanitized GeoJSON/asset tokens | IDs match the shared fixture and coordinate handling is documented. |
| 2 → 4 | Pure assessment/crew/restoration/energy functions | Tests cover local/upstream/confirmed damage/unknown; units and assumptions accompany results. |
| 2 → 3 | State-to-visual enum mapping | `OPEN`, `CLOSED`, `UNKNOWN` and missing telemetry have distinct supported behavior. |
| 3/5 → 4 | Utility/customer components | Both render from fixture props, build successfully and expose typed callbacks; no frontend-generated diagnoses. |
| 5 QA → owner | Reproducible defect | Input, observed result, expected result/basis and affected files are supplied. |

Every handoff includes commit hash, changed paths, test command/result, known limitations and any schema request. A successful local screenshot alone is not a backend handoff.

## Work isolation and integration

Use one project repository. Four humans on separate laptops can use ordinary branches/checkouts; worktrees are useful when multiple sessions share one machine. Worktrees isolate file edits but do not eliminate eventual merge conflicts or isolate ports/databases automatically.

Suggested branches: `feat/data`, `feat/engine`, `feat/utility-ui`, `feat/customer-ui`, plus the human-4-controlled integration branch. Create them from the same scaffold commit. Do not make each agent bootstrap its own competing app. Keep raw input data read-only outside the tracked product and provide local paths to each worker; a Git branch does not distribute ignored datasets.

Human 4 owns merges. Integrate small, runnable changes when ready, targeting checkpoints roughly every 60–90 minutes early on. Merge the fixture-powered views before the complete engines are ready. Do not wait until hour 10 to discover that the app's two screens expect different schemas.

If independent local app servers are needed, allocate ports/configurations per checkout; otherwise stop a worker's server and verify the integrated version on the lead's known URL. Treat passing tests in a worker's checkout and passing integrated tests as separate evidence.

## Schedule from the remaining window

At the time of this recommendation it is approximately **4:15 p.m. EDT Saturday, October 24**: roughly **17 hours 45 minutes** remain until the stated **10 a.m. EDT Sunday, October 25** deadline. The uploaded document's full 20-hour schedule no longer fits if starting now. Apply these gates to existing work; do not reset progress.

1. **First 20–30 minutes:** verify scaffold, contracts, ownership and common fixture.
2. **Within 90 minutes:** one scenario advances through API, utility view, 3D and customer view—even if backed by labeled fixtures.
3. **Within four hours:** real AEP context and sourced labor replace the key placeholders; one complete customer journey works. Expose partial coverage honestly rather than waiting for an all-network import.
4. **By midnight:** all five AEP requirements, the core procedural 3D and the four incident cases are integrated. Node-energy detail/polish follows only if this gate passes.
5. **7 a.m. Sunday:** feature freeze. Fix blockers and rehearse; capture a working video backup before risky late changes.
6. **8:30 a.m.:** final MP4 rendered and played through, with submission assets ready.
7. **9:15 a.m.:** target submission, leaving margin before 10 a.m. Human 4 verifies the confirmation; human 1 retains a local backup.

After engine/data delivery, humans 1 and 2 can take specific integration bug tickets while human 3 refines the recording view and human 4 protects the running build. Avoid four people investigating the same vague failure.

## Ready-to-paste agent briefs

Prepend to each: “Read the updated LoadShed blueprint as product context. Preserve working code. Implement only the assigned scope below against the integrator's canonical schema/fixture. Do not pivot the product, add new services, invent empirical probabilities or change shared contracts without an explicit request. Finish with a commit/hash or patch, test results, and limitations.”

### Agent 1 — data / Codex

> Own GIS ingestion, upstream parsing, topology, sanitized subnet and ordinal risk services in the agreed data scope. Start with existing audit artifacts if available and verify the selected source records; do not repeat completed broad research. Deliver one real traceable premise path, safe GeoJSON, affected-premise lookup, risk factors/uncertainty and source coverage. Prefer a small valid real subnet over full-network completion. Label direct versus inferred spatial matches. Return pure service results for the integrator to wire. Test CRS/key mismatch, unknown premise and relevant scenario changes. Do not edit the labor parser, API, shared schema or frontend.

### Agent 2 — engine / Codex

> Own the labor parser and diagnosis/crew/restoration/energy modules. Read the actual workbook immediately. Use the AEP guide's 4.5 multiplier once to obtain person-hours; show the selected construction units, quantities and declared crew/parallelism assumptions. Deliver local-protection, upstream, field-confirmed damage and conflicting-data behavior with abstention. Implement one dependency-aware step-restoration comparison. Crew output is an operator-reviewed capability package. Node energy is bounded arithmetic after the restoration flow works. Test 6×4.5=27 person-hours, no double counting, upstream dependency, crew sensitivity and unknown evidence. No frontend/API/schema edits or new ML training.

### Agent 3 — utility frontend / Claude Code

> Own the utility screen, procedural R3F scene and shared visual system. Render the canonical fixture immediately. Build a low-poly pole/transformer/cutout/solar node with meaningful state changes, evidence/crew/restoration panels and a map. Drive state only from props/shared store supplied by the integrator; controls invoke agreed callbacks. No local diagnosis or fake ETR. Supply tokens/components to the customer-page agent. Verify in the browser at laptop and phone viewports, with WebGL/reduced-motion fallback. Do not rewrite global routing/contracts or spend the first hours on external 3D assets.

### Agent 4 — integrator / Codex

> Own scaffold, contracts, API routing, shared client/store, scenario state, backend customer guidance/alerts/privacy and integration. Publish the common fixture and signatures first. Connect teammate-owned pure functions; do not reimplement them. Generate a customer-safe server projection and idempotent four-state demo alerts. Keep API and both views on the same incident revision, including reset/replay behavior. Maintain a no-key local run path and a small end-to-end smoke suite. Merge reviewable slices and send module defects to their owners. Human 1 owns video production; you own the final running build and submission verification.

### Agent 5 — customer UI, then QA / Claude Code or Codex

> Phase 1: own only CustomerPage and customer-only components. Use the frontend owner's tokens and integrator's typed customer payload/actions. Implement premise selection, risk/factors, restoration range, declared needs, preparation, alert eligibility/history and visible uncertainty/provenance. Build a responsive compact page, not a separate app. No dependency/global-style/shared-state/schema changes. Once accepted and merged, stop editing UI.
>
> Phase 2: independently run the integrated build against the AEP requirements. Reproduce stale incident revisions, wrong premise, unknown evidence, upstream events, 4.5/crew calculations, duplicate alerts, restoration without confirmation, sensitive fields in customer responses and browser performance/fallback failures. Report exact reproducers and expected behavior; no broad architecture rewrite or new features.

## Why these tools

- Codex supports isolated Git worktrees for parallel repository work: [official worktree documentation](https://learn.chatgpt.com/docs/environments/git-worktrees). Use separate scopes for data, reasoning/restoration and integration; this is not evidence of superiority over another coding model.
- Claude Code supports scoped subagents and worktree isolation: [official subagent documentation](https://code.claude.com/docs/en/sub-agents). Its assigned scope is now the frontend. Human 3 should verify the rendered screens using the browser/testing tools available in their setup and retain screenshots of the working states.

Different vendors do not automatically create better results or independent correctness. Separation of ownership, working handoffs and tests are what make this allocation useful. A familiar coding tool with enough remaining capacity is preferable to learning another interface midway through the build.
