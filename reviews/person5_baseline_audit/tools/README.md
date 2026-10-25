# Reproducing the pinned baseline audit

The original writable audit root is `/Users/zaid/Larp-MAXXX/hive/agents/bob-mve9sl3t/lrp145-baseline-audit`. Its `snapshot/` contains the 146 tracked files listed in `receipts/baseline.json`, extracted from revision `1ee72a24eea12b140182cb8f7ddd9cf83d2509d6`.

These tools expect siblings `snapshot/`, `receipts/`, `screenshots/`, and `tools/`. The portable evidence bundle includes tools/receipts/screenshots, but does not duplicate the source repository, installed dependencies, or raw AEP data. Recreate snapshot files from that exact Git revision using the manifest keys; verify all SHA-256 values before running. Provide matching web dependencies under `snapshot/web/node_modules`, the original challenge input directory under `snapshot/aep_challenge_hack26`, and the original Python virtual environment (or equivalent pinned dependencies).

Run the supplemental engine/API probe from the audit root:

```
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=./snapshot /Users/zaid/Larp-MAXXX/hackathon/.venv/bin/python tools/backend_probe.py
```

Build the web snapshot with `npm run build` from snapshot/web. Then run from the audit root:

```
node tools/browser_audit.mjs
node tools/browser_supplemental.mjs
node tools/browser_planning.mjs
```

Browser tools accept `PLAYWRIGHT_MODULE` and `AUDIT_PYTHON` environment overrides. They use Chromium and a real FastAPI TestClient subprocess bridge, not an HTTP listener. Request interception serves the built snapshot. Each browser context gets an independent session key; fault cases deliberately delay or fail individual API responses. Software graphics and reduced motion make captures deterministic; physical touch and hardware GPU performance remain untested.

Nonzero browser exit status is expected at this baseline: assertions intentionally expose product defects. Read each case, not only the process status. The main and supplemental JSON receipts are separate. Initial versions of receipts preserve harness mistakes and are not authoritative for product findings.

The standard commands and their successful/constrained logs are documented in the report. Do not run this baseline matrix against an uncommitted moving working tree and label it the pinned baseline. The tools write only audit output and operate simulated API state; they do not dispatch crews or deliver real notifications.
