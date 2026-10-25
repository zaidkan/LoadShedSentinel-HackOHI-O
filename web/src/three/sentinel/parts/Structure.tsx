import { useMemo, useRef } from 'react';
import { MeshStandardMaterial, type Group } from 'three';
import { CROSSARM, CROSSARM_CONDUCTOR_Y, PIN_INSULATOR_HEIGHT, PIN_STANDOFF, POLE, POLE_TOP_PIN, crossarmZ, poleRadiusAt, type Vec3 } from '../layout';
import { fadeTexture } from '../textures';
import { Cable, Hex, Lathe, RBox, Strut, spanPoints, useKit, useSegments, useShadowFlags, type PartProps } from '../primitives';

/** ANSI-style pin insulator: two drip skirts, a neck and a conductor groove. Base at y = 0. */
export const PIN_INSULATOR_PROFILE: Array<[number, number]> = [
  [0.012, 0], [0.03, 0], [0.034, 0.018], [0.06, 0.034], [0.064, 0.04], [0.06, 0.046], [0.036, 0.056],
  [0.034, 0.07], [0.054, 0.083], [0.057, 0.088], [0.053, 0.093], [0.032, 0.102],
  [0.03, 0.114], [0.036, 0.121], [0.038, 0.13], [0.03, 0.134], [0.03, 0.14], [0.034, 0.144], [0.026, 0.15], [0, 0.151],
];

/**
 * Conductor run either side of the pole (metres along Z). Street-side spans run toward the
 * camera and would cross hero copy, so they stay short; both fades stay opaque at the pole.
 */
const SPAN = { far: -11, near: 2.6 } as const;
const spanU = (z: number) => (z - SPAN.far) / (SPAN.near - SPAN.far);
const SPAN_FADE = { in: Number(spanU(-5).toFixed(2)), out: Number(spanU(0.45).toFixed(2)) };

export function Pole({ highlight }: PartProps) {
  const ref = useRef<Group>(null);
  const kit = useKit(highlight);
  const { seg } = useSegments();
  useShadowFlags(ref);
  const top = POLE.height;
  const groundWire: [Vec3, Vec3] = [[0, 0.3, -poleRadiusAt(0.3) - 0.005], [0, top - 0.04, -poleRadiusAt(top) - 0.005]];
  return <group ref={ref} name="wood-pole">
    <mesh position={[0, top / 2, 0]} material={kit.wood}>
      <cylinderGeometry args={[POLE.topRadius, POLE.baseRadius, top, seg(48, 12), 1]} />
    </mesh>
    <Lathe profile={[[POLE.topRadius, 0], [POLE.topRadius - 0.006, 0.012], [0.07, 0.024], [0, 0.028]]} material={kit.wood} position={[0, top, 0]} segments={48} />
    <Strut from={groundWire[0]} to={groundWire[1]} radius={0.0042} material={kit.copper} segments={6} />
    {[1.2, 2.6, 4, 5.4, 6.8, 8.2].map(y => <mesh key={y} position={[0, y, -poleRadiusAt(y) - 0.006]} material={kit.galvanized}><boxGeometry args={[0.018, 0.006, 0.006]} /></mesh>)}
  </group>;
}

function PinInsulator({ position, kit }: { position: Vec3; kit: ReturnType<typeof useKit> }) {
  return <group position={position}>
    <mesh position={[0, -PIN_STANDOFF / 2, 0]} material={kit.galvanized}><cylinderGeometry args={[0.012, 0.014, PIN_STANDOFF, 10]} /></mesh>
    <Lathe profile={PIN_INSULATOR_PROFILE} material={kit.porcelain} segments={36} />
  </group>;
}

