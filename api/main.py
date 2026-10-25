from __future__ import annotations
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Union, Set
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.schemas import ScenarioSnapshot, CustomerRisk
from engine.customer import (
    project_customer_view,
    calculate_battery_runtime,
    generate_preparedness_guidance,
    HouseholdNeeds,
    NotificationFSM
)
from engine.scenarios import generate_scenario, SCENARIO_IDS
from engine.restoration import evaluate_restoration
from engine.topology import Topology
from engine.aep_impact import AEPImpact, UnknownAEPAsset

app = FastAPI(
    title="LoadShed Sentinel API",
    description="HackOHI/O 2026 - Transformer Digital Twin & Customer Outage Concierge",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
FIXTURE_PATH = os.path.join(BASE_DIR, "..", "fixtures", "scenario_fixture.json")
TOPOLOGY_PATH = os.path.join(BASE_DIR, "..", "data", "processed", "private", "topology.json")
GEOJSON_PATH = os.path.join(BASE_DIR, "..", "data", "processed", "network.geojson")

# Session state dataclass
@dataclass
class SessionState:
    session_id: str
    snapshot: ScenarioSnapshot
    context: Optional[dict] = None
    fsm: NotificationFSM = field(default_factory=NotificationFSM)
    completed_task_ids: Set[str] = field(default_factory=set)
    authorized_premise_tokens: Set[str] = field(default_factory=set)
    last_accessed: float = field(default_factory=time.time)

# In-memory runtime state keyed by session
_sessions: Dict[str, SessionState] = {}
_topology_instance: Optional[Topology] = None
_aep_impact_instance: Optional[AEPImpact] = None

SCENARIO_BLOCKERS: Dict[str, List[str]] = {
    "local_protection": ["inspect_equipment", "verify_clearance", "reclose_cutout"],
    "upstream_feeder": ["isolate_fault", "verify_feeder_clearance", "reclose_breaker"],
    "confirmed_replacement": ["replace_transformer", "verify_clearance", "reclose_cutout"],
    "insufficient_evidence": ["investigate_telemetry", "verify_clearance", "reclose_cutout"],
}

def get_premise_blockers(snapshot: ScenarioSnapshot) -> Dict[str, List[str]]:
    blockers = SCENARIO_BLOCKERS.get(snapshot.scenario_id, ["repair_work", "verify_clearance", "reclose_cutout"])
    premises = snapshot.affected_premise_tokens or ([snapshot.selected_premise_token] if snapshot.selected_premise_token else ["P-DEMO-001"])
    return {p: list(blockers) for p in premises}

def get_aep_impact() -> AEPImpact:
    """Validated, anonymized slice derived from the official AEP source archives.

    Fail closed if the source bundle is absent. No fabricated fallback footprints.
    """
    global _aep_impact_instance
    if _aep_impact_instance is None:
        try:
            _aep_impact_instance = AEPImpact.load()
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise HTTPException(status_code=503, detail="AEP impact source unavailable: " + str(exc)) from exc
    return _aep_impact_instance


def get_topology() -> Optional[Topology]:
    global _topology_instance
    if _topology_instance is None and os.path.exists(TOPOLOGY_PATH):
        try:
            _topology_instance = Topology.load(TOPOLOGY_PATH)
        except Exception as e:
            print(f"Warning: could not load topology from {TOPOLOGY_PATH}: {e}")
    return _topology_instance

def _load_initial_snapshot() -> ScenarioSnapshot:
    try:
        return generate_scenario("local_protection", {})
    except Exception as exc:
        if os.getenv("SENTINEL_ALLOW_SYNTHETIC_FIXTURE") == "1" and os.path.exists(FIXTURE_PATH):
            with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ScenarioSnapshot(**data)
        raise HTTPException(status_code=503, detail=f"AEP source data unavailable: {exc}") from exc

def get_session(session_id: Optional[str] = None) -> SessionState:
    global _sessions
    sid = session_id.strip() if session_id and session_id.strip() else "default"
    now = time.time()
    # Prune stale sessions older than 2 hours (keep default)
    if len(_sessions) > 50:
        stale = [k for k, s in _sessions.items() if k != "default" and (now - s.last_accessed) > 7200]
        for k in stale:
            _sessions.pop(k, None)
    if sid not in _sessions:
        _sessions[sid] = SessionState(
            session_id=sid,
            snapshot=_load_initial_snapshot(),
            context=None,
            fsm=NotificationFSM()
        )
    session = _sessions[sid]
    session.last_accessed = now
    return session

def get_snapshot(session_id: Optional[str] = None) -> ScenarioSnapshot:
    return get_session(session_id).snapshot

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "LoadShed Sentinel API",
        "version": "1.0.0",
        "topology_loaded": get_topology() is not None,
        "aep_impact_sample_loaded": _aep_impact_instance is not None,
    }

