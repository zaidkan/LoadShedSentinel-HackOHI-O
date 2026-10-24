from __future__ import annotations
from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field

Provenance = Literal[
    'aep_challenge',
    'external_research',
    'modeled_sensor',
    'scenario',
    'authorized_enterprise'
]

EvidenceQuality = Literal['observed', 'modeled', 'reported', 'field_confirmed', 'missing']
RiskBand = Literal['LOW', 'MODERATE', 'HIGH', 'UNKNOWN']
HypothesisCode = Literal[
    'LOCAL_PROTECTION_OPERATION',
    'POSSIBLE_EQUIPMENT_DISTRESS',
    'UPSTREAM_FEEDER_INTERRUPTION',
    'STRUCTURE_OR_CONDUCTOR_DAMAGE',
    'INSUFFICIENT_EVIDENCE'
]
CutoutStatus = Literal['OPEN', 'CLOSED', 'UNKNOWN']
SnapshotStatus = Literal['NORMAL', 'AT_RISK', 'OUTAGE', 'UNDER_REVIEW', 'RESTORED']

class Evidence(BaseModel):
    id: str
    incident_id: str
    asset_id: Optional[str] = None
    timestamp_utc: str
    kind: str
    value: Optional[Union[str, int, float, bool]] = None
    unit: Optional[str] = None
    provenance: Provenance
    quality: EvidenceQuality
    visibility: Literal['operator', 'customer_safe']

class Hypothesis(BaseModel):
    code: HypothesisCode
    score_type: Literal['relative_evidence', 'calibrated_probability', 'unavailable']
    score: Optional[float] = None
    label: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    requires_field_confirmation: bool = True

class CrewPackage(BaseModel):
    capabilities: List[str] = Field(default_factory=list)
    material_categories: List[str] = Field(default_factory=list)
    candidate_damage_class: str
    basis: Literal['field_confirmed', 'diagnostic_hypothesis', 'assessment_required']
    approved: Literal[False] = False
    reason: str

class Restoration(BaseModel):
    kind: Literal['scenario_planning', 'utility_confirmed', 'unavailable']
    lower_hours: Optional[float] = None
    expected_hours: Optional[float] = None
    upper_hours: Optional[float] = None
    labor_work_hours: Optional[float] = None
    labor_work_unit: Optional[str] = None
    assumptions: List[str] = Field(default_factory=list)
    last_updated_utc: str

class SolarNode(BaseModel):
    battery_soc_pct: float
    nominal_wh: float
    solar_w: float
    modeled_runtime_days: Optional[float] = None
    buffered_events: int = 0
    connectivity: Literal['ONLINE', 'OFFLINE', 'DELAYED']
    provenance: Literal['modeled_sensor'] = 'modeled_sensor'

class CustomerRisk(BaseModel):
    band: RiskBand
    drivers: List[str] = Field(default_factory=list)
    confidence_kind: str

class NotificationItem(BaseModel):
    type: str
    text: str
    delivery_mode: Literal['demo'] = 'demo'
    sent_at_utc: str

class ScenarioSnapshot(BaseModel):
    scenario_id: str
    incident_id: str
    revision: int = 1
    current_asset_id: str
    selected_premise_token: str
    timestamp_utc: str
    cutout_status: CutoutStatus
    status: SnapshotStatus
    evidence: List[Evidence] = Field(default_factory=list)
    hypotheses: List[Hypothesis] = Field(default_factory=list)
    crew_recommendation: CrewPackage
    restoration: Restoration
    solar: SolarNode
    affected_premise_tokens: List[str] = Field(default_factory=list)
    customer_risk: CustomerRisk
    notifications: List[NotificationItem] = Field(default_factory=list)
    disclosure: str
