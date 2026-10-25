import { useMemo } from 'react';
import type { Provenance, ScenarioSnapshot } from '../../../contracts/types';
import { useIncident } from '../app/incident';
import { scenarioName, scenarioQualifier } from '../components/shell/IncidentBar';
import { FeederMap } from '../components/map/FeederMap';
import { SupplyPath } from '../components/map/SupplyPath';
import { EvidencePanel } from '../components/utility/EvidencePanel';
import { PlanningPanels } from '../components/utility/PlanningPanels';
import { TelemetryHUD } from '../components/utility/TelemetryHUD';
import { PROVENANCE, PROVENANCE_NOTE, kindLabel, numberText, sentenceCase, tokenTail, utcText } from '../components/utility/presentation';
import { incidentHotspots } from '../sentinel/hotspots';
import { AssetViewport } from '../three/AssetViewport';
import '../components/utility/utility.css';

export interface UtilityPageProps { snapshot: ScenarioSnapshot }

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** One paragraph that states only what the snapshot supplies. */
function Situation({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const source = snapshot.impact_source;
  const asset = tokenTail(snapshot.current_asset_id);
  const leading = snapshot.hypotheses[0];
  const r = snapshot.restoration;
  const reviewing = snapshot.status === 'UNDER_REVIEW';
  const dependents = snapshot.affected_premise_tokens.length;
  const faultElsewhere = source && source.fault_asset_token !== snapshot.current_asset_id;
  return <p className="console-summary">
    {snapshot.cutout_status === 'UNKNOWN'
      ? <>The cutout position on transformer <span className="mono">{asset}</span> is <strong>not asserted</strong>: its records conflict. </>
      : <>The protective cutout on transformer <span className="mono">{asset}</span> reads <strong>{snapshot.cutout_status.toLowerCase()}</strong>. </>}
    {reviewing ? <>Affected premises are <strong>not asserted</strong>. </>
      : source ? faultElsewhere
        ? <>The simulated fault sits upstream at {kindLabel(source.fault_asset_kind).toLowerCase()} <span className="mono">{tokenTail(source.fault_asset_token)}</span>, reaching <strong>{dependents} of {source.sample_premise_count}</strong> sample premises{source.full_source_known_dependent_count ? <> ({numberText(source.full_source_known_dependent_count, 0)} known in the full source)</> : null}. </>
        : <><strong>{dependents} of {source.sample_premise_count}</strong> sample premises depend on it. </>
      : null}
    {leading ? <>{reviewing && leading.code === 'INSUFFICIENT_EVIDENCE' ? 'The assessment abstains: ' : 'Leading hypothesis: '}{lowerFirst(leading.label)}. </> : 'No hypothesis is supplied. '}
    {r.kind === 'unavailable' ? 'No restoration range is supplied, and the crew package is assessment only.'
      : <>Planning range <strong>{numberText(r.lower_hours, 2)}–{numberText(r.upper_hours, 2)} h</strong>; the crew package is not approved.</>}
  </p>;
}

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

/** A read-only projection of the canonical incident. Camera and detail controls never mutate operational state. */
export function UtilityPage({ snapshot }: UtilityPageProps) {
  const { scenarios, busy } = useIncident();
  const meta = scenarios.find(item => item.id === snapshot.scenario_id);
  const name = meta ? scenarioName(meta.title) : sentenceCase(snapshot.scenario_id);
  const qualifier = meta ? scenarioQualifier(meta.title) : null;
  const [lead, ...rest] = name.split(' ');
  const hotspots = useMemo(() => incidentHotspots(snapshot), [snapshot]);
  const swapKey = `${snapshot.incident_id}-${snapshot.current_asset_id}-${snapshot.revision}`;
  return <div className="console" data-busy={busy} aria-busy={busy}>
    <a href="#hypotheses-heading" className="skip-link">Skip the model and review incident evidence</a>
    <header className="console-head page console-swap" key={`head-${swapKey}`}>
      <div className="console-head-title">
        <h1 className="display display-m"><em>{lead}</em> {rest.join(' ')}</h1>
        {qualifier ? <span className="tag" data-source="scenario">{qualifier}</span> : null}
      </div>
      <div className="console-head-body">
        <Situation snapshot={snapshot} />
        <dl className="console-meta">
          <div><dt>Incident</dt><dd className="mono">{snapshot.incident_id}</dd></div>
          <div><dt>Revision</dt><dd className="mono">{snapshot.revision}</dd></div>
          <div><dt>Snapshot</dt><dd><time className="mono" dateTime={snapshot.timestamp_utc}>{utcText(snapshot.timestamp_utc)}</time></dd></div>
          <div><dt>Inspected asset</dt><dd className="mono">{snapshot.current_asset_id}</dd></div>
        </dl>
      </div>
    </header>

    <div className="console-grid page">
      <div className="console-inspect">
        <AssetViewport key={snapshot.current_asset_id} status={snapshot.cutout_status} assetId={snapshot.current_asset_id} hotspots={hotspots} />
        <div className="console-swap" key={`hud-${swapKey}`}><TelemetryHUD snapshot={snapshot} /></div>
      </div>
      <div className="console-swap" key={`ev-${swapKey}`}><EvidencePanel snapshot={snapshot} /></div>
    </div>

    <div className="page">
      <SupplyPath snapshot={snapshot} />
    </div>

    <div className="page console-section console-swap" key={`plan-${swapKey}`}>
      <PlanningPanels snapshot={snapshot} />
    </div>

    <div className="page console-section console-pair">
      <FeederMap snapshot={snapshot} />
      <SourceLegend snapshot={snapshot} />
    </div>
  </div>;
}

export default UtilityPage;
