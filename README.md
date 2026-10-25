# LoadShed Sentinel — HackOHI/O 2026 (AEP Track)

**Distribution Transformer Digital Twin & AI Customer Outage Concierge**

### Preventive monitoring and response evidence

The **Prevention & Evidence** view runs before a fault is declared. It compares
modeled temperature against ambient/load context and an initial reference,
checks persistent vibration/acoustic changes, and separates condition-review
priority from storm readiness. Healthy operating changes, developing trends,
corroborated changes, storm preparation and unusable telemetry are selectable
replays on the real anonymized AEP transformer catalog. No replay confirms an
outage, dispatches a crew or predicts an exact failure time. The comparison
reference and thresholds are demonstration assumptions, not field calibration.

The same view compares baseline and assisted response under **editable assumed
repeat-dispatch rates and delays**, with unchanged repair work and shared
access/upstream bottlenecks. Zero and negative savings remain visible. The
default illustration is 4.80 versus 4.65 hours (**0.15 modeled hours saved**),
not an observed result. Unusable telemetry receives no automation credit.

Reproduce the ten named cases and 96 sensitivity combinations with:

```sh
python scripts/benchmark_response.py
python -m pytest -q tests/test_preventive.py tests/test_response_comparison.py tests/test_preventive_api.py
```

See [time-savings evidence and field-validation plan](docs/time_savings_evidence.md),
[preventive feature sources](docs/preventive_sources.md), and
[benchmark assumptions](docs/response_benchmark.md). The supplied damage records
lack hourly dispatch/response outcomes; they cannot establish an 8–10-hour
Sentinel saving.

