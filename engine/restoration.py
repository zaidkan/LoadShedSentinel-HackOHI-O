"""Pure person-hour arithmetic and a declared, deterministic resource/DAG schedule.

Ranges are editable planning scenarios, not calibrated quantiles or utility ETRs.
All work is assumed to include the ILM categories; travel/setup cannot be added again.
"""
from __future__ import annotations
import math


def _finite(value, name, *, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or (positive and value == 0):
        raise ValueError(f'{name} must be a finite {"positive" if positive else "nonnegative"} number')
    return float(value)


def labor_person_hours(hours, *, quantity=1, hour_basis='direct_job_site_hours'):
    hours = _finite(hours, 'labor hours'); quantity = _finite(quantity, 'quantity')
    if hour_basis not in ('direct_job_site_hours', 'adjusted_person_hours'):
        raise ValueError('Unverified labor basis: crew-hours/elapsed/unknown cannot be converted')
    direct = hours * quantity if hour_basis == 'direct_job_site_hours' else None
    multiplier = 4.5 if direct is not None else 1.0
    adjusted = _finite(hours * quantity * multiplier, 'adjusted labor')
    return dict(raw_direct_hours=direct, indirect_multiplier_applied=multiplier,
                adjusted_person_hours=adjusted, labor_work_unit='person-hours')


def _range(value, name):
    values = list(value) if isinstance(value, (list, tuple)) else [value] * 3
    if len(values) != 3: raise ValueError(name + ' needs low/expected/high values')
    values = [_finite(v, name) for v in values]
    if values != sorted(values): raise ValueError(name + ' must be ordered low <= expected <= high')
    return values


def _no_duplicate_indirect(context):
    for name in ['travel_hours', 'setup_hours', 'mobilization_hours', 'safety_hours']:
        if name in context: raise ValueError(name + ' overlaps the 4.5 indirect-labor allowance')


def schedule_tasks(tasks, context=None):
    """Topological task-ID priority; each crew_id is an exclusive resource.

Dependencies and shared crews serialize work; distinct crews can run in parallel.
This declared schedule is reproducible, not an optimal workforce assignment.
"""
    context = context or {}; _no_duplicate_indirect(context)
    factors = _range(context.get('duration_factors', [.75, 1, 1.5]), 'duration factors')
    queue = _range(context.get('queue_hours', 0), 'queue')
    access = _range(context.get('access_hours', 0), 'additional non-overlapping access delay')
    energization = _range(context.get('energization_hours', 0), 'energization gate')
    by_id = {}
    for task in tasks:
        key = task.get('id')
        if not isinstance(key, str) or not key or key in by_id: raise ValueError('Tasks require unique nonempty IDs')
        size = _finite(task.get('crew_size'), 'crew size', positive=True)
        if not size.is_integer(): raise ValueError('Crew size must be an integer')
        crew = task.get('crew_id', 'crew-1')
        if not isinstance(crew, str) or not crew: raise ValueError('Crew resource ID required')
        deps = task.get('dependencies', [])
        if not isinstance(deps, list) or any(not isinstance(d, str) for d in deps) or len(set(deps)) != len(deps): raise ValueError('Invalid dependencies')
        by_id[key] = dict(crew_size=size, crew_id=crew, dependencies=list(deps), person_hours=_finite(task.get('person_hours'), 'person-hours'))
    if not by_id: raise ValueError('No repair tasks supplied')
    if any(d not in by_id for t in by_id.values() for d in t['dependencies']): raise ValueError('Unknown prerequisite task')
    order = []; pending = set(by_id)
    while pending:
        ready = sorted(key for key in pending if set(by_id[key]['dependencies']) <= set(order))
        if not ready: raise ValueError('Cyclic repair dependencies')
        order.append(ready[0]); pending.remove(ready[0])
    plans = {}; ends = []
    for scenario in range(3):
        crew_free = {}; finish = {}
        for key in order:
            task = by_id[key]; crew = task['crew_id']
            start = max([queue[scenario] + access[scenario], crew_free.get(crew, 0)] + [finish[d] for d in task['dependencies']])
            end = start + task['person_hours'] / task['crew_size'] * factors[scenario]
            _finite(end, 'task finish'); finish[key] = end; crew_free[crew] = end
            plans.setdefault(key, dict(id=key, crew_id=crew, dependencies=task['dependencies'], start_hours=[], end_hours=[]))
            plans[key]['start_hours'].append(start); plans[key]['end_hours'].append(end)
        ends.append(max(finish.values()) + energization[scenario])
    return dict(task_order=order, task_schedule=[plans[key] for key in order], full_repair_hours=ends,
                total_person_hours=sum(t['person_hours'] for t in by_id.values()),
                assumptions=['Task-ID topological priority; each crew_id is exclusive; no staffing optimization.',
                             f'Duration factors low/expected/high={factors}; queue={queue}; non-overlapping access={access}; energization={energization}.',
                             'Person-hours include the single indirect allowance; no additional travel/setup/safety time.'])


def estimate_restoration(damage, labor_ref, context):
    """Return the exact api.schemas.Restoration field shape; never a confirmed ETR.

For multi-fault planning use context.tasks of {id,person_hours,crew_size,crew_id,
 dependencies}. Otherwise damage requires quantity/operation/quantity_unit and a
 sourced labor_ref. Use schedule_tasks separately for task-level explanations.
"""
    timestamp = context.get('timestamp_utc')
    if not isinstance(timestamp, str) or not timestamp: raise ValueError('Explicit timestamp_utc required for deterministic output')
    _no_duplicate_indirect(context)
    result = dict(kind='unavailable', lower_hours=None, expected_hours=None, upper_hours=None,
                  labor_work_hours=None, labor_work_unit=None, assumptions=[], last_updated_utc=timestamp)
    try:
        tasks = context.get('tasks'); details = []
        if tasks is None:
            if not damage or not labor_ref: raise ValueError('Missing verified work package or labor reference')
            if damage.get('quantity_unit') != labor_ref.get('quantity_unit') or not damage.get('quantity_unit'): raise ValueError('Quantity unit does not match labor reference')
            operation = damage.get('operation')
            columns = {'install': ['install_hours'], 'remove': ['remove_hours'], 'replace': ['install_hours', 'remove_hours']}.get(operation)
            if columns is None: raise ValueError('Unknown repair operation')
            hours = sum(_finite(labor_ref.get(c), c) for c in columns)
            calculation = labor_person_hours(hours, quantity=damage.get('quantity'), hour_basis=labor_ref.get('hour_basis'))
            tasks = [dict(id='repair', person_hours=calculation['adjusted_person_hours'], crew_size=context.get('crew_size'), crew_id='crew-1', dependencies=[])]
            details = [f'Labor source={labor_ref.get("source", {})}; operation={operation}; quantity={damage.get("quantity")}; quantity_unit={damage.get("quantity_unit")}.',
                       f'raw_direct_hours={calculation["raw_direct_hours"]}; indirect_multiplier_applied={calculation["indirect_multiplier_applied"]}; adjusted_person_hours={calculation["adjusted_person_hours"]}; crew_size={context.get("crew_size")}.']
        plan = schedule_tasks(tasks, context)
        low, expected, high = plan['full_repair_hours']
        result.update(kind='scenario_planning', lower_hours=low, expected_hours=expected, upper_hours=high,
                      labor_work_hours=plan['total_person_hours'], labor_work_unit='person-hours',
                      assumptions=details + plan['assumptions'] + ['Scenario ranges, not calibrated probabilities or an official restoration commitment.'])
    except (ValueError, TypeError) as error:
        result['assumptions'] = [str(error), 'No duration is fabricated from unknown hours, units, quantities or crew sizes.']
    return result


def evaluate_restoration(premise_blockers, completed_task_ids, authorized_premise_tokens=()):
    """Pure staged-demo readiness. Authorization must be an explicit scenario event.

Completion alone never marks a premise restored; all modeled blockers must clear.
This consumes opaque topology tokens and makes no GIS connectivity inference.
"""
    completed = set(completed_task_ids); authorized = set(authorized_premise_tokens)
    known = {blocker for blockers in premise_blockers.values() for blocker in blockers}
    if not completed <= known: raise ValueError('Completion references an unknown blocking task')
    if not authorized <= set(premise_blockers): raise ValueError('Unknown premise authorization')
    return [dict(premise_token=premise, remaining_blockers=sorted(set(premise_blockers[premise]) - completed),
                 ready_for_review=not (set(premise_blockers[premise]) - completed),
                 modeled_restored=premise in authorized and not (set(premise_blockers[premise]) - completed))
            for premise in sorted(premise_blockers)]
