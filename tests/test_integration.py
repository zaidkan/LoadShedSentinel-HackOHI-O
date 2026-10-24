from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import json
from fastapi.testclient import TestClient
import pytest
from api.main import create_app
from api.schemas import Snapshot, CustomerSnapshot
from api.services import TeamServices

@pytest.fixture
def client():
    with TestClient(create_app()) as c:
        yield c


def snapshot(c,sid='multi_fault'):
    response=c.get(f'/api/incidents/{sid}/snapshot')
    assert response.status_code==200
    return response.json()


def act(c,action='advance',target=None,sid='multi_fault',**extra):
    body={'action_id':str(uuid4()),'expected_revision':snapshot(c,sid)['revision'],'action':action,**extra}
    if target is not None:body['target_id']=target
    return c.post(f'/api/scenarios/{sid}/actions',json=body)


def customer(c,token='P-DEMO-001',sid='multi_fault'):
    response=c.get(f'/api/customer/{sid}/{token}/snapshot')
    assert response.status_code==200
    return response.json()


def preferences(c,token='P-DEMO-001',sid='multi_fault',opted_in=True,needs=None):
    return act(c,'set_preferences',token,sid,preferences={'opted_in':opted_in,'needs':needs or {}})


def repair(c,task,sid='multi_fault'):
    assert act(c,'start_repair',task,sid).status_code==200
    response=act(c,'complete_repair',task,sid)
    assert response.status_code==200
    return response.json()


def types(view):
    return [n['type'] for n in view['notifications']]


def test_catalog_health_and_frozen_contract(client):
    assert client.get('/api/health').json()['mode']=='synthetic_fixture'
    scenarios=client.get('/api/scenarios').json()
    assert len(scenarios)==6
    for scenario in scenarios:
        sid=scenario['id']
        Snapshot.model_validate(snapshot(client,sid))
        CustomerSnapshot.model_validate(customer(client,sid=sid))
    assert client.get('/api/metadata').json()['source_data_ingested'] is False
    assert client.get('/api/network').json()['source']=='synthetic_fixture'
    assert client.get('/api/network?circuit_id=REAL-CIRCUIT').status_code==404


def test_full_four_alert_lifecycle_and_partial_restoration(client):
    for token in ['P-DEMO-001','P-DEMO-002','P-DEMO-003']:
        assert preferences(client,token).status_code==200
    assert types(customer(client))==['PRE_STORM']
    active=act(client).json()
    assert active['impact_summary']['known_affected_count']==3  # union, not 2+3
    assert types(customer(client))==['PRE_STORM','OUTAGE_CONFIRMED']
    # A home with only upstream work uses its own fixture planning range.
    assert customer(client,'P-DEMO-002')['restoration']['upper_hours']==6
    partial=repair(client,'TASK-UPSTREAM')
    assert partial['phase']=='PARTIAL_RESTORATION'
    assert partial['impact_summary']['known_affected_count']==2
    assert customer(client,'P-DEMO-001')['status']=='OUTAGE'
    assert customer(client,'P-DEMO-002')['status']=='RESTORED'
    assert types(customer(client,'P-DEMO-002'))[-1]=='RESTORATION_COMPLETE'
    assert types(customer(client))[-1]=='ESTIMATE_UPDATED'
    restored=repair(client,'TASK-LOCAL')
    assert restored['phase']=='RESTORED'
    assert restored['impact_summary']['known_affected_count']==0
    assert types(customer(client))==['PRE_STORM','OUTAGE_CONFIRMED','ESTIMATE_UPDATED','RESTORATION_COMPLETE']
    assert customer(client)['restoration']['upper_hours']==0


def test_local_first_does_not_restore_upstream_blocked_homes(client):
    act(client)
    after=repair(client,'TASK-LOCAL')
    assert after['impact_summary']['restored_in_scenario_count']==0
    assert all(s['status']=='OUTAGE' for s in after['premise_states'])
    assert customer(client)['remaining_repair_count']==1
    assert repair(client,'TASK-UPSTREAM')['phase']=='RESTORED'


def test_consent_and_household_isolation(client):
    assert preferences(client,'P-DEMO-001').status_code==200
    act(client)
    assert types(customer(client,'P-DEMO-001'))==['PRE_STORM','OUTAGE_CONFIRMED']
    assert customer(client,'P-DEMO-002')['notifications']==[]
    preferences(client,'P-DEMO-001',opted_in=False)
    count=len(customer(client)['notifications'])
    repair(client,'TASK-UPSTREAM')
    repair(client,'TASK-LOCAL')
    assert len(customer(client)['notifications'])==count


