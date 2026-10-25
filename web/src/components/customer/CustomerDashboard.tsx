import { AlertTriangle, ArrowRight, Battery, Bell, CheckCircle2, Clock, HeartPulse, ShieldAlert } from 'lucide-react';
import type { BatteryCalcResult, CustomerSnapshotView, PreparednessGuidance } from '../../services/api';

export const INITIAL_NEEDS = {
  food_refrigeration: true, refrigerated_medication: false, life_critical_medical_device: false,
  medical_device_notes: '', mobility_accessibility_needs: false, communications_charging: true,
  sump_pump: false, backup_battery_available: true, battery_capacity_wh: 1000,
  battery_usable_pct: 0.85, essential_load_w: 120,
};
export type HouseholdNeeds = typeof INITIAL_NEEDS;
export interface SupplyLookup { mapped: boolean; equipmentCount: number; }
export const SERVICE_COPY = {
  NORMAL: { label: 'Normal', detail: 'No outage is recorded for the selected home in this demonstration.', tone: 'normal' },
  AT_RISK: { label: 'Normal service · storm risk', detail: 'Storm conditions may affect service. An outage has not been confirmed in this demonstration.', tone: 'review' },
  OUTAGE: { label: 'Confirmed outage', detail: 'An outage is confirmed in this scenario. The cause and repair plan still need assessment.', tone: 'outage' },
  UNDER_REVIEW: { label: 'Under review', detail: 'A possible service problem is being assessed. Power loss and a restoration time are not yet confirmed.', tone: 'review' },
  RESTORED: { label: 'Simulated restored', detail: 'The scenario records restoration. This does not verify that power is on at your actual home.', tone: 'normal' },
} as const;
const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);
const time = (value?: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Update time unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(value));
};
const finiteHours = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const NEED_OPTIONS = [
  ['life_critical_medical_device', 'Essential medical equipment', 'Power needed for a life-sustaining device'],
  ['mobility_accessibility_needs', 'Mobility & accessibility', 'An accessible exit or powered mobility device'],
  ['refrigerated_medication', 'Refrigerated medication', 'Medicine that needs temperature control'],
  ['food_refrigeration', 'Food refrigeration', 'Keep refrigerator and freezer use in your plan'],
  ['communications_charging', 'Phone & communications', 'Reserve charging for essential contact'],
  ['sump_pump', 'Sump pump', 'Backup power for basement drainage'],
] as const;
const riskLabels: Record<string, string> = { HIGH: 'Higher storm risk', MODERATE: 'Moderate storm risk', LOW: 'Lower storm risk', UNKNOWN: 'Storm risk unavailable' };
const categoryOrder: Record<string, number> = { CRITICAL_MEDICAL: 0, ACCESSIBILITY: 1, MEDICATION: 2, FOOD_SAFETY: 3, WATER_DAMAGE: 4, COMMUNICATIONS: 5 };
const notificationTitles: Record<string, string> = { PRE_STORM: 'Storm preparation', OUTAGE_CONFIRMED: 'Outage update', ESTIMATE_UPDATED: 'Planning estimate updated', RESTORATION_COMPLETE: 'Simulated restoration update' };

interface Props {
  snapshot: CustomerSnapshotView | null; loading: boolean; snapshotError: boolean; onSnapshotRetry: () => void;
  needs: HouseholdNeeds; onNeedsChange: (patch: Partial<HouseholdNeeds>) => void;
  batteryCalc: BatteryCalcResult | null; batteryLoading: boolean; batteryError: boolean;
  guidance: PreparednessGuidance[]; guidanceLoading: boolean; guidanceError: boolean; onNeedsRetry: () => void;
  premiseToken: string; onPremiseChange: (value: string) => void; supply: SupplyLookup | null;
  traceLoading: boolean; traceError: boolean; onTrace: () => void;
}

