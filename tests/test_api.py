from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_scenarios_listing():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 4
    ids = [s["id"] for s in scenarios]
    assert "local_protection" in ids
    assert "upstream_feeder" in ids
    assert "confirmed_replacement" in ids
    assert "insufficient_evidence" in ids

def test_scenario_select_and_switching():
    # Select upstream_feeder
    res = client.post("/api/scenario/select", json={"scenario_id": "upstream_feeder"})
    assert res.status_code == 200
    snap = res.json()
    assert snap["cutout_status"] == "CLOSED"
    assert len(snap["affected_premise_tokens"]) == 16
    assert snap["impact_source"]["provenance"] == "aep_challenge"
    assert snap["impact_source"]["fault_asset_kind"] == "CIRCUIT_BREAKER"
    assert not any("P-DEMO" in p for p in snap["affected_premise_tokens"])
    assert snap["status"] == "OUTAGE"

    # Select insufficient_evidence
    res_in = client.post("/api/scenario/select", json={"scenario_id": "insufficient_evidence"})
    assert res_in.status_code == 200
    snap_in = res_in.json()
    assert snap_in["cutout_status"] == "UNKNOWN"
    assert snap_in["status"] == "UNDER_REVIEW"

def test_topology_lookup_endpoint():
    premise = client.get("/api/scenario/current").json()["selected_premise_token"]
    response = client.get("/api/topology/lookup", params={"premise_id": premise})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "KNOWN"
    assert len(data["path"]) >= 1
    assert data["endpoint"] == "Circuit Breaker"

def test_battery_runtime_endpoint():
    payload = {
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 0.85,
        "reserve_margin_pct": 0.15
    }
    response = client.post("/api/customer/battery-runtime", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["usable_wh"] == 850.0
    assert data["theoretical_hours"] == 7.22

def test_preparedness_endpoint():
    payload = {
        "food_refrigeration": True,
        "refrigerated_medication": True,
        "life_critical_medical_device": True,
        "medical_device_notes": "Oxygen concentrator",
        "mobility_accessibility_needs": False,
        "communications_charging": True,
        "sump_pump": False,
        "backup_battery_available": True,
        "battery_capacity_wh": 500,
        "battery_usable_pct": 0.8,
        "essential_load_w": 60
    }
    response = client.post("/api/customer/preparedness", json=payload)
    assert response.status_code == 200
    guidance = response.json()["guidance"]
    assert len(guidance) >= 3
    cats = [g["category"] for g in guidance]
    assert "CRITICAL_MEDICAL" in cats


def test_openapi_and_advance_sensitivity():
    # F01: OpenAPI schema generation works without NameError/Union failure
    res_open = client.get("/openapi.json")
    assert res_open.status_code == 200
    schema = res_open.json()
    assert "/api/scenario/advance" in schema["paths"]

    # F01: POST /api/scenario/advance with sensitivity parameters succeeds
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    res_adv = client.post("/api/scenario/advance", json={"crew_size": 6, "access_hours": 2.0})
    assert res_adv.status_code == 200
    snap = res_adv.json()
    assert snap["planning_inputs"]["crew_size"] == 6
    assert snap["planning_inputs"]["access_hours"] == 2.0
    # Expected hours recalculation with 6 workers and 2h access: 3.495...
    assert round(snap["restoration"]["expected_hours"], 2) == 3.50


def test_advance_atomic_rollback():
    # F03: Rejected advance does not mutate state or increment revision
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    curr_before = client.get("/api/scenario/current").json()
    status_before = curr_before["status"]
    rev_before = curr_before["revision"]

    # Attempt advance with valid status but invalid cutout_status
    res_bad = client.post("/api/scenario/advance", json={
        "status": "RESTORED",
        "cutout_status": "INVALID_STATE"
    })
    assert res_bad.status_code == 400

    curr_after = client.get("/api/scenario/current").json()
    assert curr_after["status"] == status_before
    assert curr_after["revision"] == rev_before

    # Late failure atomicity: unordered access_hours rejected and does not poison context
    res_unordered = client.post("/api/scenario/advance", json={
        "status": "RESTORED",
        "access_hours": [3, 1, 2]
    })
    assert res_unordered.status_code == 400
    assert "ordered" in res_unordered.json()["detail"]
    # Subsequent valid advance succeeds
    res_valid = client.post("/api/scenario/advance", json={"crew_size": 6})
    assert res_valid.status_code == 200


def test_extra_fields_forbidden():
    # F07: Extra unsupported fields in requests return 422
    res = client.post("/api/scenario/select", json={
        "scenario_id": "confirmed_replacement",
        "damage_quantity": 3
    })
    assert res.status_code == 422

    res_adv = client.post("/api/scenario/advance", json={
        "crew_size": 4,
        "unexpected_field": "test"
    })
    assert res_adv.status_code == 422

    res_bat = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "extra_field": True
    })
    assert res_bat.status_code == 422


def test_battery_boundary_validation():
    # F08: Invalid inverter efficiency (< 0.5 or > 1.0) rejected with HTTP 400
    res_low = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 0.1
    })
    assert res_low.status_code == 400
    assert "inverter_efficiency" in res_low.json()["detail"]

    res_high = client.post("/api/customer/battery-runtime", json={
        "capacity_wh": 1000,
        "usable_fraction": 0.85,
        "device_w": 100,
        "inverter_efficiency": 1.5
    })
    assert res_high.status_code == 400


def test_customer_alert_plan_and_privacy():
    # F06 & F09: Alert plan eligibility and internal asset id redaction
    client.post("/api/scenario/reset")
    client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    res = client.get("/api/customer/snapshot")
    assert res.status_code == 200
    data = res.json()
    alert_plan = data["alert_plan"]
    assert alert_plan["eligible"] is True
    # F09: Raw asset ID not directly interpolated into customer basis
    assert "ASSET-" not in alert_plan["basis"]
    assert "T-DEMO" not in alert_plan["basis"]
    assert "escalation_policy" in alert_plan


def test_scenario_selection_notification_dedup():
    # F05: Single OUTAGE_CONFIRMED, no double alerts
    client.post("/api/scenario/reset")
    res = client.post("/api/scenario/select", json={"scenario_id": "confirmed_replacement"})
    assert res.status_code == 200
    snap = res.json()
    outage_alerts = [n for n in snap["notifications"] if n["type"] == "OUTAGE_CONFIRMED"]
    assert len(outage_alerts) == 1

