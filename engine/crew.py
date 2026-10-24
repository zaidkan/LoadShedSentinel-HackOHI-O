"""Review-only utility capability packages; no live roster, authority or dispatch."""
from engine.diagnosis import assess_incident, confirmed_damage, usable_evidence


def recommend_crew(diagnosis, evidence=None, work_order=None):
    """Recheck evidence binding; a bare work-order flag never authorizes replacement."""
    context = dict(incident_id=diagnosis.get('incident_id'), current_asset_id=diagnosis.get('asset_id'),
                   timestamp_utc=diagnosis.get('timestamp_utc'), upstream_asset_ids=diagnosis.get('upstream_asset_ids', []), evidence=evidence or [])
    checked = assess_incident(context); rows, _ = usable_evidence(context)
    result = dict(capabilities=['qualified distribution line assessment'], material_categories=['approved assessment and protective equipment'],
                  candidate_damage_class='unknown', basis='assessment_required', approved=False,
                  reason='Qualified field assessment and human dispatcher review required; no live crew is dispatched.')
    if checked['assessment_required']: return result
    confirmed = confirmed_damage(rows)
    if confirmed:
        damage = confirmed[0]['value']
        choices = {
            'transformer': ('transformer_replacement', ['qualified distribution line and transformer replacement', 'approved isolation and lifting coordination'], ['correctly rated transformer', 'lifting and access equipment']),
            'pole': ('structure_repair', ['qualified distribution construction and line repair'], ['rated pole and attachments', 'structural lifting and access equipment']),
            'conductor': ('conductor_repair', ['qualified distribution conductor repair'], ['correctly specified conductor and connectors', 'approved access equipment']),
            'vegetation': ('vegetation_interaction', ['qualified utility electrical hazard control', 'utility-approved vegetation workers'], ['vegetation resources subject to electrical clearance review']),
        }
        kind, capabilities, materials = choices[damage]
        modeled = any(r['provenance'] == 'scenario' for r in confirmed)
        result.update(candidate_damage_class=kind, capabilities=capabilities, material_categories=materials, basis='field_confirmed',
                      reason=('Scenario field-confirmation event; ' if modeled else 'Authorized field record; ') + 'dispatcher must verify inventory, rating, access, qualifications and isolation; approval remains false.')
    elif checked['primary_code'] == 'UPSTREAM_FEEDER_INTERRUPTION':
        result.update(candidate_damage_class='upstream_feeder', capabilities=['qualified feeder and protection investigation'],
                      material_categories=['feeder protection and switching context'], basis='diagnostic_hypothesis',
                      reason='Upstream trip evidence requires feeder investigation; no local transformer replacement inferred. Human review required.')
    elif checked['primary_code'] == 'LOCAL_PROTECTION_OPERATION':
        result.update(candidate_damage_class='protection_or_unknown', capabilities=['qualified distribution line troubleshooting'],
                      material_categories=['protective-device parts subject to field verification', 'approved assessment and protective equipment'],
                      basis='diagnostic_hypothesis', reason='Protection operation does not identify damaged internals; inspect before replacement or re-energization. Human review required.')
    elif checked['primary_code'] == 'POSSIBLE_EQUIPMENT_DISTRESS':
        result.update(candidate_damage_class='equipment_assessment', reason='Modeled distress indicators justify qualified inspection, not certain replacement. Human dispatcher review required.')
    return result
