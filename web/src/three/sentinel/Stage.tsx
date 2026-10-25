import { useEffect, useMemo, useRef } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { MeshBasicMaterial, type DirectionalLight } from 'three';
import { radialTexture } from './textures';
import type { Detail } from './primitives';

export type SentinelMode = 'hero' | 'inspection';

const SHADOW_TARGET: [number, number, number] = [0, 7.1, 0];

/**
 * Studio lighting for a product render: a local light-former environment for reflections
 * (no HDR files are fetched), a warm shadow-casting key, a cool rim and a soft fill.
 */
export function Stage({ mode, detail }: { mode: SentinelMode; detail: Detail }) {
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  useEffect(() => {
    for (const light of [key.current, rim.current]) {
      if (!light) continue;
      light.target.position.set(...SHADOW_TARGET);
      light.target.updateMatrixWorld();
    }
  }, []);
  const hero = mode === 'hero';
  const shadows = detail === 'high';
  return <>
    <Environment resolution={detail === 'high' ? 256 : 64} frames={1} environmentIntensity={hero ? 0.85 : 1}>
      <color attach="background" args={[hero ? '#0a121a' : '#132231']} />
      <Lightformer form="rect" intensity={hero ? 2.2 : 2.6} color="#f4f7fb" scale={[12, 5, 1]} position={[0, 9, 2]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={hero ? 3.2 : 2.4} color="#fff3e6" scale={[3, 9, 1]} position={[-7, 2, 5]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={hero ? 4 : 2.6} color="#bfe7ff" scale={[2, 10, 1]} position={[7, 1, -6]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.1} color="#9fc6dd" scale={[10, 2, 1]} position={[0, -4, 6]} target={[0, 0, 0]} />
      <Lightformer form="circle" intensity={hero ? 1.6 : 1.2} color="#ffffff" scale={3} position={[4, 4, 8]} target={[0, 0, 0]} />
    </Environment>
    <hemisphereLight args={['#d6e4f0', '#1a2129', hero ? 0.35 : 0.55]} />
    <directionalLight
      ref={key}
      position={[SHADOW_TARGET[0] - 4.5, SHADOW_TARGET[1] + 7, SHADOW_TARGET[2] + 7]}
      intensity={hero ? 2.6 : 2.3}
      color="#fff4e8"
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00025}
      shadow-normalBias={0.012}
      shadow-camera-left={-2.6}
      shadow-camera-right={2.6}
      shadow-camera-top={2.9}
      shadow-camera-bottom={-2.9}
      shadow-camera-near={1}
      shadow-camera-far={24}
    />
    <directionalLight ref={rim} position={[SHADOW_TARGET[0] + 6, SHADOW_TARGET[1] + 3, SHADOW_TARGET[2] - 7]} intensity={hero ? 2.2 : 1.3} color="#a8dcff" />
    <directionalLight position={[SHADOW_TARGET[0] + 5, SHADOW_TARGET[1] - 2, SHADOW_TARGET[2] + 6]} intensity={hero ? 0.35 : 0.5} color="#dfe9f2" />
    {mode === 'inspection' ? <InspectionFloor /> : null}
  </>;
}

/** A faint radial floor and ring grid so zoomed-out inspection views stay grounded. */
function InspectionFloor() {
  const floor = useMemo(() => new MeshBasicMaterial({ color: '#2b4658', alphaMap: radialTexture(), transparent: true, opacity: 0.55, depthWrite: false }), []);
  const rings = useMemo(() => new MeshBasicMaterial({ color: '#5d7f93', transparent: true, opacity: 0.22, depthWrite: false }), []);
  useEffect(() => () => { floor.dispose(); rings.dispose(); }, [floor, rings]);
  return <group name="inspection-floor" position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <mesh material={floor}><circleGeometry args={[3.2, 64]} /></mesh>
    {[0.6, 1.2, 1.8, 2.4].map(r => <mesh key={r} material={rings}><ringGeometry args={[r - 0.004, r + 0.004, 96]} /></mesh>)}
  </group>;
}
