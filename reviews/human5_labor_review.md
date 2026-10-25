# Human 5: AEP workbook, structures and restoration review

Reviewed revision `610dfdcab3dc992cd5455f5eab492711728b1d92`. Review only. No engine, API, frontend, test, source-data or Git changes. API reproductions ran in a fresh subprocess using TestClient; the live preview was not mutated.

## Primary-source verification

- Independently read all five worksheets from the actual XLSX ZIP/XML, including cell data types, formulas, cached values and missing cells. SHA256: `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`.
- Inspected all nine scanned structure drawing pages as images, with full-size review of pages 2 and 9. Page 2 depicts a transformer/cutout/arrester/grounding arrangement. Page 9 depicts a three-phase crossarm/pin/insulator arrangement and explicitly labels its illustrated hardware 35 kV. These are representative drawings; do not silently equate every pictured arrangement with the Guide's 15 kV primary layer or an exact construction work order.
- Read the newly supplied Data Guide from `C:/Users/ritav/.codex/attachments/06139a7b-b025-486c-8f84-9c6141b905c2/Pasted text.txt`. Its sections 3-5 add the explicit damage-to-materials-to-labor chain, person-hour interpretation, step restoration, criticality and open crew assumptions.
- Read the actual five-page Google Drive PDF downloaded to `C:/Users/ritav/AppData/Local/Temp/human5-material-review/aep_challenge.pdf`. It is the AEP **Challenge Brief**, not the Data Guide or event judging rubric. Its substantive text matches the repository DOCX: a word-count comparison found no DOCX-only content; PDF additions were recurring headers, footers and page numbering. Page 3 contains the five requirements; page 4 lists data inputs; page 5 describes the minimum demonstration and editable scenario expectations.

## Findings

### 1. P1: staffing and access changes cannot update the running restoration estimate

**Location:** `api/main.py:142-156`, `api/main.py:186-224`; pure helper at `engine/restoration.py:123-140`.

**Reproduction:** In a fresh TestClient process, select `confirmed_replacement`. Its expected range is 9 hours, with lower/upper 6.75/13.5 and 27 person-hours. Repeat the request with `crew_size:6`, `access_hours:2` and `damage_quantity:3`. The endpoint returns success and an identical restoration object. The request model has only scenario, asset and premise fields, so these additional values are silently ignored. Advance accepts status, cutout state and a message summary, but does not reschedule work. There is no restoration-calculation/update route.

**Basis:** Challenge Brief page 3, requirement 2 expressly requires updating the estimate when damage, crew, access or network assumptions change. Data Guide section 5 asks for those comparisons. A pure recomputation function is not evidence of the running customer/utility journey updating.

**Narrow next step:** expose validated planning inputs through the integrator and recalculate the shared restoration object/revision. Unsupported input fields should be rejected rather than accepted and ignored. **Owners:** Human 4 integration, Human 2 calculation.

### 2. P1: the actual workbook does not supply any running incident workload

**Location:** `engine/scenarios.py:122-135`; source loader `pipeline/import_labor.py:63-117`.

The four incident demonstrations still hardcode 1/3/6 direct hours and pass already-adjusted task workloads to the estimator. They never load the labor catalog or construct a workbook-backed package. The replacement screen's 27 person-hours and 9 expected hours therefore come from an illustrative six-hour assumption, not a selected workbook record. The assumption text accurately discloses this; the issue is an uncompleted supplied-data integration, not an incorrect multiplication or a hidden source claim.

**Actual-cell example:** for an explicitly declared one-unit, 25-kVA replacement, `Labor time material related!C21=1.1880851063829778` install hours and `D21=0.8061276595744681` removal hours. Sum once, multiply by 4.5 once: 8.973957446808507 person-hours. Three declared workers produce an idealized baseline of 2.991319148936169 hours before additional non-overlapping constraints. This example does not establish the selected GIS transformer's rating.

**Basis:** Data Guide section 3 connects repair work and construction units to the supplied workbook; section 5 calls for explainable damage/material/person-hour scenarios. Challenge Brief page 4 identifies the workbook as restoration-effort input. A focused working example is sufficient; full-network completion is unnecessary.

**Narrow next step:** wire one explicit sourced work package, preserving rating, operation, quantity, cell references and assumptions through both views. **Owners:** Human 2 engine, Human 4 integration.

### 3. P2: a broken pole's associated hardware and phase arrangement do not affect its proposed package

**Location:** `pipeline/import_labor.py:138-158`.

**Reproduction:** call `map_damage_to_work_packages` with one 45-ft, class-2 pole, `operation='replace'`, `quantity_unit='construction_unit'`, first with `phases=1`, then `phases=3`. Both return exactly one identical `POL:Medium` package using `Labor time material related!C13,D13`. Neither class nor phase enters the mapping. No drawing-derived crossarm, pin, insulator, guy, grounding or connection quantities are added.

