from __future__ import annotations
import math
from typing import List, Dict, Optional, Literal, Set
from datetime import datetime
from api.schemas import (
    CustomerRisk,
    NotificationItem,
    ScenarioSnapshot,
    RiskBand,
    SnapshotStatus
)

NotificationType = Literal['PRE_STORM', 'OUTAGE_CONFIRMED', 'ESTIMATE_UPDATED', 'RESTORATION_COMPLETE']

class HouseholdNeeds:
    def __init__(
        self,
        food_refrigeration: bool = True,
        refrigerated_medication: bool = False,
        life_critical_medical_device: bool = False,
        medical_device_notes: str = "",
        mobility_accessibility_needs: bool = False,
        communications_charging: bool = True,
        sump_pump: bool = False,
        backup_battery_available: bool = False,
        battery_capacity_wh: float = 0.0,
        battery_usable_pct: float = 0.85,
        essential_load_w: float = 0.0
    ):
        self.food_refrigeration = food_refrigeration
        self.refrigerated_medication = refrigerated_medication
        self.life_critical_medical_device = life_critical_medical_device
        self.medical_device_notes = medical_device_notes
        self.mobility_accessibility_needs = mobility_accessibility_needs
        self.communications_charging = communications_charging
        self.sump_pump = sump_pump
        self.backup_battery_available = backup_battery_available
        self.battery_capacity_wh = max(0.0, battery_capacity_wh)
        self.battery_usable_pct = min(1.0, max(0.1, battery_usable_pct))
        self.essential_load_w = max(0.0, essential_load_w)

def calculate_battery_runtime(
    capacity_wh: float,
    usable_fraction: float,
    device_w: float,
    inverter_efficiency: float = 0.85,
    reserve_margin_pct: float = 0.15
) -> Dict[str, Optional[float]]:
    """
    Computes theoretical battery runtime under continuous load.
    Returns estimated hours, usable energy, and safety margin.
    """
    if capacity_wh <= 0 or device_w <= 0 or usable_fraction <= 0 or inverter_efficiency <= 0:
        return {
            "theoretical_hours": 0.0,
            "conservative_hours": 0.0,
            "usable_wh": 0.0,
            "effective_load_w": 0.0
        }
    
    clamped_usable = max(0.0, min(1.0, usable_fraction))
    usable_wh = capacity_wh * clamped_usable
    if usable_wh <= 0:
        return {
            "theoretical_hours": 0.0,
            "conservative_hours": 0.0,
            "usable_wh": 0.0,
            "effective_load_w": 0.0
        }
    
    clamped_efficiency = max(0.5, min(1.0, inverter_efficiency))
    effective_load_w = device_w / clamped_efficiency
    
    raw_hours = usable_wh / effective_load_w
    conservative_hours = raw_hours * (1.0 - max(0.0, min(0.5, reserve_margin_pct)))
    
    return {
        "theoretical_hours": round(raw_hours, 2),
        "conservative_hours": round(conservative_hours, 2),
        "usable_wh": round(usable_wh, 1),
        "effective_load_w": round(effective_load_w, 1)
    }

def generate_preparedness_guidance(needs: HouseholdNeeds) -> List[Dict[str, str]]:
    """
    Generates tailored, safe preparation advice based on declared household needs.
    Grounds in official emergency guidance without false safety guarantees.
    """
    guidance = []
    
    if needs.life_critical_medical_device:
        guidance.append({
            "category": "CRITICAL_MEDICAL",
            "priority": "IMMEDIATE",
            "action": "Activate personal emergency plan; do NOT rely solely on local backup or restoration estimates.",
            "detail": "Contact care team, medical equipment supplier, or 911 if power disruption threatens life-sustaining equipment."
        })
    
    if needs.refrigerated_medication:
        guidance.append({
            "category": "MEDICATION",
            "priority": "HIGH",
            "action": "Prepare certified medical cooler and ice packs.",
            "detail": "Consult pharmacist for exact temperature tolerance ranges. Keep refrigerator door closed; do not use spoiled medication."
        })
    
    if needs.mobility_accessibility_needs:
        guidance.append({
            "category": "ACCESSIBILITY",
            "priority": "HIGH",
            "action": "Plan accessible exit route and verify backup battery for electric mobility devices.",
            "detail": "Elevators will be inoperable during power loss. Keep manual wheelchair or backup battery charger accessible, and identify accessible community cooling/warming centers."
        })
    
    if needs.food_refrigeration:
        guidance.append({
            "category": "FOOD_SAFETY",
            "priority": "MEDIUM",
            "action": "Minimize refrigerator and freezer door openings.",
            "detail": "An unopened refrigerator preserves food safely for ~4 hours; a full freezer preserves cold for ~48 hours (FDA/USDA standard)."
        })
    
    if needs.sump_pump:
        guidance.append({
            "category": "WATER_DAMAGE",
            "priority": "MEDIUM",
            "action": "Verify backup battery or mechanical emergency drainage.",
            "detail": "Basement sump pumps require dedicated backup during severe rain events to prevent flooding."
        })
    
    if needs.communications_charging:
        guidance.append({
            "category": "COMMUNICATIONS",
            "priority": "MEDIUM",
            "action": "Fully charge phones, tablets, and portable power banks before storm landfall.",
            "detail": "Switch devices to low-power mode and reserve battery for emergency communications."
        })
        
    return guidance