@app.get("/api/scenarios")
def list_scenarios():
    """Scenario catalog with counts computed from the shipped AEP source paths."""
    source = get_aep_impact()
    descriptions = [
        ("local_protection", "Local Transformer Protection (Simulated)",
         "Simulated local protective-device operation, dependency footprint from AEP source paths.", "OPEN", "OUTAGE"),
        ("upstream_feeder", "Upstream Breaker Interruption (Simulated)",
         "Simulated breaker opening; all dependencies in the selected AEP subnet are traced.", "CLOSED", "OUTAGE"),
        ("confirmed_replacement", "Transformer Replacement (Simulated)",
         "Simulated field confirmation and review-only transformer work package.", "OPEN", "OUTAGE"),
        ("insufficient_evidence", "Contradictory Telemetry (Abstention)",
         "Evidence is insufficient; do not claim an outage or a known affected count.", "UNKNOWN", "UNDER_REVIEW"),
    ]
    result = []
    for scenario_id, title, description, cutout_status, status in descriptions:
        dependency_count = source.scenario_context(scenario_id)["source_impact"]["affected_count_in_sample"]
        result.append({
            "id": scenario_id, "title": title, "description": description,
            "cutout_status": cutout_status,
            "expected_affected": 0 if scenario_id == "insufficient_evidence" else dependency_count,
            "impact_scope": "selected_subnet",
            "status": status,
        })
    return result


@app.get("/api/aep/assets")
def list_aep_assets():
    """Only anonymized source asset tokens and in-sample dependency counts."""
    return get_aep_impact().selectable_assets()


@app.get("/api/aep/source")
def aep_source_status():
    source = get_aep_impact()
    return {
        "provenance": "aep_challenge",
        "origin": "https://github.com/hackohio/aep_challenge_hack26",
        "scope": "selected_subnet", "premises_in_sample": len(source.paths),
        "equipment_in_sample": len(source.assets),
        "basis": "validated supplied upstream paths; not physical conductor geometry",
        "is_live_outage_data": False,
        "is_full_territory_impact_count": False,
        "limitations": source.metadata.get("limitations", []),
    }


@app.post("/api/session/new")
def new_session():
    """Initializes an isolated demonstration session state."""
    sid = str(uuid.uuid4())
    session = get_session(sid)
    return {
        "session_id": sid,
        "status": "created",
        "scenario_id": session.snapshot.scenario_id,
        "revision": session.snapshot.revision
    }


class SelectScenarioRequest(BaseModel):
    model_config = {"extra": "forbid"}
    scenario_id: str
    asset_token: Optional[str] = None
    premise_token: Optional[str] = None
    crew_size: Optional[int] = None
    access_hours: Optional[float] = None


