import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import type { CutoutStatus } from '../../../contracts/types';
import { CUTOUT_VISUAL } from './visual-state';

export function WoodPole({ lowPoly = false }: { lowPoly?: boolean }) {
  return <group name="wood-pole">
    <mesh position={[0, 3, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.14, 0.23, 6, lowPoly ? 8 : 20]} />
      <meshStandardMaterial color="#8c7156" roughness={0.95} />
    </mesh>
    {!lowPoly && [-0.09, 0, 0.08].map((x, i) => <mesh key={x} position={[x, 3.1, 0.182 - i * 0.012]}>
      <boxGeometry args={[0.009, 5.55 - i * 0.23, 0.007]} /><meshStandardMaterial color="#6e5945" roughness={1} />
    </mesh>)}
    <mesh position={[0, 5.45, 0]} castShadow><boxGeometry args={[2.9, 0.17, 0.2]} /><meshStandardMaterial color="#9a8060" roughness={0.95} /></mesh>
    {[-1.12, 0, 1.12].map(x => <group key={x} position={[x, 5.63, 0]}>
      <Insulator lowPoly={lowPoly} />
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 8, 5]} /><meshStandardMaterial color="#727d87" metalness={0.5} roughness={0.7} /></mesh>
    </group>)}
    <mesh position={[0, 4.7, 0]} rotation={[0, 0, 0.65]}><boxGeometry args={[0.07, 1.1, 0.07]} /><meshStandardMaterial color="#566a77" metalness={0.6} roughness={0.6} /></mesh>
  </group>;
}

function Insulator({ lowPoly = false }: { lowPoly?: boolean }) {
  return <group>
    <mesh><cylinderGeometry args={[0.055, 0.055, 0.28, lowPoly ? 6 : 16]} /><meshStandardMaterial color="#c6d1d6" roughness={0.4} /></mesh>
    {[-0.08, 0, 0.08].map(y => <mesh key={y} position={[0, y, 0]}>
      <cylinderGeometry args={[0.1, 0.08, 0.035, lowPoly ? 6 : 16]} /><meshStandardMaterial color="#d7dfe0" roughness={0.3} />
    </mesh>)}
  </group>;
}

export function Transformer({ lowPoly = false }: { lowPoly?: boolean }) {
  const segments = lowPoly ? 10 : 32;
  return <group name="gray-transformer" position={[0.65, 3.75, 0.25]}>
    <mesh castShadow receiveShadow><cylinderGeometry args={[0.53, 0.53, 1.36, segments]} /><meshStandardMaterial color="#a6adb0" roughness={0.42} metalness={0.45} /></mesh>
    {[-0.68, 0.68].map(y => <mesh key={y} position={[0, y, 0]} castShadow><cylinderGeometry args={[0.56, 0.56, 0.07, segments]} /><meshStandardMaterial color="#c0c6c7" metalness={0.65} roughness={0.35} /></mesh>)}
    <mesh position={[0, 0.02, 0.535]}><boxGeometry args={[0.29, 0.2, 0.015]} /><meshStandardMaterial color="#65727b" metalness={0.7} roughness={0.45} /></mesh>
    <mesh position={[0, 0.02, 0.548]}><boxGeometry args={[0.18, 0.065, 0.008]} /><meshStandardMaterial color="#c6cccd" roughness={0.65} /></mesh>
    <group position={[0, 0.87, 0]}><Insulator lowPoly={lowPoly} /></group>
    {[-0.42, 0.42].map(y => <mesh key={y} position={[-0.37, y, -0.3]}><boxGeometry args={[0.6, 0.09, 0.12]} /><meshStandardMaterial color="#667683" metalness={0.7} roughness={0.45} /></mesh>)}
    {!lowPoly && [-0.24, -0.12, 0, 0.12, 0.24].map(x => <mesh key={x} position={[x, -0.15, 0.49]}><boxGeometry args={[0.025, 0.5, 0.06]} /><meshStandardMaterial color="#929da3" metalness={0.4} roughness={0.55} /></mesh>)}
  </group>;
}

