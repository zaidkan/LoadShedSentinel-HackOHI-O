"""Deterministic evidence rules; scores are relative weights, never probabilities."""
from __future__ import annotations
from datetime import datetime

PROVENANCES = {'aep_challenge', 'external_research', 'modeled_sensor', 'scenario', 'authorized_enterprise'}
QUALITIES = {'observed', 'modeled', 'reported', 'field_confirmed'}
LABELS = {
    'LOCAL_PROTECTION_OPERATION': 'Local protective device operated; equipment condition unconfirmed',
    'POSSIBLE_EQUIPMENT_DISTRESS': 'Possible equipment distress; qualified inspection required',
    'UPSTREAM_FEEDER_INTERRUPTION': 'Upstream interruption evidence; investigate feeder/protection',
    'STRUCTURE_OR_CONDUCTOR_DAMAGE': 'Structure or conductor damage indication',
    'INSUFFICIENT_EVIDENCE': 'Insufficient or conflicting evidence; assess before repair selection',
}


def _timestamp(value):
    try:
        date = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return date if date.tzinfo is not None else None
    except ValueError: return None


def usable_evidence(snapshot):
    """Bind local evidence to incident/asset, retain latest per source, and stable IDs.

Upstream evidence with an asset ID requires membership in upstream_asset_ids.
Missing/invalid timestamps, foreign records and unknown provenance are not facts.
"""
    incident = snapshot.get('incident_id'); asset = snapshot.get('current_asset_id')
    now = _timestamp(snapshot.get('timestamp_utc')); groups = {}; seen = {}
    if not incident or not asset: return [], ['incident_id/current_asset_id required']
    for row in snapshot.get('evidence', []):
        if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row['id']: continue
        if row.get('incident_id') != incident or row.get('quality') not in QUALITIES or row.get('provenance') not in PROVENANCES: continue
        date = _timestamp(row.get('timestamp_utc'))
        if date is None or (now is not None and date > now): continue
        upstream = row.get('kind') in ('upstream_trip', 'widespread_outage', 'ami_outage_count')
        allowed = {asset, None} | (set(snapshot.get('upstream_asset_ids', [])) if upstream else set())
        if row.get('asset_id') not in allowed: continue
        if row['id'] in seen and row != seen[row['id']]: return [], ['conflicting duplicate evidence ID']
        seen[row['id']] = row
        key = (row.get('kind'), row.get('provenance'), row.get('asset_id'))
        previous = groups.setdefault(key, [])
        if not previous or date > _timestamp(previous[0]['timestamp_utc']): groups[key] = [row]
        elif date == _timestamp(previous[0]['timestamp_utc']) and row['id'] not in {x['id'] for x in previous}: previous.append(row)
    rows = sorted([row for group in groups.values() for row in group], key=lambda x: x['id'])
    return rows, []


def confirmed_damage(rows):
    return [r for r in rows if r.get('kind') == 'field_damage' and r.get('quality') == 'field_confirmed'
            and r.get('provenance') in ('scenario', 'authorized_enterprise')
            and r.get('value') in ('transformer', 'pole', 'conductor', 'vegetation')]


def assess_incident(snapshot_inputs):
    rows, errors = usable_evidence(snapshot_inputs)
    by_kind = {}
    for row in rows: by_kind.setdefault(row.get('kind'), []).append(row)
    contradictions = []
    for kind in ['cutout_state', 'temperature_state', 'upstream_trip', 'field_damage']:
        values = {str(r.get('value')).upper() for r in by_kind.get(kind, []) if r.get('value') is not None}
        if kind == 'temperature_state': values = {'ABNORMAL' if v in ('HOT', 'HIGH') else v for v in values}
        if len(values) > 1: contradictions.extend(r['id'] for r in by_kind[kind])
    supports = {code: set() for code in LABELS}; weights = {code: 0 for code in LABELS}
    def add(code, row, weight):
        if row['id'] not in supports[code]: supports[code].add(row['id']); weights[code] += weight
    for row in rows:
        kind, value = row.get('kind'), row.get('value')
        if kind == 'cutout_state' and value == 'OPEN': add('LOCAL_PROTECTION_OPERATION', row, 3)
        if kind == 'upstream_trip' and value is True: add('UPSTREAM_FEEDER_INTERRUPTION', row, 5)
        if kind == 'widespread_outage' and value is True and any(r.get('value') is True for r in by_kind.get('upstream_trip', [])):
            add('UPSTREAM_FEEDER_INTERRUPTION', row, 1)
        if (kind == 'temperature_state' and value in ('ABNORMAL', 'HIGH', 'HOT')) or (kind in ('acoustic_anomaly', 'vibration_anomaly') and value is True):
            add('POSSIBLE_EQUIPMENT_DISTRESS', row, 2)
        if kind == 'reported_damage' and value in ('pole', 'conductor'): add('STRUCTURE_OR_CONDUCTOR_DAMAGE', row, 2)
    confirmed = confirmed_damage(rows)
    for row in confirmed:
        code = 'STRUCTURE_OR_CONDUCTOR_DAMAGE' if row['value'] in ('pole', 'conductor', 'vegetation') else 'POSSIBLE_EQUIPMENT_DISTRESS'
        add(code, row, 8)
    hypotheses = []
    for code in sorted(LABELS, key=lambda c: (-weights[c], c)):
        if not weights[code]: continue
        code_confirmed = any(r['id'] in supports[code] for r in confirmed)
        hypotheses.append(dict(code=code, score_type='relative_evidence', score=float(weights[code]), label=LABELS[code],
                               supporting_evidence_ids=sorted(supports[code]), contradicting_evidence_ids=sorted(set(contradictions)),
                               missing_evidence=[] if code_confirmed else ['current field assessment', 'utility protection record'],
                               requires_field_confirmation=not code_confirmed))
    insufficient = bool(errors or contradictions or not hypotheses)
    if insufficient:
        hypotheses.insert(0, dict(code='INSUFFICIENT_EVIDENCE', score_type='unavailable', score=None,
                                 label=LABELS['INSUFFICIENT_EVIDENCE'], supporting_evidence_ids=[],
                                 contradicting_evidence_ids=sorted(set(contradictions)),
                                 missing_evidence=errors or ['consistent current asset/incident evidence and qualified field assessment'], requires_field_confirmation=True))
    distress = any(weights[c] for c in ['POSSIBLE_EQUIPMENT_DISTRESS', 'STRUCTURE_OR_CONDUCTOR_DAMAGE'])
    return dict(incident_id=snapshot_inputs.get('incident_id'), asset_id=snapshot_inputs.get('current_asset_id'),
                timestamp_utc=snapshot_inputs.get('timestamp_utc'), upstream_asset_ids=list(snapshot_inputs.get('upstream_asset_ids', [])),
                primary_code=hypotheses[0]['code'], hypotheses=hypotheses, assessment_required=insufficient,
                equipment_condition='INSUFFICIENT_EVIDENCE' if insufficient or not distress else 'INSPECTION_PRIORITY',
                assumptions=['Fixed rule weights express relative evidence, not calibrated probabilities.',
                             'Normal surface temperature and open protection do not establish healthy internals.',
                             'Scenario/modeled evidence remains a demonstration, not a live operational diagnosis.'])
