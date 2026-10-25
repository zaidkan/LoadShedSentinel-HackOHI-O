"""Independent source-set and release-event regressions for the AEP sample.

The expected partitions are rebuilt from supplied premise paths, not from the
new replay's returned counts. No API session, server or source file is mutated.
"""
from __future__ import annotations

import copy
import hashlib
import json
from unittest.mock import patch

import pytest

from engine.aep_impact import AEPImpact, BUNDLE_PATH
from engine.step_restoration import apply_section_action, build_section_demo
from engine.scenarios import generate_scenario
from pipeline.inspect_assets import DEFAULT_DATA, source_archives


# Public tokens and sizes from the previously independently checked source slice.
TRANSFORMERS = {
    'ASSET-4D3811483AD1FB8F': 3,
    'ASSET-5405BE644B753F39': 5,
    'ASSET-3D728064C2BE9061': 1,
    'ASSET-47FA2B5E062A42E6': 4,
    'ASSET-253FD0B7C3F209A9': 1,
    'ASSET-B4735B2138B3CE7C': 2,
}
ACTIONS = ('isolate_section', 'authorize_unaffected', 'complete_repair', 'authorize_repaired')


@pytest.fixture(scope='module')
def source():
    return AEPImpact.load()


def test_raw_archive_bytes_match_the_public_samples_recorded_provenance():
    bundle = json.loads(BUNDLE_PATH.read_text())
    for archive in source_archives(DEFAULT_DATA):
        if not archive.exists():
            pytest.skip('Original AEP archives are unavailable in this checkout')
        with archive.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        assert actual == bundle['metadata']['source_archive_sha256'][archive.name]


def expected_partition(source, transformer):
    """Derive membership independently from path inclusion and source ordering."""
    paths = {premise: row['asset_tokens'] for premise, row in source.paths.items()}
    local = {premise for premise, path in paths.items() if path[0] == transformer}
    path = paths[min(local)]
    breaker = next(token for token in reversed(path) if source.assets[token]['kind'] == 'CIRCUIT_BREAKER')
    feeder = {premise for premise, row in paths.items() if breaker in row}
    candidates = []
    for token in path[1:path.index(breaker)]:
        if source.assets[token]['kind'] not in {'FUSE', 'RECLOSER'}:
            continue
        section = {premise for premise, row in paths.items() if token in row}
        if local < section < feeder:
            candidates.append((token, section))
    isolator, isolated = candidates[0]
    return local, feeder, isolator, isolated, feeder - isolated


def assert_public_partition(demo, feeder, isolated, unaffected):
    assert set(demo['all_premise_tokens']) == feeder
    assert set(demo['isolated_premise_tokens']) == isolated
    assert set(demo['unaffected_premise_tokens']) == unaffected
    restored, still_out = set(demo['restored_premise_tokens']), set(demo['still_out_premise_tokens'])
    assert not restored & still_out
    assert restored | still_out == feeder
    assert not isolated & unaffected
    assert isolated | unaffected == feeder
    assert demo['restored_count'] == len(restored)
    assert demo['still_out_count'] == len(still_out)
    for field in ('all_premise_tokens', 'isolated_premise_tokens', 'unaffected_premise_tokens',
                  'restored_premise_tokens', 'still_out_premise_tokens'):
        assert len(demo[field]) == len(set(demo[field]))


@pytest.mark.parametrize('transformer,expected_local_count', TRANSFORMERS.items())
def test_every_source_transformer_uses_its_ordered_protection_path(source, transformer, expected_local_count):
    local, feeder, isolator, isolated, unaffected = expected_partition(source, transformer)
    demo = build_section_demo(source, transformer)
    assert len(local) == expected_local_count
    assert (len(feeder), len(isolated), len(unaffected)) == (16, 8, 8)
    assert demo['fault_asset_token'] == transformer
    assert set(demo['fault_premise_tokens']) == local
    assert demo['isolating_asset_token'] == isolator
    assert source.assets[isolator]['kind'] in {'FUSE', 'RECLOSER'}
    assert all(isolator in source.paths[p]['asset_tokens'] for p in local)
    assert_public_partition(demo, feeder, isolated, unaffected)


