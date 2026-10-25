# LoadShed Sentinel — Q&A briefing by presenter

Prepared October 25, 2026 for the app running at **http://localhost:3003**, source revision **4f1323f**. This is a learning/reference guide after submission, not extra three-minute narration. Presenter assignments follow your walkthrough, regardless of navigation-link order.

## Read this first: the team-wide answer

“LoadShed Sentinel is an explainable outage-planning prototype. It combines AEP-supplied customer-to-equipment dependencies with modeled incident evidence, a workbook-based repair estimate and household preparation tools. The operator and customer views describe the same selected incident. We expose assumptions and withhold conclusions when the evidence does not support them.”

| Presenter | Tab | Main responsibility | The question you should answer best |
| --- | --- | --- | --- |
| Person 1 | [Overview](http://localhost:3003/) | Problem, source data, dependency graph, scope and architecture | “What did you connect, and what is actually from AEP?” |
| Person 2 | [Prevention](http://localhost:3003/prevention) | Risk rule, contributing factors, uncertainty and evidence limits | “How do you get this risk label, and how much should we trust it?” |
| Person 3 | [Operator](http://localhost:3003/operator) | Diagnosis, twin, work package, labor, scheduling and restoration reasoning | “Why this repair/crew, why this duration, and who should come first?” |
| Person 4 | [Customer](http://localhost:3003/customer) | Household needs, usable battery runtime, communication and customer privacy | “How does a household turn this information into a useful plan?” |

These are presentation responsibilities. If asked what you personally built, describe your actual contribution; the page assignment does not establish authorship of every underlying module.

### Five facts everyone must keep straight

1. **Supplied topology is real challenge data; the outage is simulated.** An anonymized dependency path is not a live report that a home has lost power.
2. **This version uses deterministic rules and graph queries.** It does not call an LLM, train a neural network or demonstrate calibrated prediction accuracy. Describe it as explainable, rule-based decision support.
3. **117,549 accepted paths are offline coverage. Sixteen premises are the interactive sample.** Do not say the web demo monitors 117,549 homes.
4. **A planning duration is conditional, not a utility promise.** Person-hours, elapsed hours and a clock-time ETR are different quantities.
5. **No live dispatch, switching or messages occur.** Household needs are demonstration inputs, not enrollment for utility assistance.

### Version-specific corrections for this Q&A

Earlier script notes described a different integration on port 3002. For **3003**:

- Prevention shows **Read the outlook**, **Understand the drivers**, **Act in priority order**, and **Know the limits**. It does not have the earlier sensor-history replay or response-benefit calculator.
- Operator has a hospital-priority comparison under replacement planning, but its **3/6 person-hour workloads are illustrative**, separate from the workbook transformer job.
- There is no visible **Start modeled section demo** sequence on this Operator page. The backend has completion/authorization gates, and the scheduler supports dependencies; that is different from a delivered multi-section switching interface.
- **Compare demonstration scenarios** is a disclosure near the bottom of Operator, not the first panel at the top.
- A complete ARCOS broken-pole → phase/structure → hardware quantities → scheduled work package is not integrated. Explain that as remaining work if asked.

## Person 1 — Overview: problem, data and architecture

### Your explanation

“A household needs understandable answers, while an operator needs the equipment relationships and assumptions behind them. We connect those needs around one incident. AEP provides GIS data and ordered upstream paths. We turn validated paths into a dependency model, select a small public sample, simulate an incident, and use that same state for operator review and customer preparation.”

Point to the opening model, **Source ledger**, the four-stage method, the scenario cards, and the source/coverage disclosures. These explain the product; they are not evidence of installed hardware or a live utility connection.

### Understand the data flow

1. **Import and inspect:** GIS files contain positions and equipment/customer attributes. The upstream text supplies ordered relationships not established by positions alone.
2. **Join and validate:** Match customer/transformer/circuit references and check that a usable supplied path is consistent. An ambiguous or missing match stays unknown rather than becoming an invented link.
3. **Build dependencies:** Represent equipment as nodes and upstream relationships as directed edges. A reverse index answers which premise paths include a selected asset.
4. **Publish a bounded sample:** The demo bundle has sixteen anonymized premise paths and twelve equipment nodes. Public map points are generalized; links are schematic dependencies, not measured conductor segments.
5. **Simulate and project:** A selected scenario supplies modeled evidence. The backend generates an incident snapshot; the browser uses it for the audience-specific pages.

The code uses JSON and in-memory indexes, not a graph-database service. This prototype does not solve electrical power flow.

### Numbers you may quote accurately

| Number | What it means |
| --- | --- |
| 117,642 | Customer rows in the recorded source summary. |
| 117,599 | Distinct premise keys in the supplied upstream-text extract. |
| 117,549 | Accepted, matched paths in the recorded offline graph summary. |
| 32,600 | Equipment nodes in that graph, not customers. |
| 32,543 | Directed relational edges, not surveyed line spans. |
| 16 premises / 12 equipment nodes | The interactive public source sample. |
| 52 facility records | 5 hospital, 37 fire and 10 ambulance records associated through a spatial assumption; not necessarily deduplicated sites. |

These are recorded pipeline outputs and source counts, not a freshly measured deployment footprint. If someone notices **97 rejected** versus **93 unmatched customers**, the validation population includes four upstream-text keys absent from the customer table. The counts have different denominators.

### Jargon for your part

| Term | Meaning and accurate use |
| --- | --- |
| **GIS** | Geographic information system: positions plus attributes about real-world objects. Being nearby on a map does not prove an electrical connection. |
| **Shapefile** | A GIS dataset made of companion files. `.shp` holds geometry, `.dbf` attributes, `.shx` an index and `.prj` the coordinate-reference description. A ZIP is packaging, not the network model. |
| **Premise** | An anonymized service location, not necessarily one person or one household member. |
| **Topology / dependency graph** | Which equipment relationships a premise depends on. A graph node is an object; an edge represents a relationship. |
| **Upstream / downstream** | Toward supply / toward dependent loads. The drawn relationship is not a live current measurement. |
| **Join** | Matching records across datasets using identifiers or reviewed rules. A join can fail or remain ambiguous. |
| **Spatial association** | A relationship assumed from position. Here, facilities are assigned to the nearest geolocated transformer within the selected slice, without a maximum-distance cutoff. It is not verified service connectivity. |
| **CRS / reprojection** | A coordinate reference system says what coordinate numbers mean. Facility points are converted from Web Mercator to geographic coordinates before proximity comparison. |
| **Provenance / lineage** | Where a record came from and how an output was derived. Provenance describes origin, not whether a claim is certain. |
| **Anonymized / generalized** | Identifiers avoid direct identity; locations are coarsened. These measures reduce exposure but do not by themselves prove that re-identification is impossible or production security is complete. |

### Likely judge questions

**Why not connect everything just by nearest distance?** Spatial closeness can connect electrically unrelated objects. We prefer supplied dependency paths and validated identifier joins. Facility proximity is a separately labeled assumption.

**Why does the trace stop at a circuit breaker when the guide shows a substation?** The supplied accepted paths terminate at a breaker. A reported station label does not establish a complete physical path inside a substation, so we keep that upstream connection unknown.

**What is innovative?** The concrete design choice is to carry source dependencies, evidence limits and labor assumptions through to useful household preparation. The novel claim is the implemented combination and explanation, not invention of outage maps, battery arithmetic or graph theory. Repository competitor research is background; do not repeat unsupported claims that all commercial systems lack uncertainty handling.

**What would change at ten times the scale?** Larger validated coverage, persistent data storage, caching/indexing, reviewed joins, secure user/utility integration and performance measurements. Processing a large extract offline is not a latency or concurrent-user benchmark.

**What data did you not fully connect?** ARCOS damage-to-pole matching, representative structure bills of materials and conductor/phase-specific repair quantities are not an end-to-end active work-package path. Do not claim every supplied GIS layer became a validated electrical connection.

**Rubric connection:** Innovation needs research plus the chosen alternative; breadth needs connections across engineering, geospatial analysis and human communication. Communication is showing the source boundary clearly. Impact is the intended useful decision, not an unmeasured saving.

## Person 2 — Prevention: risk, evidence and uncertainty

### Your explanation

“Our Prevention page exposes a transparent screening rule. Four declared inputs contribute points to a LOW, MODERATE or HIGH risk band. We show the input values and each contribution so the result is inspectable. This is a prototype scenario rule, not a measured chance of outage or a validated weather forecast. Missing or conflicting evidence can produce UNKNOWN instead of a confident label.”

Stay on **Read the outlook**, **Understand the drivers**, **Act in priority order**, then **Know the limits**. Changing the top scenario changes its declared inputs and state; these inputs are not live sensor measurements or editable storm sliders on this page.

### Know exactly how the score works

Each factor contributes its highest applicable score, from zero to two. The rules are design assumptions rather than calibrated utility thresholds.

| Input | One point | Two points |
| --- | --- | --- |
| Wind | At least 35 km/h | At least 65 km/h |
| Ambient temperature | At most 0°C or at least 35°C | At most −15°C or at least 40°C |
| Transformer load factor | At least 0.85 of rating | At least 1.10 of rating |
| Health index | At most 70 | At most 40 |

**Total:** 0–2 LOW; 3–5 MODERATE; 6–8 HIGH. All four valid inputs are required. Health index runs from zero, worst, to 100, best.

- Local/upstream defaults: wind 70, ambient 35, load 0.95, health 80 → **2 + 1 + 1 + 0 = 4**, MODERATE.
- Replacement defaults: wind 70, ambient 35, load 1.15, health 35 → **2 + 1 + 2 + 2 = 7**, HIGH.
- Contradictory telemetry → UNKNOWN, with the risk result withheld.

The declared incident status and forecast screening are separate decisions. An outage may be simulated while the contextual score is MODERATE. A HIGH score is not a confirmed outage.

### Jargon for your part

| Term | Meaning and accurate use |
| --- | --- |
| **Risk band** | An ordered screening category. HIGH means more points under this rule, not a particular percentage chance of losing power. |
| **Driver / feature** | An input influencing a result. A driver can be an assumed scenario value; the term does not prove it was measured. |
| **Load factor** | In this implementation, load relative to the transformer's rating. 1.15 means a declared 115% of rating. It is not a measurement from the selected GIS transformer. |
| **Health index** | A scenario condition score, not a medical-style diagnosis or independently verified sensor metric. |
| **Calibration** | Checking whether predicted probabilities agree with observed frequencies. We have not done this, and the point score is not a probability. |
| **Validation** | Testing suitability against evidence independent of the assumptions used to construct the model. Passing arithmetic tests does not validate outage prediction accuracy. |
| **Abstention** | Declining to produce a reliable conclusion when information is missing or conflicting. UNKNOWN does not mean safe, healthy or normal. |
| **Rule-based reasoning** | Explicit programmed conditions and calculations. It differs from training a model on labeled examples. |
| **Explainability** | Showing inputs, logic, assumptions and limits so a person can understand the answer. It does not guarantee the underlying rule is accurate. |
| **Condition monitoring / preventive maintenance** | Monitoring changes / acting before failure. The 3003 page motivates this workflow but does not demonstrate the earlier 3002 sensor-history monitoring engine. |

### Likely judge questions

**Where is the AI?** This build uses explainable rule-based reasoning to screen risk and rank incident explanations, plus graph dependencies and calculations. It does not call a language model or train a neural network. Do not invent an LLM, training dataset or accuracy percentage to make the answer sound more advanced.

**Why those thresholds?** They are declared prototype assumptions that make the demonstration reproducible. Deployment would require domain review and validation using historical weather, equipment exposure and outage outcomes.

**What would you measure next?** Define a prediction horizon, collect labeled outage/non-outage examples, split evaluation by time/event to avoid leakage, compare against a simple baseline, and assess false alarms, missed outages and calibration. These are proposed validation steps, not work already completed.

**Why does “Supplied source evidence” sometimes show zero?** That count covers incident evidence records. The dependency graph still comes from AEP, while current sensor readings/status may be entirely modeled or declared by the scenario. The count is not overall data coverage or confidence.

**Can you predict that a transformer will fail tomorrow?** No. We demonstrate an explainable scenario risk label. Failure timing and predictive accuracy are unvalidated.

**What do you do when evidence is unusable?** Preserve UNKNOWN/UNDER_REVIEW, explain what needs verification, avoid a fabricated numeric estimate and route attention to qualified assessment.

**Rubric connection:** Curiosity is a specific question followed by investigation. Explain the question “Which evidence is enough to support a conclusion?” and the contrast/abstention cases used to explore it. Innovation requires analyzing alternatives, not just naming a scoring formula. Communication includes making uncertainty readable.

## Person 3 — Operator: diagnosis, labor and restoration reasoning

### Your explanation

“The Operator tab separates evidence from a repair decision. An open cutout supports local protective-device operation; it does not by itself prove a destroyed transformer. Upstream interruption calls for a different investigation. Replacement is only packaged when the scenario explicitly supplies appropriate confirmation. We then trace dependent premises and show the labor source, crew/access assumptions and a conditional planning range. Crew recommendations remain review-only.”

The current page order starts with **Diagnosis & uncertainty**, then **Modeled telemetry**, **Review-only work package**, **Supply path** and **Feeder context**. **Compare demonstration scenarios** is near the bottom. Use the top **Scenario** control for the four cases.

### Know the four cases

| Scenario | Local cutout | Default sample dependents | What the model supports |
| --- | --- | --- | --- |
| Local Transformer Protection | OPEN | 3 | Protection operated; internal transformer condition remains unconfirmed. No selected sourced repair duration. |
| Upstream Breaker Interruption | CLOSED | 16 | Investigate upstream protection/feeder evidence; local replacement is not justified. No selected sourced repair duration. |
| Transformer Replacement | OPEN | 3 | Scenario-confirmed transformer damage enables a declared 25-kVA replacement component package and estimate. |
| Contradictory Telemetry | UNKNOWN | Not asserted | UNDER_REVIEW, UNKNOWN risk, unavailable numeric restoration estimate. Empty affected list is abstention, not proof of zero impact. |

The footprint comes from source paths; the fault evidence is modeled. “Field confirmed” on a scenario record is confirmation supplied by the demonstration, not an AEP crew visit. A relative hypothesis score of 14 means weighted support under programmed rules, not 14%, 100% confidence or a statistical causal estimate.

### Be able to explain the labor arithmetic without reading code

The selected package is **one declared 25-kVA transformer construction unit**, replaced using installation plus removal category-average labor:

`(install C21 + remove D21) × quantity × 4.5 = 8.973957 person-hours`

The workbook sheet is **Labor time material related**. Installation is approximately 1.188085 direct hours; removal is approximately 0.806128. Their sum is about 1.994213. The single 4.5 factor gives total labor effort under the supplied guide. The selected asset's 25-kVA rating is a scenario assumption, not an independently verified GIS attribute.

For the one-job default, ignoring any additional queue/energization delay:

`expected elapsed hours = 8.973957 / crew size + access delay`

| Crew / access | Lower | Expected | Upper |
| --- | --- | --- | --- |
| 3 workers / 0 h | 2.24 h | 2.99 h | 4.49 h |
| 6 workers / 0 h | 1.12 h | 1.50 h | 2.24 h |
| 6 workers / 2 h | 3.12 h | 3.50 h | 4.24 h |

Lower/upper default factors are **0.75 / 1.50** on modeled task duration; expected uses **1.00**. These are planning variations, not measured prediction intervals or statistical quantiles. The access delay is additional, non-overlapping elapsed delay; do not add the travel/setup/safety allowance again after 4.5.

More workers divide modeled labor in this simple component example. Real work may not parallelize perfectly because of tasks, skills, vehicles, site limits and safety sequencing. The estimate excludes unselected assessment/associated hardware scope and is not a complete outage-restoration commitment.

### Keep the priority comparison separate

Port 3003's **Critical facility priority comparison** uses assumed hospital work of **3 person-hours** and routine work of **6 person-hours**, sharing one crew. They are not the workbook transformer repair tasks.

At three workers/zero access, hospital-first finishes the hospital task at **1 hour**; routine-first at **3 hours**. Both finish all illustrative work at **3 hours**. Reordering changes who benefits first, not total effort. Facility association counts do not establish customer counts or verified hospital service. Say **conditional completion of an assumed hospital-associated task**, not a verified hospital re-energization.

The general scheduler respects task prerequisites and exclusive crew IDs, then prioritizes ready work by criticality and customer count. It is a transparent heuristic, not a mathematically proven optimal dispatch schedule. There is no network switching-feasibility solver.

### Jargon for your part

| Term | Meaning and accurate use |
| --- | --- |
| **Transformer** | Equipment changing AC voltage levels. A distribution transformer connects primary distribution voltage to lower-voltage customer service. |
| **Primary / secondary conductor** | Higher-voltage distribution wiring / lower-voltage wiring toward customers. The guide's 15 kV is voltage, not power. Our schematic links are not verified physical conductor spans. |
| **Phase** | One of the AC waveforms in a distribution arrangement. Single-/three-phase structure and component quantities can differ. Phase count alone does not determine a full material list. |
| **kVA** | Kilovolt-amperes, apparent power rating. A 25-kVA transformer is not a 25-kW household load; real power also depends on power factor. |
| **Cutout / fuse** | Protective assembly / sacrificial overcurrent element. A dropped/open fuse door indicates protection state, not complete internal-transformer condition or proof that work is safe. |
| **Recloser / breaker / lockout** | Interrupting protection that can retry / circuit interruption protection / a state remaining open after its retry/control sequence. Exact source operation must be verified, not inferred from an animation. |
| **Digital twin / telemetry** | Here, a modeled equipment visualization tied to scenario state / simulated reported condition inputs. This is not a continuously synchronized physical asset with installed sensors. |
| **Construction unit / work package** | A defined unit of material/work with a labor basis / the reviewed tasks, capabilities, materials and assumptions. A bank is not automatically one component unit. |
| **Person-hour / elapsed hour / ETR** | One person's labor for an hour / wall-clock duration / estimated restoration time. Nine person-hours may occupy three workers for roughly three hours; that does not establish a clock-time restoration promise. |
| **Dependency / DAG / heuristic** | A prerequisite / an acyclic directed task graph / an explicit practical priority rule. Cycles or unknown prerequisites cannot be silently scheduled. |
| **Sectionalizing / step restoration** | Isolating a damaged part so other parts can be released earlier. Operational feasibility, clearance and authorization must still be established. |
| **Counterfactual comparator** | In this UI, contrasting modeled scenarios. It is not an experimentally identified causal effect or demonstrated avoided-cost measurement. |

### Likely judge questions

**Does an open cutout mean the transformer blew?** No. It supports protection operation. Different causes and unknown internal condition remain possible; the replacement case supplies separate confirmation.

**Did you use the structure drawings to replace the pole and all its hardware?** Not in the active end-to-end scenario. The mapper can identify a pole component category, but it marks associated structure quantities incomplete. A complete broken-pole job needs reviewed crossarm, insulator, pin, grounding and related quantities before totaling the workbook labor.

**Why can't 2.99 hours be the promised ETR?** It is a component planning duration under a declared crew/rating and scope. Actual assessment, access, network release, additional damage and utility confirmation can change the result.

**What would you restore first with scarce crews?** Start with feasible tasks, respect dependencies and crew exclusivity, and compare customer benefit/criticality. Our heuristic favors critical facility categories, then customer count, but does not prove optimality. The small illustration demonstrates the tradeoff; it is not a validated switching plan.

**Did you implement step restoration?** The engine supports prerequisite/crew scheduling and completion-plus-authorization gates. The 3003 UI does not expose the earlier 3002 multi-section sequence. Explain the dependency/isolation principle, the actual priority example and the remaining network/section integration separately.

**Could you compare two days, three days and a week?** That is a useful extension with explicit damage totals, work shifts, crews and dependencies. This submitted runtime demonstrates component-hour sensitivity, not a validated multi-day storm-wide schedule.

**What did testing change?** The implementation rejects ambiguous bank counts and unsupported quantity denominators instead of inventing labor. An unspecified conductor length cannot silently become a count of construction units. Point to the mapper checks if asked for evidence.

**Rubric connection:** This part demonstrates engineering beyond computing, inspectable calculations, contrasts/negative cases and a concrete correction after failure. It also addresses AEP's questions about damage, dependencies and work, while explaining the limits of priority and timing evidence.

## Person 4 — Customer: household planning, messages and shared state

### Your explanation

“The Customer page translates the selected incident into service status, a restoration outlook and practical household tools. People declare their needs; we do not infer a medical condition. Guidance responds to those choices, and the battery planner combines usable stored energy with the power of devices running together. Notification previews explain the event lifecycle. The page communicates known and unverified information without pretending to confirm service at the actual home.”

Use **Your service status**, **Your household priorities / Your next steps**, **How long could your battery last?**, **Updates & notification preview**, and **About this demonstration & home connection lookup**. What you see depends on the selected scenario. Do not promise restored status if the active scenario remains OUTAGE.

### Know the battery example

**W** is power: the rate at which a device uses energy. **Wh** is energy: how much is stored or used over time. A 120-W continuous load uses 120 Wh in one hour. Do not say “watts per hour” for the device's power draw.

Default assumptions: **1000 Wh capacity**, **85% usable energy**, **120 W combined load**, **85% conversion efficiency**, then **15% runtime reserve**.

1. Usable energy: `1000 × 0.85 = 850 Wh`.
2. Battery-side load including losses: `120 / 0.85 = 141.18 W`.
3. Theoretical constant-load runtime: `850 / 141.18 = 6.02 h`.
4. Conservative planning runtime: `6.02 × 0.85 = 5.12 h`, displayed about **5.1 hours**.

Doubling capacity to 2000 Wh gives about **10.24 h** at the same assumed load. Doubling the load approximately halves runtime. The three 0.85-related values mean different things: usable capacity, conversion efficiency, and the remaining fraction after a 15% reserve.

Battery age, temperature, starting surges and changing/cycling loads can change performance. The number is a planning calculation, not guaranteed endurance for a medical device. The separate **41-Wh / 25-W** equipment node on Operator is a different energy model.

### Understand communication and state

The backend handles four message categories: **PRE_STORM**, **OUTAGE_CONFIRMED**, **ESTIMATE_UPDATED**, **RESTORATION_COMPLETE**. Rules determine when each preview applies; duplicate-event keys prevent repeating the same modeled message. The deduplication state is held in memory and is not a production delivery receipt or durable messaging service.

- Pre-storm previews apply to elevated risk while service is NORMAL/AT_RISK.
- Confirmed-outage previews require OUTAGE, not UNDER_REVIEW.
- Estimate-update previews require an outage and a nonempty changed summary.
- Restoration-complete previews require RESTORED.

Eligibility is separately described in the backend alert plan; UNKNOWN/UNDER_REVIEW must not be converted into a confirmed-outage message. The current customer layout emphasizes **When a preview appears**, **Escalation preview**, and message history; it does not display every alert-plan field as a separate eligibility card. No real SMS, push or emergency-service integration is connected.

### Jargon for your part

| Term | Meaning and accurate use |
| --- | --- |
| **Usable fraction** | The share of rated stored energy included in the calculation. It is different from conversion loss or a reserve. |
| **Inverter efficiency** | How much battery input power becomes useful AC output power. Lower efficiency means more battery power is needed for the same device load. |
| **Reserve margin** | A deliberate planning reduction, here 15% of calculated runtime. It is not proof of a particular battery manufacturer's state-of-charge limit. |
| **Finite-state machine / event rules** | Conditions that decide which lifecycle message can appear. A label in code is not actual SMS delivery. |
| **Deduplication** | Avoiding repeated copies of an already-triggered event/message. It is not a guarantee of globally exactly-once delivery. |
| **Snapshot / revision** | A structured incident state / its version number. A newer accepted state should be what each audience sees. |
| **Projection / allowlist** | Returning a customer-oriented subset / explicitly permitted fields. It reduces exposure of operator-only evidence; it is not a complete access-control system. |
| **Local storage / session storage** | Browser persistence for household choices / browser-session identity. Local guidance requests still go to the backend; do not claim no household data ever leaves the browser. |
| **Session isolation** | Separate demo incident state for different session IDs. An X-Session-ID is not user authentication or proof of utility authorization. |
| **Accessibility** | Making information and interaction usable for different needs and abilities. Need-based guidance, labels, keyboard controls and motion/fallback options are useful measures, not proof of a completed compliance audit. |

### Likely judge questions

**How are recommendations personalized?** The household explicitly selects needs such as medical equipment, mobility/accessibility, refrigerated medication or a sump pump. Those selections choose relevant guidance. This version does not automatically derive medical attributes or fully couple that guidance to incident risk and duration.

**How do the two pages stay consistent?** React shared incident state receives the backend's accepted snapshot. Incident ID, equipment and revision changes cause the customer projection to reload. Request sequence guards reduce stale responses overwriting newer selections. Browser storage retains household preferences separately from incident state.

**Does a mapped connection prove the home has power?** No. Lookup only finds the supplied dependency path. It neither measures voltage nor selects a complete new forecast for a different home.

**Can a customer depend on the displayed ETR for life-critical equipment?** No. It is conditional scenario planning, with uncertainty and unverified live service clearly identified. Do not turn the runtime calculation into a safety assurance.

**Is personal information protected?** The public sample uses anonymous tokens, excludes household coordinates and filters customer evidence fields. Preferences are saved in browser storage; local API calls process guidance inputs. A real deployment still needs authentication, authorization, consent/retention decisions, secure integrations and privacy review. Do not claim regulatory certification.

**What is the benefit if messages are simulated?** The prototype demonstrates who should receive a preview, which event triggers it and what it says. Delivery-provider integration and user consent remain deployment work.

**Rubric connection:** Explain a specific household need, show the corresponding working feature and connect it to plausible value. That supports Impact, Communication and cross-domain breadth. Do not invent interviews, usability results or measured health outcomes.

## How to answer the detailed judging rubric

The attached workbook's **Judging Rubric** worksheet has six criteria in **B5:G10**, each with 1–5 descriptors. Use the actual question, evidence and improvement rather than a list of technologies. The highest descriptor is a target for evidence, not a score we can award ourselves.

| Criterion | What judges need to hear | Team example and lead presenter |
| --- | --- | --- |
| Innovation | What existing approaches were researched, what weakness/opportunity was identified, and which alternative was explored. | Link repair explanation to household preparation; explain the tradeoff behind transparent rules. Person 1, supported by Persons 2/3. Avoid unsupported claims about what all competitors cannot do. |
| Curiosity | A knowledge gap, a question, a plan to explore it and action taken. | “Does an open cutout establish replacement?” Compare local/upstream/unknown cases and explain the result. Persons 2/3. |
| Communication | A working prototype's essential elements plus a clear visual explanation. | Select one incident, explain its source/rule/range, then show the corresponding customer tool. All four. |
| Project Breadth and Complexity | How ideas across science, engineering and human needs were synthesized, not just several programming libraries. | GIS dependencies + electrical protection + labor units/scheduling + privacy-aware household communication. Persons 1/3/4. |
| Impact | A detailed, justified, feasible concept with potential tangible value. | A household can budget backup power and understand why an estimate changes; an operator can inspect the package assumptions. Person 4, with Person 3. Field benefit remains unmeasured. |
| Navigating challenges | A real failure/limitation, alternatives considered, an implemented correction and why it improved the result. | Ambiguous bank units/unknown labor denominators now rejected, with regression assertions. Person 3. Describe individual contributions truthfully. |

A useful answer structure is **problem → design decision → concrete behavior → limit/next validation**. For example: “We could have displayed one unexplained time. We instead expose the workbook effort and crew/access inputs. Six workers plus two access hours changes the example to 3.50 hours. It remains a component scenario, so we still need complete damage and release conditions before a utility commitment.”

## AEP's four questions: the exact team answer

| AEP question | What 3003 demonstrates | Boundary to explain |
| --- | --- | --- |
| What is damaged? | Modeled evidence ranks possible causes; the replacement scenario declares confirmed transformer damage. | No live ARCOS damage feed or installed diagnostic sensor proves physical damage. An open cutout alone is insufficient. |
| Which customers depend on it? | Source-path footprint, premise trace and upstream/local sample differences. | Selected sample only; GIS proximity does not prove a dependency. Physical station connection remains unknown beyond the breaker. |
| What work is required to repair/isolate it? | Reviewed capabilities/material categories and a workbook-sourced transformer component effort. | Associated hardware, exact pole/phase structure and full ARCOS-to-material mapping remain incomplete. No safe switching order is established. |
| What should be restored first and how long? | A crew/dependency-aware scheduling function, an illustrative criticality comparison and conditional crew/access range. | No optimal dispatch proof, verified facility service, full sectionalizing solver or validated multi-day storm-wide plan. |

The AEP guide permits simulated damage, approximate topology and explicit spatial/crew assumptions. It does not require production power-flow modeling. Its emphasis is a defensible connection with clear assumptions; acknowledging a missing join is more credible than saying every source is fully integrated.

## The implementation stack in plain English

| Technology | What it does here | What it does not establish |
| --- | --- | --- |
| React + TypeScript | Composable browser interface, shared incident context and typed data contracts. | Type checking is not runtime validation or proof of engineering accuracy. |
| Vite | Local frontend server and production asset bundling; proxies API calls in the launch configuration. | It is not the outage model or database. |
| Three.js + React Three Fiber + drei | WebGL-based procedural pole/equipment scene, React scene integration and reusable controls/helpers. | Not a surveyed CAD/BIM model, physical sensor system or power-flow simulation. |
| SVG | Scalable diagrams/maps for schematic dependency relationships. | An arrow does not measure current, line length or energization. |
| CSS/design tokens, fonts and Lenis | Consistent page styling/typography and motion/scroll behavior. | More animation is not more decision evidence. |
| Python + FastAPI + Uvicorn | Backend reasoning/calculations, HTTP API and server process. | No external utility command or SMS integration is implied. |
| Pydantic | Validates structured request/response fields and types, alongside explicit semantic checks. | A valid shape does not prove the input is physically true. |
| JSON + in-memory graph/session indexes | Small runtime sample, source metadata, dependency queries and demo state. | Not a deployed graph database, durable event store or authenticated production service. |
| pytest / frontend checks | Reproducible checks for rules, units, APIs and component behavior. | Passing a build/test does not demonstrate predictive accuracy, field endurance or every browser interaction. Quote a test total only with its exact revision/environment. |

## Last-minute team drill

Each person should answer their main question in thirty seconds, define three terms from their section, show one working example and name one meaningful limit. Then rehearse these cross-team questions:

1. **What is actually from AEP?** Source paths/GIS context and the labor reference; current fault/sensor/risk conditions are declared or modeled.
2. **Where is the trained AI?** There is no trained predictive/LLM service in this build; the reasoning is explicit rules plus graph queries/calculations.
3. **Why can the two restoration times differ?** Identify whether you mean component estimate, priority illustration, household runtime or an older 3002 example; they have different workloads and meanings.
4. **What failed and changed?** Explain the units/count guard and the regression evidence, without inventing mentor feedback.
5. **What would you validate next?** Outcome-based risk evaluation, actual damage-to-work mappings, reviewed network isolation/facility service, real user testing and secure integration.

If you do not know an implementation detail, say what the prototype demonstrably does and direct the deeper part to the teammate responsible. Do not improvise accuracy, interviews, cost savings, live data or a completed integration.

## Sources and evidence pointers

- User-supplied **OHIO Judging Rubric.xlsx**, **Judging Rubric!B5:G10**; other tabs include rubric-development alternatives.
- [Official AEP challenge repository](https://github.com/hackohio/aep_challenge_hack26/tree/main) and [challenge brief](https://drive.google.com/file/d/1vszxOsGvqV9KLIEYQS9sIz0kjfU2tUvD/preview), plus the supplied AEP Data Guide. The guide is technical guidance, not a second published numerical scoring table.
- Source/runtime: [graph summary](../data/processed/graph_summary.json), [AEP sample adapter](../engine/aep_impact.py), [topology/facility assumptions](../engine/topology.py), [graph builder](../pipeline/build_graph.py).
- Risk/diagnosis: [risk rule](../engine/outage_risk.py), [evidence ranking](../engine/diagnosis.py), [crew recommendation](../engine/crew.py), [scenario generation](../engine/scenarios.py).
- Work/energy: [workbook reader and mapper](../pipeline/import_labor.py), [restoration and scheduling](../engine/restoration.py), [sensor energy model](../engine/energy.py), [labor/unit regression assertions](../tests/test_engine.py).
- Customer/integration: [customer calculations, event rules and projection](../engine/customer.py), [API/state validation](../api/main.py), [shared browser incident context](../web/src/app/incident.tsx), [Prevention page](../web/src/pages/PreventionPage.tsx), [customer dashboard](../web/src/components/customer/CustomerDashboard.tsx).
- Verification for this guide: inspected the actual Prevention and Operator pages on port 3003, read source at 4f1323f and ran in-process four-scenario/labor/priority/battery probes. No claim of a fresh complete test-suite run, prediction validation, field test or knowledge of the submitted video beyond the user's report is made.
