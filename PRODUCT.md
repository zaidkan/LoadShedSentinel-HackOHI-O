# Product

<!-- impeccable:product-schema 1 -->

> Recorded without an interview round: no structured question tool was available in the session that wrote this file. Facts come from the repository (README, docs/, API payloads) and the redesign brief. Lines marked *(inferred)* are reasonable readings of that material, not confirmed answers.

## Platform

web

## Users

- **Utility operators and dispatch reviewers** working an outage incident: they read which equipment is implicated, how strong the evidence is, which premises depend on the asset, and what a reviewed work package and restoration range would look like. *(inferred: desktop at a desk, sometimes a laptop in the field.)*
- **Residential customers** during a storm or outage: they want to know whether their power is out, roughly when it might return, how long a home battery will last, and what to do first for medicine, medical devices, food and water. *(inferred: often on a phone, possibly stressed, low battery, poor signal.)*
- **HackOHI/O 2026 judges (AEP track)** evaluating innovation, honesty about data, breadth, and impact.

## Product Purpose

LoadShed Sentinel connects supplied AEP distribution context, a proposed pole-mounted sensor node, review-only repair planning, and a customer outage concierge, and shows where every claim comes from. Success is an operator who can trust what is source-derived versus simulated, and a customer who gets useful preparation and an honest restoration outlook.

## Positioning

It traces each premise along AEP-supplied upstream equipment paths (transformer, fuses, reclosers, circuit breaker) and keeps every unknown visible: substation connectivity stays UNKNOWN, crew approval stays false, planning ranges are never promises.

## Operating Context

- Four canonical demonstration scenarios served by the API: local transformer protection, upstream breaker interruption, transformer replacement, and contradictory telemetry (abstention).
- One FastAPI backend (`api/main.py`) shared by both interfaces; the scenario state is global, so selecting a scenario changes both views.
- Persistent source labels from the demo script: AEP challenge data, modeled sensor, scenario assumptions, estimated restoration.

## Capabilities and Constraints

- Scenario selection, AEP source-asset selection, reset; premise topology lookup; battery runtime calculator; preparedness guidance from declared household needs; notification history.
- Interactive 3D utility-pole model with cutout state, camera presets, low-detail mode, and a 2D diagram fallback. The current model is temporary; a separate effort will replace it, so the UI must accept a new model without another rewrite.
- Checked-in public sample: 16 premises and 12 equipment nodes. Public geometry is generalized to a 0.02° grid with no conductor links; some equipment has no geometry.
- Must never present simulated data as live, invent telemetry, customer impacts, or restoration commitments.

## Brand Commitments

- Name: LoadShed Sentinel. Context: HackOHI/O 2026, AEP track.
- Visual reference pinned by the user: emotion-agency.com, adapted as a template (typography, layout rhythm, immersive opening, smooth scrolling, reveals), slightly less cinematic, with the Sentinel pole replacing the reference's central 3D mark.

## Evidence on Hand

- `data/processed/graph_summary.json`: offline preprocessing of the full AEP source (117,642 customer rows, 26,959 transformers, 7,616 fuse banks, 331 reclosers, 900 switches, 117,549 matched premises, 97 rejected, 32,600 equipment nodes, 32,543 relational edges).
- `/api/aep/source`: sample scope (16 premises, 12 equipment) and its stated limitations.
- `docs/source_ledger.md`, `docs/judge_evidence.md`, `docs/demo_script.md`.
- Absent and not to be fabricated: live outage feeds, measured telemetry, real customer counts beyond the sample, testimonials, customer logos, deployment claims.

## Product Principles

1. Every number names its source and its scope.
2. Unknown is a valid answer; show it rather than filling it.
3. Review before action: nothing in the interface dispatches crews or switches equipment.
4. Customers get plain language and practical steps first, technical detail on request.

## Accessibility & Inclusion

WCAG 2.2 AA as the working bar *(inferred)*. Customers may be using a phone in a stressful situation, so large touch targets, readable contrast, reduced-motion support, and a 2D fallback when 3D graphics are unavailable are required.