def test_every_source_premise_has_exactly_one_repair_group_and_partition(source):
    covered = set()
    for transformer in TRANSFORMERS:
        demo = build_section_demo(source, transformer)
        local = set(demo['fault_premise_tokens'])
        assert not local & covered
        covered.update(local)
        for premise in local:
            path = source.paths[premise]['asset_tokens']
            assert path[0] == transformer
            assert path.index(transformer) < path.index(demo['isolating_asset_token']) < path.index(demo['upstream_breaker_token'])
    assert covered == set(source.paths)
    assert len(covered) == 16


@pytest.mark.parametrize('transformer', TRANSFORMERS)
def test_explicit_release_restores_other_eight_before_repaired_section(source, transformer):
    _, feeder, _, isolated, unaffected = expected_partition(source, transformer)
    initial = build_section_demo(source, transformer)
    assert initial['phase'] == 'UPSTREAM_TRIP'
    assert initial['status'] == 'OUTAGE'
    assert initial['restored_count'] == 0
    frozen_initial = copy.deepcopy(initial)

    isolated_state = apply_section_action(initial, 'isolate_section')
    assert initial == frozen_initial
    assert isolated_state['phase'] == 'SECTION_ISOLATED'
    assert isolated_state['isolation_confirmed'] is True
    assert isolated_state['restored_premise_tokens'] == []  # Isolation alone never energizes a home.

    released = apply_section_action(isolated_state, 'authorize_unaffected')
    frozen_release = copy.deepcopy(released)
    assert released['phase'] == 'UNAFFECTED_RESTORED'
    assert released['status'] == 'PARTIALLY_RESTORED'
    assert set(released['restored_premise_tokens']) == unaffected
    assert set(released['still_out_premise_tokens']) == isolated
    assert released['authorized_unaffected'] is True
    assert released['authorized_repaired'] is False

    repaired = apply_section_action(released, 'complete_repair')
    assert released == frozen_release
    assert repaired['phase'] == 'REPAIR_COMPLETE'
    assert repaired['completed_repair'] is True
    assert repaired['status'] == 'PARTIALLY_RESTORED'
    assert repaired['restored_premise_tokens'] == released['restored_premise_tokens']
    assert repaired['still_out_premise_tokens'] == released['still_out_premise_tokens']

    final = apply_section_action(repaired, 'authorize_repaired')
    assert final['phase'] == 'ALL_RESTORED'
    assert final['status'] == 'RESTORED'
    assert set(final['restored_premise_tokens']) == feeder
    assert final['still_out_premise_tokens'] == []
    assert final['authorized_repaired'] is True
    assert final['events'] == list(ACTIONS)
    for state in (initial, isolated_state, released, repaired, final):
        assert_public_partition(state, feeder, isolated, unaffected)


def test_unknown_premise_and_non_transformer_faults_cannot_invent_a_section(source):
    for invalid in ('ASSET-MADEUP', 'PREM-DOES-NOT-EXIST', '', None, False, 7):
        with pytest.raises(ValueError):
            build_section_demo(source, invalid)
    for token, node in source.assets.items():
        if node['kind'] != 'TRANSFORMER':
            with pytest.raises(ValueError):
                build_section_demo(source, token)


def test_missing_equipment_geometry_does_not_replace_supplied_connectivity_with_proximity():
    bundle = json.loads(BUNDLE_PATH.read_text())
    for node in bundle['nodes']:
        node['coordinates'] = None
    without_geometry = AEPImpact(bundle)
    for transformer in TRANSFORMERS:
        demo = build_section_demo(without_geometry, transformer)
        _, feeder, isolator, isolated, unaffected = expected_partition(without_geometry, transformer)
        assert demo['isolating_asset_token'] == isolator
        assert_public_partition(demo, feeder, isolated, unaffected)


def test_missing_protection_or_nonpartitioning_protection_fails_closed():
    original = json.loads(BUNDLE_PATH.read_text())
    no_protection = copy.deepcopy(original)
    for path in no_protection['supply_paths']:
        path['asset_tokens'] = [path['asset_tokens'][0], path['asset_tokens'][-1]]
    source = AEPImpact(no_protection)
    for transformer in TRANSFORMERS:
        with pytest.raises(ValueError):
            build_section_demo(source, transformer)

    shared_protection = copy.deepcopy(original)
    protector = next(n['asset_token'] for n in shared_protection['nodes'] if n['kind'] == 'FUSE')
    for path in shared_protection['supply_paths']:
        path['asset_tokens'] = [path['asset_tokens'][0], protector, path['asset_tokens'][-1]]
    source = AEPImpact(shared_protection)
    for transformer in TRANSFORMERS:
        with pytest.raises(ValueError):
            build_section_demo(source, transformer)


