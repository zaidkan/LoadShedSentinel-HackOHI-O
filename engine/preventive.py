"""Pre-outage condition screening over supplied readings, not a trained predictor.

All thresholds and the ambient/load correction are illustrative demo assumptions.
The caller verifies the public asset and supplies dependency context separately.
No result confirms an outage, predicts a failure time, dispatches or operates assets.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import math
from pathlib import Path
import re

MODEL_VERSION = 'preventive_demo_v1'
DEMO_PATH = Path(__file__).resolve().parents[1] / 'data/processed/preventive_demo.json'
THRESHOLDS = {
    'baseline_samples': 2, 'minimum_samples': 6, 'minimum_span_minutes': 40,
    'maximum_age_minutes': 15, 'maximum_gap_minutes': 20,
    'persistence_samples': 3, 'persistence_minutes': 20,
    'temperature_rise_intercept_c': 10, 'temperature_rise_per_load_pct_c': .2,
    'temperature_change_c': 8, 'warming_trend_c': 5,
    'vibration_ratio': 1.8, 'vibration_change_mm_s': .5,
    'storm_wind_mph': 40,
}
ASSUMPTIONS = [
    'Deterministic demo rules, not trained AI, calibrated failure probabilities or validated equipment limits.',
    'Ambient/load correction: case temperature minus ambient minus (10 + 0.2 * load percent) C; this illustrative proxy is not a thermal standard.',
    'The first two readings from sensors reporting OK supply a comparison reference only, not a certified healthy baseline or proof of healthy equipment. Compare with the last three readings over at least 20 minutes.',
    'Thresholds, sampling cadence and the 40 mph readiness threshold are editable demonstration assumptions, not study-validated limits or a weather forecast.',
    'Dependency counts are caller-supplied topology context, not predicted outages. A condition warning does not establish that service will fail.',
    'No automatic dispatch, shutdown, re-energization or restoration; qualified inspection and human utility review remain necessary.',
]


def _date(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError('timezone required')
        return parsed.astimezone(timezone.utc)
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError('A timezone-aware timestamp is required') from exc


def _stamp(value):
    return value.isoformat().replace('+00:00', 'Z')


def _number(value, name, low, high):
    # Bound Python integers before math.isfinite converts them to float: a valid
    # JSON integer can exceed the float range and must abstain, not raise overflow.
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high or not math.isfinite(value):
        raise ValueError(f'{name} must be finite and within {low}..{high}')
    return float(value)


def assess_preventive(inputs: dict) -> dict:
    """Pure JSON-in/out condition/readiness assessment; invalid evidence abstains.

