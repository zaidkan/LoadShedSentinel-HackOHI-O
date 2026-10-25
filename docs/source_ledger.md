# Source ledger

## Attribution

The source datasets, labor workbook, and challenge brief were supplied for the [AEP HackOHI/O 2026 challenge](https://github.com/hackohio/aep_challenge_hack26). Their local reference copy is under [aep_challenge_hack26/](../aep_challenge_hack26/README.md). Source ownership and distribution terms remain separate from the application.

This application was developed for that event. Source data, prior concept/design material, third-party libraries, and implementation work must be attributed separately in any submission or reuse. The development history is retained in the repository; source ownership and applicable disclosure requirements remain in effect.

## Evidence categories

| Category | Origin | Supported use | Boundary |
| --- | --- | --- | --- |
| Source dependencies | Supplied upstream text and validated customer/transformer/circuit joins | Coverage-limited dependency lookup | Not live switch state, physical line geometry, or substation routing |
| Equipment geometry | Supplied GIS records, generalized for the sample | Schematic equipment context | Not household coordinates or navigation-grade positions |
| Facility associations | Reprojected public facility records and nearest sample anchor | Approximate critical-facility context | Not verified electrical service or operational availability |
| Historical damage | Supplied ARCOS extract | Historical assessment context | No automatic join to the selected simulated incident |
| Labor references | Supplied workbook cells and indirect-labor instruction | Declared workload calculations | Not observed elapsed repair time or avoided labor |
| Telemetry and energy | Deterministic scenario and energy models | Explain evidence handling and energy budgets | Not field measurements or hardware validation |
| Incident confirmation | Selected demonstration scenario | Exercise confirmation and abstention behavior | Not a live enterprise confirmation |
| Household needs | User-declared browser inputs | Preparation guidance and battery planning | Not an inferred medical profile or utility registration |
| Notification delivery | Demonstration state transitions | Preview preparation and status messages | No actual SMS, push, emergency call, or dispatch |

## Workload interpretation

The confirmed-replacement scenario declares one 25-kVA transformer construction unit. Workbook cells C21 and D21 produce 1.994212765957446 direct hours, adjusted once by 4.5 to 8.973957446808507 person-hours. Crew size, access, duration factors, and authorization are separate modeled inputs. See [models](models.md).

Default incident footprints use the validated 16-premise public bundle. Legacy `P-DEMO-*` groups are explicit test overrides; they are not the default source-connected application. Optional full-graph lookup is a separate coverage surface. Neither establishes an observed outage.

## Claims

The repository does not establish live utility integration, measured diagnostic accuracy, demonstrated battery endurance, actual crew dispatch, calibrated outage probabilities, verified dollar savings, or a committed restoration time. Scores, sample counts, model assumptions, and unknowns must remain visible when results are presented.
