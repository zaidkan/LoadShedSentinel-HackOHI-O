import React, { useEffect, useRef, useState } from 'react';
import type { ScenarioSnapshot } from '../../../contracts/types';
import {
  fetchCustomerSnapshot, calculateBatteryRuntime, fetchPreparednessGuidance, lookupPremiseTopology,
  type CustomerSnapshotView, type BatteryCalcResult, type PreparednessGuidance,
} from '../services/api';
import { CustomerDashboard, INITIAL_NEEDS, type HouseholdNeeds, type SupplyLookup } from '../components/customer/CustomerDashboard';
import '../components/customer/customer.css';

const NEEDS_STORAGE_KEY = 'loadshed_household_needs';
function loadStoredNeeds(): HouseholdNeeds {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(NEEDS_STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return INITIAL_NEEDS;
    const clean = { ...INITIAL_NEEDS };
    for (const key of Object.keys(INITIAL_NEEDS) as (keyof HouseholdNeeds)[]) {
      const value = (stored as Record<string, unknown>)[key];
      if (typeof value === typeof INITIAL_NEEDS[key] && (typeof value !== 'number' || Number.isFinite(value))) {
        Object.assign(clean, { [key]: value });
      }
    }
    return clean;
  } catch { return INITIAL_NEEDS; }
}

export interface CustomerPageProps { snapshot: ScenarioSnapshot; scenarioId?: string; }
export const CustomerPage: React.FC<CustomerPageProps> = ({ snapshot: scenarioSnapshot, scenarioId }) => {
  const [snapshot, setSnapshot] = useState<CustomerSnapshotView | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState(false);
  const [snapshotRetry, setSnapshotRetry] = useState(0);
  const [needs, setNeeds] = useState<HouseholdNeeds>(loadStoredNeeds);
  const [batteryCalc, setBatteryCalc] = useState<BatteryCalcResult | null>(null);
  const [guidance, setGuidance] = useState<PreparednessGuidance[]>([]);
  const [batteryError, setBatteryError] = useState(false);
  const [guidanceError, setGuidanceError] = useState(false);
  const [batteryLoading, setBatteryLoading] = useState(false);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(0);
  const [premiseToken, setPremiseToken] = useState('');
  const [supply, setSupply] = useState<SupplyLookup | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState(false);
  const mutationSeq = useRef(0);
  const traceSeq = useRef(0);

  function updateNeeds(patch: Partial<HouseholdNeeds>) {
    // Invalidate before React renders: an older promise may settle before effect cleanup.
    ++mutationSeq.current;
    setBatteryCalc(null);
    setGuidance([]);
    setBatteryError(false);
    setGuidanceError(false);
    setNeeds(previous => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(NEEDS_STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    ++traceSeq.current;
    setLoading(true);
    setSnapshot(null);
    setSnapshotError(false);
    setSupply(null);
    setTraceLoading(false);
    setTraceError(false);
    fetchCustomerSnapshot().then(data => {
      if (!active) return;
      setSnapshot(data);
      setPremiseToken(data.selected_premise_token);
    }).catch(() => { if (active) setSnapshotError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; ++traceSeq.current; };
  }, [scenarioId, scenarioSnapshot.incident_id, scenarioSnapshot.revision, scenarioSnapshot.current_asset_id, snapshotRetry]);

  useEffect(() => {
    const seq = ++mutationSeq.current;
    const current = () => mutationSeq.current === seq;
    setBatteryCalc(null);
    setGuidance([]);
    setBatteryError(false);
    setGuidanceError(false);
    const validBattery = needs.backup_battery_available && Number.isFinite(needs.battery_capacity_wh)
      && Number.isFinite(needs.essential_load_w) && needs.battery_capacity_wh > 0 && needs.essential_load_w > 0
      && needs.battery_usable_pct > 0 && needs.battery_usable_pct <= 1;
    setBatteryLoading(validBattery);
    setGuidanceLoading(true);
    if (validBattery) {
      calculateBatteryRuntime({ capacity_wh: needs.battery_capacity_wh, usable_fraction: needs.battery_usable_pct,
        device_w: needs.essential_load_w, inverter_efficiency: 0.85, reserve_margin_pct: 0.15 })
        .then(result => {
          if (!current()) return;
          if (![result.conservative_hours, result.theoretical_hours, result.usable_wh, result.effective_load_w]
            .every(value => Number.isFinite(value) && value >= 0) || result.conservative_hours > result.theoretical_hours) {
            throw new Error('Invalid battery estimate');
          }
          setBatteryCalc(result);
        })
        .catch(() => { if (current()) setBatteryError(true); })
        .finally(() => { if (current()) setBatteryLoading(false); });
    }
    fetchPreparednessGuidance(needs)
      .then(result => { if (current()) setGuidance(result); })
      .catch(() => { if (current()) setGuidanceError(true); })
      .finally(() => { if (current()) setGuidanceLoading(false); });
    return () => { ++mutationSeq.current; };
  }, [needs, needsRetry]);

  async function tracePremise() {
    if (!premiseToken.trim()) return;
    const seq = ++traceSeq.current;
    setTraceLoading(true);
    setTraceError(false);
    setSupply(null);
    try {
      const result = await lookupPremiseTopology(premiseToken.trim());
      if (seq === traceSeq.current) setSupply({ mapped: result.status === 'KNOWN', equipmentCount: result.equipment?.length ?? 0 });
    } catch { if (seq === traceSeq.current) setTraceError(true); }
    finally { if (seq === traceSeq.current) setTraceLoading(false); }
  }

  return <CustomerDashboard snapshot={snapshot} loading={loading} snapshotError={snapshotError}
    onSnapshotRetry={() => setSnapshotRetry(n => n + 1)} needs={needs} onNeedsChange={updateNeeds}
    batteryCalc={batteryCalc} batteryLoading={batteryLoading} batteryError={batteryError}
    guidance={guidance} guidanceLoading={guidanceLoading} guidanceError={guidanceError}
    onNeedsRetry={() => { ++mutationSeq.current; setNeedsRetry(n => n + 1); }}
    premiseToken={premiseToken} onPremiseChange={value => {
      ++traceSeq.current; setPremiseToken(value); setSupply(null); setTraceError(false); setTraceLoading(false);
    }} supply={supply} traceLoading={traceLoading} traceError={traceError} onTrace={tracePremise} />;
};
