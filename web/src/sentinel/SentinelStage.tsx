import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CanvasTexture, MathUtils, Vector3, type Group, type Object3D, type Points } from 'three';
import type { CutoutStatus } from '../../../contracts/types';
import { activeSentinelModel } from './registry';
import type { CameraCommand, SentinelHotspot, SentinelModelDefinition, SentinelPartId, SentinelVariant } from './types';
import './sentinel.css';

export interface SentinelStageProps {
  variant: SentinelVariant;
  cutoutStatus: CutoutStatus;
  label: string;
  model?: SentinelModelDefinition;
  detail?: 'full' | 'low';
  reducedMotion?: boolean;
  activePart?: SentinelPartId | null;
  hotspots?: SentinelHotspot[];
  command?: CameraCommand;
  /** 0 at rest, 1 once the hero has scrolled away; drives the hero's scroll-linked turn. */
  scrollProgress?: MutableRefObject<number>;
  paused?: boolean;
  onPartHover?: (part: SentinelPartId | null) => void;
  onPartSelect?: (part: SentinelPartId) => void;
  onContextLost?: () => void;
}

export class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onUnavailable(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function useWebGLSupport() {
  const [supported, setSupported] = useState(true);
  useEffect(() => { setSupported(typeof window.WebGL2RenderingContext === 'function'); }, []);
  return supported;
}

function partFromObject(object: Object3D | null): SentinelPartId | null {
  for (let node: Object3D | null = object; node; node = node.parent) {
    const part = node.userData?.sentinelPart as SentinelPartId | undefined;
    if (part) return part;
  }
  return null;
}

function ContextGuard({ onContextLost }: { onContextLost?: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (!onContextLost) return;
    const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onContextLost]);
  return null;
}

function InspectorRig({ model, command, reducedMotion }: { model: SentinelModelDefinition; command?: CameraCommand; reducedMotion: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.target.set(...model.cameras.inspector.target);
    Object.assign(orbit, model.orbit, { enablePan: false, enableDamping: false });
    const changed = () => invalidate();
    const interrupt = () => { goal.current = null; };
    orbit.addEventListener('change', changed);
    orbit.addEventListener('start', interrupt);
    orbit.update();
    return () => { orbit.removeEventListener('change', changed); orbit.removeEventListener('start', interrupt); orbit.dispose(); controls.current = null; };
  }, [camera, gl, invalidate, model]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || !command) return;
    let position: Vector3, target: Vector3;
    const focus = command.action === 'focus' && command.part ? model.parts[command.part]?.camera : undefined;
    if (command.action === 'reset' || (command.action === 'focus' && !focus)) {
      position = new Vector3(...model.cameras.inspector.position); target = new Vector3(...model.cameras.inspector.target);
    } else if (focus) {
      position = new Vector3(...focus.position); target = new Vector3(...focus.target);
    } else {
      target = orbit.target.clone();
      const offset = camera.position.clone().sub(target);
      if (command.action === 'left' || command.action === 'right') offset.applyAxisAngle(new Vector3(0, 1, 0), command.action === 'left' ? -0.3 : 0.3);
      else offset.multiplyScalar(command.action === 'in' ? 0.83 : 1.2).clampLength(orbit.minDistance, orbit.maxDistance);
      position = target.clone().add(offset);
    }
    if (reducedMotion) {
      camera.position.copy(position); orbit.target.copy(target); orbit.update(); goal.current = null;
    } else goal.current = { position, target };
    invalidate();
  }, [command, camera, invalidate, model, reducedMotion]);
  useFrame((_, delta) => {
    const orbit = controls.current, next = goal.current;
    if (!orbit || !next) return;
    const k = 1 - Math.exp(-delta * 8);
    camera.position.lerp(next.position, k);
    orbit.target.lerp(next.target, k);
    if (camera.position.distanceTo(next.position) < 0.004 && orbit.target.distanceTo(next.target) < 0.004) {
      camera.position.copy(next.position); orbit.target.copy(next.target); goal.current = null;
    }
    orbit.update();
    invalidate();
  });
  return null;
}

