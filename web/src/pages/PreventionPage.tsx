import type { ScenarioSnapshot } from '../../../contracts/types';
import { Link } from '../app/router';
import { ViewHeading } from '../components/utility/ViewHeading';
import { humanize, numberText } from '../components/utility/presentation';

const RISK_LABELS = { HIGH: 'Higher storm risk', MODERATE: 'Moderate storm risk', LOW: 'Lower storm risk', UNKNOWN: 'Risk not assessed' };

export function PreventionPage({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const risk = snapshot.customer_risk;
  const source = snapshot.impact_source;
  const records = snapshot.evidence.filter(record => record.incident_id === snapshot.incident_id && (!record.asset_id || record.asset_id === snapshot.current_asset_id));
  const supplied = records.filter(record => record.provenance === 'aep_challenge');
  const conflicting = snapshot.status === 'UNDER_REVIEW';
  const outage = snapshot.status === 'OUTAGE';
  const priorities = [
    { title: conflicting ? 'Resolve conflicting evidence first' : outage ? 'Review the active outage' : 'Review the scenario risk', detail: conflicting ? 'The cause and affected homes remain unverified. Resolve missing or contradictory inputs before choosing a repair plan.' : outage ? 'A simulated outage is already recorded. Review the diagnosis and the work needed before using a restoration range.' : 'Use the supplied drivers below to decide what needs review. A lower risk label does not guarantee uninterrupted service.', to: '/operator' as const, hash: 'utility-evidence-heading', action: 'Review incident evidence' },
    { title: 'Prepare for essential power needs', detail: 'Build a household plan for medical equipment, medication, food and communications. Replace example battery ratings with your own equipment values.', to: '/customer' as const, hash: 'household-plan', action: 'Build a household plan' },
    { title: 'Check the source before acting', detail: 'AEP paths show network dependencies. Modeled sensing and scenario assumptions do not verify equipment condition or authorize maintenance.', to: '/operator' as const, hash: 'utility-feeder-heading', action: 'Inspect supplied paths' },
  ];
  return <section className="prevention-view page" aria-labelledby="prevention-heading">
    <ViewHeading id="prevention-heading" title={<><em>Prevention</em><br />starts with evidence</>} description="See what the scenario suggests, what the source supports, and which preparation steps deserve attention first." action={<a className="btn btn--accent" href="#prevention-priorities">Review priorities</a>} />
    <div className="view-disclosure" role="note"><strong>Demonstration analysis</strong><p>Scenario risk, not a live weather forecast or a prediction of equipment failure. No maintenance or crew dispatch is authorized here.</p></div>
    <section className="prevention-outlook" aria-labelledby="prevention-outlook-heading">
      <div><h2 id="prevention-outlook-heading" className="display display-m"><em>Read</em> the outlook</h2><p className="prevention-risk"><span className="state" data-state={risk.band === 'HIGH' || risk.band === 'MODERATE' ? 'at_risk' : 'unknown'}>{RISK_LABELS[risk.band] ?? RISK_LABELS.UNKNOWN}</span></p><p>This is a scenario planning signal. It does not confirm an outage at a home.</p><p className="muted small">Assessment basis: {humanize(risk.confidence_kind || 'unavailable')}</p></div>
      <dl className="view-ledger">
        <div><dt>AEP challenge paths</dt><dd>{source ? `${numberText(source.sample_premise_count, 0)} sample premises` : 'Source scope unavailable'}</dd><dd>Selected demonstration subnet; not territory-wide coverage.</dd></div>
        <div><dt>Supplied source evidence</dt><dd>{supplied.length} of {records.length} incident records</dd><dd>Other records may be modeled or scenario inputs; counts do not measure confidence.</dd></div>
        <div><dt>Scenario impact</dt><dd>{conflicting ? 'Affected count not asserted' : `${snapshot.affected_premise_tokens.length} listed sample premises`}</dd><dd>Dependency footprint in the current snapshot; not a live affected-customer count.</dd></div>
      </dl>
    </section>
    <section className="prevention-section" aria-labelledby="prevention-drivers-heading"><div className="view-section-heading"><h2 id="prevention-drivers-heading" className="display display-m"><em>Understand</em> the drivers</h2><p>Inputs supplied by the selected scenario. No measured forecast or equipment inspection is implied.</p></div>
      {risk.drivers.length ? <ul className="prevention-drivers">{risk.drivers.map((driver, i) => <li key={`${driver}-${i}`}><p>{driver}</p><span className="tag" data-source="scenario">Scenario input</span></li>)}</ul> : <p className="view-empty">No risk drivers supplied. A risk ranking cannot be explained from the current snapshot; review incident evidence before acting.</p>}
    </section>
    <section id="prevention-priorities" className="prevention-section" aria-labelledby="prevention-priorities-heading"><div className="view-section-heading"><h2 id="prevention-priorities-heading" className="display display-m"><em>Act</em> in priority order</h2><p>Start with uncertainty and active service problems, then prepare for essential needs.</p></div>
      <ol className="prevention-priorities">{priorities.map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.detail}</p><Link to={item.to} hash={item.hash} className="text-link">{item.action}</Link></li>)}</ol>
    </section>
    <section className="prevention-section" aria-labelledby="prevention-source-heading"><div className="view-section-heading"><h2 id="prevention-source-heading" className="display display-m"><em>Know</em> the limits</h2><p>Keep source facts separate from demonstration assumptions.</p></div>
      <dl className="view-ledger prevention-source-ledger"><div><dt>AEP challenge data</dt><dd>Supplied upstream paths and sample equipment references.</dd><dd>Connectivity beyond the supplied circuit breaker remains unknown.</dd></div><div><dt>Modeled sensing & scenario inputs</dt><dd>Sensor readings, incident status and risk drivers are simulated.</dd><dd>They do not establish live weather, actual damage or verified home service.</dd></div><div><dt>Field evidence</dt><dd>{records.length ? 'Check the quality and source on each record.' : 'No evidence supplied.'}</dd><dd>Scenario confirmation is distinct from a real field inspection.</dd></div></dl>
      <p className="prevention-source-note">{snapshot.disclosure}</p>
    </section>
  </section>;
}
