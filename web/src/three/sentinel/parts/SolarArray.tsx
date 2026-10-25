import { useRef } from 'react';
import type { Group } from 'three';
import { SOLAR, SOLAR_MOUNT_Y, onPole, poleRadiusAt, solarLocalToWorld, type Vec3 } from '../layout';
import { Hex, RBox, Strut, useKit, useSegments, useShadowFlags, type PartProps } from '../primitives';

const { width: PW, height: PH, thickness: T } = SOLAR;
const FRAME = 0.022;

/** Side-of-pole solar module on a tilt bracket. Panel local frame: X width, Y up-slope, +Z sky-facing. */
export function SolarArray({ highlight }: PartProps) {
  const ref = useRef<Group>(null);
  const kit = useKit(highlight);
  const { seg } = useSegments();
  useShadowFlags(ref);
  const hingeLocal: Vec3 = [0, -0.02, -T / 2 - 0.06];
  const hinge = solarLocalToWorld(hingeLocal);
  const poleSide = onPole(SOLAR_MOUNT_Y, -Math.PI / 2, 0.012);
  const bands = [SOLAR_MOUNT_Y - 0.075, SOLAR_MOUNT_Y + 0.075];
  return <group ref={ref} name="solar-panel">
    <group position={SOLAR.position} rotation={[SOLAR.rotation[0], SOLAR.rotation[1], SOLAR.rotation[2], 'YXZ']}>
      {[-1, 1].map(side => <RBox key={`h${side}`} size={[PW, FRAME, T]} radius={0.003} material={kit.anodized} position={[0, side * (PH / 2 - FRAME / 2), 0]} />)}
      {[-1, 1].map(side => <RBox key={`v${side}`} size={[FRAME, PH - FRAME * 2 + 0.002, T]} radius={0.003} material={kit.anodized} position={[side * (PW / 2 - FRAME / 2), 0, 0]} />)}
      <mesh name="solar-cells" position={[0, 0, T / 2 - 0.004]} material={kit.solarCells}><planeGeometry args={[PW - FRAME * 2 + 0.004, PH - FRAME * 2 + 0.004]} /></mesh>
      <mesh position={[0, 0, -T / 2 + 0.006]} rotation={[0, Math.PI, 0]} material={kit.backsheet}><planeGeometry args={[PW - FRAME * 2 + 0.004, PH - FRAME * 2 + 0.004]} /></mesh>
      <RBox name="junction-box" size={[0.085, 0.05, 0.02]} radius={0.004} material={kit.nylon} position={[0, 0.07, -T / 2 - 0.008]} />
      <RBox size={[PW - 0.12, 0.03, 0.014]} radius={0.003} material={kit.galvanized} position={[0, -0.02, -T / 2 - 0.007]} />
      {[-0.11, 0.11].map(x => <Strut key={x} from={[x, -0.02, -T / 2 - 0.012]} to={[x * 0.25, hingeLocal[1], hingeLocal[2]]} radius={0.003} width={0.026} shape="bar" material={kit.galvanized} />)}
      <mesh position={hingeLocal} rotation={[0, 0, Math.PI / 2]} material={kit.stainless}><cylinderGeometry args={[0.011, 0.011, 0.07, seg(16, 8)]} /></mesh>
      {[-0.04, 0.04].map(x => <Hex key={x} position={[x, hingeLocal[1], hingeLocal[2]]} rotation={[0, 0, Math.PI / 2]} radius={0.013} height={0.008} material={kit.stainless} />)}
    </group>

    <Strut from={poleSide} to={hinge} radius={0.014} width={0.03} shape="bar" material={kit.galvanized} />
    <RBox size={[0.012, 0.22, 0.07]} radius={0.003} material={kit.galvanized} position={onPole(SOLAR_MOUNT_Y, -Math.PI / 2, 0.006)} />
    {bands.map(y => {
      const r = poleRadiusAt(y) + 0.0025;
      return <mesh key={y} position={[0, y, 0]} material={kit.stainless}><cylinderGeometry args={[r, r, 0.019, seg(48, 16), 1, true]} /></mesh>;
    })}
  </group>;
}
