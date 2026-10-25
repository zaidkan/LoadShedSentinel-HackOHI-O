import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { Box3, MathUtils, Matrix4, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4, type PerspectiveCamera } from 'three';
import { OVERVIEW_SHOT, PART_STAGING, type CameraShot, type SentinelFocus } from './parts';
import type { SentinelMode } from './Stage';

CameraControlsImpl.install({ THREE: { Box3, MathUtils: { clamp: MathUtils.clamp }, Matrix4, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4 } });
const { ACTION } = CameraControlsImpl;

export interface Director {
  goTo(focus: SentinelFocus, options?: { instant?: boolean; smoothTime?: number }): void;
  orbit(direction: -1 | 1): void;
  zoom(direction: -1 | 1): void;
}

/** Where the subject should sit in normalised view space (-1…1, +x right, +y up); hero layouts push it clear of copy. */
export interface SubjectOffset { x: number; y: number }

const SMOOTH = { interaction: 0.32, transition: 0.8, intro: 1.7, recompose: 1.6 } as const;
const HERO_RECOMPOSE_AFTER = 9;

export function shotFor(mode: SentinelMode, focus: SentinelFocus): CameraShot {
  return focus === 'overview' ? OVERVIEW_SHOT[mode] : PART_STAGING[focus].shot;
}