export function CutoutSwitch({ status, reducedMotion = false, lowPoly = false }: { status: CutoutStatus; reducedMotion?: boolean; lowPoly?: boolean }) {
  const hinge = useRef<Group>(null);
  const previous = useRef(status);
  const angle = CUTOUT_VISUAL[status].angle;
  const initialAngle = useRef(angle ?? 0);
  useEffect(() => {
    if (hinge.current && angle !== null && (reducedMotion || previous.current === 'UNKNOWN')) hinge.current.rotation.z = angle;
    previous.current = status;
  }, [angle, reducedMotion, status]);
  useFrame((state, delta) => {
    if (!hinge.current || angle === null) return;
    const remaining = Math.abs(hinge.current.rotation.z - angle);
    hinge.current.rotation.z = reducedMotion || remaining < 0.001 ? angle : MathUtils.damp(hinge.current.rotation.z, angle, 9, delta);
    if (remaining > 0.001) state.invalidate();
  });
  return <group name={`cutout-${status.toLowerCase()}`} position={[-0.65, 4.6, 0.3]}>
    <mesh position={[0.22, 0, -0.15]}><boxGeometry args={[0.6, 0.08, 0.1]} /><meshStandardMaterial color="#718592" metalness={0.6} roughness={0.5} /></mesh>
    {[-0.38, 0.38].map(y => <group key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><Insulator lowPoly={lowPoly} /></group>)}
    {status === 'UNKNOWN' ? <mesh name="position-unavailable" position={[0, 0, 0.2]}>
      <octahedronGeometry args={[0.2, 0]} /><meshStandardMaterial color={CUTOUT_VISUAL.UNKNOWN.color} wireframe />
    </mesh> : <group ref={hinge} name="fuse-hinge" position={[0, -0.38, 0.22]} rotation={[0, 0, initialAngle.current]}>
      <mesh position={[0, 0.36, 0]} castShadow><cylinderGeometry args={[0.044, 0.044, 0.72, lowPoly ? 6 : 14]} /><meshStandardMaterial color="#986e51" roughness={0.7} /></mesh>
      {[0, 0.72].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.06, 0.06, 0.09, 10]} /><meshStandardMaterial color="#c1c7c9" metalness={0.75} roughness={0.3} /></mesh>)}
      <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.049, 0.049, 0.12, 10]} /><meshStandardMaterial color={CUTOUT_VISUAL[status].color} roughness={0.6} /></mesh>
    </group>}
  </group>;
}

export function SensorPod({ lowPoly = false }: { lowPoly?: boolean }) {
  return <group name="sensor-pod" position={[-0.32, 2.9, 0.2]}>
    <mesh castShadow><boxGeometry args={[0.36, 0.52, 0.28]} /><meshStandardMaterial color="#d4d9d8" roughness={0.65} metalness={0.15} /></mesh>
    <mesh position={[0, 0, 0.15]}><boxGeometry args={[0.29, 0.41, 0.02]} /><meshStandardMaterial color="#456873" roughness={0.6} /></mesh>
    <mesh position={[0.11, 0.4, 0]}><cylinderGeometry args={[0.015, 0.015, 0.28, lowPoly ? 4 : 8]} /><meshStandardMaterial color="#323d49" roughness={0.7} /></mesh>
    <mesh position={[0, -0.39, 0]}><boxGeometry args={[0.25, 0.17, 0.22]} /><meshStandardMaterial color="#6e7e89" roughness={0.6} /></mesh>
  </group>;
}

export function SolarPanel() {
  return <group name="solar-panel" position={[0.1, 2.25, 0.55]} rotation={[-0.52, 0, 0]}>
    <mesh castShadow><boxGeometry args={[0.95, 0.63, 0.06]} /><meshStandardMaterial color="#adb9bd" metalness={0.75} roughness={0.35} /></mesh>
    <mesh position={[0, 0, 0.035]}><boxGeometry args={[0.87, 0.55, 0.015]} /><meshStandardMaterial color="#233e61" roughness={0.35} metalness={0.2} /></mesh>
    {[-0.29, -0.145, 0, 0.145, 0.29].map(x => <mesh key={x} position={[x, 0, 0.047]}><boxGeometry args={[0.009, 0.54, 0.003]} /><meshStandardMaterial color="#6483a1" roughness={0.6} /></mesh>)}
    {[-0.14, 0.14].map(y => <mesh key={y} position={[0, y, 0.048]}><boxGeometry args={[0.86, 0.008, 0.003]} /><meshStandardMaterial color="#6483a1" roughness={0.6} /></mesh>)}
  </group>;
}

/** Illustrative geometry, not a surveyed installation or a construction model. */
export function HardwareModel(props: { status: CutoutStatus; reducedMotion?: boolean; lowPoly?: boolean }) {
  return <group name="illustrative-pole-assembly"><WoodPole lowPoly={props.lowPoly} /><Transformer lowPoly={props.lowPoly} /><CutoutSwitch {...props} /><SensorPod lowPoly={props.lowPoly} /><SolarPanel /></group>;
}
