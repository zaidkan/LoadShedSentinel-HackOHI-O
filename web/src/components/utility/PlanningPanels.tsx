import type { ScenarioSnapshot } from '../../../../contracts/types';
import { humanize, numberText, utcText } from './presentation';

export function PlanningPanels({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const crew = snapshot.crew_recommendation;
  const restoration = snapshot.restoration;
  const duration = (value: number | null) => value === null || !Number.isFinite(value) ? 'Unavailable' : `${numberText(value)} h`;
  const unavailable = restoration.kind === 'unavailable';
  return <div className="utility-planning-grid">
    <section className="utility-panel" aria-labelledby="utility-crew-heading">
      <div className="utility-panel-heading"><h2 id="utility-crew-heading">Crew recommendation</h2><span className="utility-badge utility-badge-caution">Not approved</span></div>
      <div className="utility-panel-body">
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
        <details><summary>Assumptions behind this range</summary>{restoration.assumptions.length ? <ul>{restoration.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">No assumptions supplied.</p>}</details>
        <p className="utility-footnote">{restoration.kind === 'scenario_planning' ? 'Planning durations under supplied assumptions; no guaranteed restoration time. ' : ''}<time dateTime={restoration.last_updated_utc}>Updated {utcText(restoration.last_updated_utc)}</time></p>
      </div>
    </section>
  </div>;
}
