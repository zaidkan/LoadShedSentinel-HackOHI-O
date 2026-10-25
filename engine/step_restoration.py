"""Explicit staged-restoration replay over supplied AEP dependency paths.

The fault, isolation approval and release events are modeled scenario inputs.
Connectivity does not certify switching feasibility or actual energized service.
"""
from __future__ import annotations

from copy import deepcopy

from engine.aep_impact import AEPImpact

ACTIONS = ('isolate_section', 'authorize_unaffected', 'complete_repair', 'authorize_repaired')


def _validate_partition(demo):
    groups = {}
    for field in ('all_premise_tokens', 'isolated_premise_tokens', 'unaffected_premise_tokens', 'fault_premise_tokens'):
        values = demo.get(field)
        if not isinstance(values, list) or not values or any(not isinstance(v, str) or not v for v in values) or len(set(values)) != len(values):
            raise ValueError('Section replay requires nonempty unique premise sets: ' + field)
        groups[field] = set(values)
    all_tokens = groups['all_premise_tokens']
    isolated = groups['isolated_premise_tokens']; unaffected = groups['unaffected_premise_tokens']
    if isolated & unaffected or isolated | unaffected != all_tokens:
        raise ValueError('Isolated and unaffected sets must be a disjoint complete partition')
    if not groups['fault_premise_tokens'] < isolated:
        raise ValueError('Fault dependencies must form a strict subset of the isolated section')
    if not isinstance(demo.get('events'), list):
        raise ValueError('Modeled events must be a list')
    seen = set()
    for action in demo['events']:
        if not isinstance(action, str) or action not in ACTIONS or action in seen:
            raise ValueError('Invalid or repeated modeled event')
        if action != 'isolate_section' and 'isolate_section' not in seen:
            raise ValueError('Isolation review must precede repair or release')
        if action == 'authorize_repaired' and 'complete_repair' not in seen:
            raise ValueError('Repair completion must precede repaired-section release')
        seen.add(action)
    return groups


def _materialize(demo):
    groups = _validate_partition(demo)
    result = deepcopy(demo)
    events = set(result['events'])
    isolated = 'isolate_section' in events
    repaired = 'complete_repair' in events
    unaffected_release = 'authorize_unaffected' in events
    repaired_release = 'authorize_repaired' in events
    restored = set()
    if unaffected_release:
        restored.update(groups['unaffected_premise_tokens'])
    if repaired_release:
        restored.update(groups['isolated_premise_tokens'])
    phase = ('ALL_RESTORED' if unaffected_release and repaired_release else
             'REPAIRED_SECTION_RESTORED' if repaired_release else 'REPAIR_COMPLETE' if repaired else
             'UNAFFECTED_RESTORED' if unaffected_release else 'SECTION_ISOLATED' if isolated else 'UPSTREAM_TRIP')
    result.update(
        phase=phase, status='RESTORED' if restored == groups['all_premise_tokens'] else 'PARTIALLY_RESTORED' if restored else 'OUTAGE',
        isolation_confirmed=isolated, authorized_unaffected=unaffected_release,
        completed_repair=repaired, repair_complete=repaired, authorized_repaired=repaired_release,
        restored_premise_tokens=sorted(restored), still_out_premise_tokens=sorted(groups['all_premise_tokens'] - restored),
        restored_count=len(restored), still_out_count=len(groups['all_premise_tokens'] - restored),
    )
    return result


def build_section_demo(source: AEPImpact, fault_asset_token: str) -> dict:
    """Find the nearest supplied upstream protection with a useful partition.

The selected transformer has a modeled fault. The upstream breaker is initially
tripped. A strict-superset FUSE/RECLOSER section remains isolated while the rest
of that breaker dependency group can receive an explicitly authorized release.
Only path order and unique membership are used, never geographic proximity.
"""
    if not isinstance(fault_asset_token, str) or fault_asset_token not in source.assets or source.assets[fault_asset_token].get('kind') != 'TRANSFORMER':
        raise ValueError('Choose a transformer from the supplied AEP sample')
    faulted = set(source.affected(fault_asset_token))
    if not faulted:
        raise ValueError('Fault asset has no validated premise dependencies')
    feeder_token = None; isolator = None; all_tokens = None; isolated = None
    for premise in sorted(faulted):
        path = source.paths.get(premise)
        tokens = path.get('asset_tokens', []) if isinstance(path, dict) else []
        if tokens.count(fault_asset_token) != 1 or any(t not in source.assets for t in tokens):
            raise ValueError('Invalid or incomplete fault-asset supply path')
        upstream = tokens[tokens.index(fault_asset_token) + 1:]
        breakers = [t for t in upstream if source.assets[t].get('kind') == 'CIRCUIT_BREAKER']
        if not breakers:
            raise ValueError('No supplied upstream breaker path for this fault')
        breaker = breakers[-1]
        feeder = set(source.affected(breaker))
        if not faulted < feeder:
            raise ValueError('No distinct upstream dependency group for this fault')
        candidates = []
        for token in upstream[:upstream.index(breaker)]:
            if source.assets[token].get('kind') in ('FUSE', 'RECLOSER'):
                dependents = set(source.affected(token))
                if faulted < dependents < feeder:
                    candidates.append((token, dependents))
        if not candidates:
            raise ValueError('No supplied protection creates a nonempty unaffected section')
        token, dependents = candidates[0]
        if feeder_token is not None and (breaker != feeder_token or token != isolator or dependents != isolated or feeder != all_tokens):
            raise ValueError('Fault dependencies do not share an unambiguous nearest protection/feeder partition')
        feeder_token, isolator, all_tokens, isolated = breaker, token, feeder, dependents
    if not all_tokens <= set(source.paths):
        raise ValueError('Partition references premises outside the validated sample')
    demo = {
        'schema_version': 'step_restoration_v1', 'scope': 'selected_feeder_dependency_sample',
        'provenance': 'aep_challenge_paths_with_modeled_fault_and_review_events',
        'fault_asset_token': fault_asset_token, 'isolating_asset_token': isolator,
        'upstream_breaker_token': feeder_token, 'fault_premise_tokens': sorted(faulted),
        'all_premise_tokens': sorted(all_tokens), 'isolated_premise_tokens': sorted(isolated),
        'unaffected_premise_tokens': sorted(all_tokens - isolated), 'events': [],
        'assumptions': [
            'The transformer fault and initial upstream trip are declared scenarios, not live AEP damage or service observations.',
            'Supplied upstream equipment order selects the nearest FUSE/RECLOSER with a strict-superset fault dependency group and a nonempty unaffected feeder group. Counts are unique supplied premise tokens.',
            'Protection topology alone does not prove safe switching, alternate supply, equipment operability or energization. isolate_section records a simulated qualified-utility approval, not a physical command.',
            'An explicit unaffected-group release follows the isolation review. The isolated group stays out until the selected transformer repair is explicitly completed and a separate repaired-group release is authorized.',
            'Repair completion and elapsed planning durations never create a restoration event. No utility operation, dispatch or external customer message occurs.',
        ],
    }
    return _materialize(demo)


def apply_section_action(demo: dict, action: str) -> dict:
    """Return a new state after an explicit event; repair/release orders may vary.

Isolation precedes any repair or release; repaired-section authorization also
requires repair completion. Unaffected release may precede or follow repair.
"""
    if not isinstance(demo, dict):
        raise ValueError('A valid section replay is required')
    _validate_partition(demo)
    result = deepcopy(demo)
    result['events'].append(action)
    return _materialize(result)