function HeroRig({ model, reducedMotion }: { model: SentinelModelDefinition; reducedMotion: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const pose = model.cameras.hero;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    // Touch drags must keep scrolling the page, so orbiting is offered to fine pointers only.
    if (!window.matchMedia('(pointer: fine)').matches) { invalidate(); return; }
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.target.set(...pose.target);
    orbit.update();
    const polar = orbit.getPolarAngle();
    Object.assign(orbit, { enableZoom: false, enablePan: false, enableDamping: !reducedMotion, dampingFactor: 0.07, rotateSpeed: 0.5, minPolarAngle: polar - 0.25, maxPolarAngle: polar + 0.18 });
    const changed = () => invalidate();
    orbit.addEventListener('change', changed);
    orbit.update();
    return () => { orbit.removeEventListener('change', changed); orbit.dispose(); controls.current = null; };
  }, [camera, gl, invalidate, model, reducedMotion]);
  useFrame(() => { controls.current?.update(); });
  return null;
}

function HeroMotion({ children, reducedMotion, scrollProgress }: { children: ReactNode; reducedMotion: boolean; scrollProgress?: MutableRefObject<number> }) {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (reducedMotion) return;
    const move = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [reducedMotion]);
  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    if (reducedMotion) { node.rotation.set(0, 0, 0); node.position.y = 0; return; }
    const progress = scrollProgress?.current ?? 0;
    const sway = Math.sin(state.clock.elapsedTime * 0.21) * 0.14;
    node.rotation.y = MathUtils.damp(node.rotation.y, sway + pointer.current.x * 0.32 + progress * 1.15, 2.6, delta);
    node.rotation.x = MathUtils.damp(node.rotation.x, pointer.current.y * 0.035, 2.6, delta);
    node.position.y = MathUtils.damp(node.position.y, progress * -0.9, 3, delta);
  });
  return <group ref={group}>{children}</group>;
}

function seeded(seed: number) {
  let value = seed;
  return () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; };
}

function Motes({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const random = seeded(42);
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      values[i * 3] = (random() - 0.5) * 16;
      values[i * 3 + 1] = random() * 9 - 0.4;
      values[i * 3 + 2] = (random() - 0.5) * 12 - 2;
    }
    return values;
  }, [count]);
  useFrame((state, delta) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y += delta * 0.012;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.18;
  });
  return <points ref={ref} raycast={() => null}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial size={0.05} color="#e4dcff" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
  </points>;
}

