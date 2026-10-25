# Current AEP Data Guide and rubric closure

Updated October 25, 2026 for the integration checkout based on `bb4482d` plus preventive integration `8c58d30` and the staged-restoration/priority changes described below. This supersedes the older `b5d4834` evidence snapshot for these specific capabilities; it is not a claim of an award, field validation or complete production readiness.

References: the AEP AI Outage Concierge Data Guide supplied by the user on October 25; the [local organizer challenge brief](../aep_challenge_hack26/docs/HackOHIO_2026_AI_Outage_Concierge_Challenge.docx); [official AEP source repository](https://github.com/hackohio/aep_challenge_hack26); and the six criteria listed on the [official event page](https://hackohio2026.devpost.com/). The Guide permits approximate topology, nearest-pole assumptions and reasonable spatial associations for critical locations. A focused, explainable prototype is the standard applied here.

## The Guide's four questions

| Question | Current implementation and evidence | Scope / remaining disclosure |
|---|---|---|
| **1. What is damaged?** | A declared transformer replacement uses the selected source asset token and a stated 25-kVA, one-unit scenario package. Modeled evidence also supports local protection, upstream interruption and insufficient-evidence cases. | The rating and current damage are declared scenarios, not verified GIS rating or live ARCOS findings. The historical broken-pole → phase → drawing workflow is not represented as an implemented incident journey. |
| **2. Which customers depend on it?** | `AEPImpact` uses the shipped, validated source paths. Six transformer groups contain 1/1/2/3/4/5 premises; their union is the 16-premise sample. The section demo derives an eight-premise protective group and eight other premises from ordered source equipment paths. | Counts are sample dependencies, not observed outages, full-territory counts or a proof of physical energization. Missing equipment geometry does not create a guessed link. |
| **3. What work repairs or isolates it?** | The transformer component workload comes from actual workbook `Labor time material related!C21,D21`, with the 4.5 allowance once. The section replay selects an actual supplied upstream FUSE/RECLOSER and records explicit modeled isolation, repair and release events. | The selected replacement excludes associated equipment/assessment work unless separately specified. The isolation is an explicitly declared utility-review scenario, not a live switching command or verified safe switching plan. |
| **4. With limited crews and criticality, what restores first and when?** | The source-based comparison schedules two explicitly declared replacement jobs on one shared crew. Actual disjoint premise groups supply customer counts; canonical `kind: HOSPITAL` records inform priority. A separate staged replay restores an unaffected group before the isolated group's repair/release. Crew/access controls update the shared planning range. | Facility links are assumed nearest-transformer associations. The two-job comparison is a separate scenario, not a second confirmed fault in the selected incident. Critical-first can increase ordinary customer-minutes; that trade-off is shown rather than called an overall time saving. |

The Guide's broken-pole chain is an example of connecting damage, assets, material quantities and sourced labor. The focused transformer/workbook example supplies a narrower repair-work demonstration. No claim is made that every pole class, construction unit, conductor phase or GIS layer is integrated. Reasonable, clearly labeled assumptions are allowed; silently turning unknown inputs into sourced facts is not.

## Reproducible section-restoration example

In the utility console, start the modeled section demonstration. The server uses the selected transformer's supplied upstream sequence and chooses the nearest protection whose dependency set strictly contains the fault's local set while leaving a nonempty unaffected group.

For the default three-premise transformer, the source-derived event scope is 16, the isolated protective section is eight, and the unaffected group is eight:

| Explicit modeled event | Restored | Still out | What it demonstrates |
|---|---:|---:|---|
| Start upstream-trip example | 0 | 16 | The declared trip establishes the demo's interruption scope |
| Isolate section | 0 | 16 | Isolation review alone does not energize customers |
| Authorize unaffected group | 8 | 8 | Partial restoration before the selected transformer repair finishes |
| Complete repair | 8 | 8 | Repair completion alone does not authorize the isolated group's release |
| Authorize repaired group | 16 | 0 | The isolated group restores only after repair and separate modeled authorization |

Repair-first is also supported after isolation. In that order, completing the repair restores nobody; authorizing the repaired group restores eight while the other eight still require their own release. Repeated, premature and unknown events are rejected. No elapsed planning duration creates a release event.

The groups are sets of unique supplied premise tokens, not added fault-footprint totals. Every intermediate state keeps restored and still-out sets disjoint with their union equal to the event scope. The same property holds for all six transformer choices and all 16 supplied premises. Geometry is not used to choose the protection or invent a supply path.

Implementation: [step model](../engine/step_restoration.py), [section API](../api/main.py), [operator controls](../web/src/components/utility/SectionRestorationControls.tsx), [customer projection](../engine/customer.py). The API uses one shared incident revision and the existing demo session. The customer projection exposes its selected premise's modeled state and aggregate progress, rather than another household's restoration list or operator equipment details.

## Priority comparison: corrected mechanism and honest arithmetic

The comparison now reads canonical uppercase facility `kind` values, rather than looking for a nonexistent `facility_type` field. Each job's customer count is the size of its actual source premise set, not the number of hospital records. The two sets are disjoint. Task finishes are retrieved by task ID, so a different schedule order cannot masquerade as a hospital-time improvement.

Both jobs use the same declared 25-kVA install/remove category from C21/D21: **8.9739574468 person-hours per job** after the single indirect allowance. With three people, the conditional labor time is approximately **2.9913 hours per job**. This is a workload scenario, not an empirical restoration prediction or a claim that the GIS transformers have that rating.

For the default comparison, hospital-associated work covers three source premises and the other group covers five. Critical-first finishes the hospital-associated job one job-duration earlier but increases ordinary customer interruption in this particular equal-work example. `cmi_change_prioritized_minus_baseline` explicitly reports that trade-off. When the same group would be first under both policies, both hospital-time gain and CMI difference are zero. Total work and completion time remain the same across the two scheduling policies.

The comparison is labeled `separate_two_concurrent_transformer_repair_scenario`; it does not alter the selected single-incident footprint or assert that an additional transformer is actually damaged. Its assumptions identify facility associations and repair times as modeled context, not physical service confirmations.

## Data and association limits retained

- Original supplied archives were checked against the source bundle's recorded SHA256 values. The validated base network remains the same **16 premises / 12 equipment nodes / 27 relationships**; the earlier offline pipeline accepted **117,549** source paths. Those scales are distinct.
- All **52 source facility records** are ingested: five hospital, 37 fire and ten ambulance records. Their horizontal compound Web-Mercator geometry is transformed before matching. Public associations omit names, addresses and precise coordinates.
- The current policy associates every facility to the nearest transformer in the small sample, with no maximum distance. Rounded distances span **7–21 km for hospitals, 1–36 km for fire and 6–36 km for ambulance**. Records carry `ASSUMED` status, the matching basis and a disclosure. These are scenario planning associations, not verified electrical supply; facilities are source records, not a claim of deduplicated physical sites.
- Historical ARCOS damage does not automatically confirm the selected asset's current condition. Its report/repair dates lack time of day and crew-dispatch chronology, so they cannot prove an 8–10-hour response saving.
- Preventive screening uses declared modeled sensor histories and demonstration thresholds. Rule-based forecasting/scenario reasoning is an acceptable prototype approach in the supplied brief; calibrated failure probabilities, exact failure times, installed hardware and prevented outages are separate validation claims that remain unproved.

## Sponsor experience and general judging criteria

The sponsor's five requirements and the event's six judging criteria serve different purposes. The following is an evidence mapping, not a promise that a feature count earns a particular score.

| Event criterion | Concrete evidence available in this build |
|---|---|
| Innovation | Linked source dependency → modeled condition/incident → proposed capability package → planning → customer explanation, including partial restoration |
| Curiosity | Local/upstream and unknown-evidence cases; testing both repair/release orders; inspecting when critical-first increases CMI rather than hiding the trade-off |
| Communication | Source/scenario labels, premise-specific status, explicit release controls, ranges, assumption details and demo delivery disclosures |
| Project Breadth and Complexity | GIS/projection, graph dependence, workbook units, shared-crew scheduling, procedural 3D, preventive history and customer communication paths |
| Impact | Demonstrated mechanisms for prioritizing critical context and restoring unaffected groups sooner; conditional response scenarios without measured-savings claims |
| Growth Mindset | Reproducible regressions for the incorrect facility key, schedule-index false gain, customer-count confusion, authorization gates and unknown source conditions |

For the sponsor, the app supplies location/context selection, declared risk bands with explanations, a sourced but assumed restoration package/range, needs-based preparation and demo communication planning. Live weather/OMS inputs, calibrated risk accuracy, physical switching feasibility, a complete ARCOS pole/material chain and field-measured benefits remain disclosed boundaries. The [older evidence crosswalk](judge_evidence.md) has a historical commit marker; use this file and the current regression results for the changed behaviors.

## Validation record

Independent source-specific regressions were run from this checkout with Python 3.14, bytecode/cache writes disabled:

```powershell
python -m pytest -q -p no:cacheprovider -o pythonpath=. tests/test_step_restoration_data.py
```

**Result: 34 passed, no skips.** They cover original archive hash binding; every source transformer and premise; source-ordered protection; 8/8/16 set partition; both repair/release orders; no automatic restoration; repeated/premature events; unknown or conflicting paths; missing geometry; privacy fields; input immutability; source-based priority groups; independent CMI recomputation; and a controlled same-order case with zero claimed benefit.

Integration verification on October 25, 2026:

- Full backend suite: **261 passed, 72 subtests passed**, with one upstream Starlette/httpx deprecation warning. The POSIX permission-bit assertion is applied only on POSIX; the persistence and corruption checks still run on Windows. This does not certify Windows ACLs.
- Frontend integration checks passed, including stable session fallback when browser storage is absent, denied or unwritable; request serialization; and section restoration control gates. TypeScript and Vite production build passed (**2,573 modules**).
- Browser walkthrough on the integrated API/UI verified the sequence **16 out → 8 out → 0 out**, with isolation and repair alone restoring nobody. An unaffected household showed RESTORED while the faulted household still showed OUTAGE and received no other household's restoration notification.
- The browser showed the source-based hospital-associated work comparison at **2.99 versus 5.98 hours** with the same **5.98-hour total** and the disclosed **359 additional customer-minutes** under critical-first. These are conditional scheduling calculations, not measured field benefits.
- The redesigned 3D loaded successfully; browser console errors were empty. At a 390-pixel requested mobile viewport, the document had no horizontal overflow and the tested action buttons met a 44-pixel touch size. [Verified integrated 3D screenshot](integration-evidence/redesigned-3d.jpg).

No exhaustive full-graph rebuild or repeated 448-combination test was needed because the previously checked base sample is unchanged. These checks establish a working focused prototype; they do not establish calibrated prediction accuracy, a safe field switching plan or operational deployment.
