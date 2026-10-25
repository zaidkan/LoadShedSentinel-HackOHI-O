"""Deterministic incident demos over AEP-supplied dependency paths, not live outages.

Default scenarios use the sanitized AEP challenge sample to derive impacted premises.
Explicit legacy footprint overrides remain for pure unit tests; the API never uses them.
Restoration durations and sensor readings are still separately modeled assumptions.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re

from api.schemas import ScenarioSnapshot
from engine.crew import recommend_crew
from engine.diagnosis import assess_incident
from engine.energy import simulate_energy
from engine.outage_risk import calculate_outage_risk
from engine.restoration import estimate_restoration, schedule_tasks
from pipeline.import_labor import load_labor_catalog, map_damage_to_work_packages

SCENARIO_IDS = ('local_protection', 'upstream_feeder', 'confirmed_replacement', 'insufficient_evidence')
_CONTEXT_KEYS = {
    'timestamp_utc', 'incident_id', 'current_asset_id', 'upstream_asset_id', 'revision',
    'selected_premise_token', 'local_premise_tokens', 'feeder_premise_tokens',
    'crew_size', 'queue_hours', 'access_hours', 'energization_hours', 'duration_factors',
    'source_impact', 'risk_inputs',
}


def _identifier(value, name, *, premise=False):
    pattern = r'(?:P|PREM)-[A-Za-z0-9][A-Za-z0-9_-]{0,63}' if premise else r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}'
    if not isinstance(value, str) or not re.fullmatch(pattern, value):
        raise ValueError('Invalid ' + name)
    return value


def _premises(values, name):
    if not isinstance(values, list) or not 1 <= len(values) <= 200000:
        raise ValueError(name + ' requires 1..200000 unique public premise tokens')
    result = [_identifier(value, name, premise=True) for value in values]
    if len(set(result)) != len(result): raise ValueError('Duplicate ' + name)
    return sorted(result)


def _integer(value, name, maximum):
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= maximum:
        raise ValueError(name + ' must be a positive bounded integer')
    return value


def generate_scenario(scenario_id: str, context: dict) -> ScenarioSnapshot:
    """Synthesize evidence, review-only work packages and disclosed planning ranges.

