import asyncio
import copy
import threading

import httpx
import pytest
import api.main as api
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_scenarios_listing():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 4
    ids = [s["id"] for s in scenarios]
    assert "local_protection" in ids
    assert "upstream_feeder" in ids
    assert "confirmed_replacement" in ids
    assert "insufficient_evidence" in ids

def test_scenario_select_and_switching():
    # Select upstream_feeder
    res = client.post("/api/scenario/select", json={"scenario_id": "upstream_feeder"})
    assert res.status_code == 200
    snap = res.json()
    assert snap["cutout_status"] == "CLOSED"
    assert len(snap["affected_premise_tokens"]) == 16
    assert snap["impact_source"]["provenance"] == "aep_challenge"
    assert snap["impact_source"]["fault_asset_kind"] == "CIRCUIT_BREAKER"
    assert not any("P-DEMO" in p for p in snap["affected_premise_tokens"])
    assert snap["status"] == "OUTAGE"

    # Select insufficient_evidence
    res_in = client.post("/api/scenario/select", json={"scenario_id": "insufficient_evidence"})
    assert res_in.status_code == 200
    snap_in = res_in.json()
    assert snap_in["cutout_status"] == "UNKNOWN"
    assert snap_in["status"] == "UNDER_REVIEW"

def test_topology_lookup_endpoint():
    premise = client.get("/api/scenario/current").json()["selected_premise_token"]
    response = client.get("/api/topology/lookup", params={"premise_id": premise})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "KNOWN"
    assert len(data["path"]) >= 1
    assert data["endpoint"] == "Circuit Breaker"

def test_battery_runtime_endpoint():
    payload = {
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 0.85,
        "reserve_margin_pct": 0.15
    }
    response = client.post("/api/customer/battery-runtime", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["usable_wh"] == 850.0
    assert data["theoretical_hours"] == 7.22

def test_preparedness_endpoint():
    payload = {
        "food_refrigeration": True,
        "refrigerated_medication": True,
        "life_critical_medical_device": True,
        "medical_device_notes": "Oxygen concentrator",
        "mobility_accessibility_needs": False,
        "communications_charging": True,
        "sump_pump": False,
        "backup_battery_available": True,
        "battery_capacity_wh": 500,
        "battery_usable_pct": 0.8,
        "essential_load_w": 60
    }
    response = client.post("/api/customer/preparedness", json=payload)
    assert response.status_code == 200
    guidance = response.json()["guidance"]
    assert len(guidance) >= 3
    cats = [g["category"] for g in guidance]
    assert "CRITICAL_MEDICAL" in cats


def test_openapi_and_advance_sensitivity():
    # OpenAPI schema generation works without NameError/Union failure
    res_open = client.get("/openapi.json")
    assert res_open.status_code == 200
    schema = res_open.json()
    assert "/api/scenario/advance" in schema["paths"]

    # POST /api/scenario/advance with sensitivity parameters succeeds
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    res_adv = client.post("/api/scenario/advance", json={"crew_size": 6, "access_hours": 2.0})
    assert res_adv.status_code == 200
    snap = res_adv.json()
    assert snap["planning_inputs"]["crew_size"] == 6
    assert snap["planning_inputs"]["access_hours"] == 2.0
    # Expected hours recalculation with 6 workers and 2h access: 3.495...
    assert round(snap["restoration"]["expected_hours"], 2) == 3.50


def test_advance_atomic_rollback():
    # Rejected advance does not mutate state or increment revision
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    curr_before = client.get("/api/scenario/current").json()
    status_before = curr_before["status"]
    rev_before = curr_before["revision"]

    # Attempt advance with valid status but invalid cutout_status
    res_bad = client.post("/api/scenario/advance", json={
        "status": "RESTORED",
        "cutout_status": "INVALID_STATE"
    })
    assert res_bad.status_code == 400

    curr_after = client.get("/api/scenario/current").json()
    assert curr_after["status"] == status_before
    assert curr_after["revision"] == rev_before

    # Late failure atomicity: unordered access_hours rejected and does not poison context
    res_unordered = client.post("/api/scenario/advance", json={
        "status": "RESTORED",
        "access_hours": [3, 1, 2]
    })
    assert res_unordered.status_code == 400
    assert "ordered" in res_unordered.json()["detail"]
    # Subsequent valid advance succeeds
    res_valid = client.post("/api/scenario/advance", json={"crew_size": 6})
    assert res_valid.status_code == 200


def test_extra_fields_forbidden():
    # Extra unsupported fields in requests return 422
    res = client.post("/api/scenario/select", json={
        "scenario_id": "confirmed_replacement",
        "damage_quantity": 3
    })
    assert res.status_code == 422

    res_adv = client.post("/api/scenario/advance", json={
        "crew_size": 4,
        "unexpected_field": "test"
    })
    assert res_adv.status_code == 422

    res_bat = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "extra_field": True
    })
    assert res_bat.status_code == 422


