from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_scenario_endpoints():
    # 1. Reset
    res_reset = client.post("/api/scenario/reset")
    assert res_reset.status_code == 200
    
    # 2. Get Operator Current
    res_curr = client.get("/api/scenario/current")
    assert res_curr.status_code == 200
    data_curr = res_curr.json()
    assert data_curr["scenario_id"] == "local_protection"
    assert data_curr["current_asset_id"] == "T-DEMO-104"
    assert "crew_recommendation" in data_curr
    
    # 3. Get Customer Snapshot (Privacy Preserved)
    res_cust = client.get("/api/customer/snapshot")
    assert res_cust.status_code == 200
    data_cust = res_cust.json()
    assert "crew_recommendation" not in data_cust
    assert data_cust["selected_premise_token"] == "P-DEMO-001"

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
