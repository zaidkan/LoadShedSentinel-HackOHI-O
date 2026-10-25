import { CutoutSwitch, SensorPod, SolarPanel, Transformer, WoodPole } from '../../three/HardwareModel';
import { CAMERA_HOME } from '../../three/visual-state';
import type { SentinelModelDefinition, SentinelModelProps } from '../types';

/** Temporary procedural pole. Geometry is unchanged from `three/HardwareModel`; this adapter only tags parts. */
function ProceduralPole({ cutoutStatus, detail, reducedMotion }: SentinelModelProps) {
  const lowPoly = detail === 'low';
  return <group name="illustrative-pole-assembly">
    <group userData={{ sentinelPart: 'pole' }}><WoodPole lowPoly={lowPoly} /></group>
    <group userData={{ sentinelPart: 'transformer' }}><Transformer lowPoly={lowPoly} /></group>
    <group userData={{ sentinelPart: 'cutout' }}><CutoutSwitch status={cutoutStatus} reducedMotion={reducedMotion} lowPoly={lowPoly} /></group>
    <group userData={{ sentinelPart: 'sensor-pod' }}><SensorPod lowPoly={lowPoly} /></group>
    <group userData={{ sentinelPart: 'solar-panel' }}><SolarPanel /></group>
  </group>;
}

export const proceduralPole: SentinelModelDefinition = {
  id: 'procedural-pole-v1',
  name: 'Procedural pole assembly',
  illustrative: true,
  Component: ProceduralPole,
  cameras: {
    hero: { position: [7.1, 2.5, 12.2], target: [0.1, 3.45, 0], fov: 34 },
    inspector: { position: CAMERA_HOME.position, target: CAMERA_HOME.target, fov: 42 },
  },
  parts: {
    cutout: { label: 'Protective cutout', anchor: [-0.68, 4.72, 0.5], camera: { position: [2.5, 4.9, 5.6], target: [-0.55, 4.35, 0.3] } },
    transformer: { label: 'Distribution transformer', anchor: [1.18, 3.95, 0.4], camera: { position: [4.4, 4.5, 4.9], target: [0.65, 3.75, 0.25] } },
    'sensor-pod': { label: 'Sensor node', anchor: [-0.32, 2.95, 0.4], camera: { position: [1.9, 3.2, 4.3], target: [-0.32, 2.9, 0.2] } },
    'solar-panel': { label: 'Solar panel', anchor: [0.55, 2.3, 0.75], camera: { position: [2.1, 3.5, 4.5], target: [0.1, 2.25, 0.55] } },
    crossarm: { label: 'Crossarm and insulators', anchor: [1.12, 5.72, 0.1], camera: { position: [3.2, 6.6, 5.2], target: [0, 5.5, 0] } },
    pole: { label: 'Wood pole', anchor: [0, 1.4, 0.24] },
  },
  orbit: { minDistance: 2, maxDistance: 15, minPolarAngle: 0.25, maxPolarAngle: Math.PI * 0.78 },
};
