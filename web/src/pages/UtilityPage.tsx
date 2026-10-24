import { useEffect, useState } from 'react';
import type { ScenarioSnapshot } from '../../../contracts/types';
import { fetchNetworkGeojson, type NetworkGeojson } from '../services/api';
import { AssetViewport } from '../three/AssetViewport';
import { TelemetryHUD } from '../components/utility/TelemetryHUD';
import { EvidencePanel } from '../components/utility/EvidencePanel';
import { PlanningPanels } from '../components/utility/PlanningPanels';
import { NetworkMapPanel } from '../components/utility/NetworkMapPanel';
import { PROVENANCE, humanize, utcText } from '../components/utility/presentation';
import '../components/utility/utility.css';

export interface UtilityPageProps { snapshot: ScenarioSnapshot }

/** A read-only projection of the canonical incident. Camera/detail controls never mutate operational state. */
export function UtilityPage({ snapshot }: UtilityPageProps) {
  const [network, setNetwork] = useState<NetworkGeojson | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchNetworkGeojson().then(n => { if (live) setNetwork(n); }).catch((e: Error) => { if (live) setNetworkError(e.message); });
    return () => { live = false; };
  }, []);
  return <section className="utility-console min-h-screen w-full" aria-labelledby="utility-page-heading">
    <a href="#utility-evidence-heading" className="utility-skip-link">Skip model and review incident evidence</a>
    <div className="utility-content">
      <div className="utility-incident-heading">
        <div><h1 id="utility-page-heading">Asset {snapshot.current_asset_id}</h1><p>{snapshot.incident_id} <span aria-hidden="true">/</span> {humanize(snapshot.scenario_id)}</p></div>
        <div className="utility-revision"><div><span className={`utility-badge utility-incident-${snapshot.status.toLowerCase()}`}>{humanize(snapshot.status)}</span><span className="utility-badge utility-badge-neutral">Revision {snapshot.revision}</span></div><time dateTime={snapshot.timestamp_utc}>{utcText(snapshot.timestamp_utc)}</time></div>
      </div>
      <div className="utility-disclosure" role="note"><span className="utility-disclosure-label">Source disclosure</span><p>{snapshot.disclosure}</p></div>
      <div className="utility-main-grid grid">
        <div className="utility-asset-column"><AssetViewport key={snapshot.current_asset_id} status={snapshot.cutout_status} assetId={snapshot.current_asset_id} /><TelemetryHUD snapshot={snapshot} /></div>
        <EvidencePanel snapshot={snapshot} />
      </div>
      <PlanningPanels snapshot={snapshot} />
      <NetworkMapPanel snapshot={snapshot} network={network} error={networkError} />
      <section className="utility-context-strip" aria-label="Incident scope and source legend">
        <details><summary>{snapshot.affected_premise_tokens.length} listed premises · selected {snapshot.selected_premise_token}</summary><ul className="utility-premise-list">{snapshot.affected_premise_tokens.map(token => <li key={token}><code>{token}</code></li>)}</ul></details>
        <details><summary>Data provenance legend</summary><dl className="utility-provenance-legend">{Object.entries(PROVENANCE).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'modeled_sensor' ? 'Modeled node input; not a field observation.' : key === 'scenario' ? 'Input supplied by the demonstration scenario.' : key === 'aep_challenge' ? 'Supplied challenge record; field quality is identified separately.' : key === 'external_research' ? 'External reference; not an operational feed.' : 'Authorized enterprise source; see each record’s quality.'}</dd></div>)}</dl></details>
      </section>
      <footer className="utility-footer"><span>Incident data shown as supplied · no local diagnoses or dispatch</span><span>{snapshot.incident_id} / revision {snapshot.revision}</span></footer>
    </div>
  </section>;
}

export default UtilityPage;
