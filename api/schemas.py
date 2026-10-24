"""Canonical integration contract. Integrator owns changes to this file."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class Evidence(Model):
    id: str
    kind: str
    value: str | float | bool | None
    unit: str | None = None
    provenance: Literal['aep_challenge', 'modeled_sensor', 'scenario']
    visibility: Literal['operator', 'customer_safe'] = 'operator'

class Hypothesis(Model):
    code: str
    label: str
    score_type: Literal['relative_evidence', 'unavailable'] = 'unavailable'
    requires_field_confirmation: bool = True
    evidence_ids: list[str] = Field(default_factory=list)

class CrewPackage(Model):
    capabilities: list[str]
    material_categories: list[str]
    basis: Literal['assessment_required', 'diagnostic_hypothesis', 'field_confirmed_in_scenario']
    approved: Literal[False] = False
    reason: str

class Restoration(Model):
    kind: Literal['scenario_planning', 'unavailable']
    lower_hours: float | None = Field(default=None, ge=0)
    expected_hours: float | None = Field(default=None, ge=0)
    upper_hours: float | None = Field(default=None, ge=0)
    reference: Literal['remaining_from_snapshot'] = 'remaining_from_snapshot'
    assumptions: list[str]
    labor_source: str | None = None
    @model_validator(mode='after')
    def interval(self):
        values = (self.lower_hours, self.expected_hours, self.upper_hours)
        if self.kind == 'unavailable' and any(v is not None for v in values):
            raise ValueError('Unavailable estimates must have null bounds')
        if self.kind == 'scenario_planning' and (any(v is None for v in values) or not values[0] <= values[1] <= values[2]):
            raise ValueError('Planning estimates require ordered nonnegative bounds')
        return self

class SupplyPath(Model):
    premise_token: str
    asset_tokens: list[str]
    completeness: Literal['complete_in_fixture', 'unknown']
    provenance: Literal['synthetic_fixture']

class Fault(Model):
    fault_id: str
    asset_id: str
    damage_class: str
    state: Literal['ACTIVE', 'REPAIRING', 'CLEARED', 'UNKNOWN']
    provenance: Literal['scenario'] = 'scenario'

class RepairTask(Model):
    task_id: str
    fault_id: str
    prerequisite_task_ids: list[str]
    capabilities: list[str]
    status: Literal['PENDING', 'REPAIRING', 'COMPLETE'] = 'PENDING'

class PremiseState(Model):
    premise_token: str
    status: Literal['NORMAL', 'AT_RISK', 'OUTAGE', 'UNDER_REVIEW', 'RESTORED']
    remaining_blocking_fault_ids: list[str]

class Impact(Model):
    known_affected_count: int = Field(ge=0)
    restored_in_scenario_count: int = Field(ge=0)
    unknown_coverage_count: int = Field(ge=0)
    scope: Literal['three_household_synthetic_fixture'] = 'three_household_synthetic_fixture'

class Risk(Model):
    band: Literal['LOW', 'MODERATE', 'HIGH', 'UNKNOWN']
    confidence_kind: Literal['scenario_only', 'unavailable']
    drivers: list[str]

class Needs(Model):
    medical_equipment: bool = False
    refrigerated_medication: bool = False
    sump_pump: bool = False
    backup_wh: float | None = Field(default=None, gt=0, le=1000000)
    device_watts: float | None = Field(default=None, gt=0, le=100000)
    inverter_efficiency: float = Field(default=0.85, gt=0, le=1)
    reserve_fraction: float = Field(default=0.2, ge=0, lt=1)

class Preferences(Model):
    opted_in: bool = False
    channel: Literal['in_app_demo'] = 'in_app_demo'
    needs: Needs = Field(default_factory=Needs)

class Notification(Model):
    id: str
    type: Literal['PRE_STORM', 'OUTAGE_CONFIRMED', 'ESTIMATE_UPDATED', 'RESTORATION_COMPLETE']
    text: str
    delivery_mode: Literal['demo'] = 'demo'
    sent_at_utc: str
    revision: int

class CustomerPlan(Model):
    guidance: list[str]
    theoretical_runtime_hours: float | None = None
    alert_eligible: bool
    alert_reason: str
    channel: Literal['in_app_demo'] = 'in_app_demo'

class SolarNode(Model):
    battery_soc_pct: float | None = Field(default=None, ge=0, le=100)
    modeled_runtime_days: float | None = Field(default=None, ge=0)
    provenance: Literal['modeled_sensor'] = 'modeled_sensor'
    limitations: str = 'Awaiting energy-owner implementation; no field endurance claim.'

class Snapshot(Model):
    schema_version: Literal['integration_v1'] = 'integration_v1'
    scenario_id: str
    incident_id: str
    run_id: str
    revision: int = Field(ge=1)
    timestamp_utc: str
    title: str
    phase: Literal['PRE_STORM', 'OUTAGE', 'PARTIAL_RESTORATION', 'RESTORED', 'UNDER_REVIEW']
    current_asset_id: str
    selected_premise_token: str
    cutout_status: Literal['OPEN', 'CLOSED', 'UNKNOWN']
    evidence: list[Evidence]
    hypotheses: list[Hypothesis]
    crew_recommendation: CrewPackage
    restoration: Restoration
    solar: SolarNode = Field(default_factory=SolarNode)
    customer_risk: Risk
    selected_supply_path: SupplyPath
    active_faults: list[Fault]
    repair_tasks: list[RepairTask]
    premise_states: list[PremiseState]
    affected_premise_tokens: list[str]
    impact_summary: Impact
    notifications: list[Notification]
    disclosure: str

class CustomerSnapshot(Model):
    schema_version: Literal['integration_v1'] = 'integration_v1'
    scenario_id: str
    run_id: str
    revision: int
    timestamp_utc: str
    premise_token: str
    status: Literal['NORMAL', 'AT_RISK', 'OUTAGE', 'UNDER_REVIEW', 'RESTORED']
    risk: Risk
    restoration: Restoration
    explanation: str
    remaining_repair_count: int
    plan: CustomerPlan
    preferences: Preferences
    notifications: list[Notification]
    disclosure: str

class Action(Model):
    action_id: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    expected_revision: int = Field(ge=1)
    action: Literal['advance', 'start_repair', 'complete_repair', 'select_premise', 'set_preferences']
    target_id: str | None = Field(default=None, max_length=100)
    preferences: Preferences | None = None
    @model_validator(mode='after')
    def payload(self):
        needs_target = self.action in {'start_repair', 'complete_repair', 'select_premise', 'set_preferences'}
        if needs_target != (self.target_id is not None):
            raise ValueError('This action requires exactly its documented target')
        if (self.action == 'set_preferences') != (self.preferences is not None):
            raise ValueError('Preferences are only required for set_preferences')
        return self

class ResetRequest(Model):
    action_id: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    expected_revision: int = Field(ge=1)

class ScenarioSummary(Model):
    id: str
    title: str
    description: str
    source: Literal['synthetic_fixture'] = 'synthetic_fixture'

class PremiseSummary(Model):
    token: str
    label: str
    source: Literal['synthetic_fixture'] = 'synthetic_fixture'

class CustomerPreferencesRequest(Model):
    action_id: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    expected_revision: int = Field(ge=1)
    preferences: Preferences

class RiskRequest(Model):
    scenario_id: str
    premise_token: str
    storm_scenario: Literal['calm', 'moderate', 'severe', 'unknown'] = 'severe'
