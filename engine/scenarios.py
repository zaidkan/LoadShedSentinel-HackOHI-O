"""Pure, deterministic judging demonstrations; no live observations or dispatch.

generate_scenario(id, {}) uses fixed demo IDs/time. Context may override timestamp_utc,
incident_id, current_asset_id, upstream_asset_id, revision, selected_premise_token,
local_premise_tokens, feeder_premise_tokens, crew_size, queue_hours, access_hours,
energization_hours and duration_factors. Premise lists are declared scenario groups,
not inferred GIS connectivity. Return value is the authoritative ScenarioSnapshot.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re

from api.schemas import ScenarioSnapshot
from engine.crew import recommend_crew
from engine.diagnosis import assess_incident
from engine.energy import simulate_energy
from engine.restoration import estimate_restoration, labor_person_hours

SCENARIO_IDS = ('local_protection', 'upstream_feeder', 'confirmed_replacement', 'insufficient_evidence')
_CONTEXT_KEYS = {
    'timestamp_utc', 'incident_id', 'current_asset_id', 'upstream_asset_id', 'revision',
    'selected_premise_token', 'local_premise_tokens', 'feeder_premise_tokens',
    'crew_size', 'queue_hours', 'access_hours', 'energization_hours', 'duration_factors',
}


def _identifier(value, name, *, premise=False):
    pattern = r'P-[A-Za-z0-9][A-Za-z0-9_-]{0,63}' if premise else r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}'
    if not isinstance(value, str) or not re.fullmatch(pattern, value):
        raise ValueError('Invalid ' + name)
    return value


def _premises(values, name):
    if not isinstance(values, list) or not 1 <= len(values) <= 1000:
        raise ValueError(name + ' requires 1..1000 unique public premise tokens')
    result = [_identifier(value, name, premise=True) for value in values]
    if len(set(result)) != len(result): raise ValueError('Duplicate ' + name)
    return sorted(result)


def _integer(value, name, maximum):
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= maximum:
        raise ValueError(name + ' must be a positive bounded integer')
    return value


def generate_scenario(scenario_id: str, context: dict) -> ScenarioSnapshot:
    """Synthesize evidence, review-only work packages and disclosed planning ranges.

