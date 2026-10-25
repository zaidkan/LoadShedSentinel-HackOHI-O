# LoadShed Sentinel — judge evidence crosswalk

Evidence refresh: **2026-10-25, LRP-150 staged changes; inspected checkout HEAD `b82a711`, with exact source hashes in the private delivery manifest**. Local receipts are recorded with the staged delivery; this is not a claim of target integration or hosted continuous integration (CI) success. Owners below are the four roles in [the blueprint](../FINAL_LOADSHET_IMPLEMENTATION.md), Sections 1–2. **Verified** means a command was run or source inspected; **Partial** distinguishes working components from incomplete integration; **Pending** is not a passing claim.

The [official event page](https://hackohio2026.devpost.com/) lists **Innovation, Curiosity, Communication, Project Breadth and Complexity, Impact, and Growth Mindset**. Its published list contains no numerical weights. The six delivery headings requested for this document are evidence lenses, mapped to those official criteria below. AEP sponsor completeness is a separate check. The [event rules](https://hackohio2026.devpost.com/rules) also require disclosure of prior work; this crosswalk is not a claim that every repository component was created during the event.

## Requested evidence lenses

| Evidence lens | Claim and demonstrable output | Verifiable code / command | Status and limit | Responsible role |
|---|---|---|---|---|
| **1. Innovation** | One modeled incident supplies telemetry → competing diagnosis → review-only capabilities/materials → planning range → sanitized customer status/guidance. Contrast local protection, upstream interruption, confirmed replacement and abstention. | [Scenario generator](../engine/scenarios.py), [diagnosis](../engine/diagnosis.py), [crew](../engine/crew.py), [customer projection](../engine/customer.py); **V2/V3**. | **Verified calculation/API chain** across four cases; **Partial visual chain** pending V6. Relative evidence scores are not trained probabilities or proof of sensor accuracy. | 2: reasoning; 4: integration/customer |
| **2. Problem Relevance** | Address limited local condition evidence in distribution triage and households' need for restoration context, declared-needs preparation and backup planning. Show how an upstream trip avoids an unsupported local transformer-replacement package. | [Negative control](../tests/test_engine.py), [household guidance, battery and notification logic](../engine/customer.py), [customer tests](../tests/test_customer.py); **V1/V2**, customer view. | **Verified prototype behaviors**; problem framing is design motivation, not measured prevalence, reduced misdispatch, outage survival or safety certification. Risk bands in canonical scenarios are declared assumptions, not an evaluated forecasting model. | 2 + 4 |
| **3. Technical Feasibility** | Workbook-sourced 4.5 indirect allowance; `(C21 + D21) × 4.5 = 8.9739574468 person-hours` for the declared 25-kVA replacement, then crew/dependencies determine elapsed time. Model a 25 W panel / 41 Wh battery. Query supplied paths at extract scale. | [Labor parser](../pipeline/import_labor.py), [restoration](../engine/restoration.py), [energy](../engine/energy.py), [graph queries](../engine/topology.py); **V2/V4/V5**. | **Verified arithmetic/source tests/build**. Correct scale: **117,599 supplied premise paths, 117,549 accepted paths and 32,600 equipment nodes**, not “117k equipment nodes.” No latency benchmark, field endurance test, physical substation tracing or live switching proof. | 1: graph; 2: labor/energy |
| **4. Breadth & Complexity** | Cross-domain path: source ZIP/DBF/GIS → validated upstream dependency graph; electrical evidence → qualified work package/person-hours; React/Three.js assembly; privacy projection and customer finite-state machine (FSM). | [GIS importer](../pipeline/import_gis.py), [graph builder](../pipeline/build_graph.py), [3D viewport](../web/src/three/AssetViewport.tsx), [customer FSM](../engine/customer.py); **V1/V4/V5**. | **Verified source/API integration and production compilation**. The running demo derives dependency footprints from a **16-premise / 12-equipment anonymized AEP-source sample**; default local protection affects 3 sample premises and upstream interruption affects 16. Supply Path and FeederMap render those supplied dependencies. Paths stop at circuit breakers; physical upstream/substation connectivity, live power flow and browser interaction remain unverified. | 1 + 2 + 3 + 4 |
| **5. Presentation** | Operator and customer APIs describe the same selected incident; utility panels and cutout read `ScenarioSnapshot`. Narrate source, affected scope, hypothesis, crew, range, then household guidance/alerts. | [App state](../web/src/App.tsx), [operator page](../web/src/pages/UtilityPage.tsx), [customer page](../web/src/pages/CustomerPage.tsx), [API](../api/main.py); **V3/V6**. | **Verified API coherence and deterministic state regressions**. Shared `IncidentProvider` supplies the active snapshot to routed operator/customer views; customer fetching tracks incident, revision, asset and scenario changes. LRP-150 rejects superseded scenario/asset/reset results, errors and busy-state updates. The Dusk interface uses a dusk-violet/paper shell, Instrument Serif headings, Hanken Grotesk text and Geist Mono technical values; the operator review console and customer household dashboard remain distinct views. Appearance and mounted browser synchronization still require V6. | 3 + 4 |
| **6. Rubric Verification** | Reproduce tests, model/JSON validity, source joins and production compilation; retain command output and a short recording of the same four cases. | **V1–V6** below; [Python tests](../tests/), [web build script](../web/package.json). | **Verified:** 137 Python tests + 72 subtests, exit 0; production build and frontend regression runner exit 0 in the private staging copy. **Pending:** browser gate and final video. A green build is not browser or field validation. | 4: release proof; all roles own their evidence |

## Coverage of all six official criteria

| Official criterion | Evidence to show | Reproduction / remaining gap | Owner |
|---|---|---|---|
| **Innovation** | Integrated incident-to-customer decision chain, with an upstream/local comparison. | V2/V3; complete V6 for the visual claim. | 2 + 3 + 4 |
| **Curiosity** | Competing explanations and negative controls; normal temperature/open cutout does not establish healthy transformer internals. Inspect source units and missing values. | `EngineTests.test_upstream_control_avoids_local_replacement`, `test_unknown_and_conflicting_evidence_abstain`, `test_workbook_audit_and_missingness` in V2. | 1 + 2 |
| **Communication** | Explain source labels, uncertainty, crew review and a range in a recorded journey of at most three minutes. | Utility source legend and customer view; V6 and the final recording remain pending. The official page requests a prerecorded video and Q&A, not a promise of a live operational system. | 3 + 4 |
| **Project Breadth and Complexity** | Actual source joins, supply dependencies, labor/energy calculations, procedural 3D and customer FSM. | V1/V2/V4/V5; distinguish source-derived sample dependencies and tested state changes from pending real-browser interaction checks. | 1 + 2 + 3 + 4 |
| **Impact** | Potentially useful household guidance and avoided inappropriate replacement recommendations in declared examples. | V2/V3 and `test_preparedness_guidance`; no measured time/cost savings, prevented outages or clinical outcomes. | 1 + 2 + 4 |
| **Growth Mindset** | Real correction: earlier code accepted an ambiguous bank count as one construction unit and produced an estimate for an unspecified labor denominator. Regression assertions now reject both. | `git show 3153034 -- pipeline/import_labor.py engine/restoration.py tests/test_engine.py`; V2 checks both guards. No mentor quote or sponsor endorsement is recorded here. | 2; 4 preserves proof |

## Exact verification commands

Run from the repository root with local challenge archives and the project `.venv` provisioned. Tests requiring the full source must **pass, not skip**, to substantiate the scale claim. Local verification used Python 3.13.15/Pydantic 2.14.1 and the existing dependencies. The plain `.venv/bin/pytest tests/` launcher failed collection because this environment omitted the repository root from the import path. `PYTHONPATH=. .venv/bin/pytest tests/` passed without backend/test edits. CI uses `python -m pytest -q tests/` and installs directly from the pinned `requirements.txt`; a fresh dependency installation and hosted CI execution were not performed here.

| ID | Command | Expected exit / observable result | Recorded result |
|---|---|---|---|
| **V1 — aggregate** | `.venv/bin/pytest -o pythonpath=. -q tests/` | **0**; all collected tests pass. | **137 passed, 72 subtests passed**, one existing Starlette TestClient deprecation warning. |
| **V2 — reasoning** | `PYTHONPATH=. .venv/bin/pytest tests/test_engine.py tests/test_scenarios.py tests/test_customer.py -q -p no:cacheprovider` | **0**; single 4.5 application, contradictory abstention, confirmation-dependent replacement, exclusive crews/dependencies, buffered events, guidance and alert deduplication. | Covered in V1. Scenario restoration: confirmed replacement **2.99 h** (workbook rates: `(C21+D21) × 4.5 = 8.97` person-hours, 3 lineworkers); local protection and upstream feeder unavailable (assessment required); contradictory telemetry unavailable. |
| **V3 — API synchronization** | Run the Python block below. Also `PYTHONPATH=. .venv/bin/pytest tests/test_api.py -q -p no:cacheprovider`. | **0**; all four selected scenarios agree across operator/customer API fields and ranges. | The block below checks the current privacy projection for all four scenarios, including sanitized assumptions. API regressions pass within V1. This proves API coherence, not mounted browser behavior. |
| **V4 — web build** | `cd web` then `npm run build` | **0**; TypeScript compile and Vite production bundle. | Passed from the private staging copy with the owned frontend changes and a private copy of existing dependencies. The local build reports no errors; no hosted CI or browser-performance result is inferred. |
| **V5 — extract-scale graph** | `PYTHONPATH=. .venv/bin/pytest tests/test_topology.py::FullSourceTests -q -rs -p no:cacheprovider` | **0 and 3 passed, no skips**; 117,599 supplied paths; 117,549 accepted; 32,600 equipment nodes; reverse-index/unknown/privacy checks. | All three full-source tests passed inside V1. There are 117,642 customer rows and 93 unmatched customer premises. Missing joins remain unknown. |
| **V6 — browser gate** | Complete the browser acceptance checks below in a provisioned local browser environment. | Target **0**; nonzero on stale customer content or mismatched state. | **Not run; pending.** `npm test` is a passing Node-based component/API/customer regression runner, not Playwright or a real-browser suite. Local race checks bundle the real provider with deterministic hooks and deferred fetch responses; they do not test browser rendering or cancel server-side writes. |

**V3: in-process API proof; no server or outbound messages required.**

```bash
.venv/bin/python -B - <<'PY'
from fastapi.testclient import TestClient
from api.main import app
from engine.scenarios import SCENARIO_IDS
from api.schemas import ScenarioSnapshot
from engine.customer import project_customer_view
client = TestClient(app)
for name in SCENARIO_IDS:
    response = client.post('/api/scenario/select', json={'scenario_id': name})
    assert response.status_code == 200
    operator = response.json()
    response = client.get('/api/customer/snapshot')
    assert response.status_code == 200
    customer = response.json()
    assert customer == project_customer_view(ScenarioSnapshot(**operator)), name
    assert 'crew_recommendation' not in customer and 'hypotheses' not in customer
    print(name, 'operator/customer API coherent')
PY
```

**V6: browser acceptance checks — pending, not an existing passing suite.** Provision a browser automation tool and an ASGI server, then run the API on port 8000 and Vite on port 3000. Vite proxies `/api` to port 8000. No browser dependencies or server process were installed or started during this remediation.

1. Open `http://127.0.0.1:3000/#/operator` at 1366×768 and at a narrow mobile viewport. Use the **Scenario** and **AEP source equipment** labels in the shared incident controls; navigation is **Overview / Operator / Customer**, with **Customer view** and **Operator console** links. Old “Utility Console / Customer Concierge” button selectors are obsolete.
2. Select local protection, upstream feeder, confirmed replacement and insufficient evidence. Check each successful `/api/scenario/select` response against the displayed snapshot. Assert `OPEN`, `CLOSED` or `UNKNOWN` from that snapshot; do not infer live energization from a rendered switch.
3. In the customer view, keep the page open while changing scenarios through the shared controls. Confirm the selected incident and household content update. Local/upstream scenarios have no selected repair workload or restoration duration; confirmed replacement has the workbook-derived planning range; insufficient evidence suppresses the duration. Read the current response instead of hardcoding obsolete 2.25/4.5-hour expected values.
4. Exercise overlapping scenario/asset/reset actions with delayed responses. An older response or failure must not replace the latest choice or clear its pending indicator. Also verify network-error recovery, source labels, household persistence, medical guidance, 2D fallback and reduced motion.
5. Save actual browser command output and screenshots/video with the release evidence. A screenshot alone does not prove synchronization; a successful build or Node harness is not a browser pass.

The Dusk design is established by source tokens/components and compilation. Visual polish, mobile overflow, touch and graphics behavior remain browser acceptance work.

## Judge narration and claims boundary

Use local protection → upstream feeder → scenario-confirmed replacement → insufficient evidence. Show the sourced **8.974 person-hours workbook rate** (`(C21+D21) × 4.5`), single indirect allowance and crew sizes **2 / 3 / 3**; separately demonstrate workbook cell provenance, crew/access sensitivity recalculation, and multi-section critical facility priority scheduling. The parser audits five sheets and 135 references, preserving missing installation hours and unknown quantity denominators. A modeled 25 W / 41 Wh node budget is not a built solar-powered device. Graph paths terminate at the supplied circuit breaker; physical substation connectivity is unknown.

For the energy calculation, harvested energy is `25 W × irradiance fraction × hours × charge efficiency`. Default routine demand is `0.015 W × 24 h + 0.001 Wh × 288 messages = 0.648 Wh/day`; retry/event loads are additional. With no harvest, 24 hours from a full nominal 41 Wh battery leaves about **98.42%** charge under those stated defaults. Tests check this arithmetic, capacity/cold derating, charge bounds and offline buffering; they do not validate a real radio duty cycle or weather forecast.

Default interactive scenarios use the sanitized 16-premise source bundle and its anonymous public tokens. Explicit `P-DEMO-*` footprint overrides remain only for declared test inputs; optional full-graph `PREM-*` lookup is a separate coverage surface. A successful supplied-path lookup does not prove a live outage, power flow or connectivity beyond its breaker endpoint. Never export private graph identifiers/customer records to prove scale; use aggregate counts and sanitized paths.

The incident comparator is a **modeled scenario comparison**. Default 3-versus-16 sample footprints and cutout states explain different hypotheses; they do not prove transformer energization or avoided dispatch. **8.974 person-hours is the declared replacement workload, not measured labor saved**. No verified avoided-dollar-savings model is established. At this baseline the separately owned comparator still contains an unsupported savings banner; its owning remediation must remove it before claiming the UI complies with this boundary.

Mentor feedback: **no verbatim feedback, timestamp or resulting decision has been provided for this document**. Add factual attribution only when supplied. Prior-work disclosure and the final three-minute video remain the human integration owner's responsibility. No measured diagnostic accuracy, guaranteed restoration time, demonstrated field battery life or sponsor endorsement is asserted here.
