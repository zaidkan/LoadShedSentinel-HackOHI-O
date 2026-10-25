import React, { useState, useEffect } from 'react';
import type { ScenarioSnapshot } from '../../../contracts/types';
import {
  fetchCustomerSnapshot,
  calculateBatteryRuntime,
  fetchPreparednessGuidance,
  lookupPremiseTopology,
  CustomerSnapshotView,
  BatteryCalcResult,
  PreparednessGuidance,
} from '../services/api';
import { ShieldAlert, Battery, AlertTriangle, Clock, HeartPulse, CheckCircle2, Search, GitBranch } from 'lucide-react';
import { humanize, numberText } from '../components/utility/presentation';

const SERVICE_COPY = {
  NORMAL: ['Service Operating Normally', 'Supply lines operating within normal load parameters.'],
  AT_RISK: ['Service At Risk', 'Storm-related service risk identified; an outage is not confirmed.'],
  OUTAGE: ['Service Disruption Active', 'Local protective equipment triggered. Utility dispatch investigating supply line.'],
  UNDER_REVIEW: ['Incident Under Review', 'Incident under review by utility dispatch; field condition and ETR pending verification.'],
  RESTORED: ['Service Restored', 'Utility dispatch reports service restored for this simulated incident.'],
} as const;

const planningHours = (value: number | null) => value === null || !Number.isFinite(value) ? 'Unavailable' : `${numberText(value)} hours`;

export interface CustomerPageProps {
  snapshot: ScenarioSnapshot;
  scenarioId?: string;
}

