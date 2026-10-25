# Operating notes

## Current deployment boundary

The application is suitable for local demonstration and controlled evaluation. The API has permissive cross-origin configuration and process-local session storage. It does not provide production authentication, durable tenancy, or a multi-worker consistency design.

Use the [development setup](development.md) for local work. The checked-in source sample does not require building or serving the private full graph.

## Production build

```bash
cd web
npm ci
npm run build
```

`web/dist/` is the frontend output. Vite preview is a local inspection server, not the production hosting design. Production hosting must route `/api` to the backend and provide an index fallback for application routes. Only designated public assets and the built frontend should be hosted; do not expose the repository or processed-data directories.

## Before external deployment

Resolve authentication and authorization, restrict allowed origins, apply transport security, set request/resource limits, and define persistent session storage and concurrency behavior. Establish monitoring, incident handling, backup/retention, dependency review, and an appropriate process model. These controls are requirements for a deployment decision, not completed features in this repository.

Recheck data-distribution rights and public export boundaries. Keep raw source identifiers, private graph files, local archives containing sensitive attributes, meeting links, and internal evidence out of public hosting. Customer household settings use browser storage when available; assess retention and consent before collecting actual user information.

## Release verification

Run backend tests, frontend regressions, and the production build. Also exercise all four scenarios, alternative assets, operator-to-customer navigation, stale responses, failed requests, abstention, keyboard access, reduced motion, and graphics fallback in a browser.

Record the source revision and actual results for a release. Do not infer a deployed, browser-tested, or field-validated system from a green build alone. Changes to public copy must preserve the [source ledger](source_ledger.md) and model limits.
