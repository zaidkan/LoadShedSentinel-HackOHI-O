export type Provenance =
  | 'aep_challenge'
  | 'external_research'
  | 'modeled_sensor'
  | 'scenario'
  | 'authorized_enterprise';

export type EvidenceQuality = 'observed' | 'modeled' | 'reported' | 'field_confirmed' | 'missing';
export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
export type HypothesisCode =
  | 'LOCAL_PROTECTION_OPERATION'
  | 'POSSIBLE_EQUIPMENT_DISTRESS'
  | 'UPSTREAM_FEEDER_INTERRUPTION'
  | 'STRUCTURE_OR_CONDUCTOR_DAMAGE'
  | 'INSUFFICIENT_EVIDENCE';
export type CutoutStatus = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export interface Evidence {
  id: string;
  incident_id: string;
  asset_id?: string;
  timestamp_utc: string;
  kind: string;
  value: string | number | boolean | null;
  unit?: string;
  provenance: Provenance;
  quality: EvidenceQuality;
  visibility: 'operator' | 'customer_safe';
}

export interface Hypothesis {
  code: HypothesisCode;
  score_type: 'relative_evidence' | 'calibrated_probability' | 'unavailable';
  score: number | null;
  label: string;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  missing_evidence: string[];
  requires_field_confirmation: boolean;
}

export interface CrewPackage {
  capabilities: string[];
  material_categories: string[];
  candidate_damage_class: string;
  basis: 'field_confirmed' | 'diagnostic_hypothesis' | 'assessment_required';
  approved: false;
  reason: string;
}

export interface Restoration {
  kind: 'scenario_planning' | 'utility_confirmed' | 'unavailable';
  lower_hours: number | null;
  expected_hours: number | null;
  upper_hours: number | null;
  labor_work_hours: number | null;
  labor_work_unit: string | null;
  assumptions: string[];
  last_updated_utc: string;
  priority_comparison?: {
    enabled: boolean;
    hospital_first: {
      sequence: string[];
      hospital_finish_hours: number;
      total_finish_hours: number;
    };
    unprioritized: {
      sequence: string[];
      hospital_finish_hours: number;
      total_finish_hours: number;
    };
    critical_facility_count: number;
    rationale: string;
  };
}

export interface SolarNode {
  battery_soc_pct: number;
  nominal_wh: number;
  solar_w: number;
  modeled_runtime_days: number | null;
  buffered_events: number;
  connectivity: 'ONLINE' | 'OFFLINE' | 'DELAYED';
  provenance: 'modeled_sensor';
}

export interface ScenarioSnapshot {
  scenario_id: string;
  incident_id: string;
  revision: number;
  current_asset_id: string;
  selected_premise_token: string;
  timestamp_utc: string;
  cutout_status: CutoutStatus;
  status: 'NORMAL' | 'AT_RISK' | 'OUTAGE' | 'UNDER_REVIEW' | 'RESTORED';
  evidence: Evidence[];
  hypotheses: Hypothesis[];
  crew_recommendation: CrewPackage;
  restoration: Restoration;
  planning_inputs?: {
    crew_size: number;
    access_hours: number;
  };
  solar: SolarNode;
  affected_premise_tokens: string[];
  impact_source?: {
    provenance: 'aep_challenge';
    scope: 'selected_subnet';
    basis: string;
    fault_asset_token: string;
    fault_asset_kind: string;
    affected_count_in_sample: number;
    sample_premise_count: number;
    full_source_known_dependent_count: number | null;
    critical_facility_impact?: {
      status: string;
      facility_count: number;
      critical_facilities: Array<{
        facility_name: string;
        facility_type: string;
        nearest_asset_id: string;
        distance_km: number;
      }>;
    };
  } | null;
  customer_risk: {
    band: RiskBand;
    drivers: string[];
    confidence_kind: string;
  };
  notifications: Array<{
    type: string;
    text: string;
    delivery_mode: 'demo';
    sent_at_utc: string;
  }>;
  disclosure: string;
}
