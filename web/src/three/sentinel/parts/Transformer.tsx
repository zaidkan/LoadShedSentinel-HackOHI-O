import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { HV_BUSHING_LOCAL, TANK_NAMEPLATE, TRANSFORMER, TRANSFORMER_POSITION, poleRadiusAt, type Vec3 } from '../layout';
import { Hex, Lathe, RBox, Strut, useKit, useSegments, useShadowFlags, type PartProps } from '../primitives';

const R = TRANSFORMER.radius;

const TANK_PROFILE: Array<[number, number]> = [
  [0, -0.44], [0.2, -0.44], [0.245, -0.434], [0.266, -0.421], [0.277, -0.403], [R, -0.382], [R, 0.384], [R - 0.004, 0.394],
];
const COVER_PROFILE: Array<[number, number]> = [
  [R + 0.009, 0.388], [R + 0.012, 0.401], [R + 0.008, 0.413], [0.26, 0.427], [0.19, 0.441], [0.09, 0.45], [0, 0.452],
];
const CLAMP_PROFILE: Array<[number, number]> = [[R + 0.004, 0.374], [R + 0.014, 0.377], [R + 0.016, 0.39], [R + 0.014, 0.404], [R + 0.004, 0.407]];

/** Primary bushing: porcelain with three sheds and a bronze stud. Base at y = 0. */
const HV_BUSHING_PROFILE: Array<[number, number]> = [
  [0.034, 0], [0.034, 0.012], [0.026, 0.02], [0.05, 0.034], [0.052, 0.04], [0.026, 0.054], [0.025, 0.068], [0.045, 0.082], [0.047, 0.088],
  [0.024, 0.1], [0.023, 0.114], [0.04, 0.125], [0.041, 0.131], [0.022, 0.142], [0.02, 0.158], [0.012, 0.164], [0, 0.165],
];
const LV_BUSHING_PROFILE: Array<[number, number]> = [
  [0.026, 0], [0.026, 0.008], [0.02, 0.012], [0.03, 0.022], [0.03, 0.027], [0.018, 0.034], [0.017, 0.05], [0.012, 0.056], [0, 0.057],
];

const SECONDARY_ANGLES = [0.62, 0.92, 1.22];
const radial = (angle: number, y: number, outset = 0): Vec3 => [Math.sin(angle) * (R + outset), y, Math.cos(angle) * (R + outset)];

function Radial({ angle, y, outset = 0, children }: { angle: number; y: number; outset?: number; children: ReactNode }) {
  return <group position={radial(angle, y, outset)} rotation={[0, angle, 0]}><group rotation={[Math.PI / 2, 0, 0]}>{children}</group></group>;
}

