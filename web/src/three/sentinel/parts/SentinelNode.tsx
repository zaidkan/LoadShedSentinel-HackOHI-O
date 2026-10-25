import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, MathUtils, MeshStandardMaterial, SpriteMaterial, type Group, type Sprite } from 'three';
import type { SolarNode } from '../../../../../contracts/types';
import { SENTINEL, SENTINEL_POSITION, SOLAR, SOLAR_MOUNT_Y, TANK_SENSOR, TRANSFORMER, TRANSFORMER_POSITION, onPole, poleRadiusAt, sentinelLocalToWorld, solarLocalToWorld, tankPoint, type Vec3 } from '../layout';
import { radialTexture } from '../textures';
import { Cable, RBox, useKit, useSegments, useShadowFlags, type PartProps } from '../primitives';

export type NodeLink = SolarNode['connectivity'];

/**
 * Light-bar treatment. In inspection mode it mirrors the snapshot's modeled link state;
 * in presentation mode it is a neutral product light that carries no status meaning.
 */
const LIGHT: Record<NodeLink | 'PRESENTATION', { color: string; intensity: number }> = {
  PRESENTATION: { color: '#dff5fa', intensity: 2.4 },
  ONLINE: { color: '#5fd3e6', intensity: 3 },
  DELAYED: { color: '#e9b965', intensity: 2.6 },
  OFFLINE: { color: '#1a2026', intensity: 0 },
};

const W = SENTINEL.width, D = SENTINEL.depth;
const FRONT = D / 2;

export interface SentinelNodeProps extends PartProps {
  link?: NodeLink;
  /** Seconds after mount before the light bar ignites (intro choreography). */
  igniteDelay?: number;
  breathe?: boolean;
  reducedMotion: boolean;
}

