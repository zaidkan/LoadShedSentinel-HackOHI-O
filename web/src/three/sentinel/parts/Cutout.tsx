import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, DoubleSide, Line, LineDashedMaterial, MeshBasicMaterial, MeshStandardMaterial, Vector3, type Group } from 'three';
import type { CutoutStatus } from '../../../../../contracts/types';
import { CUTOUT_VISUAL } from '../../visual-state';
import { CROSSARM, CROSSARM_CONDUCTOR_Y, CUTOUT, HV_BUSHING_TOP_LOCAL, TRANSFORMER_POSITION, crossarmZ, cutoutLocalToWorld, onPole, type Vec3 } from '../layout';
import { Cable, Hex, Lathe, RBox, Strut, useKit, useSegments, useShadowFlags, type PartProps } from '../primitives';

const HALF = CUTOUT.length / 2;
const DOOR = CUTOUT.doorOffset;
const HINGE: Vec3 = [0, -HALF - 0.015, DOOR];
const DOOR_LENGTH = 0.42;

function insulatorProfile(): Array<[number, number]> {
  const inner = HALF - 0.03;
  const points: Array<[number, number]> = [[0.03, -inner - 0.02], [0.027, -inner]];
  const sheds = 7;
  for (let i = 0; i < sheds; i += 1) {
    const y = -inner + 0.03 + (i * (2 * inner - 0.06)) / (sheds - 1);
    const r = i % 2 === 0 ? 0.056 : 0.046;
    points.push([0.025, y - 0.016], [r, y - 0.004], [r + 0.001, y + 0.002], [0.025, y + 0.012]);
  }
  points.push([0.027, inner], [0.03, inner + 0.02]);
  return points;
}
const INSULATOR = insulatorProfile();

export interface CutoutProps extends PartProps {
  /** Reported state; `undefined` renders the installed (closed) configuration with no status styling. */
  status?: CutoutStatus;
  reducedMotion: boolean;
}