export function Crossarm({ highlight }: PartProps) {
  const ref = useRef<Group>(null);
  const kit = useKit(highlight);
  const { detail } = useSegments();
  useShadowFlags(ref);
  const z = crossarmZ();
  const front = z + CROSSARM.depth / 2;
  const armTop = CROSSARM.y + CROSSARM.height / 2;
  const braceFoot: Vec3 = [0, CROSSARM.y - 0.56, poleRadiusAt(CROSSARM.y - 0.56) + 0.006];
  const conductorY = CROSSARM_CONDUCTOR_Y - 0.012;
  const conductorMaterial = useMemo(() => kit.custom('conductorFade', () => new MeshStandardMaterial({ color: '#aeb4b8', metalness: 0.9, roughness: 0.42, alphaMap: fadeTexture(SPAN_FADE.in, SPAN_FADE.out), transparent: true }), { thin: true }), [kit]);
  const topPinBase: Vec3 = POLE_TOP_PIN;
  const conductors: Vec3[] = [[-CROSSARM.pinX, conductorY, z], [CROSSARM.pinX, conductorY, z], [topPinBase[0], topPinBase[1] + PIN_INSULATOR_HEIGHT - 0.012, topPinBase[2]]];
  return <group ref={ref} name="crossarm-assembly">
    <RBox size={[CROSSARM.length, CROSSARM.height, CROSSARM.depth]} radius={0.012} material={kit.crossarmWood} position={[0, CROSSARM.y, z]} />
    <mesh position={[0, CROSSARM.y, front + 0.002]} material={kit.galvanized}><boxGeometry args={[0.06, 0.06, 0.004]} /></mesh>
    <Hex position={[0, CROSSARM.y, front + 0.008]} rotation={[Math.PI / 2, 0, 0]} radius={0.016} height={0.012} material={kit.galvanized} />
    <Hex position={[0, CROSSARM.y, -poleRadiusAt(CROSSARM.y) - 0.006]} rotation={[Math.PI / 2, 0, 0]} radius={0.016} height={0.012} material={kit.galvanized} />
    {[-1, 1].map(side => <group key={side}>
      <Strut from={[side * 0.64, CROSSARM.y - CROSSARM.height / 2 + 0.004, front + 0.004]} to={[side * 0.02, braceFoot[1], braceFoot[2]]} radius={0.003} width={0.034} shape="bar" material={kit.galvanized} />
      <Hex position={[side * 0.64, CROSSARM.y - 0.022, front + 0.01]} rotation={[Math.PI / 2, 0, 0]} radius={0.01} height={0.008} material={kit.galvanized} />
      <PinInsulator position={[side * CROSSARM.pinX, armTop + PIN_STANDOFF, z]} kit={kit} />
    </group>)}
    <Hex position={[braceFoot[0], braceFoot[1], braceFoot[2] + 0.006]} rotation={[Math.PI / 2, 0, 0]} radius={0.013} height={0.01} material={kit.galvanized} />
    <group name="pole-top-pin">
      <mesh position={[0, POLE.height - 0.16, poleRadiusAt(POLE.height) + 0.006]} material={kit.galvanized}><boxGeometry args={[0.05, 0.34, 0.01]} /></mesh>
      <Strut from={[0, POLE.height - 0.02, topPinBase[2]]} to={[0, topPinBase[1], topPinBase[2]]} radius={0.012} material={kit.galvanized} segments={10} />
      <mesh position={[0, POLE.height - 0.02, (poleRadiusAt(POLE.height) + topPinBase[2]) / 2 + 0.003]} material={kit.galvanized}><boxGeometry args={[0.05, 0.02, topPinBase[2] - poleRadiusAt(POLE.height) + 0.01]} /></mesh>
      {[POLE.height - 0.27, POLE.height - 0.07].map(y => <Hex key={y} position={[0, y, poleRadiusAt(POLE.height) + 0.016]} rotation={[Math.PI / 2, 0, 0]} radius={0.011} height={0.01} material={kit.galvanized} />)}
      <Lathe profile={PIN_INSULATOR_PROFILE} material={kit.porcelain} position={topPinBase} segments={36} />
    </group>
    {conductors.map((origin, i) => <group key={i}>
      <Cable points={spanPoints(origin, SPAN.far, SPAN.near, 0.9)} radius={detail === 'high' ? 0.0068 : 0.0095} material={conductorMaterial} tubular={detail === 'high' ? 140 : 48} radial={8} />
      <mesh position={origin} material={kit.conductor}><torusGeometry args={[0.014, 0.0028, 6, 14]} /></mesh>
    </group>)}
  </group>;
}
