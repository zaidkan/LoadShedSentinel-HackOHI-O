# HackOHI/O 2026 — Official Build Handoff: LoadShed
## AI Outage Concierge: Transformer-Aware Distribution & Solar-Islanding Orchestrator

**Target Track:** AEP AI Outage Concierge Challenge  
**Event:** HackOHI/O 2026 (The Ohio State University)  
**Build Window:** 24 Hours (October 24–25, 2026)  
**Primary Build Tool:** Codex / Python / React or Streamlit  
**Status:** Approved for Implementation  
**Workspace File:** [`HackOHIO-2026-AEP-Build-Handoff.md`](file:///c:/Users/ritav/Documents/Codex/2026-10-23/i-ne/outputs/HackOHIO-2026-AEP-Build-Handoff.md)

---

## 1. Executive Summary & Project Identity

### One-Sentence Product Pitch
**LoadShed** is an AI Outage Concierge that bridges utility-side distribution grid restoration with customer-side solar and battery islanding: it traces a residential customer's premise directly to their assigned **Distribution Transformer**, computes realistic replacement timelines using AEP’s official **Install Labor workbook** (with the mandatory **4.5× indirect labor multiplier**), and provides an **interleaved solar-battery duty-cycle schedule** (inspired by YC F26 **Liquid Energy**) that staggers inductive starting surges to guarantee declared life-safety appliances survive until utility lineworkers energize the lateral branch.

### Primary User & Consequential Moment
* **User:** A residential customer facing a severe storm outage who relies on essential appliances (refrigerator, sump pump) or declared medical equipment (CPAP, refrigerated insulin) and has access to a portable power station (EcoFlow, Jackery, Anker) and/or portable solar blankets.
* **The Moment:** The storm knocks out power. The customer's distribution transformer cutout blows. Simultaneously, the customer attempts to power their fridge and sump pump from their portable battery, causing an inrush surge trip that kills power to their medical equipment. The concierge intervenes immediately to explain the transformer repair progress, prevent inverter overload, and budget their stored energy to bridge the exact utility restoration window.

---

## 2. Strategic Lineage & Y Combinator Parents

```mermaid
flowchart TD
    subgraph Parents["Y Combinator Inspiration & Mechanisms"]
        S["Squid (W26)<br/>Single Source of Grid Truth<br/>Distribution Network Graph"]
        LE["Liquid Energy (F26)<br/>Self-Contained Solar AI Module<br/>Deployable Solar Islanding Model"]
        VE["Voxel Energy (W26) & NODI Energy<br/>Distributed Edge Battery<br/>State-of-Charge Budgeting"]
        OP["OpEra (F26)<br/>Physical Constrained Operations<br/>Dynamic Load Scheduling"]
    end

    subgraph Core["LoadShed Concierge Engine"]
        S --> |Feeder & Transformer Topology| Core
        LE --> |Solar Influx Curve Modeling| Core
        VE --> |Battery SoC Depletion Physics| Core
        OP --> |Inrush Surge Collision Solver| Core
    end

    subgraph Deliverables["AEP Sponsor Brief Deliverables"]
        Core --> R1["Req 1: Premise Risk Band"]
        Core --> R2["Req 2: ETR Range (Labor × 4.5)"]
        Core --> R3["Req 3: Medical/CPAP Safety"]
        Core --> R4["Req 4: Four Automated Alerts"]
        Core --> R5["Req 5: Strict Privacy Allowlist"]
    end
```

### Why We Rejected the GridVeda Model
* *Inspiration Checked:* [GridVeda](https://devpost.com/software/gridveda) (Devpost TreeHacks 2026 Winner) claimed to monitor 20 transformers with edge AI and quantum circuits on an NVIDIA Jetson.
* *Why We Rejected It:* GridVeda fabricated synthetic transformer telemetry (vibration, temperature, oil degradation) because real utility distribution transformers do not broadcast public IoT telemetry. Doing this at HackOHI/O would be caught immediately by AEP engineers. Furthermore, building an internal utility transformer debugging tool violates the residential customer brief and fails 4 of the 5 mandatory requirements.
* *Our Resolution:* We ground the transformer entirely in **AEP's verified GIS topology (25,298 verified transformer joins)** and calculate physical repair intervals using AEP’s official **Install Labor workbook** (Transformer 1-Phase / 3-Phase removal and installation hours $\times$ 4.5× multiplier). We then apply the **Liquid Energy** solar-islanding model on the customer side.

---

## 3. Strict Compliance Matrix: All 5 Sponsor Requirements

| Mandatory Requirement | How LoadShed Satisfies It Deterministically | Code / Module Implementation |
|---|---|---|
| **Req 1: Premise Risk Band & Uncertainty** | Ingests anonymized premise key (`PREMISE_XXXXX`), parses verified supply path to Feeder Trunk and Distribution Transformer, computes scenario-based risk band with explicit uncertainty factors. | `backend/engine/topology.py`<br/>`backend/engine/risk_model.py` |
| **Req 2: Restoration Range & Dependencies** | Calculates physical repair interval from AEP Labor Workbook: Transformer & Fuse Removal + Install hours $\times$ **4.5× indirect multiplier** / crew size. Segregates AI model estimates from utility-confirmed crew dispatches. | `backend/engine/labor_restoration.py` |
| **Req 3: Customer Preparation & Safety** | Strictly adapts to **declared** (never inferred) medical needs (CPAP, oxygen), medications (insulin temperature thresholds), or structures (sump pump runtimes). | `backend/engine/safety_guidance.py` |
| **Req 4: Alert Eligibility & 4 Messages** | Evaluates documented opt-in and priority rules. Generates 4 stateful messages: **1. Pre-Storm Advisory**, **2. Confirmed Outage**, **3. Estimate Updated**, **4. Service Restored**. | `backend/engine/alert_generator.py` |
| **Req 5: Privacy, Explanations & Fallback** | Enforces a strict field allowlist: zero customer PII, zero employee contacts, zero raw SCADA tags, zero sensitive GPS coordinates. Provides graceful fallback when a premise path is unmapped. | `backend/engine/privacy_filter.py` |

---

## 4. Grounded Data Reality & Audit Results

1. **Customer & Premise Layer:** 117,642 total customer records. 117,599 unique premise paths in the topology table; **117,595 premise keys match the customer layer directly**.
2. **Distribution Transformers:** **25,300 topology nodes match equipment class and ID to transformers; 25,298 also match the location number**. This verified subset provides the ground truth for our demonstration.
3. **Lateral Fuse Cutouts:** **6,656 topology nodes match fuse cutouts** by class, ID, and location.
4. **Labor Workbook (`Install_Labor_HackOHIO.xlsx`):** Contains exact installation and removal direct hours for transformers, fuses, poles, and conductors. It explicitly mandates a **4.5× indirect-labor factor** covering drive time, safety briefings, truck setup, and restocking. **This factor must be applied exactly once—never double-counted with separate travel adders.**
5. **Historical Damage Records:** Contains 1,659 records. Timestamps are date-only (500 same-day records; median 1 day). They are **not** calibrated hourly labels for training an ML model. LoadShed derives hourly restoration intervals deterministically from the labor workbook rather than training a black-box regression on date-only historical logs.
6. **Privacy Allowlist:** Raw files contain names, street addresses, and phone numbers. The application strips all source records through an allowlist before any data enters UI components or LLM prompts.

---

## 5. Mathematical Formulations & Core Domain Engines

### Engine 1: Distribution Topology & Step-Restoration Traversal
The electrical distribution supply path is modeled as a directed acyclic graph (DAG):
$$\text{Substation Breaker} \longrightarrow \text{Feeder Trunk Line} \longrightarrow \text{Lateral Fuse Cutout} \longrightarrow \text{Distribution Transformer} \longrightarrow \text{Customer Premise}$$

Step-restoration dependencies dictate that downstream customers cannot receive power until upstream segments are energized:
$$T_{energized}(\text{Premise}) = \max \left( T_{restored}(\text{Feeder}), T_{restored}(\text{Fuse}), T_{restored}(\text{Transformer}) \right)$$

### Engine 2: Labor Workbook Restoration Duration
For any damaged equipment on the premise's supply path, the elapsed crew time is calculated directly from AEP's labor standards:
$$T_{elapsed} = \frac{\sum_{i \in \text{Tasks}} \left( \text{Direct Removal Hours}_i + \text{Direct Install Hours}_i \right) \times 4.5}{\text{Crew Size}}$$

*Example (Pole-top Transformer Replacement):*
- Direct Removal: 1.5 hours; Direct Install: 2.5 hours $\implies$ Total Direct = 4.0 hours.
- Total with 4.5× multiplier = $4.0 \times 4.5 = 18.0\text{ person-hours}$.
- Two-lineworker crew = $\frac{18.0}{2} = 9.0\text{ crew-hours}$.
- Adding staging interval $[T_{min}, T_{max}] \implies [9.0\text{h}, 13.5\text{h}]$.

### Engine 3: Inductive Starting Surge (Inrush) Collision Solver
Motor-driven appliances (refrigerators, freezers, sump pumps) exhibit starting Locked Rotor Amps (LRA) drawing $3\times$ to $6\times$ their running wattage for 500ms to 2s:
$$P_{surge}(t) = \sum_{j \in \text{Active}} P_{running, j} + \sum_{k \in \text{Starting}} P_{inrush, k}$$

*Inverter Protection Constraint:*
$$P_{surge}(t) \le P_{inverter\_peak\_surge\_limit}$$

If a refrigerator ($1,200\text{W}$ surge) and sump pump ($2,200\text{W}$ surge) attempt to start simultaneously on a $2,400\text{W}$ inverter:
$$P_{surge} = 3,400\text{W} > 2,400\text{W} \implies \text{BREAKER TRIPS}$$
The solver enforces a phase-interleaving schedule, locking out the refrigerator compressor whenever the sump pump float switch is active.

### Engine 4: Liquid Energy Solar Influx & Battery State-of-Charge (SoC) ODE
The household battery state of charge is modeled continuously:
$$\frac{dE_{battery}}{dt} = P_{solar}(t) \cdot \eta_{charge} - \frac{P_{load}(t)}{\eta_{inverter}}$$

* **Solar Generation (Liquid Energy Model):** Post-storm cloud clearing models solar irradiance $I(t)$:
  $$P_{solar}(t) = A_{panels} \cdot \eta_{solar} \cdot I_{clear}(t) \cdot (1 - \text{CloudCover}(t))$$
* **Pulsed Refrigeration Duty Cycling:** Instead of running the refrigerator compressor continuously ($150\text{W}$ continuous $\implies 150\text{Wh/hr}$), the concierge pulses the compressor for 20 minutes every 2 hours ($17\%$ duty cycle $\implies 25\text{W}$ average). This maintains the internal cabinet below the USDA $40^\circ\text{F}$ threshold while slashing energy draw by $83\%$.
* **Runtime Extension:** Total continuous draw drops from $1,075\text{W}$ to $150\text{W}$ (average). A $1,500\text{Wh}$ battery extends from $1.2\text{ hours}$ to $10.0\text{ hours}$. Combined with $400\text{Wh}$ of afternoon solar influx from portable panels, runtime reaches **$14.5\text{ hours}$**, successfully bridging to the utility transformer restoration at Hour 13.

---

## 6. Repository Architecture & 24-Hour Build Plan

### Project Directory Structure
```
loadshed-aep/
├── data/
│   ├── verified_topology_sample.json   # Anonymized premise, transformer, fuse joins (from AEP GIS)
│   ├── labor_standards.json            # AEP Install Labor workbook rates + 4.5x multiplier
│   └── appliance_specs.json            # Inrush surge multipliers, running watts, duty cycles
├── backend/
│   ├── main.py                         # FastAPI application entry point
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── topology.py                 # Premise-to-Transformer DAG graph tracer
│   │   ├── labor_restoration.py        # Labor workbook math (4.5x factor, ETR intervals)
│   │   ├── surge_solver.py             # Inrush surge collision checker & interleaving
│   │   ├── solar_battery.py            # Liquid Energy solar model + battery SoC ODE
│   │   ├── safety_guidance.py          # Declared medical (CPAP, insulin, sump) protocols
│   │   ├── alert_generator.py          # State-machine generating the 4 mandatory messages
│   │   └── privacy_filter.py           # Strict allowlist stripping PII, GPS, and employee data
│   └── api/
│       └── routes.py                   # REST endpoints for premise lookup, scenario updates
├── frontend/                           # React + Vite + Tailwind OR Streamlit dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── PremiseLookup.tsx       # Anonymized premise input & risk badge
│   │   │   ├── GridSupplyTree.tsx      # Squid-inspired Substation -> Fuse -> Transformer visual
│   │   │   ├── IslandingSchedule.tsx   # Interleaved appliance Gantt chart + solar curve
│   │   │   ├── AlertFeed.tsx           # 4 stateful notification cards
│   │   │   └── PrivacyAuditView.tsx    # Raw vs Anonymized inspectable side-by-side
│   │   └── App.tsx
│   └── package.json
└── README.md                           # Architecture documentation & judge demo guide
```

---

## 7. The Three-Minute Video Demonstration Script

| Timecode | Visual on Screen | Spoken Audio / Narration Script | Key Rule / Feature Demonstrated |
|---|---|---|---|
| **0:00–0:35** | Map view of approaching winter storm; customer dashboard opens. | *"During a major storm, residential customers face two urgent questions: when will my power return, and how do I keep my family and critical devices alive in the meantime? This is LoadShed. An anonymized customer at Premise #04281 enters their ID. They declare a 1,500Wh portable battery, a 200W solar blanket, a refrigerator, a sump pump, and a critical medical CPAP machine."* | **Req 1 & Req 3:** Premise lookup, scenario risk band, declared medical equipment. |
| **0:35–1:15** | Grid Supply Tree zooms in; shows Substation $\rightarrow$ Feeder $\rightarrow$ Lateral Fuse $\rightarrow$ Transformer #25298. Cutout turns red. | *"LoadShed maps their verified supply path. While the main feeder backbone is intact, high winds have severed the tap and damaged Distribution Transformer #25298. Instead of guessing, LoadShed queries AEP's official Install Labor standards: 4 direct hours for transformer replacement multiplied by the mandatory 4.5× indirect factor. Dividing by a two-person lineworker crew yields an elapsed repair window of 12 to 16.5 hours."* | **Req 2:** Grounded labor restoration math, 4.5× multiplier, upstream dependency tracing. |
| **1:15–2:05** | Islanding view opens. Red "SURGE OVERLOAD" warning flashes, then transitions into an interleaved Gantt chart with solar curve. | *"Now look at the customer side. If the homeowner plugs their fridge and sump pump in together, their combined 3,400W inrush surge immediately trips the 2,400W inverter breaker, killing power to the CPAP. Even if it didn't trip, running continuously kills the battery in 2 hours—10 hours before the transformer is fixed. Inspired by YC's Liquid Energy deployable solar model, LoadShed computes an interleaved schedule: it staggers compressor starts, pulses the fridge for 20 minutes every 2 hours to keep food safe, and integrates afternoon solar recharge. Battery runtime stretches from 2 hours to 15 hours, safely bridging the utility restoration gap."* | **YC Parents:** Liquid Energy solar model, OpEra constrained scheduling, inrush surge physics. |
| **2:05–2:40** | Operator toggle clicked: *"Replacement Transformer Arrives on Site"*. ETR drops; Gantt chart updates; SMS notification pops up. | *"Watch what happens when operational conditions change. An AEP line crew clears road debris and arrives with the replacement transformer ahead of schedule. The ETR updates to 9.5 to 12 hours. LoadShed immediately re-optimizes the battery schedule, allows the homeowner to turn on their Wi-Fi router, and dispatches an automated, deduplicated 'Estimate Updated' customer alert."* | **Req 4 & Dynamic Scenario:** Operational update changing customer plan, automated message generator. |
| **2:40–3:00** | Privacy audit toggle clicked; shows side-by-side source GIS record vs customer view. Graceful fallback screen shown. | *"Finally, LoadShed enforces total privacy compliance: customer PII, lineworker names, and sensitive GPS coordinates are strictly masked through an allowlist. When an unmapped premise is entered, it gracefully falls back to transparent circuit-level heuristics. LoadShed transforms utility data into actionable household survival."* | **Req 5:** Privacy allowlist, fallback mode, summary of impact. |

---

## 8. Immediate Build Kickoff

To begin with Codex:
1. Load `data/verified_topology_sample.json` containing the verified transformer and fuse joins.
2. Implement `backend/engine/labor_restoration.py` enforcing the 4.5× multiplier.
3. Implement `backend/engine/surge_solver.py` and `backend/engine/solar_battery.py`.
4. Implement `backend/engine/alert_generator.py` and `backend/engine/privacy_filter.py`.
