# Time savings: evidence, counterfactuals and validation

Evidence review: October 24, 2026, against implementation base `0652aaa`. This document distinguishes an observed result, a published analogue and an editable scenario. The preventive and time-benefit models being added to the prototype do not turn hypothetical inputs into measured outcomes.

## What can be substantiated now

There is credible primary evidence that better fault information can shorten parts of outage response and that some equipment problems have detectable precursors. There is **no local evidence establishing an average 8–10 hours saved by LoadShed Sentinel**. The supplied AEP extract lacks the timestamps and dispatch outcomes needed to measure that claim.

The prototype can demonstrate the mechanism quantitatively: compare the same repair job with and without an assumed triage delay or repeat dispatch, expose every changed input, and calculate the resulting difference. That is a modeled counterfactual, not a field result. A preventive alert can likewise demonstrate earlier recognition of a modeled anomaly; it cannot establish that an outage was prevented.

| Evidence level | What belongs here | What it establishes |
|---|---|---|
| Local observed facts | Source schemas, checked aggregate counts, actual supplied relationships, workbook cells, executed calculations | Inputs exist and arithmetic/path calculations are reproducible |
| External operational evidence | Utility pilot reports with their original methods and limitations | Similar information/monitoring mechanisms have been useful elsewhere |
| Simulated counterfactual | Explicit baseline and assisted workflows over the same assumed incident | Conditional modeled benefit under the displayed assumptions |
| Unvalidated product claim | “Sentinel saves 8–10 hours”, “predicts the failure date”, “prevents X% of outages” | Nothing measured in this project yet; these remain evaluation targets |

## Primary evidence relevant to the mechanism

### Fault information and response time: a useful, qualified analogue

PG&E's December 2016 line-sensor pilot report analyzed **25 actual sustained mainline outages** from the 2015–2016 storm season. It attributed approximately **610,000 of 4.85 million customer-minutes, or 12.6%**, to savings achieved **or potentially achievable** with sensor information; it also reported **12.2% fewer patrol minutes**. Operators' retrospective reconstruction considered narrowed patrol zones and earlier partial restoration through switching. This is operational evidence plus counterfactual judgment, not a randomized causal estimate. Its electrical sensors, utility systems and switching capability differ from Sentinel's proposed pod. Do not convert these percentages to Sentinel hours or treat all benefits as measured repair-time reductions. See report sections 4.1.1 and 5.4.2, printed pages 25 and 40. [PG&E Advice 4990-E, Line Sensors Final Report](https://www.pge.com/assets/rates/tariffs/assets/pdf/adviceletter/ELEC_4990-E.pdf#page=57).

### Prevention: detected precursors, not a universal countdown

PG&E's EPIC 2.34 project tested RF and electrical monitoring and documented detected/located defects, including conductor damage, vegetation interactions, a transformer discharge condition and a loose clamp. Inspections and corrective work supported several cases; not every detected condition was repaired or independently confirmed. The report also records missed events, data gaps and practical limits. It supports the feasibility of precursor-informed inspection, **not** Sentinel sensor accuracy, a guaranteed warning horizon, or quantified avoided outage hours. See sections 4.2.8 and 4.3. [PG&E EPIC 2.34 final report, 2020](https://www.pge.com/assets/pge/docs/about/corporate-responsibility-and-sustainability/PGE-EPIC-Project-2.34.pdf#page=31).

