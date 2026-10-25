import type { ScenarioSnapshot } from '../../../../contracts/types';
import { humanize, numberText, utcText } from './presentation';

interface PlanningPanelsProps {
  snapshot: ScenarioSnapshot;
  inputs: { crew_size: number; access_hours: number };
  onInputsChange: (inputs: { crew_size: number; access_hours: number }) => void;
  pending: boolean;
  error: string;
  onRetry: () => void;
}

export function PlanningPanels({ snapshot, inputs, onInputsChange, pending, error, onRetry }: PlanningPanelsProps) {
  const crew = snapshot.crew_recommendation;
  const restoration = snapshot.restoration;
  const duration = (value: number | null) => value === null || !Number.isFinite(value) ? 'Unavailable' : `${numberText(value)} h`;
  const unavailable = restoration.kind === 'unavailable';
  return <div className="utility-planning-grid">
    <section className="utility-panel" aria-labelledby="utility-crew-heading">
      <div className="utility-panel-heading"><h2 id="utility-crew-heading">Crew recommendation</h2><span className="utility-badge utility-badge-caution">Not approved</span></div>
      <div className="utility-panel-body">
        <fieldset disabled={pending} className="space-y-3 mb-4">
          <legend className="font-semibold mb-2">Crew &amp; access sensitivity</legend>
          <label className="block" htmlFor="planning-crew-size">Crew size: {inputs.crew_size} lineworkers</label>
          <input id="planning-crew-size" className="block w-full min-h-11 accent-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400" type="range" min="2" max="8" step="1" value={inputs.crew_size} aria-valuetext={`${inputs.crew_size} lineworkers`} onChange={event => onInputsChange({ ...inputs, crew_size: Number(event.target.value) })} />
          <label className="block" htmlFor="planning-access-hours">Access delay: {inputs.access_hours} hours</label>
          <input id="planning-access-hours" className="block w-full min-h-11 accent-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400" type="range" min="0" max="24" step="1" value={inputs.access_hours} aria-valuetext={`${inputs.access_hours} hours`} onChange={event => onInputsChange({ ...inputs, access_hours: Number(event.target.value) })} />
          <p className="utility-footnote">Changes recalculate the shared planning range. Crew recommendations still require operator review.</p>
        </fieldset>
        <p role="status" className="utility-footnote">{pending ? 'Recalculating shared planning range…' : ''}</p>
        {error && <div role="alert"><p>{error}</p><button type="button" onClick={onRetry} disabled={pending} className="min-h-11 px-3 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">Retry planning update</button></div>}
        <p className="utility-planning-basis">{humanize(crew.basis)} · {humanize(crew.candidate_damage_class)}</p>
        <h3>Required capabilities</h3>
        {crew.capabilities.length ? <ul className="utility-capabilities">{crew.capabilities.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No capabilities supplied.</p>}
        <details><summary>Materials & recommendation basis</summary><h4>Material categories</h4>{crew.material_categories.length ? <ul>{crew.material_categories.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No materials supplied.</p>}<p>{crew.reason}</p></details>
        <p className="utility-footnote">Operator review required. This view does not dispatch a crew or authorize work.</p>
      </div>
    </section>
    <section className="utility-panel" aria-labelledby="utility-restoration-heading">
      <div className="utility-panel-heading"><h2 id="utility-restoration-heading">Restoration planning</h2><span className={`utility-badge ${restoration.kind === 'utility_confirmed' ? 'utility-badge-info' : 'utility-badge-neutral'}`}>{restoration.kind === 'utility_confirmed' ? 'Utility confirmed' : unavailable ? 'Unavailable' : 'Scenario planning'}</span></div>
      <div className="utility-panel-body">
        {unavailable ? <p className="utility-empty">No restoration estimate supplied.</p> : <dl className="utility-range" aria-label="Supplied restoration duration range">
          <div><dt>Lower</dt><dd>{duration(restoration.lower_hours)}</dd></div>
          <div><dt>Expected</dt><dd>{duration(restoration.expected_hours)}</dd></div>
          <div><dt>Upper</dt><dd>{duration(restoration.upper_hours)}</dd></div>
        </dl>}
        <p className="utility-workload">Labor: <strong>{restoration.labor_work_hours === null || !restoration.labor_work_unit ? 'Unavailable' : `${numberText(restoration.labor_work_hours)} ${restoration.labor_work_unit}`}</strong></p>
        {restoration.priority_comparison?.enabled && (
          <div className="utility-priority-box mt-3 p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-100 space-y-1.5">
            <h4 className="font-semibold text-blue-300">Critical Facility Priority Sequencing</h4>
            <p>{restoration.priority_comparison.rationale}</p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block">Hospital-first:</span>
                <span className="text-emerald-400">{restoration.priority_comparison.hospital_first.hospital_finish_hours}h hospital</span> · {restoration.priority_comparison.hospital_first.total_finish_hours}h total
              </div>
              <div>
                <span className="text-slate-400 block">Unprioritized:</span>
                <span className="text-amber-400">{restoration.priority_comparison.unprioritized.hospital_finish_hours}h hospital</span> · {restoration.priority_comparison.unprioritized.total_finish_hours}h total
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">Dispatcher authorization required prior to circuit switching.</p>
          </div>
        )}
        <details><summary>Assumptions behind this range</summary>{restoration.assumptions.length ? <ul>{restoration.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No assumptions supplied.</p>}</details>
        <p className="utility-footnote">{restoration.kind === 'scenario_planning' ? 'Planning durations under supplied assumptions; no guaranteed restoration time. ' : ''}<time dateTime={restoration.last_updated_utc}>Updated {utcText(restoration.last_updated_utc)}</time></p>
      </div>
    </section>
  </div>;
}
