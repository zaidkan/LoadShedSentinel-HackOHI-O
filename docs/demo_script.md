# LoadShed Sentinel — three-minute, four-speaker script

Revised October 25, 2026 against `OHIO Judging Rubric.xlsx`, worksheet **Judging Rubric**, rows 5–10, the AEP Data Guide, and implementation commit `bb4482d`.

**Spoken budget:** 403 words. Read only the four blockquotes. Counts by Person 1–4: **92 / 100 / 108 / 103**. Screen cues, tables and Q&A notes are not spoken. Rehearse and verify the exported video's actual duration. This revision changes the script only.

| Speaker | Slot | Duration | Narration | Delivery window | Silent handoff / hold |
| --- | --- | --- | --- | --- | --- |
| Person 1 — Data & Topology | 00:00–00:40 | 40 s | 92 words | 00:00–00:38 | 00:38–00:40 |
| Person 2 — Twin & Labor Engine | 00:40–01:25 | 45 s | 100 words | 00:40–01:23 | 01:23–01:25 |
| Person 3 — Utility Interface & Controls | 01:25–02:15 | 50 s | 108 words | 01:25–02:13 | 02:13–02:15 |
| Person 4 — Customer Concierge & Orchestration | 02:15–03:00 | 45 s | 103 words | 02:15–02:58 | 02:58–03:00 |
| Total | 00:00–03:00 | 180 s | 403 words | 172 seconds | 8 seconds |

Use `confirmed_replacement` for the numeric demonstration. Start with three workers and zero additional access hours. Keep the same selected equipment and premise through the operator/customer handoff. Leave a short hold at each speaker change and end by 03:00.

## 00:00–00:40 — Person 1 — Data & Topology

> A storm leaves families asking whether power will fail, how long repairs could take, and how to prepare. We examined outage maps, equipment monitoring tools and battery apps. We chose to connect repair reasoning with household decisions. LoadShed Sentinel combines electrical engineering, geographic data and accessible communication. We validated over one hundred seventeen thousand supplied upstream paths offline. This website uses sixteen anonymized premises, with dependencies traced to circuit breakers. Its map shows source relationships, not live electricity. Critical facilities have approximate spatial associations; private customer coordinates stay out of public responses.

**Screen cues**

- **00:00–00:10:** Title, household questions, actual customer page.
- **00:10–00:20:** Brief research comparison from `research/COMPETITOR_MATRIX.md`. Show categories examined and the chosen integration. Omit unsupported blanket claims about competitor capabilities.
- **00:20–00:38:** Utility map and anonymous trace. Caption: **117,549 accepted paths offline; 16 premises in this demo; endpoint: circuit breaker**. Source insert: **52 public facilities: 5 hospital, 37 fire, 10 ambulance**. Facility links are assumed proximity, not verified electrical service.
- **00:38–00:40:** Map hold and speaker change.

[UI Variation Note] The customer premise text field changes the trace only. Establish incident context using the equipment selector before the customer handoff; do not describe typing a premise as updating its complete forecast.

## 00:40–01:25 — Person 2 — Twin & Labor Engine

> We asked: does an open fuse prove the transformer needs replacement? We tested local protection, upstream interruption and contradictory evidence. The system separates those explanations and withholds estimates when repair scope is unknown. Our three dimensional twin makes the evidence visible. Testing also exposed a labor units problem: a bank is not automatically one construction unit. We now require an explicit component count. For a declared twenty five kilovolt ampere replacement, workbook installation and removal hours total about two direct hours. Applying four point five once gives eight point nine seven person hours. Three workers give approximately three expected hours.

**Screen cues**

- **00:40–00:53:** Short clips of local protection, upstream interruption and insufficient evidence. Show **UNDER_REVIEW**, unknown risk and unavailable restoration time in the last case.
- **00:53–01:03:** 3D cutout and modeled evidence. Caption the actual lesson: **Bank count ≠ component count. Require explicit units.**
- **01:03–01:23:** Return to replacement and expand assumptions. Show **(C21 + D21) × 4.5 = 8.973957 person-hours; ÷ 3 workers = 2.991319 expected hours**, from `Labor time material related`. Caption: **Declared 25-kVA component; category-average labor; associated hardware and assessment excluded.**
- **01:23–01:25:** Calculation hold.

[UI Variation Note] Use OPEN/CLOSED/UNKNOWN without promising a hinge angle. The requested **45-degree cutout** differs from this revision: `OPEN.angle = -2.05` radians, about 117.5 degrees; use a 45-degree caption only after a separately changed and verified build. Conditions are modeled and replacement is declared, not an observed AEP outage or physical sensor demonstration. Keep person-hours distinct from elapsed hours.