Texas A&M's research describes repetitive and progressive electrical pre-failure activity that can precede some failures, while explicitly distinguishing unpredictable one-time events. This supports separate preventive-condition and sudden-event workflows. It supplies neither a universal lead time nor a calibrated model for this pod's temperature/acoustic/vibration inputs. [Texas A&M Engineering Experiment Station: intelligent powerline monitoring](https://wildfiremitigation.tees.tamus.edu/faqs/monitoring-to-mitigate-wildfire-risk).

### Keep automated switching benefits separate

DOE's 2014 FLISR study examined 266 operations and estimated avoided interruptions/customer-minutes relative to a no-FLISR counterfactual. FLISR combines fault information with isolation and service-restoration capabilities. Sentinel does not remotely switch equipment, so FLISR results cannot be booked as Sentinel benefits. Detection latency, patrol time, time to first partial restoration and time to final repair are different endpoints. [DOE: Fault Location, Isolation, and Service Restoration Technologies](https://www.energy.gov/documents/b5draftreport-12-18-2014pdf-1).

## What the actual AEP extract can measure

A read-only pass through `Data1.zip/arcos_prod_damage_09_28_Clip.dbf` using `pipeline.inspect_assets.dbf_header` and `dbf_records` found:

| Check | Result | Consequence |
|---|---|---|
| Active damage rows | 1,659 | Historical damage records, not necessarily 1,659 independent incidents |
| `Report_Tim` | DBF `D`, width 8; all 1,659 values are calendar dates, no time of day | Cannot time detection, first report or response in minutes/hours |
| `Repaired_D` | DBF `D`, width 8; all 1,659 values are calendar dates, no time of day | Cannot infer actual restoration instant or repair elapsed hours |
| Report-date span | 2022-10-01 to 2026-08-18 | Historical context, not live telemetry |
| Repair-date span | 2022-10-01 to 2026-09-04 | Administrative repair dates can differ from service-restoration dates |
| Report and repair on same calendar date | 500 rows | Same day does **not** mean zero hours |
| `Outage_Num`, `Incident_W` | Numerically zero in every row | No usable incident grouping through these fields |
| `Event` | `Default` in every row | Cannot identify independent storms from this field |
| `TASK_Crew`, `TASK_Job_I` | Blank in all rows | No original crew assignment or job/dispatch linkage |
| Dispatch/arrival/repeat-trip/re-energization timestamps | No such columns | No direct estimate of misdispatch rate, repeat-trip delay or restored customer-minutes |

No personal names, raw household identifiers or coordinates were exported by this check. Full column names and source archive hashes are recorded in [data_inventory.md](data_inventory.md). A day difference may describe an administrative interval; labeling it an hourly outage target would introduce false precision and a different endpoint.

The GIS/upstream records support dependency tracing, not observed incident restoration chronology. Offline validation accepted 117,549 premise paths; the shipped interactive sample contains 16 premises. Do not extrapolate the sample's modeled customer-minutes to the entire extract or service territory.

The labor workbook supports work-effort scenarios. `Indirect Labor Multiplier!B1` is 4.5; A3 names indirect categories including drive time, safety and setup. [source_ledger.md](source_ledger.md) preserves the supplied printed Data Guide's person-hour interpretation. The guide photos are not present in this checkout, so this review independently checked the workbook/source code rather than claiming to reread those photos. Person-hours divided by assumed qualified staffing are not measured restoration time. Do not add drive/setup allowances already included in a 4.5-adjusted workload a second time.

## Counterfactual model specification

Compare **identical incident scope and repair requirements**. Change only information-dependent activities. Declare whether each input is measured locally, adopted from a specific external population, or assumed. Published analogue percentages should not be silent defaults.

An elapsed-time decomposition can include detection/notification delay, assessment/patrol, dispatch/queue, travel, additional specialist mobilization, repair, and re-energization. Use a dependency graph or explicitly sequential assumptions; concurrent tasks cannot simply be summed. Keep repair duration and shared indirect allowances identical unless a separately justified intervention changes them.

For the narrow repeat-dispatch mechanism:

```text
expected repeat-dispatch delay avoided = (p_baseline - p_assisted) × extra_delay_if_wrong
net expected time benefit = repeat-dispatch delay avoided
                          + other non-overlapping delay reductions
                          - extra analysis/verification overhead
```

`p_baseline` and `p_assisted` are **assumed scenario rates** until measured against independent adjudicated outcomes. A diagnostic rule score is not either probability. Return unavailable if required inputs are missing; allow zero and negative net benefit. Keep each input and the changed duration visible.

For example, the blueprint's explicitly hypothetical inputs `(0.20 - 0.10) × 8 hours` produce **0.8 expected hours per relevant incident**, before analysis overhead. Eight hours is the assumed penalty *conditional on a wrong initial package*, not average benefit. A chosen case with one avoided nine-hour remobilization can show nine hours in that case; it does not prove nine hours across incidents. These are auditable arithmetic examples, not empirical results or recommended default rates.

Report separate outcomes:

- Earliest recognized precursor and alert lead time in a labeled replay; this measures warning, not prevented outage duration.
- Elapsed response/planning difference for the same assumed job.
- Conditional avoided repeat-trip delay versus expected delay across incidents.
- Customer-minutes from per-premise interruption intervals and unioned/staged dependencies; do not double-count overlapping faults.
- Extra assessment workload, false alarms and cases where the assisted workflow is slower.

Do not call a simulated threshold crossing a confirmed defect. “No observed failure after intervention” alone also cannot establish that failure was inevitable or that the intervention prevented it.

## A field evaluation that could prove a narrower savings claim

1. **Define the endpoint before looking at outcomes.** Suitable primary endpoints include time from confirmed incident onset to correct work-package decision, first qualified crew arrival, unnecessary repeat dispatches, and final/partial service restoration. Report preventive maintenance outcomes separately.
2. **Collect an incident-linked timeline.** Required fields are listed below. Log every model/advisory revision before the corresponding decision and retain operator acceptance/rejection. Otherwise hindsight can leak into apparent performance.
3. **Start with prospective shadow mode.** Freeze the model, run it without changing dispatch, and have reviewers who did not author it adjudicate fault class, necessary capabilities, actual defects and actionable lead time. Include ordinary/no-failure periods to count false alerts.
4. **Evaluate operational effect with a comparator.** Where utility-approved, randomize release of supplemental advisories or use a stepped rollout. Otherwise compare well-matched feeder/incident groups with pre/post trends and explicitly retain confounding limits. Do not withhold required safety information.
5. **Separate mechanisms.** Stratify storm/non-storm, local/upstream, asset class, access constraints, crew availability and communications health. Attribute switching, prepositioning, patrol reduction and repeat-trip avoidance separately.
6. **Report uncertainty and full costs.** Give incident counts, event-level distributions and confidence intervals with clustering by storm/feeder as appropriate; include zero/negative outcomes, missed defects, operator effort, equipment/integration cost and model failures. An 8–10-hour claim requires the observed difference and its applicable population, not a selected example.

| Data needed | Why |
|---|---|
| Stable anonymized incident, asset, premise and storm IDs; topology version | Link the right event and prevent duplicate/overlapping counts |
| Timezone-aware onset, first report, sensor acquisition, gateway receipt, advisory and decision timestamps | Separate sensing, communications and decision latency |
| Initial crew capabilities/material package, crew availability, dispatch/arrival/assessment times | Measure initial response and whether it was appropriate |
| Independent confirmed defect, required work/materials, first and repeat dispatch reasons | Ground-truth mismatch and remobilization instead of inferring them from model agreement |
| Access, travel, switching/clearance, repair start/end and re-energization events | Reconstruct dependencies and distinguish repair from restoration |
| Per-premise outage/restore timestamps and affected-set revisions | Compute real customer-minutes and partial restoration |
| Healthy baseline, calibrated sensor records, weather/load, telemetry quality and inspection outcomes | Evaluate prevention lead time and false alerts without post-outcome leakage |
| Treatment/comparator assignment and operator use; costs and extra work | Estimate attributable operational benefit and net value |

## Claim wording for the prototype

**Supported:** “We calculate a source-connected affected set and an editable baseline-versus-assisted response scenario. The displayed time difference follows the assumptions shown. Published utility pilots support the value of better fault information, while our own time savings remain to be measured.”

**After the preventive model is connected and checked:** “The demo detects persistent departures from a modeled healthy baseline and recommends utility review before a declared incident. The alert is an inspection priority, not a calibrated failure probability or exact failure date.”

**Not supported by this evidence:** “The AEP extract proves we save 8–10 hours,” “the studies validate our pod,” or “every avoided patrol minute is an outage minute saved.” See [preventive_sources.md](preventive_sources.md) for feature/source boundaries.
