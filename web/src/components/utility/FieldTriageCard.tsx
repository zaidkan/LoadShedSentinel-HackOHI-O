import type { ScenarioSnapshot } from '../../../../contracts/types';
import { humanize } from './presentation';
import './field-triage.css';

type JevTarget = { name: string; decision: 'YES' | 'NO'; probability: number };

// Deterministic, modeled client fixtures. Values are scenario examples, not live readings.
const jevFixtures: Record<string, JevTarget[]> = {
  local_protection: [
    { name: 'Cutout Fuse Gate Assembly', decision: 'YES', probability: 0.88 },
    { name: 'Transformer Secondary Bushing', decision: 'NO', probability: 0.12 },
    { name: 'Surge Arrester Ground Path', decision: 'NO', probability: 0.07 },
  ],
  upstream_feeder: [
    { name: 'Upstream Lateral Tap / Recloser', decision: 'YES', probability: 0.91 },
    { name: 'Cutout Switch Terminal', decision: 'NO', probability: 0.15 },
    { name: 'Line Insulator Crossarm', decision: 'NO', probability: 0.09 },
  ],
  confirmed_replacement: [
    { name: '25-kVA Pole Transformer Core', decision: 'YES', probability: 0.96 },
    { name: 'Secondary Service Drop', decision: 'YES', probability: 0.78 },
    { name: 'Neutral Conductor Clamp', decision: 'NO', probability: 0.14 },
  ],
  insufficient_evidence: [
    { name: 'Cutout Switch Air Gap', decision: 'YES', probability: 0.54 },
    { name: 'Primary Riser Cable Shield', decision: 'NO', probability: 0.42 },
    { name: 'Tank Ground Connection', decision: 'NO', probability: 0.28 },
  ],
};

export function FieldTriageCard({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const targets = jevFixtures[snapshot.scenario_id];

  return <aside className="field-triage" aria-labelledby="field-triage-heading">
    <header className="field-triage-heading">
      <div>
        <h2 id="field-triage-heading">Electrician First-Investigation Triage</h2>
        <p>Top 3 Targets · Modeled Field Sensor Telemetry (Jev Decision Engine Gateway)</p>
      </div>
    </header>
    <dl className="field-triage-systems">
      <div><dt>Power Source</dt><dd>Solar + Liquid Energy Hybrid</dd></div>
      <div><dt>Comms</dt><dd>Satellite Cloud Uplink + Local Crew Wi-Fi AP</dd><dd className="field-triage-note">Modeled node link: {humanize(snapshot.solar.connectivity)}</dd></div>
      <div><dt>Engine</dt><dd>Cloud Jev Decision-Native Model</dd><dd className="field-triage-note">TypeSafe AI; Non-LLM, sub-ms yes/no probabilities · scenario fixture</dd></div>
    </dl>
    {targets ? <>
      <ol className="field-triage-targets" aria-label="Top three modeled inspection targets">
        {targets.map(({ name, decision, probability }) => <li key={name}>
          <strong>{name}</strong><span><b data-decision={decision}>{decision}</b> · Modeled fixture probability {Math.round(probability * 100)}%</span>
        </li>)}
      </ol>
      <p className="field-triage-note">Deterministic scenario fixture; probabilities are modeled examples, not live field readings. Confirm equipment condition on site before action.</p>
    </> : <p className="field-triage-note">No Jev fixture is defined for {snapshot.scenario_id}. Target predictions are unavailable.</p>}
    <p className="field-triage-note">{snapshot.current_asset_id} · revision {snapshot.revision}. Inspection triage does not authorize work or switching.</p>
  </aside>;
}
