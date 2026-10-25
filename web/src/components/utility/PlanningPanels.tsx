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
  const duration = (value: number | null) => value === null || !Number.isFinite(value) ? 'Unavailable' : `${numberText(value, 2)} h`;
  const unavailable = restoration.kind === 'unavailable';
  const comparison = restoration.priority_comparison;
  const applied = snapshot.planning_inputs;

  return <div className="utility-planning-grid">
    <section className="utility-panel" aria-labelledby="utility-crew-heading">
      <div className="utility-panel-heading"><h3 id="utility-crew-heading">Crew recommendation</h3><span className="utility-badge utility-badge-caution">Not approved</span></div>
      <div className="utility-panel-body">
        <p className="utility-planning-basis">{humanize(crew.basis)} · {humanize(crew.candidate_damage_class)}</p>
        <h4>Required capabilities</h4>
        {crew.capabilities.length ? <ul className="utility-capabilities">{crew.capabilities.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No capabilities supplied. Request a qualified assessment before assigning work.</p>}
        <p className="utility-workload">Labor effort <strong>{restoration.labor_work_hours === null || !restoration.labor_work_unit ? 'Unavailable' : `${numberText(restoration.labor_work_hours, 3)} ${restoration.labor_work_unit}`}</strong></p>
        <p className="utility-unit-explainer">Person-hours measure total labor effort, not time to restoration. Elapsed hours depend on the crew and supplied delays.</p>
        <details><summary>Materials & recommendation basis</summary><h5>Material categories</h5>{crew.material_categories.length ? <ul>{crew.material_categories.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No materials supplied.</p>}<p>{crew.reason}</p></details>
        <p className="utility-footnote">Review only. Crew dispatch, repair clearance and switching require separate operator authorization.</p>
      </div>
    </section>
    <section className="utility-panel" aria-labelledby="utility-restoration-heading">
      <div className="utility-panel-heading"><h3 id="utility-restoration-heading">Restoration planning</h3><span className={`utility-badge ${restoration.kind === 'utility_confirmed' ? 'utility-badge-info' : 'utility-badge-neutral'}`}>{restoration.kind === 'utility_confirmed' ? 'Utility confirmed' : unavailable ? 'Unavailable' : 'Scenario planning'}</span></div>
      <div className="utility-panel-body">
        <p className="utility-range-label">Elapsed planning window · hours</p>
        {unavailable ? <p className="utility-estimate-empty">No restoration estimate supplied. Resolve field conditions and the repair package before selecting a duration.</p> : <dl className="utility-range" aria-label="Supplied elapsed restoration duration range">
          <div><dt>Lower</dt><dd>{duration(restoration.lower_hours)}</dd></div>
          <div><dt>Expected</dt><dd>{duration(restoration.expected_hours)}</dd></div>
          <div><dt>Upper</dt><dd>{duration(restoration.upper_hours)}</dd></div>
        </dl>}
        <p className="utility-applied-inputs">{applied ? `Applied to displayed range: ${applied.crew_size} lineworkers · ${applied.access_hours} h access delay` : 'Applied crew and access inputs were not echoed in this snapshot.'}</p>
        <fieldset disabled={pending} className="utility-sensitivity" aria-describedby="utility-sensitivity-help">
          <legend>Crew &amp; access sensitivity</legend>
          <label htmlFor="planning-crew-size">Crew size: {inputs.crew_size} lineworkers</label>
          <input id="planning-crew-size" type="range" min="2" max="8" step="1" value={inputs.crew_size} aria-valuetext={`${inputs.crew_size} lineworkers`} onChange={event => onInputsChange({ ...inputs, crew_size: Number(event.target.value) })} />
          <div className="utility-slider-bounds" aria-hidden="true"><span>2 lineworkers</span><span>8 lineworkers</span></div>
          <label htmlFor="planning-access-hours">Access delay: {inputs.access_hours} hours</label>
          <input id="planning-access-hours" type="range" min="0" max="24" step="1" value={inputs.access_hours} aria-valuetext={`${inputs.access_hours} hours`} onChange={event => onInputsChange({ ...inputs, access_hours: Number(event.target.value) })} />
          <div className="utility-slider-bounds" aria-hidden="true"><span>0 hours</span><span>24 hours</span></div>
          <p id="utility-sensitivity-help">Changes request a shared planning update. The displayed range uses the last accepted inputs until that update succeeds.</p>
        </fieldset>
        <p role="status" className="utility-planning-status">{pending ? 'Recalculating shared planning range…' : ''}</p>
        {error && <div role="alert" className="utility-inline-error"><p>{error}</p><button type="button" onClick={onRetry} disabled={pending}>Retry planning update</button></div>}
        {comparison?.enabled && comparison.hospital_first && comparison.unprioritized && <details className="utility-priority-comparison">
          <summary>Critical facility priority comparison</summary>
          <p>{comparison.rationale}</p>
          <dl><div><dt>Hospital-first</dt><dd>{duration(comparison.hospital_first.hospital_finish_hours)} hospital · {duration(comparison.hospital_first.total_finish_hours)} total</dd></div><div><dt>Unprioritized</dt><dd>{duration(comparison.unprioritized.hospital_finish_hours)} hospital · {duration(comparison.unprioritized.total_finish_hours)} total</dd></div></dl>
          <p className="utility-muted">Illustrative scheduling under assumed facility associations. Dispatcher authorization is required before circuit switching.</p>
        </details>}
        <details><summary>Workbook & range assumptions</summary>{restoration.assumptions.length ? <ul>{restoration.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No assumptions supplied.</p>}</details>
        <p className="utility-footnote">{restoration.kind === 'scenario_planning' ? 'Conditional planning; no guaranteed restoration time. ' : ''}<time dateTime={restoration.last_updated_utc}>Updated {utcText(restoration.last_updated_utc)}</time></p>
      </div>
    </section>
  </div>;
}
