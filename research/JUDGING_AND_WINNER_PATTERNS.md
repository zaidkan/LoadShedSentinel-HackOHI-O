# LoadShed Sentinel — Judging Criteria & Winning Patterns Analysis

**Event:** HackOHI/O 2026 (The Ohio State University)  
**Track:** American Electric Power (AEP) Sponsor Track  
**Submission Format:** Google Form (via HackOHIO Discord) + Prerecorded Video (≤ 180 seconds) + Live Zoom Q&A  
**Auditor:** Competitive Intelligence & Differentiation Specialist  
**Reference Commit:** `e5f5abb3c3b9a240b2d1c2a412e171db926538ab`

---

## 1. Official HackOHIO Criteria vs Observed Reality

The official HackOHIO rubric published on Devpost lists six overarching criteria without explicit numerical weightings. In collegiate hackathons with enterprise sponsor tracks (specifically AEP), actual judging behavior exhibits distinct implicit priorities:

| Official Criterion | Published Description | Implicit Weight in Sponsor Track | How Judges Actually Evaluate It | How LoadShed Sentinel Delivers Evidence |
|---|---|:---:|---|---|
| **1. Innovation** | Originality, creative approach to the challenge. | **20%** | Judges discount generic dashboards or ChatGPT wrappers. They look for domain-specific insight that bridges previously disconnected silos (e.g. edge physical state + union labor mechanics + customer life-safety). | Unifies edge transformer telemetry with AEP STORMS labor formulas and customer-side battery budgeting; introduces principled epistemic abstention. |
| **2. Problem Relevance & Impact** | Real-world viability, value to end users/sponsors. | **25%** | **Highest sponsor weight.** AEP utility engineers care about metrics: SAIDI/SAIFI, avoiding $10k–$15k crew misdispatches, and eliminating customer panic calls during major storm events. | Solves the secondary distribution blind spot; prevents misdispatching replacement crews on upstream trips; provides life-critical device contingency planning. |
| **3. Project Breadth & Complexity** | Technical ambition across disciplines. | **20%** | Judges look for an end-to-end working pipeline: GIS spatial ingestion → graph network builder → mathematical scheduling engine → WebGL 3D rendering → reactive frontend. | Ingests 12 AEP GIS layers and 117,549 premise paths; implements 3D Three.js cutout kinematics; enforces strict customer privacy projection and finite-state machine. |
| **4. Communication** | Presentation clarity, narrative flow, simplicity. | **15%** | **Video gatekeeper.** Judges watch dozens of videos. A hurried, jargon-heavy, or rambling 3-minute video loses immediately. Clean visual cause-and-effect wins. | Locked 180-second four-speaker storyboard with precise word counts (~138 WPM) following the data journey from storm fault to household living room. |
| **5. Curiosity & Technical Rigor** | Depth of inquiry, exploring edge cases and mechanics. | **10%** | Judges test whether the team actually read the source data guide, understood unit conversions, and discovered edge-case contradictions in the data. | Audited 5 sheets and 135 cell references in `Install_Labor_HackOHIO.xlsx`; verified single 4.5× indirect multiplier; discovered and handled duplicate equipment keys and missing GIS substation joins. |
| **6. Growth Mindset & Honesty** | Learning journey, self-correction, honest boundaries. | **10%** | **The ultimate trust builder.** Boasting "our AI is 99.8% accurate" gets roasted by utility veterans. Admitting data boundaries and demonstrating negative controls generates instant respect. | Transparently labels 16-premise demo slice vs 117k offline graph; clearly states substation connectivity is UNKNOWN; exhibits explicit negative control (`insufficient_evidence` abstention). |

---

## 2. AEP Sponsor Track Dynamics: What Utility Judges Look For

Judges from American Electric Power (AEP) represent a specialized audience composed of distribution system operators, protection engineers, enterprise GIS architects, and customer experience leads. Based on track briefs and utility operational realities:

### What Impresses AEP Judges:
1. **Respect for Grid Physics & Protection Coordination:**
   - Recognizing that a blown cutout fuse is an open circuit that de-energizes secondary homes, while an upstream breaker lockout trips the entire feeder.
   - Showing that restoring power is not just flipping a software toggle—it requires clearing physical upstream blockers and authorized re-energization.
2. **Faithfulness to AEP Challenge Data:**
   - Direct, verifiable consumption of `Data1.zip`, `Data2.zip`, `matched_upstream.txt`, and `Install_Labor_HackOHIO.xlsx`.
   - Applying the official STORMS formula correctly:
     $$\text{Direct Job-Site Hours} \times 4.5 = \text{Adjusted Person-Hours}$$
     (Judges will check if you applied 4.5 once, or double-multiplied).
3. **Preventing Costly Crew Misdispatch:**
   - In storm conditions, mutual-aid line crews cost over $350/hour per worker. Dispatching a 3-person heavy bucket crew to replace a transformer that is actually healthy (because the fault was upstream) costs thousands of dollars and delays true restoration.
