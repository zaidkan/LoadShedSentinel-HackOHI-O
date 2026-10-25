"""Behavioral checks for pre-outage screening and explicit non-prediction limits."""
from copy import deepcopy
import json
import math

import pytest

from engine.preventive import assess_preventive, demo_profile

ASSET = 'ASSET-EXAMPLE'
NOW = '2026-10-24T22:00:00Z'


def profile(name='normal'):
    return demo_profile(name, ASSET, as_of_utc=NOW)


def test_before_outage_condition_trends_change_the_recommendation():
    stable = assess_preventive(profile())
    warming = assess_preventive(profile('warming'))
    persistent = assess_preventive(profile('persistent_multisensor'))
    assert [r['condition_priority'] for r in (stable, warming, persistent)] == ['ROUTINE', 'MONITOR', 'INSPECT']
    assert stable['service_state'] == 'NORMAL'
    assert warming['service_state'] == persistent['service_state'] == 'AT_RISK'
    assert persistent['recommendation']['capabilities'][0] == 'qualified distribution condition inspection'
    for result in (stable, warming, persistent):
        assert result['assessment_status'] == 'AVAILABLE'
        assert result['fault_probability'] is None
        assert result['predicted_failure_time_utc'] is None
        assert result['predicted_outage_start_utc'] is None
        assert result['outage_confirmed'] is False
        assert result['recommendation']['approved'] is False
        assert result['recommendation']['dispatch'] is False
        assert result['threshold_basis'] == 'unvalidated_demo_assumptions'
        assert result['evidence_confidence']['level'] == 'DEMONSTRATION_ONLY'


def test_high_ambient_and_high_load_alone_are_a_negative_control():
    inputs = profile()
    assert inputs['readings'][-1]['temperature_c'] > inputs['readings'][0]['temperature_c'] + 20
    assert inputs['readings'][-1]['load_pct'] > 100
    result = assess_preventive(inputs)
    assert result['condition_priority'] == 'ROUTINE'
    assert result['indicators'][0]['recent_changes_c'] == [0, 0, 0]


def test_a_single_transient_spike_does_not_become_persistent_distress():
    inputs = profile('storm_ready')
    inputs['weather']['wind_mph'] = 10
    inputs['readings'][-1].update(temperature_c=95, vibration_mm_s=8, acoustic_anomaly=True)
    result = assess_preventive(inputs)
    assert result['condition_priority'] == 'ROUTINE'
    assert not any(i['persistent'] for i in result['indicators'])
    assert result['outage_confirmed'] is False


def test_storm_readiness_is_separate_from_a_condition_diagnosis():
    result = assess_preventive(profile('storm_ready'))
    assert result['condition_priority'] == 'ROUTINE'
    assert result['readiness'] == 'PREPARE'
    assert result['service_state'] == 'AT_RISK'
    assert result['outage_confirmed'] is False
    assert result['predicted_outage_start_utc'] is None
    assert 'does not confirm an outage' in result['customer_message']


@pytest.mark.parametrize('mutation', ['stale', 'missing', 'few', 'short', 'unhealthy', 'gap'])
def test_inadequate_evidence_abstains_even_during_a_storm(mutation):
    inputs = profile('storm_ready')
    if mutation == 'stale':
        inputs['as_of_utc'] = '2026-10-24T22:30:00Z'
    elif mutation == 'missing':
        del inputs['readings'][-1]['ambient_c']
    elif mutation == 'few':
        inputs['readings'] = inputs['readings'][-3:]
    elif mutation == 'short':
        for index, row in enumerate(inputs['readings']):
            row['timestamp_utc'] = f'2026-10-24T21:{52 + index}:00Z'
    elif mutation == 'unhealthy':
        inputs['readings'][-1]['sensor_health'] = 'DEGRADED'
    else:
        inputs['readings'] = inputs['readings'][:2] + inputs['readings'][4:]
    result = assess_preventive(inputs)
    assert result['assessment_status'] == 'INSUFFICIENT_DATA'
    assert result['condition_priority'] == result['service_state'] == 'UNKNOWN'
    assert result['readiness'] == 'UNKNOWN'
    assert result['validation_errors']
    assert not result['outage_confirmed']


@pytest.mark.parametrize('bad_value', [math.nan, math.inf, -math.inf, True, 'hot'])
def test_temperature_must_be_finite_numeric_evidence(bad_value):
    inputs = profile()
    inputs['readings'][-1]['temperature_c'] = bad_value
    result = assess_preventive(inputs)
    assert result['assessment_status'] == 'INSUFFICIENT_DATA'
    assert result['validation_errors']


