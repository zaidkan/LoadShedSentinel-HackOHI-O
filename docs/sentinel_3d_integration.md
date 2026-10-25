# 3D rendering

The application generates its pole, transformer, protective cutout, sensing node, solar module, materials, and textures in code. Geometry is illustrative, not surveyed equipment or a verified hardware installation.

## Entry points

| Entry | Responsibility |
| --- | --- |
| `web/src/sentinel/SentinelStage.tsx` | Landing presentation and model registry |
| `web/src/three/SentinelHero.tsx` | Hero wrapper around the shared inspection assembly |
| `web/src/three/AssetViewport.tsx` | Snapshot-bound operator inspection |
| `web/src/three/sentinel/SentinelScene.tsx` | Lazy-loaded scene, controls, camera, and fallback boundary |
| `web/src/three/PoleDiagram.tsx` | SVG equipment fallback |

Both rendering paths are used. Keep their imports, catalogs, and geometry resources separate unless all callers are migrated deliberately. Preview the equipment at `/#/sentinel`.

## State binding

Inspection receives the canonical cutout state and optional modeled solar/link fields. OPEN uses -2.05 radians (about 117.5 degrees); CLOSED uses zero; UNKNOWN does not assert a fuse position. These displays do not establish transformer energization or operate switchgear.

Hero presentation is illustrative and must not be treated as incident telemetry. Inspection facts should repeat supplied snapshot values and identify missing values rather than inventing readings.

## Rendering and accessibility

Scenes pause when the page or subject is not visible. Lazy loading keeps the scene out of initial route work; graphics failures fall back to the equipment diagram. Low-detail mode reduces geometry and rendering costs. Reduced motion disables or shortens nonessential movement.

Camera shots, hotspots, and part transforms should remain consistent with the shared layout/part definitions. Dispose of generated resources when replacing a scene. Preserve keyboard-operable controls, visible focus, and a readable non-3D path.

Node regression checks cover visibility handling, deferred route loading, and fallback behavior. Real-device graphics, touch, mobile layout, and visual appearance still require browser acceptance testing.