Direct person-hours (local=1, feeder=3, replacement=6) are illustrative scenario
assumptions, NOT workbook rates. The 4.5 allowance is applied once before dividing
by crew size. No contradictory-evidence case gets an outage confirmation or ETR.
"""
    if not isinstance(scenario_id, str) or scenario_id not in SCENARIO_IDS:
        raise ValueError('Unknown demonstration scenario')
    if not isinstance(context, dict) or set(context) - _CONTEXT_KEYS:
        raise ValueError('Unknown context keys or context is not a dictionary')
    raw_time = context.get('timestamp_utc', '2026-10-24T18:00:00Z')
    try:
        date = datetime.fromisoformat(raw_time.replace('Z', '+00:00'))
        if date.tzinfo is None or not 2000 <= date.year <= 2100: raise ValueError('Invalid scenario timestamp')
        date = date.astimezone(timezone.utc)
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError('timestamp_utc must be timezone-aware within years 2000..2100') from exc
    timestamp = date.isoformat().replace('+00:00', 'Z')
    incident = _identifier(context.get('incident_id', 'INC-DEMO-' + scenario_id.upper()), 'incident_id')
    asset = _identifier(context.get('current_asset_id', 'T-DEMO-104'), 'current_asset_id')
    upstream = _identifier(context.get('upstream_asset_id', 'R-DEMO-001'), 'upstream_asset_id')
    if asset == upstream: raise ValueError('Upstream and local device IDs must differ')
    revision = _integer(context.get('revision', 1), 'revision', 1_000_000)
    local = _premises(context.get('local_premise_tokens', [f'P-DEMO-{i:03d}' for i in range(1, 9)]), 'local_premise_tokens')
    feeder = _premises(context.get('feeder_premise_tokens', [f'P-DEMO-{i:03d}' for i in range(1, 33)]), 'feeder_premise_tokens')
    if not set(local) < set(feeder): raise ValueError('Feeder footprint must strictly contain local footprint')
    footprint = feeder if scenario_id == 'upstream_feeder' else local
    selected = _identifier(context.get('selected_premise_token', footprint[0]), 'selected_premise_token', premise=True)
    if selected not in footprint: raise ValueError('Selected premise is outside the declared scenario footprint')
    crew_size = _integer(context.get('crew_size', 2 if scenario_id == 'local_protection' else 3), 'crew_size', 100)

    evidence = []
    def add(kind, value, *, upstream_device=False, confirmation=False):
        evidence.append(dict(id=f'{incident}:{scenario_id}:E{len(evidence) + 1}', incident_id=incident,
                             asset_id=upstream if upstream_device else asset, timestamp_utc=timestamp,
                             kind=kind, value=value, provenance='scenario' if confirmation or upstream_device else 'modeled_sensor',
                             quality='field_confirmed' if confirmation else 'modeled', visibility='operator'))

    cutout = 'CLOSED' if scenario_id == 'upstream_feeder' else 'OPEN'
    add('cutout_state', cutout)
    add('temperature_state', 'HOT' if scenario_id == 'confirmed_replacement' else 'NORMAL')
    if scenario_id == 'upstream_feeder':
        add('upstream_trip', True, upstream_device=True)
        add('upstream_protection_state', 'OPEN', upstream_device=True)
        add('widespread_outage', True, upstream_device=True)
    elif scenario_id == 'confirmed_replacement':
        add('acoustic_anomaly', True)
        add('vibration_anomaly', True)
        add('oil_condition', 'boiling oil / internal distress in declared scenario', confirmation=True)
        add('field_damage', 'transformer', confirmation=True)
    elif scenario_id == 'insufficient_evidence':
        add('cutout_state', 'CLOSED')
        add('temperature_state', 'HOT')
        cutout = 'UNKNOWN'

    inputs = dict(incident_id=incident, current_asset_id=asset, timestamp_utc=timestamp,
                  upstream_asset_ids=[upstream], evidence=evidence)
    diagnosis = assess_incident(inputs)
    crew = recommend_crew(diagnosis, evidence)
    planning = {key: context[key] for key in ('queue_hours', 'access_hours', 'energization_hours', 'duration_factors') if key in context}
    planning['timestamp_utc'] = timestamp
    # Validate planning overrides even when uncertainty prevents an actual estimate.
    direct_hours = {'local_protection': 1, 'upstream_feeder': 3, 'confirmed_replacement': 6, 'insufficient_evidence': 1}[scenario_id]
    planning['tasks'] = [
        dict(id='assessment', person_hours=labor_person_hours(.5)['adjusted_person_hours'], crew_size=crew_size,
             crew_id='demo-crew', dependencies=[]),
        dict(id='work_package', person_hours=labor_person_hours(direct_hours - .5)['adjusted_person_hours'], crew_size=crew_size,
             crew_id='demo-crew', dependencies=['assessment']),
    ]
    restoration = estimate_restoration(None, None, planning)
    if restoration['kind'] == 'unavailable': raise ValueError('Invalid planning context: ' + '; '.join(restoration['assumptions']))
    if scenario_id == 'insufficient_evidence':
        restoration = estimate_restoration(None, None, {'timestamp_utc': timestamp})
        restoration['assumptions'].insert(0, 'Contradictory telemetry: assess before choosing a repair package or restoration range.')
    else:
        restoration['assumptions'].insert(0, f'Illustrative direct person-hours={direct_hours}; not workbook rates. Assessment then work package depend on human review; apply 4.5 once, crew size={crew_size}.')

    solar = simulate_energy({'initial_soc_pct': 85}, {},
                            {'start_utc': (date - timedelta(hours=1)).isoformat(), 'hours': 1, 'connectivity': 'ONLINE'})['solar']
    uncertain = scenario_id == 'insufficient_evidence'
    notifications = [] if uncertain else [dict(
        type='OUTAGE_CONFIRMED', delivery_mode='demo', sent_at_utc=timestamp,
        text='Declared demonstration outage for this scenario footprint; cause and work package remain subject to utility review. No real message sent.')]
    return ScenarioSnapshot(
        scenario_id=scenario_id, incident_id=incident, revision=revision, current_asset_id=asset,
        selected_premise_token=selected, timestamp_utc=timestamp, cutout_status=cutout,
        status='UNDER_REVIEW' if uncertain else 'OUTAGE', evidence=evidence, hypotheses=diagnosis['hypotheses'],
        crew_recommendation=crew, restoration=restoration, solar=solar,
        affected_premise_tokens=[] if uncertain else list(footprint),
        customer_risk=dict(band='UNKNOWN' if uncertain else 'HIGH', confidence_kind='scenario_only',
                           drivers=['Conflicting scenario telemetry; impact unconfirmed'] if uncertain else
                           ['Declared storm/outage demonstration', 'Declared feeder group' if scenario_id == 'upstream_feeder' else 'Declared local premise group']),
        notifications=notifications,
        disclosure='Demonstration only: modeled telemetry and scenario field findings, not live AEP observations. '
                   'Premise groups are declared, not inferred connectivity. Planning ranges are not utility commitments; '
                   'crew approval remains false. Solar node uses illustrative 85% initial charge and one hour without harvest; '
                   'modeled runtime is not verified hardware endurance.')