export function Transformer({ highlight }: PartProps) {
  const ref = useRef<Group>(null);
  const kit = useKit(highlight);
  const { seg, detail } = useSegments();
  useShadowFlags(ref);
  const [px] = TRANSFORMER_POSITION;
  const hangerYs = [0.25, -0.25];
  return <group ref={ref} name="gray-transformer" position={TRANSFORMER_POSITION}>
    <Lathe profile={TANK_PROFILE} material={kit.tankPaint} segments={64} />
    <Lathe profile={COVER_PROFILE} material={kit.tankPaint} segments={64} />
    <Lathe profile={CLAMP_PROFILE} material={kit.tankTrim} segments={64} />
    {[0.2, -0.24].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={kit.tankPaint}><torusGeometry args={[R, 0.0045, 8, seg(72, 24)]} /></mesh>)}
    <group name="pressure-relief" position={[Math.sin(2.3) * 0.17, 0.446, Math.cos(2.3) * 0.17]}>
      <mesh position={[0, 0.012, 0]} material={kit.tankTrim}><cylinderGeometry args={[0.014, 0.016, 0.024, 12]} /></mesh>
      <mesh position={[0, 0.03, 0]} material={kit.galvanized}><torusGeometry args={[0.011, 0.003, 6, 14]} /></mesh>
    </group>

    <group position={HV_BUSHING_LOCAL}>
      <mesh position={[0, 0.006, 0]} material={kit.tankTrim}><cylinderGeometry args={[0.046, 0.05, 0.012, seg(24, 10)]} /></mesh>
      <Lathe profile={HV_BUSHING_PROFILE} material={kit.porcelain} position={[0, 0.012, 0]} segments={32} />
      <mesh position={[0, 0.192, 0]} material={kit.bronze}><cylinderGeometry args={[0.007, 0.007, 0.04, 10]} /></mesh>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} material={kit.bronze}><torusGeometry args={[0.011, 0.0035, 8, 16]} /></mesh>
    </group>

    {SECONDARY_ANGLES.map((angle, i) => <Radial key={angle} angle={angle} y={0.27} outset={-0.002}>
      <Lathe profile={LV_BUSHING_PROFILE} material={kit.porcelain} segments={24} />
      <mesh position={[0, 0.07, 0]} material={kit.bronze}><boxGeometry args={[0.028, 0.03, 0.006]} /></mesh>
      <mesh position={[0, 0.074, 0.004]} rotation={[Math.PI / 2, 0, 0]} material={kit.bronze}><cylinderGeometry args={[0.005, 0.005, 0.012, 8]} /></mesh>
      {i === 1 ? null : <mesh position={[0, 0.062, 0]} material={kit.bronze}><cylinderGeometry args={[0.006, 0.006, 0.016, 8]} /></mesh>}
    </Radial>)}
    <Strut from={radial(SECONDARY_ANGLES[1], 0.255, 0.05)} to={radial(SECONDARY_ANGLES[1] + 0.06, 0.08, 0.01)} radius={0.0022} width={0.012} shape="bar" material={kit.copper} />
    <Radial angle={SECONDARY_ANGLES[1] + 0.06} y={0.075}><mesh position={[0, 0.006, 0]} material={kit.bronze}><boxGeometry args={[0.026, 0.012, 0.03]} /></mesh></Radial>

    <mesh name="nameplate" position={[0, TANK_NAMEPLATE.y, 0]} material={kit.nameplate}>
      <cylinderGeometry args={[R + 0.0025, R + 0.0025, 0.072, 12, 1, true, TANK_NAMEPLATE.angle - 0.2, 0.4]} />
    </mesh>

    {[0, Math.PI].map(angle => <group key={angle} position={radial(angle, 0.335)} rotation={[0, angle + Math.PI / 2, 0]}>
      <mesh material={kit.tankPaint}><torusGeometry args={[0.022, 0.006, 8, 16, Math.PI]} /></mesh>
    </group>)}

    {hangerYs.map(y => {
      const worldY = TRANSFORMER_POSITION[1] + y;
      const poleFace = -px + poleRadiusAt(worldY);
      const poleBack = -px - poleRadiusAt(worldY);
      const length = -R + 0.01 - poleFace;
      return <group key={y} position={[0, y, -TRANSFORMER_POSITION[2]]}>
        <RBox size={[length, 0.05, 0.17]} radius={0.004} material={kit.darkSteel} position={[poleFace + length / 2, 0, 0]} />
        <RBox size={[0.01, 0.085, 0.2]} radius={0.002} material={kit.galvanized} position={[poleFace + 0.005, 0, 0]} />
        {[-0.065, 0.065].map(z => <group key={z}>
          <Hex position={[poleFace + 0.018, 0, z]} rotation={[0, 0, Math.PI / 2]} radius={0.014} height={0.016} material={kit.galvanized} />
          {detail === 'high' ? <mesh position={[(poleFace + poleBack) / 2, 0, z]} rotation={[0, 0, Math.PI / 2]} material={kit.galvanized}><cylinderGeometry args={[0.008, 0.008, poleFace - poleBack + 0.03, 8]} /></mesh> : null}
          <mesh position={[poleBack - 0.004, 0, z]} material={kit.galvanized}><boxGeometry args={[0.006, 0.05, 0.05]} /></mesh>
          <Hex position={[poleBack - 0.014, 0, z]} rotation={[0, 0, Math.PI / 2]} radius={0.014} height={0.014} material={kit.galvanized} />
        </group>)}
      </group>;
    })}
  </group>;
}
