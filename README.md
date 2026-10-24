# LoadShed Sentinel — HackOHI/O 2026 (AEP Track)

**Distribution Transformer Digital Twin & AI Customer Outage Concierge**

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
   - Interactive Three.js/WebGL procedural utility pole, distribution transformer, sensor pod, and animated cutout fuse switch (latched energized vs 45° blown drop).
   - Source-derived schematic SVG feeder map visualizing provided upstream equipment relationships (not measured power flow or live state).
   - Telemetry HUD with oil temperature, vibration harmonics, load factor, and ambient weather.

4. **AI Residential Outage Concierge**:
   - Dynamic 4-state alert finite-state machine (`PRE_STORM`, `OUTAGE_CONFIRMED`, `ESTIMATE_UPDATED`, `RESTORATION_COMPLETE`).
   - Home battery runtime calculator budgeting critical household wattage against usable capacity and inverter losses.
   - Household needs intake (refrigerated medication, medical devices, sump pumps) generating tailored preparedness guidance.
   - Strict privacy projection: zero customer PII or raw coordinates exposed to public network layers.

---

## 🎯 4 Canonical Demonstration Scenarios

| Scenario | Incident ID | Cutout Switch | Root Cause Diagnosis | Crew Packaging |
|---|---|---|---|---|
| **1. Local Protection Fault** | `INC-2026-0881` | OPEN (45° drop) | Cutout fuse blown on transient lightning surge; transformer core healthy | 1 Line Crew (2 persons), bucket truck, replacement fuse link |
| **2. Upstream Feeder Trip** | `INC-2026-0894` | CLOSED (energized) | Upstream recloser lockout; zero local transformer damage | Upstream Substation/Feeder Crew; avoids false transformer replacement |
| **3. Confirmed Replacement** | `INC-2026-0902` | OPEN (blown) | Severe coil thermal runaway & tank rupture; physical replacement required | Crane Crew + Line Crew (4 persons), 50 kVA transformer replacement |
| **4. Insufficient Evidence** | `INC-2026-0917` | UNKNOWN | Ambiguous telemetry; sensor signal degradation | Trouble Shooter patrol dispatched for physical inspection before commitment |

---

## 📋 HackOHI/O Judging & Documentation Package

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

## 👥 Architecture & Team Roles

- **Role 1 (Data & Topology)**: GIS ingestion, upstream network graph, customer privacy boundaries.
- **Role 2 (Reasoning & Labor)**: Causal diagnosis, 4.5× STORMS labor parser, solar node energy simulation, multi-scenario synthesizer.
- **Role 3 (3D Twin & Operator Console)**: Procedural Three.js hardware viewport, SVG feeder circuit map, telemetry HUD, planning cards.
- **Role 4 (Integration & Customer Concierge)**: FastAPI application layer, customer battery runtime calculator, preparedness engine, alert FSM.