def test_idempotent_retries_and_conflicting_action_ids(client):
    preferences(client)
    before=snapshot(client)
    body={'action_id':'retry-same','expected_revision':before['revision'],'action':'advance'}
    first=client.post('/api/scenarios/multi_fault/actions',json=body)
    assert first.status_code==200
    second=client.post('/api/scenarios/multi_fault/actions',json=body)
    assert second.json()==first.json()
    assert types(customer(client)).count('OUTAGE_CONFIRMED')==1
    body['action']='select_premise';body['target_id']='P-DEMO-002'
    assert client.post('/api/scenarios/multi_fault/actions',json=body).status_code==409


def test_stale_and_invalid_actions_are_atomic(client):
    original=snapshot(client)
    response=client.post('/api/scenarios/multi_fault/actions',json={
        'action_id':'stale','expected_revision':original['revision']+1,'action':'advance'})
    assert response.status_code==409
    assert snapshot(client)==original
    assert act(client,'complete_repair','TASK-LOCAL').status_code==404
    assert snapshot(client)==original
    act(client)
    before=snapshot(client)
    assert act(client,'complete_repair','TASK-LOCAL').status_code==409
    assert snapshot(client)==before


def test_unknown_never_restores_and_no_false_alert(client):
    preferences(client,sid='contradictory')
    assert act(client,sid='contradictory').status_code==200
    c=customer(client,sid='contradictory')
    assert c['status']=='UNDER_REVIEW'
    assert c['restoration']['kind']=='unavailable'
    assert 'RESTORATION_COMPLETE' not in types(c)
    assert act(client,sid='contradictory').status_code==409


def test_customer_allowlist_excludes_operator_state(client):
    act(client)
    operator=snapshot(client)
    assert operator['evidence'][0]['visibility']=='operator'
    view=customer(client)
    forbidden={'evidence','hypotheses','crew_recommendation','selected_supply_path','premise_states',
               'active_faults','repair_tasks','affected_premise_tokens','impact_summary','current_asset_id'}
    assert not forbidden.intersection(view)
    text=json.dumps(view)
    for private_token in ['P-DEMO-002','P-DEMO-003','T-DEMO-001','R-DEMO-001','FAULT-LOCAL']:
        assert private_token not in text


def test_preferences_retry_returns_original_response(client):
    body={'action_id':'prefs','expected_revision':1,'preferences':{'opted_in':True}}
    path='/api/customer/multi_fault/P-DEMO-001/preferences'
    first=client.post(path,json=body)
    act(client)
    assert client.post(path,json=body).json()==first.json()


def test_reset_revision_monotonic_fresh_run_and_consent_retained(client):
    preferences(client)
    act(client)
    before=snapshot(client)
    body={'action_id':'reset-one','expected_revision':before['revision']}
    reset=client.post('/api/scenarios/multi_fault/reset',json=body).json()
    assert reset['revision']==before['revision']+1
    assert reset['run_id']!=before['run_id']
    assert reset['phase']=='PRE_STORM'
    assert types(customer(client))==['PRE_STORM']
    assert customer(client)['preferences']['opted_in'] is True
    assert client.post('/api/scenarios/multi_fault/reset',json=body).json()==reset
    assert client.post('/api/scenarios/multi_fault/actions',json={
        'action_id':'old-tab','expected_revision':before['revision'],'action':'advance'}).status_code==409


def test_unknown_keys_and_wrong_payloads(client):
    assert client.get('/api/incidents/missing/snapshot').status_code==404
    assert client.get('/api/customer/multi_fault/P-UNKNOWN/snapshot').status_code==404
    assert act(client,'select_premise','P-UNKNOWN').status_code==404
    assert client.post('/api/scenarios/multi_fault/actions',json={
        'action_id':'bad','expected_revision':1,'action':'advance','target_id':'TASK-LOCAL'}).status_code==422
    assert client.post('/api/scenarios/multi_fault/actions',json={
        'action_id':'bad','expected_revision':1,'action':'set_preferences','target_id':'P-DEMO-001'}).status_code==422
    assert client.post('/api/customer/multi_fault/P-DEMO-001/preferences',json={
        'action_id':'bad-numeric','expected_revision':1,'preferences':{'needs':{'device_watts':-1}}}).status_code==422


def test_battery_math_and_declared_needs(client):
    response=preferences(client,needs={'backup_wh':1000,'device_watts':100,'inverter_efficiency':0.8,
                                     'reserve_fraction':0.25,'medical_equipment':True})
    assert response.status_code==200
    view=customer(client)
    assert view['plan']['theoretical_runtime_hours']==6
    assert any('medical-device backup plan' in text for text in view['plan']['guidance'])
    assert any('theoretical' in text for text in view['plan']['guidance'])
    assert not customer(client,'P-DEMO-002')['preferences']['needs']['medical_equipment']