Inputs: asset_id (public ASSET- token), asset_kind=TRANSFORMER,
asset_provenance=aep_challenge/authorized_enterprise, as_of_utc, readings[].
Each reading binds asset_id, timestamp_utc, provenance=modeled_sensor/scenario/
authorized_enterprise, sensor_health=OK/DEGRADED/OFFLINE, temperature_c,
ambient_c, load_pct, vibration_mm_s and acoustic_anomaly (boolean).
Optional weather={wind_mph, provenance=scenario/authorized_enterprise}; optional
dependency_context={affected_count_in_sample, scope, provenance} is not scored.
"""
    inputs = inputs if isinstance(inputs, dict) else {}
    result = {
        'model_version': MODEL_VERSION, 'asset_id': inputs.get('asset_id'),
        'as_of_utc': inputs.get('as_of_utc'), 'service_state': 'UNKNOWN',
        'service_state_basis': 'modeled_condition_outlook_not_verified_service',
        'assessment_status': 'INSUFFICIENT_DATA', 'condition_priority': 'UNKNOWN',
        'readiness': 'UNKNOWN', 'fault_probability': None,
        'predicted_failure_time_utc': None, 'predicted_outage_start_utc': None,
        'outage_confirmed': False, 'indicators': [], 'findings': [],
        'coverage': {'received_samples': 0, 'usable_samples': 0, 'usable_fraction': 0,
                     'span_minutes': None, 'latest_age_minutes': None},
        'evidence_confidence': {'level': 'INSUFFICIENT', 'basis': 'Missing or unusable current evidence.'},
        'dependency_context': None, 'validation_errors': [],
        'recommendation': {'capabilities': ['qualified distribution condition assessment'],
                           'human_review_required': True, 'approved': False, 'dispatch': False},
        'customer_message': 'Condition outlook unavailable. There is no confirmed outage from this assessment; use official utility status and preparation channels.',
        'threshold_basis': 'unvalidated_demo_assumptions',
        'thresholds': dict(THRESHOLDS), 'assumptions': list(ASSUMPTIONS),
    }
    errors = result['validation_errors']
    try:
        if not isinstance(inputs.get('asset_id'), str) or not re.fullmatch(r'ASSET-[A-Za-z0-9_-]{1,80}', inputs['asset_id']):
            raise ValueError('A verified public ASSET- token is required')
        if inputs.get('asset_kind') != 'TRANSFORMER':
            raise ValueError('Unsupported asset kind; this demo screens transformers only')
        if inputs.get('asset_provenance') not in ('aep_challenge', 'authorized_enterprise'):
            raise ValueError('Verified asset context is required; sensor data do not establish topology')
        now = _date(inputs.get('as_of_utc'))
        result['as_of_utc'] = _stamp(now)
        dependency = inputs.get('dependency_context')
        if dependency is not None:
            count = dependency.get('affected_count_in_sample') if isinstance(dependency, dict) else None
            if isinstance(count, bool) or not isinstance(count, int) or count < 0 or dependency.get('scope') != 'selected_subnet' or dependency.get('provenance') != 'aep_challenge':
                raise ValueError('Dependency context requires a nonnegative sample count and declared source/scope')
            result['dependency_context'] = {key: dependency[key] for key in ('affected_count_in_sample', 'scope', 'provenance')}
        weather = inputs.get('weather')
        wind = None
        if weather is not None:
            if not isinstance(weather, dict) or weather.get('provenance') not in ('scenario', 'authorized_enterprise'):
                raise ValueError('Weather requires declared scenario or authorized-feed provenance')
            wind = _number(weather.get('wind_mph'), 'wind_mph', 0, 250)
        rows = inputs.get('readings')
        if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
            raise ValueError('Supply 1..500 time-ordered readings')
        result['coverage']['received_samples'] = len(rows)
        healthy = []; previous = None
        for row in rows:
            if not isinstance(row, dict) or row.get('asset_id') != inputs['asset_id']:
                raise ValueError('Every reading must bind to the selected asset')
            date = _date(row.get('timestamp_utc'))
            if date > now:
                raise ValueError('Future observations cannot support a current assessment')
            if previous is not None and date <= previous:
                raise ValueError('Reading timestamps must be strictly increasing without duplicates')
            previous = date
            if row.get('provenance') not in ('modeled_sensor', 'scenario', 'authorized_enterprise'):
                raise ValueError('Reading provenance must identify modeled or authorized sensor inputs')
            if row.get('sensor_health') not in ('OK', 'DEGRADED', 'OFFLINE'):
                raise ValueError('Explicit sensor health is required')
            if row['sensor_health'] != 'OK':
                continue
            try:
                temp = _number(row.get('temperature_c'), 'temperature_c', -60, 200)
                ambient = _number(row.get('ambient_c'), 'ambient_c', -60, 70)
                load = _number(row.get('load_pct'), 'load_pct', 0, 200)
                vibration = _number(row.get('vibration_mm_s'), 'vibration_mm_s', 0, 100)
                if not isinstance(row.get('acoustic_anomaly'), bool):
                    raise ValueError('acoustic_anomaly must be boolean')
            except ValueError as exc:
                errors.append(f'{_stamp(date)}: {exc}')
                continue
            healthy.append({'timestamp': date, 'temperature_residual_c': temp - ambient - (10 + .2 * load),
                            'vibration_mm_s': vibration, 'acoustic_anomaly': row['acoustic_anomaly'],
                            'provenance': row['provenance']})
        coverage = result['coverage']
        coverage.update(usable_samples=len(healthy), usable_fraction=round(len(healthy) / len(rows), 3))
        if healthy:
            coverage.update(span_minutes=(healthy[-1]['timestamp'] - healthy[0]['timestamp']).total_seconds() / 60,
                            latest_age_minutes=(now - healthy[-1]['timestamp']).total_seconds() / 60)
        if errors:
            raise ValueError('Incomplete/invalid sensor values; repair the evidence before drawing a condition conclusion')
        if len(healthy) < THRESHOLDS['minimum_samples'] or coverage['usable_fraction'] < .75:
            raise ValueError('Insufficient healthy samples for a baseline and persistence comparison')
        if rows[-1]['sensor_health'] != 'OK' or coverage['latest_age_minutes'] > THRESHOLDS['maximum_age_minutes']:
            raise ValueError('Latest sensor state is unhealthy or readings are stale')
        if coverage['span_minutes'] < THRESHOLDS['minimum_span_minutes']:
            raise ValueError('Observation window is too short to assess persistence')
        if any((b['timestamp'] - a['timestamp']).total_seconds() / 60 > THRESHOLDS['maximum_gap_minutes'] for a, b in zip(healthy, healthy[1:])):
            raise ValueError('Gaps exceed the declared demonstration sampling cadence')
        baseline, recent = healthy[:2], healthy[-3:]
        if (recent[-1]['timestamp'] - recent[0]['timestamp']).total_seconds() / 60 < THRESHOLDS['persistence_minutes']:
            raise ValueError('Recent readings do not span the required persistence window')
        temp_base = sum(r['temperature_residual_c'] for r in baseline) / 2
        vibration_base = sum(r['vibration_mm_s'] for r in baseline) / 2
        changes = [r['temperature_residual_c'] - temp_base for r in recent]
        vibration_threshold = max(vibration_base * THRESHOLDS['vibration_ratio'], vibration_base + THRESHOLDS['vibration_change_mm_s'])
        temp_persistent = all(v >= THRESHOLDS['temperature_change_c'] for v in changes)
        vibration_persistent = all(r['vibration_mm_s'] >= vibration_threshold for r in recent)
        acoustic_persistent = all(r['acoustic_anomaly'] for r in recent)
        warming = changes[-1] >= THRESHOLDS['warming_trend_c'] and changes[0] < changes[1] < changes[2]
        stamps = [_stamp(r['timestamp']) for r in recent]
        result['indicators'] = [
            {'name': 'ambient_load_adjusted_temperature', 'baseline_residual_c': round(temp_base, 3),
             'recent_changes_c': [round(v, 3) for v in changes], 'persistent': temp_persistent,
             'warming_trend': warming, 'supporting_timestamps_utc': stamps},
            {'name': 'vibration', 'baseline_mm_s': round(vibration_base, 3),
             'recent_mm_s': [r['vibration_mm_s'] for r in recent], 'persistent': vibration_persistent,
             'supporting_timestamps_utc': stamps},
            {'name': 'acoustic_anomaly', 'recent_flags': [r['acoustic_anomaly'] for r in recent],
             'persistent': acoustic_persistent, 'supporting_timestamps_utc': stamps},
        ]
        persistent_count = sum([temp_persistent, vibration_persistent, acoustic_persistent])
        priority = 'INSPECT' if persistent_count >= 2 else 'MONITOR' if persistent_count or warming else 'ROUTINE'
        readiness = 'PREPARE' if wind is not None and wind >= THRESHOLDS['storm_wind_mph'] else 'ROUTINE' if wind is not None else 'NOT_PROVIDED'
        result.update(assessment_status='AVAILABLE', condition_priority=priority, readiness=readiness,
                      service_state='AT_RISK' if priority != 'ROUTINE' or readiness == 'PREPARE' else 'NORMAL')
        modeled = any(r['provenance'] in ('modeled_sensor', 'scenario') for r in healthy)
        result['evidence_confidence'] = {
            'level': 'DEMONSTRATION_ONLY' if modeled else 'RULE_BASED_UNCALIBRATED',
            'basis': 'Current, asset-bound series from sensors reporting OK support a comparison, not a certified healthy baseline; failure prediction accuracy is unvalidated.',
        }
        result['findings'] = [
            f'{persistent_count} of three indicators persist beyond the declared demo thresholds.',
            'Readiness uses a supplied wind assumption, not an integrated weather forecast.' if wind is not None else 'Storm readiness was not assessed because no weather context was supplied.',
        ]
        if priority == 'INSPECT':
            result['recommendation']['capabilities'] = ['qualified distribution condition inspection', 'review temperature, load and mechanical/acoustic evidence']
            result['customer_message'] = 'Modeled readings show persistent condition changes. Qualified utility inspection is recommended for human review. An outage and its start time are not confirmed.'
        elif priority == 'MONITOR':
            result['customer_message'] = 'A modeled condition trend needs continued monitoring and utility review. This does not establish that an outage will occur.'
        else:
            result['customer_message'] = 'No persistent change was detected relative to this demonstration baseline. This is not a guarantee against an outage.'
        if readiness == 'PREPARE':
            result['customer_message'] += ' The selected wind scenario also raises storm preparation readiness; it does not confirm an outage.'
    except (ValueError, TypeError, KeyError) as exc:
        errors.append(str(exc))
        result['findings'] = ['Abstained from condition and storm conclusions because the evidence is insufficient.']
    return result


def demo_profile(profile_id: str, asset_id: str, *, as_of_utc: str | None = None) -> dict:
    """Bind explicitly modeled fixture series to a caller-verified public asset.

