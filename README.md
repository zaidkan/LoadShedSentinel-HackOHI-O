# LoadShed Sentinel

Distribution outage analysis, restoration planning, and household preparation in one scenario-based application.

[![CI](https://github.com/zaidkan/Hackathon/actions/workflows/aep-impact.yml/badge.svg)](https://github.com/zaidkan/Hackathon/actions/workflows/aep-impact.yml)

[Getting started](docs/development.md) · [Architecture](docs/architecture.md) · [Data provenance](docs/source_ledger.md) · [Contributing](CONTRIBUTING.md)

## Overview

LoadShed Sentinel connects supplied electrical dependency paths with modeled equipment evidence, review-only repair planning, and a customer household dashboard. It was developed for the AEP challenge at HackOHI/O 2026.

The application uses a 16-premise, 12-equipment anonymized sample. It is a research prototype: scenario status, telemetry, repair authorization, and notification delivery are simulated.

| View | Purpose |
| --- | --- |
| Overview | Project context and interactive equipment model |
| Prevention | Equipment evidence and declared risk factors |
| Operator | Scenario selection, source dependencies, diagnosis, crew capabilities, and labor planning |
| Customer | Plain-language service status, household priorities, battery runtime, and notification previews |

## Run locally

Requirements: Python 3.11 or later and Node.js 22. Run the backend and frontend in separate terminals.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

```bash
cd web
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). API documentation is available at [localhost:8000/docs](http://localhost:8000/docs). The checked-in sample works without rebuilding the full graph.

## Verify

```bash
python -m pytest -q
```

```bash
cd web
npm test
npm run build
```

The frontend test command runs component, state, routing, and rendering-fallback regressions in Node.js. It does not replace a browser acceptance test. Full-source topology tests require the supplied archives; see [development](docs/development.md).

## Data and model scope

- Runtime dependency counts come from the selected source sample, not a live outage feed or the full utility territory.
- The offline pipeline accepts 117,549 supplied premise paths through 32,600 equipment nodes. Paths end at circuit breakers; physical substation connectivity remains unknown.
- The declared 25-kVA replacement uses workbook cells C21 and D21 with one 4.5 multiplier: **8.974 person-hours**. Staffing and access assumptions determine the planning range; it is not a utility restoration commitment.
- Facility associations use proximity within the sample. They do not establish an electrical service relationship.
- Customer notifications are previews. No text message, emergency call, utility work order, or field switching action is sent.

See the [data inventory](docs/data_inventory.md), [source ledger](docs/source_ledger.md), and [model reference](docs/models.md).

## Repository

```text
api/          HTTP endpoints and response schemas
contracts/    Shared TypeScript contracts
engine/       Diagnosis, dependencies, scheduling, energy, and customer logic
pipeline/     Source ingestion and offline processing
data/         Public sample and aggregate processing metadata
tests/        Backend regression tests
web/          React, TypeScript, Vite, and Three.js application
docs/         Architecture, development, data, and operating notes
```

[Operating notes](docs/operations.md) cover deployment boundaries. [Security](SECURITY.md), [contribution guidelines](CONTRIBUTING.md), and [source notices](NOTICE.md) describe reporting, review, and attribution.
