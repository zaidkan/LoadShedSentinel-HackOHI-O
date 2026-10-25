import { useEffect, useState } from 'react';
import type { AEPSourceAsset } from '../services/api';
import { assessPrevention, compareResponse } from '../services/preventive';
import type { ComparisonInputs, ComparisonResult, PreventiveResult, SensorReading } from '../services/preventive';
import './preventive.css';

const PROFILES = [
  ['normal', 'Healthy load and ambient changes'],
  ['warming', 'Developing thermal trend'],
  ['persistent_multisensor', 'Persistent multi-sensor change'],
  ['storm_ready', 'Storm readiness, no local distress'],
  ['unknown', 'Unusable telemetry'],
];

const DEFAULT_INPUTS: ComparisonInputs = {
  shared_repair_hours: 3, shared_blocker_ready_hours: 0,
  evidence_status: 'sufficient', detection_lead_hours: 0,
  baseline: { diagnosis_hours: 0.5, coordination_hours: 0.5, analysis_overhead_hours: 0, wrong_crew_probability: 0.2, extra_dispatch_wait_hours: 4 },
  assisted: { diagnosis_hours: 0.5, coordination_hours: 0.5, analysis_overhead_hours: 0.25, wrong_crew_probability: 0.1, extra_dispatch_wait_hours: 4 },
};

function title(value: string) { return value.replace(/_/g, ' ').toLowerCase(); }
function hours(value: number) { return `${value.toFixed(2)} h`; }

function TrendChart({ readings }: { readings: SensorReading[] }) {
  if (!readings.length) return <p>No observations available.</p>;
  const observed = readings.map(row => row.temperature_c - row.ambient_c - (10 + 0.2 * row.load_pct));
  const reference = observed.slice(0, 2).reduce((a, b) => a + b, 0) / Math.min(2, observed.length);
  const changes = observed.map(value => value - reference);
  const low = Math.min(-2, ...changes), high = Math.max(12, ...changes);
  const y = (value: number) => 148 - (value - low) / (high - low) * 116;
  const x = (index: number) => 30 + index / Math.max(1, changes.length - 1) * 540;
  return <figure className="preventive-trend">
    <figcaption>Temperature departure after ambient/load adjustment</figcaption>
    <svg viewBox="0 0 600 190" role="img" aria-label="Modeled temperature change compared with the initial contextual baseline">
      <line x1="30" x2="570" y1={y(0)} y2={y(0)} stroke="#50647c" strokeDasharray="5 5" />
      <polyline points={changes.map((value, index) => `${x(index)},${y(value)}`).join(' ')} fill="none" stroke="#60d5be" strokeWidth="3" />
      {changes.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="4" fill="#60d5be"><title>{`${readings[index].timestamp_utc}: ${value.toFixed(1)} °C departure`}</title></circle>)}
      <text x="30" y="177">Earlier readings</text><text x="458" y="177">Latest reading</text>
      <text x="32" y="20">Latest: {changes[changes.length - 1]?.toFixed(1)} °C above reference</text>
    </svg>
    <p>Modeled series. Context adjustment and alert thresholds are demonstration assumptions.</p>
  </figure>;
}

