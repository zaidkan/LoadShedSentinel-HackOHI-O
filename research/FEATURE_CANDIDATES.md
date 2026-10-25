# LoadShed Sentinel — Feature Candidates & Adversarial Evaluation

**Audit Baseline:** October 25, 2026  
**Auditor:** Competitive Intelligence Specialist (LoadShed Sentinel, HackOHIO 2026 AEP Track)  
**Standard:** 18 specific candidate features evaluated across the 10 research directions defined in Section 5.4 of the remediation directive. Every candidate is scored across 5 weighted dimensions and subjected to explicit veto filters.

---

## 1. Evaluation Methodology & Scoring Rubric

Each candidate is evaluated on a 0–5 scale across five weighted dimensions:

1. **Unmet Pain & Real Benefit (Weight 25%):** Does this solve a genuine utility dispatcher headache or life-safety homeowner emergency, or is it decorative trivia?
2. **Competitive Novelty (Weight 20%):** Does this provide a unique capability absent in commercial tools (Oracle, GE Vernova, KUBRA, Sense), or is it an existing commodity?
3. **Demo "WOW" Cause-and-Effect in <20s (Weight 20%):** Can a judge clearly see an action and understand its dramatic, logical consequence within 15–20 seconds on screen?
4. **Authentic Data / Technical Feasibility (Weight 20%):** Can this be computed strictly from the provided AEP GIS shapefiles, upstream topology, and STORMS workbook without inventing fake data?
5. **Implementation Robustness & Release Safety (Weight 15%):** Can this be implemented cleanly in the remaining hours without destabilizing HEAD, causing concurrency bugs, or breaking existing tests?

$$\text{Total Weighted Score (0–100)} = (S_1 \times 0.25 + S_2 \times 0.20 + S_3 \times 0.20 + S_4 \times 0.20 + S_5 \times 0.15) \times 20$$

### Veto Triggers (Immediate Disqualification regardless of score):
- **VETO-FABRICATION:** Requires inventing live grid feeds, unverified hardware sensors, or fake predictive AI accuracy.
- **VETO-SCOPE:** Requires unavailable external enterprise systems (AMI, live SCADA, real SMS delivery).
- **VETO-COMPLEXITY:** Risk of breaking existing passing test suite (117 tests) or creating race conditions before the 10:00 AM EDT submission deadline.
- **VETO-PRIVACY:** Exposes raw customer PII, street addresses, or private electrical coordinates.

---

## 2. Comprehensive Candidate Evaluation (18 Features)

