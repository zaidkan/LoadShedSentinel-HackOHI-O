# LoadShed Sentinel — judge evidence crosswalk

Evidence snapshot: **2026-10-24, commit `b5d4834`**. Owners below are the four roles in [the blueprint](../FINAL_LOADSHET_IMPLEMENTATION.md), Sections 1–2. **Verified** means a command was run or source inspected; **Partial** distinguishes working components from incomplete integration; **Pending** is not a passing claim.

The [official event page](https://hackohio2026.devpost.com/) lists **Innovation, Curiosity, Communication, Project Breadth and Complexity, Impact, and Growth Mindset**. Its published list contains no numerical weights. The six delivery headings requested for this document are evidence lenses, mapped to those official criteria below. AEP sponsor completeness is a separate check. The [event rules](https://hackohio2026.devpost.com/rules) also require disclosure of prior work; this crosswalk is not a claim that every repository component was created during the event.

## Requested evidence lenses

| Evidence lens | Claim and demonstrable output | Verifiable code / command | Status and limit | Responsible role |
|---|---|---|---|---|
| **1. Innovation** | One modeled incident supplies telemetry → competing diagnosis → review-only capabilities/materials → planning range → sanitized customer status/guidance. Contrast local protection, upstream interruption, confirmed replacement and abstention. | [Scenario generator](../engine/scenarios.py), [diagnosis](../engine/diagnosis.py), [crew](../engine/crew.py), [customer projection](../engine/customer.py); **V2/V3**. | **Verified calculation/API chain** across four cases; **Partial visual chain** pending V6. Relative evidence scores are not trained probabilities or proof of sensor accuracy. | 2: reasoning; 4: integration/customer |
| **2. Problem Relevance** | Address limited local condition evidence in distribution triage and households' need for restoration context, declared-needs preparation and backup planning. Show how an upstream trip avoids an unsupported local transformer-replacement package. | [Negative control](../tests/test_engine.py), [household guidance, battery and notification logic](../engine/customer.py), [customer tests](../tests/test_customer.py); **V1/V2**, customer view. | **Verified prototype behaviors**; problem framing is design motivation, not measured prevalence, reduced misdispatch, outage survival or safety certification. Risk bands in canonical scenarios are declared assumptions, not an evaluated forecasting model. | 2 + 4 |
| **3. Technical Feasibility** | Workbook-sourced 4.5 indirect allowance; `6 direct hours × 4.5 = 27 person-hours`, then crew/dependencies determine elapsed time. Model a 25 W panel / 41 Wh battery. Query supplied paths at extract scale. | [Labor parser](../pipeline/import_labor.py), [restoration](../engine/restoration.py), [energy](../engine/energy.py), [graph queries](../engine/topology.py); **V2/V4/V5**. | **Verified arithmetic/source tests/build**. Correct scale: **117,599 supplied premise paths, 117,549 accepted paths and 32,600 equipment nodes**, not “117k equipment nodes.” No latency benchmark, field endurance test, physical substation tracing or live switching proof. | 1: graph; 2: labor/energy |
| **4. Breadth & Complexity** | Cross-domain path: source ZIP/DBF/GIS → validated upstream dependency graph; electrical evidence → qualified work package/person-hours; React/Three.js assembly; privacy projection and customer finite-state machine (FSM). | [GIS importer](../pipeline/import_gis.py), [graph builder](../pipeline/build_graph.py), [3D viewport](../web/src/three/AssetViewport.tsx), [customer FSM](../engine/customer.py); **V1/V4/V5**. | **Verified subsystem integration**. The utility page explicitly says its snapshot supply path is unavailable. Scenario premise groups are declared demo groups, not graph-derived outages. An interactive network map and topology-driven scenario localization are not established by these tests. | 1 + 2 + 3 + 4 |
| **5. Presentation** | Operator and customer APIs describe the same selected incident; utility panels and cutout read `ScenarioSnapshot`. Narrate source, affected scope, hypothesis, crew, range, then household guidance/alerts. | [App state](../web/src/App.tsx), [operator page](../web/src/pages/UtilityPage.tsx), [customer page](../web/src/pages/CustomerPage.tsx), [API](../api/main.py); **V3/V6**. | **Verified API coherence**, **Pending browser synchronization proof**. At this commit, customer data loads on mount and does not subscribe to the App snapshot; changing scenarios while that view stays mounted can leave stale content. Do not claim both views continuously synchronize until V6 passes. | 3 + 4 |
| **6. Rubric Verification** | Reproduce tests, model/JSON validity, source joins and production compilation; retain command output and a short recording of the same four cases. | **V1–V6** below; [Python tests](../tests/), [web build script](../web/package.json). | **Verified:** 54 Python tests + 34 subtests, exit 0; production build exit 0 in a private source copy. **Pending:** browser gate and final video. A green build is not browser or field validation. | 4: release proof; all roles own their evidence |

## Coverage of all six official criteria

| Official criterion | Evidence to show | Reproduction / remaining gap | Owner |
|---|---|---|---|
| **Innovation** | Integrated incident-to-customer decision chain, with an upstream/local comparison. | V2/V3; complete V6 for the visual claim. | 2 + 3 + 4 |
| **Curiosity** | Competing explanations and negative controls; normal temperature/open cutout does not establish healthy transformer internals. Inspect source units and missing values. | `EngineTests.test_upstream_control_avoids_local_replacement`, `test_unknown_and_conflicting_evidence_abstain`, `test_workbook_audit_and_missingness` in V2. | 1 + 2 |
| **Communication** | Explain source labels, uncertainty, crew review and a range in a recorded journey of at most three minutes. | Utility source legend and customer view; V6 and the final recording remain pending. The official page requests a prerecorded video and Q&A, not a promise of a live operational system. | 3 + 4 |
| **Project Breadth and Complexity** | Actual source joins, supply dependencies, labor/energy calculations, procedural 3D and customer FSM. | V1/V2/V4/V5; distinguish component coverage from missing end-to-end map/scenario coupling. | 1 + 2 + 3 + 4 |
| **Impact** | Potentially useful household guidance and avoided inappropriate replacement recommendations in declared examples. | V2/V3 and `test_preparedness_guidance`; no measured time/cost savings, prevented outages or clinical outcomes. | 1 + 2 + 4 |
| **Growth Mindset** | Real correction: earlier code accepted an ambiguous bank count as one construction unit and produced an estimate for an unspecified labor denominator. Regression assertions now reject both. | `git show 3153034 -- pipeline/import_labor.py engine/restoration.py tests/test_engine.py`; V2 checks both guards. No mentor quote or sponsor endorsement is recorded here. | 2; 4 preserves proof |

## Exact verification commands

Run from the repository root with local challenge archives and the project `.venv` provisioned. Tests requiring the full source must **pass, not skip**, to substantiate the scale claim. Current verification used Python 3.13/Pydantic 2.14.1. The test runner command used for the recorded run was the equivalent `.venv/bin/python -B -m pytest tests/ -q -p no:cacheprovider`.

| ID | Command | Expected exit / observable result | Recorded result |
|---|---|---|---|
| **V1 — aggregate** | `.venv/bin/pytest tests/ -q -p no:cacheprovider` | **0**; all collected tests pass. | **54 passed, 34 subtests passed**, one existing Starlette TestClient deprecation warning. |
| **V2 — reasoning** | `.venv/bin/pytest tests/test_engine.py tests/test_scenarios.py tests/test_customer.py -q -p no:cacheprovider` | **0**; single 4.5 application, contradictory abstention, confirmation-dependent replacement, exclusive crews/dependencies, buffered events, guidance and alert deduplication. | Covered in V1; 16 engine + 11 scenario + 4 customer tests. Scenario default expected durations: local **2.25 h**, feeder **4.5 h**, replacement **9 h**; unknown unavailable. Those demo work-hours are illustrative, not workbook rates. |
| **V3 — API synchronization** | Run the Python block below. Also `.venv/bin/pytest tests/test_api.py -q -p no:cacheprovider`. | **0**; all four selected scenarios agree across operator/customer API fields and ranges. | Block passed for all four. API test file has 6 passing tests in V1. This proves API projection, not a mounted browser view. |
| **V4 — web build** | `cd web` then `npm run build` | **0**; TypeScript compile and Vite production bundle. | Passed from a private copy of unchanged web/contracts source with installed dependencies. Initial dependency symlink caused sandbox `EPERM` on Vite's temp file; a private temp directory resolved it. Bundle-size warning remains (~1.04 MB JavaScript before gzip). |
| **V5 — extract-scale graph** | `.venv/bin/pytest tests/test_topology.py::FullSourceTests -q -rs -p no:cacheprovider` | **0 and 3 passed, no skips**; 117,599 supplied paths; 117,549 accepted; 32,600 equipment nodes; reverse-index/unknown/privacy checks. | All three full-source tests passed inside V1. There are 117,642 customer rows and 93 unmatched customer premises. Missing joins remain unknown. |
| **V6 — browser gate** | Run the browser block below after provisioning its prerequisites. | Target **0**; nonzero on stale customer content or mismatched state. | **Not run; pending.** No committed browser suite or browser-test npm script exists in this snapshot. Playwright and Uvicorn are absent from this `.venv`. Do not report a passing `npm test` or `playwright test` command. |

**V3: in-process API proof; no server or outbound messages required.**

```bash
.venv/bin/python -B - <<'PY'
from fastapi.testclient import TestClient
from api.main import app
from engine.scenarios import SCENARIO_IDS
client = TestClient(app)
for name in SCENARIO_IDS:
    response = client.post('/api/scenario/select', json={'scenario_id': name})
    assert response.status_code == 200
    operator = response.json()
    response = client.get('/api/customer/snapshot')
    assert response.status_code == 200
    customer = response.json()
    for key in ('scenario_id', 'incident_id', 'selected_premise_token',
                'timestamp_utc', 'status', 'customer_risk', 'notifications', 'disclosure'):
        assert customer[key] == operator[key], (name, key)
    for key in ('kind', 'lower_hours', 'expected_hours', 'upper_hours',
                'assumptions', 'last_updated_utc'):
        assert customer['restoration_planning'][key] == operator['restoration'][key], (name, key)
    assert 'crew_recommendation' not in customer and 'hypotheses' not in customer
    print(name, 'operator/customer API coherent')
PY
```

**V6: proposed browser regression command, not an existing passing suite.** Have the integration owner provision Playwright + Chromium and an ASGI server in the local test environment first. Start the API on port 8000 and the Vite dev server on port 3000 (its `/api` proxy targets port 8000). For example, once Uvicorn is installed, `.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port 8000`; in another terminal, `cd web` then `npm run dev -- --host 127.0.0.1`. Keep these development processes out of production claims.

The following command is designed to expose the mounted-customer refresh gap. Target exit **0** after the synchronization behavior is correct; assertion failure exits **1**. Missing dependencies are an environment failure, not a passed gate.

```bash
.venv/bin/python -B - <<'PY'
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    page.goto('http://127.0.0.1:3000')
    selector = page.get_by_role('combobox')
    selector.select_option('local_protection')
    expect(page.locator('.utility-incident-heading')).to_contain_text('local protection')
    page.get_by_role('button', name='Customer Concierge').click()
    expect(page.get_by_text('~2.25 hours', exact=False)).to_be_visible()
    with page.expect_response(lambda r: '/api/scenario/select' in r.url and r.request.method == 'POST') as selected:
        selector.select_option('upstream_feeder')
    assert selected.value.ok
    expect(page.get_by_text('~4.5 hours', exact=False)).to_be_visible()
    page.get_by_role('button', name='Utility Console').click()
    expect(page.locator('.utility-incident-heading')).to_contain_text('upstream feeder')
    page.screenshot(path='judge-operator-upstream.png', full_page=True)
    browser.close()
PY
```

This one regression is not complete visual coverage. Before claiming presentation complete, record all four scenarios at 1366×768: verify cutout OPEN/CLOSED/UNKNOWN matches API, source labels and abstention are visible, crew/range/alert history follow the same incident, customer content updates while mounted, and 2D fallback/reduced-motion behavior remains understandable. Save screenshots/video and actual browser command output with the release evidence. Do not count screenshot creation alone as a synchronization assertion.

## Judge narration and claims boundary

Use local protection → upstream feeder → scenario-confirmed replacement → insufficient evidence. Show **1 / 3 / 6 illustrative direct hours**, the single 4.5 allowance and crew sizes **2 / 3 / 3**; separately open workbook cell provenance to demonstrate actual source grounding. The parser audits five sheets and 135 references, preserving missing installation hours and unknown quantity denominators. A modeled 25 W / 41 Wh node budget is not a built solar-powered device. Graph paths terminate at the supplied circuit breaker; physical substation connectivity is unknown.

For the energy calculation, harvested energy is `25 W × irradiance fraction × hours × charge efficiency`. Default routine demand is `0.015 W × 24 h + 0.001 Wh × 288 messages = 0.648 Wh/day`; retry/event loads are additional. With no harvest, 24 hours from a full nominal 41 Wh battery leaves about **98.42%** charge under those stated defaults. Tests check this arithmetic, capacity/cold derating, charge bounds and offline buffering; they do not validate a real radio duty cycle or weather forecast.

Keep declared `P-DEMO-*` incident groups separate from source-derived public `PREM-*` topology tokens. A successful topology lookup does not establish that a selected demo incident affects that real-source group. Never export private graph identifiers/customer records to prove scale; use aggregate counts and sanitized paths.

Mentor feedback: **no verbatim feedback, timestamp or resulting decision has been provided for this document**. Add factual attribution only when supplied. Prior-work disclosure and the final three-minute video remain the human integration owner's responsibility. No measured diagnostic accuracy, guaranteed restoration time, demonstrated field battery life or sponsor endorsement is asserted here.