def test_conflicting_paths_for_same_transformer_do_not_guess_one_protection():
    bundle = json.loads(BUNDLE_PATH.read_text())
    transformer = 'ASSET-4D3811483AD1FB8F'
    target = next(path for path in bundle['supply_paths'] if path['asset_tokens'][0] == transformer)
    other = next(path for path in bundle['supply_paths'] if path['asset_tokens'][0] != transformer and len(path['asset_tokens']) == 3)
    target['asset_tokens'] = [transformer, other['asset_tokens'][1], target['asset_tokens'][-1]]
    source = AEPImpact(bundle)
    with pytest.raises(ValueError):
        build_section_demo(source, transformer)


def test_action_retries_future_events_and_elapsed_time_cannot_authorize_service(source):
    demo = build_section_demo(source, next(iter(TRANSFORMERS)))
    for expected_action in ACTIONS:
        before = copy.deepcopy(demo)
        premature = ['authorize_unaffected', 'complete_repair', 'authorize_repaired'] if not demo['isolation_confirmed'] else []
        if not demo['completed_repair']:
            premature.append('authorize_repaired')
        for invalid in (*premature, *demo['events'], 'advance_time', 'RESTORED', '', None):
            with pytest.raises(ValueError):
                apply_section_action(demo, invalid)
            assert demo == before
        demo = apply_section_action(demo, expected_action)
        assert before != demo
    for action in ACTIONS:
        with pytest.raises(ValueError):
            apply_section_action(demo, action)


@pytest.mark.parametrize('transformer', TRANSFORMERS)
def test_repair_first_still_requires_two_separate_group_release_events(source, transformer):
    _, feeder, _, isolated, unaffected = expected_partition(source, transformer)
    demo = build_section_demo(source, transformer)
    demo = apply_section_action(demo, 'isolate_section')
    demo = apply_section_action(demo, 'complete_repair')
    assert demo['completed_repair'] is True
    assert demo['restored_count'] == 0
    assert demo['still_out_count'] == 16
    demo = apply_section_action(demo, 'authorize_repaired')
    assert demo['phase'] == 'REPAIRED_SECTION_RESTORED'
    assert demo['status'] == 'PARTIALLY_RESTORED'
    assert set(demo['restored_premise_tokens']) == isolated
    assert set(demo['still_out_premise_tokens']) == unaffected
    assert demo['authorized_unaffected'] is False
    assert_public_partition(demo, feeder, isolated, unaffected)
    demo = apply_section_action(demo, 'authorize_unaffected')
    assert demo['phase'] == 'ALL_RESTORED'
    assert demo['status'] == 'RESTORED'
    assert demo['restored_count'] == 16
    assert_public_partition(demo, feeder, isolated, unaffected)


def test_duplicate_or_overlapping_premise_sets_are_rejected(source):
    original = build_section_demo(source, next(iter(TRANSFORMERS)))
    for field in ('all_premise_tokens', 'isolated_premise_tokens', 'unaffected_premise_tokens'):
        corrupted = copy.deepcopy(original)
        corrupted[field].append(corrupted[field][0])
        with pytest.raises(ValueError):
            apply_section_action(corrupted, 'isolate_section')
    corrupted = copy.deepcopy(original)
    corrupted['unaffected_premise_tokens'].append(corrupted['isolated_premise_tokens'][0])
    with pytest.raises(ValueError):
        apply_section_action(corrupted, 'isolate_section')


def test_public_replay_keeps_source_assumptions_and_no_household_positions(source):
    demo = build_section_demo(source, next(iter(TRANSFORMERS)))
    serialized = json.dumps(demo)
    for forbidden in ('"coordinates"', '"point"', '"address"', '"premise_nu"', '"location_n"'):
        assert forbidden not in serialized
    text = ' '.join(demo['assumptions']).lower()
    assert 'declared' in text and 'not live' in text
    assert 'does not prove safe switching' in text
    assert 'repair completion' in text and 'never create a restoration event' in text
    assert demo['scope'] == 'selected_feeder_dependency_sample'


