"""LRP-126 regressions: source chain, priority and explicit incomplete pole scope."""
import copy

import pytest

from engine.restoration import schedule_tasks
from engine.scenarios import generate_scenario
from pipeline.import_labor import load_labor_catalog, map_damage_to_work_packages


def task(key, **extra):
    return dict(id=key, person_hours=3, crew_size=3, crew_id='limited', dependencies=[], **extra)


@pytest.mark.parametrize('criticality', ['hospital', 'fire', 'ambulance', ['hospital', 'fire']])
def test_critical_facility_finishes_before_routine_shared_crew_work(criticality):
    rows = [task('A-routine', customer_count=100), task('Z-critical', criticality=criticality, customer_count=1)]
    original = copy.deepcopy(rows)
    plan = schedule_tasks(rows, {'duration_factors': [1, 1, 1]})
    assert plan['task_order'] == ['Z-critical', 'A-routine']
    assert plan['task_schedule'][0]['end_hours'] == [1, 1, 1]
    assert plan['full_repair_hours'] == [2, 2, 2]
    assert plan['task_schedule'][0]['criticality']
    assert rows == original
    assert schedule_tasks(list(reversed(rows)), {'duration_factors': [1, 1, 1]}) == plan


def test_more_customers_win_before_alphabetic_id_with_equal_criticality():
    plan = schedule_tasks([task('A-small', customer_count=2), task('Z-large', customer_count=20)])
    assert plan['task_order'] == ['Z-large', 'A-small']
    assert plan['task_schedule'][0]['customer_count'] == 20


def test_priority_does_not_idle_available_crew_or_skip_dependency():
    rows = [dict(task('upstream'), crew_id='other', person_hours=30),
            dict(task('Z-hospital', criticality='hospital'), dependencies=['upstream']),
            task('A-routine')]
    plan = schedule_tasks(rows, {'duration_factors': [1, 1, 1]})
    by_id = {row['id']: row for row in plan['task_schedule']}
    assert by_id['A-routine']['start_hours'] == [0, 0, 0]
    assert by_id['Z-hospital']['start_hours'] == [10, 10, 10]
    assert plan['full_repair_hours'] == [11, 11, 11]


@pytest.mark.parametrize('extra', [dict(customer_count=-1), dict(customer_count=True), dict(customer_count=1.5),
                                  dict(criticality=42), dict(criticality=['hospital', 42])])
def test_invalid_priority_metadata_cannot_silently_schedule(extra):
    with pytest.raises(ValueError):
        schedule_tasks([task('bad', **extra)])


@pytest.mark.parametrize('phases', [1, 3])
def test_pole_replacement_exposes_unspecified_hardware_quantities(phases):
    catalog = load_labor_catalog()
    damage = dict(asset_type='Pole', pole_height_ft=45, phases=phases, quantity=2,
                  quantity_unit='construction_unit', operation='replace')
    mapped = map_damage_to_work_packages(damage, catalog)
    assert mapped['work_packages'][0]['labor_ref']['code'] == 'POL:Medium'
    assert mapped['structure_complete'] is False
    assert mapped['missing_inputs']
    hardware = {row['code']: row for row in mapped['omitted_hardware']}
    for code, cells in [('ARM', ['A3', 'B3']), ('INS', ['A60', 'B60']),
                        ('PIN', ['A65', 'B65']), ('GND', ['A45', 'B45'])]:
        assert hardware[code]['source']['sheet'] == 'Labor time material related'
        assert hardware[code]['source']['cells'] == cells
        assert hardware[code]['quantity'] is None
        assert hardware[code]['reason']
    assert len(mapped['work_packages']) == 1  # No invented hardware counts.


def test_source_cells_and_single_indirect_application_reach_typed_snapshot():
    catalog = load_labor_catalog()
    damage = dict(asset_type='Transformer', transformer_kva=25, quantity=1,
                  quantity_unit='construction_unit', operation='replace')
    package = map_damage_to_work_packages(damage, catalog)['work_packages'][0]
    ref = package['labor_ref']
    assert ref['source']['cells'] == ['C21', 'D21']
    assert ref['install_hours'] == pytest.approx(1.1880851063829778)
    assert ref['remove_hours'] == pytest.approx(0.8061276595744681)
    for workers, elapsed in [(2, 4.4869787234042535), (3, 2.991319148936169), (8, 1.1217446808510634)]:
        plan = generate_scenario('confirmed_replacement', {'crew_size': workers}).restoration
        assert plan.labor_work_hours == pytest.approx(8.973957446808507)
        assert plan.expected_hours == pytest.approx(elapsed)
        assert catalog['sha256'] in ' '.join(plan.assumptions)
        assert 'Indirect Labor Multiplier' in ' '.join(plan.assumptions)