## 01:25–02:15 — Person 3 — Utility Interface & Controls

> Here, changing crew size or access delay recalculates the planning range. Six workers reduce expected repair time to one and a half hours. Add two access hours, and it becomes three and a half. Lower and upper estimates keep uncertainty visible. Step restoration adds another decision: which section should return first? In this illustrated planning example, one three person crew has three person hours of hospital work and six of routine work. Hospital first restores that branch after one hour instead of three, with the same total effort. Actual switching requires verified isolation and dispatcher approval. This example explains the priority tradeoff separately from the working repair calculator.

**Screen cues**

- **01:25–01:42:** Real crew/access sliders, bounded at **2–8** workers and **0–24 h** access: **3 workers / 0 h → 2.99 h expected; 6 / 0 → 1.50 h; 6 / 2 → 3.50 h**. Wait for requests to complete. Keep low/expected/high visible.
- **01:42–02:08:** Cut to a slide outside application chrome, labeled **Illustrative planning example — not a live app result**. Use the comparison below.
- **02:08–02:13:** Return to the app and open Customer Concierge with the same incident and 3.50-hour expected result.
- **02:13–02:15:** Hold the matching range.

**Planning-example slide**

| Order | Hour 0–1 | Hour 1–2 | Hour 2–3 | Hospital branch restored |
| --- | --- | --- | --- | --- |
| Hospital first | Hospital repair | Routine repair | Routine repair | Hour 1 |
| Routine first | Routine repair | Routine repair | Hospital repair | Hour 3 |

Assumptions: one three-person crew; nine adjusted person-hours; branches independently repairable after isolation. The 3/6 person-hours are illustrative, not sourced workbook tasks; do not multiply by 4.5 again. Isolation/clearance and authorization are assumed with zero extra duration for this example. Hospital-first prioritizes assumed healthcare benefit. Routine-first could restore more premises earlier if that branch serves more customers; no verified customer counts or facility service links are asserted here.

[UI Variation Note] The application's hospital comparison currently does not activate because its source-field filter mismatches the facility schema. Present this as a labeled planning slide, not a screenshot or claim of a working app panel. It is not a verified switching plan.

## 02:15–03:00 — Person 4 — Customer Concierge & Orchestration

> The customer sees a risk band, its contributing factors, planning assumptions and the same incident estimate. Risk uses declared wind, temperature, load and equipment health inputs; it is not a calibrated probability. Household needs tailor preparation for medication, mobility and essential power. Battery capacity and appliance load change conservative backup runtime. Alert rules explain eligibility, proposed channels and escalation, with messages simulated. Our next integration connects ARCOS damage through pole and phase attributes, structure drawings and reviewed material quantities to repair scheduling. This prototype demonstrates a feasible foundation for helping households prepare and operators explain changing estimates, while keeping uncertainty and privacy visible.

**Screen cues**

- **02:15–02:29:** Actual risk drivers, confidence, planning range and source disclosure for the same incident.
- **02:29–02:40:** Toggle a household need and change battery capacity or load. Show real guidance/runtime updates. Guidance currently adapts to declared needs; do not claim it also responds to risk or restoration duration.
- **02:40–02:48:** Actual eligibility, proposed channels/cadence/escalation, and demo history or its empty state. No real SMS delivery is implied.
- **02:48–02:58:** Diagram labeled **Next integration**: **ARCOS damage → direct pole match or declared nearest-pole assumption → pole/phase attributes → representative structure → reviewed material quantities → workbook labor → dependency-aware scheduling**. Return to customer view for the final sentence.
- **02:58–03:00:** Silent title/customer-benefit hold; end picture and audio by **03:00**.

[UI Variation Note] Retain supplied uncertainty labels. Household battery runtime and sensor-node charge are separate models. Conceptual diagrams explain the intended extension; they do not represent completed integration.

## Detailed rubric coverage

The workbook contains six tabs, including alternate rubric-development sheets. This script uses **Judging Rubric**, rows 5–10, which have 1–5 descriptors. The final criterion is titled **Navigating challenges** in this workbook. These are evidence targets, not predicted scores.

