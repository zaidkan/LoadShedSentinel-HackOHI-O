# Human 5: sponsor and rubric review

Reviewed feature commit `610dfdcab3dc992cd5455f5eab492711728b1d92` on `codex/preventive-evidence`. Main remains a separate release target; this report does not establish that the feature is merged or submitted. Review only: no implementation, Git, server or incident-state changes.

## Basis and verification

- Read the complete user-supplied **AEP AI Outage Concierge Data Guide** in `C:/Users/ritav/.codex/attachments/06139a7b-b025-486c-8f84-9c6141b905c2/Pasted text.txt`.
- Extracted and read the organizer-provided `aep_challenge_hack26/docs/HackOHIO_2026_AI_Outage_Concierge_Challenge.docx` directly from its XML.
- Opened the [official event overview](https://hackohio2026.devpost.com/) and [rules](https://hackohio2026.devpost.com/rules). Followed the rules' actual [Guidebook link](https://docs.google.com/document/d/1vhcngq6EdUI91CB3PT7MpMfEcN4v9Kt68zSxJ7PtWfY/edit?tab=t.gqiomsu9fdjy). The web reader received the JavaScript shell; read-only public TXT export returned HTTP 200 and the full guidebook.
- Followed the guidebook's actual [judging rubric](https://docs.google.com/spreadsheets/d/1D3rvqp4YCuUxwiYCOVTew8CkgxjM6wxD/edit). Its public CSV export returned HTTP 200. It contains six criteria with descriptors from Developing (1) through Accomplished (5). This review assigns no numerical score or inferred weighting.
- Inspected the feature's API, customer and preventive screens, scenario/restoration engine, labor importer and delivery documents. Ran only pure scenario-generation and scheduling probes. Did not mutate the running application's snapshot or repeat a full suite/browser audit.

The guide explicitly accepts approximate topology, declared nearest-pole matching and reasonable crews of 2–8. None of the findings demands perfect power flow, automated switching, exact joins, a trained model, an optimal scheduler or real SMS delivery. A small, explained comparison is sufficient evidence if it actually connects the inputs and outputs.

## Current findings

### 1. P1: launch checklist sends the team to the wrong submission system

**Evidence:** `docs/LAUNCH_CHECKLIST.md:77` directs a Devpost portal submission. The official overview's submission section requires the Google Form shared on Discord and says Devpost entries are not considered. The overview and guidebook both require a video of at most three minutes; the overview specifies prerecorded video plus Q&A, with no live judging demo.

**Action:** replace that operational step with the actual Discord form, record the accepted submission receipt, and prepare the prerecorded video/Q&A. Keep the published deadline, October 25, 2026 at 10:00 a.m. EDT, visible. Do not treat a Devpost draft or local demo as a submission.

**Verification:** current repository text versus opened official sources. **Owner:** Human 4, Human 1 for the recording.

### 2. P1: the displayed restoration estimate bypasses the guide's damage-to-workbook chain

**Evidence:** `engine/scenarios.py:122` declares direct effort as 1/3/6 hours, then `:123–129` creates assessment/work tasks and calls the estimator without damage or a labor reference. `pipeline/import_labor.py:119` provides a candidate mapper and `engine/restoration.py:102–112` supports sourced work, but neither is used by the active scenario path. The numeric ranges are correctly labeled illustrative in the engine; that honesty does not complete the data-guide journey. The active advance schema at `api/main.py:186–191` also has no crew/access/work input, despite `docs/LAUNCH_CHECKLIST.md:18–19` marking connected recalculation complete.

**Action:** demonstrate one declared or sourced damaged asset, a direct or explicitly assumed spatial match, pole/phase/structure assumptions where relevant, selected construction units/quantities and workbook cells, one application of 4.5, and a declared crew. Connect at least one changed crew/access/damage assumption to the displayed range. A separate source-backed card must remain labeled as separate until connected.

**Basis:** Data Guide section 3 and questions 1/3; challenge requirement 2. **Verification:** call-chain inspection and pure scenario probes returning 2.25/4.5/9.0 hours from the fixed assumptions. **Owners:** Human 2 with Humans 1/4.

### 3. P1: no delivered decision connects limited crews, restoration value and criticality

**Evidence:** `engine/restoration.py:65–68` chooses ready tasks by lexicographic task ID. `:82` expressly disclaims staffing optimization. The function has no restored-customer/criticality objective; adding `customers_restored=100, critical_customers=1` to `z_critical_section` and `customers_restored=1, critical_customers=0` to `a_low_value_section`, sharing one three-person crew, still schedules the latter first. `evaluate_restoration` at `:143` checks completion/authorization, but no API/UI journey compares isolation/restoration sequences or uses hospital/fire/ambulance importance.

**Action:** show a small multi-section example with a limited crew, explicit approximate section dependencies, customer counts and declared criticality. Compare at least two permissible work/isolation orders, show who can be restored first and when, and explain the chosen priority. This can be a transparent heuristic; operational switching approval must remain separate.

**Basis:** Data Guide sections 4–5 and question 4; challenge restoration sequencing and priority-location context. **Verification:** source inspection plus pure scheduling probe. **Owners:** Humans 1/2/4.

### 4. P1: condition monitoring still does not complete the customer outage-risk requirement

**Evidence:** `engine/scenarios.py:154` returns HIGH for every known-fault scenario and UNKNOWN for contradictory evidence. `web/src/pages/CustomerPage.tsx:243` presents this as a forecast risk band. The preventive feature now meaningfully uses contextual sensor changes and wind to produce condition priority/readiness, but explicitly treats those as separate from outage probability; it does not feed a defined premise-level outage-risk band into the customer experience.

**Action:** define and expose a modest, explainable storm-risk rule using the supplied/declared context, with a confidence or evidence-quality label and an unknown fallback. Connect it to the selected public context and explain which changed input moves the band. Preserve the separate condition-review priority. No trained or calibrated model is required by the brief.

**Basis:** challenge requirement 1 and minimum demonstration. **Verification:** current generator inspection and pure four-scenario probe. **Owners:** Human 1/2, integration by Human 4.

### 5. P2: customer uncertainty and abstention remain weaker than the preventive presentation

**Evidence:** `web/src/pages/CustomerPage.tsx:207–213` maps UNDER_REVIEW to normal operation language even though the source note says impact is unconfirmed. `:225–257` shows an ETR and risk drivers without rendering the supplied confidence kind, restoration assumptions or complete disclosure, which remain available in `engine/customer.py:262–273`. The new preventive view exposes assumptions and uncertainty well; those improvements do not automatically carry into the customer incident page.

**Action:** distinguish under-review/unavailable/normal/restored states, and display the forecast confidence and key range assumptions beside the result. Retain the simulated/sample boundary. Do not infer normal service from absence of a confirmed diagnosis.

**Basis:** challenge requirements 1/5 and the minimum confidence/fallback demonstration. **Verification:** current rendering branches and payload inspection. **Owner:** Human 3 with Human 4.

### 6. P2: alert history does not answer eligibility, timing, channel and escalation

**Evidence:** `web/src/pages/CustomerPage.tsx:379` renders only alert history. The server projection at `engine/customer.py:255–273` returns no eligibility decision/reason or proposed timing/channel/escalation. The four message categories exist in the FSM, and UNDER_REVIEW confirmation suppression is now fixed, but internal trigger logic is not a customer-facing answer to eligibility.

**Action:** expose documented eligibility rules and a concise decision, with proposed demo timing/channel and a clear escalation condition. Real delivery is unnecessary; identify the simulation channel and show at least one proactive communication.

**Basis:** challenge requirement 4 and minimum demonstration. **Verification:** current customer response/rendering and FSM inspection. **Owner:** Human 4.

## Actual rubric crosswalk

These are evidence statuses, not scores or predictions of awards. The rubric rewards event-specific execution and learning, not feature-count claims.

| Official criterion | Status | Current evidence and remaining proof |
|---|---|---|
| Innovation | Supported at prototype level | Research distinguishes existing utility sensor results from this pod; the project explores contextual screening and a transparent alternative response workflow. Show the comparison, not an unsupported savings headline. |
| Curiosity | Supported | Concrete questions about ambient/load confounding, unknown data, dispatch mistakes and shared bottlenecks led to implemented negative controls and replays. Explain one question, plan and result. |
| Communication | Partial | Functional visuals and calculation explanations exist; the core sponsor restoration journey and final video still need coherent proof. Use a recorded sequence of actual working behavior. |
| Project Breadth and Complexity | Supported, with integration limits | Electrical dependencies, sensor/context physics, human preparedness and resource economics connect several domains. The data-to-priority work chain remains partial. |
| Impact | Partial | Household guidance and review priorities address identifiable needs; the nine-minute illustration is feasible arithmetic under assumptions. It is not measured benefit or proof of restoration prioritization. |
| Growth Mindset | Supported | Independent checks found input-contract, weather-provenance and overflow problems, followed by implemented corrections. Present one failure, changed approach and demonstrated improvement. |

The actual rubric distinguishes research from analysis/alternative exploration; questions from acting on an investigation; illustrations from essential functional elements; and recognizing a failure from implementing a better alternative. A six-row feature list alone is not that evidence. Prior work and the precise event-built contributions must be disclosed, per the official rules and guidebook.

## Sponsor and Data Guide coverage

| Requirement | Status at this feature commit |
|---|---|
| S1: location/context, risk band, factors, confidence | Partial: real source context and separate preventive condition/readiness behavior; fixed incident forecast band and missing customer confidence display. |
| S2: credible, operationally responsive restoration range | Partial: person-hour arithmetic, ranges, dependencies and pure source-backed estimation exist; active displayed workload remains illustrative, with no integrated criticality/section sequence. |
| S3: personalized preparation and safety | Supported in backend for declared medical/accessibility/pump needs; customer controls expose only part of that capability. Risk/duration-sensitive integration remains partial. |
| S4: eligibility and proactive communication | Partial: four message states and safe unknown handling exist; customer eligibility and communication plan are missing. |
| S5: explainability, privacy, uncertainty, fallback | Partial: source-safe context, allowlisting and preventive limits are useful; the customer incident page still conceals important assumptions and mishandles under-review copy. |
| Guide Q1: what is damaged? | Partial: modeled diagnosis/confirmation; no selected ARCOS-to-asset demonstration. |
| Guide Q2: which customers depend on it? | Supported within the validated 16-premise source sample, without claiming territory totals. |
| Guide Q3: what repair/isolation work is required? | Partial: candidate mapper and sourced labor estimator exist separately from the running incident workload. |
| Guide Q4: what first, with limited crews and criticality, and how long? | Missing from the delivered decision journey; generic DAG scheduling is insufficient evidence of that prioritization. |

## What improved and what is not a defect

- Source-dependent footprint calculation, varied transformer selection and explicit sample scope are real progress. Approximate, labeled network relationships are acceptable.
- Preventive monitoring is now an actual pre-fault workflow with persistent trends, unknown handling, human review and explicit assumptions. It is correctly not presented as a certified failure countdown.
- The response counterfactual preserves common repair/blockers, permits negative or zero benefit, separates detection lead, and does not promote its eight-hour conditional example into average product savings. The supplied ARCOS data cannot establish empirical hourly savings.
- The earlier UNDER_REVIEW false-confirmation issue is fixed in the current notification FSM. It is not repeated as an open finding here. The separate customer normal-operation copy remains open.
- This pass does not assert current full-suite/browser pass counts, actual submission completion or measured field accuracy. Existing historical receipts and the feature implementation note must be tied to the final recorded release commit.