Optional as_of_utc shifts every sample together; no future failure/event label is
passed to the model. The helper does not itself verify membership in AEP data.
"""
    fixture = json.loads(DEMO_PATH.read_text(encoding='utf-8'))
    if profile_id not in fixture['profiles']:
        raise ValueError('Unknown preventive demo profile')
    if not isinstance(asset_id, str) or not re.fullmatch(r'ASSET-[A-Za-z0-9_-]{1,80}', asset_id):
        raise ValueError('A public ASSET- token is required')
    profile = fixture['profiles'][profile_id]
    now = _date(as_of_utc or fixture['as_of_utc'])
    fields = ('temperature_c', 'ambient_c', 'load_pct', 'vibration_mm_s', 'acoustic_anomaly', 'sensor_health')
    rows = [dict(asset_id=asset_id, timestamp_utc=_stamp(now + timedelta(minutes=offset)),
                 provenance='modeled_sensor', **{field: profile[field][i] for field in fields})
            for i, offset in enumerate(profile['offset_minutes'])]
    return {'asset_id': asset_id, 'asset_kind': 'TRANSFORMER', 'asset_provenance': 'aep_challenge',
            'as_of_utc': _stamp(now), 'readings': rows,
            'weather': {'wind_mph': profile['wind_mph'], 'provenance': 'scenario'}}
