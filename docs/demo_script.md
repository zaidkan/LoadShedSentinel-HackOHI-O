# LoadShed Sentinel — four-speaker recording script

**Locked edit:** 00:00–03:00, exactly 180 seconds. **Spoken budget:** 397 words. Person 1 speaks for the data team, Person 2 for the twin and labor engine, Person 3 for the utility interface, and Person 4 for the customer concierge and orchestration. Read only the four quoted narration blocks. Labels, formulas, screen cues and variation notes are not spoken.

Source reviewed: `0ed0ac3fab903c1ab904117adabbfe0c59f4a70a`. This document verifies the planned timecodes and word count; it does not certify a recorded performance or exported video duration.

| Speaker | Slot | Duration | Narration | Delivery window | Silent handoff / hold |
|---|---|---:|---:|---|---|
| Person 1 — Data & Topology | 00:00–00:40 | 40 s | 89 words | 00:00–00:38 | 00:38–00:40 |
| Person 2 — Twin & Labor Engine | 00:40–01:25 | 45 s | 95 words | 00:40–01:23 | 01:23–01:25 |
| Person 3 — Utility Interface & Controls | 01:25–02:15 | 50 s | 110 words | 01:25–02:13 | 02:13–02:15 |
| Person 4 — Customer Concierge & Orchestration | 02:15–03:00 | 45 s | 103 words | 02:15–02:58 | 02:58–03:00 |
| **Total** | **00:00–03:00** | **180 s** | **397 words** | **172 s voice** | **8 s holds** |

Aim for about 138 spoken words per minute during the delivery windows. Record each voice separately; edit screen recordings beneath it. The opening title appears during Person 1's first sentence, and the closing frame occupies Person 4's final two seconds. No additional intro, credits or voiceover after 03:00.

### Prepare the capture

Use the same anonymous asset/premise through the replacement and customer shots. Start with the normal page navigation visible, then select `confirmed_replacement` before the workbook/slider sequence. Its declared package is one 25-kVA replacement, three lineworkers and zero access hours. The selected GIS asset's rating is not independently verified. Do not use a protection-only scenario to demonstrate a known repair duration.

Keep these distinctions readable: **AEP source sample**, **modeled sensor**, **scenario planning**, **demo delivery**. The 117,549-path figure is offline pipeline coverage; the runtime sample contains 16 premises. Facility proximity is an **ASSUMED spatial association**, not a verified feeding relationship. Map arrows describe topology, not live current or switching permission.

Prepare three short evidence inserts, visually labelled **ENGINE / SOURCE EVIDENCE**, outside the website chrome: the aggregate graph/facility summary, the actual criticality scheduling output, and mobility guidance from the preparedness API. They support implemented engine/data features that do not have dedicated page controls at this revision. Never draw a fake interactive panel or imply an insert is a live website control. Record the website interactions from the actual running build; upcoming minor layout changes can be accommodated by the notes below.

## 00:00–00:40 — Person 1 — Data & Topology

**Spoken narration**

> Power interruptions leave families asking what happens next. LoadShed Sentinel brings grid context, repair planning and customer guidance together. We ingest A E P geographic information system data and supplied upstream paths. Offline, we validated one hundred seventeen thousand five hundred forty nine premise paths to circuit breakers. The website uses a sixteen premise sample, not territory wide coverage. Fifty two public hospitals, fire and ambulance facilities are spatially associated using declared proximity assumptions, not verified electrical connections. Privacy allowlists exclude customer coordinates and private attributes from public responses.

**Screen cues, not spoken**

- **00:00–00:12:** Show the title over the Utility Console, then the Customer Concierge's anonymous premise Trace result. Keep breaker termination and unknown physical substation connectivity explicit.
- **00:12–00:25:** Insert the source summary: “117,549 accepted premise paths → circuit breaker; offline processing.” Return to the website's “16 premises” sample label.
- **00:25–00:38:** Insert “52 public facilities: 5 hospital, 37 fire, 10 ambulance,” with the ASSUMED nearest-transformer association label. Show the privacy allowlist summary, not raw household attributes or coordinates.
- **00:38–00:40:** Hold the anonymous dependency path and hand off to Person 2.