export function PreventivePage({ assets }: { assets: AEPSourceAsset[] }) {
  const transformers = assets.filter(asset => asset.kind === 'TRANSFORMER');
  const [assetToken, setAssetToken] = useState(transformers[0]?.asset_token ?? '');
  const [profile, setProfile] = useState('persistent_multisensor');
  const [assessment, setAssessment] = useState<PreventiveResult | null>(null);
  const [inputs, setInputs] = useState<ComparisonInputs>(DEFAULT_INPUTS);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [conditionError, setConditionError] = useState('');
  const [responseError, setResponseError] = useState('');
  const usableMonitoring = assessment?.assessment.assessment_status === 'AVAILABLE';

  useEffect(() => {
    if (!assetToken && transformers[0]) setAssetToken(transformers[0].asset_token);
  }, [assets, assetToken]);

  useEffect(() => {
    if (!assetToken) return;
    const controller = new AbortController();
    setAssessment(null); setConditionError('');
    assessPrevention(assetToken, profile, controller.signal).then(result => {
      if (!controller.signal.aborted) setAssessment(result);
    }).catch(error => {
      if (!controller.signal.aborted) setConditionError(error.message);
    });
    return () => controller.abort();
  }, [assetToken, profile]);

  useEffect(() => {
    if (!assetToken) return;
    const controller = new AbortController();
    setComparison(null); setResponseError('');
    const comparisonInputs = { ...inputs, evidence_status: usableMonitoring ? inputs.evidence_status : 'unknown' as const };
    compareResponse(assetToken, comparisonInputs, controller.signal).then(result => {
      if (!controller.signal.aborted) setComparison(result);
    }).catch(error => {
      if (!controller.signal.aborted) setResponseError(error.message);
    });
    return () => controller.abort();
  }, [assetToken, inputs, usableMonitoring]);

  function updateShared(key: 'shared_repair_hours' | 'shared_blocker_ready_hours', value: number) {
    setInputs(previous => ({ ...previous, [key]: value }));
  }
  function updateArm(arm: 'baseline' | 'assisted', key: 'wrong_crew_probability' | 'extra_dispatch_wait_hours' | 'analysis_overhead_hours', value: number) {
    setInputs(previous => ({ ...previous, [arm]: { ...previous[arm], [key]: value } }));
  }

  const condition = assessment?.assessment;
  return <div className="preventive-page">
    <header className="preventive-intro">
      <div><p className="preventive-eyebrow">BEFORE A FAULT IS DECLARED</p><h1>Preventive monitoring & response evidence</h1>
        <p>Screen condition trends, prepare for a storm, then test whether better information changes response time.</p></div>
      <span className="preventive-badge">Modeled sensors · AEP source context</span>
    </header>

    <section className="preventive-card" aria-labelledby="condition-heading">
      <div className="preventive-section-title"><div><p className="preventive-eyebrow">1 · CONDITION AND READINESS</p><h2 id="condition-heading">Review a pre-fault sensor history</h2></div>
        <div className="preventive-controls">
          <label>Source transformer<select value={assetToken} onChange={event => setAssetToken(event.target.value)}>{transformers.map(asset => <option key={asset.asset_token} value={asset.asset_token}>{asset.asset_token.slice(-8)} · {asset.dependent_premises_in_sample} sample premises</option>)}</select></label>
          <label>Modeled history<select value={profile} onChange={event => setProfile(event.target.value)}>{PROFILES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        </div>
      </div>
      {conditionError && <p role="alert" className="preventive-error">{conditionError}</p>}
      {!assetToken && <p>No verified transformer catalog is available.</p>}
      {assetToken && !condition && !conditionError && <p role="status">Assessing the modeled sensor history…</p>}
      {condition && assessment && <>
        <div className="preventive-metrics" aria-live="polite">
          <div><span>Condition priority</span><strong>{title(condition.condition_priority)}</strong></div>
          <div><span>Storm readiness</span><strong>{title(condition.readiness)}</strong></div>
          <div><span>Condition outlook (modeled)</span><strong>{condition.service_state === 'NORMAL' ? 'Baseline compatible' : condition.service_state === 'AT_RISK' ? 'Review flagged' : 'Unknown'}</strong></div>
          <div><span>Outage confirmed</span><strong>No</strong></div>
        </div>
        <div className="preventive-grid">
          <div>{usableMonitoring ? <TrendChart readings={assessment.input_series} /> : <p>Current telemetry is insufficient; no condition trend is asserted.</p>}
            <ul className="preventive-indicators">{condition.indicators.map(indicator => <li key={indicator.name}><span>{title(indicator.name)}</span><b>{indicator.persistent ? 'Persistent change' : indicator.warming_trend ? 'Rising trend' : 'No persistent change'}</b></li>)}</ul>
            <p className="preventive-note">{condition.coverage.usable_samples}/{condition.coverage.received_samples} usable samples · confidence: {title(condition.evidence_confidence.level)}. {condition.evidence_confidence.basis}</p>
            <p className="preventive-note">The initial readings are a comparison baseline, not a verified healthy state. This assessment does not establish whether equipment is energized.</p>
          </div>
          <div className="preventive-actions"><h3>Utility review</h3><ul>{condition.recommendation.capabilities.map(capability => <li key={capability}>{capability}</li>)}</ul>
            <p>Human approval required. No crew is dispatched by this assessment.</p>
            <h3>Customer advisory preview</h3><p>{condition.customer_message}</p>
            <p className="preventive-note">{assessment.source_context.dependent_premises_in_sample} source-dependent premises in a {assessment.source_context.sample_premise_count}-premise sample. This is dependency context, not an outage count.</p>
            {condition.validation_errors.length > 0 && <p className="preventive-error">{condition.validation_errors.join(' ')}</p>}
          </div>
        </div>
        <details><summary>Model assumptions and limits</summary><ul>{condition.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
      </>}
    </section>

    <section className="preventive-card" aria-labelledby="response-heading">
      <div className="preventive-section-title"><div><p className="preventive-eyebrow">2 · CONDITIONAL RESPONSE BENEFIT</p><h2 id="response-heading">What time saving follows from your assumptions?</h2></div><span className="preventive-badge">Simulation · not field measured</span></div>
      <p>The repair job is identical in both workflows. Change the assumed chance of a second dispatch, its extra queue delay, and review overhead. These probabilities are inputs, not measured model accuracy. An unusable monitoring replay receives no automation credit.</p>
      <div className="preventive-assumptions">
        <label>Shared repair duration (hours)<input type="number" min="0" max="72" step="0.25" value={inputs.shared_repair_hours} onChange={event => updateShared('shared_repair_hours', event.target.valueAsNumber)} /></label>
        <label>Shared access/upstream clearance (hours)<input type="number" min="0" max="72" step="0.5" value={inputs.shared_blocker_ready_hours} onChange={event => updateShared('shared_blocker_ready_hours', event.target.valueAsNumber)} /></label>
        <label>Advisory evidence<select disabled={!usableMonitoring} value={usableMonitoring ? inputs.evidence_status : 'unknown'} onChange={event => setInputs(previous => ({ ...previous, evidence_status: event.target.value as ComparisonInputs['evidence_status'] }))}><option value="sufficient">Assume usable evidence</option><option value="insufficient">Insufficient: retain baseline workflow</option><option value="unknown">Unknown: retain baseline workflow</option></select></label>
        {(['baseline', 'assisted'] as const).map(arm => <fieldset key={arm}><legend>{arm === 'baseline' ? 'Baseline response' : 'Sentinel-assisted response'}</legend>
          <label>Assumed repeat-dispatch chance (%)<input type="number" min="0" max="100" step="5" value={inputs[arm].wrong_crew_probability * 100} onChange={event => updateArm(arm, 'wrong_crew_probability', event.target.valueAsNumber / 100)} /></label>
          <label>Extra dispatch queue delay (hours)<input type="number" min="0" max="72" step="0.5" value={inputs[arm].extra_dispatch_wait_hours} onChange={event => updateArm(arm, 'extra_dispatch_wait_hours', event.target.valueAsNumber)} /></label>
          <label>Additional analysis overhead (hours)<input type="number" min="0" max="24" step="0.25" value={inputs[arm].analysis_overhead_hours} onChange={event => updateArm(arm, 'analysis_overhead_hours', event.target.valueAsNumber)} /></label>
          <p>Shared assumptions: 0.5 h assessment and 0.5 h coordination per workflow. Extra queue delay is not a second repair/travel labor allowance.</p>
        </fieldset>)}
      </div>
      {responseError && <p role="alert" className="preventive-error">{responseError}</p>}
      {comparison && <div className="preventive-metrics" aria-live="polite">
        <div><span>Baseline expected outage</span><strong>{hours(comparison.baseline.outage_hours.expected)}</strong></div>
        <div><span>Assisted expected outage</span><strong>{hours(comparison.assisted.outage_hours.expected)}</strong></div>
        <div><span>Net modeled time saved</span><strong>{hours(comparison.savings_hours.expected)}</strong><small>{(comparison.savings_hours.expected * 60).toFixed(1)} minutes; negative means slower</small></div>
        <div><span>Assumption envelope</span><strong>{hours(comparison.savings_hours.lower)} to {hours(comparison.savings_hours.upper)}</strong><small>Not a statistical confidence interval</small></div>
      </div>}
      <p className="preventive-note">Unknown evidence falls back to the baseline. Shared access or upstream blockers can eliminate the time benefit. Earlier detection does not automatically mean an outage was prevented.</p>
      <details><summary>Reproduce the benchmark and inspect its assumptions</summary><p><a href="/api/response/benchmark" target="_blank" rel="noreferrer">Open the deterministic benchmark JSON</a>. It includes zero-benefit and slower-assisted cases, not only favorable scenarios.</p>{comparison && <ul>{comparison.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>}</details>
    </section>

    <section className="preventive-card preventive-evidence"><h2>What the evidence supports</h2>
      <p>The 1,659 supplied AEP damage records have date-only report/repair fields and no usable crew-dispatch timeline. They cannot establish an 8–10-hour saving for this product.</p>
      <p>A PG&E line-sensor pilot analyzed 25 outages and estimated 12.6% customer-minute savings achieved or potentially achievable. That is an analogous utility result, not Sentinel's measured performance.</p>
      <a href="https://www.pge.com/assets/rates/tariffs/assets/pdf/adviceletter/ELEC_4990-E.pdf#page=57" target="_blank" rel="noreferrer">Read the primary utility pilot report</a>
      <p>Research supports contextual monitoring and precursor-informed inspection. Our sensor thresholds and response assumptions still need asset-specific field validation.</p>
    </section>
  </div>;
}
