# LoadShed Sentinel — three-minute, four-speaker script

Page mapping verified against the running app at **http://localhost:3002** on October 25, 2026. Live-page observations supersede the earlier `bb4482d` screen cues below. Rubric basis: `OHIO Judging Rubric.xlsx`, worksheet **Judging Rubric**, rows 5–10, the AEP Data Guide, and implementation commit `bb4482d`.

**Spoken budget:** 400 words. Read only the four blockquotes. Counts by Person 1–4: **92 / 100 / 104 / 104**. Screen cues, tables and Q&A notes are not spoken. Rehearse and verify the exported video's actual duration. This revision changes the script only.

| Speaker | Slot | Duration | Narration | Delivery window | Silent handoff / hold |
| --- | --- | --- | --- | --- | --- |
| Person 1 — Data & Topology | 00:00–00:40 | 40 s | 92 words | 00:00–00:38 | 00:38–00:40 |
| Person 2 — Twin & Labor Engine | 00:40–01:25 | 45 s | 100 words | 00:40–01:23 | 01:23–01:25 |
| Person 3 — Utility Interface & Controls | 01:25–02:15 | 50 s | 104 words | 01:25–02:13 | 02:13–02:15 |
| Person 4 — Customer Concierge & Orchestration | 02:15–03:00 | 45 s | 104 words | 02:15–02:58 | 02:58–03:00 |
| Total | 00:00–03:00 | 180 s | 400 words | 172 seconds | 8 seconds |

Use `confirmed_replacement` for the numeric demonstration. Start with three workers and zero additional access hours. Keep the same selected equipment and premise through the operator/customer handoff. Leave a short hold at each speaker change and end by 03:00.

## Quick navigation for the recording team

Use the running **http://localhost:3002** app. On a narrow window, open **Open menu** at top right to see **OVERVIEW / PREVENTION / OPERATOR / CUSTOMER**. On wider windows, use the visible navigation. Scenario/equipment controls are shared across the working pages.

