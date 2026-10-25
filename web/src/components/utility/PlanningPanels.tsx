import type { ScenarioSnapshot } from '../../../../contracts/types';
import { RangeChart } from '../ui/RangeChart';
import { clockAfter, hoursWords, numberText, sentenceCase, utcText } from './presentation';

const BASIS_TAG: Record<ScenarioSnapshot['crew_recommendation']['basis'], string> = {
  field_confirmed: 'field_confirmed',
  diagnostic_hypothesis: 'modeled',
  assessment_required: 'scenario',
};

export function PlanningPanels({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const crew = snapshot.crew_recommendation;
  const restoration = snapshot.restoration;
  const unavailable = restoration.kind === 'unavailable';
  const hours = (value: number | null) => value === null || !Number.isFinite(value) ? 'Unavailable' : numberText(value, 2);
  const figures = [
    { label: 'Lower', value: restoration.lower_hours },
    { label: 'Expected', value: restoration.expected_hours },
    { label: 'Upper', value: restoration.upper_hours },
  ];
  return <div className="planning">
    <section className="console-block planning-restoration" aria-labelledby="restoration-heading">
      <header className="block-head block-head--split">
        <div>
          <h2 id="restoration-heading" className="console-h2"><em>Restoration</em> planning</h2>
          <p className="block-sub">{restoration.kind === 'utility_confirmed' ? 'Utility-confirmed estimate.' : unavailable ? 'No range is supplied for this incident.' : 'Scenario planning range under the supplied assumptions. Not a restoration commitment.'}</p>
        </div>
        <span className="tag" data-source={restoration.kind === 'utility_confirmed' ? 'field_confirmed' : 'scenario'}>{restoration.kind === 'utility_confirmed' ? 'Utility confirmed' : unavailable ? 'Unavailable' : 'Scenario planning'}</span>
      </header>
      {unavailable ? <div className="planning-empty" role="status">
        <p className="title">No duration is shown</p>
        <p className="muted">The backend withholds a range when the evidence cannot support one. Assess before choosing a repair package.</p>
      </div> : <>
        <dl className="planning-figures">
          {figures.map(figure => <div key={figure.label} data-emphasis={figure.label === 'Expected' ? 'true' : undefined}>
            <dt>{figure.label}</dt>
            <dd><span className="planning-figure">{hours(figure.value)}<small> h</small></span><span className="muted small">{hoursWords(figure.value)}{clockAfter(snapshot.timestamp_utc, figure.value) ? ` · ${clockAfter(snapshot.timestamp_utc, figure.value)}` : ''}</span></dd>
          </div>)}
          <div>
            <dt>Labor</dt>
            <dd><span className="planning-figure">{restoration.labor_work_hours === null || !restoration.labor_work_unit ? 'Unavailable' : numberText(restoration.labor_work_hours, 2)}</span><span className="muted small">{restoration.labor_work_unit ?? 'No unit supplied'}</span></dd>
          </div>
        </dl>
        <RangeChart lower={restoration.lower_hours} expected={restoration.expected_hours} upper={restoration.upper_hours} label={`Restoration planning range from ${hours(restoration.lower_hours)} to ${hours(restoration.upper_hours)} hours, expected ${hours(restoration.expected_hours)} hours`} />
        <p className="block-note">Clock times count from the snapshot time, {utcText(snapshot.timestamp_utc)}, and assume work starts then.</p>
      </>}
      <details className="planning-assumptions">
        <summary>Assumptions behind this {unavailable ? 'decision' : 'range'} <span className="mono">[{restoration.assumptions.length}]</span></summary>
        {restoration.assumptions.length ? <ol>{restoration.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ol> : <p className="muted">No assumptions supplied.</p>}
      </details>
      <p className="block-note"><time dateTime={restoration.last_updated_utc}>Updated {utcText(restoration.last_updated_utc)}</time></p>
    </section>

    <section className="console-block planning-crew" aria-labelledby="crew-heading">
      <header className="block-head block-head--split">
        <div>
          <h2 id="crew-heading" className="console-h2"><em>Crew</em> package</h2>
          <p className="block-sub">A review-only work package. This view does not dispatch a crew or authorize work.</p>
        </div>
        <span className="state" data-state="open">Not approved</span>
      </header>
      <dl className="crew-facts">
        <div><dt>Basis</dt><dd><span className="tag" data-source={BASIS_TAG[crew.basis]}>{sentenceCase(crew.basis)}</span></dd></div>
        <div><dt>Candidate damage class</dt><dd>{sentenceCase(crew.candidate_damage_class)}</dd></div>
      </dl>
      <div className="crew-lists">
        <div>
          <h3 className="crew-list-title">Required capabilities</h3>
          {crew.capabilities.length ? <ul className="crew-list">{crew.capabilities.map((item, i) => <li key={i}>{sentenceCase(item)}</li>)}</ul> : <p className="muted small">No capabilities supplied.</p>}
        </div>
        <div>
          <h3 className="crew-list-title">Material categories</h3>
          {crew.material_categories.length ? <ul className="crew-list">{crew.material_categories.map((item, i) => <li key={i}>{sentenceCase(item)}</li>)}</ul> : <p className="muted small">No materials supplied.</p>}
        </div>
      </div>
      <div className="crew-reason">
        <span className="state" data-state="unknown">Human review required</span>
        <p>{crew.reason}</p>
      </div>
    </section>
  </div>;
}
