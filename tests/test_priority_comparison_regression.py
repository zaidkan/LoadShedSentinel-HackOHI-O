"""Source-group units, canonical criticality and task-ID timing regressions."""
from types import SimpleNamespace

import pytest

from engine.aep_impact import AEPImpact
from engine.scenarios import generate_scenario

EXPECTED_PERSON_HOURS = (1.1880851063829778 + .8061276595744681) * 4.5


def compare(monkeypatch, hospital_premises, routine_premises, facility_count=4, **planning):
    memberships = {'ASSET-HOSP': hospital_premises, 'ASSET-ROUTINE': routine_premises}
    facilities = [{'facility_token': f'CF-HOSPITAL-{i}', 'kind': 'HOSPITAL', 'status': 'ASSUMED'} for i in range(facility_count)]
    source = SimpleNamespace(
        assets={key: {'kind': 'TRANSFORMER'} for key in memberships},
        affected=lambda token: memberships[token],
        affected_critical_facilities=lambda token: {'critical_facilities': facilities if token == 'ASSET-HOSP' else []},
    )
    monkeypatch.setattr(AEPImpact, 'load', classmethod(lambda cls: source))
    context = {'current_asset_id': 'ASSET-HOSP', 'upstream_asset_id': 'ASSET-CB',
               'local_premise_tokens': ['P-LOCAL'], 'feeder_premise_tokens': ['P-LOCAL', 'P-OTHER'], **planning}
    return generate_scenario('confirmed_replacement', context).restoration.priority_comparison


def test_actual_canonical_hospital_records_activate_a_source_group_comparison():
    source = AEPImpact.load()
    hospitals = [token for token, node in source.assets.items() if node['kind'] == 'TRANSFORMER'
                 and any(f.get('kind') == 'HOSPITAL' for f in source.affected_critical_facilities(token)['critical_facilities'])]
    if not hospitals:
        pytest.skip('No declared hospital association in this source snapshot; no fabricated comparison required')
    result = generate_scenario('confirmed_replacement', source.scenario_context('confirmed_replacement', hospitals[0])).restoration.priority_comparison
    assert result['enabled']
    a, b = result['groups']
    assert set(a['premise_tokens']) == set(source.affected(a['asset_token']))
    assert set(b['premise_tokens']) == set(source.affected(b['asset_token']))
    assert not set(a['premise_tokens']) & set(b['premise_tokens'])
    assert result['total_customer_count'] == len(set(a['premise_tokens']) | set(b['premise_tokens']))


def test_hospital_count_is_not_used_as_customer_count_and_work_is_sourced(monkeypatch):
    result = compare(monkeypatch, ['PREM-H'], ['PREM-A', 'PREM-B', 'PREM-C'], facility_count=4)
    assert result['enabled']
    assert result['groups'][0]['customer_count'] == 1
    assert result['critical_facility_count'] == 4
    assert result['person_hours_per_job'] == pytest.approx(EXPECTED_PERSON_HOURS)
    assert result['total_person_hours'] == pytest.approx(2 * EXPECTED_PERSON_HOURS)
    assert result['workbook_refs'][0]['sheet'] == 'Labor time material related'
    assert result['workbook_refs'][0]['cells'] == ['C21', 'D21']
    for arm in ('hospital_first', 'unprioritized'):
        jobs = result[arm]['task_schedule']
        first, second = jobs
        assert result['scope'] == 'separate_two_concurrent_transformer_repair_scenario'
        assert second['start_hours'][1] >= first['end_hours'][1]
        assert result[arm]['total_finish_hours'] == pytest.approx(2 * EXPECTED_PERSON_HOURS / 3)
    assert result['hospital_hours_saved'] == pytest.approx(EXPECTED_PERSON_HOURS / 3)
    assert result['cmi_change_prioritized_minus_baseline'] > 0  # Critical first delays more ordinary customers here.


def test_same_baseline_order_means_zero_hospital_benefit(monkeypatch):
    result = compare(monkeypatch, ['PREM-H1', 'PREM-H2', 'PREM-H3'], ['PREM-A'])
    assert result['hospital_first']['sequence'] == result['unprioritized']['sequence']
    assert result['hospital_first']['hospital_finish_hours'] == result['unprioritized']['hospital_finish_hours']
    assert result['hospital_hours_saved'] == 0
    assert result['cmi_change_prioritized_minus_baseline'] == 0
    for arm in ('hospital_first', 'unprioritized'):
        actual = next(t for t in result[arm]['task_schedule'] if t['id'] == 'hospital_service')['end_hours'][1]
        assert result[arm]['hospital_finish_hours'] == actual


def test_customer_hours_include_a_shared_declared_energization_gate(monkeypatch):
    plain = compare(monkeypatch, ['PREM-H'], ['PREM-A', 'PREM-B'])
    delayed = compare(monkeypatch, ['PREM-H'], ['PREM-A', 'PREM-B'], energization_hours=2)
    for arm in ('hospital_first', 'unprioritized'):
        assert delayed[arm]['customer_hours'] == pytest.approx(plain[arm]['customer_hours'] + 3 * 2)
        assert delayed[arm]['hospital_release_planning_hours'] == pytest.approx(delayed[arm]['hospital_finish_hours'] + 2)
    assert delayed['hospital_hours_saved'] == plain['hospital_hours_saved']


def test_overlapping_source_groups_are_not_counted_as_separate_repairs(monkeypatch):
    result = compare(monkeypatch, ['PREM-H', 'PREM-SHARED'], ['PREM-A', 'PREM-SHARED'])
    assert not result['enabled']
    assert result['groups'] == []


def test_no_hospital_association_does_not_invent_criticality(monkeypatch):
    result = compare(monkeypatch, ['PREM-H'], ['PREM-A'], facility_count=0)
    assert not result['enabled']
    assert result['hospital_first'] is None and result['unprioritized'] is None