4. **Epistemic Humility & Abstention:**
   - In commercial software, systems are forced to output a guessed restoration time. Showing a system that explicitly says *"Evidence is contradictory; dispatching trouble shooter patrol; abstaining from premature customer commitment"* proves senior-level engineering maturity.
5. **Customer Privacy by Design:**
   - Never leaking internal GIS asset tokens, exact transformer coordinates, or customer names/addresses to public browser payloads.

### What Disqualifies or Demotes Projects:
- **Hallucinating Live Utility Feeds:** Claiming "we connected to AEP's live real-time SCADA grid" (judges know this is air-gapped and legally restricted).
- **Inventing High-Cost Hardware:** Proposing $10,000 military-grade LiDAR sensors on every residential pole without a power/cost budget.
- **Generic Chatbots:** An ungrounded OpenAI wrapper telling customers "Stay safe and wait for the power company."
- **Overcrowded UI / Visual Chaos:** Cluttered dashboards with 50 flashing graphs that cannot be explained in 15 seconds.

---

## 3. Analysis of Winning Patterns in HackOHIO & Energy Tracks

Studying past collegiate hackathon winners (HackOHIO, MHacks, PennApps, energy & sustainability tracks) highlights five repeatable operational patterns:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THE 5 WINNER PATTERNS                             │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. The 15-Second WOW     │ One crisp action -> visible causal change   │
│ 2. The Negative Control  │ Proving the system can say "NO" or "UNKNOWN"│
│ 3. Sourced Lineage       │ Every displayed number traces to raw source │
│ 4. Cross-Domain Synergy  │ Grid Hardware <--> Workforce <--> Living Rm │
│ 5. Strict Time Discipline│ Exactly 180 seconds; zero fluff; clear close│
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Pattern 1: The 15-Second Interactive Causal "WOW" Moment
- Winning teams never spend their demo clicking through static navigation menus.
- They set up a clear baseline, perform **one real action**, and highlight a **dramatic, logical consequence**:
  - *Example:* On `confirmed_replacement`, moving the Lineworker Crew slider from 3 to 6 workers instantly drops labor hours from 2.99h to 1.50h; then adding 2 hours of access delay recalculates the shared timeline to 3.50h across both the utility dispatch board and the customer concierge simultaneously.

### Pattern 2: The Explicit Negative Control
- Judges test whether a hackathon project is a brittle "happy path" demo or a resilient system.
- Showing a scenario where the system **refuses to claim power is restored** because upstream blockers are open, or **refuses to give an ETR** when telemetry is contradictory, proves genuine system architecture.

### Pattern 3: Sourced Lineage Over Magic Numbers
- When judges ask *"Where did that 2.99 hours come from?"*, the team doesn't say *"The machine learning model predicted it."*
- The team says: *"Workbook sheet Labor time material related, cell C21 is 1.188 installation hours, D21 is 0.806 removal hours, summed to 1.994 direct hours, multiplied by the 4.5 STORMS indirect allowance to yield 8.974 adjusted person-hours, divided by 3 qualified lineworkers."*
- This level of verifiable precision wins hackathons decisively.

### Pattern 4: Cross-Domain Synergy (The "Why Both Sides Matter" Narrative)
- Pure utility tools ignore the human cost in dark living rooms (spoiled insulin, dead medical oxygen concentrators).
- Pure customer apps lack grid context and give hollow platitudes.
- LoadShed Sentinel connects both: the operator sees the transformer cutout physics and crew logistics; the customer gets personalized battery watt-hour budgeting and medical device guidance, synchronized through a shared incident revision.

### Pattern 5: Strict Time Discipline (≤ 180s Video)
- Exceeding 180.0 seconds leads to automatic score penalties or disqualification in HackOHIO sponsor tracks.
- A scripted, rehearsed four-speaker video delivering ~138 words per minute ensures every second delivers verified judge evidence.

---

## 4. Key Takeaway for LoadShed Sentinel Differentiation

To win the HackOHIO 2026 AEP Track, LoadShed Sentinel must **not** attempt to build a massive new subsystem in the final hours. 

Instead, the project must capitalize on its unique structural moat:
1. **Highlight the Causal Contrast:** Directly contrast Scenario 1 (`local_protection`) vs Scenario 2 (`upstream_feeder`) to prove how edge sensing eliminates multi-thousand-dollar crew misdispatches.
2. **Execute the Labor Sensitivity WOW Beat:** Demonstrate real-time STORMS recalculation from C21/D21 cells.
3. **Showcase the Negative Control:** Demonstrate Scenario 4 (`insufficient_evidence`) where the system gracefully abstains from guessing.
4. **Deliver Cohesive Customer Empowerment:** Show household medical device and battery runtime guidance updating in lockstep with the utility incident.
