# LRP-150 — delivery

The five owned changes are implemented and verified in `lrp150-stage/`. Integration into the target checkout has not been performed. No other repository files were edited, no Git commands ran, and no Grub path was accessed.

## Changes

- `web/src/app/incident.tsx`: one `mutationSeq = useRef(0)` counter advances synchronously for scenario, asset and reset actions. Only the current action may apply a response, error or busy-state finalizer. Superseded scenario promises return false. Delayed startup/retry reads cannot replace a later action's snapshot or report its stale connection error; scenario/asset catalogs may still load.
- `web/src/pages/UtilityPage.tsx`: exact requested subtitle acknowledging unknown upstream connectivity beyond the breaker.
- `.github/workflows/aep-impact.yml`: `python -m pip install -r requirements.txt`; no requirements changes.
- `docs/judge_evidence.md`: 137 tests / 72 subtests, 16-premise / 12-equipment source-derived topology, Dusk shell and current operator/customer architecture. Replaced obsolete browser selectors and fixed restoration/projection assertions. Browser acceptance remains explicitly pending.
- `docs/RELEASE_CLAIM_LEDGER.md`: modeled comparator scope, replacement workload versus avoided labor, no validated dollar-savings claim; current session, privacy, notification and test descriptions. Current unsupported comparator banner is explicitly flagged for its owning lane; the component is unchanged by Aj.

## Verification

- `PYTHONPATH=. .venv/bin/pytest tests/`: exit 0, 137 passed, one existing Starlette/httpx warning. Quiet equivalent `.venv/bin/pytest -o pythonpath=. -q tests/`: exit 0, 137 passed and 72 subtests passed. The plain requested launcher exited 2 on missing root-package imports; that initial log is retained separately. No backend/test file was changed.
- `cd web && npm run build`: exit 0, TypeScript and Vite production compilation pass.
- `cd web && npm test`: exit 0; six integration groups and 12 customer regression cases pass.
- `node ../lrp150-incident-races.mjs`: 38 passing deterministic cases over all nine ordered pairs of scenario/asset/reset actions, stale success/failure/finalizers, latest failure and delayed initialization. The same harness fails the original provider with `old !== latest`, reproducing F-04.
- Updated judge-document API block passes across all four scenarios; 38 local documentation links and 21 ledger rows validate. Workflow assertions confirm pinned direct requirements and unchanged CI test invocation. Demo-script verification passes.
- Final patch dry run against the target passes. Applying it in a private replay reproduces all five final manifest hashes. All other captured stage inputs are unchanged, including Hb's four protected paths.

## Integration

Use `lrp150-source.patch`, or copy only the five paths in `lrp150-manifest.json` after checking their `source_sha256` bases. Re-run backend and frontend checks after integrating all lanes. The stage contains unchanged verification inputs and copied dependencies; do not integrate the whole directory.

The target's five owned-file base hashes still match. Hb's `web/package-lock.json` changed in the target after this snapshot; that external change is excluded and must not be overwritten. No integration decision is needed to deliver the requested staged patch.

Checksums: `lrp150-SHA256SUMS`; detailed receipts: `lrp150-verification.json` and named logs beside it. The private `lrp150-incident-races.mjs` harness can be re-run from this agent directory; it bundles the real provider/API and uses deterministic hooks/deferred fetch, without a new dependency or browser.

No clean dependency installation, hosted CI, real browser, graphics, touch or deployment pass is claimed. The generation guard discards stale client results; it does not cancel or serialize server mutations.