@pytest.mark.parametrize('mutation', ['foreign_asset', 'future', 'reversed', 'duplicate', 'no_timezone', 'unsupported_kind', 'static_source'])
def test_evidence_binding_order_and_source_boundaries(mutation):
    inputs = profile('persistent_multisensor')
    if mutation == 'foreign_asset':
        inputs['readings'][-1]['asset_id'] = 'ASSET-OTHER'
    elif mutation == 'future':
        inputs['readings'][-1]['timestamp_utc'] = '2026-10-24T22:01:00Z'
    elif mutation == 'reversed':
        inputs['readings'].reverse()
    elif mutation == 'duplicate':
        inputs['readings'][-1]['timestamp_utc'] = inputs['readings'][-2]['timestamp_utc']
    elif mutation == 'no_timezone':
        inputs['as_of_utc'] = '2026-10-24T22:00:00'
    elif mutation == 'unsupported_kind':
        inputs['asset_kind'] = 'CIRCUIT_BREAKER'
    else:
        inputs['readings'][-1]['provenance'] = 'aep_challenge'
    result = assess_preventive(inputs)
    assert result['condition_priority'] == 'UNKNOWN'
    assert result['validation_errors']
    assert result['indicators'] == []


def test_topology_counts_do_not_invent_risk_or_affected_outages():
    small = profile()
    small['dependency_context'] = {'affected_count_in_sample': 3, 'scope': 'selected_subnet', 'provenance': 'aep_challenge'}
    large = deepcopy(small)
    large['dependency_context']['affected_count_in_sample'] = 160
    a, b = assess_preventive(small), assess_preventive(large)
    assert a['condition_priority'] == b['condition_priority'] == 'ROUTINE'
    assert a['dependency_context']['affected_count_in_sample'] == 3
    assert b['dependency_context']['affected_count_in_sample'] == 160
    assert not a['outage_confirmed'] and not b['outage_confirmed']


def test_persistent_acoustic_alarm_is_reviewed_even_in_the_reference_period():
    inputs = profile('storm_ready')
    inputs['weather']['wind_mph'] = 10
    for row in inputs['readings']:
        row['acoustic_anomaly'] = True
    result = assess_preventive(inputs)
    assert result['condition_priority'] == 'MONITOR'
    assert result['indicators'][2]['persistent'] is True


def test_no_weather_does_not_invent_a_storm_forecast():
    inputs = profile()
    del inputs['weather']
    result = assess_preventive(inputs)
    assert result['assessment_status'] == 'AVAILABLE'
    assert result['condition_priority'] == 'ROUTINE'
    assert result['readiness'] == 'NOT_PROVIDED'
    assert result['service_state'] == 'NORMAL'


@pytest.mark.parametrize('field', ['temperature_c', 'wind_mph'])
@pytest.mark.parametrize('huge_integer', [10 ** 400, -(10 ** 400)])
def test_json_integers_beyond_float_range_abstain_without_overflow(field, huge_integer):
    inputs = profile()
    target = inputs['weather'] if field == 'wind_mph' else inputs['readings'][-1]
    target[field] = huge_integer
    result = assess_preventive(inputs)
    assert result['assessment_status'] == 'INSUFFICIENT_DATA'
    assert result['service_state'] == 'UNKNOWN'
    assert result['validation_errors']
    assert result['outage_confirmed'] is False
    json.dumps(result, allow_nan=False)


def test_a_stable_unverified_reference_is_not_a_service_health_certification():
    inputs = profile('storm_ready')
    inputs['weather']['wind_mph'] = 10
    for row in inputs['readings']:
        row.update(temperature_c=95, vibration_mm_s=10)
    result = assess_preventive(inputs)
    assert result['condition_priority'] == 'ROUTINE'  # No relative change; no invented absolute equipment limit.
    assert result['service_state_basis'] == 'modeled_condition_outlook_not_verified_service'
    assert 'not a certified healthy baseline' in ' '.join(result['assumptions'])
    assert 'not a certified healthy baseline' in result['evidence_confidence']['basis']
    assert result['fault_probability'] is None


def test_demo_assets_are_injected_and_series_can_shift_as_a_whole():
    first = demo_profile('warming', 'ASSET-ONE', as_of_utc=NOW)
    second = demo_profile('warming', 'ASSET-TWO', as_of_utc='2026-10-25T08:00:00Z')
    assert {r['asset_id'] for r in first['readings']} == {'ASSET-ONE'}
    assert {r['asset_id'] for r in second['readings']} == {'ASSET-TWO'}
    assert second['readings'][-1]['timestamp_utc'] == second['as_of_utc']
    assert assess_preventive(first)['condition_priority'] == assess_preventive(second)['condition_priority'] == 'MONITOR'
    assert 'failure' not in first and 'expected_priority' not in first
    with pytest.raises(ValueError):
        demo_profile('not-a-profile', ASSET)


def test_model_is_pure_and_its_output_is_strict_json():
    inputs = profile('persistent_multisensor')
    original = deepcopy(inputs)
    first = assess_preventive(inputs)
    assert inputs == original
    assert first == assess_preventive(inputs)
    assert json.loads(json.dumps(first, allow_nan=False)) == first
    first['thresholds']['temperature_change_c'] = 999
    assert assess_preventive(inputs)['thresholds']['temperature_change_c'] == 8
    assert assess_preventive(profile('unknown'))['condition_priority'] == 'UNKNOWN'
