"""Mechanism, bottleneck and uncertainty checks for the paired counterfactual."""
from copy import deepcopy
import json
import math
import pytest

from engine.response_comparison import benchmark_response, compare_response


def example():
    return dict(shared_repair_hours=2.25, evidence_status="sufficient",
                baseline=dict(diagnosis_hours=1, wrong_crew_probability=.2, extra_dispatch_wait_hours=8),
                assisted=dict(diagnosis_hours=1, wrong_crew_probability=.1, extra_dispatch_wait_hours=8))


def test_hand_calculated_evidence_example_is_point_eight_not_eight():
    result = compare_response(example())
    assert result["baseline"]["outage_hours"]["expected"] == pytest.approx(4.85)
    assert result["assisted"]["outage_hours"]["expected"] == pytest.approx(4.05)
    assert result["savings_hours"]["expected"] == pytest.approx(.8)
    assert result["kind"] == "counterfactual_simulation"
    json.dumps(result, allow_nan=False)


def test_common_repair_cancels_even_when_its_uncertainty_is_large():
    values = []
    for repair in (0, 2.25, 20, [0, 10, 100]):
        inputs = example(); inputs["shared_repair_hours"] = repair
        values.append(compare_response(inputs)["savings_hours"])
    for result in values:
        assert result == pytest.approx(dict(lower=.8, expected=.8, upper=.8))


def test_shared_bottleneck_eliminates_benefit_instead_of_adding_delays():
    inputs = example(); inputs["shared_blocker_ready_hours"] = 12
    result = compare_response(inputs)
    assert result["baseline"]["outage_hours"]["expected"] == 14.25
    assert result["assisted"]["outage_hours"]["expected"] == 14.25
    assert result["savings_hours"] == dict(lower=0, expected=0, upper=0)


def test_bottleneck_is_applied_to_each_branch_before_expected_value():
    inputs = example(); inputs["shared_blocker_ready_hours"] = 5
    result = compare_response(inputs)
    # Correct package: gate=5; wrong package: ready=9. Neither arm's
    # expected readiness can be substituted for the two actual branches.
    assert result["baseline"]["outage_hours"]["expected"] == pytest.approx(8.05)
    assert result["assisted"]["outage_hours"]["expected"] == pytest.approx(7.65)
    assert result["savings_hours"]["expected"] == pytest.approx(.4)


def test_assisted_mistakes_can_make_response_slower():
    inputs = example(); inputs["assisted"]["wrong_crew_probability"] = .3
    assert compare_response(inputs)["savings_hours"]["expected"] == pytest.approx(-.8)


def test_identical_point_inputs_have_zero_difference_and_inputs_are_not_mutated():
    inputs = example(); inputs["assisted"] = deepcopy(inputs["baseline"])
    before = deepcopy(inputs)
    result = compare_response(inputs)
    assert result["savings_hours"] == dict(lower=0, expected=0, upper=0)
    assert inputs == before


def test_identical_interval_workflows_are_the_same_realization_not_fake_benefit():
    inputs = example()
    inputs["baseline"]["diagnosis_hours"] = [1, 2, 5]
    inputs["assisted"] = deepcopy(inputs["baseline"])
    assert compare_response(inputs)["savings_hours"] == dict(lower=0, expected=0, upper=0)


@pytest.mark.parametrize("evidence", [None, "unknown", "insufficient"])
def test_missing_or_insufficient_sensor_evidence_gets_no_automation_credit(evidence):
    inputs = example()
    if evidence is None: inputs.pop("evidence_status")
    else: inputs["evidence_status"] = evidence
    result = compare_response(inputs)
    assert not result["advisory_applied"]
    assert result["status"] == "insufficient_evidence"
    assert result["assisted"] == result["baseline"]
    assert result["savings_hours"] == dict(lower=0, expected=0, upper=0)


def test_detection_lead_never_becomes_outage_hours_avoided():
    inputs = example(); before = compare_response(inputs)
    inputs["detection_lead_hours"] = 24
    after = compare_response(inputs)
    assert after["savings_hours"] == before["savings_hours"]
    assert after["prevented_outage_hours"] is None


def test_modest_ui_assumptions_and_equal_rate_verification_cost():
    inputs = dict(shared_repair_hours=3, shared_blocker_ready_hours=0, evidence_status="sufficient",
                  baseline=dict(diagnosis_hours=.5, coordination_hours=.5, wrong_crew_probability=.2, extra_dispatch_wait_hours=4),
                  assisted=dict(diagnosis_hours=.5, coordination_hours=.5, analysis_overhead_hours=.25,
                                wrong_crew_probability=.1, extra_dispatch_wait_hours=4))
    result = compare_response(inputs)
    assert result["baseline"]["outage_hours"]["expected"] == pytest.approx(4.8)
    assert result["assisted"]["outage_hours"]["expected"] == pytest.approx(4.65)
    assert result["savings_hours"]["expected"] == pytest.approx(.15)
    inputs["assisted"]["wrong_crew_probability"] = .2
    assert compare_response(inputs)["savings_hours"]["expected"] == pytest.approx(-.25)


