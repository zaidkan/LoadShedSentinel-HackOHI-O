"""Declared prototype context screening, not a calibrated outage probability.

Each factor contributes 0, 1 or 2 points. Wind thresholds: 35/65 km/h;
ambient extremes: <=0 or >=35 C / <=-15 or >=40 C; transformer load:
0.85/1.10 of rating; health index (100 healthy): <=70/<=40.
Sum 0..2 LOW, 3..5 MODERATE, 6..8 HIGH. These are design assumptions,
not utility thresholds. Incident confirmation and preventive condition priority
are separate decisions; an existing outage does not force a HIGH forecast.
"""
import math


RISK_INPUTS = ("wind_kph", "ambient_temperature_c", "transformer_load_factor", "health_index")


def calculate_outage_risk(inputs, *, conflicting_evidence=False):
    """Return the existing CustomerRisk contract with auditable factor/score text.

    Health index uses 0=worst, 100=healthy. All four finite inputs are required;
    unsupported keys, booleans and out-of-range values abstain rather than being
    coerced or interpreted as benign weather/equipment conditions.
    """
    unknown = {"band": "UNKNOWN", "confidence_kind": "unavailable", "drivers": []}
    if conflicting_evidence:
        return {**unknown, "drivers": ["Conflicting scenario evidence; outage-risk screening withheld."]}
    if not isinstance(inputs, dict) or set(inputs) != set(RISK_INPUTS):
        return {**unknown, "drivers": ["All four declared inputs required: " + ", ".join(RISK_INPUTS)]}
    limits = ((0, 400), (-80, 65), (0, 3), (0, 100))
    for key, (lower, upper) in zip(RISK_INPUTS, limits):
        value = inputs[key]
        if (isinstance(value, bool) or not isinstance(value, (int, float)) or
                not math.isfinite(value) or not lower <= value <= upper):
            return {**unknown, "drivers": [f"Invalid {key}; expected finite value in [{lower}, {upper}]."]}
    wind, ambient, load, health = (inputs[key] for key in RISK_INPUTS)
    points = [int(wind >= 35) + int(wind >= 65),
              int(ambient <= 0 or ambient >= 35) + int(ambient <= -15 or ambient >= 40),
              int(load >= .85) + int(load >= 1.10),
              int(health <= 70) + int(health <= 40)]
    score = sum(points)
    return {"band": "HIGH" if score >= 6 else "MODERATE" if score >= 3 else "LOW",
            "confidence_kind": "declared_rule_not_calibrated",
            "drivers": [f"{key}={inputs[key]:g}: {point}/2 points" for key, point in zip(RISK_INPUTS, points)] +
                       [f"Score {score}/8; LOW 0-2, MODERATE 3-5, HIGH 6-8.",
                        "Declared scenario inputs and prototype thresholds; not a measured probability or utility forecast."]}
