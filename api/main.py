from __future__ import annotations
import json
import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
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

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "scenario_fixture.json")

# In-memory runtime state
_current_snapshot: ScenarioSnapshot = None
_fsm = NotificationFSM()

def _load_initial_snapshot() -> ScenarioSnapshot:
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
        "version": "1.0.0"
    }

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
