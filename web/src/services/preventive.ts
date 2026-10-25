export interface SensorReading {
  timestamp_utc: string;
  temperature_c: number;
  ambient_c: number;
  load_pct: number;
  vibration_mm_s: number;
  acoustic_anomaly: boolean;
  sensor_health: string;
}

export interface PreventiveResult {
  profile_id: string;
  input_series: SensorReading[];
  source_context: { asset_token: string; dependent_premises_in_sample: number; sample_premise_count: number };
  assessment: {
    service_state: string;
    condition_priority: string;
    readiness: string;
    assessment_status: string;
    evidence_confidence: { level: string; basis: string };
    coverage: { usable_samples: number; received_samples: number; span_minutes: number | null };
    indicators: Array<{ name: string; persistent: boolean; warming_trend?: boolean }>;
    recommendation: { capabilities: string[]; human_review_required: boolean; approved: false; dispatch: false };
    findings: string[];
    validation_errors: string[];
    customer_message: string;
    assumptions: string[];
  };
  customer_advisory: { message: string; outage_confirmed: false };
  disclosure: string;
}

export interface ResponseArm {
  diagnosis_hours: number;
  coordination_hours: number;
  analysis_overhead_hours: number;
  wrong_crew_probability: number;
  extra_dispatch_wait_hours: number;
}

export interface ComparisonInputs {
  shared_repair_hours: number;
  shared_blocker_ready_hours: number;
  evidence_status: 'sufficient' | 'insufficient' | 'unknown';
  detection_lead_hours: number;
  baseline: ResponseArm;
  assisted: ResponseArm;
}

export interface ComparisonResult {
  kind: string;
  advisory_applied: boolean;
  baseline: { outage_hours: { lower: number; expected: number; upper: number } };
  assisted: { outage_hours: { lower: number; expected: number; upper: number } };
  savings_hours: { lower: number; expected: number; upper: number };
  assumptions: string[];
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status})`);
  }
  return response.json();
}

export function assessPrevention(assetToken: string, profile: string, signal?: AbortSignal): Promise<PreventiveResult> {
  return post('/api/preventive/assess', { asset_token: assetToken, profile_id: profile }, signal);
}

export function compareResponse(assetToken: string, inputs: ComparisonInputs, signal?: AbortSignal): Promise<ComparisonResult> {
  return post('/api/response/compare', { asset_token: assetToken, inputs }, signal);
}
