# LoadShed Sentinel — Current Capability Inventory

**Repository Baseline:** `zaidkan/Hackathon`  
**Verified Git Commit SHA:** `e5f5abb3c3b9a240b2d1c2a412e171db926538ab`  
**Audit & Verification Date:** October 25, 2026  
**Auditor:** Competitive Intelligence & Differentiation Specialist (Person #5 Remediation)  
**Verification Harness:** Python 3.13 / pytest (117 passed, 72 subtests passed) / Node 18+ (Vite 6.4.5 TypeScript production build passed)

---

## 1. Executive Summary & Verification Classification

This document establishes the verified inventory of all capabilities in LoadShed Sentinel at commit `e5f5abb`. In accordance with Section 5.1 of the remediation directive, every system component, endpoint, calculation, and UI element is classified strictly into one of four evidence tiers:

1. **WORKS NOW (Tier 1):** Verified executable in current code, covered by automated regression tests, runnable locally.
2. **WORKS IN OFFLINE SOURCE PROCESSING (Tier 2):** Real data ingested from official AEP challenge shapefiles/workbooks into serialized artifacts (`inventory.json`, `graph_summary.json`, `network_bundle.json`). Not executed per-request in the interactive web runtime.
3. **SIMULATED / ASSUMED (Tier 3):** Deterministic mock or physics-modeled scenario data with declared assumptions, clearly separated from real utility telemetry.
4. **NOT IMPLEMENTED / OUT OF SCOPE (Tier 4):** Aspirational, deferred, or intentionally bounded functionality that does not exist in the codebase.

---

## 2. API Endpoint Matrix

| HTTP Method & Endpoint | Tier | Verified Implementation | Input Schema & Validation | Response & Behavior | Citations & Test Coverage |
|---|---|---|---|---|---|
| `GET /api/health` | Tier 1 | WORKS NOW | None | Returns status, service name, version `1.0.0`, topology loaded flag, sample loaded flag. | [`api/main.py#L87-L95`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L87-L95), `tests/test_api.py::test_health` |
| `GET /api/scenarios` | Tier 1 | WORKS NOW | None | Returns metadata for 4 scenarios with dependency counts calculated dynamically from AEP sample slice. | [`api/main.py#L97-L122`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L97-L122), `tests/test_api.py` |
| `GET /api/aep/assets` | Tier 1 | WORKS NOW | None | Returns list of selectable anonymized source asset tokens (`ASSET-*`) and dependent premise counts in sample. | [`api/main.py#L124-L128`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L124-L128), `tests/test_aep_impact.py` |
| `GET /api/aep/source` | Tier 1 | WORKS NOW | None | Returns provenance metadata, sample size (16 premises, 12 equipment), and explicit limitations. | [`api/main.py#L130-L142`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L130-L142), `tests/test_aep_impact.py` |
| `POST /api/scenario/select` | Tier 1 | WORKS NOW | `SelectScenarioRequest` (`scenario_id`, `asset_token`, `premise_token`, `crew_size`, `access_hours`). Extra fields forbidden (422). | Instantiates scenario snapshot, resets `NotificationFSM` replay state (R01 resolved), updates in-memory `_current_snapshot`. | [`api/main.py#L154-L193`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L154-L193), `tests/test_api.py`, `tests/test_scenarios.py` |
| `GET /api/scenario/current` | Tier 1 | WORKS NOW | None | Returns full authoritative operator `ScenarioSnapshot` with technical telemetry, hypotheses, work packages. | [`api/main.py#L195-L198`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L195-L198), `tests/test_api.py` |
| `GET /api/customer/snapshot` | Tier 1 | WORKS NOW | None | Returns privacy-projected customer view. Strips operator telemetry, hypotheses, internal asset IDs (F09). | [`api/main.py#L200-L203`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L200-L203), [`engine/customer.py#L227-L315`](file:///Users/zaid/Larp-MAXXX/hackathon/engine/customer.py#L227-L315), `tests/test_customer.py` |
| `POST /api/scenario/advance` | Tier 1 / Tier 3 | WORKS NOW (Atomic) / SIMULATED | `AdvanceRequest` (`incident_id`, `expected_revision`, `status`, `cutout_status`, `crew_size`, `access_hours`). Extra fields forbidden. | Atomically recalculates labor ranges and updates revision. P0-01 note: arbitrary `RESTORED` does not check external physical interlocks, but F03 context poisoning is resolved. | [`api/main.py#L218-L298`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L218-L298), `tests/test_api.py`, `tests/test_h5_remediations.py` |
| `POST /api/scenario/reset` | Tier 1 | WORKS NOW | None | Resets scenario state to default `local_protection` initial fixture; clears FSM. | [`api/main.py#L300-L308`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L300-L308), `tests/test_api.py` |
| `GET /api/topology/lookup` | Tier 1 / Tier 2 | WORKS NOW | `premise_id` query string (e.g. `PREM-0B30A08C7266D4BF`). | Returns upstream ordered trace through transformer, fuse, recloser to circuit breaker. Substation is explicitly UNKNOWN. | [`api/main.py#L309-L320`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L309-L320), [`engine/aep_impact.py`](file:///Users/zaid/Larp-MAXXX/hackathon/engine/aep_impact.py), `tests/test_topology.py` |
| `GET /api/topology/geojson` | Tier 1 / Tier 2 | WORKS NOW | None | Returns schematic GeoJSON for the sample subnet with generalized coordinates. | [`api/main.py#L322-L325`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L322-L325), `tests/test_topology.py` |
| `POST /api/customer/battery-runtime` | Tier 1 | WORKS NOW | `BatteryCalcRequest` (`capacity_wh`, `usable_fraction`, `device_w`, `inverter_efficiency`, `reserve_margin_pct`). | Conservative runtime arithmetic: `(Wh * usable * eff) / W`. Inverter efficiency validated between 0.5 and 1.0 (F08). | [`api/main.py#L335-L352`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L335-L352), [`engine/customer.py#L115-L148`](file:///Users/zaid/Larp-MAXXX/hackathon/engine/customer.py#L115-L148), `tests/test_customer.py` |
| `POST /api/customer/preparedness` | Tier 1 | WORKS NOW | `PreparednessRequest` (medical devices, medication, mobility needs, sump pump, battery). | Generates rule-based preparedness checklists and advisory warnings. | [`api/main.py#L367-L374`](file:///Users/zaid/Larp-MAXXX/hackathon/api/main.py#L367-L374), [`engine/customer.py#L70-L112`](file:///Users/zaid/Larp-MAXXX/hackathon/engine/customer.py#L70-L112), `tests/test_customer.py` |

---

## 3. Four Canonical Demonstration Scenarios

| Scenario ID | Incident ID | Modeled Equipment State | Sourced Impact Footprint | Sourced Labor Package | Customer Status & Projection | Verification Status |
|---|---|---|---|---|---|---|
| `local_protection` | `INC-2026-0881` | Cutout switch OPEN (blown drop fuse). Transformer thermal/acoustic normal. | 3 dependent premises in sample. Substation normal. | Unavailable / assessment required. Lineworker crew (2 workers), replacement fuse link. | Status: `OUTAGE`. Risk: `MODERATE`. 1 `OUTAGE_CONFIRMED` notification. Restoration range unavailable until assessment. | Verified in `tests/test_scenarios.py`, `tests/test_engine.py` |
| `upstream_feeder` | `INC-2026-0894` | Cutout switch CLOSED (latched). Upstream breaker trip lockout. | 16 dependent premises in sample (entire feeder branch). | Feeder line crew dispatched upstream. **Explicitly prevents local transformer misdispatch.** | Status: `OUTAGE`. Risk: `MODERATE`. 1 `OUTAGE_CONFIRMED` notification. Prevents false local replacement promise. | Verified in `tests/test_scenarios.py`, `tests/test_engine.py` |
| `confirmed_replacement` | `INC-2026-0902` | Cutout switch OPEN. Declared physical core failure. | 3 dependent premises in sample. | Sourced 25-kVA unit from workbook C21/D21: **8.97 person-hours**. At 3 lineworkers: **2.99 hours**. | Status: `OUTAGE`. Risk: `HIGH`. `OUTAGE_CONFIRMED` + `ESTIMATE_UPDATED` (2.99h baseline). Sensitivity sliders update range. | Verified in `tests/test_scenarios.py`, `tests/test_engine.py`, `tests/test_h5_remediations.py` |
| `insufficient_evidence` | `INC-2026-0917` | Cutout switch UNKNOWN. Contradictory acoustic/thermal signals. | Unconfirmed; affected premises list empty. | Trouble shooter dispatched for inspection. **Abstains from premature ETR commitment.** | Status: `UNDER_REVIEW`. Risk: `UNKNOWN`. No outage alerts sent; no fabricated duration promise. | Verified in `tests/test_scenarios.py`, `tests/test_engine.py` |

---

## 4. Frontend Component & UX Capabilities

### 4.1 Utility Operator Console (`web/src/pages/UtilityPage.tsx`)
- **Feeder Map (`web/src/components/map/FeederMap.tsx`):**
  - *Tier 1 / Tier 2:* Interactive SVG directional dependency graph rendering 9 equipment nodes with distinct coordinates.
  - *Audit Resolution (F13):* SVG viewbox margins (`padding = 32`) and hit target clamping ensure circular targets (r=22) remain within bounds `0..640` and do not clip.
  - *Boundary:* Directional arrows show topological dependencies (`upstream -> downstream`), not measured electrical current or live power flow.
- **3D Asset Digital Twin (`web/src/three/AssetViewport.tsx`):**
  - *Tier 1 / Tier 3:* Procedural Three.js WebGL visualization of utility pole, distribution transformer, edge sensor pod, and cutout switch.
  - *Cutout Mechanics:* OPEN state rotates cutout to `-2.05 radians` (~117.5° hinge rotation); CLOSED state latches at `0.0 radians`; UNKNOWN state renders amber diagnostic pulse.
  - *2D Fallback:* Accessible SVG schematic view available for low-performance / reduced-motion environments.
- **Restoration Planning & Sensitivity Sliders (`web/src/components/utility/PlanningPanels.tsx`):**
  - *Tier 1:* Interactive lineworker crew size slider (bounds: 2–8 workers) and access delay slider (bounds: 0–24 hours).
  - *Calculation:* Modifies active planning inputs and recalculates expected duration in real time (e.g. 3 workers / 0 access = 2.99 h; 6 workers / 2 access = 3.50 h).
  - *Critical Facility Priority Comparison (F02 Resolved):* Dynamically compares prioritized vs FIFO task scheduling **only when** associated hospital facilities exist in the selected asset's footprint.

### 4.2 Customer Outage Concierge (`web/src/pages/CustomerPage.tsx`)
- **Premise Trace & Status Banner:**
  - *Tier 1:* Displays anonymous premise token (`PREM-*`), current status (`NORMAL`, `OUTAGE`, `UNDER_REVIEW`), risk level, and source-grounded expected duration.
  - *Privacy Protection (F09 Resolved):* Cleanses raw asset tokens, GIS coordinates, and internal identifiers from visible customer restoration assumptions.
- **Alert Plan & Escalation (`web/src/components/customer/AlertPlanCard.tsx`):**
  - *Tier 1 / Tier 3:* Renders 4-state alert finite-state machine (`PRE_STORM`, `OUTAGE_CONFIRMED`, `ESTIMATE_UPDATED`, `RESTORATION_COMPLETE`).
  - *Audit Resolution (F06):* Exposes `escalation_policy` in the customer UI, explaining review cadences and channel escalation rules (disclosed as simulated preview).
- **Home Battery Runtime Calculator (`web/src/components/customer/BatteryCalculator.tsx`):**
  - *Tier 1:* Interactive sliders for battery capacity (Wh), usable fraction, critical load (W), inverter efficiency, and 15% reserve buffer.
- **Household Needs Intake (`web/src/components/customer/HouseholdNeedsForm.tsx`):**
  - *Tier 1:* Checkboxes for food refrigeration, refrigerated medicine, life-critical medical devices, mobility/accessibility needs, and sump pumps, generating tailored safety checklists.

---

## 5. Offline Data Pipeline & Extract Scale (`pipeline/`)

| Pipeline Component | Tier | Data Sources Ingested | Output Artifact | Verified Scale & Key Metrics |
|---|---|---|---|---|
| `pipeline/build_graph.py` | Tier 2 | `Data1.zip` (`Customer_Clip.dbf`), `Data2.zip` (`Transformer_Clip.dbf`), `matched_upstream.zip` (`matched_upstream.txt`) | `data/processed/inventory.json`, `graph_summary.json`, `private/topology.json` | **117,642** customer rows; **117,599** distinct text keys; **117,549** accepted premise-to-breaker paths; **32,600** equipment nodes; 93 unmatched premises. |
| `pipeline/import_labor.py` | Tier 2 | `Install_Labor_HackOHIO.xlsx` (SHA256: `e11fb1...`) | Sourced labor constants in `engine/restoration.py` | 5 sheets audited, 135 references. 25-kVA replacement: C21 (`1.1881`) + D21 (`0.8061`) = `1.9942` direct hours × 4.5 multiplier = **8.973957 person-hours**. |
| `pipeline/import_gis.py` | Tier 2 | 12 GIS layers across `Data1.zip` & `Data2.zip` | Asset records and geometric bounds | Re-projects PointZ shapefiles. Ingests 1,659 ARCOS damage records (historical context only). |
| Spatial Facility Association | Tier 2 / Tier 3 | `Hospitals_Medic_Pairwis_Clip` (5), `Fire_Stations_E_Pairwis_Clip` (37), `Ambulance_Servi_Pairwis_Clip` (10) | Embedded in `network_bundle.json` | 52 facility records converted from EPSG:3857 to WGS84. Spatially linked to nearest transformer anchor within sample. **Assumed proximity, not electrical connectivity.** |

---

## 6. What Is Simulated vs Not Implemented

### 6.1 Simulated / Assumed Components (Tier 3)
- **Sensor Telemetry & Physics:** Real-time transformer temperature (°C), acoustic vibration (dB), and edge sensor pod battery/solar harvesting (25W PV / 41Wh battery) are generated deterministically by `engine/energy.py` and `engine/scenarios.py`. No physical hardware is deployed on AEP poles.
- **Interactive Sample Footprint:** Interactive UI queries an anonymized 16-premise / 12-equipment slice (`network_bundle.json`). Full 117,549-path graph exists in offline serialized cache (`data/processed/private/topology.json`).
- **Critical Facility Connections:** Spatial distance from facility points to equipment is an approximate geometric association. Switching a breaker does not physically restore a hospital in the field.
- **Alert Delivery:** SMS/Push/Email messages are generated in-memory and logged to snapshot history. No external Twilio/SendGrid APIs are triggered.

### 6.2 Not Implemented / Out of Scope (Tier 4)
- **Live Utility SCADA / AMI Feeds:** No connection to live AEP operations or real-time advanced metering infrastructure.
- **Energized Switching Control:** Sentinel does not send control commands to physical breakers, reclosers, or switches.
- **Substation Electrical Connectivity:** Upstream paths terminate at circuit breakers; physical substation internal bus routing is explicitly `UNKNOWN`.
- **Production Multi-Tenant Session Isolation:** Current backend maintains a single global in-memory snapshot (`_current_snapshot`) designed for a single presenter/evaluator session (P1-03 disclosed limitation). Multiuser concurrent editing will race across browser tabs.