/** Drop-out fuse cutout. The fuse door swings forward about its lower hinge when OPEN. */
export function Cutout({ highlight, status, reducedMotion }: CutoutProps) {
  const ref = useRef<Group>(null);
  const hinge = useRef<Group>(null);
  const kit = useKit(highlight);
  const { seg } = useSegments();
  useShadowFlags(ref);
  const target = status ? CUTOUT_VISUAL[status].angle : 0;
  const motion = useRef({ angle: target ?? 0, velocity: 0, settled: true });
  const previous = useRef<CutoutStatus | undefined>(status);

  useEffect(() => {
    const prior = previous.current;
    previous.current = status;
    if (target === null) return;
    if (reducedMotion || prior === 'UNKNOWN' || prior === status) { motion.current = { angle: target, velocity: 0, settled: true }; if (hinge.current) hinge.current.rotation.x = -target; return; }
    motion.current.settled = false;
  }, [reducedMotion, status, target]);

  useFrame((state, delta) => {
    const m = motion.current;
    if (!hinge.current || target === null) return;
    if (m.settled) { hinge.current.rotation.x = -m.angle; return; }
    const opening = target < m.angle;
    const stiffness = opening ? 55 : 30;
    const damping = opening ? 8.2 : 2 * Math.sqrt(30);
    const step = Math.min(delta, 1 / 30) / 3;
    for (let i = 0; i < 3; i += 1) {
      m.velocity += (stiffness * (target - m.angle) - damping * m.velocity) * step;
      m.angle += m.velocity * step;
    }
    if (Math.abs(target - m.angle) < 0.0005 && Math.abs(m.velocity) < 0.002) { m.angle = target; m.velocity = 0; m.settled = true; }
    hinge.current.rotation.x = -m.angle;
    state.invalidate();
  });

  const indicator = useMemo(() => kit.custom('fuseIndicator', () => new MeshStandardMaterial({ color: '#b48f5d', metalness: 0.6, roughness: 0.4 })), [kit]);
  useEffect(() => {
    const color = status ? CUTOUT_VISUAL[status].color : null;
    indicator.color.set(color ?? '#b48f5d');
    indicator.metalness = color ? 0.1 : 0.6;
    indicator.emissive.set(color ?? '#000000');
    indicator.emissiveIntensity = color ? 0.55 : 0;
  }, [indicator, status]);

  const hood = useMemo(() => kit.custom('hood', () => new MeshStandardMaterial({ color: '#cfd3d6', metalness: 1, roughness: 0.3, side: DoubleSide })), [kit]);
  const conductorZ = crossarmZ();
  const topTerminal = cutoutLocalToWorld([0, HALF + 0.022, -0.045]);
  const bottomTerminal = cutoutLocalToWorld([0, -HALF - 0.022, -0.045]);
  const clampTab = cutoutLocalToWorld([0, 0, -0.058]);
  const poleMount = onPole(CUTOUT.position[1] - 0.02, -0.62, 0.004);
  const bushingTop: Vec3 = [TRANSFORMER_POSITION[0] + HV_BUSHING_TOP_LOCAL[0], TRANSFORMER_POSITION[1] + HV_BUSHING_TOP_LOCAL[1], TRANSFORMER_POSITION[2] + HV_BUSHING_TOP_LOCAL[2]];
  const tap: Vec3 = [-CROSSARM.pinX, CROSSARM_CONDUCTOR_Y - 0.012, conductorZ + 0.11];

  return <group ref={ref} name={`cutout-${(status ?? 'installed').toLowerCase()}`}>
    <group position={CUTOUT.position} rotation={[0, 0, CUTOUT.tilt]}>
      <Lathe profile={INSULATOR} material={kit.porcelain} segments={36} />
      {[HALF - 0.005, -HALF + 0.005].map(y => <mesh key={y} position={[0, y, 0]} material={kit.galvanized}><cylinderGeometry args={[0.031, 0.031, 0.032, seg(20, 8)]} /></mesh>)}
      <mesh material={kit.galvanized}><cylinderGeometry args={[0.03, 0.03, 0.032, seg(20, 8)]} /></mesh>
      <RBox size={[0.032, 0.032, 0.04]} radius={0.004} material={kit.galvanized} position={[0, 0, -0.04]} />

      <group name="top-contact">
        <RBox size={[0.034, 0.014, 0.11]} radius={0.003} material={kit.stainless} position={[0, HALF + 0.022, 0.035]} />
        <mesh position={[0, HALF + 0.02, DOOR + 0.004]} rotation={[0, 0, Math.PI / 2]} material={hood}>
          <cylinderGeometry args={[0.03, 0.03, 0.052, seg(18, 8), 1, true, -0.35, Math.PI / 2 + 1]} />
        </mesh>
        <RBox size={[0.022, 0.022, 0.03]} radius={0.003} material={kit.bronze} position={[0, HALF + 0.022, -0.04]} />
      </group>
      <group name="hinge-contact">
        <RBox size={[0.05, 0.014, 0.1]} radius={0.003} material={kit.stainless} position={[0, -HALF - 0.022, 0.03]} />
        {[-0.026, 0.026].map(x => <mesh key={x} position={[x, HINGE[1], DOOR]} material={kit.stainless}><boxGeometry args={[0.006, 0.036, 0.032]} /></mesh>)}
        <RBox size={[0.022, 0.022, 0.03]} radius={0.003} material={kit.bronze} position={[0, -HALF - 0.022, -0.04]} />
      </group>

      {status === 'UNKNOWN' ? <UnknownPosition /> : <group ref={hinge} name="fuse-hinge" position={HINGE} rotation={[-(motion.current.angle), 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={kit.bronze}><cylinderGeometry args={[0.006, 0.006, 0.058, 10]} /></mesh>
        <mesh position={[0, 0.03, 0]} material={kit.bronze}><cylinderGeometry args={[0.021, 0.022, 0.05, seg(18, 8)]} /></mesh>
        <mesh position={[0, 0.03 + 0.17, 0]} material={kit.fuseTube}><cylinderGeometry args={[0.018, 0.018, 0.34, seg(20, 8)]} /></mesh>
        <mesh position={[0, DOOR_LENGTH - 0.066, 0]} material={indicator}><cylinderGeometry args={[0.0192, 0.0192, 0.012, seg(20, 8)]} /></mesh>
        <mesh position={[0, DOOR_LENGTH - 0.03, 0]} material={kit.bronze}><cylinderGeometry args={[0.0205, 0.0205, 0.04, seg(18, 8)]} /></mesh>
        <mesh position={[0, DOOR_LENGTH - 0.004, 0]} material={kit.bronze}><cylinderGeometry args={[0.012, 0.014, 0.012, 12]} /></mesh>
        <mesh position={[0, DOOR_LENGTH - 0.026, 0.03]} rotation={[0, Math.PI / 2, 0]} material={kit.bronze}><torusGeometry args={[0.014, 0.0032, 8, 18]} /></mesh>
      </group>}
    </group>

    <Strut from={clampTab} to={poleMount} radius={0.004} width={0.04} shape="bar" material={kit.galvanized} />
    <RBox size={[0.07, 0.11, 0.012]} radius={0.003} material={kit.galvanized} position={poleMount} rotation={[0, -0.62, 0]} />
    <Hex position={[poleMount[0] - 0.012, poleMount[1] + 0.03, poleMount[2] + 0.01]} rotation={[Math.PI / 2, 0, 0.62]} radius={0.012} height={0.01} material={kit.galvanized} />
    <Hex position={[poleMount[0] - 0.012, poleMount[1] - 0.03, poleMount[2] + 0.01]} rotation={[Math.PI / 2, 0, 0.62]} radius={0.012} height={0.01} material={kit.galvanized} />

    <RBox size={[0.03, 0.03, 0.05]} radius={0.004} material={kit.bronze} position={tap} />
    <Cable name="cutout-jumper" points={[tap, [tap[0] + 0.02, tap[1] - 0.1, tap[2] + 0.03], [-0.86, 8.66, 0.34], [topTerminal[0] - 0.05, topTerminal[1] + 0.07, topTerminal[2] - 0.01], topTerminal]} radius={0.0065} material={kit.conductor} tubular={48} />
    <Cable name="primary-lead" points={[bottomTerminal, [bottomTerminal[0] + 0.05, bottomTerminal[1] - 0.09, bottomTerminal[2] + 0.02], [0.02, 7.78, 0.33], [0.3, 7.74, 0.22], [bushingTop[0] - 0.03, bushingTop[1] + 0.03, bushingTop[2] + 0.02], bushingTop]} radius={0.0075} material={kit.coveredLead} tubular={64} />
  </group>;
}

/** The hinge range drawn as a translucent sector: no fuse door, no implied position. */
function UnknownPosition() {
  const color = CUTOUT_VISUAL.UNKNOWN.color;
  const start = Math.PI / 2 + (CUTOUT_VISUAL.OPEN.angle ?? -2.05);
  const length = -(CUTOUT_VISUAL.OPEN.angle ?? -2.05);
  const sector = useMemo(() => new MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false }), [color]);
  const arc = useMemo(() => {
    const points: Vector3[] = [];
    for (let i = 0; i <= 40; i += 1) { const t = start + (length * i) / 40; points.push(new Vector3(0, Math.sin(t) * DOOR_LENGTH, Math.cos(t) * DOOR_LENGTH)); }
    const line = new Line(new BufferGeometry().setFromPoints(points), new LineDashedMaterial({ color: new Color(color), dashSize: 0.022, gapSize: 0.016, transparent: true, opacity: 0.9 }));
    line.computeLineDistances();
    return line;
  }, [color, length, start]);
  useEffect(() => () => { sector.dispose(); arc.geometry.dispose(); (arc.material as LineDashedMaterial).dispose(); }, [arc, sector]);
  return <group name="position-unavailable" position={HINGE}>
    <mesh rotation={[0, -Math.PI / 2, 0]} material={sector} userData={{ noShadow: true }}>
      <ringGeometry args={[0.03, DOOR_LENGTH, 36, 1, start, length]} />
    </mesh>
    <primitive object={arc} />
  </group>;
}
