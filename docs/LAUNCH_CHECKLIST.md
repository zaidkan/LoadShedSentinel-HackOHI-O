# LoadShed Sentinel — Pre-Launch, Launch & Post-Launch Checklist

> **Context:** Reconciled against Human 5 Audit (`docs/human5_audit.md`) and Full Recheck (`docs/human5_full_recheck.md`) on commit `16881ac` / `4cbbd74`.  
> **Status:** Active working document for floor execution across Aj (Role 1), Hb (Role 2), Bob (Role 3), and Michael/God (Role 4).

---

## 1. Pre-Launch Technical Remediation (Human 5 Audit Items)

### Phase 1A: Engine, Math & FSM Fixes (Role 2 / Hb & Role 4 / Michael)
- [ ] **[H5-02 / P1] Notification FSM & Unknown Incident State**:
  - In `engine/customer.py`, ensure `SnapshotStatus == 'UNDER_REVIEW'` never generates `OUTAGE_CONFIRMED` or `ESTIMATE_UPDATED` alerts.
  - Eliminate duplicate `OUTAGE_CONFIRMED` on scenario selection (ensure generator does not double-seed FSM notifications).
  - Scope FSM estimate tracking per-premise (`{premise}:{incident_id}:{etag}`) rather than globally suppressing across different premises.
- [ ] **[H5-04 / P1] API State Mutation Guards**:
  - In `api/main.py` (`POST /api/scenario/advance`), enforce strict enum validation on `status` (`NORMAL`, `AT_RISK`, `OUTAGE`, `UNDER_REVIEW`, `RESTORED`) and `cutout_status` (`OPEN`, `CLOSED`, `UNKNOWN`).
  - Validate `expected_revision` and `incident_id` to reject stale or mismatched concurrent requests.
- [ ] **[H5-05 / P1] Dynamic Estimate Recalculation**:
  - Connect advance requests with crew/access parameters to re-run restoration duration calculations rather than emitting empty estimate alerts.
- [ ] **[H5-06 / P2] Battery Runtime Zero & Range Physical Correctness**:
  - Fix `calculate_battery_runtime` in `engine/customer.py`: `usable_fraction == 0.0` must strictly return `0.0 Wh` and `0.0 hours`.
  - Validate and reject negative or out-of-bounds inverter efficiency (`0.5 <= eff <= 1.0`).
- [ ] **[H5-07 / P2] Labor Unit Denominator Guard**:
  - In `pipeline/import_labor.py`, ensure incompatible linear units (e.g., feet of conductor) are not silently rewritten into transformer construction units without valid conversion.
- [ ] **[H5-08 / P2] Field Report Asset Binding**:
  - In `engine/diagnosis.py`, enforce that equipment-specific damage observations require an explicit matching `asset_id`.
- [ ] **[H5-11 / P2] Accessibility Guidance Inclusion**:
  - In `engine/customer.py` (`generate_preparedness_guidance`), add actionable emergency rules when `mobility_accessibility_needs == True` (stair egress, backup battery for electric mobility/wheelchairs, accessible community shelter routing).
- [ ] **[H5-13 / P2] Customer Safe Evidence Projection Allowlist**:
  - In `engine/customer.py` (`project_customer_view`), use an explicit field allowlist (`id`, `kind`, `value`, `unit`, `label`) and strip internal asset IDs (`asset_id`) from customer payloads.

### Phase 1B: Data, Cache & Dependency Packaging (Role 1 / Aj)
- [ ] **[H5-01 / P1] Root Dependency Manifest**:
  - Add canonical `requirements.txt` to repository root with pinned dependencies (`fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`).
- [ ] **[H5-14 / P2] Topology Cached Token Consistency**:
  - In `engine/topology.py`, validate that path premise tokens strictly agree with catalog tokens on load.
- [ ] **[H5-01 / H5-12 / Documentation] README Alignment**:
  - Update quickstart acceptance command to `GET /api/topology/lookup?premise_id=PREM-000001`.
  - Clarify data boundaries: distinguish the verified 16-premise runtime sample from the 117,549-path offline graph, and explicitly state breaker-level termination vs unknown physical substation connectivity.

### Phase 1C: Frontend Synchronization & Error Recovery (Role 3 / Bob & Role 4 / Michael)
- [ ] **[H5-09 / P1] Customer View Continuous Synchronization**:
  - In `web/src/App.tsx` and `web/src/pages/CustomerPage.tsx`, pass the full `snapshot` or `key={snapshot.incident_id + '-' + snapshot.revision + '-' + snapshot.current_asset_id}` so customer view instantly updates on asset switches, scenario changes, and resets.
- [ ] **[H5-10 / P2] API Initial Failure Recovery**:
  - In `web/src/App.tsx`, provide a visible "Retry Connection" button and error state instead of an indefinite "Loading LoadShed Sentinel..." screen when the API server is initializing or unreachable.
- [ ] **[UI Polish] Mobile Viewport & Map Target Bounds**:
  - Ensure SVG feeder map and 3D console preserve min 44px touch targets and zero horizontal scroll overflow on 390px mobile viewports.

---

## 2. Pre-Launch Verification Gate (Release Criteria)

- [ ] **Backend Test Suite**:
  - Execute `.venv/bin/pytest -o pythonpath=. tests/`.
  - Pass 100% of tests with exit code 0 (minimum 64 tests including regression guards).
- [ ] **Frontend Production Build**:
  - Execute `cd web && npm run build` (`tsc && vite build`).
  - Strict TypeScript check and clean bundle generation with exit code 0.
- [ ] **End-to-End Browser Playwright Suite**:
  - Run Playwright test script across all 4 scenarios, asset switches, mobile viewport, and WebGL 2D fallback.
  - Verify zero runtime console exceptions.
- [ ] **Git Working Tree Cleanliness**:
  - All code formatted and committed to `main`.
  - Pushed to remote GitHub (`zaidkan/Hackathon.git`).

---

## 3. Launch Execution (Competition Day)

- [ ] **Demonstration Video Recording**:
  - Follow 3-minute storyboard in `docs/demo_script.md` (395 words, 8 segments).
  - Walk through:
    1. Incident 1 (`INC-2026-0881`): Cutout switch blown, 45° drop, core healthy, 2-person fuse link crew.
    2. Incident 2 (`INC-2026-0894`): Upstream breaker trip, closed cutout, avoids false transformer replacement.
    3. Feeder Circuit Map & Premise Topology Trace (`PREM-000001` to Breaker).
    4. Customer Concierge: Household battery calculator & refrigerated medicine/accessibility guidance.
- [ ] **Devpost Portal Submission**:
  - Submit repository link: `https://github.com/zaidkan/Hackathon.git`.
  - Attach 3-minute video URL (YouTube / Vimeo unlisted).
  - Include `docs/judge_evidence.md` crosswalk in project description.

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
