# Development

## Environment

Use Python 3.11 or later and Node.js 22. The continuous integration workflow uses Python 3.11 and Node.js 22. Python direct dependencies are pinned in `requirements.txt`; frontend dependency resolution is recorded in `web/package-lock.json`.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest -q
```

The root `pytest.ini` sets the test directory and repository import path. The plain `pytest` launcher and `python -m pytest` use the same configuration.

```bash
cd web
npm ci
npm test
npm run build
```

Use `npm ci` for reproducible installs. Update the lockfile deliberately when changing a dependency.

## Local servers

From the repository root:

```bash
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

In a separate terminal:

```bash
cd web
npm run dev
```

Vite serves port 3000 and proxies `/api` to port 8000. Routes include `/`, `/prevention`, `/operator`, `/customer`, and the equipment preview at `/#/sentinel`. Keep the API and browser session together when testing scenario changes.

## Source-data tests

The checked-in public sample is sufficient for the application. Complete-archive topology tests also need `Data1.zip`, `Data2.zip`, and `matched_upstream.zip` under `aep_challenge_hack26/data/raw/`. Set `AEP_DATA_DIR` to an alternate local archive directory if needed. Tests that require missing archives report a skip; a skipped test does not verify full-source coverage.

To rebuild optional processing outputs:

```bash
python -m pipeline.build_graph --output-dir data/processed
python -m pipeline.link_facilities
```

The full graph is written under `data/processed/private/`. Keep it outside public hosting and version control. Read the [inventory](data_inventory.md) before changing joins or exports.

## Test boundaries

Backend tests cover source validation, scenario generation, scheduling, privacy projection, authorization gates, and session behavior. The Node frontend runner covers components, deferred-response races, routes, source labels, and graphics fallback paths.

A browser check is still needed for layout, keyboard navigation, reduced motion, touch, graphics context loss, and a complete operator-to-customer journey. A successful production build establishes compilation, not visual acceptance or production readiness.
