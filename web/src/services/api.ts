import { ScenarioSnapshot } from '../../../contracts/types';

export interface CustomerSnapshotView {
  scenario_id: string;
  incident_id: string;
  selected_premise_token: string;
  timestamp_utc: string;
  status: 'NORMAL' | 'AT_RISK' | 'OUTAGE' | 'UNDER_REVIEW' | 'RESTORED';
  impact_source?: ScenarioSnapshot['impact_source'];
  customer_risk: {
    band: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
    drivers: string[];
    confidence_kind: string;
  };
  restoration_planning: {
    kind: string;
    lower_hours: number | null;
    expected_hours: number | null;
    upper_hours: number | null;
    assumptions: string[];
    last_updated_utc: string;
  };
  notifications: Array<{
    type: string;
    text: string;
    delivery_mode: string;
    sent_at_utc: string;
  }>;
  public_evidence: Array<{
    id: string;
    kind: string;
    value: string | number | boolean | null;
    unit?: string;
  }>;
  disclosure: string;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  cutout_status: string;
  expected_affected: number;
  impact_scope?: string;
  status: string;
}

export interface BatteryCalcResult {
  theoretical_hours: number;
  conservative_hours: number;
  usable_wh: number;
  effective_load_w: number;
}

export interface PreparednessGuidance {
  category: string;
  priority: string;
  action: string;
  detail: string;
}

export async function fetchCurrentScenario(): Promise<ScenarioSnapshot> {
  const res = await fetch('/api/scenario/current');
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioMeta[]> {
  const res = await fetch('/api/scenarios');
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function selectScenario(scenarioId: string, assetToken?: string): Promise<ScenarioSnapshot> {
  const res = await fetch('/api/scenario/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, ...(assetToken ? { asset_token: assetToken } : {}) }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function fetchCustomerSnapshot(): Promise<CustomerSnapshotView> {
  const res = await fetch('/api/customer/snapshot');
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function lookupPremiseTopology(premiseId: string): Promise<any> {
  const res = await fetch(`/api/topology/lookup?premise_id=${encodeURIComponent(premiseId)}`);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function calculateBatteryRuntime(params: {
  capacity_wh: number;
  usable_fraction: number;
  device_w: number;
  inverter_efficiency: number;
  reserve_margin_pct: number;
}): Promise<BatteryCalcResult> {
  const res = await fetch('/api/customer/battery-runtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function fetchPreparednessGuidance(needs: Record<string, any>): Promise<PreparednessGuidance[]> {
  const res = await fetch('/api/customer/preparedness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(needs),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.guidance;
}

export async function resetScenario(): Promise<ScenarioSnapshot> {
  const res = await fetch('/api/scenario/reset', { method: 'POST' });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function advanceScenario(params: {
  status?: string;
  cutout_status?: string;
  restoration_summary?: string;
}): Promise<ScenarioSnapshot> {
  const res = await fetch('/api/scenario/advance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export interface AEPSourceAsset {
  asset_token: string;
  kind: 'TRANSFORMER' | 'CIRCUIT_BREAKER';
  dependent_premises_in_sample: number;
  full_source_known_dependent_count: number | null;
}

export async function fetchAEPAssets(): Promise<AEPSourceAsset[]> {
  const res = await fetch('/api/aep/assets');
  if (!res.ok) throw new Error('AEP source data unavailable: ' + res.status);
  return res.json();
}
