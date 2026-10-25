# Model reference

## Evidence and diagnosis

Evidence is checked against incident, equipment, timestamp, provenance, and quality. Conflicting current records produce abstention. An open protective cutout does not prove transformer damage, and normal surface temperature does not prove healthy internals. Diagnosis weights express relative support, not a trained probability or a verified physical condition.

## Labor and restoration

The supplied workbook's 25-kVA transformer category uses:

| Input | Value |
| --- | ---: |
| Installation, cell C21 | 1.1880851063829778 hours |
| Removal, cell D21 | 0.8061276595744681 hours |
| Combined direct workload | 1.994212765957446 hours |
| Indirect multiplier | 4.5, applied once |
| Adjusted workload | 8.973957446808507 person-hours |

The rating, replacement quantity of one construction unit, crew size, and access delay are declared scenario inputs. The workbook average is not a surveyed asset rating or a measured saving.

Three workers yield an expected labor-only baseline of 2.991319148936169 hours. The default duration factors are 0.75, 1, and 1.5. Queue, additional access, prerequisites, shared crews, and energization assumptions can change completion times. These are planning ranges, not calibrated quantiles or utility commitments. Travel/setup allowances must not duplicate the included indirect multiplier.

Restoration readiness is separate from elapsed time: modeled blockers must be complete and an explicit simulated authorization must exist. The application does not operate physical equipment.

## Critical-facility comparison

Hospital priority is enabled only when the selected source footprint has an approximate hospital association. The comparison uses declared independent tasks of three and six person-hours on one crew. These task workloads are illustrative; proximity does not verify a hospital's electrical service or restoration.

## Contextual outage risk

Four complete finite inputs are required: wind speed, ambient temperature, transformer load factor, and health index. Each contributes zero, one, or two points.

| Factor | One point | Two points |
| --- | --- | --- |
| Wind | At least 35 km/h | At least 65 km/h |
| Ambient temperature | At most 0°C or at least 35°C | At most -15°C or at least 40°C |
| Load factor | At least 0.85 | At least 1.10 |
| Health index | At most 70 | At most 40 |

The highest matching level applies for each factor. Totals of 0–2, 3–5, and 6–8 map to LOW, MODERATE, and HIGH. Missing, invalid, or conflicting inputs return UNKNOWN. Thresholds are prototype assumptions, not utility operating limits or measured probabilities.

## Battery and sensing-node energy

Household theoretical runtime is `capacity Wh × usable fraction × inverter efficiency ÷ device W`. Conservative runtime reserves a further fraction. Defaults use 0.85 usable fraction, 0.85 efficiency, and a 0.15 reserve. Constant load, device cycling, temperature, age, and starting surges limit the estimate; it does not establish medical-device suitability.

The separate sensing-node model uses a nominal 41 Wh battery and 25 W panel. Routine demand is `0.015 W × 24 h + 0.001 Wh × 288 messages = 0.648 Wh/day`, before event/retry loads. Piecewise irradiance and connectivity are modeled inputs. Energy simulation and buffered events do not establish field endurance or radio performance.