**Runtime data scope:** This demo simulates faults using *validated, anonymized dependency paths* extracted from the [official AEP challenge repository](https://github.com/hackohio/aep_challenge_hack26). The checked-in public incident sample contains **16 premises / 12 equipment nodes**. Counts reflect modeled dependencies in that sample, not observed outages or the full 117,549 accepted source paths. See [AEP impact handoff](docs/aep_source_impact_handoff.md).

LoadShed Sentinel bridges the utility distribution blind spot by combining real American Electric Power (AEP) distribution topology, physical transformer telemetry modeling, 4.5× STORMS labor restoration calculations, procedural 3D digital twins, and a proactive, privacy-preserving residential outage concierge.

---

## 🌟 Key Capabilities

1. **Upstream Electrical Topology Engine**:
   - Ingests real AEP GIS layers (12 shapefiles) and ordered upstream connectivity paths.
   - Offline preprocessing accepted 117,549 AEP-supplied customer paths through equipment terminating at provided **circuit breakers**. Physical substation connectivity remains **UNKNOWN**; reported station labels do not establish that connection.
   - The checked-in interactive demo uses a **16-premise anonymized AEP-source sample** and computes transformer/breaker dependency impacts dynamically; it does not expose the full private graph.
   - Evaluates multi-premise outages, distinguishing localized transformer failures from upstream feeder interruptions.

2. **Causal Fault & Restoration Reasoning Engine**:
   - Implements verified AEP STORMS labor rules using the official 4.5× indirect multiplier formula (`Direct Hours × 4.5 = Person-Hours`).
   - Packages required crew qualifications (overhead line, bucket truck, heavy crane) and calculates duration ranges.
   - Models edge IoT solar/battery node physics (25 W PV panel, 41 Wh battery, sleep/wake power budget).

3. **Procedural 3D Digital Twin & Utility Operator Console**:
   - Interactive Three.js/WebGL procedural pole assembly (wood pole, crossarm, distribution transformer, protective cutout, solar module and the Sentinel sensing node) with a hero presentation mode and a technical inspection mode; in inspection the cutout fuse door follows the reported state (latched, dropped, or position not asserted). Preview at `/#/sentinel`; see [`docs/sentinel_3d_integration.md`](docs/sentinel_3d_integration.md).
   - Source-derived schematic SVG feeder map visualizing provided upstream equipment relationships (not measured power flow or live state).
   - Telemetry HUD with protective cutout state, modeled battery/solar status, and communications connectivity.

4. **AI Residential Outage Concierge**:
   - Dynamic 4-state alert finite-state machine (`PRE_STORM`, `OUTAGE_CONFIRMED`, `ESTIMATE_UPDATED`, `RESTORATION_COMPLETE`).
   - Home battery runtime calculator budgeting critical household wattage against usable capacity and inverter losses.
   - Household needs intake (refrigerated medication, medical devices, mobility/accessibility, sump pumps) generating tailored preparedness guidance.
   - Strict privacy projection: zero customer PII or raw coordinates exposed to public network layers.

---

## 🎯 4 Canonical Demonstration Scenarios

| Scenario | Incident ID | Cutout Switch | Root Cause Diagnosis | Crew Packaging |
|---|---|---|---|---|
| **1. Local Protection Fault** | `INC-2026-0881` | OPEN (blown drop) | Cutout fuse blown on transient surge; equipment condition unconfirmed | Line Crew (2 lineworkers), bucket truck, replacement fuse link |
| **2. Upstream Feeder Trip** | `INC-2026-0894` | CLOSED (switch latched) | Upstream recloser lockout; does not infer local transformer replacement | Upstream Substation/Feeder Crew; avoids false local replacement |
| **3. Confirmed Replacement** | `INC-2026-0902` | OPEN (blown) | Declared field confirmation; physical replacement required | Line Crew (3 lineworkers), 25 kVA transformer replacement (workbook rate: 8.97 person-hours) |
| **4. Insufficient Evidence** | `INC-2026-0917` | UNKNOWN | Ambiguous telemetry; abstains from premature ETR commitment | Trouble Shooter patrol dispatched for physical inspection before commitment |

---

## 📋 HackOHI/O Judging & Documentation Package

**Submission:** HackOHI/O 2026 AEP track projects MUST be submitted through the
**official Google Form distributed via the hackathon Discord** by **October 25,
2026, 10:00 a.m. EDT**. Devpost entries are not considered. Include a video of
**at most 3 minutes**, the project description and repository/documentation links;
verify access and save the form receipt. Judges watch the prerecorded video in
the assigned Zoom session, then hold Q&A. Disclose prior work and identify event
contributions. See the [official submission requirements](https://hackohio2026.devpost.com/),
[prior-work rules](https://hackohio2026.devpost.com/rules) and
[launch checklist](docs/LAUNCH_CHECKLIST.md). The form link must come from Discord;
repository completion alone does not establish submission.

All six HackOHI/O judging criteria are rigorously crosswalked to verifiable CLI commands, code files, and test results:

- 📊 **[Judge Evidence Crosswalk](docs/judge_evidence.md)**: Tabular matrix proving Innovation, Curiosity, Communication, Breadth & Complexity, Impact, and Growth Mindset.
- 🎬 **[3-Minute Video Demo Script](docs/demo_script.md)**: Timed presentation narrative following the data journey from storm radar to customer app.
- 🗄️ **[Data Inventory Catalog](docs/data_inventory.md)**: Complete catalog of all 12 GIS layers, ARCOS damage records, and 117k customer topology paths.
- 🔍 **[Data Provenance Ledger](docs/source_ledger.md)**: Strict boundary mapping distinguishing challenge data, modeled sensors, and scenario assumptions.
- 📐 **[Technical Blueprint](FINAL_LOADSHET_IMPLEMENTATION.md)**: Complete 4-teammate architectural specification.

---

## 🚀 Quickstart & Verification

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend Setup & Test Suite
```bash
# Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

# Run the automated test suite
python -m pytest -o pythonpath=. tests/

# Launch FastAPI backend server (port 8000)
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The checked-in `data/processed/network_bundle.json` supplies the demo sample; the
sample lookup works without generating the optional full private graph. To verify
all three full-source topology checks, keep the official AEP archives in
`aep_challenge_hack26/data/raw/` (or set `AEP_DATA_DIR` to their local directory).
Without those archives, those checks skip.

### 2. Frontend Web Application
```bash
cd web
npm install

# Verify clean production TypeScript build
npm run build

# Launch Vite development server (port 5173)
npm run dev
```

### 3. Acceptance Verification Commands
```bash
# 1. Verify API health
curl http://localhost:8000/api/health

# 2. Select demonstration scenario
curl -X POST http://localhost:8000/api/scenario/select -H "Content-Type: application/json" -d '{"scenario_id":"local_protection"}'

# 3. Query a premise in the checked-in anonymized AEP sample
curl 'http://localhost:8000/api/aep/source'
curl 'http://localhost:8000/api/topology/lookup?premise_id=PREM-0B30A08C7266D4BF'
# Optional full-graph token example (UNKNOWN without the private graph):
curl 'http://localhost:8000/api/topology/lookup?premise_id=PREM-000001'
# A known trace ends at a circuit breaker; substation_status remains UNKNOWN.

# 4. Calculate home battery runtime
curl -X POST http://localhost:8000/api/customer/battery-runtime -H "Content-Type: application/json" -d '{"capacity_wh":1000,"usable_fraction":0.85,"device_w":120,"inverter_efficiency":0.85,"reserve_margin_pct":0.15}'
```

---

## Critical facilities and outage-risk assumptions

The public sample now links **52 source facility records** (5 hospital, 37 fire,
10 ambulance) to the nearest geolocated transformer **within the selected slice**.
Facility points are reprojected from the supplied EPSG:3857 horizontal coordinates
to WGS84 (EPSG:4326); NAVD88 elevation is not used for horizontal proximity.
Equipment geometry in this public sample is already generalized to 0.02 degrees.
Ties use the asset token. Anonymous source-record tokens, facility type, rounded
kilometre distance and the association basis are saved; names, addresses, source
IDs and facility coordinates are omitted. Records are not deduplicated sites.

These are **assumed spatial links**, including distant matches, with no distance
cutoff. They do not prove which equipment actually serves a facility. Each anchor
and its upstream equipment receive `critical_facilities` and
`critical_facility_count` tags using the union of supplied paths through that
anchor. Alternate paths remain ambiguous; live switching or electrical flow is
not inferred. `source_impact.critical_facility_impact` exposes this separate,
anonymous dependency assumption for planning. It does not add facility records
to the 16-premise count or establish observed facility outages.

Rebuild the public associations with the supplied archives present:

```bash
python -m pipeline.link_facilities
# Optional full private graph: source equipment geometry, same association rule.
python -m pipeline.build_graph --output-dir data/processed
```

The private graph still contains raw technical identifiers and must not be served.
Rebuilding it also tags critical facilities; old graphs without associations report
critical facility coverage as `UNKNOWN`.

`engine.outage_risk.calculate_outage_risk` takes `wind_kph`,
`ambient_temperature_c`, `transformer_load_factor` (relative to rating) and
`health_index` (0 worst, 100 healthy). All are **declared scenario inputs** in the
current demo. Each contributes 0, 1 or 2 points:

| Factor | 1 point | 2 points |
|---|---|---|
| Wind | >=35 km/h | >=65 km/h |
| Ambient temperature | <=0 or >=35 C | <=-15 or >=40 C |
| Transformer load factor | >=0.85 | >=1.10 |
| Health index | <=70 | <=40 |

Each factor uses its highest matching level; sum 0–2 is LOW, 3–5 MODERATE,
6–8 HIGH. Drivers expose each value, contribution and total. Missing, invalid or
conflicting inputs return UNKNOWN. Thresholds are prototype design assumptions,
not calibrated probabilities, utility limits or a utility forecast. A confirmed
incident does not force a HIGH contextual band. This rule is separate from
preventive condition priority and restoration readiness.

Scenario generation accepts a complete `risk_inputs` context override; no API
request control for those inputs is added here. Defaults explicitly declare wind
70 km/h, ambient 35 C, load 0.95 and health 80 (MODERATE); the replacement scenario
declares load 1.15 and health 35 (HIGH). Conflicting evidence withholds the band.

---

## 👥 Architecture & Team Roles

- **Role 1 (Data & Topology)**: GIS ingestion, upstream network graph, customer privacy boundaries.
- **Role 2 (Reasoning & Labor)**: Causal diagnosis, 4.5× STORMS labor parser, solar node energy simulation, multi-scenario synthesizer.
- **Role 3 (3D Twin & Operator Console)**: Procedural Three.js hardware viewport, SVG feeder circuit map, telemetry HUD, planning cards.
- **Role 4 (Integration & Customer Concierge)**: FastAPI application layer, customer battery runtime calculator, preparedness engine, alert FSM.