def test_battery_boundary_validation():
    # Invalid inverter efficiency (< 0.5 or > 1.0) rejected with HTTP 400
    res_low = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 0.1
    })
    assert res_low.status_code == 400
    assert "inverter_efficiency" in res_low.json()["detail"]

    res_high = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 1.5
    })
    assert res_high.status_code == 400


def test_customer_alert_plan_and_privacy():
    # Alert plan eligibility and internal asset id redaction
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    res = client.get("/api/customer/snapshot")
    assert res.status_code == 200
    data = res.json()
    alert_plan = data["alert_plan"]
    assert alert_plan["eligible"] is True
    # Raw asset ID not directly interpolated into customer basis
    assert "ASSET-" not in alert_plan["basis"]
    assert "T-DEMO" not in alert_plan["basis"]
    assert "escalation_policy" in alert_plan


def test_scenario_selection_notification_dedup():
    # Single OUTAGE_CONFIRMED, no double alerts
    client.post("/api/scenario/reset")
    res = client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    assert res.status_code == 200
    snap = res.json()
    outage_alerts = [n for n in snap["notifications"] if n["type"] == "OUTAGE_CONFIRMED"]
    assert len(outage_alerts) == 1


def test_session_isolation():
    # Multiple sessions maintain isolated states
    s1 = client.post("/api/session/new").json()["session_id"]
    s2 = client.post("/api/session/new").json()["session_id"]
    assert s1 != s2

    # Select different scenarios in each session
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"}, headers={"X-Session-ID": s1})
    client.post("/api/scenario/select", json={"scenario_id": "upstream_feeder"}, headers={"X-Session-ID": s2})

    snap1 = client.get("/api/scenario/current", headers={"X-Session-ID": s1}).json()
    snap2 = client.get("/api/scenario/current", headers={"X-Session-ID": s2}).json()

    assert snap1["scenario_id"] == "confirmed_replacement"
    assert snap2["scenario_id"] == "upstream_feeder"


def test_restoration_authorization_gating():
    # Direct RESTORED status without clearing blockers or operator authorization must be rejected
    sid = client.post("/api/session/new").json()["session_id"]
    client.post("/api/scenario/select", json={"scenario_id": "local_protection"}, headers={"X-Session-ID": sid})

    # Direct advance to RESTORED without authorization fails with 400
    res_direct = client.post("/api/scenario/advance", json={"status": "RESTORED"}, headers={"X-Session-ID": sid})
    assert res_direct.status_code == 400
    assert "Restoration blocked" in res_direct.json()["detail"]

    # Advance with explicit simulated operator authorization succeeds
    res_auth = client.post("/api/scenario/advance", json={
        "status": "RESTORED",
        "action": "record_demo_authorization"
    }, headers={"X-Session-ID": sid})
    assert res_auth.status_code == 200
    snap = res_auth.json()
    assert snap["status"] == "RESTORED"
    assert snap["cutout_status"] == "CLOSED"


def test_customer_view_revision_and_escalation_preview():
    # Customer snapshot exposes authoritative revision and simulation preview escalation
    client.post("/api/scenario/reset")
    snap_before = client.get("/api/scenario/current").json()
    cust_view = client.get("/api/customer/snapshot").json()

    assert cust_view["revision"] == snap_before["revision"]
    assert "Simulated demonstration preview" in cust_view["alert_plan"]["escalation_policy"]
    assert "not connected to live 911" in cust_view["alert_plan"]["escalation_policy"]




# Endpoint regressions for session integrity and cache policy.
def _selected_session():
    sid = client.post('/api/session/new').json()['session_id']
    headers = {'X-Session-ID': sid}
    selected = client.post('/api/scenario/select', headers=headers,
                           json={'scenario_id': 'confirmed_replacement'})
    assert selected.status_code == 200
    return headers, api._sessions[sid]


