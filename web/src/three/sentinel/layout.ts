import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

/**
 * Shared assembly layout in metres, Y up, the pole at the origin and +Z facing the street.
 * Every part, cable route, camera shot and hotspot derives from these values so the
 * composition stays consistent between hero and inspection presentations.
 */
export type Vec3 = [number, number, number];

export const POLE = { height: 9.4, baseRadius: 0.17, topRadius: 0.122 } as const;
export const poleRadiusAt = (y: number) => POLE.baseRadius + (POLE.topRadius - POLE.baseRadius) * (y / POLE.height);

export const CROSSARM = { y: 8.9, length: 2.44, height: 0.092, depth: 0.115, pinX: 1.0 } as const;
export const crossarmZ = () => poleRadiusAt(CROSSARM.y) + CROSSARM.depth / 2;
/** Conductor seat height on a crossarm pin insulator, and on the pole-top pin. */
export const PIN_INSULATOR_HEIGHT = 0.15;
export const PIN_STANDOFF = 0.03;
export const CROSSARM_CONDUCTOR_Y = CROSSARM.y + CROSSARM.height / 2 + PIN_STANDOFF + PIN_INSULATOR_HEIGHT;
export const POLE_TOP_PIN: Vec3 = [0, POLE.height + 0.1, poleRadiusAt(POLE.height) + 0.03];

export const TRANSFORMER = { radius: 0.28, height: 0.84, standoff: 0.075, y: 7.05 } as const;
export const TRANSFORMER_POSITION: Vec3 = [poleRadiusAt(TRANSFORMER.y) + TRANSFORMER.standoff + TRANSFORMER.radius, TRANSFORMER.y, 0.02];
/** Local angle (from +Z toward +X) of features on the tank wall. */
export const TANK_SENSOR = { angle: 0.22, y: 0.1 } as const;
export const TANK_NAMEPLATE = { angle: 0.78, y: -0.14 } as const;
export const HV_BUSHING_LOCAL: Vec3 = [-0.05, 0.452, 0.06];
export const HV_BUSHING_TOP_LOCAL: Vec3 = [-0.05, 0.452 + 0.2, 0.06];

export const CUTOUT = { position: [-0.44, 8.2, 0.31] as Vec3, tilt: 0.3, length: 0.46, doorOffset: 0.085 } as const;

export const SENTINEL = { y: 5.5, width: 0.28, height: 0.4, depth: 0.13, standoff: 0.035 } as const;
export const SENTINEL_POSITION: Vec3 = [0, SENTINEL.y, poleRadiusAt(SENTINEL.y) + SENTINEL.standoff + SENTINEL.depth / 2];

export const SOLAR = { position: [-0.62, 6.34, 0.1] as Vec3, rotation: [-0.8, 0.34, 0] as Vec3, width: 0.62, height: 0.42, thickness: 0.032 } as const;
export const SOLAR_MOUNT_Y = 6.3;

const euler = new Euler();
const quaternion = new Quaternion();
const matrix = new Matrix4();
const unit = new Vector3(1, 1, 1);

/** Transforms a point from a part's local frame into world space. */
export function toWorld(position: Vec3, rotation: Vec3, local: Vec3, order: 'XYZ' | 'YXZ' = 'XYZ'): Vec3 {
  euler.set(rotation[0], rotation[1], rotation[2], order);
  quaternion.setFromEuler(euler);
  matrix.compose(new Vector3(...position), quaternion, unit);
  const point = new Vector3(...local).applyMatrix4(matrix);
  return [point.x, point.y, point.z];
}

/** A point on the pole surface at height y and angle (radians from +Z toward +X). */
export function onPole(y: number, angle: number, inset = 0): Vec3 {
  const r = poleRadiusAt(y) + inset;
  return [Math.sin(angle) * r, y, Math.cos(angle) * r];
}

export function tankPoint(angle: number, y: number, outset = 0): Vec3 {
  const [cx, cy, cz] = TRANSFORMER_POSITION;
  const r = TRANSFORMER.radius + outset;
  return [cx + Math.sin(angle) * r, cy + y, cz + Math.cos(angle) * r];
}

export const cutoutLocalToWorld = (local: Vec3) => toWorld(CUTOUT.position, [0, 0, CUTOUT.tilt], local);
export const solarLocalToWorld = (local: Vec3) => toWorld(SOLAR.position, SOLAR.rotation, local, 'YXZ');
export const sentinelLocalToWorld = (local: Vec3): Vec3 => [SENTINEL_POSITION[0] + local[0], SENTINEL_POSITION[1] + local[1], SENTINEL_POSITION[2] + local[2]];
