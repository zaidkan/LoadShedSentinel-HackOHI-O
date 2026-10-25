---
name: awesome-design-md
description: "VoltAgent awesome-design-md catalog: 84 reference DESIGN.md files from real products (Stripe, Linear, Vercel, Cursor, etc.). Use when the user names a brand aesthetic, asks to 'build like X', adopt a reference design system, or explore Google Stitch–style DESIGN.md for UI generation. Not for backend work."
version: 1.0.0
license: MIT
---

# Awesome DESIGN.md (project catalog)

Upstream: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)

## Location

- **Catalog root:** `vendor/awesome-design-md/design-md/<slug>/`
- **Agent-readable file:** `vendor/awesome-design-md/design-md/<slug>/DESIGN.md`
- **Slug index:** `vendor/awesome-design-md/CATALOG.md`

## How to use

1. If the user names a product or vibe, pick the closest **slug** from `CATALOG.md` (e.g. `linear.app`, `stripe`, `cursor`, `supabase`).
2. Read **only that** `DESIGN.md`. Do not load the whole catalog or multiple brands in one task unless the user asks to compare.
3. When implementing UI, treat the chosen file as a **reference palette and rules**, not a license to copy trademarks, logos, or exact marketing copy.
4. If this repo already has a project-root `DESIGN.md` (e.g. from Impeccable `/impeccable document` or `/impeccable init`), **project `DESIGN.md` wins** unless the user explicitly wants to replace or merge from a catalog entry.

## Workflow with other design skills

| Step | Skill |
| --- | --- |
| Pick reference tokens & atmosphere | This catalog (`DESIGN.md` for one slug) |
| Shape, critique, polish, motion | Impeccable (`.cursor/skills/impeccable/`) |
| Apple-native / RN HIG | Apple Design |
| Anti-slop, states, checker | Oxfords |

## Adopting a catalog design for the project

When the user wants the catalog to become the **active** project design system:

1. Copy or merge the chosen `DESIGN.md` into the project root as `DESIGN.md` (back up any existing file first).
2. Run Impeccable `impeccable context` or `/impeccable init` so agents pick up the new context.
3. Run Oxfords checker on touched UI paths when doing a polish pass.

## Updating the catalog

Re-copy from upstream or bump the vendored tree from a fresh clone of `main` on [github.com/VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