| Presentation page | Open directly | What belongs here |
| --- | --- | --- |
| Overview | [localhost:3002/](http://localhost:3002/) | Opening title/twin, offline source ledger, four-stage method, four incident cards and source boundaries. |
| Prevention | [localhost:3002/prevention](http://localhost:3002/prevention) | Pre-fault condition trends, storm readiness, conditional response-time assumptions and research evidence. Useful for Person 1 or Q&A. |
| Operator | [localhost:3002/operator](http://localhost:3002/operator) | Fault alternatives, 3D inspection, evidence, labor, crew/access recalculation, priority comparison, step restoration, supply path and feeder map. |
| Customer | [localhost:3002/customer](http://localhost:3002/customer) | Plain-language service/risk/window, household priorities, battery planning, communication previews and home connection lookup. |

**Main take setup:** Operator → **Scenario: Transformer Replacement** → equipment **Transformer …3AD1FB8F · 3 sample premises** → **Crew size 3**, **Access delay 0**. Capture the comparison/scenario/section clips separately, then return to this setup. Change to **6 workers / 2 h** for the shared customer handoff. Do not press Reset during that handoff.

## 00:00–00:40 — Person 1 — Data & Topology

> A storm leaves families asking whether power will fail, how long repairs could take, and how to prepare. We examined outage maps, equipment monitoring tools and battery apps. We chose to connect repair reasoning with household decisions. LoadShed Sentinel combines electrical engineering, geographic data and accessible communication. We validated over one hundred seventeen thousand supplied upstream paths offline. This website uses sixteen anonymized premises, with dependencies traced to circuit breakers. Its map shows source relationships, not live electricity. Critical facilities have approximate spatial associations; private customer coordinates stay out of public responses.

**Where to present — Person 1**

| Script passage | Current webpage / section | What to show or click |
| --- | --- | --- |
| Families asking about outage and preparation | [Overview](http://localhost:3002/) → hero; then [Customer](http://localhost:3002/customer#service-heading) → **Your service status** | Show the project name and customer-facing service/restoration summary. |
| Research and chosen approach | [Prevention](http://localhost:3002/prevention) → **What the evidence supports** near the bottom | Use as research context. The competitor matrix itself is a separate source insert; there is no competitor-comparison webpage. |
| Offline paths versus sixteen-premise demo | [Overview → source ledger](http://localhost:3002/#overview) → **EVERY PREMISE TRACED TO THE BREAKER THAT FEEDS IT** | Show **117,549** accepted paths and the sentence identifying the **16-premise** interactive sample. |
| Dependencies and privacy boundary | [Operator → Supply path](http://localhost:3002/operator#utility-supply-heading), then **Source disclosure & provenance** in Feeder context | Point to the premise → transformer → protection → breaker trace and **Substation not identified**. Use the stated facility assumptions, not inferred facility service. |

**Screen cues**

- **00:00–00:10:** Title, household questions, actual customer page.
- **00:10–00:20:** Brief research comparison from `research/COMPETITOR_MATRIX.md`. Show categories examined and the chosen integration. Omit unsupported blanket claims about competitor capabilities.
- **00:20–00:38:** Utility map and anonymous trace. Caption: **117,549 accepted paths offline; 16 premises in this demo; endpoint: circuit breaker**. Source insert: **52 public facilities: 5 hospital, 37 fire, 10 ambulance**. Facility links are assumed proximity, not verified electrical service.
- **00:38–00:40:** Map hold and speaker change.

[UI Variation Note] The customer premise text field changes the trace only. Establish incident context using the equipment selector before the customer handoff; do not describe typing a premise as updating its complete forecast.

## 00:40–01:25 — Person 2 — Twin & Labor Engine

> We asked: does an open fuse prove the transformer needs replacement? We tested local protection, upstream interruption and contradictory evidence. The system separates those explanations and withholds estimates when repair scope is unknown. Our three dimensional twin makes the evidence visible. Testing also exposed a labor units problem: a bank is not automatically one construction unit. We now require an explicit component count. For a declared twenty five kilovolt ampere replacement, workbook installation and removal hours total about two direct hours. Applying four point five once gives eight point nine seven person hours. Three workers give approximately three expected hours.

**Where to present — Person 2**

| Script passage | Current webpage / section | What to show or click |
| --- | --- | --- |
| Open fuse versus upstream interruption | [Operator](http://localhost:3002/operator#counterfactual-heading) → **Counterfactual Incident Comparator** | Select **Local Transformer Protection**, then **Upstream Breaker Interruption** in the top **Scenario** control. The displayed scope belongs to the loaded scenario. **Load Baseline Comparison** changes the active scenario; return to replacement afterward. |
| Contradictory evidence and withheld estimate | Operator top **Scenario → Contradictory Telemetry** | Show **Diagnosis & uncertainty**, unavailable restoration planning, and the unknown/under-review state. Capture this clip separately before the numeric take. |
| Three-dimensional twin | [Operator → Modeled telemetry](http://localhost:3002/operator#utility-telemetry-heading) → **Asset inspection** | Select **Cutout** under **Focus a component**; use **Orbit model left/right**, **Zoom model in/out**, or **2D diagram**. These are inspection controls. |
| Unit correction | Separate short text/source insert | The bank/component regression is not a web control. Caption the lesson while showing the twin or the code evidence. |
| Workbook effort and three-worker duration | [Operator → Review-only work package](http://localhost:3002/operator#utility-work-heading) | Set **Scenario → Transformer Replacement**, equipment ending **3AD1FB8F**, **Crew size 3**, **Access delay 0**. Show **Labor effort 8.974 person-hours**, **Expected 2.99 h**, then expand **Workbook & range assumptions** for C21/D21 and the single 4.5 multiplier. |

**Screen cues**

- **00:40–00:53:** Short clips of local protection, upstream interruption and insufficient evidence. Show **UNDER_REVIEW**, unknown risk and unavailable restoration time in the last case.
- **00:53–01:03:** 3D cutout and modeled evidence. Caption the actual lesson: **Bank count ≠ component count. Require explicit units.**
- **01:03–01:23:** Return to replacement and expand assumptions. Show **(C21 + D21) × 4.5 = 8.973957 person-hours; ÷ 3 workers = 2.991319 expected hours**, from `Labor time material related`. Caption: **Declared 25-kVA component; category-average labor; associated hardware and assessment excluded.**
- **01:23–01:25:** Calculation hold.

[UI Variation Note] Use OPEN/CLOSED/UNKNOWN without promising a hinge angle. The requested **45-degree cutout** differs from this revision: `OPEN.angle = -2.05` radians, about 117.5 degrees; use a 45-degree caption only after a separately changed and verified build. Conditions are modeled and replacement is declared, not an observed AEP outage or physical sensor demonstration. Keep person-hours distinct from elapsed hours.

## 01:25–02:15 — Person 3 — Utility Interface & Controls

> Here, changing crew size or access delay recalculates the planning range. Six workers reduce expected repair time to one and a half hours. Add two access hours, and it becomes three and a half. The live priority comparison uses two declared repair jobs and one shared crew. Hospital-associated work finishes at three and a half hours instead of about five, with the same total effort. Step restoration separately shows how an isolated fault need not keep every customer out. Isolation alone restores nobody. We release the unaffected group, complete the repair, then authorize the repaired group. Every action is modeled; no field switch operates.

**Where to present — Person 3**

| Script passage | Current webpage / section | What to show or click |
| --- | --- | --- |
| Crew and access recalculation | [Operator → Restoration planning](http://localhost:3002/operator#utility-restoration-heading) | Start at **3 workers / 0 h**. Move **Crew size** to **6**, wait for **Applied to displayed range: 6 lineworkers · 0 h**, then move **Access delay** to **2**. Expected values: **2.99 → 1.50 → 3.50 h**. |
| Hospital-associated branch priority | Same panel → expand **Critical facility priority comparison** | With **6 workers / 2 h**, show **3.5 h hospital / 4.99 h total** for hospital-first versus **4.99 h hospital / 4.99 h total** for customer-count-first. These are conditional work-completion times under assumed facility associations. |
| Isolate, restore unaffected customers, then repair | [Operator → Step restoration](http://localhost:3002/operator#utility-section-demo-heading) → **Step restoration: isolate, restore, repair** | Use the sequence in the rehearsal table below. Record in a separate take: **Start modeled section demo** changes the incident and its customer footprint. |
| Same incident shown to a household | [Customer → Your service status](http://localhost:3002/customer#service-heading) | After the step-demo insert, re-establish **Transformer Replacement**, **6 workers / 2 h** on Operator, then navigate to Customer. **Restoration outlook** rounds the range to **3.1–4.2 hours**; the latest **Planning estimate updated** preview says **3.5 hours**. |

**Screen cues**

- **01:25–01:40:** **Operator → Review-only work package → Restoration planning**. Capture the real sliders at **3/0 → 2.99 h**, **6/0 → 1.50 h**, **6/2 → 3.50 h**. Bounds remain **2–8** workers and **0–24 h** access. Wait for accepted applied-input text after each change.
- **01:40–01:49:** Expand **Critical facility priority comparison** at the same **6/2** setting: hospital-associated work **3.50 h vs 4.99 h**, both schedules **4.99 h total**. Keep the assumption and authorization text visible.
- **01:49–02:08:** Insert a separately captured take from **Step restoration: isolate, restore, repair**. Show the modeled counts and four buttons in order. No static 1-hour/3-hour slide is needed for this running build.
- **02:08–02:13:** Return to the main **Transformer Replacement / 6 workers / 2 h** take and open Customer. Show **Restoration outlook: 3.1–4.2 hours** and, if visible, the latest **Planning estimate updated: 3.5 hours**.
- **02:13–02:15:** Hold the customer range.

**Step-restoration rehearsal — use a separate take**

| Order | Exact button on Operator | Expected visible result for the inspected default equipment |
| --- | --- | --- |
| 1 | **Start modeled section demo** | Event scope **16 premises**, **0 modeled restored / 16 still out**; isolated group **8**, unaffected group **8**. |
| 2 | **Simulate section isolation** | **Faulted section isolated**; still **0 restored / 16 out**. Isolation alone restores nobody. |
| 3 | **Authorize unaffected section (modeled)** | **Unaffected section restored · Partial restoration**; **8 restored / 8 out**. |
| 4 | **Complete modeled transformer repair** | **Repair complete; release pending**; still **8 restored / 8 out**. Repair alone does not authorize re-energization. |
| 5 | **Authorize repaired section (modeled)** | **All modeled premises restored**; **16 restored / 0 out**, service restored and cutout closed in the model. |

Counts above were observed with transformer ending **3AD1FB8F**. Other source equipment can produce different source-derived groups. **Inspect unaffected customer** and **Inspect faulted customer** select which group the customer presentation describes. **Restart modeled section demo** restarts the section example. Top-bar **Reset** returns to **Local Transformer Protection**, so reselect **Transformer Replacement** and restore crew/access values before the main handoff.

[UI Variation Note] This port-3002 build has a functioning **Critical facility priority comparison** and the section-demo controls. The earlier disabled-hospital-filter note and fixed 3/6-person-hour slide described an older build and are superseded. The comparison now declares two workbook-rate repair jobs; conditional work completion does not establish verified hospital service or live switching.

## 02:15–03:00 — Person 4 — Customer Concierge & Orchestration

> The Customer view turns the same incident into a household plan. It shows service status, a storm risk band and a restoration window. Here, that window is roughly three to four hours. Household choices tailor preparation for medical equipment, refrigerated medication and mobility. Battery capacity and device load change conservative backup runtime. Calculation assumptions explain usable energy, efficiency and reserve. Notification previews show how an outage or changed estimate would be communicated; nothing is sent. The next integration connects ARCOS damage, pole attributes, structure drawings and reviewed material quantities to scheduling. Our goal is useful household preparation with traceable repair reasoning and visible uncertainty.

**Where to present — Person 4**

| Script passage | Current webpage / section | What to show or click |
| --- | --- | --- |
| Service, risk and restoration window | [Customer → Your service status](http://localhost:3002/customer#service-heading) | Show **Higher storm risk** and **Restoration outlook: 3.1–4.2 hours** after the Operator 6/2 setup. This customer layout summarizes the risk; it does not display the old detailed driver/confidence card. |
| Household-specific preparation | [Customer → Your household priorities](http://localhost:3002/customer#household-plan) | Toggle **Essential medical equipment**, **Mobility & accessibility**, or **Refrigerated medication**. Point to the generated **Your next steps** underneath. Use demonstration choices. |
| Backup runtime | [Customer → How long could your battery last?](http://localhost:3002/customer#battery-heading) | Keep **I have a backup battery** checked; edit **Battery capacity (watt-hours / Wh)** or **Combined device use (watts / W)**. Open **Calculation assumptions**. At **1000 Wh / 120 W**, the observed default is **5.1 hours**, **850 Wh** usable energy, **141.2 W** effective load. |
| Proactive communication | [Customer → Updates & notification preview](http://localhost:3002/customer#alerts-heading) | Show **Outage update** and the latest **Planning estimate updated**, plus **When a preview appears** and **Escalation preview**. The current design does not have the old **Alert Delivery & Eligibility Plan** card; use the current labels. |
| Privacy and mapped connection | Bottom of Customer → expand **About this demonstration & home connection lookup** | Show **Demo home reference** and **Check mapped connection**. This checks a source connection, not live power or a complete new incident forecast. |
| ARCOS next integration | Separate diagram labeled **Next integration** | No current page demonstrates a complete ARCOS → pole/structure/material → scheduled repair work package. Keep this as a clearly identified future integration. |

**Screen cues**

- **02:15–02:29:** **Customer → Your service status / Restoration outlook** for the same incident. Show the summary risk label and rounded planning window; detailed evidence is on Operator, not in an old customer driver card.
- **02:29–02:40:** Toggle a household need and change battery capacity or load. Show real guidance/runtime updates. Guidance currently adapts to declared needs; do not claim it also responds to risk or restoration duration.
- **02:40–02:48:** **Customer → Updates & notification preview**. Show current preview messages, **When a preview appears**, and **Escalation preview**. No real SMS delivery is implied; there is no separate visible eligibility card in this customer layout.
- **02:48–02:58:** Diagram labeled **Next integration**: **ARCOS damage → direct pole match or declared nearest-pole assumption → pole/phase attributes → representative structure → reviewed material quantities → workbook labor → dependency-aware scheduling**. Return to customer view for the final sentence.
- **02:58–03:00:** Silent title/customer-benefit hold; end picture and audio by **03:00**.

[UI Variation Note] Retain supplied uncertainty labels. Household battery runtime and sensor-node charge are separate models. Conceptual diagrams explain the intended extension; they do not represent completed integration.

## Detailed rubric coverage

The workbook contains six tabs, including alternate rubric-development sheets. This script uses **Judging Rubric**, rows 5–10, which have 1–5 descriptors. The final criterion is titled **Navigating challenges** in this workbook. These are evidence targets, not predicted scores.

| Criterion | What the highest descriptor rewards | Evidence in this script |
| --- | --- | --- |
| Innovation — B5:G5 | Research and analysis of accepted solutions, then exploration of alternatives. | Person 1 names researched categories and the chosen repair-to-household approach. Keep the actual comparison ready. |
| Curiosity — B6:G6 | Identifying knowledge gaps and acting on a plan to explore them. | Person 2 asks whether an open fuse establishes replacement and shows contrasting cases. |
| Communication — B7:G7 | Essential functional prototype elements plus visual explanation. | Real calculator interaction, workbook assumptions, the live conditional priority comparison and modeled section-release controls. |
| Project Breadth and Complexity — B8:G8 | Synthesis across humanities, science and engineering with a useful new result. | Electrical engineering, GIS dependencies, labor planning and accessible household communication. Explain how these inform one another. |
| Impact — B9:G9 | A detailed, justified concept with potential value that is feasible to develop. | Specific household needs, backup-runtime interaction, explainable estimates and a limited next integration. No measured benefit is asserted. |
| Navigating challenges — B10:G10 | Reflection on failure followed by an alternative that improves the result. | Actual ambiguous-bank unit issue, explicit component-count correction and regression checks. |

## Q&A notes

- **What works today?** Source-sample dependency tracing, modeled fault differentiation, workbook-backed transformer component estimates, crew/access sensitivity, needs-based guidance, battery calculations and simulated notifications.
- **What remains?** A complete ARCOS-to-structure work package, premise entry that updates the entire answer, and risk/duration-dependent preparation remain unfinished. The running port-3002 build now demonstrates the priority comparison and modeled step restoration.
- **What did you learn from failure?** A bank count does not establish component construction units. The mapper now requires an explicit construction-unit count. Evidence: `pipeline/import_labor.py`, the ambiguous-bank check in `tests/test_engine.py`, and the corresponding correction in commit `3153034`.
- **Why no estimate in protection/unknown cases?** No verified repair package has been selected, so the model leaves duration unavailable.
- **Does doubling crew halve real repair time?** The demo assumes divisible component labor. Skill mix, equipment, access and safety constraints can prevent linear improvement.
- **How would it scale?** Expand validated source coverage beyond the sixteen-premise runtime slice, review approximate facility links and connect work packages to actual repair dependencies. The large offline extract is not evidence of territory-wide runtime operation.
- **Did users validate it?** No direct customer feedback or measured savings is established in the repository. Do not invent interviews, sponsor endorsement or field results.

## Recording verification

Verify four quoted narration blocks, contiguous 40/45/50/45-second slots, a total spoken budget of 400 words, and an exported duration at most 180 seconds. Keep the actual calculator take showing updated values. Use the running priority panel and section demo for Person 3. Label the ARCOS diagram **Next integration**.

Earlier verification of `bb4482d` found 119 backend tests and 72 subtests passing, one Windows/POSIX permission assertion failure, a passing production build, and a Node frontend session-storage assertion failure. Those historical checks are not a fresh test report for the separately running port-3002 build.


## Additional capture details retained from the parallel main-branch revision

These are production/Q&A options, not additional narration or extra time beyond the three-minute edit. Substitute a prepared insert for an existing shot if needed. The prior script reviewed `e98af3e5c6ef192ab7103d0482dac557bb5d997c`; retain its evidence only where the current recording reproduces the behavior.

- **Session isolation and rapid selections:** Use two independently initialized browser contexts with distinct X-Session-ID headers and different scenario states. Do not expose tokens or assume a duplicated tab creates a new session. A rapid-selection take must finish on the latest chosen scenario. Keep the main six-worker/two-access-hour take unchanged.
- **Restoration gates:** Label an API insert **simulated operator authorization**. Using the current incident/revision, show a premature RESTORED request rejected; clear valid SCENARIO_BLOCKERS task IDs and show restoration still rejected without authorization; record explicit simulated authorization, then capture accepted restoration and CLOSED cutout. Use real responses, not a fictional operator button.
- **Customer persistence:** Demonstrate medical, refrigerated-medication and mobility declarations surviving refresh when browser storage is available. Household storage is browser-local; incident state uses session storage and X-Session-ID. Preserve the authoritative incident/revision across operator and customer views.
- **Battery reserve and retry:** Show the 15% conservative runtime reserve. In a prepared take, fail only a calculation request, capture its inline error, restore connectivity and press Retry. Record the fresh result. Guidance has its own retry path. Never present an old value as a recovered calculation.
- **Abstention and escalation:** In Scenario 4 show UNDER_REVIEW, UNKNOWN risk, no numerical duration and no confirmed-outage alert. Escalation is a demonstration preview, disconnected from emergency services and live dispatch. Use actual history or its empty state.

Run `python verification/verify_script.py` after narration edits to regenerate the timing metadata. It verifies the planned **03:00** endpoint and word counts; the recording team must still check exported media duration.


## Project explained through the presentation pages

This section is a presenter briefing and Q&A guide, not additional narration within the three-minute recording.

### Page 1 — Overview: what the project does and where the information comes from

**Open:** [Overview](http://localhost:3002/). Start at **Where GRID EVIDENCE BECOMES DECISIONS PEOPLE CAN TRUST**, then scroll to **EVERY PREMISE TRACED TO THE BREAKER THAT FEEDS IT** and its **Source ledger**.

LoadShed Sentinel connects the grid's equipment dependencies to a repair explanation and a household plan. AEP's supplied paths describe which anonymized premises depend on which transformers and protective equipment. The offline pipeline accepted 117,549 paths; the interactive experience deliberately uses sixteen anonymized premises. Neither number is a live outage count.

Show **FROM SUPPLIED PATH TO A PLAN PEOPLE CAN ACT ON** to explain the four stages: supplied paths, modeled sensing, reviewed planning and customer guidance. The sensor node and its solar/battery budget are modeled. **FOUR INCIDENTS ONE HONEST METHOD** provides the four selectable scenarios: local protection, upstream interruption, confirmed replacement and contradictory telemetry. **TECHNOLOGY WITH RECEIPTS** separates source records from sensor modeling and scenario assumptions. The **ONE INCIDENT TWO VIEWS** section explains why operators and customers see different detail from the same incident.

**Presentation association:** Person 1's opening/data explanation. The hero twin is also a useful title shot for Person 2. Facility links are approximate spatial associations; the path stops at a circuit breaker with physical substation connectivity unknown.

### Page 2 — Prevention: what can be assessed before a confirmed fault

**Open:** [Prevention](http://localhost:3002/prevention). The page title is **Preventive monitoring & response evidence**.

Under **Review a pre-fault sensor history**, choose a **Source transformer** and a **Modeled history**. Options include healthy contextual changes, a developing thermal trend, persistent multi-sensor changes, storm readiness and unusable telemetry. Show the trend, **Condition priority**, **Storm readiness**, **Utility review** and **Customer advisory preview**. This separates a reason to inspect equipment from a claim that an outage has occurred or will occur at a known time.

Under **What time saving follows from your assumptions?**, the baseline and assisted workflows use the same repair job. Editable repeat-dispatch chances, queue delays and review overhead determine the conditional result. In the observed default example, **4.80 h baseline**, **4.65 h assisted**, and **0.15 h / 9 minutes modeled saving** depend on the declared inputs. They are not measured Sentinel performance. **What the evidence supports** explains the historical-data limits and links an external utility pilot; its findings are not this project's measured outcome.

**Presentation association:** Person 1's research/alternative-approach passage and follow-up questions about benefit. This is an optional short insert; do not add another long tour to the three-minute edit. It also supports Person 2's explanation of uncertainty. Pre-fault condition priority is separate from customer outage-risk screening.

### Page 3 — Operator: how evidence becomes a reviewable repair plan

**Open:** [Operator](http://localhost:3002/operator). Select **Transformer Replacement** and the equipment ending **3AD1FB8F**.

The top incident summary identifies the selected simulated event and sample impact. **Counterfactual Incident Comparator** distinguishes local cutout operation from upstream interruption. A closed local cutout with an upstream interruption calls for different investigation than a local protective-device operation. The comparator does not prove actual dispatch savings.

Use **Modeled telemetry → Asset inspection** to show the pole, transformer, cutout, Sentinel node and solar component. Focus controls, orbit/zoom and the 2D fallback make the modeled state inspectable. The nearby **Modeled Simulation** readouts show cutout state, qualitative thermal condition, sensor-node charge and communications. That node battery is separate from household backup power.

**Diagnosis & uncertainty** ranks competing explanations, provides **Review evidence & gaps**, and names missing verification. Under **Review-only work package**, **Crew recommendation** lists required capabilities and material context; it remains unapproved. **Restoration planning** connects the declared 25-kVA workbook component to about 8.974 person-hours, then divides by crew size and adds the declared access delay. With three workers and no access delay, the expected duration is 2.99 hours. Six workers plus two access hours gives 3.50 hours, with a conditional range of 3.12–4.24 hours.

Expand **Workbook & range assumptions** to show source cells, quantities and the single 4.5 indirect allowance. Expand **Critical facility priority comparison** to compare two declared workbook-rate jobs sharing one crew. At six workers/two access hours, hospital-associated work finishes at 3.50 hours with hospital-first ordering versus 4.99 hours under customer-count-first ordering, while both schedules finish at 4.99 hours. The panel also exposes the tradeoff: prioritizing the critical branch can increase ordinary customer interruption. Work completion is conditional and facility associations are assumed.

**Step restoration: isolate, restore, repair** is a different demonstration: isolation separates groups, explicit modeled authorization releases unaffected customers, repair clears the damaged group's work, and a second authorization releases that group. For the inspected equipment, the sequence demonstrates 16 out → 8 restored/8 out → 16 restored. The rehearsal table above gives every click. This explains why an entire circuit need not wait for every local repair. It is simulated control logic, not a physical switching operation.

Finish with **Supply path** and **Feeder context → Feeder circuit map**. They explain customer dependencies and the selected fault footprint. Arrows represent supplied relationships, not measured current or guaranteed energization. **Source disclosure & provenance** and **Source LEGEND** explain how to interpret the evidence.

**Presentation association:** Persons 2 and 3. This is the main technical page; do not hunt for a separate labor, priority or map page because these are panels within Operator.

### Page 4 — Customer: what the same event means for the household

**Open:** [Customer](http://localhost:3002/customer) after establishing the intended Operator scenario and crew/access settings.

**Your service status** expresses the selected scenario in plain language. **Restoration outlook** shows a rounded window rather than a promised restoration timestamp. In the six-worker/two-access-hour example, it displays **3.1–4.2 hours**, consistent with the Operator's more precise range. **Higher storm risk** is a declared scenario screening label, not a live weather prediction. The customer layout emphasizes known/unverified information; it does not currently expose the older detailed risk-driver/confidence card described in previous scripts.

Under **Your household priorities**, select **Essential medical equipment**, **Mobility & accessibility**, **Refrigerated medication**, **Food refrigeration**, **Phone & communications** or **Sump pump**. **Your next steps** adapts to these declared needs. Browser storage can retain choices, but these declarations do not register the household for emergency assistance. The advice currently responds to selected needs, not an automatically integrated risk/duration calculation.

**How long could your battery last?** translates watt-hours of stored energy and the combined watts of essential devices into a conservative planning runtime. At the observed 1000-Wh/120-W defaults it shows 850 usable Wh, 141.2 W including conversion loss and about 5.1 conservative hours. **Calculation assumptions** exposes usable fraction, conversion efficiency, the reserve and limits such as constant load. This calculation helps a household compare backup resources with a planning window; it does not guarantee medical-device endurance.

**Updates & notification preview** shows the event messages a connected system could send, including outage and changed-estimate previews. **When a preview appears** and **Escalation preview** explain the modeled communication behavior. Nothing is sent to SMS, push, emergency services or dispatchers. The current layout does not display the old separate eligibility-card UI. **About this demonstration & home connection lookup** provides source disclosure, **Demo home reference** and **Check mapped connection**; a mapped connection does not establish current service at that home.

**Presentation association:** Person 4, plus Person 1's opening problem statement. Keep the incident context from Operator when moving here; typing a different home reference only performs a connection lookup.

### How the four pages fit together

Use **Overview** to establish the problem and source scope, **Prevention** to discuss contextual signals before a confirmed fault, **Operator** to review incident evidence and conditional work/priority decisions, and **Customer** to turn the same modeled event into practical preparation and communication. The shared incident connects the two audiences; the assumptions and provenance explain what each result can support.

The complete ARCOS broken-pole → structure/material quantities → scheduled work-package connection remains a **Next integration** diagram. Show it as the intended extension, not a fifth implemented page. The presentation should make the working dependency/labor/household chain clear while identifying that remaining connection.