/** A baked radial falloff; cheaper than a rendered shadow pass and steady on demand frameloops. */
function ContactShadow({ radius }: { radius: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      const falloff = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      falloff.addColorStop(0, 'rgba(8, 6, 26, 0.62)');
      falloff.addColorStop(0.3, 'rgba(8, 6, 26, 0.34)');
      falloff.addColorStop(0.7, 'rgba(8, 6, 26, 0.08)');
      falloff.addColorStop(1, 'rgba(8, 6, 26, 0)');
      context.fillStyle = falloff;
      context.fillRect(0, 0, 128, 128);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={-1}>
    <planeGeometry args={[radius * 2, radius * 2]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>;
}

function Hotspots({ model, hotspots, activePart, onHover, onSelect, compact }: {
  model: SentinelModelDefinition; hotspots: SentinelHotspot[]; activePart: SentinelPartId | null;
  onHover?: (part: SentinelPartId | null) => void; onSelect?: (part: SentinelPartId) => void; compact: boolean;
}) {
  return <>{hotspots.map(spot => {
    const anchor = model.parts[spot.part]?.anchor;
    if (!anchor) return null;
    const active = activePart === spot.part;
    return <Html key={spot.part} position={[...anchor]} zIndexRange={[30, 10]} className="sentinel-hotspot-host">
      <button
        type="button"
        className={`sentinel-hotspot${compact ? ' sentinel-hotspot--compact' : ''}`}
        data-active={active}
        data-tone={spot.tone}
        aria-pressed={active}
        aria-label={`${spot.label}: ${spot.value}`}
        onPointerEnter={() => onHover?.(spot.part)}
        onPointerLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(spot.part)}
        onBlur={() => onHover?.(null)}
        onClick={() => onSelect?.(spot.part)}
      >
        <span className="sentinel-hotspot-dot" aria-hidden="true" />
        <span className="sentinel-hotspot-label" aria-hidden="true"><span>{spot.label}</span><strong>{spot.value}</strong></span>
      </button>
    </Html>;
  })}</>;
}

/** Renders the registered Sentinel model as the large hero or the compact operator inspector. */
export function SentinelStage({
  variant, cutoutStatus, label, model = activeSentinelModel, detail = 'full', reducedMotion = false, activePart = null,
  hotspots = [], command, scrollProgress, paused = false, onPartHover, onPartSelect, onContextLost,
}: SentinelStageProps) {
  const ModelComponent = model.Component;
  const hero = variant === 'hero';
  const pose = model.cameras[variant];
  const animate = hero && !reducedMotion && !paused;
  const pointerPart = (event: ThreeEvent<PointerEvent | MouseEvent>) => { event.stopPropagation(); return partFromObject(event.object); };
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return <Canvas
    className={`sentinel-canvas sentinel-canvas--${variant}`}
    frameloop={paused ? 'never' : animate ? 'always' : 'demand'}
    dpr={detail === 'low' ? 1 : hero ? [1, 1.75] : [1, 1.5]}
    camera={{ position: [...pose.position], fov: pose.fov, near: 0.1, far: 80 }}
    gl={{ antialias: detail !== 'low', alpha: true, powerPreference: hero ? 'default' : 'low-power' }}
    aria-label={label}
    role="img"
  >
    {hero ? <>
      <ambientLight intensity={0.85} color="#c4b8f4" />
      <hemisphereLight args={['#d2c6ff', '#241d52', 1.7]} />
      <directionalLight position={[6, 8, 7]} intensity={2.7} color="#ffe4c8" />
      <directionalLight position={[-6, 5, -6]} intensity={3.4} color="#9372ff" />
      <directionalLight position={[0, 2, 8]} intensity={0.6} color="#ffffff" />
    </> : <>
      <ambientLight intensity={1.4} />
      <hemisphereLight args={['#dcd4ff', '#3e3a52', 2]} />
      <directionalLight position={[5, 9, 6]} intensity={3} />
      <directionalLight position={[-4, 4, -3]} intensity={1.3} color="#b8a8ff" />
    </>}
    <HeroMotion reducedMotion={!hero || reducedMotion} scrollProgress={scrollProgress}>
      <group
        onPointerOver={event => { const part = pointerPart(event); if (part) { document.body.style.cursor = 'pointer'; onPartHover?.(part); } }}
        onPointerOut={event => { event.stopPropagation(); document.body.style.cursor = ''; onPartHover?.(null); }}
        onClick={event => { const part = pointerPart(event); if (part) onPartSelect?.(part); }}
      >
        <ModelComponent cutoutStatus={cutoutStatus} detail={detail} reducedMotion={reducedMotion} activePart={activePart} />
      </group>
      {hotspots.length ? <Hotspots model={model} hotspots={hotspots} activePart={activePart} onHover={onPartHover} onSelect={onPartSelect} compact={!hero} /> : null}
    </HeroMotion>
    {hero ? <Motes count={detail === 'low' ? 90 : 220} reducedMotion={reducedMotion} /> : <ContactShadow radius={2.4} />}
    {hero ? <HeroRig model={model} reducedMotion={reducedMotion} /> : <InspectorRig model={model} command={command} reducedMotion={reducedMotion} />}
    <ContextGuard onContextLost={onContextLost} />
  </Canvas>;
}