def _application_state(session):
    return copy.deepcopy(dict(snapshot=session.snapshot.model_dump(mode='json'), context=session.context,
                              completed=session.completed_task_ids, authorized=session.authorized_premise_tokens,
                              notifications=vars(session.fsm)))


@pytest.mark.parametrize('authorization', [
    {}, {'action': 'record_demo_authorization'}, {'record_demo_authorization': True},
])
def test_authorization_lists_preserve_manual_and_demo_semantics(authorization):
    headers, session = _selected_session()
    blockers = api.get_premise_blockers(session.snapshot)
    tasks = next(iter(blockers.values()))
    premises = list(blockers)
    before = _application_state(session)
    rejected = client.post('/api/scenario/advance', headers=headers, json={
        **authorization, 'completed_task_ids': ['unknown-task'], 'authorized_premises': ['P-UNKNOWN'],
    })
    assert rejected.status_code == 400
    assert rejected.json()['detail'] == 'Unknown blocking task: unknown-task'
    assert _application_state(session) == before

    partial = client.post('/api/scenario/advance', headers=headers, json={
        **authorization, 'completed_task_ids': tasks[:1], 'authorized_premises': premises[:1],
    })
    assert partial.status_code == 200
    assert session.completed_task_ids == set(tasks[:1])
    assert session.authorized_premise_tokens == set(premises[:1])
    assert client.post('/api/scenario/advance', headers=headers,
                       json={'status': 'RESTORED'}).status_code == 400

    for lists in ({}, {'completed_task_ids': [], 'authorized_premises': []}):
        headers, session = _selected_session()
        response = client.post('/api/scenario/advance', headers=headers, json={
            **authorization, **lists, 'status': 'RESTORED',
        })
        assert response.status_code == (200 if authorization else 400)
        assert session.snapshot.status == ('RESTORED' if authorization else 'OUTAGE')


@pytest.mark.parametrize('payload', [
    {'status': 'RESTORED', 'action': 'record_demo_authorization', 'access_hours': [1, 2]},
    {'action': 'record_demo_authorization', 'authorized_premises': ['P-UNKNOWN']},
    {'status': 'RESTORED', 'completed_task_ids': ['replace_transformer']},
    {'completed_task_ids': ['replace_transformer'], 'authorized_premises': ['P-UNKNOWN']},
])
def test_rejected_advance_preserves_all_application_state(payload):
    headers, session = _selected_session()
    before = _application_state(session)
    rejected = client.post('/api/scenario/advance', headers=headers, json=payload)
    assert rejected.status_code == 400
    assert _application_state(session) == before
    # A failed combined event must never authorize a subsequent plain restoration.
    assert client.post('/api/scenario/advance', headers=headers,
                       json={'status': 'RESTORED'}).status_code == 400
    assert _application_state(session) == before


@pytest.mark.parametrize('cutout', ['OPEN', 'UNKNOWN'])
def test_restored_transition_rejects_conflicting_explicit_cutout_atomically(cutout):
    headers, session = _selected_session()
    before = _application_state(session)
    rejected = client.post('/api/scenario/advance', headers=headers, json={
        'status': 'RESTORED', 'action': 'record_demo_authorization', 'cutout_status': cutout})
    assert rejected.status_code == 400
    assert _application_state(session) == before


@pytest.mark.parametrize('cutout', [None, 'CLOSED'])
def test_restored_transition_closes_cutout_and_cannot_be_reopened(cutout):
    headers, session = _selected_session()
    payload = {'status': 'RESTORED', 'action': 'record_demo_authorization'}
    if cutout is not None:
        payload['cutout_status'] = cutout
    restored = client.post('/api/scenario/advance', headers=headers, json=payload)
    assert restored.status_code == 200
    assert restored.json()['cutout_status'] == 'CLOSED'
    before = _application_state(session)
    assert client.post('/api/scenario/advance', headers=headers,
                       json={'cutout_status': 'OPEN'}).status_code == 400
    assert _application_state(session) == before
    assert len([n for n in restored.json()['notifications'] if n['type'] == 'RESTORATION_COMPLETE']) == 1