class NotificationFSM:
    """
    Finite State Machine for customer outage notifications.
    Prevents duplicate alerts and maintains an audit log of triggered events.
    """
    def __init__(self):
        self._sent_keys: Set[str] = set()
        self._last_etag: Optional[str] = None

    def evaluate_triggers(
        self,
        premise_token: str,
        incident_id: str,
        status: SnapshotStatus,
        risk: CustomerRisk,
        restoration_summary: str,
        timestamp_utc: str
    ) -> List[NotificationItem]:
        notifications = []
        
        # 1. PRE_STORM trigger
        pre_storm_key = f"{premise_token}:PRE_STORM"
        if risk.band in ('HIGH', 'MODERATE') and status in ('NORMAL', 'AT_RISK'):
            if pre_storm_key not in self._sent_keys:
                notifications.append(NotificationItem(
                    type="PRE_STORM",
                    text=(
                        f"Your area has an elevated outage-risk band ({risk.band}) for the selected storm scenario. "
                        f"Main factors: {', '.join(risk.drivers) if risk.drivers else 'weather conditions'}. "
                        "This is an estimate, not a confirmed outage. Review household preparation."
                    ),
                    delivery_mode="demo",
                    sent_at_utc=timestamp_utc
                ))
                self._sent_keys.add(pre_storm_key)

        # 2. OUTAGE_CONFIRMED trigger (only for confirmed OUTAGE, never UNDER_REVIEW)
        outage_key = f"{premise_token}:{incident_id}:OUTAGE_CONFIRMED"
        if status == 'OUTAGE':
            if outage_key not in self._sent_keys:
                notifications.append(NotificationItem(
                    type="OUTAGE_CONFIRMED",
                    text=(
                        f"Power loss has been reported for your supply area as of {timestamp_utc}. "
                        "The suspected cause is under assessment by utility dispatch. "
                        "Review your declared emergency plan and safety preparation steps."
                    ),
                    delivery_mode="demo",
                    sent_at_utc=timestamp_utc
                ))
                self._sent_keys.add(outage_key)

        # 3. ESTIMATE_UPDATED trigger (only for confirmed OUTAGE with non-empty summary)
        if status == 'OUTAGE' and restoration_summary:
            etag = f"{incident_id}:{restoration_summary}"
            estimate_key = f"{premise_token}:{incident_id}:ESTIMATE:{etag}"
            if estimate_key not in self._sent_keys:
                notifications.append(NotificationItem(
                    type="ESTIMATE_UPDATED",
                    text=(
                        f"The restoration outlook changed: {restoration_summary}. "
                        "We will provide updates as utility field crews confirm repair milestones."
                    ),
                    delivery_mode="demo",
                    sent_at_utc=timestamp_utc
                ))
                self._sent_keys.add(estimate_key)
                self._last_etag = etag

        # 4. RESTORATION_COMPLETE trigger
        restored_key = f"{premise_token}:{incident_id}:RESTORATION_COMPLETE"
        if status == 'RESTORED':
            if restored_key not in self._sent_keys:
                notifications.append(NotificationItem(
                    type="RESTORATION_COMPLETE",
                    text=(
                        f"An authorized status update indicates service has been restored for your supply area as of {timestamp_utc}. "
                        "If your location is still without power, report it through the official AEP utility channel."
                    ),
                    delivery_mode="demo",
                    sent_at_utc=timestamp_utc
                ))
                self._sent_keys.add(restored_key)

        return notifications

def project_customer_view(snapshot: ScenarioSnapshot) -> Dict:
    """
    Strips internal operator details, lineworker dispatch internals,
    and raw engineering telemetry before returning to customer clients.
    Uses strict field allowlist for evidence items.
    """
    customer_safe_evidence = []
    for e in snapshot.evidence:
        if getattr(e, "visibility", None) == 'customer_safe':
            customer_safe_evidence.append({
                "id": getattr(e, "id", ""),
                "kind": getattr(e, "kind", ""),
                "value": getattr(e, "value", None),
                "unit": getattr(e, "unit", None),
                "label": getattr(e, "label", getattr(e, "kind", ""))
            })
    
    risk_dict = (
        snapshot.customer_risk.model_dump()
        if hasattr(snapshot.customer_risk, "model_dump")
        else snapshot.customer_risk.dict()
    )
    
    notifications_list = [
        (n.model_dump() if hasattr(n, "model_dump") else n.dict())
        for n in snapshot.notifications
    ]
    
    return {
        "scenario_id": snapshot.scenario_id,
        "incident_id": snapshot.incident_id,
        "selected_premise_token": snapshot.selected_premise_token,
        "timestamp_utc": snapshot.timestamp_utc,
        "status": snapshot.status,
        "impact_source": snapshot.impact_source,
        "customer_risk": risk_dict,
        "restoration_planning": {
            "kind": snapshot.restoration.kind,
            "lower_hours": snapshot.restoration.lower_hours,
            "expected_hours": snapshot.restoration.expected_hours,
            "upper_hours": snapshot.restoration.upper_hours,
            "assumptions": snapshot.restoration.assumptions,
            "last_updated_utc": snapshot.restoration.last_updated_utc
        },
        "notifications": notifications_list,
        "public_evidence": customer_safe_evidence,
        "disclosure": snapshot.disclosure
    }
