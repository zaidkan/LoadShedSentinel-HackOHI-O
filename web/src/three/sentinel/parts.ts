import { CROSSARM, CUTOUT, SENTINEL, SENTINEL_POSITION, SOLAR, TRANSFORMER_POSITION, crossarmZ, cutoutLocalToWorld, solarLocalToWorld, tankPoint, type Vec3 } from './layout';
import type { SentinelPartId } from './catalog';

export { SENTINEL_PARTS, SENTINEL_PART_IDS, FOCUS_ORDER, focusLabel, type SentinelFocus, type SentinelPartId } from './catalog';

/**
 * A framed camera position. `radius` is the world-space radius that must fit the view;
 * the director converts it to a distance for the current field of view and aspect ratio.
 */
export interface CameraShot { target: Vec3; azimuth: number; polar: number; radius: number }

export interface PartStaging {
  anchor: Vec3;
  /** Outward direction used to hide a hotspot when its anchor faces away from the camera. */
  facing: Vec3;
  /** Which side of the anchor the hotspot label opens toward, away from the part's body. */
  label: 'left' | 'right';
  shot: CameraShot;
}

export const OVERVIEW_SHOT: Record<'hero' | 'inspection', CameraShot> = {
  hero: { target: [0.02, 7.3, 0.12], azimuth: 0.62, polar: 1.64, radius: 2.5 },
  inspection: { target: [0.02, 7.3, 0.1], azimuth: 0.58, polar: 1.5, radius: 2.3 },
};

const [tx, ty, tz] = TRANSFORMER_POSITION;
const [sx, sy, sz] = SENTINEL_POSITION;

export const PART_STAGING: Record<SentinelPartId, PartStaging> = {
  sentinel: {
    anchor: [sx + SENTINEL.width / 2 + 0.03, sy + 0.07, sz - 0.02], facing: [0.5, 0, 1], label: 'right',
    shot: { target: [sx + 0.02, sy - 0.01, sz], azimuth: 0.5, polar: 1.52, radius: 0.46 },
  },
  transformer: {
    anchor: tankPoint(1.5, 0.14, 0.03), facing: [1, 0, 0.25], label: 'right',
    shot: { target: [tx - 0.02, ty + 0.04, tz + 0.05], azimuth: 0.72, polar: 1.48, radius: 0.78 },
  },
  cutout: {
    anchor: cutoutLocalToWorld([-0.09, 0.1, 0.03]), facing: [-0.4, 0, 1], label: 'left',
    shot: { target: [CUTOUT.position[0] + 0.02, CUTOUT.position[1] - 0.1, CUTOUT.position[2] + 0.08], azimuth: 0.3, polar: 1.45, radius: 0.58 },
  },
  solar: {
    anchor: solarLocalToWorld([-SOLAR.width / 2 - 0.05, 0.03, 0.02]), facing: [-0.2, 0.6, 0.8], label: 'left',
    shot: { target: [SOLAR.position[0] + 0.05, SOLAR.position[1] - 0.06, SOLAR.position[2]], azimuth: 0.05, polar: 1.2, radius: 0.6 },
  },
  crossarm: {
    anchor: [CROSSARM.length / 2 + 0.07, CROSSARM.y + 0.01, crossarmZ()], facing: [0.3, 0.2, 1], label: 'right',
    shot: { target: [0.04, CROSSARM.y + 0.1, 0.1], azimuth: 0.72, polar: 1.42, radius: 1.45 },
  },
};
