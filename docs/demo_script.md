# LoadShed Sentinel — three-minute, four-speaker recording script

**Locked edit:** 00:00–03:00, exactly 180 seconds. **Spoken budget:** 400 words. Read only the four quoted narration blocks. All labels, screen cues, formulas and variation notes are silent production instructions.

Source reviewed: `e98af3e5c6ef192ab7103d0482dac557bb5d997c`, including the Person 5 remediation ledger and implementation. This is a verified edit schedule; the recording team must check the actual exported duration.

| Speaker | Slot | Duration | Narration | Delivery window | Silent handoff / hold |
|---|---|---:|---:|---|---|
| Person 1 — Data & Topology | 00:00–00:40 | 40 s | 89 words | 00:00–00:38 | 00:38–00:40 |
| Person 2 — Twin & Labor Engine | 00:40–01:25 | 45 s | 95 words | 00:40–01:23 | 01:23–01:25 |
| Person 3 — Utility Interface & Controls | 01:25–02:15 | 50 s | 109 words | 01:25–02:13 | 02:13–02:15 |
| Person 4 — Customer Concierge & Orchestration | 02:15–03:00 | 45 s | 107 words | 02:15–02:58 | 02:58–03:00 |
| **Total** | **00:00–03:00** | **180 s** | **400 words** | **172 s voice** | **8 s holds** |

Record each voice to its delivery window. Titles sit over existing footage; transitions fit inside the holds. No extra intro, credits or speech after 03:00.

### Capture preparation

Use the live website for selectors, the twin, sliders, household controls and alert plan. Use short, clearly labelled **SOURCE EVIDENCE** inserts for offline counts/allowlists, **ENGINE DEMONSTRATION — illustrative scheduler inputs** for hospital priority, and **API DEMONSTRATION** inserts for session isolation/restoration gates. Capture real outputs without inventing interface elements.

Choose `confirmed_replacement`. Start at three workers and zero access hours. The 25-kVA rating is a declared workbook category, not a verified rating of the selected GIS asset. Keep **AEP source sample**, **modeled telemetry**, **scenario planning** and **demo delivery** labels readable. Facility links are ASSUMED proximity associations; map arrows indicate upstream/downstream dependency, not measured current. Physical substation connectivity remains unknown beyond circuit-breaker path termination.

At this revision, the live hospital comparison is disabled even on hospital-associated assets: `engine/scenarios.py` checks `facility_type == 'hospital'`, while actual facility records use `kind == 'HOSPITAL'`. Use the real scheduler with explicitly illustrative inputs for the comparison insert: a three-person shared crew, hospital task 3 person-hours, routine task 6 person-hours, identical zero prerequisites. Do not represent that insert as a live website result. A separately corrected and verified build can substitute its real comparison card.

Pre-record Scenario 4 (`insufficient_evidence`), then return to replacement for Person 3. Prepare session and gate inserts in a separate session so they do not change the main take. For persistence, use a browser with local storage available; show checked needs surviving a refresh. For retry, briefly fail only the battery request, capture its inline error, restore connectivity, press Retry and wait for a fresh result. Use synthetic household declarations.

## 00:00–00:40 — Person 1 — Data & Topology

**Spoken narration**

> LoadShed Sentinel connects grid context with repair planning and household preparation. We ingest A E P geographic information system data and supplied upstream paths, preserving source lineage. Offline, we validated one hundred seventeen thousand five hundred forty nine premise paths ending at circuit breakers. Our live challenge subnet contains sixteen anonymous premises. Fifty two public critical facilities cover hospitals, fire and ambulance services. Their nearest transformer links are declared spatial assumptions, not verified electrical connections. Privacy allowlists keep customer coordinates and private operator attributes out of public customer responses.

**Screen cues, not spoken**

- **00:00–00:12:** Title over Utility Console; show source/provenance labels and an anonymous premise dependency trace.
- **00:12–00:25:** SOURCE EVIDENCE: **117,549 accepted premise paths → circuit breakers; offline pipeline**. Cut back to **selected 16-premise challenge subnet** in the live demo.
- **00:25–00:38:** SOURCE EVIDENCE: **52 public facilities: 5 hospital, 37 fire, 10 ambulance; ASSUMED nearest-transformer associations**. Show the customer-projection allowlist summary and a sanitized customer response.
- **00:38–00:40:** Hold the dependency trace; hand off.