def test_equal_revision_concurrent_advances_allow_exactly_one_commit(monkeypatch):
    headers, session = _selected_session()
    revision = session.snapshot.revision
    first_entered = threading.Event()
    release_first = threading.Event()
    original_generate = api.generate_scenario

    def gated_generate(scenario_id, context):
        # Control timing only; both requests use the actual calculator and inputs.
        if context.get('crew_size') == 4:
            first_entered.set()
            assert release_first.wait(5), 'test did not release the first calculator'
        return original_generate(scenario_id, context)

    monkeypatch.setattr(api, 'generate_scenario', gated_generate)

    async def exercise():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as ac:
            first = asyncio.create_task(ac.post('/api/scenario/advance', headers=headers,
                json={'expected_revision': revision, 'crew_size': 4}))
            second = None
            try:
                assert await asyncio.to_thread(first_entered.wait, 3)
                second = asyncio.create_task(ac.post('/api/scenario/advance', headers=headers,
                    json={'expected_revision': revision, 'crew_size': 6}))
                # On the old threaded endpoint the stale writer commits while the
                # first calculator is held. With a session lock it must wait.
                await asyncio.wait({second}, timeout=.15)
            finally:
                release_first.set()
                responses = await asyncio.gather(*([first, second] if second else [first]))
            return responses

    responses = asyncio.run(exercise())
    assert [response.status_code for response in responses] == [200, 409]
    assert responses[0].json()['revision'] == revision + 1
    assert session.snapshot.revision == revision + 1
    assert session.snapshot.planning_inputs.crew_size == 4


@pytest.mark.parametrize('path,payload', [('/api/scenario/select', {'scenario_id': 'upstream_feeder'}),
                                         ('/api/scenario/reset', None)])
def test_select_and_reset_wait_for_the_same_session_mutation_lock(path, payload):
    headers, session = _selected_session()
    before = _application_state(session)

    async def exercise():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as ac:
            async with session.lock:
                pending = asyncio.create_task(ac.post(path, headers=headers, json=payload))
                done, _ = await asyncio.wait({pending}, timeout=.05)
                assert not done
                assert _application_state(session) == before
            response = await pending
            assert response.status_code == 200

    asyncio.run(exercise())
    assert session.snapshot.scenario_id == ('upstream_feeder' if path.endswith('select') else 'local_protection')


def test_session_cache_is_capped_and_evicts_the_least_recently_used_session(monkeypatch):
    monkeypatch.setattr(api, '_sessions', {})
    sessions = []
    for _ in range(50):
        response = client.post('/api/session/new')
        assert response.status_code == 200
        sessions.append(response.json()['session_id'])
        assert len(api._sessions) <= 50
    # Touch the oldest session via a read; the next-oldest must be evicted.
    client.get('/api/scenario/current', headers={'X-Session-ID': sessions[0]})
    extra = client.post('/api/session/new').json()['session_id']
    assert len(api._sessions) == 50
    assert sessions[0] in api._sessions
    assert sessions[1] not in api._sessions
    assert extra in api._sessions
    for _ in range(5):
        client.post('/api/session/new')
        assert len(api._sessions) == 50


def test_counterfactual_comparator_scenarios_contract():
    """Verify Counterfactual Comparator contract: local protection vs upstream feeder."""
    headers = {"X-Session-ID": "test-comparator-session"}
    
    # 1. Hypothesis A: Local Protection Operation
    res_local = client.post("/api/scenario/select", headers=headers, json={"scenario_id": "local_protection"})
    assert res_local.status_code == 200
    snap_local = res_local.json()
    assert snap_local["scenario_id"] == "local_protection"
    assert snap_local["cutout_status"] == "OPEN"
    assert len(snap_local["affected_premise_tokens"]) == 3
    assert snap_local["impact_source"]["fault_asset_kind"] == "TRANSFORMER"
    
    # 2. Hypothesis B: Upstream Feeder Lockout
    res_upstream = client.post("/api/scenario/select", headers=headers, json={"scenario_id": "upstream_feeder"})
    assert res_upstream.status_code == 200
    snap_upstream = res_upstream.json()
    assert snap_upstream["scenario_id"] == "upstream_feeder"
    assert snap_upstream["cutout_status"] == "CLOSED"
    assert len(snap_upstream["affected_premise_tokens"]) == 16
    assert snap_upstream["impact_source"]["fault_asset_kind"] == "CIRCUIT_BREAKER"

