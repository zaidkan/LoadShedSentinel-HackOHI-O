# Human 5 — rubric, AEP data and workbook review

**The prototype has credible source-dependent impact, preventive screening and transparent arithmetic, but the running restoration journey still does not connect a sourced work package, changed operating assumptions and criticality-aware restoration order.** The launch checklist also names the wrong submission system. These are the main issues to resolve before presenting the project as satisfying the AEP challenge.

Reviewed feature revision: `610dfdcab3dc992cd5455f5eab492711728b1d92` on `codex/preventive-evidence`. Main is separate at `0652aaa220c3326aaf9aaca7b8e61b374e126c38`. The feature preview is on port 3001; this review does not certify a new full-suite/browser run or establish that the feature is merged, recorded or submitted. Only review reports were written; implementation, tests, source materials, Git and server state were unchanged.

## Basis

- Read the newly supplied **HackOHI/O 2026 — AEP AI Outage Concierge Data Guide**, including its four key questions. It explicitly accepts approximate network relationships, declared nearest-pole/spatial facility assumptions and open crew assumptions; 2–8 people is a reasonable range, not a fixed crew requirement.
- The [official AEP repository](https://github.com/hackohio/aep_challenge_hack26/) supplies the GIS, upstream text, structure drawings and workbook. The labor reviewer downloaded and read the actual [Google Drive PDF](https://drive.google.com/file/d/1vszxOsGvqV9KLIEYQS9sIz0kjfU2tUvD/preview): it is the five-page **Challenge Brief**, not the new Data Guide or judging rubric. Its substantive text matches the [repository DOCX](../../aep_challenge_hack26/docs/HackOHIO_2026_AI_Outage_Concierge_Challenge.docx). The overall review therefore has no unresolved Drive-preview access limitation.
- Reviewed the actual [judging rubric](https://docs.google.com/spreadsheets/d/1D3rvqp4YCuUxwiYCOVTew8CkgxjM6wxD/edit), reached through the [official guidebook](https://docs.google.com/document/d/1vhcngq6EdUI91CB3PT7MpMfEcN4v9Kt68zSxJ7PtWfY/edit?tab=t.gqiomsu9fdjy). Its six criteria use Developing (1) through Accomplished (5) descriptors. No score, weighting or award prediction is assigned here.
- Submission instructions were checked against the [official event overview](https://hackohio2026.devpost.com/) and [rules](https://hackohio2026.devpost.com/rules).
- Detail and reproducible probes: [rubric/sponsor review](human5_rubric_review.md), [AEP data review](human5_data_review.md), and [workbook/structures review](human5_labor_review.md). The workbook reviewer independently inspected all five worksheet XML streams and all nine drawing pages. Targeted pure-function and isolated TestClient probes do not change the live preview.

The goal is one defensible, explained prototype path. This review does not require all pole classes, all GIS layers, exact household/facility joins, perfect power flow, operational switching authority, an optimal scheduler, a trained model or real SMS delivery. Declared approximations and modeled conditions are acceptable; an unconnected calculation is still an integration gap.

| Verified material | SHA256 |
|---|---|
| Actual `Install_Labor_HackOHIO.xlsx` | `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b` |
| Recovered five-page Challenge Brief PDF | `f51eca164764c0f85c21cf3c58c552e220767c2cc9e2b323e62843fde18861c0` |

The data reviewer also matched all three supplied archive blob identities to the [official repository contents API](https://api.github.com/repos/hackohio/aep_challenge_hack26/contents/data/raw?ref=main); sizes and identities are recorded in the [data review](human5_data_review.md).

## Coverage summary

| Material | Current evidence | Remaining gap |
|---|---|---|
| Official rubric | Research boundaries, implemented contextual screening, negative controls and a functional multi-domain prototype | Communicate the actual source-to-decision journey and one implemented improvement; do not substitute feature counts or hypothetical savings for evidence |
| AEP data | Validated public 16-premise dependency sample; source-dependent impact and selected equipment/context | No demonstrated ARCOS → selected damage → repair/isolation → criticality-aware priority journey |
| AEP workbook / drawings | Correct importer, source cells, missingness, one-time 4.5 arithmetic, pure scheduling/recomputation | Active incident workloads still use illustrative direct hours rather than selected construction units and workbook cells; pole-associated hardware remains a separate gap |

### Four Data Guide questions

| Question | Status at this feature revision | Evidence / limit |
|---|---|---|
| Q1. What is damaged? | **Partial** | Modeled evidence and confirmation support diagnosis; no selected historical ARCOS-to-asset demonstration. A direct association or explicitly declared nearest-pole assumption is permitted. |
| Q2. Which customers depend on it? | **Supported within sample** | Source-dependent transformer/breaker groups use the same validated public paths. The 16-premise sample is not territory coverage or an observed outage count. |
| Q3. What work repairs or isolates it? | **Partial** | Candidate mapping, representative drawings and sourced estimation exist separately; the active scenario does not carry that work package into its estimate. |
| Q4. What first, with limited crews and criticality, and how long? | **Missing from delivered decision journey** | Generic dependency scheduling and response-wait comparisons do not compare isolation/restoration orders by customers restored and criticality. |

### Actual rubric crosswalk

These are evidence statuses, not numerical ratings. The detailed [rubric review](human5_rubric_review.md) preserves the descriptors and their distinctions.

| Official criterion | Evidence status | What the presentation can support |
|---|---|---|
| Innovation | Supported at prototype level | Existing-solution research and an implemented alternative review workflow, with source/model limits |
| Curiosity | Supported | Questions about load/ambient confounding and unknown data followed by investigations and negative controls |
| Communication | Partial | Functional representations exist; the core supplied-data restoration journey and final recorded narrative need coherent proof |
| Project Breadth and Complexity | Supported with integration limits | Electrical dependencies, sensing/context physics, household preparation and resource economics; the data-to-priority connection remains partial |
| Impact | Partial | Identified household/utility needs and transparent conditional arithmetic; no measured field benefit or criticality-aware restoration result |
| Growth Mindset | Supported | Tested failures followed by implemented alternatives; show a concrete change and resulting behavior |

## Seven owner priorities

### 1. P1 — Correct the submission route and recording plan

**Finding:** [LAUNCH_CHECKLIST.md:77](../LAUNCH_CHECKLIST.md#L77) directs a Devpost portal submission. The [official overview](https://hackohio2026.devpost.com/) requires the Google Form distributed on Discord; Devpost entries are not considered. It specifies a video of at most three minutes, followed by Q&A in the assigned Zoom session, rather than a live demo. The published deadline is **October 25, 2026, 10:00 a.m. EDT**.

**Action / owner:** Human 4 verifies the actual form and accepted receipt; Human 1 prepares the recording with the UI owner. Disclose prior work and identify event-built contributions, as required by the [rules](https://hackohio2026.devpost.com/rules). Repository completion or a Devpost draft does not establish submission. **Evidence:** current checklist versus opened official sources.

### 2. P1 — Demonstrate one workbook-backed incident work package

**Finding:** [engine/scenarios.py:122](../../engine/scenarios.py#L122) hardcodes 1/3/6 direct hours; assessment/work tasks then feed the estimator without a selected damage record or labor reference. The displayed 27 person-hours / 9 expected hours are valid arithmetic from an illustrative six-hour assumption, not a workbook-derived replacement package. The source text discloses that honestly, but Data Guide §3's supplied-data path remains separate.

**Action / owners:** Human 2, with Humans 1/4, connects one explicit package through both views: asset/rating or pole/phase assumptions, operation, quantities, units, cell references, one 4.5 application and a declared crew. A focused transformer example can satisfy that prototype path; full pole reconstruction is unnecessary. If showing a broken pole, the Guide's pole/primary → phase → representative drawing → associated hardware chain must be declared or its omitted components exposed. Current single-/three-phase probes return the same pole-only package ([import_labor.py:138](../../pipeline/import_labor.py#L138)). **Evidence:** call chain, actual workbook/drawing review and pure probes.

### 3. P1 — Make changed crew/access/damage inputs change the shared range

**Finding:** selecting confirmed replacement with additional `crew_size:6`, `access_hours:2`, `damage_quantity:3` returns success and the same **9-hour** estimate. Advancing with crew/access inputs also leaves it at nine. [SelectScenarioRequest](../../api/main.py#L142) and [AdvanceRequest](../../api/main.py#L186) do not expose those planning inputs. For comparison, the pure illustrative 27-person-hour scenario does respond to six workers plus two access hours, returning **6.5 hours**. A message-only update does not reschedule work, despite [LAUNCH_CHECKLIST.md:18](../LAUNCH_CHECKLIST.md#L18) marking the integration complete.

**Action / owners:** Human 4 exposes validated inputs and uses Human 2's existing recomputation function to update the authoritative range/revision and both views. Reject unsupported fields rather than silently ignore them. **Basis:** Challenge Brief requirement 2; Data Guide §5. **Evidence:** isolated TestClient probe and pure recomputation; the live preview was not mutated.

### 4. P1 — Show one limited-crew, customer-value/criticality sequence comparison

**Finding:** [restoration.py:61](../../engine/restoration.py#L61) retains task effort/resources/dependencies but discards customer/criticality attributes; [lines 65–68](../../engine/restoration.py#L65) choose ready work by task ID. In a one-crew example, six-person-hour ordinary task `A-ordinary` runs before three-person-hour hospital task `Z-critical`, so the hospital finishes at hour 3 rather than the feasible hour 1. All **52 supplied critical-facility records** have usable transformed geometry, but no runtime association connects them to priority. The live scenario only has assessment → work package; no repair/isolation/staged-release journey compares restored customers and criticality. Sample fuse/recloser groups with eight dependents exist but are not selectable in the fault/isolation flow ([aep_impact.py:68](../../engine/aep_impact.py#L68), [data review D2](human5_data_review.md#d2--p1-gap-source-protection-devices-do-not-drive-step-restoration)).

**Action / owners:** Humans 1/2/4 demonstrate two declared permissible sequences with one limited crew, approximate section/facility dependencies, affected counts, criticality and restoration times. Explain the choice; preserve blocker and authorization constraints. The Guide permits reasonable spatial associations and transparent heuristics. This is a missing value/time comparison, not a demand for optimal scheduling or verified power flow. **Basis:** Guide §§4–5 and Q4. **Evidence:** source and pure scheduling probe.

### 5. P1 — Connect a defined customer outage-risk estimate

**Finding:** [scenarios.py:154](../../engine/scenarios.py#L154) still returns `HIGH` for every known-fault scenario and `UNKNOWN` for contradictory evidence, while [CustomerPage.tsx:243](../../web/src/pages/CustomerPage.tsx#L243) calls it a forecast. The new preventive mode meaningfully uses contextual sensor behavior and wind for condition priority/readiness, but that separate feature does not calculate the selected customer's outage-risk band.

**Action / owners:** Humans 1/2 define a modest transparent rule using relevant supplied/declared storm/context signals; Human 4 connects its result, factors and confidence to the selected public context. Show one changed input moving the band and an unknown fallback. Keep preventive condition priority distinct. **Basis:** Challenge Brief requirement 1 and minimum demonstration. **Evidence:** generator inspection and targeted four-scenario probes; no model training/calibration is demanded.

### 6. P2 — Bring customer uncertainty up to the preventive view's standard

**Finding:** [CustomerPage.tsx:207](../../web/src/pages/CustomerPage.tsx#L207) still maps `UNDER_REVIEW` to normal-service copy. The numeric range/risk cards omit supplied confidence kind, restoration assumptions and full disclosure ([engine/customer.py:262](../../engine/customer.py#L262)). The visible sample note is useful but does not explain the illustrative workload or forecast confidence.

**Action / owners:** Humans 3/4 distinguish normal, unknown, under-review and restored states and place the confidence/source basis and key assumptions beside the result. The earlier **false confirmed-outage notification under uncertainty is fixed**; this finding is the remaining customer presentation gap. **Basis:** Challenge requirements 1/5. **Evidence:** current code and payload inspection, not a new browser certification.

### 7. P2 — Answer alert eligibility and communication planning explicitly

**Finding:** [CustomerPage.tsx:379](../../web/src/pages/CustomerPage.tsx#L379) provides history, while the [customer projection](../../engine/customer.py#L255) supplies no qualification decision/reason or recommended timing/channel/escalation. Four message categories and corrected unknown handling do not answer the customer's eligibility question.

**Action / owner:** Human 4 exposes documented eligibility and one concise proposed communication plan, identifies demo delivery, and shows a proactive example. Real SMS/email is unnecessary. **Basis:** Challenge Brief requirement 4 and minimum demonstration. **Evidence:** current response/rendering and FSM inspection.

## Checks that passed and what changed

- The **16-premise / 12-equipment / 27-relationship** bundle is byte-identical to the previously raw-lineage-verified source sample. This pass verified unchanged bytes and archive identities rather than rerunning the historical 448-combination audit. Approximate, explicitly labeled network/spatial associations are allowed by the new Guide; a lack of perfect connectivity is not itself a defect.
- Source inputs are available for a focused extension: **1,659 historical ARCOS reports**, including **355 pole, 704 primary and 74 transformer records**, and **5 hospital / 37 fire / 10 ambulance records**. Facility coordinates need CRS transformation before matching. Their existence does not automatically associate a report/facility with the current selected asset or establish live conditions.
- The workbook reviewer imported **135 records across five sheets**, preserved missing hours and exact source codes, and verified the multiplier cell and instruction. **6 direct hours × 4.5 = 27 person-hours**, once. It is not 27 elapsed hours and is not divided by a compulsory eight-person crew.
- For an explicitly declared one-unit 25-kVA replacement, **C21 + D21 = 1.994212765957446 direct hours**, yielding **8.973957446808507 person-hours** and **2.991319148936169 labor-only hours** for three workers. With six workers and two additional non-overlapping access-delay hours, the pure helper returns **3.4956595744680845 hours**. This proves the helper, not the active API integration.
- Missing rates/unknown adder denominators remain unavailable; adjusted person-hours are not multiplied again; duplicate travel/setup/safety categories are rejected. The earlier explicit quantity-unit mismatch and asset-unbound field-confirmation defects are fixed in current code.
- Preventive monitoring now has actual pre-fault histories, contextual screening, persistence, uncertainty and human-review behavior. The time counterfactual preserves shared repair/blockers, allows zero/negative benefit and labels assumed detection/response changes. Neither feature proves outages prevented or average hours saved.

## Scope and release claim

This pass read the actual rubric, new Guide, challenge brief, source assets, worksheet XML and drawings, and used the specific probes documented in the three linked reviews. It did not repeat a fresh full test suite or browser certification, alter the live app, or confirm external submission completion. Historical test receipts must remain tied to their historical revision.

The defensible current claim is an explainable prototype with source-scoped dependency impact, modeled preventive screening and transparent restoration arithmetic. Complete AEP sponsor coverage remains partial until the sourced work package, responsive estimate and criticality/limited-crew decision are demonstrated. No evidence here establishes field accuracy, measured outage reduction, empirical dispatch savings, or that every human's work is finished.