[UI Variation Note] Replace crops or aggregate inserts if labels move. Preserve source lineage, offline/runtime scope, assumed facility links and customer-projection privacy. Do not display raw household coordinates or private operator payloads.

## 00:40–01:25 — Person 2 — Twin & Labor Engine

**Spoken narration**

> This three dimensional distribution twin shows the cutout open, closed or unknown, with modeled sensor evidence. For a declared twenty five kilovolt ampere replacement, workbook cells C twenty one and D twenty one supply installation and removal labor. Multiply their sum by four point five once: eight point nine seven person hours. This illustrative scheduler comparison shows hospital first versus unprioritized work, with shared crew constraints. These are planning assumptions, not dispatch orders. In Scenario four, contradictory evidence triggers epistemic abstention: status under review, risk unknown, no numerical restoration estimate and no confirmed outage alert.

**Screen cues, not spoken**

- **00:40–00:50:** Show the distribution transformer, Inspect cutout, brief orbit and state labels. Use prepared OPEN/CLOSED/UNKNOWN cuts with modeled evidence labels.
- **00:50–01:04:** Overlay **(C21 + D21) × 4.5 = 8.973957 ≈ 8.97 person-hours**, sheet `Labor time material related`. Show declared 25-kVA category and **8.973957 ÷ 3 = 2.991319 labor-only hours**; person-hours and elapsed hours have different units.
- **01:04–01:13:** ENGINE DEMONSTRATION — illustrative scheduler inputs: at three workers/zero access, show **1.0 h hospital-first vs 3.0 h unprioritized**, both **3.0 h total**. Show identical prerequisites and shared crew. These task workloads are an illustrative scheduling example, separate from the workbook transformer package.
- **01:13–01:23:** Scenario 4 insert: `insufficient_evidence` / **Contradictory Telemetry (Abstention)**. Show **UNDER_REVIEW**, **UNKNOWN** risk, unavailable restoration range and suppressed confirmed-outage notification. Do not imply a known affected count.
- **01:23–01:25:** Hold the abstention state; cut back to replacement at Person 3's start.

[UI Variation Note] The brief's requested **45-degree cutout** conflicts with this revision: `web/src/three/visual-state.ts` sets `OPEN.angle = -2.05` radians, approximately **117.5°**, and CLOSED to zero. Use the truthful state labels in narration; a 45° caption requires a separately changed and verified build. Preserve the workbook calculation and Scenario 4 abstention if panels move. Replace the illustrative scheduler insert with the real comparison card only after the facility-field mismatch above is fixed and verified; recount any narration change.

## 01:25–02:15 — Person 3 — Utility Interface & Controls

**Spoken narration**

> The operator heads up display brings evidence and controls beside the asset. Our scalable vector graphics feeder circuit map shows directional flow through dependency arrows, not live electrical current. Crew size ranges from two to eight; access delay from zero to twenty four hours. Moving either slider recalculates the shared planning range. Six workers and two access hours yield about three point five expected hours here. Session identifiers isolate incident state between independent demo sessions. Rapid selections keep the latest response. Restoration is gated: a premature restored request is rejected until the modeled repair package is cleared and explicit simulated operator authorization is recorded. No field switching is authorized.

**Screen cues, not spoken**

- **01:25–01:36:** Show evidence/hypotheses in the operator HUD, then the **SVG Feeder Circuit Map** with upstream → downstream arrows and equipment glyph selection.
- **01:36–01:51:** Replacement sliders: show **2–8** workers and **0–24 h** access bounds. Capture **3 / 0 → 2.99 h**, **6 / 0 → 1.50 h**, **6 / 2 → 3.50 h**. Wait for completed updates; keep lower/expected/upper assumptions visible.
- **01:51–01:58:** API DEMONSTRATION: two independently initialized browser contexts, distinct **X-Session-ID** headers, different scenario states. Show the real response labels; avoid exposing session tokens. A separately captured rapid-selection take ends on the latest chosen scenario, reflecting the response-generation guard. Preserve the main replacement session at six workers/two access hours.
- **01:58–02:13:** API DEMONSTRATION: with current incident/revision, request `status="RESTORED"` before completing blockers → **HTTP 400**. Clear valid scenario `completed_task_ids` without authorization → **HTTP 400**. Record explicit simulated authorization, then request RESTORED → accepted, cutout CLOSED. Use actual required task IDs from `SCENARIO_BLOCKERS`; label the entire sequence **simulated operator authorization**. Retain successful responses as capture evidence.
- **02:13–02:15:** Hold the gate result; cut to the main replacement session's customer view.

