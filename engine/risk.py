"""Ordinal storm scenarios over validated topology and dated ARCOS spatial context.

No calibrated outage probabilities, household coordinates, or same-day evidence.
"""
from __future__ import annotations

from datetime import date
import json
import math
from pathlib import Path

from engine.topology import Topology


MODEL_VERSION = "source-ordinal-v2"
STORM_SCENARIOS = {"calm": 0.1, "moderate": 0.5, "severe": 0.9}


class RiskService:
    def __init__(self, topology: Topology, history: dict | None = None):
        self.topology = topology
        self.history = history or {"assets": {}}

    @classmethod
    def load(cls, directory: str | Path | None = None):
        root = Path(directory) if directory is not None else Path(__file__).resolve().parents[1] / "data/processed"
        history_path = root / "risk_context.json"
        history = json.loads(history_path.read_text()) if history_path.exists() else None
        return cls(Topology.load(root / "private/topology.json"), history)

    def get_risk(self, premise: str, storm: dict) -> dict:
        intensity = storm.get("intensity")
        if (isinstance(intensity, bool) or not isinstance(intensity, (int, float))
                or not math.isfinite(intensity) or not 0 <= intensity <= 1):
            raise ValueError("storm.intensity must be a finite number in [0, 1]")
        as_of = date.fromisoformat(storm["as_of"])
        result = {"band": "UNKNOWN", "score": None, "score_kind": "ordinal_scenario_index",
                  "source": ["aep_challenge", "scenario"], "as_of": as_of.isoformat(),
                  "drivers": [], "confidence_kind": "unavailable", "model_version": MODEL_VERSION,
                  "missing_inputs": ["Measured storm forecast", "Calibrated outage labels", "Live switching state"],
                  "assumptions": ["Storm intensity is a declared scenario, not a measured forecast.",
                                  "Index = 80 * intensity + min(20, 4 * strictly earlier nearby reports).",
                                  "LOW below 30; MODERATE below 65; HIGH otherwise. Weights and bands are demo assumptions.",
                                  "Spatial counts are not exposure-normalized rates or causal failure assignments.",
                                  "Spatial reference is a matched transformer; no household coordinates enter the calculation."]}
        path = self.topology.premise_to_substation(premise)
        if path["status"] != "KNOWN":
            result["missing_inputs"].append("Validated premise supply path")
            return result
        context = self.history.get("assets", {}).get(path["path"][0])
        historical_points = 0
        if context is None:
            result["missing_inputs"].append("Historical spatial coverage")
            result["confidence_kind"] = "insufficient_history"
        else:
            count = sum(record["count"] for record in context["reports_by_date"]
                        if date.fromisoformat(record["date"]) < as_of)
            historical_points = min(20, 4 * count)
            result["confidence_kind"] = "limited_source_coverage"
            result["drivers"].append({"factor": "earlier_nearby_damage_reports", "value": count,
                                      "radius_m": context["radius_m"], "reference": "matched_transformer_gis",
                                      "points": historical_points, "provenance": "aep_challenge"})
        score = round(80 * intensity + historical_points, 2)
        result["score"] = score
        result["band"] = "LOW" if score < 30 else "MODERATE" if score < 65 else "HIGH"
        result["drivers"].insert(0, {"factor": "storm_scenario_intensity", "value": intensity,
                                     "points": round(80 * intensity, 2), "provenance": "scenario"})
        return result

    def preview_risk(self, premise: str, storm_scenario: str, *, as_of: str) -> dict:
        """CustomerRisk-compatible projection; no equipment or other-household tokens."""
        date.fromisoformat(as_of)
        if storm_scenario not in {*STORM_SCENARIOS, "unknown"}:
            raise ValueError("Unknown storm scenario")
        if self.topology.premise_to_substation(premise)["status"] != "KNOWN":
            return {"band": "UNKNOWN", "confidence_kind": "unavailable",
                    "drivers": ["Location has no validated source path; no nearby-equipment fallback is applied."]}
        if storm_scenario == "unknown":
            return {"band": "UNKNOWN", "confidence_kind": "unavailable",
                    "drivers": ["Storm intensity is unavailable; no risk band can be calculated."]}
        result = self.get_risk(premise, {"intensity": STORM_SCENARIOS[storm_scenario], "as_of": as_of})
        drivers = ["Ordinal scenario index using supplied AEP context; not a calibrated outage probability.",
                   f"Assumed {storm_scenario} storm intensity: {STORM_SCENARIOS[storm_scenario]:g} on a 0 to 1 scale."]
        history = next((d for d in result["drivers"] if d["factor"] == "earlier_nearby_damage_reports"), None)
        if history is None:
            drivers.append("Historical spatial coverage is missing; this band uses the storm scenario alone.")
        else:
            drivers.append(f"{history['value']} earlier damage reports within {history['radius_m']:g} meters of the "
                           f"matched transformer, strictly before {as_of}; spatial context does not establish cause.")
        drivers.append("Source coverage is limited; live switching and calibrated forecast evidence are unavailable.")
        return {"band": result["band"], "confidence_kind": result["confidence_kind"], "drivers": drivers}
