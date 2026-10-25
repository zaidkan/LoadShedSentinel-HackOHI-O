import { Component, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { NeutralToneMapping } from 'three';
import type { CutoutStatus } from '../../../../contracts/types';
import { CameraDirector, type Director, type SubjectOffset } from './CameraDirector';
import { Hotspots } from './Hotspots';
import { useInView, useReducedMotion } from './hooks';
import type { SentinelFocus, SentinelPartId } from './parts';
import { DetailProvider, type Detail } from './primitives';
import { SentinelAssembly } from './SentinelAssembly';
import type { NodeLink } from './parts/SentinelNode';
import { Stage, type SentinelMode } from './Stage';
import './sentinel.css';

export type SentinelUnavailableReason = 'context-lost' | 'renderer-error';

export interface SentinelSceneProps {
  /** `hero`: immersive, page-scroll friendly, presentation lighting. `inspection`: technical dashboard view. */
  mode: SentinelMode;
  focus: SentinelFocus;
  onFocusChange?: (focus: SentinelFocus) => void;
  /** Reported cutout state. Omit for presentation; the installed configuration is drawn without status styling. */
  cutoutStatus?: CutoutStatus;
  /** Modeled node link state for the light bar. Omit for presentation. */
  link?: NodeLink;
  detail?: Detail;
  intro?: boolean;
  hotspots?: boolean;
  interactive?: boolean;
  subjectOffset?: SubjectOffset;
  reducedMotion?: boolean;
  label: string;
  className?: string;
  onUnavailable?: (reason: SentinelUnavailableReason) => void;
  onIntroComplete?: () => void;
}

export interface SentinelSceneHandle {
  reset(): void;
  orbit(direction: -1 | 1): void;
  zoom(direction: -1 | 1): void;
}

const EXPOSURE: Record<SentinelMode, number> = { hero: 1, inspection: 1.08 };

class RendererBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function ContextWatcher({ onLost }: { onLost: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}

/** Fades the render up from black on first load, like studio lights coming on. */
function IntroExposure({ play, exposure, duration }: { play: boolean; exposure: number; duration: number }) {
  const gl = useThree(state => state.gl);
  const start = useRef<number | null>(null);
  const done = useRef(!play);
  const initial = useRef(play ? 0 : exposure);
  useLayoutEffect(() => { gl.toneMappingExposure = initial.current; }, [gl]);
  useFrame(state => {
    if (done.current) { gl.toneMappingExposure = exposure; return; }
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / duration);
    gl.toneMappingExposure = exposure * (1 - Math.pow(1 - t, 3));
    if (t >= 1) done.current = true;
    state.invalidate();
  });
  return null;
}

export const SentinelScene = forwardRef<SentinelSceneHandle, SentinelSceneProps>(function SentinelScene(props, ref) {
  const { mode, focus, onFocusChange, cutoutStatus, link, detail = 'high', intro = true, hotspots = true, interactive = true, subjectOffset, label, className, onUnavailable, onIntroComplete } = props;
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = props.reducedMotion ?? systemReducedMotion;
  const container = useRef<HTMLDivElement>(null);
  const visible = useInView(container);
  const director = useRef<Director | null>(null);
  const [ready, setReady] = useState(!intro || reducedMotion);
  const [constrained, setConstrained] = useState(false);
  const hero = mode === 'hero';
  // The intro plays once per mount; re-creating the renderer (detail toggle) must not replay it.
  const introPlayed = useRef(false);
  const playIntro = intro && !reducedMotion && !introPlayed.current;

  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;
  const [onLost] = useState(() => () => unavailable.current?.('context-lost'));
  const [onError] = useState(() => () => unavailable.current?.('renderer-error'));
  const introComplete = useRef(onIntroComplete);
  introComplete.current = onIntroComplete;
  const handleIntroComplete = useCallback(() => { introPlayed.current = true; setReady(true); introComplete.current?.(); }, []);
  const select = useCallback((part: SentinelPartId) => onFocusChange?.(part), [onFocusChange]);

  useImperativeHandle(ref, () => ({
    reset() { director.current?.goTo('overview'); onFocusChange?.('overview'); },
    orbit(direction) { director.current?.orbit(direction); },
    zoom(direction) { director.current?.zoom(direction); },
  }), [onFocusChange]);

  const frameloop = !visible ? 'never' : hero && !reducedMotion ? 'always' : 'demand';
  const dpr: [number, number] | number = detail === 'low' ? 1 : constrained ? [1, 1.25] : hero ? [1, 2] : [1, 1.75];

  return <div ref={container} className={['sentinel-scene', `sentinel-scene-${mode}`, className].filter(Boolean).join(' ')} data-ready={ready} data-detail={detail}>
    <RendererBoundary onError={onError}>
      <Canvas
        key={detail}
        frameloop={frameloop}
        shadows={detail === 'high' ? 'soft' : false}
        dpr={dpr}
        camera={{ fov: hero ? 30 : 34, near: 0.1, far: 90, position: [6, 7.5, 8] }}
        gl={{ antialias: detail === 'high', alpha: true, powerPreference: hero ? 'high-performance' : 'default', toneMapping: NeutralToneMapping }}
        role="img"
        aria-label={label}
      >
        <DetailProvider detail={detail}>
          <ContextWatcher onLost={onLost} />
          <IntroExposure play={playIntro} exposure={EXPOSURE[mode]} duration={hero ? 1.6 : 0.7} />
          <Stage mode={mode} detail={detail} />
          <SentinelAssembly mode={mode} focus={focus} cutoutStatus={cutoutStatus} link={link} reducedMotion={reducedMotion} interactive={interactive} igniteDelay={playIntro ? (hero ? 1.1 : 0.4) : 0} onSelect={select} />
          <CameraDirector mode={mode} focus={focus} reducedMotion={reducedMotion} intro={playIntro} interactive={interactive} subjectOffset={subjectOffset} directorRef={director} onIntroComplete={handleIntroComplete} />
          {hotspots ? <Hotspots focus={focus} ready={ready} onSelect={select} variant={mode} /> : null}
          {hero && detail === 'high' ? <PerformanceMonitor onDecline={() => setConstrained(true)} /> : null}
        </DetailProvider>
      </Canvas>
    </RendererBoundary>
  </div>;
});

export default SentinelScene;
