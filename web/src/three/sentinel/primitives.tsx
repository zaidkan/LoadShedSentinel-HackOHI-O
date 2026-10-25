import { createContext, useContext, useEffect, useLayoutEffect, useMemo, type ReactNode, type RefObject } from 'react';
import { CatmullRomCurve3, LatheGeometry, Mesh, Quaternion, TubeGeometry, Vector2, Vector3, type Group, type Material, type Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Vec3 } from './layout';
import { MaterialKit, type Highlight } from './materials';

export type Detail = 'high' | 'low';
const DetailContext = createContext<Detail>('high');

export function DetailProvider({ detail, children }: { detail: Detail; children: ReactNode }) {
  return <DetailContext.Provider value={detail}>{children}</DetailContext.Provider>;
}

/** Segment budget for the active detail level; low detail keeps silhouettes but drops facets. */
export function useSegments() {
  const detail = useContext(DetailContext);
  return useMemo(() => ({ detail, seg: (high: number, min = 6) => detail === 'high' ? high : Math.max(min, Math.round(high / 2.5)) }), [detail]);
}

export function useKit(highlight: Highlight) {
  const kit = useMemo(() => new MaterialKit(highlight), [highlight]);
  useEffect(() => () => kit.dispose(), [kit]);
  return kit;
}

/** Applies shadow flags to every mesh in a part once it has rendered. */
export function useShadowFlags(ref: RefObject<Object3D>, cast = true) {
  const { detail } = useSegments();
  useLayoutEffect(() => {
    const enabled = detail === 'high';
    ref.current?.traverse(child => {
      if ((child as Mesh).isMesh && !child.userData.noShadow) { child.castShadow = enabled && cast; child.receiveShadow = enabled; }
    });
  });
}

function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: unknown[]) {
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

export function RBox({ size, radius, segments = 3, material, position, rotation, name }: { size: Vec3; radius: number; segments?: number; material: Material; position?: Vec3; rotation?: Vec3; name?: string }) {
  const { detail } = useSegments();
  const steps = detail === 'high' ? segments : 1;
  const geometry = useDisposable(() => new RoundedBoxGeometry(size[0], size[1], size[2], steps, radius), [size[0], size[1], size[2], steps, radius]);
  return <mesh name={name} geometry={geometry} material={material} position={position} rotation={rotation} />;
}

export function Lathe({ profile, material, position, rotation, segments = 40, name }: { profile: Array<[number, number]>; material: Material; position?: Vec3; rotation?: Vec3; segments?: number; name?: string }) {
  const { seg } = useSegments();
  const count = seg(segments, 10);
  const key = profile.flat().join(',');
  const geometry = useDisposable(() => new LatheGeometry(profile.map(([r, y]) => new Vector2(Math.max(r, 0.0001), y)), count), [key, count]);
  return <mesh name={name} geometry={geometry} material={material} position={position} rotation={rotation} />;
}

const up = new Vector3(0, 1, 0);

/** Cylinder or bar stretched between two points. */
export function Strut({ from, to, radius, material, shape = 'cylinder', width, segments = 12 }: { from: Vec3; to: Vec3; radius: number; material: Material; shape?: 'cylinder' | 'bar'; width?: number; segments?: number }) {
  const { seg } = useSegments();
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to);
    const direction = b.clone().sub(a);
    return { position: a.add(b).multiplyScalar(0.5), quaternion: new Quaternion().setFromUnitVectors(up, direction.clone().normalize()), length: direction.length() };
  }, [from, to]);
  return <mesh position={position} quaternion={quaternion} material={material}>
    {shape === 'bar' ? <boxGeometry args={[width ?? radius * 2, length, radius * 2]} /> : <cylinderGeometry args={[radius, radius, length, seg(segments, 5), 1]} />}
  </mesh>;
}

/** Flexible cable or conductor through control points (centripetal Catmull-Rom). */
export function Cable({ points, radius, material, tubular = 64, radial = 8, name }: { points: Vec3[]; radius: number; material: Material; tubular?: number; radial?: number; name?: string }) {
  const { seg } = useSegments();
  const tubularSegments = seg(tubular, 16), radialSegments = seg(radial, 4);
  const key = points.flat().map(v => v.toFixed(4)).join(',');
  const geometry = useDisposable(() => {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)), false, 'centripetal');
    return new TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  }, [key, radius, tubularSegments, radialSegments]);
  return <mesh name={name} geometry={geometry} material={material} />;
}

/** Points for an overhead span sagging away from a support at `origin`, along Z. */
export function spanPoints(origin: Vec3, near: number, far: number, sag: number, span = 40, steps = 24): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const z = near + ((far - near) * i) / steps;
    const t = Math.abs(z) / span;
    points.push([origin[0], origin[1] - 4 * sag * t * (1 - t), origin[2] + z]);
  }
  return points;
}

/** Hex nut / bolt head. */
export function Hex({ position, rotation, radius = 0.014, height = 0.01, material }: { position: Vec3; rotation?: Vec3; radius?: number; height?: number; material: Material }) {
  return <mesh position={position} rotation={rotation} material={material}><cylinderGeometry args={[radius, radius, height, 6]} /></mesh>;
}

export interface PartProps { highlight: Highlight }
export type GroupRef = RefObject<Group>;