def test_required_job_duration_is_not_silently_invented():
    with pytest.raises(ValueError, match="shared_repair_hours"):
        compare_response({})


def test_interval_bounds_cover_independent_readiness_corners_and_shared_gate():
    inputs = dict(shared_repair_hours=[1, 2, 50], shared_blocker_ready_hours=[0, 4, 12], evidence_status="sufficient",
                  baseline=dict(diagnosis_hours=[1, 3, 4], extra_dispatch_wait_hours=[2, 4, 8], wrong_crew_probability=.2),
                  assisted=dict(diagnosis_hours=[.5, 2, 5], extra_dispatch_wait_hours=[1, 3, 6], wrong_crew_probability=.1))
    bounds = compare_response(inputs)["savings_hours"]
    assert bounds["lower"] <= bounds["expected"] <= bounds["upper"]
    # Exhaust small finite combinations independently, including interior gate
    # values. Every calculation must stay inside the reported envelope.
    for b in (1, 3, 4):
        for a in (.5, 2, 5):
            for gate in (0, 1, 3, 4, 5, 6, 8, 10, 12):
                for bw in (2, 4, 8):
                    for aw in (1, 3, 6):
                        point = dict(shared_repair_hours=2, shared_blocker_ready_hours=gate, evidence_status="sufficient",
                                     baseline=dict(diagnosis_hours=b, extra_dispatch_wait_hours=bw, wrong_crew_probability=.2),
                                     assisted=dict(diagnosis_hours=a, extra_dispatch_wait_hours=aw, wrong_crew_probability=.1))
                        value = compare_response(point)["savings_hours"]["expected"]
                        assert bounds["lower"] - 1e-12 <= value <= bounds["upper"] + 1e-12


@pytest.mark.parametrize("field,value", [("wrong_crew_probability", -.1), ("wrong_crew_probability", 1.1),
    ("wrong_crew_probability", True), ("diagnosis_hours", math.nan), ("diagnosis_hours", math.inf),
    ("diagnosis_hours", -1), ("coordination_hours", [2, 1, 3]), ("coordination_hours", [1, 2]),
    ("analysis_overhead_hours", "1"), ("travel_hours", 1)])
def test_invalid_arm_assumptions_are_rejected(field, value):
    inputs = example(); inputs["assisted"][field] = value
    with pytest.raises(ValueError): compare_response(inputs)


@pytest.mark.parametrize("changes", [{"shared_repair_hours": [2, 1, 3]}, {"shared_blocker_ready_hours": -1},
    {"detection_lead_hours": math.inf}, {"evidence_status": "trusted"}, {"shared_repair_hours": True},
    {"baseline": {"diagnosis_hours": 1e308, "coordination_hours": 1e308}},
    {"shared_repair_hours": 1e308, "shared_blocker_ready_hours": 1e308}, {"made_up_accuracy": .99}])
def test_invalid_shared_inputs_and_overflow_are_rejected(changes):
    inputs = example(); inputs.update(changes)
    with pytest.raises(ValueError): compare_response(inputs)


@pytest.mark.parametrize("path", [("shared_repair_hours",), ("shared_blocker_ready_hours",), ("detection_lead_hours",)] +
    [(arm, field) for arm in ("baseline", "assisted") for field in
     ("diagnosis_hours", "coordination_hours", "analysis_overhead_hours", "extra_dispatch_wait_hours", "wrong_crew_probability")])
def test_huge_json_integer_is_value_error_in_every_numeric_input(path):
    # This is a valid JSON integer whose conversion to float raises OverflowError.
    # The public boundary must normalize that into a validation error, not a 500.
    huge = json.loads("1" + "0" * 400)
    inputs = example()
    target = inputs if len(path) == 1 else inputs[path[0]]
    target[path[-1]] = huge
    with pytest.raises(ValueError, match="finite"):
        compare_response(inputs)


def test_huge_json_integer_inside_duration_range_is_value_error():
    inputs = example()
    inputs["shared_repair_hours"] = [0, 1, 10 ** 400]
    with pytest.raises(ValueError, match="finite"):
        compare_response(inputs)


def test_benchmark_is_deterministic_contains_negative_zero_and_declared_examples():
    first = benchmark_response()
    assert first == benchmark_response()
    cases = {case["id"]: case["result"]["savings_hours"]["expected"] for case in first["cases"]}
    assert cases["assumed_repeat_dispatch"] == pytest.approx(.8)
    assert cases["already_correct"] == 0
    assert cases["shared_blocker"] == 0
    assert cases["assisted_mistake"] < 0
    assert cases["unknown_sensor"] == 0
    assert cases["declared_conditional_eight"] == 8
    assert len(first["sensitivity_grid"]) == 96
    assert any(row["expected_saved_hours"] < 0 for row in first["sensitivity_grid"])
    assert not first["empirical_validation"]
    json.dumps(first, allow_nan=False)
