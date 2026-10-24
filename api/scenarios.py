"""Local, in-memory scenario orchestration. All network/repair inputs are fixtures.

This module does not implement the data owner's graph or the engine owner's
labor model. Explicit fixture membership and planning ranges support UI handoff.
"""
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from threading import RLock
from uuid import uuid4

from api.schemas import (Action, CustomerSnapshot, Notification, Preferences, ResetRequest,
                         Snapshot, Restoration)
from engine.customer import build_customer_plan, message_text

ROOT = Path(__file__).resolve().parents[1]
DISCLOSURE = ('Synthetic integration fixture: connections, telemetry, damage, crew findings '
              'and restoration ranges are simulated. No live utility status or AEP labor calculation.')


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class ScenarioError(Exception):
    def __init__(self, status: int, detail: str):
        self.status, self.detail = status, detail


@dataclass
class Run:
    scenario: dict
    run_id: str = field(default_factory=lambda: str(uuid4()))
    revision: int = 1
    event_index: int = -1
    selected: str = 'P-DEMO-001'
    tasks: dict = field(default_factory=dict)
    preferences: dict = field(default_factory=dict)
    histories: dict = field(default_factory=dict)
    notified: dict = field(default_factory=dict)
    snapshot: Snapshot | None = None


@dataclass
class Result:
    snapshot: Snapshot
    customers: dict[str, CustomerSnapshot]


