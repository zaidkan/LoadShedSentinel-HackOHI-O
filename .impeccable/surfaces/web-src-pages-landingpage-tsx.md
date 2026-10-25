---
version: 1
slug: "web-src-pages-landingpage-tsx"
primary_target: "web/src/pages/LandingPage.tsx"
related_targets: ["web/src/pages/UtilityPage.tsx","web/src/pages/CustomerPage.tsx"]
---

## Scope

Whole web app: opening page (`/`, Persuade), operator console (`/operator`, Operate), customer concierge (`/customer`, Operate with plain language). One design system across all three.

## Audience and job

Judges and first-time visitors learn what is supplied versus simulated, pick a scenario, and open a working view. Operators review evidence, dependencies, and a review-only plan. Customers check status, plan battery runtime, and get preparation steps.

## Direction contract

THESIS: An evidence-first grid platform presented with a design studio's composure: one dusk scene with the Sentinel pole at its centre, then the incident told as ruled ledgers and a one-line supply diagram. It refuses the category default of a dark neon map dashboard tiled with KPI cards.

OWN-WORLD: Dusk-violet sky field that settles into pale periwinkle paper, deep night ink, one ultraviolet accent for actions; amber, green and slate are reserved for cutout and incident state. Instrument Serif uppercase display with an italic lead word, Hanken Grotesk for reading, Geist Mono only for tokens, times and measurements. Pill buttons with a gradient stroke, hairline-ruled rows, a hook-arrow joining heading phrases.

STORY: The visitor meets the pole, reads what the data can and cannot claim, chooses one of the four incidents, then opens the operator console or the customer view on that same incident.

FIRST VIEWPORT: Full-height dusk sky with a distant pole line on the horizon. The Sentinel model stands large in the centre, follows the cursor, rotates on drag, and carries hotspots on cutout, transformer, sensor pod and solar panel with live state. Bottom left: italic "Where" over three uppercase serif lines. Bottom right: a short mono descriptor. Nav: wordmark left, Overview / Operator / Customer centre, motion toggle, "Open console" pill right; the live incident chip sits under the nav.

FORM: pinned by the user (emotion-agency.com adapted as a template), concept roll not run. seed: none (unavailable)

SIGNATURE: Hero pole with live hotspots; in the console, the supply path drawn as a one-line diagram from breaker to premises that lights the modeled dependency footprint. Motion grammar: masked line reveals on display headings, clipped row reveals on ledgers, scroll-linked pole turn in the hero, console transitions at or under 250 ms, everything visible without motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Final Sentinel hardware model (separate effort) replaces the temporary procedural model through `web/src/sentinel/registry.ts`.
