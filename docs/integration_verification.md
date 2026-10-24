# Integration verification — October 24, 2026

## Reproduce

Run `./scripts/check.sh` from the repository root after installing the locked dependencies. This checks backend behavior, generated contract drift and a TypeScript/Vite production build. It does not certify real grid or labor integration.

## Browser walkthrough performed

The localhost integration console loaded and both panels displayed the same revision. Opt-in generated PRE_STORM; advancing generated OUTAGE_CONFIRMED. Starting a repair did not create a duplicate alert. Completing upstream work restored home 2 while homes 1 and 3 remained out; home 1 received ESTIMATE_UPDATED. Completing the local task generated RESTORATION_COMPLETE. The operator and customer revisions remained synchronized throughout.

## Actual issue found and corrected

Browser review showed the cutout indicator remained open after restoration. The fixture-state mapping originally reused the initial event value. It now derives the local indicator from the selected transformer's remaining fixture fault. A regression test checks an unaffected selected transformer, local-first repair while an upstream blocker remains, and the fully repaired state.

Review also found that a household outside a local fault footprint was being labeled restored despite never losing service. A distinct NORMAL state now preserves that distinction; unaffected homes do not inflate restored counts or receive restoration alerts.

## Known limits

- Tests use synthetic scenario membership and illustrative ranges. Actual AEP data coverage and workbook calculations require their module adapters.
- State and idempotency cache are single-process/in-memory; restart begins new runs.
- The test client emits an upstream Starlette/httpx deprecation warning. The tested pinned versions pass; migrating that test transport is separate maintenance.
- Temporary visual inspector only; final 3D, customer layout and final-screen accessibility/performance remain with frontend owners.

## Next teammate integration available

The remote `codex/human1-data` branch at `d7b12d4` was discovered during the checkpoint. Its topology and ordinal risk interfaces were reviewed read-only. It has not been merged into this checkpoint; use a separate reviewed integration change to map its source-derived tokens/provenance into the canonical contract and run its tests alongside these tests. Do not mark fixture paths as AEP-derived in the interim.