class ScenarioStore:
    def __init__(self, enricher=None):
        self.lock = RLock()
        self.enricher = enricher
        self.definitions = {s['id']: s for s in json.loads((ROOT/'data/fixtures/scenarios.json').read_text())}
        self.runs: dict[str, Run] = {}
        self.cache: dict[tuple[str, str], tuple[str, Result]] = {}
        for sid, scenario in self.definitions.items():
            run = Run(deepcopy(scenario))
            run.snapshot = self._build(run)
            self.runs[sid] = run

    def _run(self, sid):
        if sid not in self.runs:
            raise ScenarioError(404, 'Unknown scenario')
        return self.runs[sid]

    def _event(self, run):
        return run.scenario['events'][run.event_index] if run.event_index >= 0 else None

    def _build(self, run):
        event = self._event(run)
        active_ids = set(event['activate_fault_ids']) if event else set()
        faults = [f for f in run.scenario['faults'] if f['fault_id'] in active_ids]
        pending = [f for f in faults if run.tasks.get(f['task_id']) != 'COMPLETE']
        unknown = bool(event and event.get('unknown'))
        states = []
        for token in run.scenario['paths']:
            blockers = [f['fault_id'] for f in pending if token in f['premises']]
            status = ('UNDER_REVIEW' if unknown else 'AT_RISK' if event is None else
                      'OUTAGE' if blockers else 'RESTORED' if any(token in f['premises'] for f in faults) else 'NORMAL')
            states.append({'premise_token':token, 'status':status, 'remaining_blocking_fault_ids':blockers})
        affected = [p['premise_token'] for p in states if p['status']=='OUTAGE']
        restored = sum(p['status']=='RESTORED' for p in states)
        phase = ('PRE_STORM' if not event else 'UNDER_REVIEW' if unknown else
                 'PARTIAL_RESTORATION' if affected and restored else 'OUTAGE' if affected else 'RESTORED')
        key = '|'.join(sorted(f['fault_id'] for f in pending))
        estimate = run.scenario['estimate_sets'].get(key)
        bounds = {} if estimate is None else dict(zip(['lower_hours','expected_hours','upper_hours'],estimate))
        assumptions = ['Illustrative fixture interval; not calculated from the AEP workbook.',
                       'Real labor, crew scheduling and graph services await their module owners.']
        restoration = Restoration(kind='unavailable' if estimate is None else 'scenario_planning',
                                  assumptions=assumptions, **bounds)
        confirmed = bool(event and event.get('confirmed_damage'))
        cutout = 'CLOSED'
        if event and event['cutout_status'] == 'UNKNOWN':
            cutout = 'UNKNOWN'
        elif event and event['cutout_status'] == 'OPEN':
            selected_transformer = run.scenario['paths'][run.selected][0]
            if any(f['asset_id'] == selected_transformer for f in pending):
                cutout = 'OPEN'
        snapshot = Snapshot(
            scenario_id=run.scenario['id'], incident_id='INC-'+run.run_id, run_id=run.run_id,
            revision=run.revision,timestamp_utc=utc_now(),title=run.scenario['title'],phase=phase,
            current_asset_id=run.scenario['paths'][run.selected][0],selected_premise_token=run.selected,
            cutout_status=cutout,
            evidence=[] if not event else [dict(id='E-DEMO-1',kind='scenario_event',value=event['label'],
                                               provenance='scenario',visibility='operator')],
            hypotheses=[] if not event else [dict(code=event['hypothesis_code'],label=event['label'],
                                                  requires_field_confirmation=not confirmed,evidence_ids=['E-DEMO-1'])],
            crew_recommendation=dict(capabilities=['replacement-capable utility crew'] if confirmed else ['qualified utility assessment'],
                material_categories=['transformer replacement package (fixture)'] if confirmed else [],
                basis='field_confirmed_in_scenario' if confirmed else 'assessment_required',
                reason='Fixture recommendation; engine owner supplies verified capability rules.'),
            restoration=restoration,
            customer_risk=dict(band='UNKNOWN' if unknown else 'HIGH',confidence_kind='unavailable' if unknown else 'scenario_only',
                               drivers=['Selected synthetic storm fixture; no calibrated probability.']),
            selected_supply_path=dict(premise_token=run.selected,asset_tokens=run.scenario['paths'][run.selected],
                                      completeness='complete_in_fixture',provenance='synthetic_fixture'),
            active_faults=[dict(fault_id=f['fault_id'],asset_id=f['asset_id'],damage_class=f['damage_class'],
                state='CLEARED' if run.tasks.get(f['task_id'])=='COMPLETE' else 'REPAIRING' if run.tasks.get(f['task_id'])=='REPAIRING' else 'ACTIVE') for f in faults],
            repair_tasks=[dict(task_id=f['task_id'],fault_id=f['fault_id'],prerequisite_task_ids=[],
                               capabilities=['qualified utility crew'],status=run.tasks.get(f['task_id'],'PENDING')) for f in faults],
            premise_states=states,affected_premise_tokens=affected,
            impact_summary=dict(known_affected_count=len(affected),restored_in_scenario_count=restored,
                                unknown_coverage_count=len(states) if unknown else 0),
            notifications=run.histories.get(run.selected,[]),disclosure=DISCLOSURE)
        if self.enricher:
            enriched = Snapshot.model_validate(self.enricher(snapshot.model_copy(deep=True)))
            editable = {'evidence','hypotheses','crew_recommendation','restoration','solar','customer_risk'}
            before, after = snapshot.model_dump(), enriched.model_dump()
            if any(before[k] != after[k] for k in before if k not in editable):
                raise ScenarioError(502,'Module adapter changed scenario identity or orchestration state')
            snapshot = enriched
        return snapshot

    def _customer(self, run, snapshot, token):
        state = next((p for p in snapshot.premise_states if p.premise_token==token),None)
        if state is None:
            raise ScenarioError(404,'Unknown premise in this scenario')
        preferences = run.preferences.get(token, Preferences())
        restoration = snapshot.restoration
        if state.status == 'OUTAGE' and self.enricher is None:
            key = '|'.join(sorted(state.remaining_blocking_fault_ids))
            bounds = run.scenario['estimate_sets'].get(key)
            if bounds:
                restoration = Restoration(kind='scenario_planning', lower_hours=bounds[0],
                    expected_hours=bounds[1], upper_hours=bounds[2], assumptions=snapshot.restoration.assumptions)
        if state.status in {'NORMAL','AT_RISK','UNDER_REVIEW'}:
            restoration = Restoration(kind='unavailable',assumptions=['No reliable active restoration estimate.'])
        elif state.status=='RESTORED':
            restoration = Restoration(kind='scenario_planning',lower_hours=0,expected_hours=0,upper_hours=0,
                                      assumptions=['An explicit simulation event cleared all fixture blockers.'])
        explanations = {'NORMAL':'This home is outside the active scenario fault footprint; no outage was asserted for it.',
                        'AT_RISK':'This is a pre-storm scenario; an outage has not been asserted.',
                        'UNDER_REVIEW':'Available scenario evidence conflicts. Service status needs review.',
                        'OUTAGE':f"{len(state.remaining_blocking_fault_ids)} simulated repair constraint(s) remain on this home's fixture supply path.",
                        'RESTORED':'An explicit simulation repair event cleared all remaining fixture constraints for this home.'}
        return CustomerSnapshot(scenario_id=snapshot.scenario_id,run_id=snapshot.run_id,revision=snapshot.revision,
            timestamp_utc=snapshot.timestamp_utc,premise_token=token,status=state.status,risk=snapshot.customer_risk,
            restoration=restoration,explanation=explanations[state.status],remaining_repair_count=len(state.remaining_blocking_fault_ids),
            plan=build_customer_plan(preferences,state.status,snapshot.customer_risk.band),preferences=preferences,
            notifications=run.histories.get(token,[]),disclosure=DISCLOSURE)

    def _emit(self, run, snapshot):
        for state in snapshot.premise_states:
            token = state.premise_token
            view = self._customer(run,snapshot,token)
            if not view.plan.alert_eligible:
                continue
            flags = run.notified.setdefault(token,{})
            kind = None
            signature = (view.restoration.model_dump_json(),tuple(state.remaining_blocking_fault_ids))
            if view.status=='AT_RISK' and 'PRE_STORM' not in flags:
                kind='PRE_STORM'
            elif view.status=='OUTAGE':
                if 'OUTAGE_CONFIRMED' not in flags:
                    kind='OUTAGE_CONFIRMED'
                elif flags.get('estimate_signature') != signature:
                    kind='ESTIMATE_UPDATED'
            elif view.status=='RESTORED' and 'OUTAGE_CONFIRMED' in flags and 'RESTORATION_COMPLETE' not in flags:
                kind='RESTORATION_COMPLETE'
            if kind:
                run.histories.setdefault(token,[]).append(dict(id=f'{run.run_id}-{token}-{snapshot.revision}-{kind}',type=kind,
                    text=message_text(kind,view.restoration),sent_at_utc=snapshot.timestamp_utc,revision=snapshot.revision))
                flags[kind]=True
                if view.status=='OUTAGE':
                    flags['estimate_signature']=signature
        snapshot.notifications = [Notification.model_validate(n) for n in run.histories.get(run.selected,[])]

    def _result(self, run):
        return Result(snapshot=run.snapshot.model_copy(deep=True),
                      customers={p:self._customer(run,run.snapshot,p) for p in run.scenario['paths']})

    def get(self,sid):
        with self.lock:
            return deepcopy(self._result(self._run(sid)))

    def get_incident(self, identifier):
        """Accept a current incident ID or the stable scenario alias used by UI fixtures."""
        with self.lock:
            if identifier in self.runs:
                return self.get(identifier)
            for sid, run in self.runs.items():
                if run.snapshot.incident_id == identifier:
                    return self.get(sid)
            raise ScenarioError(404, 'Unknown current incident')

    def apply(self,sid,request: Action | ResetRequest):
        with self.lock:
            original=self._run(sid)
            fingerprint=sha256(request.model_dump_json().encode()).hexdigest()
            cache_key=(sid,request.action_id)
            if cache_key in self.cache:
                old_fingerprint,result=self.cache[cache_key]
                if old_fingerprint!=fingerprint:
                    raise ScenarioError(409,'Action ID was already used for a different request')
                return deepcopy(result)
            if request.expected_revision!=original.revision:
                raise ScenarioError(409,f'Stale revision; refresh snapshot at revision {original.revision}')
            run=deepcopy(original)
            run.revision+=1
            if isinstance(request,ResetRequest):
                run=Run(deepcopy(original.scenario),revision=run.revision,selected=original.selected,
                        preferences=deepcopy(original.preferences))
            else:
                self._mutate(run,request)
            snapshot=self._build(run)
            self._emit(run,snapshot)
            run.snapshot=snapshot
            result=self._result(run)
            self.runs[sid]=run
            self.cache[cache_key]=(fingerprint,deepcopy(result))
            return deepcopy(result)

    def _mutate(self,run,request):
        action,target=request.action,request.target_id
        if action in {'select_premise','set_preferences'}:
            if target not in run.scenario['paths']:
                raise ScenarioError(404,'Unknown premise in this scenario')
            if action=='select_premise':
                run.selected=target
            else:
                run.preferences[target]=request.preferences
            return
        if action=='advance':
            if run.event_index+1 < len(run.scenario['events']):
                run.event_index+=1
                return
            event=self._event(run)
            if event is None or event.get('unknown'):
                raise ScenarioError(409,'No further qualified events in this scenario')
            for fault in run.scenario['faults']:
                status=run.tasks.get(fault['task_id'],'PENDING')
                if status!='COMPLETE':
                    action='start_repair' if status=='PENDING' else 'complete_repair'
                    target=fault['task_id']
                    break
            else:
                raise ScenarioError(409,'Scenario is complete; reset for a new run')
        event=self._event(run)
        valid={f['task_id'] for f in run.scenario['faults'] if event and f['fault_id'] in event['activate_fault_ids']}
        if target not in valid:
            raise ScenarioError(404,'Repair task is not active in this scenario')
        status=run.tasks.get(target,'PENDING')
        if action=='start_repair' and status=='PENDING':
            run.tasks[target]='REPAIRING'
        elif action=='complete_repair' and status=='REPAIRING':
            run.tasks[target]='COMPLETE'
        else:
            raise ScenarioError(409,'Task transition requires PENDING → REPAIRING → COMPLETE')
