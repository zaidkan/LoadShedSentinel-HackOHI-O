# Preventive monitoring and time-benefit demonstration

Implemented on `codex/preventive-evidence`, based on main `0652aaa`. This adds a
pre-fault workflow; it does not turn simulated sensor records into field results.

## What is connected

The default **Prevention & Evidence** view uses the actual anonymized transformer
catalog and dependency counts from the shipped 16-premise AEP sample. Five
modeled histories demonstrate a baseline-compatible operating change, developing
warming, persistent corroborated indications, storm readiness and unusable
telemetry. Assessment does not change the separate incident snapshot.

The rules compare temperature after an explicit ambient/load correction, an
initial reference and recent persistence; vibration and acoustic indications can
corroborate a condition change. Missing, stale, future, foreign-asset, unhealthy,
nonfinite or excessively large observations abstain. The reference is not a
certified healthy baseline. Condition outlook is not verified energized service,
and thresholds are unvalidated demonstration choices, not limits taken from a
standard or a trained failure predictor.

Utility review capabilities and a customer advisory are shown together. Outage
confirmation stays false, no crew is dispatched and no failure date is returned.
Weather is a declared wind scenario; custom readings do not inherit replay
weather. There is no live sensor or weather feed.

| API | Purpose |
|---|---|
| `GET /api/preventive/profiles` | Available modeled histories and provenance |
| `POST /api/preventive/assess` | Asset-bound trend/readiness assessment; optional timestamped caller observations |
| `POST /api/response/compare` | Editable baseline-versus-assisted counterfactual with source context |
| `GET /api/response/benchmark` | The reproducible cases, sensitivity grid and assumptions |

## What the response comparison establishes

Both arms retain the same repair job and access/upstream gate. Only explicit
information/coordination assumptions change. Each correct/wrong-package branch
is evaluated before its assumed probability is applied. Detection lead is not
credited as prevented outage time; the repair allowance is not applied twice.

| Declared scenario | Modeled net benefit |
|---|---:|
| UI default: 20% versus 10% repeat-dispatch chance, four-hour conditional queue wait, 15-minute assisted overhead | **0.15 hours / 9 minutes** |
| Same repeat-dispatch rates with the extra assisted overhead | **−0.25 hours / −15 minutes** |
| Common 12-hour blocker masks both readiness times | **0 hours** |
| Unusable current monitoring or explicitly unknown advisory evidence | **0 hours of automation credit** |
| Separate example: 20% versus 10%, eight-hour conditional delay, no extra overhead | **0.8 expected hours**, not eight hours per incident |

These are arithmetic consequences of editable assumptions, not measured savings
or calibrated error rates. The benchmark includes ten named cases and 96
sensitivity rows, including unfavorable outcomes. Returned bounds are assumption
envelopes, not confidence intervals.

The actual AEP damage extract lacks hourly dispatch, arrival, repeat-trip and
re-energization outcomes. It cannot prove an 8–10-hour Sentinel benefit. The
[evidence review](time_savings_evidence.md) records the exact data limitations,
qualified primary-source utility analogues and a prospective measurement plan.
The [feature sources](preventive_sources.md) explain the research basis without
claiming that those studies validate these sensors or thresholds. See also the
[benchmark specification](response_benchmark.md).

## Verification

- New model/API tests: **87 passed** across `test_preventive.py`,
  `test_response_comparison.py` and `test_preventive_api.py`.
- Full suite on Windows: **174 passed, 1 failed, 42 subtests passed**. The failure
  is the pre-existing POSIX `0600` assertion at `tests/test_topology.py:207`, which
  reports `0666` on Windows; it is unrelated to these models and is not a finding
  of actual ACL exposure.
- Actual TypeScript and Vite production build passed.
- Actual Chrome checks passed for all five histories, source changes, negative
  and zero benefits, invalid-input recovery, existing view navigation and a
  390-pixel mobile viewport without horizontal overflow. No console exceptions
  or warnings appeared in those tested flows.
- Independent review caught and corrected comparison input-contract mismatch,
  inherited replay weather on caller observations, and large-integer overflow.

Reproduce the new tests and benchmark from the repository root:

```sh
python -m pytest -q tests/test_preventive.py tests/test_response_comparison.py tests/test_preventive_api.py
python scripts/benchmark_response.py
```

The local preview for this implementation is [localhost:3001](http://localhost:3001).
The earlier preview at port 3000 is unchanged. The preview is not a public
deployment or a substitute for field validation.

## Verified visual evidence

- [Pre-fault inspection review, without outage confirmation](preventive-evidence/prevention-default.jpg)
- [Shared blocker produces zero net benefit](preventive-evidence/response-zero-metrics.jpg)

These screenshots demonstrate application behavior; they are not evidence of
measured hardware performance or real outage reductions.
