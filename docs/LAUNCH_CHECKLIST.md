# LoadShed Sentinel — Pre-Launch, Launch & Post-Launch Checklist

> **Context:** Reconciled against Human 5 Audit (`docs/human5_audit.md`) and Full Recheck (`docs/human5_full_recheck.md`) on commit `16881ac` / `4cbbd74`.  
> **Status:** Active working document for floor execution across Aj (Role 1), Hb (Role 2), Bob (Role 3), and Michael/God (Role 4).

---

## 1. Pre-Launch Technical Remediation (Human 5 Audit Items)

### Phase 1A: Engine, Math & FSM Fixes (Role 2 / Hb & Role 4 / Michael)
- [x] **[H5-02 / P1] Notification FSM & Unknown Incident State**:
  - In `engine/customer.py`, ensure `SnapshotStatus == 'UNDER_REVIEW'` never generates `OUTAGE_CONFIRMED` or `ESTIMATE_UPDATED` alerts.
  - Eliminate duplicate `OUTAGE_CONFIRMED` on scenario selection (ensure generator does not double-seed FSM notifications).
  - Scope FSM estimate tracking per-premise (`{premise}:{incident_id}:{etag}`) rather than globally suppressing across different premises.
- [x] **[H5-04 / P1] API State Mutation Guards**:
  - In `api/main.py` (`POST /api/scenario/advance`), enforce strict enum validation on `status` (`NORMAL`, `AT_RISK`, `OUTAGE`, `UNDER_REVIEW`, `RESTORED`) and `cutout_status` (`OPEN`, `CLOSED`, `UNKNOWN`).
  - Validate `expected_revision` and `incident_id` to reject stale or mismatched concurrent requests.
- [x] **[H5-05 / P1] Dynamic Estimate Recalculation**:
  - Connect advance requests with crew/access parameters to re-run restoration duration calculations rather than emitting empty estimate alerts.
- [x] **[H5-06 / P2] Battery Runtime Zero & Range Physical Correctness**:
  - Fix `calculate_battery_runtime` in `engine/customer.py`: `usable_fraction == 0.0` must strictly return `0.0 Wh` and `0.0 hours`.
  - Validate and reject negative or out-of-bounds inverter efficiency (`0.5 <= eff <= 1.0`).
- [x] **[H5-07 / P2] Labor Unit Denominator Guard**:
  - In `pipeline/import_labor.py`, ensure incompatible linear units (e.g., feet of conductor) are not silently rewritten into transformer construction units without valid conversion.
- [x] **[H5-08 / P2] Field Report Asset Binding**:
  - In `engine/diagnosis.py`, enforce that equipment-specific damage observations require an explicit matching `asset_id`.
- [x] **[H5-11 / P2] Accessibility Guidance Inclusion**:
  - In `engine/customer.py` (`generate_preparedness_guidance`), add actionable emergency rules when `mobility_accessibility_needs == True` (stair egress, backup battery for electric mobility/wheelchairs, accessible community shelter routing).
- [x] **[H5-13 / P2] Customer Safe Evidence Projection Allowlist**:
  - In `engine/customer.py` (`project_customer_view`), use an explicit field allowlist (`id`, `kind`, `value`, `unit`, `label`) and strip internal asset IDs (`asset_id`) from customer payloads.

### Phase 1B: Data, Cache & Dependency Packaging (Role 1 / Aj)
- [x] **[H5-01 / P1] Root Dependency Manifest**:
  - Add canonical `requirements.txt` to repository root with pinned dependencies (`fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`).
- [x] **[H5-14 / P2] Topology Cached Token Consistency**:
  - In `engine/topology.py`, validate that path premise tokens strictly agree with catalog tokens on load.
- [x] **[H5-01 / H5-12 / Documentation] README Alignment**:
  - Update quickstart acceptance command to `GET /api/topology/lookup?premise_id=PREM-000001`.
  - Clarify data boundaries: distinguish the verified 16-premise runtime sample from the 117,549-path offline graph, and explicitly state breaker-level termination vs unknown physical substation connectivity.

### Phase 1C: Frontend Synchronization & Error Recovery (Role 3 / Bob & Role 4 / Michael)
- [x] **[H5-09 / P1] Customer View Continuous Synchronization**:
  - In `web/src/App.tsx` and `web/src/pages/CustomerPage.tsx`, pass the full `snapshot` or `key={snapshot.incident_id + '-' + snapshot.revision + '-' + snapshot.current_asset_id}` so customer view instantly updates on asset switches, scenario changes, and resets.
