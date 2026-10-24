"""Transparent ordinal scenario index. This is not a fitted outage probability."""
from __future__ import annotations

from datetime import date
from math import isfinite

from engine.topology import Topology


MODEL_VERSION = "ordinal-scenario-v1"


class RiskService:
    def __init__(self, network: dict):
        self.network = network
        self.topology = Topology(network)

    def get_risk(self, premise: str, storm: dict) -> dict:
        intensity = storm.get("intensity")
        if isinstance(intensity, bool) or not isinstance(intensity, (int, float)) or not isfinite(intensity) or not 0 <= intensity <= 1:
            raise ValueError("storm.intensity must be a finite number in [0, 1]")
        as_of = date.fromisoformat(storm["as_of"])
        result = {"premise_token": premise, "band": "UNKNOWN", "score": None,
                  "score_kind": "ordinal_scenario_index", "source": ["aep_challenge", "scenario"],
                  "drivers": [], "assumptions": [
                      "Storm intensity is a user scenario, not a measured forecast.",
                      "Index = 80 * intensity + min(20, 4 * earlier nearby damage reports).",
                      "Bands: LOW below 30; MODERATE below 65; HIGH otherwise. Thresholds are demo assumptions.",
                      "Nearby damage counts have no comparable exposure denominator and are not failure rates."],
                  "missing_inputs": ["Measured storm forecast", "Calibrated outage labels"],
                  "model_version": MODEL_VERSION, "confidence_kind": "limited_source_coverage",
                  "evidence_refs": [], "as_of": as_of.isoformat()}
        path = self.topology.get_supply_path(premise)
        if path["status"] not in {"KNOWN", "PARTIAL"}:
            result["missing_inputs"].append("Validated premise supply path")
            return result
        history = self.network.get("risk_context", {}).get(premise)
        history_points = 0
        if history is None:
            result["missing_inputs"].append("Historical spatial coverage")
            result["confidence_kind"] = "insufficient_history"
        else:
            # Same-day and future reports cannot enter a pre-storm calculation.
            count = sum(r["count"] for r in history["reports_by_date"] if date.fromisoformat(r["date"]) < as_of)
            history_points = min(20, 4 * count)
            result["drivers"].append({"factor": "earlier_nearby_damage_reports", "value": count,
                                      "radius_m": history["radius_m"], "points": history_points,
                                      "provenance": "aep_challenge"})
            result["evidence_refs"].append("ARCOS_REPORT_DATE_SPATIAL_AGGREGATE")
        score = round(80 * intensity + history_points, 2)
        result["score"] = score
        result["band"] = "LOW" if score < 30 else "MODERATE" if score < 65 else "HIGH"
        result["drivers"].insert(0, {"factor": "storm_scenario_intensity", "value": intensity,
                                     "points": round(80 * intensity, 2), "provenance": "scenario"})
        result["evidence_refs"].extend(path["evidence_refs"])
        result["missing_inputs"].append("Live switching state and full physical conductor path")
        return result


def get_risk(network: dict, premise: str, storm: dict) -> dict:
    return RiskService(network).get_risk(premise, storm)