[UI Variation Note] Adjust crops, never the slider bounds, session-header meaning or two restoration prerequisites. The API gate sequence is an evidence insert, not a fictional operator button. Use independently initialized contexts rather than assuming duplicated tabs receive new session IDs. If numeric planning output changes in a verified build, revise the spoken example and recount within the same 50-second slot.

## 02:15–03:00 — Person 4 — Customer Concierge & Orchestration

**Spoken narration**

> The live Customer Concierge follows the same incident and authoritative revision through a sanitized projection. Household needs persist in this browser across navigation and refresh: life critical medical devices, medication refrigeration and mobility support. The battery calculator combines capacity, usable fraction and essential load, then keeps a fifteen percent runtime reserve. If calculation or guidance fails, an inline retry makes recovery visible. Our proactive alert plan shows eligibility, simulated text and push channels, and milestone updates. Escalation is explicitly a demonstration preview: it would increase notification cadence for confirmed outage or critical priority. It connects to neither emergency services nor live dispatch. Transparent planning supports practical preparation.

**Screen cues, not spoken**

- **02:15–02:24:** Live customer page: same incident/revision and **3.50 h expected** as the main six-worker/two-access-hour replacement session. Keep confidence, assumptions and demo disclosure visible.
- **02:24–02:35:** Check **Life-Critical Medical Device**, **Refrigerated Medicine (Insulin)** and **Mobility & Accessibility Needs**; show tailored guidance. Refresh and show the checked needs restored from browser storage. Do not imply medical power guarantees or server-side household storage.
- **02:35–02:45:** Change battery capacity/load; show usable energy, theoretical runtime and conservative runtime with **15% reserve**. Brief prepared failed-request take shows the battery error and **Retry**, followed by a fresh successful result. Guidance has its own inline Retry.
- **02:45–02:58:** **Alert Delivery & Eligibility Plan**: eligible recipient, simulated SMS/push, milestone cadence and server-supplied escalation policy. Keep **Simulated demonstration preview** and **not connected to live 911 or dispatchers** readable. Use actual demo history or empty state; no real alert is sent.
- **02:58–03:00:** Silent closing frame: “Transparent planning. Practical preparation.” End picture and sound at exactly **03:00**.

[UI Variation Note] Keep the actual household checkboxes, persistence proof, battery reserve, recoverable error and preview-only escalation in view when layouts change. Recut successful calculations after Retry; never present a stale value as recovered. Household storage is browser-local; incident isolation uses session storage and X-Session-ID. Household runtime and sensor-node battery telemetry are separate models.

### Word count and timecode verification

**Verified planned total: 400 spoken words; 180 seconds.** Counts by Person 1–4: **89 / 95 / 109 / 107**. Speaker durations are **40 + 45 + 50 + 45 = 180 seconds**, with contiguous boundaries at **00:40, 01:25, 02:15 and 03:00**. Delivery windows total **172 seconds**; four two-second holds total **8 seconds**. Exactly four bracketed UI variation tags accompany the four segments.

Count only whitespace-delimited words in the four quoted narration blocks. Numbers, units and cell references are spelled as spoken; A E P denotes three letters. Recount after any wording substitution. The accompanying private delivery verifier checks the count, timing table, segment boundaries and variation tags; run `python3 verification/verify_script.py` from the delivery staging root. It is a delivery aid, not a required application command.

Rehearse each voice against its locked window and trim pauses before changing wording. Inspect the final exported media duration and play its ending: the script verifies the planned 03:00 hard stop, while actual recording/export duration remains to be checked.
