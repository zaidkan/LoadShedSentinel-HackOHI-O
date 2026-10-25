"""Paired, assumption-driven outage-response counterfactuals; no measured benefit.

The repair job, staffing and non-information blockers are identical in both arms.
Only time to a qualified repair-ready package changes. Repeat-dispatch waiting
means extra coordination/availability delay, never travel/setup already in the
common 4.5-adjusted repair workload. Probabilities are user assumptions.
"""
from __future__ import annotations

from copy import deepcopy
import math

SCHEMA_VERSION = "response_comparison_v1"
_HOURS = ("diagnosis_hours", "coordination_hours", "analysis_overhead_hours", "extra_dispatch_wait_hours")
_ARM_KEYS = set(_HOURS) | {"wrong_crew_probability"}
_KEYS = {"shared_repair_hours", "shared_blocker_ready_hours", "baseline", "assisted",
         "evidence_status", "detection_lead_hours", "input_provenance"}


def _number(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(name + " must be a finite nonnegative number")
    try:
        result = float(value)
    except (ValueError, OverflowError) as exc:
        raise ValueError(name + " must be finite") from exc
    if not math.isfinite(result) or result < 0:
        raise ValueError(name + " must be a finite nonnegative number")
    return result


def _range(value, name):
    values = value if isinstance(value, (list, tuple)) else [value] * 3
    if len(values) != 3:
        raise ValueError(name + " needs [lower, central, upper]")
    result = [_number(v, name) for v in values]
    if result != sorted(result):
        raise ValueError(name + " requires lower <= central <= upper")
    return result


def _sum(values, name):
    try:
        result = math.fsum(values)
    except (OverflowError, ValueError) as exc:
        raise ValueError(name + " overflows a finite duration") from exc
    if not math.isfinite(result):
        raise ValueError(name + " overflows a finite duration")
    return result


def _arm(value, name):
    if not isinstance(value, dict) or set(value) - _ARM_KEYS:
        raise ValueError(name + " has unknown fields or is not an object")
    hours = {key: _range(value.get(key, 0), name + "." + key) for key in _HOURS}
    probability = _number(value.get("wrong_crew_probability", 0), name + ".wrong_crew_probability")
    if probability > 1:
        raise ValueError(name + ".wrong_crew_probability must be in [0, 1]")
    ready = [_sum([hours[key][i] for key in _HOURS[:3]], name + ".readiness") for i in range(3)]
    wrong_ready = [_sum([ready[i], hours["extra_dispatch_wait_hours"][i]], name + ".repeat_readiness") for i in range(3)]
    return dict(components=hours, probability=probability, correct=ready, wrong=wrong_ready)


def _mean_ready(arm, i):
    p = arm["probability"]
    return _sum([arm["correct"][i], p * (arm["wrong"][i] - arm["correct"][i])], "mean readiness")


def _start(arm, i, blocker):
    """Apply the bottleneck to each branch BEFORE averaging its duration."""
    p = arm["probability"]
    correct, wrong = max(arm["correct"][i], blocker), max(arm["wrong"][i], blocker)
    # Interpolation preserves an exact common gate when both branches coincide.
    return _sum([correct, p * (wrong - correct)], "qualified repair start")


def _triple(values):
    return dict(lower=values[0], expected=values[1], upper=values[2])


def _arm_result(arm, repair, blocker):
    outcomes = []
    for label, probability, key in (("correct_initial_package", 1 - arm["probability"], "correct"),
                                    ("repeat_dispatch_required", arm["probability"], "wrong")):
        outages = [_sum([max(arm[key][i], blocker[i]), repair[i]], "outage duration") for i in range(3)]
        outcomes.append(dict(outcome=label, assumed_probability=probability,
                             qualified_ready_hours=_triple(arm[key]), outage_hours=_triple(outages)))
    outages = [_sum([_start(arm, i, blocker[i]), repair[i]], "mean outage duration") for i in range(3)]
    return dict(qualified_ready_hours=_triple([_mean_ready(arm, i) for i in range(3)]),
                outage_hours=_triple(outages), outcomes=outcomes)


def _difference_bounds(baseline, assisted, blocker):
    # Each arm's mean is monotone in each readiness input. For extrema choose
    # baseline-low/assisted-high, then baseline-high/assisted-low. In the shared
    # blocker the difference is piecewise linear; endpoints and readiness knots
    # suffice. The common repair cancels and must not widen the savings bounds.
    extrema = []
    for bi, ai in ((0, 2), (2, 0)):
        knots = {blocker[0], blocker[2]}
        knots.update(v for v in (baseline["correct"][bi], baseline["wrong"][bi],
                                 assisted["correct"][ai], assisted["wrong"][ai])
                     if blocker[0] <= v <= blocker[2])
        differences = [_start(baseline, bi, gate) - _start(assisted, ai, gate) for gate in sorted(knots)]
        extrema.append(differences)
    return dict(lower=min(extrema[0]),
                expected=_start(baseline, 1, blocker[1]) - _start(assisted, 1, blocker[1]),
                upper=max(extrema[1]))


def compare_response(inputs: dict) -> dict:
    """Compare identical jobs under explicitly assumed information readiness.

    Required: shared_repair_hours (scalar or ordered [lower, central, upper]).
    Optional shared_blocker_ready_hours uses the same shape, measured from a
    common outage onset; combine concurrent access/upstream readiness with max,
    not addition. Each arm has diagnosis_hours, coordination_hours,
    analysis_overhead_hours, extra_dispatch_wait_hours (same range shape), and
    wrong_crew_probability (scalar [0,1]). All default to zero.

    evidence_status defaults to unknown; unknown/insufficient ignores the
    proposed assisted timing and falls back to baseline, giving zero credit.
    detection_lead_hours is reported separately and never reduces outage hours.
    No probabilities, thresholds, delays or empirical savings are inferred.
    """
    if not isinstance(inputs, dict) or set(inputs) - _KEYS:
        raise ValueError("Unknown comparison fields or inputs is not an object")
    if "shared_repair_hours" not in inputs:
        raise ValueError("Explicit shared_repair_hours is required; no measured default is available")
    repair = _range(inputs["shared_repair_hours"], "shared_repair_hours")
    blocker = _range(inputs.get("shared_blocker_ready_hours", 0), "shared_blocker_ready_hours")
    baseline = _arm(inputs.get("baseline", {}), "baseline")
    requested_assisted = _arm(inputs.get("assisted", {}), "assisted")
    evidence = inputs.get("evidence_status", "unknown")
    if evidence not in ("sufficient", "insufficient", "unknown"):
        raise ValueError("evidence_status must be sufficient, insufficient or unknown")
    lead = _number(inputs.get("detection_lead_hours", 0), "detection_lead_hours")
    provenance = inputs.get("input_provenance", "user_declared_scenario_assumptions")
    if not isinstance(provenance, str) or not provenance.strip() or len(provenance) > 500:
        raise ValueError("input_provenance must be a nonempty description up to 500 characters")
    applied = evidence == "sufficient"
    assisted = requested_assisted if applied else baseline
    # Calculate even unused proposed timings to reject overflow rather than
    # concealing invalid inputs behind an abstention branch.
    _arm_result(requested_assisted, repair, blocker)
    result = dict(
        kind="counterfactual_simulation", schema_version=SCHEMA_VERSION,
        status="modeled" if applied else "insufficient_evidence", advisory_applied=applied,
        baseline=_arm_result(baseline, repair, blocker),
        assisted=_arm_result(assisted, repair, blocker),
        savings_hours=_difference_bounds(baseline, assisted, blocker) if applied and baseline != assisted else dict(lower=0.0, expected=0.0, upper=0.0),
        shared_repair_hours=_triple(repair), shared_blocker_ready_hours=_triple(blocker),
        detection_lead_hours=lead, prevented_outage_hours=None,
        input_provenance=provenance, inputs=deepcopy(inputs),
        formula="outage = max(qualified_ready_hours, shared_blocker_ready_hours) + identical_repair_hours; enumerate correct/wrong-package branches before averaging",
        range_semantics="Assumption envelopes, not confidence intervals or calibrated quantiles; expected uses central times and user-assumed wrong-package probabilities.",
        assumptions=[
            "Identical incident scope, repair duration, staffing and shared upstream/access gate in both arms; only qualified-readiness waiting changes.",
            "Diagnosis, coordination and analysis overhead are declared sequential, non-overlapping waits from a common outage onset.",
            "Extra dispatch waiting is avoidable coordination/availability delay, not travel, setup or safety already in a 4.5-adjusted repair workload.",
            "Wrong-package probabilities are assumed scenario mixture weights, not diagnostic accuracy measured for Sentinel or AEP.",
            "Both arms share the same blocker/repair realization. Arm-specific interval extremes can vary independently; bounds are not a paired-observation confidence interval.",
            "Identical workflow inputs represent the same timing realization and produce exactly zero difference, including interval inputs.",
            "No joint cross-arm wrong-package correlation is needed for the difference of expected durations; no individual causal benefit distribution is inferred.",
            "Lead time is reported separately; earlier warning does not establish an inevitable failure or an averted outage.",
            "The supplied AEP ARCOS fields have calendar dates, blank crew/job links and no dispatch/arrival/re-energization timestamps; empirical hourly benefit cannot be computed.",
        ])
    if not applied:
        result["assumptions"].append("Sensor evidence is unknown/insufficient: assisted workflow falls back to baseline; no automation benefit is credited.")
    return result


def benchmark_response() -> dict:
    """Reproducible named cases and sensitivity grid; no fitted distributions."""
    default = dict(shared_repair_hours=2.25, shared_blocker_ready_hours=0,
                   evidence_status="sufficient", detection_lead_hours=0,
                   baseline=dict(diagnosis_hours=1, wrong_crew_probability=.20, extra_dispatch_wait_hours=8),
                   assisted=dict(diagnosis_hours=1, wrong_crew_probability=.10, extra_dispatch_wait_hours=8))
    definitions = []
    def case(identifier, label, inputs):
        definitions.append(dict(id=identifier, label=label, inputs=inputs, result=compare_response(inputs)))
    modest = dict(shared_repair_hours=3, shared_blocker_ready_hours=0, evidence_status="sufficient", detection_lead_hours=0,
                  baseline=dict(diagnosis_hours=.5, coordination_hours=.5, wrong_crew_probability=.20, extra_dispatch_wait_hours=4),
                  assisted=dict(diagnosis_hours=.5, coordination_hours=.5, analysis_overhead_hours=.25,
                                wrong_crew_probability=.10, extra_dispatch_wait_hours=4))
    case("modest_verification", "Modest assumed net benefit after explicit verification overhead", deepcopy(modest))
    case("assumed_repeat_dispatch", "Assumed 20% versus 10% repeat-dispatch rates; not measured", deepcopy(default))
    same = deepcopy(default); same["baseline"]["wrong_crew_probability"] = 0; same["assisted"] = deepcopy(same["baseline"])
    case("already_correct", "Already-correct baseline: no advantage", same)
    bottleneck = deepcopy(default); bottleneck["shared_blocker_ready_hours"] = 12
    case("shared_blocker", "Shared access/upstream gate dominates both workflows", bottleneck)
    worse = deepcopy(default); worse["baseline"]["wrong_crew_probability"] = .10; worse["assisted"]["wrong_crew_probability"] = .30
    case("assisted_mistake", "Assisted workflow is less reliable under declared assumptions", worse)
    unknown = deepcopy(default); unknown["evidence_status"] = "unknown"
    case("unknown_sensor", "Unknown sensor: abstain, fall back to baseline", unknown)
    overhead = deepcopy(default); overhead["assisted"]["analysis_overhead_hours"] = .25
    case("verification_overhead", "Quarter-hour extra verification reduces assumed benefit", overhead)
    blocker = deepcopy(default); blocker["shared_blocker_ready_hours"] = 5
    case("partially_masked_wait", "A shared gate absorbs part of the repeat-dispatch wait", blocker)
    lead = deepcopy(same); lead["detection_lead_hours"] = 24
    case("lead_is_separate", "A 24-hour warning is not 24 hours of outage avoidance", lead)
    worst = deepcopy(default); worst["baseline"]["wrong_crew_probability"] = 1; worst["assisted"]["wrong_crew_probability"] = 0
    case("declared_conditional_eight", "Declared conditional eight-hour penalty avoided in one assumed case; not average savings", worst)
    grid = []
    for penalty in (2.0, 8.0):
        for gate in (0.0, 5.0, 12.0):
            for baseline_p in (0.0, .10, .20, .30):
                for assisted_p in (0.0, .10, .20, .30):
                    inputs = deepcopy(default)
                    inputs["shared_blocker_ready_hours"] = gate
                    inputs["baseline"].update(wrong_crew_probability=baseline_p, extra_dispatch_wait_hours=penalty)
                    inputs["assisted"].update(wrong_crew_probability=assisted_p, extra_dispatch_wait_hours=penalty, analysis_overhead_hours=.25)
                    grid.append(dict(extra_dispatch_wait_hours=penalty, shared_blocker_ready_hours=gate,
                                     baseline_wrong_crew_probability=baseline_p, assisted_wrong_crew_probability=assisted_p,
                                     analysis_overhead_hours=.25, expected_saved_hours=compare_response(inputs)["savings_hours"]["expected"]))
    return dict(kind="counterfactual_simulation", schema_version="response_benchmark_v1",
                default_inputs=deepcopy(modest), cases=definitions, sensitivity_grid=grid,
                break_even=dict(formula="With no shared blocker: (p_baseline - p_assisted) * extra_wait > assisted_extra_overhead",
                                example_extra_wait_hours=8, example_assisted_overhead_hours=.25,
                                required_probability_difference=.03125,
                                limitation="Only this no-blocker/equal-correct-readiness special case; shared gates require branch enumeration."),
                empirical_validation=False, empirical_aep_hourly_savings_available=False,
                disclosure="All workflow times/probabilities are explicit scenario assumptions. These calculations do not prove an empirical 8–10-hour saving or any prevented outage.")