@pytest.mark.parametrize('transformer', TRANSFORMERS)
def test_priority_comparison_uses_disjoint_source_groups_and_actual_customer_counts(source, transformer):
    context = source.scenario_context('confirmed_replacement', transformer)
    snapshot = generate_scenario('confirmed_replacement', context)
    comparison = snapshot.restoration.priority_comparison
    assert comparison['enabled'] is True
    assert comparison['scope'] == 'separate_two_concurrent_transformer_repair_scenario'
    groups = {group['task_id']: group for group in comparison['groups']}
    assert set(groups) == {'hospital_service', 'feeder_branch'}
    covered = set()
    for group in groups.values():
        expected = {premise for premise, path in source.paths.items()
                    if path['asset_tokens'][0] == group['asset_token']}
        assert set(group['premise_tokens']) == expected
        assert group['customer_count'] == len(expected)
        assert not covered & expected
        covered.update(expected)
        actual_hospitals = {record['facility_token'] for record in source.affected_critical_facilities(group['asset_token'])['critical_facilities']
                            if record['kind'] == 'HOSPITAL'}
        assert set(group['hospital_facility_tokens']) == actual_hospitals
        assert group['critical_facility_count'] == len(actual_hospitals)
    assert groups['hospital_service']['hospital_facility_tokens']
    assert groups['feeder_branch']['hospital_facility_tokens'] == []
    assert comparison['total_customer_count'] == len(covered)
    # The original single incident is not expanded into the two-repair comparison.
    assert set(snapshot.affected_premise_tokens) == set(source.affected(transformer))
    assert comparison['person_hours_per_job'] == pytest.approx(8.973957446808507)
    assert comparison['total_person_hours'] == pytest.approx(2 * 8.973957446808507)
    assert set(comparison['workbook_refs'][0]['cells']) == {'C21', 'D21'}
    for arm_name in ('hospital_first', 'unprioritized'):
        arm = comparison[arm_name]
        tasks = {task['id']: task for task in arm['task_schedule']}
        assert set(tasks) == set(groups)
        assert arm['hospital_finish_hours'] == tasks['hospital_service']['end_hours'][1]
        assert arm['total_finish_hours'] >= max(task['end_hours'][1] for task in tasks.values())
        customer_hours = sum(len(groups[key]['premise_tokens']) * task['end_hours'][1] for key, task in tasks.items())
        assert arm['customer_hours'] == pytest.approx(customer_hours)
        assert arm['customer_interruption_minutes'] == pytest.approx(customer_hours * 60)
    assert comparison['hospital_first']['total_finish_hours'] == pytest.approx(comparison['unprioritized']['total_finish_hours'])
    assert comparison['hospital_hours_saved'] == pytest.approx(
        comparison['unprioritized']['hospital_finish_hours'] - comparison['hospital_first']['hospital_finish_hours'])
    assert comparison['cmi_change_prioritized_minus_baseline'] == pytest.approx(
        comparison['hospital_first']['customer_interruption_minutes'] - comparison['unprioritized']['customer_interruption_minutes'])
    # Hospital preference is a declared value trade-off, not fabricated fewer CMI.
    assert comparison['cmi_change_prioritized_minus_baseline'] > 0
    assumptions = ' '.join(comparison['assumptions']).lower()
    assert 'assumed spatial context' in assumptions
    assert 'separate' in assumptions and '25-kva' in assumptions


def test_already_first_hospital_group_has_zero_claimed_priority_gain(source):
    bundle = json.loads(BUNDLE_PATH.read_text())
    largest = 'ASSET-5405BE644B753F39'  # Five genuine source premises.
    for record in bundle['critical_facility_associations']:
        if record['kind'] == 'HOSPITAL':
            # Controlled association-policy fixture, never written to source data.
            record['nearest_asset_token'] = largest
    altered = AEPImpact(bundle)
    context = altered.scenario_context('confirmed_replacement', largest)
    with patch.object(AEPImpact, 'load', return_value=altered):
        comparison = generate_scenario('confirmed_replacement', context).restoration.priority_comparison
    assert comparison['enabled'] is True
    assert comparison['hospital_first']['sequence'] == comparison['unprioritized']['sequence']
    assert comparison['hospital_first']['hospital_finish_hours'] == comparison['unprioritized']['hospital_finish_hours']
    assert comparison['hospital_hours_saved'] == pytest.approx(0)
    assert comparison['cmi_change_prioritized_minus_baseline'] == pytest.approx(0)