The confirmed replacement declares one 25-kVA transformer construction unit,
sourced from the workbook. Its rating is a scenario assumption, not a verified
GIS attribute. Other scenarios have no selected repair workload or duration.
"""
    if not isinstance(scenario_id, str) or scenario_id not in SCENARIO_IDS:
        raise ValueError('Unknown demonstration scenario')
    if not isinstance(context, dict) or set(context) - _CONTEXT_KEYS:
        raise ValueError('Unknown context keys or context is not a dictionary')
    # Neither the default app nor judges' API should silently fall back to P-DEMO
    # groups. A missing/corrupt AEP sample fails closed instead.
    if 'local_premise_tokens' not in context and 'feeder_premise_tokens' not in context:
        from engine.aep_impact import AEPImpact
        context = {**AEPImpact.load().scenario_context(scenario_id), **context}
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
    source_impact = context.get('source_impact')
    if source_impact is not None:
        if not isinstance(source_impact, dict) or source_impact.get('provenance') != 'aep_challenge':
            raise ValueError('Invalid source impact metadata')
        if source_impact.get('affected_count_in_sample') != len(footprint):
            raise ValueError('Source footprint count does not match supplied paths')
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
    schedule_tasks([dict(id='validate_inputs', person_hours=0, crew_size=crew_size,
                         dependencies=[])], planning)
    planning['crew_size'] = crew_size
    if scenario_id == 'confirmed_replacement':
        catalog = load_labor_catalog()
        damage = dict(asset_type='Transformer', transformer_kva=25, quantity=1,
                      quantity_unit='construction_unit', operation='replace')
        mapped = map_damage_to_work_packages(damage, catalog)
        package = next(iter(mapped['work_packages']), None)
        restoration = estimate_restoration(package, package['labor_ref'] if package else None, planning)
        restoration['assumptions'].insert(0,
            f'Declared scenario package for asset={asset}: one 25-kVA transformer, replace, '
            'quantity=1 construction_unit; rating is not verified from GIS. '
            'Workbook category average, subject to dispatcher review; associated equipment '
            'and assessment labor are outside this selected transformer component scope.')
        restoration['assumptions'].append(
            f'Single indirect allowance source={catalog["basis_evidence"]}; '
            'no separate travel, safety or setup allowance is added.')

        # F02: Multi-section priority scheduling comparison
        # Compare hospital-first scheduling vs unprioritized FIFO for 3-person crew
        hosp_tasks = [
            dict(id='hospital_service', person_hours=3.0, crew_size=crew_size, crew_id='crew-1',
                 criticality=['hospital'], customer_count=1, dependencies=[]),
            dict(id='feeder_branch', person_hours=6.0, crew_size=crew_size, crew_id='crew-1',
                 criticality=['routine'], customer_count=15, dependencies=[])
        ]
        hosp_plan = schedule_tasks(hosp_tasks, planning)
        unp_tasks = [
            dict(id='feeder_branch', person_hours=6.0, crew_size=crew_size, crew_id='crew-1',
                 criticality=['routine'], customer_count=15, dependencies=[]),
            dict(id='hospital_service', person_hours=3.0, crew_size=crew_size, crew_id='crew-1',
                 criticality=['routine'], customer_count=1, dependencies=['feeder_branch'])
        ]
        unp_plan = schedule_tasks(unp_tasks, planning)

        fac_count = 0
        if source_impact and isinstance(source_impact.get('critical_facility_impact'), dict):
            fac_count = source_impact['critical_facility_impact'].get('facility_count', 0)

        restoration['priority_comparison'] = {
            'enabled': True,
            'hospital_first': {
                'sequence': hosp_plan['task_order'],
                'hospital_finish_hours': round(hosp_plan['task_schedule'][0]['end_hours'][1], 2),
                'total_finish_hours': round(hosp_plan['full_repair_hours'][1], 2),
            },
            'unprioritized': {
                'sequence': unp_plan['task_order'],
                'hospital_finish_hours': round(unp_plan['task_schedule'][1]['end_hours'][1], 2),
                'total_finish_hours': round(unp_plan['full_repair_hours'][1], 2),
            },
            'critical_facility_count': fac_count,
            'rationale': (
                f'With {crew_size}-worker crew, prioritizing hospital restores critical healthcare at '
                f'{round(hosp_plan["task_schedule"][0]["end_hours"][1], 2)}h vs '
                f'{round(unp_plan["task_schedule"][1]["end_hours"][1], 2)}h unprioritized, '
                f'maintaining identical {round(hosp_plan["full_repair_hours"][1], 2)}h total completion.'
            )
        }
        restoration['assumptions'].append(restoration['priority_comparison']['rationale'])
    else:
        restoration = estimate_restoration(None, None, planning)
        restoration['assumptions'].insert(0,
            'Contradictory telemetry: assess before choosing a repair package or restoration range.'
            if scenario_id == 'insufficient_evidence' else
            'No repair construction unit has been selected for this protection/interruption scenario; '
            'assessment is required before assigning a sourced workload or duration.')

    solar = simulate_energy({'initial_soc_pct': 85}, {},
                            {'start_utc': (date - timedelta(hours=1)).isoformat(), 'hours': 1, 'connectivity': 'ONLINE'})['solar']
    uncertain = scenario_id == 'insufficient_evidence'
    notifications = []
    scope_note = ('Premise dependency footprint computed from anonymized AEP challenge upstream paths '
                  'in a 16-premise selected subnet, NOT a territory-wide affected count or live outage. '
                  if source_impact is not None else
                  'Premise groups are declared test inputs, not inferred connectivity. ')
    return ScenarioSnapshot(
        scenario_id=scenario_id, incident_id=incident, revision=revision, current_asset_id=asset,
        selected_premise_token=selected, timestamp_utc=timestamp, cutout_status=cutout,
        status='UNDER_REVIEW' if uncertain else 'OUTAGE', evidence=evidence, hypotheses=diagnosis['hypotheses'],
        crew_recommendation=crew, restoration=restoration, solar=solar,
        affected_premise_tokens=[] if uncertain else list(footprint),
        impact_source=source_impact,
        customer_risk=calculate_outage_risk(
            context.get('risk_inputs', {
                # Declared storm/operating assumptions, not observations from AEP.
                'wind_kph': 70, 'ambient_temperature_c': 35,
                'transformer_load_factor': 1.15 if scenario_id == 'confirmed_replacement' else .95,
                'health_index': 35 if scenario_id == 'confirmed_replacement' else 80,
            }), conflicting_evidence=uncertain),
        planning_inputs=dict(crew_size=crew_size, access_hours=planning.get('access_hours', 0.0)),
        notifications=notifications,
        disclosure='Demonstration only: modeled telemetry and scenario field findings, not live AEP observations. '
                   + scope_note + 'Planning ranges are not utility commitments; '
                   'crew approval remains false. Solar node uses illustrative 85% initial charge and one hour without harvest; '
                   'modeled runtime is not verified hardware endurance.')
