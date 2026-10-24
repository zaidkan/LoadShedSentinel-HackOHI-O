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
