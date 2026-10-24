# Person 4 integration handoff

## Working now

The canonical Pydantic contract, generated TypeScript/JSON Schema, six labeled synthetic scenarios, revisioned API, shared browser client/store, customer-safe projection, declared-needs guidance, theoretical battery runtime and four consent-controlled in-app alerts are implemented. The temporary integration console exercises the API; it is not the final utility/customer design or 3D scene.

No source GIS import, diagnostic model, AEP labor calculation or crew scheduling is claimed by this scaffold. Those remain with Persons 1 and 2. No emails, SMS, worker dispatch or external writes occur.

## Start

Requires Python 3.10+ and a Node version supported by the locked Vite release; verified locally on Python 3.14 / Node 25.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm --prefix web ci
./scripts/dev-api.sh
# Second terminal, repository root:
npm --prefix web run dev
```

Open http://127.0.0.1:5173. API docs: http://127.0.0.1:8000/docs.

Use one API process/worker: state and idempotency history live in memory and disappear on restart. Binding is localhost. Operator routes have no authentication; this is a local demo, not a deployment configuration. There is no real messaging or actual utility connection. All fixture IDs are invented.

If npm cannot access the shared package cache, use `npm --prefix web ci --cache /private/tmp/loadshed-npm-cache`.

## First shared contract

- Authoritative models: `api/schemas.py` (`integration_v1`). `Model` rejects unknown fields and non-finite numeric inputs.
- Generate after a schema edit: `.venv/bin/python scripts/export_contract.py`.
- Generated outputs: `contracts/types.ts`, `contracts/schema.json`, `contracts/sample_snapshot.json`, `contracts/sample_customer_snapshot.json`.
- Verify synchronization: `.venv/bin/python scripts/export_contract.py --check`.
- Sample fixtures enumerate all three households, so totals match IDs.
- Source/provenance types deliberately reflect fixture mode. Real-data adapter work must add verified provenance/coverage fields through the integrator, not squeeze real AEP data into a synthetic source label.

## Routes ready for frontend owners

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Runtime/schema and adapter status |
| GET | `/api/metadata` | Disclosure and source/module status |
| GET | `/api/scenarios` | Six available scenarios |
| GET | `/api/premises?scenario_id=multi_fault` | Demo premise selection |
| GET | `/api/network?scenario_id=multi_fault` | Explicit fixture paths; no geographic geometry yet |
| POST | `/api/risk` | Read-only illustrative storm-band preview; does not mutate incident state |
| GET | `/api/incidents/{incident_id}/snapshot` | Operator snapshot; stable scenario ID also accepted as alias |
| POST | `/api/scenarios/{scenario_id}/actions` | Typed state transition |
| POST | `/api/scenarios/{scenario_id}/advance` | Convenience wrapper for next explicit fixture event |
| POST | `/api/scenarios/{scenario_id}/reset` | New run, monotonic revision, retained preferences |
| GET | `/api/customer/{scenario_id}/{premise_token}/snapshot` | Server-filtered customer response |
| POST | `/api/customer/{scenario_id}/{premise_token}/preferences` | Declared needs and demo consent |
| GET | `/api/customer/notifications?scenario_id=multi_fault&premise_token=P-DEMO-001` | That household's demo history |

Actions use `action_id`, `expected_revision`, `action` and, where required, `target_id`. Supported actions: `advance`, `start_repair`, `complete_repair`, `select_premise`, `set_preferences`. Preferences also require a `preferences` object. Starting/finishing a repair targets a task ID, not a fault ID. See `/docs` for exact validated payloads.

Exact retries with the same action ID/body return the original response. Reusing an ID for a different body or sending a stale revision returns 409. After a 409, refresh and ask the user to retry with a new intent/ID. Failed transitions leave state unchanged. Reset creates a new run and fresh demo notification history; preferences remain. Old incident IDs expire after reset. Reset IDs also deduplicate.

The server action cache is retained for the process lifetime, including reset retries. No timer, GET request or elapsed estimate restores service. An explicit simulated repair-complete event clears a blocker; all blockers must clear for the household to restore.

## Frontend ownership handoff

`web/src/app.tsx`, `services/api.ts` and `state/incidentStore.ts` remain Person 4-owned. The temporary UI lives only in `web/src/integration/` with scoped CSS. Persons 3/5 should add their pages without rewriting this store or changing canonical types. Person 4 will mount the finished pages.

The store exposes `subscribe`, `getSnapshot`, `load`, `act`, `reset`, `setPreferences`. Use `useSyncExternalStore` for React. `snapshot` is operator-only; `customer` is fetched from the separate server projection. Both must match `run_id` and `revision` before publication. Customers must never receive the operator object with fields merely hidden in CSS.

Frontend package/lockfile bootstrap is complete. Person 3 may now own visual dependency additions; notify Person 4 of package changes. This bootstrap uses React, TypeScript and Vite; 3D/map packages are intentionally left to Person 3.

## Service handoffs for Persons 1 and 2

`api/services.py` defines `TeamServices`; inject into `create_app(services=...)` instead of reimplementing domain logic in routes.

- Person 1: supply a sanitized network read model and a `RiskRequest -> Risk` adapter. Agree on real-data premise/path/provenance extensions before replacing the fixture catalog. Current network fallback intentionally returns no geometry.
- Person 2: supply diagnosis, crew, restoration and energy functions with units/source references. The integrator wraps them in `enrich_snapshot(snapshot) -> Snapshot`. That adapter may change only evidence, hypotheses, crew, restoration, solar and risk; changing incident IDs, revisions or fixture orchestration state is rejected atomically.
- Risk drivers and restoration assumptions exposed to customers must be reviewed customer-safe text. The customer response never includes raw evidence, equipment IDs, other household tokens, crew details or full graph state.
- Real graph propagation/scheduling will replace the static fixture memberships and intervals through a reviewed contract extension. The fixture's ranges are not labor-based estimates. No real graph, damage-to-asset matching or labor scheduling was rebuilt in the integrator's scope.
- Assessment/restoration/energy standalone endpoints from the blueprint are not published yet; wire typed requests when the engine owner delivers its interfaces. No fake calculation endpoints are advertised as complete.

## Demonstrate the four alerts

1. Select `multi_fault` and opt in before advancing. The home receives a pre-storm advisory.
2. Advance once: two simulated faults activate. Three unique homes are affected, although the two footprints overlap. An outage message appears.
3. Start and complete `TASK-UPSTREAM`: home 2 restores; homes 1 and 3 remain blocked by the local fault. Home 1 receives an estimate update.
4. Start and complete `TASK-LOCAL`: remaining homes restore and receive the restored message once.
5. Reset and test local-first: completing the local task cannot restore homes still behind the upstream fault.

`confirmed_transformer_damage` includes an extra field-confirmation event before repair; `contradictory` stays under review and cannot restore automatically. `pre_storm` has no outage event.

## Checks and remaining work

Run `./scripts/check.sh` for backend tests, contract drift and frontend production build. The API test suite checks consent/isolation, union counts, both repair orders, unknown evidence, stale/concurrent actions, retry/reset semantics, customer allowlisting, theoretical runtime, invalid inputs and all scenario paths.

Remaining: integrate Person 1’s delivered data branch (`codex/human1-data`, `d7b12d4`), Person 2 sourced calculations/scheduling, Persons 3/5 final pages and 3D, integration against their delivered modules, browser accessibility/performance checks on those final views, and the recorded submission. A passing fixture test is not proof of imported AEP coverage or electrical switching feasibility.
