import type { ComponentType } from 'react';
import type { CutoutStatus } from '../../../contracts/types';

/**
 * Contract between the UI and whichever Sentinel pole model is registered in `registry.ts`.
 *
 * A replacement model only has to:
 *  1. Render its geometry from `SentinelModelProps` (cutout state drives the fuse door; UNKNOWN must not
 *     assert a physical position).
 *  2. Tag each selectable group with `userData.sentinelPart = <SentinelPartId>` so hover and selection work.
 *  3. Provide part anchors and camera poses in model space (metres, Y up, pole base at the origin).
 * The hero, the operator inspector, hotspots, fallbacks and controls are all driven from this definition.
 */
export type SentinelPartId = 'pole' | 'crossarm' | 'transformer' | 'cutout' | 'sensor-pod' | 'solar-panel';

export type SentinelVariant = 'hero' | 'inspector';

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface SentinelModelProps {
  cutoutStatus: CutoutStatus;
  detail: 'full' | 'low';
  reducedMotion: boolean;
  activePart: SentinelPartId | null;
}

export interface SentinelPartSpec {
  label: string;
  /** Where hotspots attach, in model space. */
  anchor: Vec3;
  /** Inspector camera used when the operator focuses this part. */
  camera?: Omit<CameraPose, 'fov'>;
}

export interface SentinelModelDefinition {
  id: string;
  name: string;
  /** True while geometry is procedural or illustrative rather than an authored hardware asset. */
  illustrative: boolean;
  Component: ComponentType<SentinelModelProps>;
  cameras: Record<SentinelVariant, CameraPose>;
  parts: Partial<Record<SentinelPartId, SentinelPartSpec>>;
  orbit: { minDistance: number; maxDistance: number; minPolarAngle: number; maxPolarAngle: number };
}

export type CameraAction = 'reset' | 'left' | 'right' | 'in' | 'out' | 'focus';

export interface CameraCommand {
  action: CameraAction;
  part?: SentinelPartId;
  sequence: number;
}

export type HotspotTone = 'open' | 'closed' | 'unknown' | 'neutral';

export interface SentinelHotspot {
  part: SentinelPartId;
  label: string;
  value: string;
  tone: HotspotTone;
}
