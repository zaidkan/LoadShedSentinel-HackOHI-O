# Preventive modeling: sources and feature boundaries

Reviewed October 24, 2026. This is the research basis for a transparent condition-screening demonstration, not certification of sensor thresholds, diagnostic accuracy or a failure countdown. The time-benefit evidence and AEP label-capacity audit are in [time_savings_evidence.md](time_savings_evidence.md).

## What the primary references actually support

| Primary source | Relevant support | Boundary for this prototype |
|---|---|---|
| [ABB TRAFCOM transformer condition monitoring](https://electrification.us.abb.com/products/grid-automation/transformer-condition-monitoring-trafcom) | Commercial monitoring combines ambient/surface temperature, magnetic field, vibration and acoustic partial-discharge sensing. | Supports feasibility of sensor modalities. It provides no independently evaluated accuracy or warning-time result for our hardware or rules. |
| [PNNL-27602: Fault Intelligence, 2017](https://www.pnnl.gov/sites/default/files/gridarch/white-papers/FaultIntelligence_PNNL.pdf) | Defines fault classes, distinct data requirements and opportunities to combine measurements across sensors/locations. | Taxonomy and architecture guidance, not training labels or calibration for surface-temperature/acoustic pod measurements; no measured Sentinel time savings. |
| [EPRI 1024195: Application Guide for Emerging Condition-Monitoring Techniques for Transformers, 2012](https://restservice.epri.com/publicdownload/000000000001024195/0/Product) | Acoustic interpretation can benefit from logging load, tank temperature and cooling-equipment state alongside signals; see section 4, printed page 4-2. | Supports contextual interpretation rather than treating any acoustic event as damage. It does not establish our thresholds or a universal failure lead time. |
| [EPRI 1015888: Underground Distribution Sensors, 2009](https://restservice.epri.com/publicdownload/000000000001015888/0/Product) | Its transformer vibration discussion recommends asset-specific baseline comparison; see printed page 2-11. | A baseline/trending rationale. Do not transplant a baseline or threshold across transformer designs, mountings and operating conditions without checking it. |
| [PG&E EPIC 2.34 final report, 2020](https://www.pge.com/assets/pge/docs/about/corporate-responsibility-and-sustainability/PGE-EPIC-Project-2.34.pdf) | Its field examples motivate persistent/multimodal inspection prioritization. Reported complications include intermittent signals, data gaps, difficult location and missed observations. | Electrical/RF field results are not measurements from our pod. An anomaly needs verification; a detected precursor is not a guaranteed outage. |
| [DER-Fault dataset, creator's Zenodo record](https://zenodo.org/records/22904220) | OpenDSS-simulated voltage/current magnitudes and phase angles, normal conditions and short-circuit classes under varying loads/DER scenarios. | This is electrical fault analysis, not measured transformer degradation, acoustic/temperature time-to-failure data, or crew-response outcomes. It cannot validate our preventive pod or hours-saved claim. |

These sources were opened and checked. No external dataset was imported or model trained by this documentation task. The supplied ARCOS records do not contain the healthy sensor histories, warning timestamps and independent outcomes needed to validate preventive inference.

## Defensible model design

The following are **engineering design choices inferred from the source principles**, not numeric standards taken from the papers:

1. **Define an asset-bound healthy reference.** Separate baseline acquisition from the evaluation window. Record mounting, transformer class, sensor calibration and operating range. A deliberately injected event must not redefine its own healthy baseline.
2. **Condition thermal expectations on context.** Compare surface/tank temperature against expected behavior at the available ambient temperature and load; use the residual and its trend. Do not call a warm asset abnormal solely because it is warmer than another asset or because the day is hotter. Missing load/ambient data should reduce the scope of the conclusion.
3. **Use persistence and recurrence.** A sequence of unusual windows is different from a one-off spike. Make window size, required duration and cutoff explicit simulation parameters until asset-specific data justify them. Continuous absence of measurements is unknown, not recovery.
4. **Require corroboration before greater specificity.** Thermal residual, vibration change, acoustic activity and electrical/protection context can support a higher inspection priority together. A single channel should not automatically confirm winding failure or choose a replacement package.
5. **Expose quality and abstention.** Reject mismatched asset IDs, future/out-of-order timestamps, nonfinite values, insufficient baseline, stale data and gaps as appropriate. Report missing channels and coverage. Outage status and closed/open protection are distinct from a healthy-condition conclusion.
6. **Return a review priority and evidence trail.** Suitable demonstration outputs are normal/baseline-compatible, monitor, inspect, and insufficient-data, accompanied by the factors and configuration used. Names and thresholds must be labeled as demo policy. No exact failure date or calibrated outage percentage should be inferred from an anomaly score.
7. **Keep distinct models distinct.** An asset-condition advisory, a storm-exposure risk band, and an existing incident's restoration outlook answer different questions. Historical damage, forecast weather and source topology can inform context without proving that this asset is failing. A storm-risk model requires its own feature/label horizon and validation.

The preventive path should exist before a fault is declared, with a declared normal/at-risk state and a visible review action. Replay at least: a healthy operating/load change, a sustained residual anomaly, a transient spike, a missing/stale stream, and an upstream interruption with no supported local distress. Their results demonstrate behavior of the implemented rule, not real-world sensitivity or specificity.

## What would make it predictive rather than only demonstrative

Collect synchronized, calibrated per-asset sensor histories across healthy and deteriorating periods, load and ambient context, maintenance interventions, independently inspected defect labels and failure/retirement outcomes. Split evaluation by asset and time, with storms/sites held out where relevant. Freeze thresholds on training data before testing. Report actionable lead time, false alerts per asset-time, missed actionable defects and operator review load; include outages with no detectable precursor. Interventions censor natural failure time, so a repaired asset cannot be counted automatically as a prevented inevitable failure.

A successful local replay establishes that code responds to the specified conditions. A field trial can establish useful precursor detection and an operational response benefit. These are separate evidence steps.
