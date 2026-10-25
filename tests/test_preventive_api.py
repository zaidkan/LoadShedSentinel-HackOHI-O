"""Integration boundaries: pre-fault analysis cannot mutate incident authority."""
from copy import deepcopy

from fastapi.testclient import TestClient

from api.main import app
from engine.preventive import demo_profile
from engine.response_comparison import benchmark_response


client = TestClient(app)


def transformer():
    return next(asset for asset in client.get('/api/aep/assets').json() if asset['kind'] == 'TRANSFORMER')


def test_preventive_route_keeps_incident_state_unchanged_and_uses_real_source_scope():
    asset = transformer()
    before = client.get('/api/scenario/current').json()
    result = client.post('/api/preventive/assess', json={
        'asset_token': asset['asset_token'], 'profile_id': 'persistent_multisensor',
    })
    assert result.status_code == 200
    data = result.json()
    assert data['assessment']['condition_priority'] == 'INSPECT'
    assert data['assessment']['service_state'] == 'AT_RISK'
    assert data['source_context']['dependent_premises_in_sample'] == asset['dependent_premises_in_sample']
    assert data['assessment']['outage_confirmed'] is False
    assert data['customer_advisory']['outage_confirmed'] is False
    assert data['customer_advisory']['physical_service_status'] == 'UNKNOWN'
    assert data['assessment']['recommendation']['dispatch'] is False
    assert client.get('/api/scenario/current').json() == before


def test_preventive_profiles_have_distinct_pre_fault_outcomes_and_no_failure_countdown():
    asset = transformer()['asset_token']
    expected = {'normal': 'ROUTINE', 'warming': 'MONITOR', 'persistent_multisensor': 'INSPECT',
                'storm_ready': 'ROUTINE', 'unknown': 'UNKNOWN'}
    for profile_id, priority in expected.items():
        result = client.post('/api/preventive/assess', json={'asset_token': asset, 'profile_id': profile_id})
        assert result.status_code == 200
        assessment = result.json()['assessment']
        assert assessment['condition_priority'] == priority
        assert assessment['outage_confirmed'] is False
        assert assessment['predicted_failure_time_utc'] is None
        if profile_id == 'storm_ready':
            assert assessment['readiness'] == 'PREPARE'


def test_unmapped_or_wrong_class_asset_never_gets_a_fabricated_preventive_assessment():
    for asset in ('ASSET-NOT-FOUND', next(a['asset_token'] for a in client.get('/api/aep/assets').json() if a['kind'] == 'CIRCUIT_BREAKER')):
        result = client.post('/api/preventive/assess', json={'asset_token': asset})
        assert result.status_code == 400


def test_bad_or_foreign_observations_abstain_instead_of_inventing_condition():
    asset = transformer()['asset_token']
    inputs = demo_profile('persistent_multisensor', asset)
    inputs['readings'][0]['asset_id'] = 'ASSET-FOREIGN'
    result = client.post('/api/preventive/assess', json={
        'asset_token': asset, 'readings': inputs['readings'], 'as_of_utc': inputs['as_of_utc'],
    })
    assert result.status_code == 200
    assert result.json()['assessment']['service_state'] == 'UNKNOWN'
    assert result.json()['assessment']['condition_priority'] == 'UNKNOWN'


def test_custom_series_requires_clock_and_unknown_input_fields_are_rejected():
    assert client.post('/api/preventive/assess', json={'readings': [{}]}).status_code == 422
    assert client.post('/api/preventive/assess', json={'outage_confirmed': True}).status_code == 422
    assert client.post('/api/preventive/assess', json={'wind_mph': -1}).status_code == 422


def test_custom_observations_do_not_inherit_demo_weather():
    asset = transformer()['asset_token']
    inputs = demo_profile('normal', asset)
    for profile in ('normal', 'storm_ready'):
        result = client.post('/api/preventive/assess', json={
            'asset_token': asset, 'profile_id': profile,
            'readings': inputs['readings'], 'as_of_utc': inputs['as_of_utc'],
        })
        assert result.status_code == 200
        assert result.json()['assessment']['readiness'] == 'NOT_PROVIDED'


def test_response_api_preserves_negative_zero_and_positive_comparisons():
    inputs = deepcopy(benchmark_response()['default_inputs'])
    asset = transformer()
    result = client.post('/api/response/compare', json={'inputs': inputs, 'asset_token': asset['asset_token']})
    assert result.status_code == 200
    assert round(result.json()['savings_hours']['expected'], 6) == .15
    assert result.json()['source_context']['dependent_premises_in_sample'] == asset['dependent_premises_in_sample']
    inputs['assisted']['wrong_crew_probability'] = inputs['baseline']['wrong_crew_probability']
    result = client.post('/api/response/compare', json={'inputs': inputs})
    assert round(result.json()['savings_hours']['expected'], 6) == -.25
    inputs['evidence_status'] = 'unknown'
    result = client.post('/api/response/compare', json={'inputs': inputs})
    assert result.json()['savings_hours']['expected'] == 0
    assert result.json()['advisory_applied'] is False


def test_benchmark_is_declared_simulation_with_unfavorable_controls():
    result = client.get('/api/response/benchmark')
    assert result.status_code == 200
    benchmark = result.json()
    assert benchmark['empirical_validation'] is False
    savings = [case['result']['savings_hours']['expected'] for case in benchmark['cases']]
    assert any(value < 0 for value in savings)
    assert 0 in savings
    assert any(value > 0 for value in savings)
