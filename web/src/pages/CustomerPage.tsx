import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import type { ScenarioSnapshot } from '../../../contracts/types';
import { useIncident } from '../app/incident';
import { BatteryPlanner, INVERTER_EFFICIENCY, RESERVE_MARGIN } from '../components/customer/BatteryPlanner';
import { DEFAULT_NEEDS, GuidanceList, NeedsPicker, type HouseholdNeeds } from '../components/customer/HouseholdNeeds';
import { localClockAfter, localDateTime } from '../components/customer/time';
import { scenarioName, scenarioQualifier } from '../components/shell/IncidentBar';
import { hoursWords, kindLabel, numberText, sentenceCase, tokenTail } from '../components/utility/presentation';
import {
  calculateBatteryRuntime,
  fetchCustomerSnapshot,
  fetchPreparednessGuidance,
  lookupPremiseTopology,
  type BatteryCalcResult,
  type CustomerSnapshotView,
  type PreparednessGuidance,
  type TopologyTrace,
} from '../services/api';
import '../components/customer/customer.css';

export interface CustomerPageProps {
  snapshot: ScenarioSnapshot;
  scenarioId?: string;
}

type Status = CustomerSnapshotView['status'];

const HEADLINE: Record<Status, [string, string]> = {
  OUTAGE: ['Your', 'power is out'],
  UNDER_REVIEW: ['We’re', 'checking your service'],
  AT_RISK: ['Your', 'service is at risk'],
  RESTORED: ['Your', 'power is back'],
  NORMAL: ['No', 'outage reported'],
};

const NOTICE_LABEL: Record<string, string> = {
  OUTAGE_CONFIRMED: 'Outage confirmed',
  ESTIMATE_UPDATED: 'Estimate updated',
  RESTORED: 'Power restored',
  AT_RISK: 'Risk alert',
};

const RISK_STATE: Record<string, string> = { HIGH: 'critical', MODERATE: 'open', LOW: 'normal', UNKNOWN: 'unknown' };

/** Survives the remount that follows each incident revision, so a household keeps its plan within the session. */
let rememberedNeeds: HouseholdNeeds = DEFAULT_NEEDS;

function statusBody(view: CustomerSnapshotView): string {
  const source = view.impact_source;
  switch (view.status) {
    case 'OUTAGE': {
      const reach = source ? source.full_source_known_dependent_count && source.full_source_known_dependent_count > source.affected_count_in_sample
        ? ` ${source.affected_count_in_sample} of the ${source.sample_premise_count} sample premises share the same equipment, and so do ${numberText(source.full_source_known_dependent_count, 0)} premises in the full AEP source.`
        : ` ${source.affected_count_in_sample} of the ${source.sample_premise_count} sample premises share the same equipment.` : '';
      return `This premise depends on ${source ? `a ${kindLabel(source.fault_asset_kind).toLowerCase()}` : 'equipment'} with a simulated fault.${reach} The cause is still being assessed.`;
    }
    case 'UNDER_REVIEW': return 'Readings from the equipment that serves this premise disagree, so we are not saying whether the power is out. A qualified crew needs to check it before anyone gives a restoration time.';
    case 'AT_RISK': return 'Equipment that serves this premise is flagged as at risk in this scenario.';
    case 'RESTORED': return 'Service is shown as restored in this scenario.';
    default: return 'No outage is reported for this premise in this scenario.';
  }
}

