# Human 5: AEP data and new Data Guide review

Reviewed October 24, 2026. Fixed target: `610dfdcab3dc992cd5455f5eab492711728b1d92`, the preventive feature build, not `main` at `0652aaa`. This was a read-only source/data review. Only this report was written; no live application, incident state, server, source code, test or Git state was changed.

The supplied reference was the complete user paste at `C:/Users/ritav/.codex/attachments/06139a7b-b025-486c-8f84-9c6141b905c2/Pasted text.txt`. Its Data Guide permits approximate network relationships, nearest-pole matching where no direct pole relationship exists, reasonable spatial links for critical facilities, and declared crew assumptions. Those choices are not reported as defects. A transparent, focused example is sufficient; production power-flow accuracy and a full-territory model are not prerequisites.

## Findings

### D1 — P1 gap: damage-to-repair-work journey is not connected

**Locations:** `pipeline/import_gis.py:16`, `pipeline/import_gis.py:110`, `pipeline/import_labor.py:119`, `engine/scenarios.py:122`, `api/main.py:142`.

**Observed:** The normalized GIS importer selects customers, transformers and protection equipment. It explicitly lists poles, primary/secondary lines and facilities as unsupported connectivity. The runtime source bundle contains no pole or conductor attributes. Scenario restoration uses fixed illustrative direct workloads of 1, 3 or 6 hours, then calls the estimator with tasks rather than an ARCOS-derived damage/workbook package. The source-backed labor importer/mapping functions have tests and standalone entry points, but no caller in the API/scenario/frontend path. The four selectable incident cases do not include the Guide's broken-pole journey.

**Guide basis:** Section 3 asks for `ARCOS damage → pole/primary attributes → phases → structure drawings → construction units/materials → labor workbook`. The Guide expressly allows a nearest-pole assumption; the issue is the absent connection, not a lack of a perfect official key.

**Targeted check:** Source search for `load_labor_catalog` and `map_damage_to_work_packages` finds the importer and tests, not runtime integration. `engine/scenarios.py:122–135` explicitly labels its hours as illustrative and not workbook rates. There is no API input for a selected damage row, matched pole, phase/structure assumption or construction-unit list.

**Expected focused demonstration:** One historical or clearly declared damage example should expose its direct/nearest pole relationship, relevant attributes, declared phase/structure basis, selected units and sourced labor arithmetic. A single defensible pole example or equivalent source-backed repair package is enough; implementing every pole class or GIS layer is unnecessary. Unknown attributes can remain unknown or use a visibly declared assumption; the displayed range must identify which basis it uses. The current gap is that no equivalent source-backed repair package reaches the incident UI.

**Owners:** Humans 1 and 2 for data/work package; Human 4 for integration.

### D2 — P1 gap: source protection devices do not drive step restoration

**Locations:** `engine/aep_impact.py:68`, `engine/aep_impact.py:111`, `engine/restoration.py:143`, `api/main.py:186`, `api/schemas.py:85`.

**Observed:** The shipped source sample already contains three fuse tokens and two recloser tokens, each with eight sample dependents. The selectable fault list and scenario context accept only transformers or the common breaker. The shared incident exposes one status and an affected-token list; its advance request changes status/cutout/summary rather than isolating a section or completing a selected repair task. The pure `evaluate_restoration` helper can evaluate supplied blockers, but no API/frontend caller connects it to the source paths.

**Guide basis:** Section 4 asks which damaged section can be isolated and which unaffected customers can restore first. This can be a declared sectionalization scenario; actual remote switching or a production electrical model is not required.

**Targeted check:** `AEPImpact.affected` returns transformer groups of 1/1/2/3/4/5, protection groups of eight, and a common breaker group of sixteen. `selectable_assets` filters out the fuse/recloser groups. Source search finds the staged helper used in tests, not the running incident journey.

**Expected focused demonstration:** A labeled isolate/repair sequence should recompute remaining blockers and show a partial restored/still-out customer set before all work finishes. It should disclose the assumed isolation and restoration event rather than infer physical safety from the graph alone.

**Owners:** Humans 1 and 2 for dependency/blocker inputs; Human 4 and frontend owner for the shared workflow.

### D3 — P1 gap: critical facilities and restoration value do not influence limited-crew order

**Locations:** `pipeline/import_gis.py:16`, `engine/restoration.py:61`, `engine/restoration.py:66`, `engine/restoration.py:82`.

**Observed:** All 52 supplied facility records are available with usable geometry, but no runtime facility association, criticality field, weighting or priority output connects them to the incident/task model. The scheduler chooses ready tasks by sorted task ID and declares that it does not optimize staffing. Customer-declared medical guidance is a separate behavior and does not establish restoration prioritization.

**Guide basis:** Sections 4–5 say hospitals, fire and ambulance locations should influence priority, permit reasonable spatial relationships, and ask what should restore first given limited crews and customer criticality. A stated simple ranking policy would satisfy a focused prototype; global mathematical optimization is unnecessary.

**Targeted pure-function check:** Two equal eight-person-hour tasks share a two-person crew and have no prerequisites. Supply `A_ROUTINE` with one restored customer/no facility and `Z_CRITICAL` with twelve customers/one facility. `schedule_tasks` ignores those value fields, runs `A_ROUTINE` first and starts `Z_CRITICAL` four hours later. This demonstrates absent criticality/customer-value binding, not an assertion that critical work must outrank every other constraint.

