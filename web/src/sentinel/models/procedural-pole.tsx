import { MathUtils, Vector3 } from 'three';
import { PART_STAGING, type SentinelPartId } from '../../three/sentinel/parts';
import type { SentinelPartSpec } from '../types';
import { POLE, poleRadiusAt } from '../../three/sentinel/layout';
import { SentinelAssembly } from '../../three/sentinel/SentinelAssembly';
import type { SentinelModelDefinition, SentinelModelProps } from '../types';

/** Illustrative distribution pole assembly using the integrated 3D Sentinel model. */
function ProceduralPole({ cutoutStatus, reducedMotion, activePart }: SentinelModelProps) {
  return (
    <SentinelAssembly
      mode="hero"
      focus={activePart === 'sensor-pod' ? 'sentinel' : activePart === 'solar-panel' ? 'solar' : activePart && activePart !== 'pole' ? activePart : 'overview'}
      structureFocused={activePart === 'pole'}
      cutoutStatus={cutoutStatus}
      reducedMotion={Boolean(reducedMotion)}
      interactive={false}
    />
  );
}

/** Focus poses and marker anchors share the current assembly's staging coordinates. */
function stagedPart(id: SentinelPartId, label: string): SentinelPartSpec {
  const { anchor, shot } = PART_STAGING[id];
  const position = new Vector3().setFromSphericalCoords(shot.radius / Math.sin(MathUtils.degToRad(42) / 2), shot.polar, shot.azimuth).add(new Vector3(...shot.target));
  return { label, anchor, camera: { target: shot.target, position: position.toArray() as [number, number, number] } };
}

export const proceduralPole: SentinelModelDefinition = {
  id: 'procedural-pole-v1',
  name: 'Procedural pole assembly',
  illustrative: true,
  Component: ProceduralPole,
  cameras: {
    hero: { position: [7, -0.95, 12.2], target: [0, 0, 0], fov: 34 },
    inspector: { position: [0, 1, 10], target: [0, 0, 0], fov: 42 },
  },
  parts: {
    cutout: stagedPart('cutout', 'Protective cutout'),
    transformer: stagedPart('transformer', 'Distribution transformer'),
    'sensor-pod': stagedPart('sentinel', 'Sensor node'),
    'solar-panel': stagedPart('solar', 'Solar panel'),
    crossarm: stagedPart('crossarm', 'Crossarm and insulators'),
    pole: { label: 'Wood pole', anchor: [0, POLE.height / 3, poleRadiusAt(POLE.height / 3)] },
  },
  orbit: { minDistance: 2, maxDistance: 15, minPolarAngle: 0.25, maxPolarAngle: Math.PI * 0.78 },
};
