"""Audit regressions: unit integrity, asset-bound confirmation and estimate updates."""
from copy import deepcopy

import pytest

from engine.crew import recommend_crew
from engine.diagnosis import assess_incident, usable_evidence
from engine.restoration import estimate_restoration
from pipeline.import_labor import map_damage_to_work_packages

NOW = '2026-10-24T18:00:00Z'
LATER = '2026-10-24T19:00:00Z'
REF = dict(code='CNC-TEST', install_hours=6, remove_hours=2,
           hour_basis='direct_job_site_hours', quantity_unit='construction_unit',
           source={'sheet': 'test fixture', 'cells': ['B2']})
DAMAGE = dict(quantity=1, quantity_unit='construction_unit', operation='install')


@pytest.mark.parametrize('unit', ['feet', 'foot', 'meter', 'cubic_foot', 'unknown', None, ''])
def test_explicit_incompatible_damage_units_never_become_construction_counts(unit):
    damage = dict(damage_code='CNC-TEST', asset_type='Conductor', quantity=100,
                  quantity_unit=unit, operation='install')
    original = deepcopy(damage)
    result = map_damage_to_work_packages(damage, {'records': [REF]})
    assert result['work_packages'] == []
    assert result['missing_inputs']
    assert damage == original


def test_linear_quantity_is_retained_only_with_matching_catalog_denominator():
    damage = dict(damage_code='LINEAR', asset_type='Conductor', quantity=100,
                  quantity_unit='feet', operation='install')
    ref = {**REF, 'code': 'LINEAR', 'quantity_unit': 'feet'}
    package = map_damage_to_work_packages(damage, {'records': [ref]})['work_packages'][0]
    assert package['quantity'] == 100
    assert package['quantity_unit'] == 'feet'
    assert estimate_restoration(package, ref, {'timestamp_utc': NOW, 'crew_size': 3})['expected_hours'] == 900


def test_count_defaults_cannot_invent_a_linear_or_unknown_denominator():
    damage = dict(damage_code='CNC-TEST', asset_type='Switch', quantity=10)
    for unit in ['feet', 'unknown', 'unspecified', None, '']:
        assert map_damage_to_work_packages(damage, {'records': [{**REF, 'quantity_unit': unit}]})['work_packages'] == []
    linear = dict(damage_code='CNC-TEST', asset_type='Conductor', quantity=100)
    assert map_damage_to_work_packages(linear, {'records': [REF]})['work_packages'] == []
    # Existing discrete asset count inputs remain supported.
    assert map_damage_to_work_packages(damage, {'records': [REF]})['work_packages'][0]['quantity_unit'] == 'construction_unit'


def field_snapshot():
    return dict(incident_id='i1', current_asset_id='a1', timestamp_utc=NOW,
                upstream_asset_ids=['upstream'], evidence=[dict(
                    id='field', incident_id='i1', asset_id='a1', timestamp_utc=NOW,
                    kind='field_damage', value='transformer', quality='field_confirmed',
                    provenance='authorized_enterprise')])


@pytest.mark.parametrize('binding', ['missing', None, '', 'other', 'upstream'])
def test_field_confirmation_requires_explicit_current_asset(binding):
    snapshot = field_snapshot()
    row = snapshot['evidence'][0]
    if binding == 'missing':
        row.pop('asset_id')
    else:
        row['asset_id'] = binding
    original = deepcopy(snapshot)
    rows, _ = usable_evidence(snapshot)
    assert rows == []
    diagnosis = assess_incident(snapshot)
    assert diagnosis['primary_code'] == 'INSUFFICIENT_EVIDENCE'
    assert recommend_crew(diagnosis, snapshot['evidence'])['basis'] == 'assessment_required'
    assert snapshot == original


@pytest.mark.parametrize('provenance', ['scenario', 'authorized_enterprise'])
def test_matching_field_confirmation_still_selects_review_only_replacement(provenance):
    snapshot = field_snapshot()
    snapshot['evidence'][0]['provenance'] = provenance
    diagnosis = assess_incident(snapshot)
    crew = recommend_crew(diagnosis, snapshot['evidence'])
    assert diagnosis['hypotheses'][0]['requires_field_confirmation'] is False
    assert crew['candidate_damage_class'] == 'transformer_replacement'
    assert crew['approved'] is False


def test_incident_wide_upstream_evidence_remains_usable_without_asset():
    snapshot = field_snapshot()
    snapshot['evidence'] = [{**snapshot['evidence'][0], 'kind': 'upstream_trip', 'value': True, 'asset_id': None}]
    assert assess_incident(snapshot)['primary_code'] == 'UPSTREAM_FEEDER_INTERRUPTION'


def test_recompute_crew_access_and_timestamp_from_original_workload():
    from engine.restoration import recompute_restoration
    context = dict(timestamp_utc=NOW, crew_size=3, queue_hours=2, energization_hours=1)
    inputs = deepcopy((DAMAGE, REF, context))
    result = recompute_restoration(DAMAGE, REF, context, crew_size=6,
                                   access_hours=[1, 2, 3], timestamp_utc=LATER)
    assert [result[k] for k in ['lower_hours', 'expected_hours', 'upper_hours']] == [7.375, 9.5, 12.75]
    assert result['labor_work_hours'] == 27
    assert result['last_updated_utc'] == LATER
    assert (DAMAGE, REF, context) == inputs
    assert recompute_restoration(DAMAGE, REF, context) == estimate_restoration(DAMAGE, REF, context)
    # Repeated updates consume source inputs, never compound the indirect multiplier.
    assert recompute_restoration(DAMAGE, REF, context, crew_size=6, access_hours=[1, 2, 3], timestamp_utc=LATER) == result


def test_recompute_tasks_preserves_dependencies_and_exclusive_crews():
    from engine.restoration import recompute_restoration
    tasks = [dict(id='a', person_hours=18, crew_size=3, crew_id='one', dependencies=[]),
             dict(id='b', person_hours=12, crew_size=3, crew_id='one', dependencies=[]),
             dict(id='c', person_hours=24, crew_size=3, crew_id='two', dependencies=['a'])]
    context = dict(timestamp_utc=NOW, tasks=tasks, duration_factors=[1, 1, 1])
    original = deepcopy(context)
    assert estimate_restoration(None, None, context)['expected_hours'] == 14
    result = recompute_restoration(None, None, context, crew_size=6, access_hours=[1, 2, 3])
    assert [result[k] for k in ['lower_hours', 'expected_hours', 'upper_hours']] == [8, 9, 10]
    assert result['labor_work_hours'] == 54
    assert context == original
    access_only = recompute_restoration(None, None, context, access_hours=2)
    assert access_only['expected_hours'] == 16


@pytest.mark.parametrize('overrides', [dict(crew_size=0), dict(crew_size=True), dict(crew_size=1.5),
                                      dict(access_hours=-1), dict(access_hours=[2, 1, 3])])
def test_recompute_invalid_updates_clear_numeric_ranges(overrides):
    from engine.restoration import recompute_restoration
    result = recompute_restoration(DAMAGE, REF, dict(timestamp_utc=NOW, crew_size=3), **overrides)
    assert result['kind'] == 'unavailable'
    assert all(result[k] is None for k in ['lower_hours', 'expected_hours', 'upper_hours'])


def test_recompute_cannot_turn_unknown_labor_into_an_estimate():
    from engine.restoration import recompute_restoration
    result = recompute_restoration(DAMAGE, None, {'timestamp_utc': NOW}, crew_size=6, access_hours=2)
    assert result['kind'] == 'unavailable'
    assert result['expected_hours'] is None
