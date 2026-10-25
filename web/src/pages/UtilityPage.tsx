import type { ScenarioSnapshot } from '../../../contracts/types';
import { useEffect, useState } from 'react';
import { advanceScenario } from '../services/api';
import { AssetViewport } from '../three/AssetViewport';
import { FeederMap } from '../components/map/FeederMap';
import { TelemetryHUD } from '../components/utility/TelemetryHUD';
import { EvidencePanel } from '../components/utility/EvidencePanel';
import { PlanningPanels } from '../components/utility/PlanningPanels';
import { UtilityIcon } from '../components/utility/UtilityIcon';
import { PROVENANCE, humanize, utcText } from '../components/utility/presentation';
import '../components/utility/utility.css';

export interface UtilityPageProps {
  snapshot: ScenarioSnapshot;
  onSnapshotChange: (snapshot: ScenarioSnapshot) => void;
}

const planningInputs = (snapshot: ScenarioSnapshot) => snapshot.planning_inputs ?? {
  crew_size: snapshot.scenario_id === 'local_protection' ? 2 : 3,
  access_hours: 0,
};

/** Planning controls request a revised canonical snapshot; no local restoration math. */
export function UtilityPage({ snapshot, onSnapshotChange }: UtilityPageProps) {
  const [inputs, setInputs] = useState(planningInputs(snapshot));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setInputs(planningInputs(snapshot));
    setError('');
  }, [snapshot]);

  useEffect(() => {
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
        // Preserve accepted inputs when the API omits their optional echo.
        onSnapshotChange({ ...next, planning_inputs: next.planning_inputs ?? inputs });
      } catch {
        if (active) setError('Planning update failed. The range still uses the previous assumptions. Retry the update or reset the scenario to reload it.');
      } finally {
        if (active) setPending(false);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [inputs, snapshot, retry]);

  return <section className="utility-console min-h-screen w-full" aria-labelledby="utility-page-heading">
    <a href="#utility-evidence-heading" className="utility-skip-link">Skip model and review incident evidence</a>
    <header className="utility-topbar">
      <div className="utility-brand"><span className="utility-brand-symbol"><UtilityIcon kind="pole" /></span><span>LoadShed <strong>Sentinel</strong></span><span className="utility-console-label">Utility console</span></div>
      <span className="utility-badge utility-badge-neutral">HackOHI/O 2026 · demonstration</span>
    </header>
    <div className="utility-content">
      <div className="utility-incident-heading">
        <div><h1 id="utility-page-heading">Asset {snapshot.current_asset_id}</h1><p>{snapshot.incident_id} <span aria-hidden="true">/</span> {humanize(snapshot.scenario_id)}</p></div>
        <div className="utility-revision"><div><span className={`utility-badge utility-incident-${snapshot.status.toLowerCase()}`}>{humanize(snapshot.status)}</span><span className="utility-badge utility-badge-neutral">Revision {snapshot.revision}</span></div><time dateTime={snapshot.timestamp_utc}>{utcText(snapshot.timestamp_utc)}</time></div>
      </div>
      <div className="utility-disclosure" role="note"><span className="utility-disclosure-label">Source disclosure</span><p>{snapshot.disclosure}</p></div>
      <div className="utility-main-grid grid">
        <div className="utility-asset-column"><AssetViewport key={snapshot.current_asset_id} status={snapshot.cutout_status} assetId={snapshot.current_asset_id} /><FeederMap snapshot={snapshot} /><TelemetryHUD snapshot={snapshot} /></div>
        <EvidencePanel snapshot={snapshot} />
      </div>
      <PlanningPanels
        snapshot={snapshot}
        inputs={inputs}
        onInputsChange={setInputs}
        pending={pending}
        error={error}
        onRetry={() => setRetry(value => value + 1)}
      />
      <section className="utility-context-strip" aria-label="Incident scope and source legend">
        <details><summary>{snapshot.affected_premise_tokens.length} listed premises · selected {snapshot.selected_premise_token}</summary><ul className="utility-premise-list">{snapshot.affected_premise_tokens.map(token => <li key={token}><code>{token}</code></li>)}</ul><p>Supply path unavailable in this snapshot.</p></details>
        <details><summary>Data provenance legend</summary><dl className="utility-provenance-legend">{Object.entries(PROVENANCE).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'modeled_sensor' ? 'Modeled node input; not a field observation.' : key === 'scenario' ? 'Input supplied by the demonstration scenario.' : key === 'aep_challenge' ? 'Supplied challenge record; field quality is identified separately.' : key === 'external_research' ? 'External reference; not an operational feed.' : 'Authorized enterprise source; see each record’s quality.'}</dd></div>)}</dl></details>
      </section>
      <footer className="utility-footer"><span>Incident data shown as supplied · no local diagnoses or dispatch</span><span>{snapshot.incident_id} / revision {snapshot.revision}</span></footer>
    </div>
  </section>;
}

export default UtilityPage;
