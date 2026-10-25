import type { Provenance, ScenarioSnapshot } from '../../../contracts/types';
import { useEffect, useState } from 'react';
import { advanceScenario } from '../services/api';
import { AssetViewport } from '../three/AssetViewport';
import { FeederMap } from '../components/map/FeederMap';
import { SupplyPath } from '../components/map/SupplyPath';
import { TelemetryHUD } from '../components/utility/TelemetryHUD';
import { EvidencePanel } from '../components/utility/EvidencePanel';
import { PlanningPanels } from '../components/utility/PlanningPanels';
import { DecisionSummary } from '../components/utility/DecisionSummary';
import { CounterfactualCompareCard } from '../components/utility/CounterfactualCompareCard';
import { PROVENANCE, PROVENANCE_NOTE } from '../components/utility/presentation';
import '../components/utility/utility.css';

export interface UtilityPageProps {
  snapshot: ScenarioSnapshot;
  onSnapshotChange?: (snapshot: ScenarioSnapshot) => void;
  onSelectScenario?: (scenarioId: string) => void;
}

const planningInputs = (snapshot: ScenarioSnapshot) => snapshot.planning_inputs ?? {
  crew_size: snapshot.scenario_id === 'local_protection' ? 2 : 3,
  access_hours: 0,
};