export function SentinelNode({ highlight, link, igniteDelay = 0, breathe = false, reducedMotion }: SentinelNodeProps) {
  const ref = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const kit = useKit(highlight);
  const { seg, detail } = useSegments();
  useShadowFlags(ref);

  const light = useMemo(() => kit.custom('lightBar', () => new MeshStandardMaterial({ color: '#0c1418', emissive: new Color(LIGHT.PRESENTATION.color), emissiveIntensity: 0, roughness: 0.25 })), [kit]);
  const glowMaterial = useMemo(() => new SpriteMaterial({ map: radialTexture(), color: LIGHT.PRESENTATION.color, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }), []);
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial]);
  const targetColor = useMemo(() => new Color(), []);
  const clock = useRef({ start: -1 });

  useFrame((state, delta) => {
    if (clock.current.start < 0) clock.current.start = state.clock.elapsedTime;
    const spec = LIGHT[link ?? 'PRESENTATION'];
    const elapsed = state.clock.elapsedTime - clock.current.start;
    const ignite = reducedMotion ? 1 : MathUtils.smoothstep(elapsed, igniteDelay, igniteDelay + 0.9);
    const pulse = breathe && !reducedMotion ? 0.9 + 0.1 * Math.sin(state.clock.elapsedTime * 1.4) : 1;
    const intensity = spec.intensity * ignite * pulse;
    targetColor.set(spec.color);
    const k = reducedMotion ? 1 : 1 - Math.exp(-8 * delta);
    light.emissive.lerp(targetColor, k);
    light.emissiveIntensity = MathUtils.lerp(light.emissiveIntensity, intensity, k);
    glowMaterial.color.copy(light.emissive);
    glowMaterial.opacity = Math.min(1, light.emissiveIntensity / 3) * 0.55;
    if (glow.current) glow.current.visible = glowMaterial.opacity > 0.01;
    if (Math.abs(light.emissiveIntensity - intensity) > 0.002 || ignite < 1) state.invalidate();
  });

  const bandHeights = [0.17, -0.17];
  const poleZ = -SENTINEL_POSITION[2];
  const glands = [-0.075, 0, 0.075];
  const glandY = -SENTINEL.height / 2 - 0.004;

  const sensorGland = tankPoint(TANK_SENSOR.angle, TANK_SENSOR.y - 0.035, 0.02);
  const sensorRoute: Vec3[] = [
    sensorGland,
    tankPoint(TANK_SENSOR.angle - 0.02, TANK_SENSOR.y - 0.16, 0.008),
    tankPoint(TANK_SENSOR.angle - 0.08, -TRANSFORMER.height / 2 + 0.03, 0.01),
    [TRANSFORMER_POSITION[0] - 0.12, TRANSFORMER_POSITION[1] - TRANSFORMER.height / 2 - 0.05, 0.2],
    onPole(6.45, 0.62, 0.008), onPole(6.1, 0.66, 0.008), onPole(5.78, 0.7, 0.008),
    [0.115, SENTINEL.y - 0.27, 0.16], [0.085, SENTINEL.y - 0.31, 0.22],
    sentinelLocalToWorld([0.075, glandY - 0.06, 0]), sentinelLocalToWorld([0.075, glandY - 0.012, 0]),
  ];
  const junctionBox = solarLocalToWorld([0.0, 0.07, -SOLAR.thickness / 2 - 0.022]);
  const solarRoute: Vec3[] = [
    junctionBox,
    solarLocalToWorld([0.0, -0.05, -SOLAR.thickness / 2 - 0.05]),
    onPole(SOLAR_MOUNT_Y - 0.1, -1.2, 0.01), onPole(SOLAR_MOUNT_Y - 0.35, -0.82, 0.008), onPole(5.78, -0.7, 0.008),
    [-0.115, SENTINEL.y - 0.27, 0.16], [-0.085, SENTINEL.y - 0.31, 0.22],
    sentinelLocalToWorld([-0.075, glandY - 0.06, 0]), sentinelLocalToWorld([-0.075, glandY - 0.012, 0]),
  ];

  return <group ref={ref} name="sentinel-node">
    <group position={SENTINEL_POSITION}>
      <RBox name="sentinel-shell" size={[W, 0.29, D]} radius={0.024} segments={4} material={kit.shell} position={[0, 0.055, 0]} />
      <RBox size={[W - 0.006, 0.012, D - 0.006]} radius={0.004} material={kit.seam} position={[0, -0.096, 0]} />
      <RBox name="battery-bay" size={[W, 0.09, D]} radius={0.022} segments={4} material={kit.graphite} position={[0, -0.147, 0]} />
      <RBox name="sun-shield" size={[W + 0.016, 0.016, D + 0.024]} radius={0.007} material={kit.shell} position={[0, 0.208, 0.01]} />
      <RBox size={[W - 0.02, 0.004, D - 0.004]} radius={0.0015} material={kit.seam} position={[0, 0.198, 0.002]} />

      <RBox name="front-glass" size={[0.212, 0.212, 0.01]} radius={0.01} segments={3} material={kit.glass} position={[0, 0.064, FRONT]} />
      <mesh name="status-light-bar" position={[0, 0.146, FRONT + 0.0052]} material={light}><boxGeometry args={[0.12, 0.0055, 0.002]} /></mesh>
      <sprite ref={glow} position={[0, 0.146, FRONT + 0.012]} scale={[0.22, 0.05, 1]} material={glowMaterial} />

      <group name="acoustic-port" position={[0, 0.066, FRONT + 0.0052]}>
        <mesh material={kit.graphite}><circleGeometry args={[0.031, seg(32, 12)]} /></mesh>
        <mesh material={kit.stainless}><torusGeometry args={[0.032, 0.0016, 6, seg(40, 16)]} /></mesh>
        {detail === 'high' ? [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * 0.011, Math.sin(i * Math.PI / 3) * 0.011]), ...Array.from({ length: 12 }, (_, i) => [Math.cos(i * Math.PI / 6) * 0.021, Math.sin(i * Math.PI / 6) * 0.021])].map(([x, y], i) =>
          <mesh key={i} position={[x, y, 0.0004]} material={kit.grille}><circleGeometry args={[0.0028, 10]} /></mesh>) : null}
      </group>
      <mesh name="wordmark" position={[0, -0.012, FRONT + 0.0053]} material={kit.wordmark}><planeGeometry args={[0.104, 0.01625]} /></mesh>

      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * (W / 2 + 0.0004), 0.055, 0]} rotation={[0, side * Math.PI / 2, 0]} material={kit.graphite}><planeGeometry args={[0.05, 0.22]} /></mesh>
        <mesh position={[side * (W / 2 + 0.0006), -0.147, 0.03]} rotation={[0, side * Math.PI / 2, 0]} material={kit.seam}><circleGeometry args={[0.008, 16]} /></mesh>
      </group>)}
      <mesh position={[0.096, -0.147, FRONT + 0.0006]} material={kit.stainless}><circleGeometry args={[0.0045, 16]} /></mesh>

      {glands.map(x => <group key={x} position={[x, glandY, 0]}>
        <mesh position={[0, 0.008, 0]} material={kit.nylon}><cylinderGeometry args={[0.013, 0.013, 0.008, 6]} /></mesh>
        <mesh position={[0, -0.002, 0]} material={kit.nylon}><cylinderGeometry args={[0.0095, 0.0115, 0.014, seg(16, 8)]} /></mesh>
        {x === 0 ? <mesh position={[0, -0.01, 0]} material={kit.nylon}><sphereGeometry args={[0.0095, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /></mesh> : null}
      </group>)}

      <group name="lte-antenna" position={[0.098, 0.216, -0.022]}>
        <mesh position={[0, 0.006, 0]} material={kit.graphite}><cylinderGeometry args={[0.017, 0.019, 0.012, seg(24, 10)]} /></mesh>
        <mesh position={[0, 0.06, 0]} material={kit.graphite}><capsuleGeometry args={[0.0105, 0.085, 6, seg(18, 8)]} /></mesh>
      </group>

      <RBox name="mounting-rail" size={[0.07, 0.46, 0.008]} radius={0.003} material={kit.stainless} position={[0, 0, -FRONT - 0.005]} />
      {bandHeights.map(y => {
        const worldY = SENTINEL_POSITION[1] + y;
        const r = poleRadiusAt(worldY) + 0.0025;
        const gap = -FRONT - 0.009 - (poleZ + poleRadiusAt(worldY));
        return <group key={y}>
          <mesh position={[0, y, -FRONT - 0.009 - gap / 2]} material={kit.stainless}><boxGeometry args={[0.05, 0.036, gap]} /></mesh>
          <mesh position={[0, y, poleZ]} material={kit.stainless}><cylinderGeometry args={[r, r, 0.019, seg(48, 16), 1, true]} /></mesh>
          <RBox size={[0.03, 0.03, 0.012]} radius={0.003} material={kit.stainless} position={[0, y, poleZ - r - 0.004]} />
        </group>;
      })}
    </group>

    <group name="tank-probe" position={tankPoint(TANK_SENSOR.angle, TANK_SENSOR.y)} rotation={[0, TANK_SENSOR.angle, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.004, 0]} material={kit.graphite}><cylinderGeometry args={[0.04, 0.042, 0.008, seg(32, 12)]} /></mesh>
        <mesh position={[0, 0.02, 0]} material={kit.shell}><cylinderGeometry args={[0.034, 0.038, 0.026, seg(32, 12)]} /></mesh>
        <mesh position={[0, 0.034, 0]} material={kit.glass}><cylinderGeometry args={[0.019, 0.022, 0.004, seg(28, 12)]} /></mesh>
        <mesh position={[0, 0.0355, 0]} rotation={[-Math.PI / 2, 0, 0]} material={light}><ringGeometry args={[0.0235, 0.0262, seg(32, 12)]} /></mesh>
      </group>
      <mesh position={[0, -0.036, 0.02]} material={kit.nylon}><cylinderGeometry args={[0.007, 0.008, 0.014, 10]} /></mesh>
    </group>

    <Cable name="probe-cable" points={sensorRoute} radius={0.0045} material={kit.cable} tubular={160} radial={7} />
    <Cable name="solar-cable" points={solarRoute} radius={0.0045} material={kit.cable} tubular={120} radial={7} />
    {[6.3, 6.0, 5.78].map(y => <group key={y}>
      <mesh position={onPole(y, 0.68, 0.006)} rotation={[0, 0.68, 0]} material={kit.nylon}><boxGeometry args={[0.02, 0.012, 0.012]} /></mesh>
      {y < 6.2 ? <mesh position={onPole(y - 0.1, -0.76, 0.006)} rotation={[0, -0.76, 0]} material={kit.nylon}><boxGeometry args={[0.02, 0.012, 0.012]} /></mesh> : null}
    </group>)}
  </group>;
}