export function framePose(shot: CameraShot, fov: number, aspect: number, offset: SubjectOffset = { x: 0, y: 0 }) {
  const vHalf = MathUtils.degToRad(fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const usable = Math.min(Math.atan(Math.tan(vHalf) * (1 - Math.abs(offset.y))), Math.atan(Math.tan(hHalf) * (1 - Math.abs(offset.x))));
  const distance = shot.radius / Math.sin(usable);
  const position = new Vector3().setFromSphericalCoords(distance, shot.polar, shot.azimuth).add(new Vector3(...shot.target));
  return {
    position, target: new Vector3(...shot.target), distance,
    // camera-controls applies focal offset Y inverted (+Y moves the camera down).
    focal: new Vector2(-offset.x * distance * Math.tan(hHalf), offset.y * distance * Math.tan(vHalf)),
  };
}

interface CameraDirectorProps {
  mode: SentinelMode;
  focus: SentinelFocus;
  reducedMotion: boolean;
  intro: boolean;
  interactive: boolean;
  subjectOffset?: SubjectOffset;
  directorRef: MutableRefObject<Director | null>;
  onIntroComplete?: () => void;
}

export function CameraDirector({ mode, focus, reducedMotion, intro, interactive, subjectOffset, directorRef, onIntroComplete }: CameraDirectorProps) {
  const camera = useThree(state => state.camera) as PerspectiveCamera;
  const gl = useThree(state => state.gl);
  const invalidate = useThree(state => state.invalidate);
  const size = useThree(state => state.size);
  const controls = useMemo(() => new CameraControlsImpl(camera), [camera]);
  const live = useRef({ focus, offset: subjectOffset, userControlled: false, lastInteraction: 0, introDone: !intro || reducedMotion, swayStart: 0 });
  live.current.focus = focus;
  live.current.offset = subjectOffset;
  const introCallback = useRef(onIntroComplete);
  introCallback.current = onIntroComplete;

  useEffect(() => {
    controls.connect(gl.domElement);
    controls.draggingSmoothTime = 0.12;
    controls.smoothTime = SMOOTH.interaction;
    controls.minDistance = 0.5;
    controls.maxDistance = mode === 'hero' ? 11 : 15;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.95;
    controls.azimuthRotateSpeed = 0.6;
    controls.polarRotateSpeed = 0.5;
    controls.dollySpeed = 0.55;
    controls.truckSpeed = 1;
    controls.restThreshold = 0.003;
    controls.dollyToCursor = mode === 'inspection';
    controls.setBoundary(new Box3(new Vector3(-1.6, 4.4, -1.6), new Vector3(1.6, 10, 1.6)));
    const inspect = mode === 'inspection' && interactive;
    controls.mouseButtons.left = interactive ? ACTION.ROTATE : ACTION.NONE;
    controls.mouseButtons.right = inspect ? ACTION.TRUCK : ACTION.NONE;
    controls.mouseButtons.middle = inspect ? ACTION.DOLLY : ACTION.NONE;
    controls.mouseButtons.wheel = inspect ? ACTION.DOLLY : ACTION.NONE;
    controls.touches.one = interactive ? ACTION.TOUCH_ROTATE : ACTION.NONE;
    controls.touches.two = inspect ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.NONE;
    controls.touches.three = ACTION.NONE;
    // Hero sits in a scrolling page: leave wheel and vertical touch pans to the document,
    // so one-finger drags only orbit horizontally there.
    if (mode === 'hero') gl.domElement.style.touchAction = 'pan-y';
    const started = () => { live.current.userControlled = true; live.current.lastInteraction = performance.now(); controls.smoothTime = SMOOTH.interaction; };
    const wheel = () => { if (inspect) started(); };
    const rested = () => { controls.smoothTime = SMOOTH.interaction; };
    controls.addEventListener('controlstart', started);
    controls.addEventListener('control', started);
    controls.addEventListener('rest', rested);
    gl.domElement.addEventListener('wheel', wheel, { passive: true });
    return () => {
      controls.removeEventListener('controlstart', started);
      controls.removeEventListener('control', started);
      controls.removeEventListener('rest', rested);
      gl.domElement.removeEventListener('wheel', wheel);
      controls.disconnect();
    };
  }, [controls, gl, interactive, mode]);

  useEffect(() => () => controls.dispose(), [controls]);

  const director = useMemo<Director>(() => ({
    goTo(target, options = {}) {
      const instant = options.instant || reducedMotion;
      const pose = framePose(shotFor(mode, target), camera.fov, camera.aspect, live.current.offset);
      controls.smoothTime = options.smoothTime ?? SMOOTH.transition;
      live.current.userControlled = false;
      live.current.swayStart = performance.now();
      void controls.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, !instant);
      void controls.setFocalOffset(pose.focal.x, pose.focal.y, 0, !instant);
      invalidate();
    },
    orbit(direction) {
      live.current.userControlled = true; live.current.lastInteraction = performance.now();
      controls.smoothTime = 0.45;
      void controls.rotate(direction * 0.42, 0, !reducedMotion);
      invalidate();
    },
    zoom(direction) {
      live.current.userControlled = true; live.current.lastInteraction = performance.now();
      controls.smoothTime = 0.45;
      void controls.dolly(direction * controls.distance * 0.22, !reducedMotion);
      invalidate();
    },
  }), [camera, controls, invalidate, mode, reducedMotion]);

  useEffect(() => { directorRef.current = director; return () => { if (directorRef.current === director) directorRef.current = null; }; }, [director, directorRef]);

  // Runs once per camera rig. Later focus and framing changes are handled by the effects below.
  const opening = useRef({ director, mode, intro: !live.current.introDone });
  useEffect(() => {
    const { director: rig, mode: openingMode, intro: playIntro } = opening.current;
    const l = live.current;
    const home = shotFor(openingMode, l.focus);
    if (!playIntro) {
      rig.goTo(l.focus, { instant: true });
      l.introDone = true;
      introCallback.current?.();
      return undefined;
    }
    const hero = openingMode === 'hero';
    const start = framePose({ ...home, azimuth: home.azimuth + (hero ? 0.95 : 0.35), polar: home.polar + (hero ? 0.18 : 0.08), radius: home.radius * (hero ? 1.55 : 1.18) }, camera.fov, camera.aspect, l.offset);
    const settled = framePose(home, camera.fov, camera.aspect, l.offset);
    void controls.setLookAt(start.position.x, start.position.y, start.position.z, start.target.x, start.target.y - (hero ? 0.5 : 0.15), start.target.z, false);
    void controls.setFocalOffset(settled.focal.x, settled.focal.y, 0, false);
    controls.update(0);
    rig.goTo(l.focus, { smoothTime: hero ? SMOOTH.intro : SMOOTH.transition * 0.9 });
    const timer = window.setTimeout(() => { l.introDone = true; introCallback.current?.(); }, hero ? 1900 : 900);
    return () => window.clearTimeout(timer);
  }, [camera, controls]);

  const firstFocus = useRef(true);
  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    director.goTo(focus);
  }, [director, focus]);

  const offsetKey = subjectOffset ? `${subjectOffset.x},${subjectOffset.y}` : '0,0';
  const lastFrame = useRef({ width: size.width, height: size.height, offsetKey });
  useEffect(() => {
    const previous = lastFrame.current;
    lastFrame.current = { width: size.width, height: size.height, offsetKey };
    const resized = previous.width !== size.width || previous.height !== size.height;
    if (!resized && previous.offsetKey === offsetKey) return;
    if (!live.current.userControlled && live.current.introDone) director.goTo(live.current.focus, resized ? { instant: true } : undefined);
  }, [director, offsetKey, size.height, size.width]);

  useFrame((state, delta) => {
    const l = live.current;
    if (mode === 'hero' && !reducedMotion && l.introDone) {
      const now = performance.now();
      if (l.userControlled && now - l.lastInteraction > HERO_RECOMPOSE_AFTER * 1000) director.goTo(l.focus, { smoothTime: SMOOTH.recompose });
      if (!l.userControlled) {
        const shot = shotFor(mode, l.focus);
        const t = (now - l.swayStart) / 1000;
        const ease = MathUtils.smoothstep(t, 0, 4);
        void controls.rotateTo(shot.azimuth + ease * 0.075 * Math.sin(t * 0.2), shot.polar + ease * 0.022 * Math.sin(t * 0.15), true);
      }
    }
    if (controls.update(Math.min(delta, 1 / 20))) state.invalidate();
  }, -1);

  return null;
}