- [x] **[H5-10 / P2] API Initial Failure Recovery**:
  - In `web/src/App.tsx`, provide a visible "Retry Connection" button and error state instead of an indefinite "Loading LoadShed Sentinel..." screen when the API server is initializing or unreachable.
- [x] **[UI Polish] Mobile Viewport & Map Target Bounds**:
  - Ensure SVG feeder map and 3D console preserve min 44px touch targets and zero horizontal scroll overflow on 390px mobile viewports.

### Phase 1D: Workbook Labor Sourcing, Criticality Scheduling & Facility Linking
- [x] **[Labor #2 / Sourced Workbook Rates]**:
  - Wire workbook-backed 25-kVA transformer replacement package (sheet `Labor time material related!`, install `C21=1.188085` + removal `D21=0.806128` × 4.5 multiplier = 8.973957 person-hours, 2.991319 hours with 3 lineworkers) into `confirmed_replacement` scenario with exact workbook citations and rating disclaimer.
- [x] **[Labor #4 / Criticality-Aware Task Scheduling]**:
  - Update `schedule_tasks` in `engine/restoration.py` to prioritize critical facilities (hospital, fire, ambulance) over routine tasks, followed by customer counts, resolving tie-breaks deterministically.
- [x] **[Labor #1 / Dynamic Sensitivity API & Controls]**:
  - Connect `POST /api/scenario/advance` and `POST /api/scenario/select` to accept `crew_size` (2–8) and `access_hours` (0–24h) to dynamically recompute authoritative restoration duration and echo `planning_inputs`.
  - Add interactive range sliders in `web/src/components/utility/PlanningPanels.tsx` and `UtilityPage.tsx` with revision synchronization.
- [x] **[Data #1 / Critical Facility Spatial Linking]**:
  - Associate 52 critical facilities (5 hospital, 37 fire, 10 ambulance) from AEP challenge data to nearest distribution transformer anchors in `pipeline/link_facilities.py` and `engine/aep_impact.py` with spatial proximity notes.
- [x] **[Data #2 / Transparent Outage Risk Rule]**:
  - Implement transparent point-based scoring in `engine/outage_risk.py` evaluating wind, ambient temperature, load factor, and health index into LOW, MODERATE, HIGH, or UNKNOWN bands with explicit drivers.
- [x] **[Materials #2 / Customer Uncertainty Copy & Alert Plan UI]**:
  - In `web/src/pages/CustomerPage.tsx`, update UNDER_REVIEW state copy to reflect active utility dispatch review, pending field verification, and display server-supplied `alert_plan` card with channels, cadence policy, and suppression reason.

### Phase 1E: Person 5 Pre-Launch Audit Remediations (F01–F13)
- [x] **[F01 / P0 - Advance Request Model & OpenAPI]**: Resolved `Union` import in `api/main.py`; verified `GET /openapi.json` (200) and `POST /api/scenario/advance` sensitivity calculations.
- [x] **[F02 / P1 - Delivered Criticality Priority Sequencing]**: Connected multi-section scheduling comparison (hospital-first vs unprioritized) in `engine/scenarios.py` and rendered comparison in `PlanningPanels.tsx`.
- [x] **[F03 / P1 - Atomic Advance Mutation]**: Restructured `advance_scenario` in `api/main.py` into a 4-phase atomic execution; rejected advance requests leave snapshot status and revision untouched.
- [x] **[F04 / P1 - Fail-Closed AEP Data Loading]**: Replaced silent fallback in `api/main.py` with HTTP 503 unless explicit synthetic fixture flag is set.
- [x] **[F05 / P2 - Single Notification Ownership & Dedup]**: Centralized lifecycle alert ownership in `NotificationFSM`; eliminated double-seeded outage confirmations and fake estimate updates.
- [x] **[F06 / P2 - Alert Plan Eligibility & Escalation Policy]**: Aligned `alert_plan.eligible` for NORMAL status under elevated risk (pre-storm); distinguished RESTORED vs NORMAL suppression reasons; added escalation policy.
- [x] **[F07 / P2 - Strict Request Field Validation]**: Added `model_config = {"extra": "forbid"}` across scenario and battery API request schemas to reject unsupported parameters.
- [x] **[F08 / P2 - Inverter Efficiency Boundary Enforcement]**: Enforced strict `0.5 <= inverter_efficiency <= 1.0` validation with HTTP 400 rejection in `api/main.py`.
- [x] **[F09 / P2 - Customer Privacy & Internal ID Redaction]**: Replaced direct internal asset ID interpolation in `alert_plan.basis` with customer-safe network description.
- [x] **[F10 / P2 - UI Mobility & Accessibility Declaration]**: Added interactive `mobility_accessibility_needs` checkbox in `CustomerPage.tsx` to trigger tailored accessibility guidance.
- [x] **[F11 / P1 - Accessible Form Programmatic Labels]**: Associated `<label htmlFor="...">` and matching `id` attributes on premise token and battery calculator numeric inputs.
- [x] **[F12 / P2 - Narration & Documentation Alignment]**: Reconciled `README.md`, `judge_evidence.md`, and `LAUNCH_CHECKLIST.md` with 25-kVA / 3-worker / 8.97 person-hour reality.
- [x] **[F13 / P2 - Feeder Map Coincident Node Separation]**: Added radial node offset distribution in `FeederMap.tsx` so coincident equipment markers do not overlap.

---

## 2. Pre-Launch Verification Gate (Release Criteria)

- [x] **Backend Test Suite**:
  - Execute `.venv/bin/pytest -o pythonpath=. tests/`.
  - Pass 100% of tests with exit code 0 (117/117 passed).
- [x] **Frontend Production Build**:
  - Execute `cd web && npm run build` (`tsc && vite build`).
  - Strict TypeScript check and clean bundle generation with exit code 0 (built in 2.57s).
- [x] **End-to-End Verification Gate**:
  - All 4 scenarios, asset switches, crew/access sensitivity controls, customer concierge sync verified in automated regression suite.
  - Component SSR verifies 9 distinct centers and non-overlapping SVG bounds; local sandbox limits dedicated macOS port/browser runtime.
- [x] **Git Working Tree Cleanliness**:
  - All code formatted and committed to `main`.

---

## 3. Launch Execution (Competition Day)

- [ ] **Demonstration Video Recording**:
  - Record a video no longer than 3 minutes; follow the storyboard in `docs/demo_script.md` (395 words, 8 segments).
  - Walk through:
    1. Incident 1 (`INC-2026-0881`): Cutout switch blown, 45° drop, core healthy, 2-person fuse link crew.
    2. Incident 2 (`INC-2026-0894`): Upstream breaker trip, closed cutout, avoids false transformer replacement.
    3. Feeder Circuit Map & Premise Topology Trace (`PREM-000001` to Breaker).
    4. Customer Concierge: Household battery calculator & refrigerated medicine/accessibility guidance.
- [ ] **Official Google Form Submission (distributed via Discord)**:
  - HackOHI/O 2026 AEP track submissions MUST use the official Google Form posted in the hackathon Discord. Devpost entries are not considered for judging or prizes.
  - Submit by **October 25, 2026, 10:00 a.m. EDT**. Obtain the actual form link from Discord; this checklist does not establish submission completion.
  - Include project title/description, problem and solution, repository link (`https://github.com/zaidkan/Hackathon.git`), relevant documentation and a video of **at most 3 minutes**.
  - Include the `docs/judge_evidence.md` crosswalk and disclose prior work versus contributions built during the event.
  - Verify video/repository access and retain the form confirmation/receipt.
  - Present the prerecorded video in the assigned Zoom session, followed by Q&A; judging uses the recording rather than a live demo.
  - Sources: [official overview and submission requirements](https://hackohio2026.devpost.com/), [prior-work rules](https://hackohio2026.devpost.com/rules).

---

## 4. Post-Launch & Production Roadmap

- [ ] **Real-Time Utility OMS Stream Ingestion**:
  - Transition from static AEP GIS snapshots to live SCADA/OMS telemetry via Kafka / MQTT.
- [ ] **Field Edge Hardware Integration**:
  - Deploy physical current transformer (CT) inductive harvesting and vibration piezoelectric sensors to physical distribution transformers.
- [ ] **Customer Communication Delivery Gateways**:
  - Integrate real Twilio SMS and SendGrid email notifications triggered by the Notification FSM.
- [ ] **Distributed Feeder Automation (FLISR) Compatibility**:
  - Expand network graph to model automated loop-restoration switches and tie-lines.