function SourceLegend({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const counts = snapshot.evidence.reduce<Partial<Record<Provenance, number>>>((acc, e) => ({ ...acc, [e.provenance]: (acc[e.provenance] ?? 0) + 1 }), {});
  const fieldConfirmed = snapshot.evidence.filter(e => e.quality === 'field_confirmed').length;
  return <section className="console-block" aria-labelledby="legend-heading">
    <header className="block-head">
      <h2 id="legend-heading" className="console-h2"><em>Source</em> legend</h2>
      <p className="block-sub">Every reading in this console carries one of these sources. Bracketed counts are evidence records in this incident.</p>
    </header>
    <ul className="legend-list">
      {(Object.keys(PROVENANCE) as Provenance[]).map(key => <li key={key}>
        <span className="tag" data-source={key}>{PROVENANCE[key]}</span>
        <p>{PROVENANCE_NOTE[key]}</p>
        <span className="mono legend-count" data-zero={!counts[key] || undefined}><span aria-hidden="true">[{counts[key] ?? 0}]</span><span className="sr-only">{counts[key] ?? 0} evidence records in this incident</span></span>
      </li>)}
      <li>
        <span className="tag" data-source="field_confirmed">Field confirmed</span>
        <p>Quality mark for records the scenario declares as confirmed in the field.</p>
        <span className="mono legend-count" data-zero={!fieldConfirmed || undefined}><span aria-hidden="true">[{fieldConfirmed}]</span><span className="sr-only">{fieldConfirmed} evidence records in this incident</span></span>
      </li>
    </ul>
  </section>;
}

/** Planning controls request a revised canonical snapshot; no local restoration math. */
export function UtilityPage({ snapshot, onSnapshotChange, onSelectScenario }: UtilityPageProps) {
  const [inputs, setInputs] = useState(planningInputs(snapshot));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setInputs(planningInputs(snapshot));
    setError('');
    setPending(false);
  }, [snapshot]);

  useEffect(() => {
    if (!onSnapshotChange) return;
    const supplied = planningInputs(snapshot);
    if (inputs.crew_size === supplied.crew_size && inputs.access_hours === supplied.access_hours) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setPending(true);
      setError('');
      try {
        const next = await advanceScenario({
          incident_id: snapshot.incident_id,
          expected_revision: snapshot.revision,
          crew_size: inputs.crew_size,
          access_hours: inputs.access_hours,
        });
        if (next.incident_id !== snapshot.incident_id || next.current_asset_id !== snapshot.current_asset_id || next.revision <= snapshot.revision || (next.planning_inputs && (next.planning_inputs.crew_size !== inputs.crew_size || next.planning_inputs.access_hours !== inputs.access_hours))) {
          throw new Error('The API did not apply the planning inputs.');
        }
        if (active) onSnapshotChange({ ...next, planning_inputs: next.planning_inputs ?? inputs });
      } catch {
        if (active) setError('Planning update failed. The range still uses the previous assumptions. Retry the update or reset the scenario to reload it.');
      } finally {
        if (active) setPending(false);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [inputs, snapshot, retry, onSnapshotChange]);

  return <section className="utility-console min-h-screen w-full" aria-labelledby="utility-page-heading">
    <a href="#utility-evidence-heading" className="utility-skip-link">Skip model and review incident evidence</a>
    <div className="utility-content">
      <DecisionSummary snapshot={snapshot} />
      <CounterfactualCompareCard snapshot={snapshot} onSelectScenario={onSelectScenario} />
      <nav className="utility-review-nav" aria-label="Incident review steps"><a href="#utility-telemetry-heading">Modeled telemetry</a><a href="#utility-evidence-heading">Diagnosis & uncertainty</a><a href="#utility-work-heading">Review-only work package</a><a href="#utility-feeder-heading">Feeder context</a><a href="#utility-supply-heading">Supply path</a></nav>
      <section className="utility-review-section" aria-labelledby="utility-telemetry-heading">
        <div className="utility-section-heading"><h2 id="utility-telemetry-heading">Modeled telemetry</h2><p>Inspect the equipment and simulated inputs before reviewing a cause.</p></div>
        <div className="utility-main-grid">
          <AssetViewport key={snapshot.current_asset_id} status={snapshot.cutout_status} assetId={snapshot.current_asset_id} solar={snapshot.solar} />
          <TelemetryHUD snapshot={snapshot} />
        </div>
      </section>
      <section className="utility-review-section" aria-labelledby="utility-evidence-heading">
        <div className="utility-section-heading"><h2 id="utility-evidence-heading">Diagnosis & uncertainty</h2><p>Working hypotheses explain the evidence. Field confirmation remains a separate step.</p></div>
        <EvidencePanel snapshot={snapshot} />
      </section>
      <section className="utility-review-section" aria-labelledby="utility-work-heading">
        <div className="utility-section-heading"><h2 id="utility-work-heading">Review-only work package</h2><p>Review capabilities, labor and access assumptions. Nothing here authorizes work.</p></div>
        <PlanningPanels
          snapshot={snapshot}
          inputs={inputs}
          onInputsChange={setInputs}
          pending={pending}
          error={error}
          onRetry={() => setRetry(value => value + 1)}
        />
      </section>
      <section className="utility-review-section" aria-labelledby="utility-supply-heading">
        <div className="utility-section-heading"><h2 id="utility-supply-heading">Supply path</h2><p>Traced dependency tree from transmission and circuit breaker to premises.</p></div>
        <SupplyPath snapshot={snapshot} />
      </section>
      <section className="utility-review-section" aria-labelledby="utility-feeder-heading">
        <div className="utility-section-heading"><h2 id="utility-feeder-heading">Feeder context</h2><p>Locate the asset in supplied dependencies. Arrows do not indicate live energization.</p></div>
        <FeederMap snapshot={snapshot} />
        <div className="utility-context-strip">
          <details><summary>{snapshot.status === 'UNDER_REVIEW' ? 'Affected premises unknown' : `${snapshot.affected_premise_tokens.length} listed sample premises`} · selected {snapshot.selected_premise_token}</summary>{snapshot.affected_premise_tokens.length ? <ul className="utility-premise-list">{snapshot.affected_premise_tokens.map(token => <li key={token}><code>{token}</code></li>)}</ul> : <p className="utility-muted">No affected premises asserted in this snapshot.</p>}<p className="utility-muted">Only the selected challenge subnet is represented. Physical substation connectivity remains unknown beyond the supplied circuit-breaker paths.</p></details>
          <details><summary>Source disclosure & provenance</summary><p className="utility-muted">{snapshot.disclosure}</p><dl className="utility-provenance-legend">{Object.entries(PROVENANCE).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'modeled_sensor' ? 'Modeled Simulation; not a field observation or live supervisory control and data acquisition (SCADA) feed.' : key === 'scenario' ? 'Input supplied by the demonstration scenario.' : key === 'aep_challenge' ? 'Supplied challenge record; field quality is identified separately.' : key === 'external_research' ? 'External reference; not an operational feed.' : 'Authorized enterprise source; see each record’s quality.'}</dd></div>)}</dl></details>
        </div>
      </section>
      <SourceLegend snapshot={snapshot} />
      <footer className="utility-footer"><span>Demonstration · operator review required · no live dispatch</span><span>{snapshot.incident_id} / revision {snapshot.revision}</span></footer>
    </div>
  </section>;
}

export default UtilityPage;