export function CustomerDashboard(props: Props) {
  const { snapshot, loading, snapshotError, onSnapshotRetry, needs, onNeedsChange, batteryCalc, batteryLoading,
    batteryError, guidance, guidanceLoading, guidanceError, onNeedsRetry } = props;
  const status = snapshot && SERVICE_COPY[snapshot.status];
  const planning = snapshot?.restoration_planning;
  const showWindow = snapshot?.status === 'OUTAGE' && finiteHours(planning?.lower_hours) && finiteHours(planning?.upper_hours)
    && planning!.upper_hours! >= planning!.lower_hours!;
  const hasMedicalNeed = needs.life_critical_medical_device || needs.refrigerated_medication;
  const orderedGuidance = [...guidance].sort((a, b) => (categoryOrder[a.category] ?? 6) - (categoryOrder[b.category] ?? 6));
  const validInputs = Number.isFinite(needs.battery_capacity_wh) && needs.battery_capacity_wh > 0
    && Number.isFinite(needs.essential_load_w) && needs.essential_load_w > 0;
  const usableFraction = Number.isFinite(needs.battery_usable_pct) && needs.battery_usable_pct > 0 && needs.battery_usable_pct <= 1;

  return <main className="customer-dashboard" aria-label="Customer outage and household plan">
    <header className="customer-heading">
      <div><h1><ShieldAlert aria-hidden="true" /> Your power. Your household plan.</h1>
        <p>Understand your service status and plan around the power you need.</p></div>
      <a className="customer-link" href="#household-plan">Update household needs <ArrowRight aria-hidden="true" /></a>
    </header>

    <div className="customer-demo-notice" role="note"><strong>Simulated Demonstration Preview</strong>
      <span>All service updates and alerts below are a demonstration. No live outage monitoring, text messages, emergency calls, or dispatch.</span></div>

    <section className={`customer-service customer-service--${status?.tone || 'review'}`} aria-labelledby="service-heading" aria-busy={loading}>
      <div className="customer-service-summary" aria-live="polite">
        <h2 id="service-heading">Your service status</h2>
        <div className="customer-status-line">
          {status?.tone === 'normal' ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          <p className="customer-status">{loading ? 'Checking service status' : status?.label || 'Status unavailable'}</p>
        </div>
        <p>{loading ? 'Loading Customer Concierge... Your household settings remain available below.' : status?.detail || 'We could not retrieve the latest service update. This does not mean your power is on or off.'}</p>
        {snapshot && <p className="customer-updated"><time dateTime={snapshot.timestamp_utc}>{time(snapshot.timestamp_utc)}</time> · Scenario update</p>}
        {snapshot && <p className="customer-storm-outlook"><strong>{riskLabels[snapshot.customer_risk?.band] || 'Storm risk unavailable'}.</strong> A scenario planning signal, not a live weather forecast or confirmation of an outage.</p>}
        {snapshotError && <div className="customer-error" role="alert"><span>Service update could not be loaded.</span><button onClick={onSnapshotRetry}>Retry service update</button></div>}
      </div>
      <div className="customer-restoration">
        <h3><Clock aria-hidden="true" /> Restoration outlook</h3>
        <p className="customer-window">{loading ? 'Waiting for the latest update' : showWindow
          ? `${fmt(planning!.lower_hours!)}–${fmt(planning!.upper_hours!)} hours · planning window`
          : snapshot?.status === 'RESTORED' ? 'Restoration recorded in this simulation'
          : snapshot?.status === 'NORMAL' || snapshot?.status === 'AT_RISK' ? 'No confirmed outage to estimate'
          : 'No confirmed restoration estimate'}</p>
        <p>{showWindow ? 'A modeled repair duration, not a countdown or a promised time for power to return. Field assessment may change it.'
          : 'A repair window will only be useful once the outage and the work needed are understood.'}</p>
        <dl className="customer-known">
          <div><dt>What is known</dt><dd>{snapshot ? 'The selected scenario’s service status and any available planning range.' : 'The current service update has not been retrieved.'}</dd></div>
          <div><dt>What is not verified</dt><dd>Live conditions at your home, crew arrival, actual damage, and a utility-confirmed restoration time.</dd></div>
        </dl>
        <p className="customer-caption">Timing depends on safe access, damage assessment, repair work, and safety checks. Crew availability and field conditions are not confirmed here.</p>
      </div>
    </section>

    <div className="customer-plan-grid">
      <section className="customer-household" id="household-plan" aria-labelledby="needs-heading">
        <h2 id="needs-heading"><HeartPulse aria-hidden="true" /> Your household priorities</h2>
        <p>Choose what needs power. Your plan updates as you make changes.</p>
        <p className="customer-caption">Saved in this browser when storage is available. These choices do not register you for utility assistance or emergency response.</p>
        <fieldset className="customer-needs"><legend className="customer-sr-only">Household power needs</legend>
          {NEED_OPTIONS.map(([key, label, detail]) => <label key={key} className={needs[key] ? 'is-selected' : ''}>
            <input id={`need-${key.replace(/_/g, '-')}`} type="checkbox" checked={needs[key]} onChange={event => onNeedsChange({ [key]: event.target.checked })} />
            <span><strong>{label}</strong><small>{detail}</small></span>
          </label>)}
        </fieldset>
        {needs.life_critical_medical_device && <p className="customer-medical-note" role="note"><strong>Medical power comes first.</strong> Use your personal emergency plan. Do not rely only on this estimate or a local battery. This page does not contact a care team or emergency services.</p>}
        <div className="customer-actions" aria-busy={guidanceLoading} aria-live="polite">
          <h3>Your next steps</h3>
          {guidanceLoading && <p role="status">Updating guidance for your current household needs…</p>}
          {guidanceError && <div className="customer-error" role="alert"><span>We could not update your guidance. Check your connection and try again.</span><button onClick={onNeedsRetry}>Retry household guidance</button></div>}
          {!guidanceLoading && !guidanceError && orderedGuidance.length === 0 && <p>Select the needs that apply to your home to build your preparation plan.</p>}
          {!guidanceLoading && !guidanceError && orderedGuidance.length > 0 && <ol className="customer-action-list">
            {orderedGuidance.map((item, index) => <li key={`${item.category}-${index}`}>
              <span className="customer-action-number" aria-hidden="true">{index + 1}</span><div>
                {item.priority === 'IMMEDIATE' && <strong className="customer-urgent">Immediate priority</strong>}
                <h4>{item.action}</h4><p>{item.detail}</p>
              </div>
            </li>)}
          </ol>}
        </div>
      </section>

      <section className="customer-battery" aria-labelledby="battery-heading">
        <h2 id="battery-heading"><Battery aria-hidden="true" /> How long could your battery last?</h2>
        <p>Plan for essential devices together, rather than each device separately.</p>
        <label className="customer-battery-toggle"><input type="checkbox" checked={needs.backup_battery_available} onChange={event => onNeedsChange({ backup_battery_available: event.target.checked })} /> I have a backup battery</label>
        {needs.backup_battery_available ? <>
          <p className="customer-caption">The starting values are examples, not measurements. Replace them with your equipment’s ratings.</p>
          <div className="customer-battery-inputs">
            <label htmlFor="battery-capacity-input">Battery capacity <span>(watt-hours / Wh)</span>
              <input id="battery-capacity-input" type="number" min="1" step="any" inputMode="decimal" value={needs.battery_capacity_wh || ''}
                aria-describedby="battery-input-help" aria-invalid={needs.battery_capacity_wh <= 0}
                onChange={event => onNeedsChange({ battery_capacity_wh: Number(event.target.value) })} /></label>
            <label htmlFor="battery-load-input">Combined device use <span>(watts / W)</span>
              <input id="battery-load-input" type="number" min="1" step="any" inputMode="decimal" value={needs.essential_load_w || ''}
                aria-describedby="battery-input-help" aria-invalid={needs.essential_load_w <= 0}
                onChange={event => onNeedsChange({ essential_load_w: Number(event.target.value) })} /></label>
          </div>
          <p id="battery-input-help" className="customer-caption">Wh is stored energy; W is how quickly your devices use it. Add the wattage of every device you will run at the same time.</p>
          <div className="customer-runtime" aria-busy={batteryLoading} aria-live="polite">
            <h3>Conservative planning runtime</h3>
            {!validInputs || !usableFraction ? <p>Enter a positive battery capacity and combined load{!usableFraction ? ', and reset the usable energy setting below' : ''} to estimate runtime.</p>
              : batteryLoading ? <p role="status">Calculating for your current battery and devices…</p>
              : batteryError ? <div className="customer-error" role="alert"><span>Battery estimate unavailable. Check your connection and try again.</span><button onClick={onNeedsRetry}>Retry battery estimate</button></div>
              : batteryCalc ? <>
                <p className="customer-runtime-value">{batteryCalc.conservative_hours < 0.1 ? 'Less than 0.1' : fmt(Math.floor(batteryCalc.conservative_hours * 10) / 10)} <span>hours</span></p>
                <p>Use this lower estimate for planning. Actual runtime may be shorter; it is not a safety guarantee.</p>
                <dl className="customer-battery-math"><div><dt>Usable stored energy</dt><dd>{fmt(batteryCalc.usable_wh)} Wh</dd></div><div><dt>Load including conversion loss</dt><dd>{fmt(batteryCalc.effective_load_w)} W</dd></div></dl>
              </> : <p>Waiting for a battery estimate.</p>}
          </div>
          <details className="customer-assumptions"><summary>Calculation assumptions</summary>
            <p>{usableFraction ? fmt(needs.battery_usable_pct * 100) : 'Invalid'}% of rated energy is usable, conversion efficiency is 85%, and a further 15% of runtime is kept in reserve.</p>
            <p>Formula: capacity × usable fraction × 0.85 ÷ device watts × 0.85 reserve factor. This assumes constant load. Starting surges, battery age, temperature, and device cycling can reduce runtime.</p>
            <button className="customer-link" onClick={() => onNeedsChange({ battery_usable_pct: 0.85 })}>Use 85% usable energy</button>
          </details>
          {hasMedicalNeed && <p className="customer-medical-note">A battery estimate does not confirm that a medical device or medication refrigerator will work safely. Verify equipment needs with your supplier or care team.</p>}
        </> : <p className="customer-empty">No battery runtime is assumed. Your household guidance still applies; plan another source of support for essential power needs.</p>}
      </section>
    </div>

    <section className="customer-alerts" aria-labelledby="alerts-heading">
      <div className="customer-section-title"><h2 id="alerts-heading"><Bell aria-hidden="true" /> Updates & notification preview</h2><span>Simulated Demonstration Preview</span></div>
      <p>No SMS, push notification, 911 call, or dispatcher contact is made. Household needs are not sent to emergency services.</p>
      <div className="customer-alert-policy"><div><h3>When a preview appears</h3><p>Storm preparation, a confirmed scenario outage, a changed planning estimate, or simulated restoration.</p></div>
        <div><h3>Escalation preview</h3><p>In a connected service, a confirmed outage or critical priority could change update frequency. This demonstration does not escalate to live responders.</p></div></div>
      {snapshot?.notifications?.length ? <ol className="customer-notifications">{snapshot.notifications.map((item, index) => <li key={`${item.type}-${index}`}>
        <div><h3>{notificationTitles[item.type] || 'Scenario update'}</h3><time dateTime={item.sent_at_utc}>{time(item.sent_at_utc)}</time></div><p>{item.text}</p><small>Demonstration preview only · not sent</small>
      </li>)}</ol> : <p className="customer-empty">{loading ? 'Loading scenario update previews…' : 'No notification previews are available for this scenario yet. Nothing has been sent.'}</p>}
    </section>

    <details className="customer-source"><summary>About this demonstration & home connection lookup</summary>
      <p>{snapshot?.disclosure || 'This demonstration uses a modeled service scenario. It does not show live electrical conditions at your home.'}</p>
      <p>Connection lookup checks a supplied network map. A mapped connection does not prove that power is on, or that a live outage affects your home.</p>
      <form className="customer-lookup" onSubmit={event => { event.preventDefault(); props.onTrace(); }}>
        <label htmlFor="premise-location-token">Demo home reference<input id="premise-location-token" value={props.premiseToken} onChange={event => props.onPremiseChange(event.target.value)} autoComplete="off" /></label>
        <button type="submit" disabled={props.traceLoading || !props.premiseToken.trim()}>{props.traceLoading ? 'Checking connection…' : 'Check mapped connection'}</button>
      </form>
      <div aria-live="polite">{props.supply && <p>{props.supply.mapped ? `A connection is mapped through ${props.supply.equipmentCount} equipment records. Live power status is not verified.` : 'This home reference is not mapped in the available network sample. Its live service status is unknown.'}</p>}</div>
      {props.traceError && <p className="customer-error" role="alert">Connection lookup failed. Check your connection and try the lookup again.</p>}
    </details>
  </main>;
}