[UI Variation Note] Keep this voiceover independent of token names, map placement and card titles. Replace the crop/insert if labels move. Preserve the distinction between offline path coverage, the 16-premise public sample, and approximate facility associations. Show sanitized aggregate evidence, not the private topology file.

## 00:40–01:25 — Person 2 — Twin & Labor Engine

**Spoken narration**

> Here is our three dimensional distribution transformer twin. The cutout shows open, closed or unknown without implying live switching authority. Heat and acoustic signals are modeled evidence for assessment, not proof of a field diagnosis. For one declared twenty five kilovolt ampere transformer replacement, workbook cells C twenty one and D twenty one provide installation and removal hours. Apply four point five once: about eight point nine seven person hours. The engine schedules ready tasks by criticality, then customer count, while respecting dependencies and shared crews. That is a transparent priority rule, not automatic dispatch.

**Screen cues, not spoken**

- **00:40–00:55:** Select `confirmed_replacement`; show the distribution transformer, **Inspect cutout**, a brief orbit and the explicit modeled/simulated confirmation labels. Use a short separately captured UNKNOWN-state insert during the unknown phrase; return to replacement before the labor sequence.
- **00:55–01:12:** Expand the restoration assumptions and crew/materials recommendation. Overlay the sourced calculation, labelled “declared 25-kVA category average”: **(C21 + D21) × 4.5 = 8.973957 ≈ 8.97 person-hours**, sheet `Labor time material related!`. Show **8.973957 ÷ 3 = 2.991319 labor-only hours**. Apply the multiplier once; do not equate person-hours with elapsed hours.
- **01:12–01:23:** Use the actual scheduler evidence insert: ready critical-facility work precedes routine work, then customer count resolves priority; keep dependency and shared-crew constraints visible. This is a pure engine demonstration, not a dedicated scheduling screen or proof of an optimal restoration sequence.
- **01:23–01:25:** Hold the supplied work package and pass the same replacement scenario to Person 3.

[UI Variation Note] Crop around the asset and assumptions rather than fixed pixels. The requested **45-degree cutout** is a recording discrepancy at this revision: `web/src/three/visual-state.ts` uses `OPEN.angle = -2.05` radians, about 117.5 degrees of hinge rotation, not 45 degrees. The narration deliberately says open/closed/unknown. Use a “45-degree” caption only after the UI owner changes and verifies that visual; do not alter source code as part of this script task. Preserve workbook cells, units, multiplier and declared-rating disclosure if panel copy changes.

## 01:25–02:15 — Person 3 — Utility Interface & Controls

**Spoken narration**

> In the Utility Console, we choose a simulated incident and anonymous equipment. The feeder map shows directional dependency arrows and equipment symbols; it does not show live energization. We can inspect the cutout, orbit the twin, or switch to its two dimensional fallback. Evidence, hypotheses, crew capabilities and sensor battery status stay beside the asset. Now watch the restoration panel. Crew size ranges from two to eight lineworkers; additional access delay ranges from zero to twenty four hours. Changing either recalculates the shared restoration planning range. Six workers and two access hours give about three point five expected hours for this replacement. Assumptions remain visible, and no crew is dispatched.

**Screen cues, not spoken**

- **01:25–01:38:** Show the scenario/equipment selectors and **Feeder circuit** SVG map. Select an equipment glyph to expose its details. Keep the arrow legend “upstream → downstream,” current-asset outline and unconfirmed equipment states visible.
- **01:38–01:50:** Briefly demonstrate orbit/zoom, Reset view, Low detail and the 2D diagram, then return to the twin. Cut to evidence/hypotheses and their missing-evidence/source labels; include the solar, sensor battery and communications readouts. A short recorded insert can cover these controls without forcing one hurried continuous take.
- **01:50–02:07:** On the confirmed replacement, show the crew slider's **2–8** bounds and access slider's **0–24 h** bounds. Start at **3 workers / 0 h → 2.99 h expected**; change to **6 / 0 → 1.50 h**; then **6 / 2 → 3.50 h**. Pause until each request completes and the revision/range changes. Keep lower/expected/upper visible; these are conditional planning durations, not a utility commitment.
- **02:07–02:13:** Expand range assumptions and briefly show the incident scope/provenance legend. Open Customer Concierge without resetting the incident; its planning range must match the six-worker/two-hour result.
- **02:13–02:15:** Hold the matching customer range for Person 4.