The workbook does provide separate category averages: crossarms `A3,B3`, grounding `A45,B45`, insulators `A60,B60`, pins `A65,B65`, among others. The drawings show why a complete damaged structure may require multiple categories. Their exact quantities require a declared representative arrangement and review; the pictures alone do not certify a work order.

**Basis:** Data Guide section 3 says a broken pole entails replacement of the pole and associated hardware, tracing pole/primary attributes and phase count through the representative drawings to construction units. The existing result can represent the pole-only component; it cannot demonstrate that complete chain.

**Narrow next step:** add one clearly labeled representative single-/three-phase package or explicitly surface the omitted hardware as unavailable, rather than treating a pole-only record as the complete repair. A nearest-pole spatial match is permitted by the new Guide when declared; it need not be rejected categorically. **Owners:** Human 2 work packages, Human 1 input association.

### 4. P2: criticality and staged customer-restoration value do not influence the limited-crew schedule

**Location:** `engine/restoration.py:61-82`; incident tasks `engine/scenarios.py:123-127`; API transition `api/main.py:194-224`.

**Reproduction:** provide two independent tasks sharing one three-person crew: `A-ordinary` requires six person-hours and `Z-critical` three person-hours, with a hospital criticality attribute on the latter. At duration factors 1/1/1, scheduling returns ordinary work at 0-2 hours and critical work at 2-3 hours. Criticality fields are discarded; alphabetic task IDs decide priority. This same total workload could finish the critical task at hour 1 under the opposite feasible ordering. No claim of globally optimal scheduling is needed to demonstrate this comparison.

The pure blocker helper correctly prevents local completion from erasing an upstream blocker and requires explicit restoration authorization. However, the live incident only creates `assessment` followed by `work_package`, and the API exposes status edits rather than a repair/isolation/staged-release action. An impact count and a response-wait comparison are not a demonstration of criticality-aware step restoration.

**Basis:** Data Guide section 4 asks which unaffected sections can restore first and which critical locations are affected. Section 5 distinguishes restoration effort from customer count/criticality value under limited crews. Approximate, declared relationships are acceptable; proven power-flow or live switching authority is not required.

**Narrow next step:** demonstrate two explicit repair/isolation alternatives with declared customer groups/criticality and one limited crew, preserving blocker and authorization rules. **Owners:** Human 2 planning, Human 1 relationships, Human 4 integration.

## Arithmetic and source-handling checks that passed

- `Indirect Labor Multiplier!B1=4.5`; `A3` explicitly includes drive time, safety discussion and setup. The new Guide resolves the output unit as **person-hours**. `labor_person_hours(6)` returns exactly 27 person-hours. It is not 27 elapsed hours and it is not divided by a fixed eight-person crew.
- The sourced 25-kVA example above produces 4.4869787234042535, 2.991319148936169 and 1.1217446808510634 expected labor-only hours for crews of 2, 3 and 8 respectively. The Guide leaves staffing open and gives 2-8 as a reasonable range, not a compulsory crew size.
- `recompute_restoration` correctly recomputes the sourced example for six workers plus two additional non-overlapping access-delay hours: expected 3.4956595744680845 hours, with the same 8.973957446808507 person-hours. This establishes pure-function behavior only.
- Reprocessing `adjusted_person_hours` does not apply 4.5 again. Explicit `travel_hours`, `setup_hours`, `mobilization_hours` and `safety_hours` are rejected as duplicate indirect categories. Additional access-delay inputs must genuinely be non-overlapping; their name alone does not prove that.
- All 95 connector CU identifiers are source text, preserving their exact code spelling. The other two CNC numeric summaries are cached AVERAGE formulas and the count is a COUNTA formula; no new workbook calculation or alteration was performed. The catalog imports 135 records across five worksheets.
- `Labor only work!D8` for Junction Pole Work is blank, not zero. The importer preserves unavailable hours. Only Hand Dig and Rock Hole have explicit `per cubic foot` denominators (`E5,E6`); unknown adder denominators remain unavailable instead of being invented.
- Transformer size in `Labor time material related!A22` is **37**, not 37.5. It is correctly preserved as supplied; an undocumented conversion would be inappropriate. Pole size bands remain those printed in `B12:B14`, with unsupported heights left unmapped.
- The prior explicit-quantity-unit mismatch and asset-unbound field-confirmation defects are remediated in the current code and are not repeated here.

## Limits

These are reproducible implementation gaps against the supplied Guide, not claims about AEP operating procedures or actual restoration commitments. No source data proves hourly dispatch savings, crew availability, a surveyed electrical path or switching feasibility. The two-day/three-day/one-week examples in the Guide are suggested scenario comparisons, not mandatory fixed predictions. No live server state or workbook/PDF bytes were changed.
