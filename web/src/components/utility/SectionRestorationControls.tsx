import { useState } from 'react';
import type { ScenarioSnapshot } from '../../../../contracts/types';
import type { SectionAction, SectionRestorationState } from '../../services/sectionRestoration';

export interface SectionRestorationControlsProps {
  snapshot: ScenarioSnapshot;
  onSectionAction: (action: SectionAction) => Promise<void>;
}

const PHASE_LABELS: Record<SectionRestorationState['phase'], string> = {
  UPSTREAM_TRIP: 'Upstream interruption', SECTION_ISOLATED: 'Faulted section isolated',
  UNAFFECTED_RESTORED: 'Unaffected section restored', REPAIR_COMPLETE: 'Repair complete; release pending',
  REPAIRED_SECTION_RESTORED: 'Repaired section restored; unaffected section release pending',
  ALL_RESTORED: 'All modeled premises restored',
};

/** Operational-looking controls are explicitly modeled events, never switching commands. */
export function SectionRestorationControls({ snapshot, onSectionAction }: SectionRestorationControlsProps) {
  const section = (snapshot as ScenarioSnapshot & { section_restoration?: SectionRestorationState | null }).section_restoration;
  const [pending, setPending] = useState<SectionAction | null>(null);
  const [error, setError] = useState('');
  const restored = section?.restored_premise_tokens.length ?? 0;
  const stillOut = section?.still_out_premise_tokens.length ?? 0;
  const selectedRestored = section?.restored_premise_tokens.includes(snapshot.selected_premise_token);
  const selectedStillOut = section?.still_out_premise_tokens.includes(snapshot.selected_premise_token);
  const unaffectedReleased = section?.authorized_unaffected ?? (section ? section.unaffected_premise_tokens.every(token => section.restored_premise_tokens.includes(token)) : false);
  const repairedReleased = section?.authorized_repaired ?? (section ? section.isolated_premise_tokens.every(token => section.restored_premise_tokens.includes(token)) : false);
  const stages: Array<{ action: SectionAction; label: string; enabled: boolean }> = [
    { action: 'isolate_section', label: 'Simulate section isolation', enabled: section?.phase === 'UPSTREAM_TRIP' },
    { action: 'authorize_unaffected', label: 'Authorize unaffected section (modeled)', enabled: !!section?.isolation_confirmed && !unaffectedReleased },
    { action: 'complete_repair', label: 'Complete modeled transformer repair', enabled: !!section?.isolation_confirmed && !section.repair_complete },
    { action: 'authorize_repaired', label: 'Authorize repaired section (modeled)', enabled: !!section?.isolation_confirmed && section.repair_complete && !repairedReleased },
  ];

  async function act(action: SectionAction) {
    if (pending) return;
    setPending(action); setError('');
    try { await onSectionAction(action); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The modeled section action could not be applied.'); }
    finally { setPending(null); }
  }

  return <section className="utility-panel utility-section-demo" aria-labelledby="utility-section-demo-heading">
    <div className="utility-panel-heading"><div><h2 id="utility-section-demo-heading">Step restoration: isolate, restore, repair</h2><p>Source-dependent premise groups with separate modeled release gates</p></div><span className="utility-badge utility-badge-caution">Simulation only</span></div>
    <div className="utility-panel-body">
      <p className="utility-section-warning">These controls record simulated approvals. No live switch is operated, no field isolation is verified, and no crew is dispatched.</p>
      <button type="button" className="utility-section-start" disabled={pending !== null} onClick={() => void act('start')}>{section ? 'Restart modeled section demo' : 'Start modeled section demo'}</button>
      {section ? <>
        <div className="utility-section-totals" aria-live="polite"><div><span>Source sample in this event</span><strong>{section.all_premise_tokens.length} premises</strong></div><div><span>Modeled restored</span><strong>{restored}</strong></div><div><span>Still out in model</span><strong>{stillOut}</strong></div></div>
        <p className="utility-section-phase" role="status">{PHASE_LABELS[section.phase] || section.phase}{restored > 0 && stillOut > 0 ? ' · Partial restoration' : ''}</p>
        <dl className="utility-section-context"><div><dt>Declared faulted transformer</dt><dd>{section.fault_asset_token}</dd></div><div><dt>Source protection / isolation asset</dt><dd>{section.isolating_asset_token}</dd></div><div><dt>Isolated group</dt><dd>{section.isolated_premise_tokens.length} premises</dd></div><div><dt>Unaffected group eligible after isolation</dt><dd>{section.unaffected_premise_tokens.length} premises</dd></div><div><dt>Selected customer</dt><dd>{snapshot.selected_premise_token} · {selectedRestored ? 'Modeled restored' : selectedStillOut ? 'Still out in model' : 'Outside this event scope'}</dd></div></dl>
        <div className="utility-section-actions"><button type="button" disabled={pending !== null || !section.unaffected_premise_tokens.length} onClick={() => void act('select_unaffected_premise')}>Inspect unaffected customer</button><button type="button" disabled={pending !== null || !section.isolated_premise_tokens.length} onClick={() => void act('select_faulted_premise')}>Inspect faulted customer</button></div>
        <ol className="utility-section-actions">{stages.map((stage, index) => <li key={stage.action}><span>{index + 1}</span><button type="button" disabled={pending !== null || !stage.enabled} onClick={() => void act(stage.action)}>{pending === stage.action ? 'Applying modeled event…' : stage.label}</button></li>)}</ol>
        <p className="utility-footnote">Releasing the unaffected group first can restore service before the transformer repair finishes. A repair-first strategy is also allowed after isolation. Isolation alone restores nobody; repair completion alone does not confirm re-energization. Each group requires its own explicit modeled authorization.</p>
        <details><summary>Section assumptions and source limits</summary><ul>{section.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul><p>Counts describe the shipped source sample. They are not a full-territory outage count or proof that a real switching plan is safe.</p></details>
      </> : <p className="utility-muted">Start the section example to compare an upstream interruption with the isolated transformer group. The server supplies both groups from the same anonymized source paths.</p>}
      {pending && <p role="status" className="utility-footnote">Applying one modeled event to the shared incident revision…</p>}
      {error && <p role="alert" className="utility-section-error">{error}</p>}
    </div>
  </section>;
}