[UI Variation Note] Bind shots to the controls' purpose, not their exact position or wording. Rounded expected hours may display fewer decimals. If a verified minor change alters the numeric example, replace the sentence beginning “Six workers” with “The updated expected duration appears in both views,” recount the script and retain the 50-second slot. If an update fails, use the visible retry/reset behavior and record a successful take; do not hide a stale range behind an overlay.

## 02:15–03:00 — Person 4 — Customer Concierge & Orchestration

**Spoken narration**

> The Customer Concierge reads the same incident through a privacy sanitized projection. We trace the selected premise and show its risk drivers, confidence and planning assumptions. Household needs trigger preparation guidance; medical and mobility advice supports personal planning, not emergency power guarantees. Changing battery capacity or essential load updates usable energy and conservative runtime. When evidence conflicts, the page says under review: field conditions and restoration time still need verification. The alert plan explains recipient eligibility, simulated text or mobile push channels, milestone updates and suppression. No real message is sent. Our contribution is transparent planning and useful preparation, with uncertainty kept visible.

**Screen cues, not spoken**

- **02:15–02:28:** Continue on the same customer snapshot. Show the anonymous premise Trace, shared planning range, risk drivers, confidence, visible assumptions and full source disclosure. Omit operator-only evidence.
- **02:28–02:42:** Check **Life-Critical Medical Device**, briefly expose Refrigerated Medicine and Sump Pump controls, and show the resulting preparation guidance. Change battery capacity or essential load; capture usable watt-hours, effective load, theoretical runtime and conservative reserve updating. Include the labelled mobility-guidance API insert during “medical and mobility”; there is no mobility checkbox on this page at this revision.
- **02:42–02:52:** Select `insufficient_evidence`; show **UNDER_REVIEW**, unknown risk and no numeric restoration promise. Let viewers read: “Incident under review by utility dispatch; field condition and ETR pending verification.” Show Alert Delivery & Eligibility Plan and its simulated recipient role/channels/cadence, then the demo alert history or empty state. Suppression is conditional: show its reason only when the server supplies one; do not manufacture one for UNDER_REVIEW.
- **02:52–02:58:** Deliver the closing sentence over the customer page and source labels. Keep modeled planning and simulated delivery visible.
- **02:58–03:00:** Silent closing hold: “Transparent planning. Practical preparation.” End picture and sound at exactly **03:00**.

[UI Variation Note] Reframe cards if labels move; keep uncertainty, confidence, assumptions and demo-delivery copy in the shot. Use actual alert history or its empty state; never fabricate a sent message. If a mobility control is added and verified before recording, replace the labelled API insert with that real interaction without lengthening the narration. Keep household runtime separate from the sensor-node battery readout.

### Recording handoff and verification

Speaker changes occur at 00:40, 01:25 and 02:15. Use straight cuts or brief audio crossfades inside the existing handoff holds; never add transition time. Rehearse against the locked slots, retake long lines and trim pauses before changing the spoken wording. Record current scenario/revision and retain the successful input/range proof alongside the take. The Retry Connection and Retry topology controls can be checked during preflight; deliberately failing a request is not part of the timed walkthrough.

Run `python3 verification/verify_script.py` from the private staging root after any narration or timecode edit. It checks the four speaker roles, contiguous 40/45/50/45-second slots, four variation tags, 380–420 quoted spoken words and the 180-second endpoint. The edit plan's word count uses whitespace-delimited tokens; numbers and cell references are written as spoken words to avoid shorthand inflation. A E P means the three spoken letters; pronounce C twenty one and D twenty one as cell references.

Before delivery, inspect the actual exported media duration and play its ending. A valid script timeline alone cannot prove that an unrecorded or unexported video is exactly three minutes.