@pytest.mark.parametrize('sid',['local_protection','confirmed_transformer_damage','upstream_feeder'])
def test_other_scenarios_complete_with_explicit_repair_events(client,sid):
    preferences(client,sid=sid)
    for _ in range(10):
        state=snapshot(client,sid)
        if state['phase']=='RESTORED':break
        assert act(client,sid=sid).status_code==200
    assert snapshot(client,sid)['phase']=='RESTORED'
    assert 'RESTORATION_COMPLETE' in types(customer(client,sid=sid))


def test_advance_alias_and_risk_preview(client):
    assert client.post('/api/scenarios/local_protection/advance',json={'action_id':'alias','expected_revision':1}).status_code==200
    for storm,band in [('calm','LOW'),('severe','HIGH'),('unknown','UNKNOWN')]:
        response=client.post('/api/risk',json={'scenario_id':'multi_fault','premise_token':'P-DEMO-001','storm_scenario':storm})
        assert response.status_code==200
        assert response.json()['band']==band
        assert 'Fixed illustrative' in response.json()['drivers'][0]
    assert client.post('/api/risk',json={'scenario_id':'multi_fault','premise_token':'fake'}).status_code==404


def test_snapshot_adapter_contract_and_atomic_failure():
    def broken(s):
        if s.revision>1:s.selected_premise_token='P-DEMO-002'
        return s
    with TestClient(create_app(TeamServices(enrich_snapshot=broken))) as client:
        before=snapshot(client)
        response=act(client)
        assert response.status_code==502
        assert snapshot(client)==before


def test_two_actions_on_same_revision_only_one_wins():
    app=create_app()
    from api.schemas import Action
    from api.scenarios import ScenarioError
    def update(i):
        try:
            app.state.store.apply('multi_fault',Action(action_id=f'parallel-{i}',expected_revision=1,action='advance'))
            return 200
        except ScenarioError as exc:return exc.status
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(update,[1,2]))==[200,409]


def test_no_network_key_needed_and_openapi_available(client):
    response=client.get('/openapi.json')
    assert response.status_code==200
    assert 'CustomerSnapshot' in response.json()['components']['schemas']
    assert client.get('/api/customer/notifications',params={'premise_token':'P-DEMO-001'}).json()==[]


def test_incident_id_resolves_and_old_run_id_expires(client):
    first=snapshot(client)
    path=f"/api/incidents/{first['incident_id']}/snapshot"
    assert client.get(path).json()==first
    client.post('/api/scenarios/multi_fault/reset',json={'action_id':'new-run','expected_revision':1})
    assert client.get(path).status_code==404


def test_nonfinite_model_inputs_rejected():
    from api.schemas import Needs
    from pydantic import ValidationError
    for value in [float('nan'),float('inf')]:
        with pytest.raises(ValidationError):Needs(backup_wh=value)


def test_starting_repairs_or_refreshing_does_not_spam_estimate_alerts(client):
    preferences(client)
    act(client)
    before=types(customer(client))
    for _ in range(3):
        customer(client)
    act(client,'start_repair','TASK-UPSTREAM')
    assert types(customer(client))==before


def test_cutout_matches_selected_asset_and_completed_repairs(client):
    assert act(client).json()['cutout_status']=='OPEN'
    assert act(client,'select_premise','P-DEMO-002').json()['cutout_status']=='CLOSED'
    assert act(client,'select_premise','P-DEMO-001').json()['cutout_status']=='OPEN'
    local_done=repair(client,'TASK-LOCAL')
    assert local_done['cutout_status']=='CLOSED'
    assert local_done['phase']=='OUTAGE'  # upstream remains, without condemning local equipment
    assert repair(client,'TASK-UPSTREAM')['cutout_status']=='CLOSED'


def test_unaffected_home_never_counted_as_restored(client):
    preferences(client,'P-DEMO-002',sid='local_protection')
    act(client,sid='local_protection')
    state=snapshot(client,'local_protection')
    assert customer(client,'P-DEMO-002',sid='local_protection')['status']=='NORMAL'
    assert state['impact_summary']['restored_in_scenario_count']==0
    repair(client,'TASK-LOCAL',sid='local_protection')
    assert snapshot(client,'local_protection')['impact_summary']['restored_in_scenario_count']==2
    assert types(customer(client,'P-DEMO-002',sid='local_protection'))==['PRE_STORM']