@app.post("/api/scenario/select")
def select_scenario(req: SelectScenarioRequest, x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    """Simulate a fault on selected AEP equipment, calculating dependent premises."""
    session = get_session(x_session_id)
    if req.scenario_id not in SCENARIO_IDS:
        raise HTTPException(status_code=400, detail="Unknown scenario")
    try:
        context = get_aep_impact().scenario_context(req.scenario_id, req.asset_token, req.premise_token)
        if req.crew_size is not None:
            if req.crew_size < 1 or req.crew_size > 100:
                raise HTTPException(status_code=400, detail="crew_size must be between 1 and 100")
            context['crew_size'] = req.crew_size
        if req.access_hours is not None:
            if req.access_hours < 0 or req.access_hours > 720:
                raise HTTPException(status_code=400, detail="access_hours must be between 0 and 720")
            context['access_hours'] = req.access_hours
        snapshot = generate_scenario(req.scenario_id, context)
    except (UnknownAEPAsset, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session.context = context
    session.snapshot = snapshot
    session.fsm = NotificationFSM()
    session.completed_task_ids.clear()
    session.authorized_premise_tokens.clear()

    restoration_summary = ""
    if session.snapshot.restoration.kind == 'scenario_planning' and session.snapshot.restoration.expected_hours is not None:
        restoration_summary = f"Expected duration {session.snapshot.restoration.expected_hours:.1f} hours"

    new_alerts = session.fsm.evaluate_triggers(
        premise_token=session.snapshot.selected_premise_token,
        incident_id=session.snapshot.incident_id,
        status=session.snapshot.status,
        risk=session.snapshot.customer_risk,
        restoration_summary=restoration_summary,
        timestamp_utc=session.snapshot.timestamp_utc
    )
    for alert in new_alerts:
        if not any(n.type == alert.type and n.text == alert.text for n in session.snapshot.notifications):
            session.snapshot.notifications.append(alert)
    return session.snapshot


@app.get("/api/scenario/current", response_model=ScenarioSnapshot)
def get_current_scenario(x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    """Returns the full authoritative operator ScenarioSnapshot."""
    return get_snapshot(x_session_id)

@app.get("/api/customer/snapshot")
def get_customer_snapshot(x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    """Returns privacy-sanitized customer concierge view."""
    return project_customer_view(get_snapshot(x_session_id))

VALID_STATUSES = {"NORMAL", "AT_RISK", "OUTAGE", "UNDER_REVIEW", "RESTORED"}
VALID_CUTOUTS = {"OPEN", "CLOSED", "UNKNOWN"}

class AdvanceRequest(BaseModel):
    model_config = {"extra": "forbid"}
    incident_id: Optional[str] = None
    expected_revision: Optional[int] = None
    status: Optional[str] = None
    cutout_status: Optional[str] = None
    restoration_summary: Optional[str] = None
    crew_size: Optional[int] = None
    access_hours: Optional[Union[float, List[float]]] = None
    action: Optional[str] = None
    completed_task_ids: Optional[List[str]] = None
    authorized_premises: Optional[List[str]] = None
    record_demo_authorization: Optional[bool] = None

@app.post("/api/scenario/advance")
def advance_scenario(req: AdvanceRequest, x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    """Advances scenario state and evaluates customer notification triggers."""
    session = get_session(x_session_id)
    snap = session.snapshot
    
    # 1. Validation phase (reject before mutating anything)
    if req.incident_id and req.incident_id != snap.incident_id:
        raise HTTPException(status_code=409, detail=f"Incident ID mismatch: current '{snap.incident_id}', requested '{req.incident_id}'")
    if req.expected_revision is not None and req.expected_revision != snap.revision:
        raise HTTPException(status_code=409, detail=f"Revision conflict: current {snap.revision}, expected {req.expected_revision}")
    
    if req.status and req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{req.status}'. Must be one of {sorted(VALID_STATUSES)}")
    if req.cutout_status and req.cutout_status not in VALID_CUTOUTS:
        raise HTTPException(status_code=400, detail=f"Invalid cutout_status '{req.cutout_status}'. Must be one of {sorted(VALID_CUTOUTS)}")

    if req.crew_size is not None and (req.crew_size < 1 or req.crew_size > 100):
        raise HTTPException(status_code=400, detail="crew_size must be between 1 and 100")
    if req.access_hours is not None:
        if isinstance(req.access_hours, (int, float)):
            if req.access_hours < 0 or req.access_hours > 720:
                raise HTTPException(status_code=400, detail="access_hours must be between 0 and 720")
        elif isinstance(req.access_hours, list):
            if not all(isinstance(x, (int, float)) and 0 <= x <= 720 for x in req.access_hours):
                raise HTTPException(status_code=400, detail="access_hours elements must be between 0 and 720")
            if req.access_hours != sorted(req.access_hours):
                raise HTTPException(status_code=400, detail="access_hours list must be ordered low <= expected <= high")
        else:
            raise HTTPException(status_code=400, detail="access_hours must be a number or list of numbers")

    premise_blockers = get_premise_blockers(snap)
    all_known_blockers = {b for blist in premise_blockers.values() for b in blist}

    # Handle explicit blocker completion / authorization events
    if req.action == "record_demo_authorization" or req.record_demo_authorization:
        if req.completed_task_ids:
            for cid in req.completed_task_ids:
                if cid not in all_known_blockers:
                    raise HTTPException(status_code=400, detail=f"Unknown blocking task: {cid}")
            session.completed_task_ids.update(req.completed_task_ids)
        else:
            session.completed_task_ids.update(all_known_blockers)

        if req.authorized_premises:
            for p in req.authorized_premises:
                if p not in premise_blockers:
                    raise HTTPException(status_code=400, detail=f"Unknown premise token for authorization: {p}")
            session.authorized_premise_tokens.update(req.authorized_premises)
        else:
            session.authorized_premise_tokens.update(premise_blockers.keys())
    else:
        if req.completed_task_ids is not None:
            for cid in req.completed_task_ids:
                if cid not in all_known_blockers:
                    raise HTTPException(status_code=400, detail=f"Unknown blocking task: {cid}")
            session.completed_task_ids.update(req.completed_task_ids)

        if req.authorized_premises is not None:
            for p in req.authorized_premises:
                if p not in premise_blockers:
                    raise HTTPException(status_code=400, detail=f"Unknown premise token for authorization: {p}")
            session.authorized_premise_tokens.update(req.authorized_premises)

    # P0-01: Restoration authorization gating via evaluate_restoration
    if req.status == "RESTORED":
        try:
            eval_results = evaluate_restoration(
                premise_blockers,
                session.completed_task_ids,
                session.authorized_premise_tokens
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Restoration evaluation failed: {exc}") from exc

        unrestored = [r for r in eval_results if not r.get("modeled_restored")]
        if unrestored:
            sample = unrestored[0]
            rem_blockers = sample.get("remaining_blockers", [])
            prem = sample["premise_token"]
            if rem_blockers:
                detail_msg = (
                    f"Restoration blocked for premise {prem}: modeled repair blockers remain uncleared ({rem_blockers}). "
                    "All blockers must be cleared before service restoration."
                )
            else:
                detail_msg = (
                    f"Restoration blocked for premise {prem}: lacking explicit operator simulated authorization. "
                    "Provide explicit authorization via action='record_demo_authorization' or authorized_premises."
                )
            raise HTTPException(status_code=400, detail=detail_msg)

    # 2. Context & restoration recalculation
    new_restoration = snap.restoration
    new_planning_inputs = snap.planning_inputs
    if req.crew_size is not None or req.access_hours is not None:
        ctx = dict(session.context or {})
        if not ctx:
            try:
                ctx = get_aep_impact().scenario_context(snap.scenario_id)
            except Exception:
                ctx = {}
        if req.crew_size is not None:
            ctx['crew_size'] = req.crew_size
        if req.access_hours is not None:
            ctx['access_hours'] = req.access_hours

        try:
            updated_snap = generate_scenario(snap.scenario_id, ctx)
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid scenario planning inputs: {exc}") from exc

        session.context = ctx
        new_restoration = updated_snap.restoration
        new_planning_inputs = updated_snap.planning_inputs

    # 3. Apply state changes atomically
    if req.status:
        snap.status = req.status
        if req.status == "RESTORED" and not req.cutout_status:
            snap.cutout_status = "CLOSED"
    if req.cutout_status:
        snap.cutout_status = req.cutout_status
    snap.restoration = new_restoration
    snap.planning_inputs = new_planning_inputs
    snap.revision += 1
    
    # 4. Evaluate notifications via FSM
    rest_sum = req.restoration_summary or ""
    if not rest_sum and snap.restoration.kind == 'scenario_planning' and snap.restoration.expected_hours is not None:
        rest_sum = f"Expected duration {snap.restoration.expected_hours:.1f} hours"

    new_alerts = session.fsm.evaluate_triggers(
        premise_token=snap.selected_premise_token,
        incident_id=snap.incident_id,
        status=snap.status,
        risk=snap.customer_risk,
        restoration_summary=rest_sum,
        timestamp_utc=snap.timestamp_utc
    )
    for alert in new_alerts:
        if not any(n.type == alert.type and n.text == alert.text for n in snap.notifications):
            snap.notifications.append(alert)
    return snap

@app.post("/api/scenario/reset")
def reset_scenario(x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    """Resets scenario to base fixture state."""
    session = get_session(x_session_id)
    session.snapshot = _load_initial_snapshot()
    session.context = None
    session.fsm = NotificationFSM()
    session.completed_task_ids.clear()
    session.authorized_premise_tokens.clear()
    return session.snapshot

@app.get("/api/topology/lookup")
def lookup_premise_topology(premise_id: str = Query(..., description="Anonymized public premise token")):
    """Return the same AEP-derived source trace as the outage impact engine."""
    source = get_aep_impact()
    if premise_id in source.paths:
        return source.trace(premise_id)
    # Keep support for an optional full private graph without exposing its raw IDs.
    topo = get_topology()
    if topo is not None and premise_id.startswith("PREM-"):
        return topo.premise_to_substation(premise_id)
    return source.trace(premise_id)


@app.get("/api/topology/geojson")
def get_network_geojson():
    """Schematic map from the same AEP-source bundle used by impact simulation."""
    return get_aep_impact().geojson()

class BatteryCalcRequest(BaseModel):
    model_config = {"extra": "forbid"}
    capacity_wh: float
    usable_fraction: float = 0.85
    device_w: float
    inverter_efficiency: float = 0.85
    reserve_margin_pct: float = 0.15

@app.post("/api/customer/battery-runtime")
def battery_runtime(req: BatteryCalcRequest):
    """Calculates continuous runtime and conservative reserve for home battery planning."""
    if not (0.0 <= req.usable_fraction <= 1.0):
        raise HTTPException(status_code=400, detail="usable_fraction must be between 0.0 and 1.0")
    if not (0.5 <= req.inverter_efficiency <= 1.0):
        raise HTTPException(status_code=400, detail="inverter_efficiency must be between 0.5 and 1.0")
    if req.device_w < 0:
        raise HTTPException(status_code=400, detail="device_w must be non-negative")
    if req.capacity_wh < 0:
        raise HTTPException(status_code=400, detail="capacity_wh must be non-negative")
    return calculate_battery_runtime(
        capacity_wh=req.capacity_wh,
        usable_fraction=req.usable_fraction,
        device_w=req.device_w,
        inverter_efficiency=req.inverter_efficiency,
        reserve_margin_pct=req.reserve_margin_pct
    )

class PreparednessRequest(BaseModel):
    food_refrigeration: bool = True
    refrigerated_medication: bool = False
    life_critical_medical_device: bool = False
    medical_device_notes: str = ""
    mobility_accessibility_needs: bool = False
    communications_charging: bool = True
    sump_pump: bool = False
    backup_battery_available: bool = False
    battery_capacity_wh: float = 0.0
    battery_usable_pct: float = 0.85
    essential_load_w: float = 0.0

@app.post("/api/customer/preparedness")
def preparedness_guidance(req: PreparednessRequest):
    """Generates household-specific safety and preparedness recommendations."""
    needs_data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
    needs = HouseholdNeeds(**needs_data)
    return {
        "guidance": generate_preparedness_guidance(needs)
    }


# Pre-fault condition screening is independent of the incident simulator. Running
# a preventive replay never declares an outage or mutates the incident snapshot.
PREVENTIVE_PROFILES = [
    {"id": "normal", "label": "Healthy operating changes", "description": "Load and ambient changes without persistent deterioration."},
    {"id": "warming", "label": "Developing thermal trend", "description": "Persistent temperature departure from a contextual baseline."},
    {"id": "persistent_multisensor", "label": "Corroborated condition change", "description": "Persistent thermal, vibration and acoustic indications for utility review."},
    {"id": "storm_ready", "label": "Storm preparation", "description": "Declared weather scenario increases readiness without confirming an outage."},
    {"id": "unknown", "label": "Unavailable telemetry", "description": "Insufficient or unhealthy sensing must remain unknown."},
]


def _preventive_source_context(asset_token: Optional[str]) -> dict:
    source = get_aep_impact()
    try:
        context = source.scenario_context("local_protection", asset_token)
    except (UnknownAEPAsset, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "asset_token": context["current_asset_id"],
        "provenance": "aep_challenge", "scope": "selected_subnet",
        "dependent_premises_in_sample": len(context["local_premise_tokens"]),
        "sample_premise_count": len(source.paths),
        "is_observed_outage": False,
    }


@app.get("/api/preventive/profiles")
def preventive_profiles():
    return {"profiles": PREVENTIVE_PROFILES, "readings_provenance": "modeled_sensor",
            "is_live_sensor_stream": False}


class PreventiveRequest(BaseModel):
    model_config = {"extra": "forbid", "allow_inf_nan": False}
    asset_token: Optional[str] = None
    profile_id: str = "persistent_multisensor"
    readings: Optional[List[dict]] = None
    as_of_utc: Optional[str] = None
    wind_mph: Optional[float] = None


@app.post("/api/preventive/assess")
def preventive_assessment(req: PreventiveRequest):
    from engine.preventive import assess_preventive, demo_profile

    if req.profile_id not in {profile["id"] for profile in PREVENTIVE_PROFILES}:
        raise HTTPException(status_code=422, detail="Unknown preventive replay profile")
    if req.readings is not None and (not req.as_of_utc or not 1 <= len(req.readings) <= 500):
        raise HTTPException(status_code=422, detail="Custom readings require as_of_utc and 1..500 observations")
    if req.wind_mph is not None and not 0 <= req.wind_mph <= 200:
        raise HTTPException(status_code=422, detail="wind_mph must be within 0..200")
    source = _preventive_source_context(req.asset_token)
    try:
        inputs = demo_profile(req.profile_id, source["asset_token"], as_of_utc=req.as_of_utc)
        inputs["dependency_context"] = {
            "affected_count_in_sample": source["dependent_premises_in_sample"],
            "scope": "selected_subnet", "provenance": "aep_challenge",
        }
        if req.readings is not None:
            inputs["readings"] = req.readings
            # Caller observations must not inherit weather from a demo profile.
            inputs.pop("weather", None)
        if req.as_of_utc is not None:
            inputs["as_of_utc"] = req.as_of_utc
        if req.wind_mph is not None:
            inputs["weather"] = {"wind_mph": req.wind_mph, "provenance": "scenario"}
        assessment = assess_preventive(inputs)
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    priority = assessment.get("condition_priority", "UNKNOWN")
    readiness = assessment.get("readiness", "UNKNOWN")
    if priority == "UNKNOWN":
        message = "Monitoring data is insufficient. Service and future outage timing cannot be inferred from this replay."
    elif priority == "INSPECT":
        message = "A modeled condition change warrants utility review. No outage is confirmed and a failure time is not known."
    elif readiness == "PREPARE":
        message = "The declared storm scenario supports reviewing household preparation. It does not establish that your power will go out."
    else:
        message = "Continue routine monitoring. No outage or failure time is predicted by this replay."
    return {
        "assessment": assessment, "source_context": source,
        "input_series": inputs["readings"],
        "customer_advisory": {"message": message, "outage_confirmed": False,
                              "failure_time_utc": None, "physical_service_status": "UNKNOWN", "delivery_mode": "demo"},
        "profile_id": req.profile_id,
        "input_origin": "provided_readings" if req.readings is not None else "modeled_sensor_replay",
        "disclosure": "Source-derived AEP dependencies; modeled or caller-supplied sensor readings. Thresholds are demonstration assumptions, not field-calibrated failure probabilities. No dispatch or external messages occur.",
    }


class ResponseComparisonRequest(BaseModel):
    model_config = {"extra": "forbid", "allow_inf_nan": False}
    inputs: dict
    asset_token: Optional[str] = None


@app.post("/api/response/compare")
def response_comparison(req: ResponseComparisonRequest):
    from engine.response_comparison import compare_response

    source = _preventive_source_context(req.asset_token)
    inputs = dict(req.inputs)
    try:
        result = compare_response(inputs)
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**result, "source_context": source}


@app.get("/api/response/benchmark")
def response_benchmark():
    from engine.response_comparison import benchmark_response
    return benchmark_response()