export function CustomerPage({ snapshot: scenarioSnapshot, scenarioId }: CustomerPageProps) {
  const { scenarios } = useIncident();
  const [view, setView] = useState<CustomerSnapshotView | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [premiseToken, setPremiseToken] = useState('');
  const [trace, setTrace] = useState<TopologyTrace | null>(null);
  const [tracedToken, setTracedToken] = useState('');
  const [traceState, setTraceState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [needs, setNeedsState] = useState<HouseholdNeeds>(rememberedNeeds);
  const [battery, setBattery] = useState<BatteryCalcResult | null>(null);
  const [batteryState, setBatteryState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [guidance, setGuidance] = useState<PreparednessGuidance[]>([]);
  const [guidanceState, setGuidanceState] = useState<'idle' | 'loading' | 'error'>('idle');
  const requestSeq = useRef(0);

  const setNeeds = (next: HouseholdNeeds) => { rememberedNeeds = next; setNeedsState(next); };

  const runTrace = async (token: string) => {
    const premise = token.trim().toUpperCase();
    if (!premise) return;
    setTraceState('loading');
    try {
      setTrace(await lookupPremiseTopology(premise));
      setTracedToken(premise);
      setTraceState('idle');
    } catch (error) {
      console.error('Topology lookup failed', error);
      setTraceState('error');
    }
  };

  useEffect(() => {
    let live = true;
    setLoadState('loading');
    fetchCustomerSnapshot()
      .then(data => {
        if (!live) return;
        setView(data);
        // This selected premise is drawn from the same source-dependent fault footprint.
        setPremiseToken(data.selected_premise_token);
        setTrace(null);
        setLoadState('ready');
        void runTrace(data.selected_premise_token);
      })
      .catch(error => { console.error('Failed to load customer snapshot', error); if (live) setLoadState('error'); });
    return () => { live = false; };
  }, [scenarioId, scenarioSnapshot.incident_id, scenarioSnapshot.revision, scenarioSnapshot.current_asset_id, attempt]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      const valid = needs.battery_capacity_wh > 0 && needs.essential_load_w > 0;
      setGuidanceState('loading');
      if (valid) setBatteryState('loading');
      const [runtime, steps] = await Promise.allSettled([
        valid ? calculateBatteryRuntime({
          capacity_wh: needs.battery_capacity_wh,
          usable_fraction: needs.battery_usable_pct,
          device_w: needs.essential_load_w,
          inverter_efficiency: INVERTER_EFFICIENCY,
          reserve_margin_pct: RESERVE_MARGIN,
        }) : Promise.resolve(null),
        fetchPreparednessGuidance(needs),
      ]);
      if (seq !== requestSeq.current) return;
      if (runtime.status === 'fulfilled') { setBattery(runtime.value); setBatteryState('idle'); } else { console.error('Battery calc error', runtime.reason); setBatteryState('error'); }
      if (steps.status === 'fulfilled') { setGuidance(steps.value); setGuidanceState('idle'); } else { console.error('Guidance error', steps.reason); setGuidanceState('error'); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [needs]);

  const meta = scenarios.find(item => item.id === (view?.scenario_id ?? scenarioId));
  const restoration = view?.restoration_planning;
  const hasRange = !!restoration && restoration.kind !== 'unavailable' && restoration.expected_hours !== null;
  const outlook = useMemo(() => !view || !hasRange ? [] : [
    { label: 'Earliest', hours: restoration!.lower_hours },
    { label: 'Most likely', hours: restoration!.expected_hours },
    { label: 'Latest', hours: restoration!.upper_hours },
  ], [view, hasRange, restoration]);

  if (loadState === 'error' && !view) return <div className="page cust-state" role="alert">
    <h1 className="display display-m"><em>We</em> can’t load your status</h1>
    <p className="lead">The outage service did not answer. Nothing is shown until it does, so you never see an old status.</p>
    <button type="button" className="btn btn--accent" onClick={() => setAttempt(value => value + 1)}>Try again</button>
  </div>;
  if (!view) return <div className="page cust-state" role="status"><p className="muted">Loading your service status…</p></div>;

  const [lead, rest] = HEADLINE[view.status] ?? HEADLINE.NORMAL;
  const fault = view.impact_source?.fault_asset_token;
  const showFault = view.status === 'OUTAGE';
  const steps = trace?.status === 'KNOWN' && trace.equipment?.length ? trace.equipment : null;

  const submitTrace = (event: FormEvent) => { event.preventDefault(); void runTrace(premiseToken); };

  return <div className="cust">
    <section className="cust-hero page" aria-labelledby="cust-status">
      <div className="cust-hero-main">
        <span className="state" data-state={view.status.toLowerCase()}>{sentenceCase(view.status)} · simulated</span>
        <h1 id="cust-status" className="display display-l"><em>{lead}</em> {rest}</h1>
        <p className="lead">{statusBody(view)}</p>
      </div>
      <aside className="cust-premise" aria-label="This premise">
        <dl>
          <div><dt>Premise</dt><dd className="mono">{view.selected_premise_token}</dd></div>
          <div><dt>Scenario</dt><dd>{meta ? scenarioName(meta.title) : sentenceCase(view.scenario_id)}{meta && scenarioQualifier(meta.title) ? <span className="tag" data-source="scenario">{scenarioQualifier(meta.title)}</span> : null}</dd></div>
          <div><dt>Status as of</dt><dd><time dateTime={view.timestamp_utc}>{localDateTime(view.timestamp_utc)}</time></dd></div>
        </dl>
        <p className="cust-premise-note">A demonstration on AEP-supplied equipment paths. Not a live outage.</p>
      </aside>
    </section>

    <section className="cust-outlook page" aria-labelledby="cust-outlook-heading">
      <h2 id="cust-outlook-heading" className="cust-h2"><em>When</em> power could return</h2>
      {hasRange ? <>
        <ol className="outlook">
          {outlook.map(item => <li key={item.label} data-emphasis={item.label === 'Most likely' || undefined}>
            <span className="outlook-label">{item.label}</span>
            <span className="outlook-time">{localClockAfter(view.timestamp_utc, item.hours) ?? 'Unknown'}</span>
            <span className="outlook-after">{hoursWords(item.hours)} after the outage began</span>
          </li>)}
        </ol>
        <p className="cust-note">A planning estimate under this scenario’s assumptions, not a promise. Times are shown in your time zone.</p>
      </> : <div className="outlook-none">
        <p className="title">No restoration time yet</p>
        <p className="muted">{view.status === 'UNDER_REVIEW' ? 'The equipment readings conflict, so no time is given until a crew has assessed it.' : 'No estimate is supplied for this premise.'}</p>
      </div>}
      {restoration?.assumptions.length ? <details className="cust-details">
        <summary>How this {hasRange ? 'estimate was made' : 'was decided'}</summary>
        <ul>{restoration.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </details> : null}
    </section>

    <section className="cust-section page" aria-labelledby="cust-updates">
      <header className="cust-section-head">
        <h2 id="cust-updates" className="cust-h2"><em>Updates</em> for you</h2>
        <p className="cust-note">Messages this premise would receive. In this demonstration none are actually sent.</p>
      </header>
      <div className="cust-section-body">
        {view.notifications.length ? <ol className="timeline">
          {[...view.notifications].reverse().map((notice, index) => <li key={`${notice.type}-${index}`}>
            <div className="timeline-meta">
              <strong>{NOTICE_LABEL[notice.type] ?? sentenceCase(notice.type)}</strong>
              <time dateTime={notice.sent_at_utc}>{localDateTime(notice.sent_at_utc)}</time>
              {notice.delivery_mode === 'demo' ? <span className="tag" data-source="scenario">Demo · not sent</span> : null}
            </div>
            <p>{notice.text}</p>
          </li>)}
        </ol> : <p className="cust-empty">No updates have been sent for this premise{view.status === 'UNDER_REVIEW' ? ' while the readings are checked' : ''}.</p>}
      </div>
    </section>

    <section className="cust-section page" aria-labelledby="cust-household">
      <header className="cust-section-head">
        <h2 id="cust-household" className="cust-h2"><em>Your</em> household</h2>
        <p className="cust-note">Tell us what depends on power. The steps on the right reorder so that anything life-critical comes first.</p>
      </header>
      <div className="cust-section-body cust-household">
        <NeedsPicker needs={needs} onChange={setNeeds} />
        <div className="cust-guidance">
          <h3 className="title">What to do</h3>
          <GuidanceList guidance={guidance} state={guidanceState} />
        </div>
      </div>
    </section>

    <section className="cust-section page" aria-labelledby="cust-battery">
      <header className="cust-section-head">
        <h2 id="cust-battery" className="cust-h2"><em>Backup</em> power</h2>
        <p className="cust-note">How long a home battery could run your essentials, next to the restoration estimate.</p>
      </header>
      <div className="cust-section-body">
        <BatteryPlanner needs={needs} onChange={setNeeds} result={battery} state={batteryState} restoration={restoration} />
      </div>
    </section>

    <section className="cust-section page" aria-labelledby="cust-path">
      <header className="cust-section-head">
        <h2 id="cust-path" className="cust-h2"><em>Where</em> your power comes from</h2>
        <p className="cust-note">The equipment path the AEP sample data lists for a premise. It is not a live view of which lines are energized.</p>
      </header>
      <div className="cust-section-body">
        <form className="cust-trace-form" onSubmit={submitTrace}>
          <label className="field">
            <span className="field-label">Premise token</span>
            <input className="input mono" value={premiseToken} onChange={event => setPremiseToken(event.target.value)} placeholder="Anonymized AEP premise" spellCheck={false} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn--small" disabled={traceState === 'loading' || !premiseToken.trim()}><Search aria-hidden="true" />{traceState === 'loading' ? 'Tracing…' : 'Trace'}</button>
        </form>
        <div className="cust-path" aria-live="polite">
          {traceState === 'error' ? <p className="cust-alert" role="alert">The path lookup failed. Check the connection and try again.</p>
            : !trace ? null
            : steps ? <>
              <ol className="path-steps" aria-label="Equipment from this premise up toward the substation">
                <li data-kind="premise"><span className="path-kind">{tracedToken === view.selected_premise_token ? 'Your premise' : 'Premise'}</span><span className="mono">{tokenTail(tracedToken)}</span></li>
                {steps.map(step => <li key={step.asset_token} data-fault={showFault && step.asset_token === fault || undefined}>
                  <span className="path-kind">{kindLabel(step.kind)}</span><span className="mono">{tokenTail(step.asset_token)}</span>
                  {showFault && step.asset_token === fault ? <span className="state" data-state="critical">Simulated fault here</span> : null}
                </li>)}
                <li data-kind="substation"><span className="path-kind">Substation</span><span className="muted">{trace.substation_status === 'UNKNOWN' || !trace.substation_status ? 'Not identified in the data' : trace.substation_status}</span></li>
              </ol>
              {trace.limitations?.length ? <div className="cust-limits">
                <h3 className="title">What this path can’t show</h3>
                <ul>{trace.limitations.map(item => <li key={item}>{item}</li>)}</ul>
              </div> : null}
            </>
            : <p className="cust-empty">We could not find <span className="mono">{tracedToken}</span> in the public AEP sample, so we can’t show its path{trace.reason ? ` (${sentenceCase(trace.reason)})` : ''}.</p>}
        </div>
      </div>
    </section>

    <section className="cust-section page" aria-labelledby="cust-risk">
      <header className="cust-section-head">
        <h2 id="cust-risk" className="cust-h2"><em>Why</em> your area is flagged</h2>
        <p className="cust-note">Based on this scenario only, not a weather or outage forecast.</p>
      </header>
      <div className="cust-section-body">
        <p className="cust-risk-band"><span className="state" data-state={RISK_STATE[view.customer_risk.band] ?? 'unknown'}>{sentenceCase(view.customer_risk.band)} risk</span><span className="muted small">Confidence: {sentenceCase(view.customer_risk.confidence_kind)}</span></p>
        {view.customer_risk.drivers.length ? <ul className="cust-drivers">{view.customer_risk.drivers.map(driver => <li key={driver}>{driver}</li>)}</ul> : <p className="cust-empty">No contributing factors supplied.</p>}
      </div>
    </section>

  </div>;
}

export default CustomerPage;
