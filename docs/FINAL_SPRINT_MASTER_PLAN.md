# LOADSHED SENTINEL — LOCKED FOUR-PHASE FINAL SPRINT MASTER PLAN

**Owner directive for Munder Difflin | HackOHI/O 2026 — AEP Track**  
**Version:** 1.0 · **Planning horizon:** approximately six remaining work hours  
**Target repository:** `zaidkan/Hackathon` · https://github.com/zaidkan/Hackathon  
**Repository destination for this document:** `docs/FINAL_SPRINT_MASTER_PLAN.md` (create this path when the owner hands you this file)  
**Current GitHub baseline observed:** `main` at `bb4482dfb5dd0d10415008cbf44b592f9090309a` (PR #3 Sentinel 3D redesign is merged). **Fetch the latest `main` again before making changes.**  
**Status:** Planning/dispatch authorization within scope; not an assertion that any phase has passed. Munder is the coordinator, NOT the single developer or sole auditor. Existing in-progress tasks are to be reused, not duplicated.

> ## ONE-SENTENCE MISSION
> Over the remaining sprint, finish a defensible technical baseline; substantially upgrade both the utility-operator and customer-facing information experience; investigate the highest-value hackathon-winning feature opportunities; then implement a tightly chosen set, verify the integrated system, and submit a truthful, polished three-minute demonstration.

## A. Non-negotiable execution order

1. **PHASE 1 — Technical baseline:** repeat independent Person #5 audit → focused remediation → independent verification cycles, until all significant launch-blocking issues are resolved or explicitly bounded. Do not certify the baseline just because tests passed on an older SHA.
2. **PHASE 2 — Major frontend, dashboard, information-architecture pass:** substantially redesign the *content, explanations, metrics, interactions, hierarchy and workflows* of BOTH the utility/operator and customer dashboards to a coherent, credible corporate-grade standard. This is **not** merely tweaking typography, spacing, or animation. Preserve the successful 3D model and existing source-connected engine unless evidence warrants a surgical change.
3. **PHASE 3 — Feature discovery/research and selection:** inspect the new integrated UI and current codebase, examine useful capabilities in other tools, assess what would most distinguish Sentinel from *other HackOHI/O submissions*, and rank feasible substantive additions. **Global originality is not required**; thoughtful adaptation of existing industry concepts is welcome. The top recommendation must improve user decisions, not just visuals.
4. **PHASE 4 — Selected feature implementation, integration, final verification, demo/submission:** implement only owner-approved new functionality; complete independent tests on the *actual release candidate*; update the three-minute script/video and submit using the official method.

**Important parallelism nuance:** The four phases are *priority and release gates*, not a ban on useful parallel preparation. Already-assigned engineering audits/tests continue immediately. A research chat can start READ-ONLY discovery while Phases 1–2 are running; it must refresh and reprioritize results after Phase 2, before features are selected. Phase 2 design reconnaissance can begin while Phase 1 engineering runs, but potentially conflicting source changes remain separate until Phase 1 gate passes. New-feature implementation waits for Phase 3's decision and explicit owner approval.

**Single-source-of-truth rule:** Maintain this document as the canonical **MASTER PLAN**. Specialized research findings, audit ledgers, design specifications and test receipts are linked **inputs**, not four competing implementation plans. Every approved finding becomes one prioritized, assigned backlog item here, with owner, branch, status and acceptance test. Never silently redefine phase order.

---

## B. Current snapshot and immediately known problems

- **PR #3: merged** into `main` via `bb4482d`; includes hero/inspection Sentinel 3D and earlier Person #5 remediation commit. Do not spend effort re-merging the 3D branch.
- **PR #4: open** and based on the separate UI-skills branch, NOT current `main`. It proposes a broad website redesign. Treat as a reference/candidate for Phase 2 only. Do **not** merge wholesale without comparing to the integrated current code and obtaining owner approval on the visual/content direction. PR #2 skills branch is similarly optional.
- **Existing work in Munder screen:** RBscat (three-minute script), Aj (independent Person #5 pass), Hb (backend/browser verification) were dispatched. Query their actual current status; reuse their tasks. If any completed, ingest results; if unfinished, do not launch duplicate identical audits.
- **NEW VERIFIED CI BLOCKER ON MERGED `main` `bb4482d`:** the GitHub Actions **backend check PASSED**, but **frontend check FAILED**. The TypeScript/Vite production build itself succeeds; failure occurs during `npm test` in `web/test-frontend.mjs` in the *API Service session isolation headers* assertion (near line 98). Test calls `api.getSessionId()`, then `api.fetchCurrentScenario()`, and finds different `X-Session-ID` values. `web/src/services/api.ts` currently regenerates IDs if `sessionStorage` is unavailable (Node test environment). **Root-cause hypothesis** (verify with reproduction): no module-level fallback/cache in non-browser environments. Fix either robust stable-per-context session persistence or correct test harness storage setup, as appropriate; do not mask a real per-request session-rotation problem. Re-run `cd web && npm ci && npm run build && npm test`, CI, and multi-request session-isolation browser checks. This is a Phase 1 immediate priority, not grounds to discard the redesign.
- **Timing:** repository release checklist records **Sunday October 25, 2026, 10:00 a.m. EDT** as the submission deadline, Google Form distributed in hackathon Discord, with a <=180-second video. **Owner/Munder must confirm actual current organizer instructions** and secure the submission link. A GitHub merge is not a submission.

**Truthful data boundaries to preserve in all changes:** Interactive runtime uses a bounded **16-premise anonymized AEP-derived sample**; substantial offline source data processing exists but is *not* the same as territory-wide live interactive coverage. Repair labor workbook yields approximately **8.974 adjusted person-hours** for a *declared* 25-kVA replacement package, not verified real asset-specific replacement time or monetized savings. Facility proximity does not establish real feeder connectivity. Modeled equipment/sensor evidence is not live AEP telemetry. Do not claim measured avoided $12,000 dispatches, actual utility deployment or actual customer alert delivery.

---

## C. Six-hour accelerated schedule — planning targets, NOT promises

These are **relative work windows**, not precise wall-clock completion predictions. Stages can overlap through isolated branches, but only the final verified candidate may ship. Adjust at every checkpoint. Protect **the final 60–90 minutes** for video/export/permissions/submission and any essential final test reruns.

| Relative window | Critical path | Parallel safe work | Hard checkpoint |
|---|---|---|---|
| **0:00–1:05** | PHASE 1: current CI failure, Aj/Hb evidence, targeted remediation, next independent P5 recheck | PHASE 2 operator/customer screen audit; read-only feature research; script draft | No known P0; all P1 blocking faults closed or bounded; green build + real browser smoke on target SHA, otherwise escalate |
| **1:05–3:10** | PHASE 2: operator/customer **content and workflow redesign**, integrate and check each slice | research chat continues collecting evidence, audit reviewer checks merged changes, RBscat refines speaking structure | Both dashboards meaningfully improved, claims correct, operational interactions intact |
| **3:10–3:45** | PHASE 3: consume research, re-evaluate top candidates against finished Phase 2, choose signature feature and up to two micro-enhancements | Start release storyboard; prepare demos and test fixtures | Owner decision; reject risky feature if unclear value |
| **3:45–4:40** | PHASE 4: implement selected *smallest defensible* WOW workflow and supporting changes on scoped branch | QA rehearses each changed interaction; film/video assets prepared | Merge only passing, demonstrated changes; freeze feature scope |
| **4:40–6:00** | PHASE 4 RELEASE: final tests, verify on-screen claims, rehearse, record/export <=3-min video, check access, submit, save receipt | Reviewer double-checks evidence ledger and Q&A | Submission proof secured BEFORE official deadline |

**Contingencies / kill switches:**
- If Phase 1 still has P0, broken scenario semantics, or no trustworthy browser demo, **stop Phase 3/4 feature implementation**. Engineering reliability wins over novelty.
- If Phase 2 consumes its window, **reduce scope to highest-value operator/customer screens**, don't delay video.
- If Phase 3 research cannot demonstrate a specific additional technical gain beyond current scenario switching, use existing functionality in a stronger demo instead of manufacturing a feature.
- At ~4:40 in this relative schedule, **feature freeze**: new work only for reproducible blockers, truthfulness and recording/submission accessibility. Don't lose the competition entry to a last-minute build.
- If a catastrophic blocker or deadline compression occurs, skip discretionary UI/features and deliver the best already-tested, honest version. Keep a fallback playable video as soon as a stable candidate exists.

---

## D. PHASE 1 — Repeated Person #5 audit / remediation / verification

**Goal:** A technically trustworthy baseline, not perpetual auditing or arbitrary 100% bug-free claims.

### Work already in flight

1. Ask Munder to locate Aj's latest Person #5 report, Hb's validation receipts and RBscat's script status. Confirm exact base SHA and whether they have integrated the merged 3D PR and latest remediation commit.
2. Immediately assign ONE appropriate engineer to the **frontend CI session-header test failure**; have a separate verifier reproduce, test and confirm. Avoid simultaneous edits to `web/src/services/api.ts` if another active task owns it.
3. Consolidate prior P0/P1 findings and source findings into `reviews/person5_current_remediation_ledger.md`. Every item must say: file/function, current SHA, verified behavior, severity, recommended fix, responsible worker, minimal reproduction, acceptance criteria, PR and closure evidence. No duplicative findings solely copied from old reviews.

### Audit cycle policy

- **Round A:** Aj's already dispatched independent Person #5 audit on latest integrated code; Hb runs independent QA. Find functional contradictions, source/data errors, faulty restoration claims, cross-session state, rapid switches, customer/operator mismatch, 3D display mismatches, boundary cases, deployment and real browser failures.
- **Remediation A:** Implement confirmed P0/P1 and high-impact P2 fixes in discrete branches/PRs. On modified code, add or extend regression tests, then merge only when safe.
- **Round B:** Have an auditor *different from the primary fixer* adversarially test the new **merged** candidate; check whether A's fixes introduced new defects, especially across frontend/API/contracts. Use at least one real browser path, not just source inspection.
- **Round C if warranted:** A third **targeted** review only if important failures remain or a major changed subsystem requires verification; timebox it. Do not repeat exhaustive audits forever while the deadline approaches.

**Release gate for PHASE 1:** No open P0; no unbounded consequential P1; source/data claims traceable; backend tests, TypeScript/Vite build, frontend tests **and representative real-browser tests** pass on the same integrated SHA (or documented time-limited fallback is explicitly accepted by the owner). 3D scenes, local/upstream/replacement/uncertain cases, customer sync, session state, error handling and authorization negative tests receive special attention. Separate truly production-only issues into post-hackathon backlog rather than pretending they are fixed.

**Gate deliverables:** current SHA, dated issue ledger, tests with actual commands/counts, screenshots/browser logs, known limitations and sign-off from independent reviewer.

---

## E. PHASE 2 — Major OPERATOR + CUSTOMER dashboard / content overhaul

**Owner's intent:** The site's overall graphical/3D direction is good, but the **actual information users receive and how they work with it** needs substantial improvement. Deliver corporate-grade usefulness, legibility, structure, navigation and trustworthiness — not a shallow cosmetic pass or an unrelated full-site reboot.

### Shared discovery before coding (short and practical)

- Audit every operator and customer screen from an actual browser against underlying current API responses. Mark each field: **source-derived**, **modeled**, **user-entered**, **inferred/conditional**, or **unavailable**.
- Identify confusing/outdated copy; placeholder-esque data; redundant cards; overly verbose technical jargon; metrics with undefined units; missing important decision context; wrong information hierarchy; disconnected controls; and results difficult to distinguish from assumptions.
- Deliver two **screen-by-screen content specifications** with exact section labels, data fields, primary interactions, status states, hierarchy and source mapping before extensive refactoring. A structured wireframe is acceptable; no unrelated design exploration loops.

### Utility / corporate operator dashboard — desired experience

A competent operator should answer, quickly and correctly: **What happened? Which part of the network is implicated? What is known versus uncertain? Who/what is affected in the validated sample? What response is justified? What could happen next?**

Prioritize, where supported by actual code/data:

1. **Incident overview and state:** visible incident ID, scenario state, selected asset/source, time/revision, impacted *sample* count, strongest available next action.
2. **Interactive Sentinel + grid relationship:** 3D cutout state corresponds to evidence; ability to identify affected source topology and nearby map context without pretending to control energized hardware.
3. **Evidence and diagnosis:** clear concise cards separating modeled observations, competing fault hypotheses, unsupported assumptions, uncertainty/abstention, and what additional verification would resolve ambiguity.
4. **Network/customer impact:** traceable affected premise subset, coverage boundaries, supported asset dependencies, not inferred entire AEP service territory.
5. **Restoration planning:** actionable work-package recommendation where evidence supports it; crew size, delays, calculated ranges; correct distinction between person-hours and elapsed hours; explanatory labor-source chain.
6. **Critical facilities and priorities:** show verified *spatial association* with clear caveats; never assert restoration of a specific hospital from geographic proximity.
7. **Operational actions:** selection, comparison, adjustment and review of decisions should update genuinely connected outputs rather than decorative numbers.
8. **Corporate presentation:** concise titles, strong hierarchy, clear status vs forecast, stable charts/3D behavior, understandable terminology and discoverable controls. Avoid burying essential information in walls of prose.

### Customer / household dashboard — desired experience

A customer should answer: **Is my service affected? How certain is that? Is restoration time known? What should I do now? When can I expect another update?**

Prioritize:

1. **At-a-glance service status** with unmistakable difference between confirmed outage, under review, normal and confirmed *simulated* restoration.
2. **Plain-English explanation** of the issue and source of information, omitting internal telemetry, asset IDs and sensitive topology.
3. **Restoration outlook** only when justified, including update time, relevant uncertainty, plain-language explanation of what could change the estimate; say unavailable when unknown.
4. **Next steps and household preparedness**, organized by urgency and user-declared needs, with conservative battery-runtime estimates and explicit limits; no medical guarantee or false evacuation instruction.
5. **Notification and cadence expectations** describing what would be communicated, eligibility, and demo-only delivery status; no false claim that messages were sent to real customers.
6. **Responsive, accessible flow** with high contrast, useful labels, loading/retry/stale/error states, mobile usability, reduced-motion handling and keyboard access.
7. **Consistency:** same incident and revision as operator-facing system, but appropriately privacy-projected and human-readable.

### Phase 2 implementation policy

- Prefer targeted component/content restructuring across current app with existing CSS/design language and recently merged 3D. Reuse backend contracts; introduce minor API presentation fields only if justified and covered by tests.
- Use **separate owner-assigned file zones**: operator dashboard / shared design shell / customer dashboard / integration API. One designated integrator resolves cross-screen contract changes. Do not let two agents independently rewrite `App.tsx`, `services/api.ts`, global CSS or shared contracts.
- If PR #4 has relevant pieces, **review/cherry-pick selectively onto a fresh branch based on current `main`**. It currently sits on a different base and is not authorization to replace the latest current site.
- Stagger merges; run UI smoke tests against actual API for both views after each integration. Preserve the 3D fallback, open/closed/unknown semantics and source provenance.

**Release gate for PHASE 2:** Two coherent working dashboards demonstrate a useful operator and customer workflow with current inputs; no placeholder or fabricated claims; usable hierarchy; mobile/desktop accessible; existing core scenarios, real AEP sample, 3D model and calculations still function. Deliver annotated screenshots or short screen recordings plus a changed-file list and tested SHA.

---

## F. PHASE 3 — Feature research / ranked recommendation

**Research may START read-only now, but a FINAL shortlist and selection must reflect the Phase 2 result.** Do not dispatch yet another generic Person #5 or merely repeat the existing 18-feature brainstorm. Investigate where functionality is absent or awkward after the redesign.

### Research standard

1. Examine the latest actual GitHub implementation: endpoints, engines, UI interactions, source-sample coverage, 3D scene, tests and existing `research/*.md`. Mark capabilities PRESENT / PARTIAL / ABSENT / ASSUMED with exact locations. Determine whether Phase 2 has already solved the proposed gap.
2. Check HackOHI/O AEP challenge, official rules/rubric and available prior hackathon projects. Evaluate against the likely **peer-submission bar** (technical depth, usable integrated workflow, visual causality, clarity, completeness), not the requirement to surpass every enterprise utility product. Preserve uncertainty where other entrants are unknown.
3. Mine inspiration from mature outage systems, interactive digital twins, grid restoration tools, emergency coordination products and academic demos. It is **acceptable to adapt existing successful ideas**; explain the implementation advantage in this specific product.
4. Examine the current three top candidates independently: **Counterfactual Incident Comparator**, **Interactive Blast-Radius Explorer**, **Evidence-to-Decision Explanation**. Validate whether existing scenarios can truly be compared under equivalent asset/evidence assumptions, and whether a source-connected comparison would be a new technical capability rather than merely two screenshots side by side.
5. Consider additional features if justified (labor-source explainer, calibrated uncertainty/abstention interaction, review-only planning alternatives, useful customer consequence visualizations), but only with available data and actual working semantics.
6. Red-team every recommendation for **fake savings**, misrepresented AEP source coverage, simulated sensor data labeled live, asset-specific rating assumptions, implied real-world dispatch authority, underestimated integration effort, and overlapping work already done.

### Required research output

A single **decision memo**, not an unbounded encyclopedia, containing:

- Current implementation inventory and highest-value content gaps **after Phase 2**.
- Ranked 5–10 meaningful additions; cite actual repo locations and concrete external sources.
- Three finalists with: exact user action; calculated consequence; data prerequisites; touched files; responsible engineering skill; compatibility with revised dashboards; minimum viable scope; acceptance tests; failure risks; rollback; visible 15–20 second demo moment.
- **One recommended flagship WOW feature and at most two small supporting improvements**, with an explicit alternative of *build no extra features* if the current app already wins on integrated storytelling.
- A concrete build plan that fits the **remaining time** rather than proposing multi-hour projects without accounting for video/submission.

**Decision authority:** Research findings are proposals, not executable permissions. Owner must select/approve the final flagship and optional support items. Munder then turns them into scoped implementation tickets in the single master plan. If owner unavailable and deadline approaches, do not invent approval: freeze and ship the strongest verified app.

---

## G. PHASE 4 — Approved implementation, integration, independent tests, demo and submission

1. **Implement only owner-selected features.** A single integrator owns cross-cutting API/schema/UI state. Feature workers stay on scoped branches and produce tests; unused candidates stay parked.
2. **Integrate to latest `main` carefully** (never reset to previous SHA). Preserve Person #5 fixes, session isolation, restoration authorization, 3D hero/inspection, source-data limitations, improved operator/customer information architecture, and existing scenario interactions.
3. **Verify final SHA:** backend suite, frontend type/build/tests, representative mounted-browser flows, all four scenarios, rapid controls/session isolation, mapped premise counts, customer privacy projection, 3D open/closed/unknown/fallback, crew/access labor math, loading/network failure cases, and selected feature tests. Any required failed check blocks sign-off until fixed or owner explicitly chooses the documented fallback candidate.
4. **Truthful impact/claim ledger:** confirm what is AEP-derived vs modeled, sample counts vs full offline data, labor person-hours vs wall-time, facility proximity caveats, review-only recommendations, and no unsupported dollar savings or accuracy percentages.
5. **Update script, then film:** RBscat integrates actual implemented screens and demo path (not proposed features). Select one powerful visually obvious before/action/after moment; keep video <=180 seconds. Review audio/video output; check video access and repo visibility for judges.
6. **Submit:** obtain official Google Form from hackathon Discord, verify actual deadline/rules, submit required project/video materials, save screenshot/receipt. Coordinate required Zoom judging and Q&A. Human owner remains responsible for any platform submission requiring their credentials/confirmation.

**Last-resort rollback:** Keep a known-good build and script from before feature changes. If feature is unstable near feature-freeze, exclude it and film the stable version. Do not postpone submission to rescue a speculative addition.

---

## H. Munder dispatch & change-control protocol

### Existing workers — integrate, don't duplicate

- **Munder:** project orchestrator and source of truth; owns master backlog, conflict avoidance, readiness decisions presented to owner, periodic concise status. Should not take ownership of all fixes personally.
- **Aj:** independent Person #5 audit currently in flight. First determine its SHA/status; use as audit Round A, not a duplicate fresh assignment. Can subsequently review remediation independently.
- **Hb:** backend/integration/testing currently in flight. Coordinate immediate frontend CI issue ownership and test receipts without conflicting with Aj.
- **RBscat:** currently working on 3-minute speaker script. Preserve progress; delay final script lock until after features and UI are confirmed.
- **Other available agents (Bob/Zk, etc.):** can be assigned operator/customer content/design or feature implementation, subject to actual availability and explicit file ownership. Do not assume a named agent is free or working on the correct branch without checking.

### One master plan, continuously updated

Maintain a structured backlog inside this document or a directly linked `docs/FINAL_SPRINT_EXECUTION_LEDGER.md`:

| ID | Phase | Work item | Severity/value | Owner | Branch/PR | Status | Tested SHA | Next blocker | Acceptance proof |
|---|---|---|---|---|---|---|---|---|---|
| CI-001 | 1 | Fix `web/test-frontend.mjs` session-header failure | Release blocker | Unassigned until Munder checks active owners | TBD | OPEN at `bb4482d` | `bb4482d` failed | Root cause verification | `npm test` and CI green + browser stable session ID |
| P5-A | 1 | Ingest Aj independent audit and remediate meaningful findings | P0/P1 first | Aj audit / engineer assigned per finding | Existing task | IN PROGRESS per user screen | Confirm | Exact report/SHA | Adversarial retest and closure ledger |
| QA-001 | 1 | Complete Hb test suite/browser verification | Release gate | Hb | Existing task | IN PROGRESS per user screen | Confirm | Current integrated SHA | Published test receipts |
| UX-OP | 2 | Operator dashboard content/decision-flow redesign | High strategic value | Assign available frontend worker | Fresh branch | PLANNED | TBD | Short spec + API map | Operator acceptance demo |
| UX-CU | 2 | Customer dashboard content/action-flow redesign | High strategic value | Assign separate frontend worker | Fresh branch | PLANNED | TBD | Short spec + projection map | Household acceptance demo |
| RES-01 | 3 | Hackathon-focused feature research + shortlist | Strategic | Research chat | Read-only | PLANNED | Refresh after Phase 2 | Latest UI evidence | Owner-facing top-3 memo |
| WOW-01 | 4 | Implement approved signature feature | Conditional | TBD | New branch | BLOCKED ON APPROVAL | TBD | Owner selection | Feature test + demo |
| REL-01 | 4 | Film, verify and submit | Deadline-critical | Owner/RBscat + QA | Release candidate | PLANNED | TBD | Stable integrated SHA | Playable video + actual submission receipt |

**Each worker update MUST include:** observed SHA, task ID, precise files changed, issue/evidence, tests run and results, what remains, touched branches/PRs, any potential overlap, and whether the deliverable is ready for integration. Mark `NOT RUN` for omitted tests. Munder must reconcile updates before expanding the backlog.

**Change admission policy:** All new findings go into an **inbox** with evidence. Munder triages into (a) blocking P0/P1 or CI, (b) high-return operator/customer UX, (c) researched candidate, (d) defer/post-launch. Avoid constant reprioritization from every agent's speculative suggestion. New research continuously updates the decision memo and backlog, but does **not** automatically invalidate the agreed four-phase sequence.

**Conflict policy:** Protect `App.tsx`, `web/src/services/api.ts`, `contracts/`, global styles, and cross-cutting API schemas with designated integrator ownership. Each worker gets an isolated branch; report upstream HEAD and rebase/merge conflicts explicitly. No agent blindly overwrites other workers' changes or bulk-merges open PR #4. Tests on branch SHAs are not proof about a different merged SHA.

**Reporting to owner (short format):**

```
FINAL SPRINT — STATUS
main: <sha> | Last integrated/tests: <sha>
Phase: <1/2/3/4> | Gate: <PASS/BLOCKED/IN PROGRESS>
Completed since last update: <max 3 concrete items>
Current blocking issues: <P0/P1/CI plus owners>
In parallel: <worker -> active task, without duplicates>
Owner decision needed: <one clear question or NONE>
Next merge / next test / next demo milestone: <specific>
Release readiness: <NOT VERIFIED / VERIFIED with receipt>
```

### Immediate initial actions for Munder (authorized)

1. Import this plan as `docs/FINAL_SPRINT_MASTER_PLAN.md` on a nonconflicting documentation branch; report the source-of-truth location. Keep one canonical live plan, with links to existing reviews, research and `docs/demo_script.md`.
2. Pull fresh `main`, inventory agent/task status. **Do not re-run or redispatch already active work.** Capture which Aj/Hb/RBscat artifacts are new and their SHA; synchronize with `bb4482d` or newer.
3. Start targeted fix/verification of **CI-001 frontend session-header test** and complete pending audit/check tasks. Avoid file conflicts and assign a single responsible engineer.
4. In parallel, commission quick **two-dashboard content/UX audit** and a **READ-ONLY research reconnaissance**; neither should edit shared files during engineering stabilization.
5. When P1 baseline gate is demonstrably ready, dispatch isolated operator/customer redesign tasks with exact acceptance criteria. After their integrated result, ask research to refresh its ranked features and return the top decision to the owner.
6. Following owner feature approval, integrate small selected work, run final release gate, freeze, film and submit. Protect the final submission window above any optional feature.

---

## I. Definition of done

This sprint is not 'complete' when an agent says 'done', all boxes in a stale checklist are checked, or the UI looks appealing. It is complete when:

- [ ] PHASE 1: major technical issues remediated or explicitly bounded; independent evidence and final integrated SHA green.
- [ ] PHASE 2: both operator and customer outputs meaningfully clearer, richer, more credible and fully interactive; content sourced and accessible.
- [ ] PHASE 3: ranked, current-GitHub-grounded features; evidence-based flagship recommendation; owner approves which, if any, to build.
- [ ] PHASE 4: approved feature integrated or explicitly declined; complete actual browser and code verification; final <=3-minute demo video reviewed; submission confirmation retained.

**Owner's standing priority when tradeoffs arise:** Correctness and credible AEP data first; useful and compelling operator/customer dashboard content second; genuine hackathon WOW functionality third; extra polish fourth. A real, verified entry submitted on time beats an unfinished ambitious build.
