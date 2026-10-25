import type { ScenarioSnapshot } from '../../../../contracts/types';
import { ViewHeading } from './ViewHeading';
import { humanize, utcText } from './presentation';

const INCIDENT_TITLES: Record<string, string> = {
  local_protection: 'Local protection operation',
  upstream_feeder: 'Upstream feeder interruption',
  confirmed_replacement: 'Transformer replacement assessment',
  insufficient_evidence: 'Contradictory telemetry',
};

/** Summarizes supplied state and review steps; never infers a field diagnosis. */
export function DecisionSummary({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const source = snapshot.impact_source;
  const uncertain = snapshot.status === 'UNDER_REVIEW';
  const assessment = uncertain || snapshot.crew_recommendation.basis === 'assessment_required';
  const standingDown = snapshot.status === 'NORMAL' || snapshot.status === 'RESTORED';
  const records = snapshot.evidence.filter(e => e.incident_id === snapshot.incident_id && (!e.asset_id || e.asset_id === snapshot.current_asset_id));
  const confirmed = records.filter(e => e.quality === 'field_confirmed').length;
  const scenarioConfirmed = records.filter(e => e.quality === 'field_confirmed' && e.provenance === 'scenario').length;
  const modeled = records.filter(e => e.quality !== 'field_confirmed' && (e.quality === 'modeled' || e.provenance === 'modeled_sensor')).length;
  const next = standingDown ? 'Review the latest service status' : assessment ? 'Resolve evidence gaps with field assessment' : 'Review the proposed repair package';
  const target = standingDown ? '#utility-feeder-heading' : assessment ? '#utility-evidence-heading' : '#utility-work-heading';

  return <header className="utility-decision-brief">
    <ViewHeading id="utility-page-heading" title={<><em>Operator</em><br />incident review</>} description="Review the evidence, establish what needs attention, and check the proposed restoration work. Every action remains subject to operator approval." />
    <div className="utility-incident-heading">
      <div>
        <h2>{INCIDENT_TITLES[snapshot.scenario_id] ?? humanize(snapshot.scenario_id)}</h2>
        <p><span>{snapshot.incident_id}</span><span>Revision {snapshot.revision}</span><time dateTime={snapshot.timestamp_utc}>{utcText(snapshot.timestamp_utc)}</time></p>
      </div>
      <div className="utility-status-summary"><span className={`utility-badge utility-incident-${snapshot.status.toLowerCase()}`}>{humanize(snapshot.status)}</span><span>Simulated incident</span></div>
    </div>
    <dl className="utility-incident-facts">
      <div><dt>Fault source</dt><dd>{source ? humanize(source.fault_asset_kind) : 'Scenario inputs'}</dd><dd className="utility-fact-detail"><code>{source?.fault_asset_token ?? snapshot.current_asset_id}</code></dd></div>
      <div><dt>Inspected asset</dt><dd><code>{snapshot.current_asset_id}</code></dd><dd className="utility-fact-detail">{source?.provenance === 'aep_challenge' ? 'AEP challenge · supplied upstream paths' : 'Source lineage not supplied'}</dd></div>
      <div><dt>Impacted sample premises</dt><dd>{uncertain ? 'Unknown' : snapshot.affected_premise_tokens.length}<span className="utility-fact-unit">{!uncertain && source ? ` of ${source.sample_premise_count}` : ''}</span></dd><dd className="utility-fact-detail">{uncertain ? 'No affected count asserted' : 'Dependency footprint · simulated impact'}</dd></div>
      <div><dt>Evidence quality</dt><dd>{modeled ? 'Modeled Simulation' : confirmed ? 'Confirmation supplied' : 'Confirmation not supplied'}</dd><dd className="utility-fact-detail">{scenarioConfirmed ? `${scenarioConfirmed} scenario-confirmed` : `${confirmed} field-confirmed`} · {modeled} modeled records</dd></div>
    </dl>
    <div className="utility-next-review">
      <div><h2>Recommended next action</h2><p>{next}</p><span>{standingDown ? 'Status supplied by this demonstration; verify before operational use.' : uncertain ? 'Cause and restoration time remain unverified. Do not select a repair duration.' : 'Operator review required. No crew dispatch or switching authority is granted.'}</span></div>
      <a href={target} className="utility-action-link">{standingDown ? 'Review feeder context' : assessment ? 'Review diagnosis & gaps' : 'Review work package'}<span aria-hidden="true"> →</span></a>
    </div>
    <p className="utility-scope-note">Interactive sample: <strong>{source ? `${source.sample_premise_count} premises` : 'size not supplied'}</strong><span aria-hidden="true"> · </span>Offline dataset: <strong>117,549 validated paths</strong>. Sample impact is not territory-wide coverage.</p>
  </header>;
}
