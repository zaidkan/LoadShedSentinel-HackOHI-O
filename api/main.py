from __future__ import annotations
import json
import os
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Query
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

# In-memory runtime state
_current_snapshot: ScenarioSnapshot = None
_fsm = NotificationFSM()
_topology_instance: Optional[Topology] = None
_aep_impact_instance: Optional[AEPImpact] = None


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
    except Exception:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ScenarioSnapshot(**data)

def get_snapshot() -> ScenarioSnapshot:
    global _current_snapshot
    if _current_snapshot is None:
        _current_snapshot = _load_initial_snapshot()
    return _current_snapshot

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


class SelectScenarioRequest(BaseModel):
    scenario_id: str
    asset_token: Optional[str] = None
    premise_token: Optional[str] = None


@app.post("/api/scenario/select")
def select_scenario(req: SelectScenarioRequest):
    """Simulate a fault on selected AEP equipment, calculating dependent premises."""
    global _current_snapshot, _fsm
    if req.scenario_id not in SCENARIO_IDS:
        raise HTTPException(status_code=400, detail="Unknown scenario")
    try:
        context = get_aep_impact().scenario_context(req.scenario_id, req.asset_token, req.premise_token)
        snapshot = generate_scenario(req.scenario_id, context)
    except (UnknownAEPAsset, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    _current_snapshot = snapshot

    new_alerts = _fsm.evaluate_triggers(
        premise_token=_current_snapshot.selected_premise_token,
        incident_id=_current_snapshot.incident_id,
        status=_current_snapshot.status,
        risk=_current_snapshot.customer_risk,
        restoration_summary=f"Incident {req.scenario_id} declared in grid simulation",
        timestamp_utc=_current_snapshot.timestamp_utc
    )
    _current_snapshot.notifications.extend(new_alerts)
    return _current_snapshot


@app.get("/api/scenario/current", response_model=ScenarioSnapshot)
def get_current_scenario():
    """Returns the full authoritative operator ScenarioSnapshot."""
    return get_snapshot()

@app.get("/api/customer/snapshot")
def get_customer_snapshot():
    """Returns privacy-sanitized customer concierge view."""
    return project_customer_view(get_snapshot())

class AdvanceRequest(BaseModel):
    status: Optional[str] = None
    cutout_status: Optional[str] = None
    restoration_summary: Optional[str] = None

@app.post("/api/scenario/advance")
def advance_scenario(req: AdvanceRequest):
    """Advances scenario state and evaluates customer notification triggers."""
    global _current_snapshot, _fsm
    snap = get_snapshot()
    
    if req.status:
        snap.status = req.status
    if req.cutout_status:
        snap.cutout_status = req.cutout_status
    snap.revision += 1
    
    # Evaluate notifications via FSM
    new_alerts = _fsm.evaluate_triggers(
        premise_token=snap.selected_premise_token,
        incident_id=snap.incident_id,
        status=snap.status,
        risk=snap.customer_risk,
        restoration_summary=req.restoration_summary or "",
        timestamp_utc=snap.timestamp_utc
    )
    snap.notifications.extend(new_alerts)
    return snap

@app.post("/api/scenario/reset")
def reset_scenario():
    """Resets scenario to base fixture state."""
    global _current_snapshot, _fsm
    _current_snapshot = _load_initial_snapshot()
    _fsm = NotificationFSM()
    return _current_snapshot

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
    capacity_wh: float
    usable_fraction: float = 0.85
    device_w: float
    inverter_efficiency: float = 0.85
    reserve_margin_pct: float = 0.15

@app.post("/api/customer/battery-runtime")
def battery_runtime(req: BatteryCalcRequest):
    """Calculates continuous runtime and conservative reserve for home battery planning."""
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
