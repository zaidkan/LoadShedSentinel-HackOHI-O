import pytest
from engine.customer import (
    calculate_battery_runtime,
    generate_preparedness_guidance,
    HouseholdNeeds,
    NotificationFSM,
    project_customer_view
)
from api.schemas import ScenarioSnapshot, CustomerRisk, CrewPackage, Restoration, SolarNode, NotificationItem

def test_battery_runtime_calculation():
    # 1000Wh battery, 85% usable (850Wh), 100W device, 85% inverter eff -> 117.65W effective -> ~7.22h raw, ~6.14h conservative
    res = calculate_battery_runtime(1000, 0.85, 100, 0.85, 0.15)
    assert res["usable_wh"] == 850.0
    assert res["effective_load_w"] == 117.6
    assert res["theoretical_hours"] == 7.22
    assert res["conservative_hours"] == 6.14

def test_preparedness_guidance():
    needs = HouseholdNeeds(
        life_critical_medical_device=True,
        refrigerated_medication=True,
        sump_pump=True
    )
    guidance = generate_preparedness_guidance(needs)
    categories = [g["category"] for g in guidance]
    assert "CRITICAL_MEDICAL" in categories
    assert "MEDICATION" in categories
    assert "WATER_DAMAGE" in categories

def test_notification_fsm_deduplication():
    fsm = NotificationFSM()
    risk = CustomerRisk(band="HIGH", drivers=["Storm front"], confidence_kind="scenario")
    
    # First trigger generates PRE_STORM
    n1 = fsm.evaluate_triggers("P-001", "INC-1", "AT_RISK", risk, "", "2026-10-24T18:00:00Z")
    assert len(n1) == 1
    assert n1[0].type == "PRE_STORM"
    
    # Second call with same state suppresses duplicate
    n2 = fsm.evaluate_triggers("P-001", "INC-1", "AT_RISK", risk, "", "2026-10-24T18:05:00Z")
    assert len(n2) == 0
    
    # Transition to OUTAGE generates OUTAGE_CONFIRMED
    n3 = fsm.evaluate_triggers("P-001", "INC-1", "OUTAGE", risk, "Assessing line damage", "2026-10-24T18:10:00Z")
    types = [n.type for n in n3]
    assert "OUTAGE_CONFIRMED" in types
    assert "ESTIMATE_UPDATED" in types

def test_project_customer_view_privacy():
    snapshot = ScenarioSnapshot(
        scenario_id="demo",
        incident_id="INC-1",
        revision=1,
        current_asset_id="T-100",
        selected_premise_token="P-001",
        timestamp_utc="2026-10-24T18:00:00Z",
        cutout_status="OPEN",
        status="OUTAGE",
        evidence=[],
        hypotheses=[],
        crew_recommendation=CrewPackage(
            capabilities=["Lineworker"],
            material_categories=["Switch"],
            candidate_damage_class="blown_cutout",
            basis="diagnostic_hypothesis",
            approved=False,
            reason="Internal operator reasoning"
        ),
        restoration=Restoration(
            kind="scenario_planning",
            lower_hours=1.0,
            expected_hours=2.0,
            upper_hours=4.0,
            labor_work_hours=3.0,
            labor_work_unit="hours",
            assumptions=["1 crew"],
            last_updated_utc="2026-10-24T18:00:00Z"
        ),
        solar=SolarNode(
            battery_soc_pct=90.0,
            nominal_wh=41.0,
            solar_w=25.0,
            modeled_runtime_days=4.0,
            buffered_events=0,
            connectivity="ONLINE"
        ),
        affected_premise_tokens=["P-001", "P-002"],
        customer_risk=CustomerRisk(band="HIGH", drivers=["Storm"], confidence_kind="test"),
        notifications=[],
        disclosure="Demo"
    )
    
    view = project_customer_view(snapshot)
    # Confirm operator internal fields stripped
    assert "crew_recommendation" not in view
    assert "solar" not in view
    assert "hypotheses" not in view
    assert view["selected_premise_token"] == "P-001"
    assert view["status"] == "OUTAGE"

def test_battery_runtime_edge_cases_and_clamping():
    # Zero or negative inputs fail-safe to 0.0
    assert calculate_battery_runtime(0, 0.85, 100)["theoretical_hours"] == 0.0
    assert calculate_battery_runtime(1000, 0.85, 0)["theoretical_hours"] == 0.0
    assert calculate_battery_runtime(-500, 0.85, 100)["theoretical_hours"] == 0.0
    assert calculate_battery_runtime(1000, 0.85, -50)["theoretical_hours"] == 0.0
    
    # Zero or negative usable fraction returns 0.0 Wh (physically correct; no invented energy)
    assert calculate_battery_runtime(1000, 0.0, 100)["usable_wh"] == 0.0
    assert calculate_battery_runtime(1000, -0.5, 100)["usable_wh"] == 0.0
    assert calculate_battery_runtime(1000, 0.0, 100)["theoretical_hours"] == 0.0
    
    # Zero or negative efficiency returns safe zeros
    assert calculate_battery_runtime(1000, 0.85, 100, inverter_efficiency=0.0)["effective_load_w"] == 0.0
    
    # Usable fraction upper clamped to 1.0
    res_over_usable = calculate_battery_runtime(1000, 1.5, 100)
    assert res_over_usable["usable_wh"] == 1000.0  # 1000 * 1.0

def test_notification_fsm_all_lifecycle_triggers():
    fsm = NotificationFSM()
    risk = CustomerRisk(band="MODERATE", drivers=["Wind"], confidence_kind="scenario")
    
    # 1. PRE_STORM
    n_pre = fsm.evaluate_triggers("P-001", "INC-1", "NORMAL", risk, "", "2026-10-24T18:00:00Z")
    assert len(n_pre) == 1
    assert n_pre[0].type == "PRE_STORM"
    
    # 2. OUTAGE_CONFIRMED
    n_out = fsm.evaluate_triggers("P-001", "INC-1", "OUTAGE", risk, "", "2026-10-24T18:05:00Z")
    assert len(n_out) == 1
    assert n_out[0].type == "OUTAGE_CONFIRMED"
    
    # 3. ESTIMATE_UPDATED
    n_est = fsm.evaluate_triggers("P-001", "INC-1", "OUTAGE", risk, "Crews arriving", "2026-10-24T18:15:00Z")
    assert len(n_est) == 1
    assert n_est[0].type == "ESTIMATE_UPDATED"
    
    # 4. RESTORATION_COMPLETE
    n_restored = fsm.evaluate_triggers("P-001", "INC-1", "RESTORED", risk, "Power restored", "2026-10-24T18:30:00Z")
    assert len(n_restored) == 1
    assert n_restored[0].type == "RESTORATION_COMPLETE"