export const CustomerPage: React.FC<CustomerPageProps> = ({ snapshot: scenarioSnapshot, scenarioId }) => {
  const [snapshot, setSnapshot] = useState<CustomerSnapshotView | null>(null);
  const [loading, setLoading] = useState(true);
  const [premiseToken, setPremiseToken] = useState('');
  const [topologyTrace, setTopologyTrace] = useState<any | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  // Household Needs State
  const [needs, setNeeds] = useState({
    food_refrigeration: true,
    refrigerated_medication: false,
    life_critical_medical_device: false,
    medical_device_notes: '',
    mobility_accessibility_needs: false,
    communications_charging: true,
    sump_pump: false,
    backup_battery_available: true,
    battery_capacity_wh: 1000,
    battery_usable_pct: 0.85,
    essential_load_w: 120,
  });

  const [batteryCalc, setBatteryCalc] = useState<BatteryCalcResult | null>(null);
  const [guidance, setGuidance] = useState<PreparednessGuidance[]>([]);

  useEffect(() => {
    loadSnapshot();
  }, [scenarioId, scenarioSnapshot.incident_id, scenarioSnapshot.revision, scenarioSnapshot.current_asset_id]);

  useEffect(() => {
    runBatteryCalculation();
    loadPreparedness();
  }, [needs]);

  async function loadSnapshot() {
    try {
      const data = await fetchCustomerSnapshot();
      setSnapshot(data);
      // This selected premise is drawn from the same source-dependent fault footprint.
      setPremiseToken(data.selected_premise_token);
      setTopologyTrace(null);
    } catch (e) {
      console.error('Failed to load customer snapshot', e);
    } finally {
      setLoading(false);
    }
  }

  async function runBatteryCalculation() {
    if (needs.battery_capacity_wh > 0 && needs.essential_load_w > 0) {
      try {
        const res = await calculateBatteryRuntime({
          capacity_wh: needs.battery_capacity_wh,
          usable_fraction: needs.battery_usable_pct,
          device_w: needs.essential_load_w,
          inverter_efficiency: 0.85,
          reserve_margin_pct: 0.15,
        });
        setBatteryCalc(res);
      } catch (err) {
        console.error('Battery calc error', err);
      }
    } else {
      setBatteryCalc(null);
    }
  }

  async function loadPreparedness() {
    try {
      const res = await fetchPreparednessGuidance(needs);
      setGuidance(res);
    } catch (err) {
      console.error('Guidance error', err);
    }
  }

  async function handleTracePremise() {
    if (!premiseToken) return;
    setTraceLoading(true);
    try {
      const trace = await lookupPremiseTopology(premiseToken);
      setTopologyTrace(trace);
    } catch (e) {
      console.error('Topology lookup failed', e);
      setTopologyTrace(null);
    } finally {
      setTraceLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-slate-400 animate-pulse text-lg">Loading Customer Concierge...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-4xl mx-auto px-4 py-8 space-y-8 [overflow-wrap:anywhere]">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-blue-500" />
              LoadShed Outage Concierge
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Personalized residential storm preparation and restoration updates.
            </p>
          </div>
          <div className="min-w-0 md:text-right">
            <label htmlFor="premise-location-token" className="text-xs text-slate-500 block mb-1">Premise Location Token</label>
            <div className="flex items-center gap-1.5">
              <input
                id="premise-location-token"
                type="text"
                value={premiseToken}
                onChange={(e) => setPremiseToken(e.target.value)}
                placeholder="Anonymized AEP premise"
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-blue-400 font-mono w-36"
              />
              <button
                onClick={handleTracePremise}
                disabled={traceLoading}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
              >
                <Search className="w-3.5 h-3.5" /> Trace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Trace Result Card */}
      {topologyTrace && (
        <div className="bg-slate-900/90 border border-blue-900/40 rounded-xl p-4 shadow-lg space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> AEP Source Supply Path (Not Live Energization)
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${topologyTrace.status === 'KNOWN' ? 'bg-blue-900/40 text-blue-300' : 'bg-amber-900/40 text-amber-300'}`}>
              Status: {topologyTrace.status}
            </span>
          </div>
          {topologyTrace.status === 'KNOWN' ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-blue-300 font-bold">
                  {topologyTrace.premise_token || premiseToken}
                </span>
                {topologyTrace.equipment?.map((eq: any, idx: number) => (
                  <React.Fragment key={idx}>
                    <span className="text-slate-500">→</span>
                    <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {eq.kind}: <span className="text-amber-400">{eq.asset_token}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 italic pt-1">
                Endpoint: {topologyTrace.endpoint || 'Circuit Breaker'} · Substation status: {topologyTrace.substation_status || 'UNKNOWN'} · Basis: {topologyTrace.basis || 'AEP graph'}
              </div>
            </>
          ) : (
            <div className="text-xs text-amber-300 py-1 font-mono">
              Premise {premiseToken} not mapped in distribution network slice (Reason: {topologyTrace.reason || 'unmapped'}).
            </div>
          )}
        </div>
      )}

      {/* Step 2: Storm Readiness & Outage Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outage Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              snapshot?.status === 'OUTAGE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              snapshot?.status === 'RESTORED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {snapshot?.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="text-xl font-bold text-white mb-2">
            {snapshot ? SERVICE_COPY[snapshot.status][0] : 'Service Status Unavailable'}
          </div>

          <p className="text-sm text-slate-400 mb-4">
            {snapshot ? SERVICE_COPY[snapshot.status][1] : 'Unable to load the current service status.'}
          </p>

          {snapshot?.impact_source && (
            <p className="text-xs text-blue-300 mb-3">
              {snapshot.status === 'UNDER_REVIEW'
                ? 'Affected customer count is unconfirmed.'
                : `${snapshot.impact_source.affected_count_in_sample} modeled dependent premises in a ${snapshot.impact_source.sample_premise_count}-premise AEP source sample.`}
              {' '}These are simulated dependencies, not confirmed live outages.
            </p>
          )}

          {snapshot?.restoration_planning && (
            <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Estimated Planning Range</div>
                <div className="text-sm font-semibold text-slate-200">
                  {snapshot.restoration_planning.expected_hours !== null
                    ? `~${planningHours(snapshot.restoration_planning.expected_hours)} (${planningHours(snapshot.restoration_planning.lower_hours)} – ${planningHours(snapshot.restoration_planning.upper_hours)} range)`
                    : 'Awaiting crew assessment'}
                </div>
                <p className="text-xs text-slate-400 mt-1">Basis: {humanize(snapshot.restoration_planning.kind)}. Planning duration, not a guaranteed restoration time.</p>
              </div>
            </div>
          )}
          {snapshot?.restoration_planning && (
            <div className="mt-4 text-sm text-slate-300">
              <h3 className="font-semibold mb-2">Planning assumptions</h3>
              {snapshot.restoration_planning.assumptions.length > 0
                ? <ul className="list-disc pl-5 space-y-1">{snapshot.restoration_planning.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}</ul>
                : <p>No planning assumptions supplied.</p>}
            </div>
          )}
        </div>

        {/* Risk & Weather Drivers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Forecast Risk Band</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {snapshot?.customer_risk?.band || 'UNKNOWN'}
            </span>
          </div>

          <div className="text-xl font-bold text-white mb-2">Contributing Factors</div>
          <p className="text-sm text-slate-300 mb-3">Confidence kind: {snapshot?.customer_risk.confidence_kind ? humanize(snapshot.customer_risk.confidence_kind).replace(/^./, char => char.toUpperCase()) : 'Unavailable'}</p>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {snapshot?.customer_risk?.drivers?.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div role="note" className="text-sm text-slate-300 space-y-2">
        <h2 className="font-semibold text-white">Source disclosure</h2>
        <p>{snapshot?.disclosure || 'Source disclosure unavailable.'}</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4" aria-labelledby="customer-alert-plan-heading">
        <h2 id="customer-alert-plan-heading" className="text-lg font-bold text-white">Alert Delivery &amp; Eligibility Plan</h2>
        <p className="text-sm text-slate-300">Demo delivery only. No SMS or mobile push is sent, and contact verification is not performed.</p>
        <dl className="space-y-3 text-sm">
          <div><dt className="font-semibold text-white">Eligibility</dt><dd className="text-slate-300">{snapshot?.alert_plan ? snapshot.alert_plan.eligible ? 'Eligible for demo updates' : 'Not currently eligible for demo updates' : 'Eligibility not supplied'}</dd></div>
          <div><dt className="font-semibold text-white">Selected premise recipient</dt><dd className="text-slate-300">{snapshot?.selected_premise_token || 'Unavailable'}</dd></div>
          <div><dt className="font-semibold text-white">Recipient role (demo)</dt><dd className="text-slate-300">{snapshot?.alert_plan?.recipient_role ? humanize(snapshot.alert_plan.recipient_role) : 'Recipient role not supplied'}</dd></div>
          <div><dt className="font-semibold text-white">Dispatch channel</dt><dd className="text-slate-300">{snapshot?.alert_plan?.channels?.length ? snapshot.alert_plan.channels.join(' / ') : 'Channel not supplied'}</dd></div>
          <div><dt className="font-semibold text-white">Milestone cadence</dt><dd className="text-slate-300">{snapshot?.alert_plan?.cadence_policy || 'Milestone cadence not supplied'}</dd></div>
          {snapshot?.alert_plan?.escalation_policy && (
            <div><dt className="font-semibold text-white">Escalation policy</dt><dd className="text-slate-300">{snapshot.alert_plan.escalation_policy}</dd></div>
          )}
        </dl>
        {snapshot?.alert_plan?.suppression_reason && <p className="text-sm text-amber-300">Suppression reason: {snapshot.alert_plan.suppression_reason}</p>}
      </section>

      {/* Step 4: Household Needs Declaration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-400" />
          <h2 className="text-lg font-bold text-white">Declared Household Needs</h2>
        </div>
        <p className="text-sm text-slate-400">
          Declare special power dependencies. Guidance updates dynamically to prioritize life safety.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              id="need-medical-device"
              checked={needs.life_critical_medical_device}
              onChange={(e) => setNeeds({ ...needs, life_critical_medical_device: e.target.checked })}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-slate-200">Life-Critical Medical Device</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              id="need-refrigerated-medication"
              checked={needs.refrigerated_medication}
              onChange={(e) => setNeeds({ ...needs, refrigerated_medication: e.target.checked })}
              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-200">Refrigerated Medicine (Insulin)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              id="need-mobility-accessibility"
              checked={needs.mobility_accessibility_needs}
              onChange={(e) => setNeeds({ ...needs, mobility_accessibility_needs: e.target.checked })}
              className="rounded border-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-200">Mobility &amp; Accessibility Needs</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              id="need-sump-pump"
              checked={needs.sump_pump}
              onChange={(e) => setNeeds({ ...needs, sump_pump: e.target.checked })}
              className="rounded border-slate-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-200">Basement Sump Pump</span>
          </label>
        </div>

        {/* Tailored Advice Cards */}
        {guidance.length > 0 && (
          <div className="mt-4 space-y-2">
            {guidance.map((g, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border text-sm ${
                  g.priority === 'IMMEDIATE'
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {g.action}
                </div>
                <div className="text-xs text-slate-400 pl-6">{g.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 5: Backup Battery Planning Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Battery className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Home Battery Runtime Calculator</h2>
        </div>
        <p className="text-sm text-slate-400">
          Budget your portable power station or home battery against critical household loads.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="battery-capacity-input" className="block text-xs font-semibold text-slate-400 mb-1">Battery Nominal Capacity (Wh)</label>
            <input
              id="battery-capacity-input"
              type="number"
              value={needs.battery_capacity_wh}
              onChange={(e) => setNeeds({ ...needs, battery_capacity_wh: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="battery-load-input" className="block text-xs font-semibold text-slate-400 mb-1">Continuous Critical Load (Watts)</label>
            <input
              id="battery-load-input"
              type="number"
              value={needs.essential_load_w}
              onChange={(e) => setNeeds({ ...needs, essential_load_w: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {batteryCalc && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 text-center">
            <div>
              <div className="text-xs text-slate-400">Usable Wh</div>
              <div className="text-lg font-bold text-white">{batteryCalc.usable_wh} Wh</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Effective Load</div>
              <div className="text-lg font-bold text-white">{batteryCalc.effective_load_w} W</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Theoretical Runtime</div>
              <div className="text-lg font-bold text-emerald-400">{batteryCalc.theoretical_hours} hrs</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Conservative Reserve</div>
              <div className="text-lg font-bold text-blue-400">{batteryCalc.conservative_hours} hrs</div>
            </div>
          </div>
        )}
      </div>

      {/* Step 6: Alerts & Notification History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          Proactive Alert History
        </h2>
        <div className="space-y-2">
          {snapshot?.notifications && snapshot.notifications.length > 0 ? (
            snapshot.notifications.map((n, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 text-xs font-mono font-semibold">
                  {n.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200">{n.text}</div>
                  <div className="text-xs text-slate-500 mt-1">{n.sent_at_utc} (Demo Broadcast)</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 italic">No alerts dispatched yet for this premise.</div>
          )}
        </div>
      </div>
    </div>
  );
};