| Criterion | What the highest descriptor rewards | Evidence in this script |
| --- | --- | --- |
| Innovation — B5:G5 | Research and analysis of accepted solutions, then exploration of alternatives. | Person 1 names researched categories and the chosen repair-to-household approach. Keep the actual comparison ready. |
| Curiosity — B6:G6 | Identifying knowledge gaps and acting on a plan to explore them. | Person 2 asks whether an open fuse establishes replacement and shows contrasting cases. |
| Communication — B7:G7 | Essential functional prototype elements plus visual explanation. | Real calculator interaction, a visible labor calculation and an explicitly illustrated priority tradeoff. |
| Project Breadth and Complexity — B8:G8 | Synthesis across humanities, science and engineering with a useful new result. | Electrical engineering, GIS dependencies, labor planning and accessible household communication. Explain how these inform one another. |
| Impact — B9:G9 | A detailed, justified concept with potential value that is feasible to develop. | Specific household needs, backup-runtime interaction, explainable estimates and a limited next integration. No measured benefit is asserted. |
| Navigating challenges — B10:G10 | Reflection on failure followed by an alternative that improves the result. | Actual ambiguous-bank unit issue, explicit component-count correction and regression checks. |

## Q&A notes

- **What works today?** Source-sample dependency tracing, modeled fault differentiation, workbook-backed transformer component estimates, crew/access sensitivity, needs-based guidance, battery calculations and simulated notifications.
- **What remains?** Hospital comparison integration, a complete ARCOS-to-structure work package, premise entry that updates the entire answer, and risk/duration-dependent preparation. The priority slide is illustrative.
- **What did you learn from failure?** A bank count does not establish component construction units. The mapper now requires an explicit construction-unit count. Evidence: `pipeline/import_labor.py`, the ambiguous-bank check in `tests/test_engine.py`, and the corresponding correction in commit `3153034`.
- **Why no estimate in protection/unknown cases?** No verified repair package has been selected, so the model leaves duration unavailable.
- **Does doubling crew halve real repair time?** The demo assumes divisible component labor. Skill mix, equipment, access and safety constraints can prevent linear improvement.
- **How would it scale?** Expand validated source coverage beyond the sixteen-premise runtime slice, review approximate facility links and connect work packages to actual repair dependencies. The large offline extract is not evidence of territory-wide runtime operation.
- **Did users validate it?** No direct customer feedback or measured savings is established in the repository. Do not invent interviews, sponsor endorsement or field results.

## Recording verification

Verify four quoted narration blocks, contiguous 40/45/50/45-second slots, a total spoken budget near 400 words, and an exported duration at most 180 seconds. Keep the actual calculator take showing updated values. Label conceptual inserts **Illustrative planning example** and **Next integration**.

Do not claim a completely green test suite. Current verification found 119 backend tests and 72 subtests passing, one Windows/POSIX permission assertion failure, a passing production build, and a Node frontend session-storage assertion failure. Those are separate checks.


## Additional capture details retained from the parallel main-branch revision

These are production/Q&A options, not additional narration or extra time beyond the three-minute edit. Substitute a prepared insert for an existing shot if needed. The prior script reviewed `e98af3e5c6ef192ab7103d0482dac557bb5d997c`; retain its evidence only where the current recording reproduces the behavior.

- **Session isolation and rapid selections:** Use two independently initialized browser contexts with distinct X-Session-ID headers and different scenario states. Do not expose tokens or assume a duplicated tab creates a new session. A rapid-selection take must finish on the latest chosen scenario. Keep the main six-worker/two-access-hour take unchanged.
- **Restoration gates:** Label an API insert **simulated operator authorization**. Using the current incident/revision, show a premature RESTORED request rejected; clear valid SCENARIO_BLOCKERS task IDs and show restoration still rejected without authorization; record explicit simulated authorization, then capture accepted restoration and CLOSED cutout. Use real responses, not a fictional operator button.
- **Customer persistence:** Demonstrate medical, refrigerated-medication and mobility declarations surviving refresh when browser storage is available. Household storage is browser-local; incident state uses session storage and X-Session-ID. Preserve the authoritative incident/revision across operator and customer views.
- **Battery reserve and retry:** Show the 15% conservative runtime reserve. In a prepared take, fail only a calculation request, capture its inline error, restore connectivity and press Retry. Record the fresh result. Guidance has its own retry path. Never present an old value as a recovered calculation.
- **Abstention and escalation:** In Scenario 4 show UNDER_REVIEW, UNKNOWN risk, no numerical duration and no confirmed-outage alert. Escalation is a demonstration preview, disconnected from emergency services and live dispatch. Use actual history or its empty state.

Run `python verification/verify_script.py` after narration edits to regenerate the timing metadata. It verifies the planned **03:00** endpoint and word counts; the recording team must still check exported media duration.
