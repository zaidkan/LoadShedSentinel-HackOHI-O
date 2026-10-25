"""Explicit isolation, repair and release over actual supplied dependency sets."""
from copy import deepcopy

import pytest

from engine.aep_impact import AEPImpact
from engine.step_restoration import build_section_demo, apply_section_action


@pytest.fixture
def source():
    return AEPImpact.load()


def start(source):
    asset = source.scenario_context('local_protection')['current_asset_id']
    return build_section_demo(source, asset)


def test_unaffected_half_releases_before_fault_repair(source):
    initial = start(source)
    assert len(initial['all_premise_tokens']) == 16
    assert len(initial['fault_premise_tokens']) == 3
    assert len(initial['isolated_premise_tokens']) == len(initial['unaffected_premise_tokens']) == 8
    assert not set(initial['isolated_premise_tokens']) & set(initial['unaffected_premise_tokens'])
    assert initial['restored_count'] == 0
    isolated = apply_section_action(initial, 'isolate_section')
    assert isolated['restored_count'] == 0
    released = apply_section_action(isolated, 'authorize_unaffected')
    assert released['restored_premise_tokens'] == initial['unaffected_premise_tokens']
    assert released['still_out_premise_tokens'] == initial['isolated_premise_tokens']
    assert not released['completed_repair']
    repaired = apply_section_action(released, 'complete_repair')
    assert repaired['completed_repair'] and repaired['repair_complete']
    assert repaired['still_out_count'] == 8  # Completion alone does not authorize service.
    final = apply_section_action(repaired, 'authorize_repaired')
    assert final['status'] == 'RESTORED'
    assert final['restored_count'] == 16 and final['still_out_premise_tokens'] == []
    assert initial['events'] == [] and initial['restored_count'] == 0


def test_repair_can_precede_unaffected_release_without_automatic_energization(source):
    demo = apply_section_action(start(source), 'isolate_section')
    demo = apply_section_action(demo, 'complete_repair')
    assert demo['restored_count'] == 0
    demo = apply_section_action(demo, 'authorize_repaired')
    assert demo['phase'] == 'REPAIRED_SECTION_RESTORED'
    assert demo['restored_count'] == 8
    assert demo['still_out_premise_tokens'] == demo['unaffected_premise_tokens']
    demo = apply_section_action(demo, 'authorize_unaffected')
    assert demo['restored_count'] == 16


@pytest.mark.parametrize('action', ['complete_repair', 'authorize_unaffected', 'authorize_repaired', 'restore_all', 'unknown'])
def test_initial_replay_rejects_premature_or_unknown_events(source, action):
    with pytest.raises(ValueError):
        apply_section_action(start(source), action)


def test_repaired_group_requires_its_own_completion_and_authorization(source):
    isolated = apply_section_action(start(source), 'isolate_section')
    with pytest.raises(ValueError):
        apply_section_action(isolated, 'authorize_repaired')
    with pytest.raises(ValueError):
        apply_section_action(isolated, 'isolate_section')
    corrupted = deepcopy(isolated)
    corrupted['events'].append('authorize_repaired')
    with pytest.raises(ValueError):
        apply_section_action(corrupted, 'authorize_unaffected')


def test_missing_geometry_never_changes_the_path_partition(source):
    expected = start(source)
    for node in source.assets.values():
        node.pop('coordinates', None)
    actual = start(source)
    assert actual['isolating_asset_token'] == expected['isolating_asset_token']
    assert actual['isolated_premise_tokens'] == expected['isolated_premise_tokens']


def test_unknown_asset_and_tampered_membership_fail_closed(source):
    with pytest.raises(ValueError):
        build_section_demo(source, 'ASSET-MISSING')
    breaker = next(k for k, v in source.assets.items() if v['kind'] == 'CIRCUIT_BREAKER')
    with pytest.raises(ValueError):
        build_section_demo(source, breaker)
    bad = start(source)
    bad['unaffected_premise_tokens'].append(bad['isolated_premise_tokens'][0])
    with pytest.raises(ValueError):
        apply_section_action(bad, 'isolate_section')


def test_elapsed_estimates_or_caller_flags_do_not_create_events(source):
    demo = start(source)
    demo.update(elapsed_hours=1000, completed_repair=True, repair_complete=True, status='RESTORED')
    result = apply_section_action(demo, 'isolate_section')
    assert result['status'] == 'OUTAGE'
    assert result['restored_count'] == 0 and not result['completed_repair']