| ID | Feature Name & Research Direction | Description & Operational Workflow | Pain (25%) | Novelty (20%) | WOW <20s (20%) | Feasibility (20%) | Robustness (15%) | Total / 100 | Veto Status | Verdict & Disposition |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|---|
| **C-01** | **Interactive Blast-Radius Topology Explorer** *(Dir 1)* | Clicking an equipment node in the Feeder Map visually animates downstream dependency propagation and dynamically calculates the exact subset of affected premises in the sample. | 4.0 | 3.5 | 4.5 | 5.0 | 4.0 | **82.0** | None | **SHORTLIST FINALIST (Rank #2).** Highly visual, source-grounded in AEP paths; enhances existing SVG map. |
| **C-02** | **Side-by-Side Counterfactual Incident Comparator** *(Dir 2)* | Split-screen or toggle comparing Scenario 1 (local blown fuse) vs Scenario 2 (upstream trip) on the *same* asset footprint, highlighting the avoided $12k crane crew misdispatch. | 5.0 | 4.5 | 4.5 | 5.0 | 4.5 | **87.0** | None | **RECOMMENDED WINNER (Rank #1).** Directly addresses AEP's biggest storm headache; 10-second visual comprehension. |
| **C-03** | **Interactive Evidence-to-Decision Audit Trail** *(Dir 3)* | Expandable causal graph tracing raw sensor signals (heat/acoustic) → competing hypotheses → review-only task recommendation → sanitized customer statement. | 4.0 | 4.0 | 3.5 | 4.5 | 4.0 | **80.0** | None | **SHORTLIST FINALIST (Rank #3).** Proves explainable AI and transparent decision engineering. |
| **C-04** | **Defensible Critical-Facility Priority Scheduler** *(Dir 4)* | Allows operators to toggle priority for associated medical/fire facilities only where GIS associations exist, recalculating restorative sequencing. | 4.0 | 3.5 | 3.5 | 4.5 | 4.5 | **79.5** | None | **Already Partially Implemented (F02).** Polishing current panel is preferred over building a new view. |
| **C-05** | **Source-Lineage Labor Breakdown Modal** *(Dir 5)* | Clicking the restoration estimate opens an interactive inspector showing exact workbook cells (`C21=1.188`, `D21=0.806`), the 4.5× multiplier, and crew division formula. | 4.5 | 4.5 | 4.0 | 5.0 | 4.5 | **84.5** | None | **HIGH CONTENDER.** Excellent for judging technical proof beat, but partially covered in script voiceover. |
| **C-06** | **Live Telemetry Corruption "Abstention" Toggle** *(Dir 6)* | An interactive button allowing presenter to corrupt or zero a sensor signal, causing the engine to immediately drop an active ETR and transition to `UNDER_REVIEW`. | 4.5 | 5.0 | 4.5 | 4.5 | 3.5 | **84.0** | None | **HIGH CONTENDER.** Extremely memorable negative control; slightly riskier state transition. |
| **C-07** | **Decision-Aware Home Medical Contingency Wizard** *(Dir 7)* | Dynamic questionnaire where toggling "Life-Critical Oxygen" calculates exact backup battery shortfall against utility restoration timeline and warns to evacuate. | 4.5 | 4.0 | 4.0 | 4.5 | 4.0 | **82.0** | None | **STRONG CONTENDER.** Merges customer battery calculator with utility restoration timeline. |
| **C-08** | **Deterministic Incident Replay Scrubber** *(Dir 8)* | Timeline scrubber allowing presenter to scrub through storm onset (t=0), cutout drop (t=5m), hypothesis formation (t=12m), and crew dispatch (t=20m). | 3.5 | 3.0 | 4.0 | 3.5 | 2.5 | **65.0** | None | **REJECTED.** High implementation effort; adds UI timeline complexity that cannot fit in a 3-minute video. |
| **C-09** | **Visible AEP Source Missingness & Resiliency Guard** *(Dir 9)* | Simulating an offline source file or null attribute, showing graceful degradation to safe `UNKNOWN` with actionable diagnostics instead of crashing. | 3.5 | 4.0 | 3.0 | 5.0 | 4.5 | **78.5** | None | **REJECTED.** Great engineering hygiene, but lacks the visual punch required for a hackathon WOW beat. |
| **C-10** | **Multi-Crew Integer Linear Programming Optimizer** *(Dir 10)* | Full mathematical optimizer scheduling 10 crews across 50 simulated damage points to minimize customer interruption minutes. | 4.0 | 2.5 | 3.0 | 2.0 | 1.5 | **52.5** | **VETO-COMPLEXITY** | **REJECTED & VETOED.** High algorithmic complexity; implies network switching beyond AEP challenge scope. |
| **C-11** | **Live Ambient Weather Radar Overlay** | Integrating real-time OpenWeather / NOAA Doppler radar tiles over the Feeder Map SVG canvas. | 2.5 | 1.5 | 4.0 | 3.0 | 3.0 | **54.5** | None | **REJECTED.** Commoditized fluff. KUBRA already does this; does not improve utility decision-making. |
| **C-12** | **Predictive Transformer Core Failure Neural Net** | Training an LSTM/Transformer model on synthetic vibration time-series to predict remaining useful life (RUL). | 3.0 | 2.0 | 3.0 | 1.0 | 1.5 | **41.0** | **VETO-FABRICATION** | **REJECTED & VETOED.** No real time-series training data in AEP challenge; ungrounded machine learning hallucination. |
| **C-13** | **Live Twilio / SendGrid Customer Alert Dispatcher** | Triggering real SMS and email dispatch to the presenter's mobile phone during scenario transitions. | 3.0 | 1.5 | 4.0 | 2.0 | 2.0 | **45.0** | **VETO-SCOPE** | **REJECTED & VETOED.** Out of scope. Requires paid API keys, network ingress/egress, and risks failed SMS during demo. |
| **C-14** | **Multi-Tenant Collaborative Dispatcher WebSocket** | Real-time multi-cursor collaboration allowing multiple dispatchers to edit crews simultaneously via WebSockets. | 3.0 | 2.5 | 3.5 | 2.5 | 1.5 | **47.5** | **VETO-COMPLEXITY** | **REJECTED & VETOED.** Massively exceeds hackathon scope; introduces crippling race conditions before deadline. |
| **C-15** | **Lineworker Safety & Fatigue Rule Validator** | Enforcing OSHA / union rules (e.g. maximum 16-hour shifts, mandatory 8-hour rest) on the restoration crew slider. | 3.5 | 4.0 | 3.0 | 4.5 | 4.0 | **76.0** | None | **REJECTED.** Interesting domain detail, but lower demo visual impact than top finalists. |
| **C-16** | **GIS Conductor Thermal Ampacity Sag Visualizer** | 3D rendering of overhead primary conductors sagging towards vegetation under elevated ambient temperature. | 3.5 | 3.0 | 4.5 | 2.0 | 1.5 | **53.0** | **VETO-COMPLEXITY** | **REJECTED.** Neara already specializes in this; impossible to implement reliably in Three.js in a few hours. |
| **C-17** | **Avoided Outage Cost & ICE Calculator** | Computing estimated avoided Interruption Cost Estimate (ICE) in dollars based on prevented hospital outages. | 3.5 | 2.5 | 3.5 | 3.0 | 4.0 | **65.0** | **VETO-FABRICATION** | **REJECTED.** Section 0 explicitly forbids calling hypothetical avoided costs "measured." |
| **C-18** | **Customer Solar + Battery Self-Healing Microgrid Sim** | Simulating islanded microgrid power sharing between adjacent homes with rooftop PV during a prolonged outage. | 4.0 | 3.0 | 4.0 | 2.5 | 2.0 | **60.5** | None | **REJECTED.** Speculative; requires microgrid switching hardware absent from residential AEP distribution. |

---

## 3. Adversarial Rejection Register: Why the Losers Lost

1. **Rejection of Commoditized Additions (C-11 Weather Radar, C-13 Live SMS):**
   - Adding a weather map overlay is the textbook rookie hackathon move. It looks pretty for 2 seconds but proves zero technical depth. KUBRA already does this natively. Live SMS invites demo disaster (carrier latency, failed delivery).
2. **Rejection of Speculative AI / Hardware (C-12 Predictive Neural Net, C-16 Conductor Sag):**
   - The AEP challenge did not provide continuous acoustic or thermal vibration training sets. Any trained neural network would be trained on fabricated synthetic numbers. AEP judges would immediately dismiss it as academic theater.
3. **Rejection of Architectural Over-Engineering (C-10 ILP Optimizer, C-14 Collaborative WebSockets):**
   - Attempting to install integer linear programming solvers or WebSockets hours before submission is engineering suicide. It risks introducing deadlocks, race conditions, and breaking the 117 currently passing tests.
4. **Rejection of Unsubstantiated Financial Claims (C-17 ICE Calculator):**
   - Calling hypothetical outage dollar savings "measured" directly violates the core owner directive in Section 0.

---

## 4. The Top-3 Shortlisted Finalists

The top three surviving candidates represent genuine, source-backed, highly visual differentiators that directly align with AEP's core operational needs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOP-3 FINALIST SHORTLIST                        │
├──────┬─────────────────────────────────────────────────┬───────────────┤
│ Rank │ Candidate Name                                  │ Weighted Score│
├──────┼─────────────────────────────────────────────────┼───────────────┤
│  #1  │ C-02: Counterfactual Incident Comparator        │   87.0 / 100  │
│  #2  │ C-05: Source-Lineage Labor Breakdown Modal      │   84.5 / 100  │
│  #3  │ C-01: Interactive Blast-Radius Topology Explorer│   82.0 / 100  │
└──────┴─────────────────────────────────────────────────┴───────────────┘
```

Detailed technical analysis and implementation recommendation for these finalists are provided in `research/DIFFERENTIATION_RECOMMENDATION.md`.
