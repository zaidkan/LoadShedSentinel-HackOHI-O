# Sentinel 3D model — integration note

The Sentinel pole assembly is one procedural Three.js scene (`web/src/three/sentinel/`)
rendered in two presentation modes. Nothing is loaded from external URLs; geometry,
textures and lighting are generated in code. Preview both modes at `/#/sentinel` in the
dev server.

| Mode | Entry point | Used by |
| --- | --- | --- |
| `hero` | `SentinelHero` (`web/src/three/SentinelHero.tsx`) | Future immersive landing hero; `/#/sentinel` preview |
| `inspection` | `AssetViewport` (`web/src/three/AssetViewport.tsx`) | Utility console asset panel |

Both wrap `SentinelScene` (lazy-loaded, its own ~270 kB gzip chunk), so the model, camera
director, materials and part catalog are shared and never rebuilt per context.

## Dropping it into the Emotion-style hero

1. **Replace the central visual** with `<SentinelHero focus={focus} onFocusChange={setFocus} />`
   inside a full-viewport, `position: sticky` stage. The canvas is transparent, so the
   hero's own background, grain and gradients show through.
2. **Drive the story with `focus`.** Map scroll chapters (IntersectionObserver or a scroll
   timeline) to `'overview' | 'sentinel' | 'transformer' | 'cutout' | 'solar' | 'crossarm'`.
   Each change is a damped camera move to a pre-composed shot; copy for each chapter is in
   `SENTINEL_PARTS` (`catalog.ts`, no three.js import, safe for the main bundle).
3. **Compose around the typography with `subjectOffset`.** By default the subject sits
   right of centre on wide layouts and above bottom-anchored copy on narrow ones. Pass an
   explicit `{ x, y }` (normalised view space, +x right, +y up) if the final layout differs.
4. **Sequence the reveal with `onIntroComplete`.** The intro (exposure ramp plus a slow
   camera settle, about 1.9 s) fires this callback; start headline and nav animations
   from it rather than from a fixed delay. Set `intro={false}` when returning to the page.
5. **Leave scrolling to the page.** Hero mode never captures the wheel and only takes
   horizontal drags on touch (`touch-action: pan-y`). The idle sway and the recompose
   after 9 s of inactivity are part of the mode; don't add more ambient motion on top.
6. **Hotspots are optional.** `hotspots={false}` for a cleaner first frame; the chapter
   navigation already covers selection for keyboard and assistive tech (hotspots are
   `aria-hidden` duplicates).

## Inspection view

`AssetViewport` takes only snapshot data: `status` (reported cutout state), `assetId` and
the optional modeled `solar` node. Keep it that way when the dashboard is redesigned:

- The fuse door follows the reported state: latched (CLOSED), dropped (OPEN), or, for
  UNKNOWN, the hinge range with no door ("position not asserted"). Never pass a guessed state.
- The node light bar mirrors `solar.connectivity` (modeled); without it the bar stays a
  neutral product light and the inspect card reports node telemetry as "Not supplied".
- Inspect-card facts come from `partFacts()` and only restate snapshot fields, labelled
  "modeled" where the source is modeled.

## Constraints to keep

- **Presentation vs data.** Hero mode shows no incident state and must not receive
  `cutoutStatus` or `link`. Any status styling belongs to inspection mode only.
- **Fallbacks.** No WebGL or a lost context: the inspection view drops to the SVG
  `PoleDiagram`, and the hero shows a quiet message in the subject area. Reduced motion
  snaps every camera move and disables idle motion and the light-bar breathe.
- **Performance.** The scene stops rendering offscreen and renders on demand in
  inspection mode. The `detail="low"` path (no shadows or antialiasing, fewer segments,
  DPR 1) is the budget option. Keep one live canvas per page.
- **Single source of layout.** Every part, cable route, camera shot and hotspot derives
  from `layout.ts` and `parts.ts`. To add a component, add it to the catalog, give it a
  `PART_STAGING` entry and wrap it with `target()` in `SentinelAssembly.tsx`.

## Likely next steps

Continuous scroll-scrubbed camera paths (a `progress` prop interpolating between shots),
an ambient-occlusion pass if the hero's frame budget allows, and swapping procedural parts
for authored glTF once real enclosure CAD exists. The part ids and staging should stay the
same so neither presentation has to change.