**Expected focused demonstration:** Link at least one anonymous critical location to a declared dependency group, state the priority rule, and show how value/criticality can change the queue under a shared crew limit. Transform source coordinates before spatial matching and suppress identifying facility details in customer output.

**Owners:** Human 1 for spatial associations; Human 2 for priority policy; Human 4 for integration.

### D4 — P2 gap: crew/access sensitivity exists in pure services but not the incident API/UI

**Locations:** `api/main.py:142`, `api/main.py:186`, `engine/restoration.py:123`, `web/src/components/utility/PlanningPanels.tsx:21`.

**Observed:** Select/advance request models provide no crew-size, damage-quantity, access-delay or planning-horizon inputs. Extra `crew_size: 8` and `access_hours: 48` fields are silently omitted when these request models parse them. The utility panel displays a range and assumptions. The separate response comparison examines assumed information delays, not an updated source work package/restoration plan.

**Guide basis:** Section 5 asks teams to state crew assumptions (2–8 is a suggested reasonable range), compare restoration scenarios and show changes when crew, damage, access or network assumptions change. Its two-day/three-day/week examples are scenarios, not mandatory exact durations.

**Targeted check:** In an isolated process, the request model dumps discard both fields. The underlying pure scenario estimator does respond: the same 27-person-hour replacement example takes 13.5 expected hours with two people versus 3.375 with eight, before other declared constraints. `recompute_restoration` is implemented and tested, but has no API/frontend caller.

**Expected:** Bind declared scenario edits to the same displayed incident plan and revision, retaining the work/units/dependency explanation. No claim that these illustrative durations are measured AEP repair times is needed.

**Owners:** Human 4 using Human 2's existing services; frontend owner for controls.

## Source access and aggregate verification

The web tool could not fetch the public GitHub tree or its API. A read-only Python request to the official [GitHub contents API](https://api.github.com/repos/hackohio/aep_challenge_hack26/contents/data/raw?ref=main) succeeded. Its current `main` ZIP blob identities exactly matched `git hash-object` on the supplied local files:

| Official source | Size | Matching Git blob SHA |
|---|---:|---|
| `Data1.zip` | 19,210,707 bytes | `baeeb0dc1c0419838972edc648101b535e604548` |
| `Data2.zip` | 12,683,324 bytes | `12a3521bf24c427047e837d37391083ae98acdec` |
| `matched_upstream.zip` | 1,499,517 bytes | `5d29b464d00a4067481c13d6bc47419591edfbe9` |

The user-provided Data Guide paste was read directly. The Google Drive preview was not independently read; the paste, local organizer DOCX and verified local archives supplied the review evidence.

| Available source input | Read-only aggregate check | Interpretation for Guide work |
|---|---|---|
| Poles | 107,013 rows; `location_n` unique and nonblank in all; `number` blank in all | A structured location key exists on the pole layer; a separate damage relationship or declared spatial match is needed |
| Pole height | 19,195 `Unknown` and one blank; 87,817 other populated values | Parse units and retain unknowns; do not equate populated strings with validated replacement size |
| Pole class | 18,987 `Unknown`, 4,795 `N/A`, one blank | A focused example may select a usable row or disclose its class assumption |
| Primary conductor | 62,788 rows; `phase_orde` populated in 53,233 and blank in 9,555 | Values include ordinary A/B/C combinations, D and repeated codes; string length is not a validated phase-count rule |
| Per-phase conductor attributes | A/B/C fields nonempty on 35,138/33,593/33,500 rows | There is material/phase context to inspect; neutral/unknown attributes require separate interpretation |
| Critical facilities | 5 hospital, 37 fire, 10 ambulance rows; all 52 geometries transform successfully to WGS84 | Source data is available; present lack of prioritization is not due to absent facilities |
| Facility CRS | Compound WGS84/Pseudo-Mercator plus NAVD88 height | Unlike WGS84 pole/primary layers; raw x/y cannot be compared as longitude/latitude without transformation |
| Historical ARCOS | 1,659 rows, including 355 pole, 704 primary and 74 transformer records | Provides a starting damage context; it is historical and is not automatically the current selected incident |

No raw premise IDs, precise coordinates, names, addresses or facility identities were exported in these checks. Approximate associations are permitted by the Guide, but should carry their assumption, distance/basis and source CRS treatment.

## Current strengths and limits

- The shipped source bundle remains byte-identical to the previously audited `0e93b14` bundle (Git blob `d8675883f7d09e8c5bc326cbde27054d1088b20a`): **16 premises, 12 equipment nodes, 27 relationships**. All three declared archive SHA256 values still match the actual ZIPs. The prior full raw-lineage audit of those exact bytes found every sample path/asset and full-source dependency count consistent with the supplied records. This pass did not waste time repeating the unchanged 448-combination check.
- The runtime footprint is now source-derived and explicitly scoped to the sample; the 117,549 accepted offline paths are not presented as one runtime outage. Unknown source selections abstain. Equipment map locations are generalized and household positions are omitted.
- The 4.5 person-hour conversion, dependency/shared-crew arithmetic and pure staged-readiness helper provide useful components. Their existence does not establish the missing integrated damage/priority/step-restoration journey.
- The new preventive screening and delay comparison are additional, clearly modeled capabilities. They do not replace the Data Guide's damage/repair/limited-crew prioritization chain.
- No requirement for a perfect network, actual switching, calibrated failure model or empirically demonstrated 8–10-hour savings was imposed in this data review. No implementation changes or live endpoint mutations were made.
