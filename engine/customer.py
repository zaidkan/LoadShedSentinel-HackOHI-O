"""Customer copy and consent rules. All delivery is an in-app simulation."""
from api.schemas import CustomerPlan, Preferences, Restoration

def build_customer_plan(preferences: Preferences, status: str, risk_band: str) -> CustomerPlan:
    needs = preferences.needs
    guidance = ['Charge communication devices, keep a flashlight available, and follow official utility updates.']
    if status == 'OUTAGE':
        guidance.append('Keep refrigerator and freezer doors closed. Follow current official food-safety guidance.')
    if status == 'UNDER_REVIEW':
        guidance.append('Status is uncertain. Check the official utility channel; do not assume service is restored.')
    if needs.medical_equipment:
        guidance.append('Follow your medical-device backup plan and contact your care team or equipment provider about power needs. For an immediate emergency, contact emergency services.')
    if needs.refrigerated_medication:
        guidance.append('Follow your medication manufacturer’s storage instructions and ask your pharmacist about temperature exposure.')
    if needs.sump_pump:
        guidance.append('Check your sump-pump backup according to the manufacturer’s instructions; avoid standing water near electrical equipment.')
    runtime = None
    if needs.backup_wh is not None and needs.device_watts is not None:
        runtime = round(needs.backup_wh * (1-needs.reserve_fraction) * needs.inverter_efficiency / needs.device_watts, 2)
        guidance.append('Battery runtime is theoretical, using your entered capacity, reserve and inverter efficiency. Startup surge and actual loads may shorten it; this does not certify medical-device coverage.')
    eligible = preferences.opted_in and (status != 'AT_RISK' or risk_band in {'MODERATE', 'HIGH'})
    return CustomerPlan(guidance=guidance, theoretical_runtime_hours=runtime, alert_eligible=eligible,
        alert_reason=('Eligible for in-app demo messages under the scenario rules.' if eligible else
                      'Opt in to demo alerts; pre-storm messages also require moderate or high scenario risk.'))

def interval_text(restoration: Restoration) -> str:
    if restoration.kind == 'unavailable':
        return 'A reliable restoration range is currently unavailable.'
    return f'The scenario planning range is {restoration.lower_hours:g}–{restoration.upper_hours:g} hours from this update; this is not a confirmed utility estimate.'

def message_text(kind: str, restoration: Restoration) -> str:
    return {
        'PRE_STORM': 'Demo advisory: the selected storm scenario has elevated outage risk. Charge devices and review your household backup plan.',
        'OUTAGE_CONFIRMED': 'Simulated outage confirmed for your selected home. ' + interval_text(restoration),
        'ESTIMATE_UPDATED': 'Your scenario restoration plan changed. ' + interval_text(restoration),
        'RESTORATION_COMPLETE': 'An explicit simulation event marks your home restored. If your actual home is without power, check the utility’s official channel.',
    }[kind]
