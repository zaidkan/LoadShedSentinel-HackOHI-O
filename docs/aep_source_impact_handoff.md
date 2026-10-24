# AEP source-connected outage footprints — Person 5 integration handoff

**Scope:** Fix the specific false-footprint defect in the LoadShed Sentinel demo. This branch does **not** claim live AEP outages, utility dispatch, calibrated storm risk, or actual restoration labor hours. It must be reviewed and integrated after parallel team work.

## What was wrong

The original default `engine.scenarios.generate_scenario(...)` selected predefined `P-DEMO-001...` groups of **8 local / 32 feeder premises**. Those numbers did not come from the supplied AEP upstream paths. `GET /api/scenarios` independently repeated the same values. The old GeoJSON map described a different 5-premise source sample, so the selected simulated incident and plotted assets could be unrelated.

## What changed

1. Added `data/processed/network_bundle.json`: **sanitized, source-derived sample** from the existing team data branch `codex/human1-data`. It contains 16 anonymized accepted premise paths, 12 equipment tokens, 27 ordered relationships, source archive SHA-256 records, and explicit limitations. It contains no raw AEP premise IDs, household coordinates, addresses, or sensitive customer data.
2. Added `engine/aep_impact.py` to validate paths and build a reverse index **asset token -> accepted dependent premise tokens**. It rejects unknown assets and paths and never guesses a nearest connection or interprets graph edges as conductor geometry.
3. Default `generate_scenario` now resolves local transformer and upstream circuit breaker from the **same validated path**. A hypothetical transformer fault affects the transformer dependents; a hypothetical breaker fault affects the breaker dependents. Default selected sample currently produces **3** and **16** respectively, but those counts are calculated from the supplied records and **change if the input paths or selected transformer change**. The `UNDER_REVIEW` case still exposes no *confirmed* affected footprint.
4. `POST /api/scenario/select` accepts `asset_token` and `premise_token` to select a particular source-derived transformer/breaker and compatible premise. Invalid selections produce **400** instead of fallback fake results.
5. Added `GET /api/aep/assets` (anonymized selectable devices and in-sample dependency counts) and `GET /api/aep/source` (provenance/scope). `GET /api/scenarios` derives counts rather than declaring 8 and 32.
6. `GET /api/topology/geojson` now renders the **same** source bundle used for impact, with generalized equipment points only and missing geometry explicitly acknowledged. `GET /api/topology/lookup` serves matching source paths; it retains optional support for the existing private graph.
7. The React scenario bar allows selecting among source-derived transformers or the sample breaker. Both dashboards receive the selected incident's source scope/count. The customer view defaults to the actual selected anonymized premise rather than `PREM-000001`.
8. Extended the Python/TypeScript snapshot contract with `impact_source` metadata: source, chosen fault asset, asset kind, 16-premise scope, in-sample count, and source-wide **known dependency count** metadata (never presented as a verified full impact).
9. Added `tests/test_aep_impact.py`, updated legacy count assertions, and added GitHub Actions `.github/workflows/aep-impact.yml` to run source/API tests and `npm run build`.

## What this legitimately proves

**Demonstration:** Given *a simulated fault* at a real, anonymized piece of AEP-source equipment, the application calculates which accepted AEP customer dependency paths include that equipment. It shows why a transformer-scale interruption has fewer *modeled dependent premises in this sample* than a common upstream breaker interruption.

**Not proved:** An actual utility outage; measured or total affected households; actual switching/alternate feed state; observed fault cause; restoration prediction accuracy; physical power-flow/conductor paths; live transformer sensors. The current shipped sample has **16 premises, not 117,549**. The full accepted private graph remains an offline processing artifact and should not be exposed wholesale.

The existing `data/processed/graph_summary.json` records **117,549 accepted full-source paths** from the archived challenge input. That is **offline pipeline coverage**, not the runtime sample size or a single-incident impact count.

## Official source and provenance

Official organizer repository: https://github.com/hackohio/aep_challenge_hack26

- `data/raw/Data1.zip` SHA256: `08ac47b7dd7f43cde56509644d7292d0b6978dcd62300912b4ecf0a2c3c6eca3`
- `data/raw/Data2.zip` SHA256: `13bea1c84636989a6475f481d67f25b25a17fcac8b77f674a5157e3a1d105f00`
- `data/raw/matched_upstream.zip` SHA256: `13f8d9da49843c959059b4074417c47671105131cdc4bfe9daf7b534e5f522c3`

The local source-derived bundle is reused from the team's `codex/human1-data` branch (no new inference from proximity). Data-owner review should confirm the selected sample matches the latest upstream export. No raw source packages were added to this branch.

## API smoke test

```bash
python -m pip install fastapi pydantic uvicorn httpx pytest
python -m pytest -q tests/test_aep_impact.py tests/test_scenarios.py tests/test_api.py
python -m uvicorn api.main:app --reload

curl http://localhost:8000/api/aep/source
curl http://localhost:8000/api/aep/assets
curl http://localhost:8000/api/scenarios
curl -X POST http://localhost:8000/api/scenario/select \
  -H "Content-Type: application/json" \
  -d '{"scenario_id":"local_protection"}'
curl -X POST http://localhost:8000/api/scenario/select \
  -H "Content-Type: application/json" \
  -d '{"scenario_id":"upstream_feeder"}'
```

Expected at shipped source revision: local=**3**, upstream=**16**; statuses `OUTAGE` are **modeled scenarios**, not observed AEP events. `UNDER_REVIEW` = 0 **confirmed** premises, not proof that nobody is affected.

## Person 5: reconciliation checklist

- [ ] Check whether the other agents rewrote `engine/scenarios.py`, `api/main.py`, `App.tsx`, `CustomerPage.tsx`, or `FeederMap.tsx`. Merge behavior and interfaces deliberately, not by accepting blind text conflict resolutions.
- [ ] Compare the data team's current `network_bundle.json` against the one copied to this PR; preserve the newest **validated and anonymized** version, checksums, and metadata. If names and formats change, adapt the importer rather than corrupting counts.
- [ ] On a fresh checkout, verify the 3/16 scenario counts **follow accepted source paths**; select another transformer and see the count update. A missing/corrupt source must produce a controlled error, not 8/32 fallback.
- [ ] Confirm `/api/topology/geojson` and `/api/topology/lookup` describe the **same sample** as the selected incident. Do not quietly reuse old `data/processed/network.geojson` from the unrelated export.
- [ ] Verify backend CI and React build, then **manually** switch scenarios/equipment in a browser. Test utility -> customer -> utility navigation, review/abstention mode, and unknown asset selection.
- [ ] If using the **entire** 117,549 accepted premise graph, generate and validate it offline from the organizer archives via `pipeline/build_graph.py`; then design a permissioned, privacy-safe, scalable adapter. Do **not** ship `data/processed/private/topology.json` publicly. Do not claim the current sample branch already simulates all records.
- [ ] Keep remaining audit issues as independent tasks: labor workbook durations, notifications under uncertainty, status transitions/RESTORED authorization, browser synchronization, risk calibration, and true end-to-end tests. **This PR fixes footprint derivation only.**
- [ ] In the 3-minute video, say: **"We simulate a fault on equipment identified in the supplied AEP network paths. We calculate which anonymized customer paths depend on that equipment, rather than declaring arbitrary outage groups. This demo uses a validated 16-premise sample; the full private graph was processed separately."**

**Integration status:** proposed source-grounded demo adapter on a separate branch. Person 5 must review and merge before claiming the running main application includes the fix.
