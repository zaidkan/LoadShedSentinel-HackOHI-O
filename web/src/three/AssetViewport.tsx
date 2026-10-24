import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Vector3 } from 'three';
import type { CutoutStatus } from '../../../contracts/types';
import { HardwareModel } from './HardwareModel';
import { CAMERA_HOME, CUTOUT_VISUAL } from './visual-state';
import { PoleDiagram } from './PoleDiagram';
import { UtilityIcon } from '../components/utility/UtilityIcon';

type CameraAction = 'reset' | 'left' | 'right' | 'in' | 'out' | 'cutout';
interface CameraCommand { action: CameraAction; sequence: number }

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function CameraRig({ command, onContextLost }: { command: CameraCommand; onContextLost: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.target.set(...CAMERA_HOME.target); orbit.minDistance = 2; orbit.maxDistance = 15;
    orbit.minPolarAngle = 0.25; orbit.maxPolarAngle = Math.PI * 0.78;
    orbit.enablePan = false; orbit.enableDamping = false;
    const changed = () => invalidate();
    orbit.addEventListener('change', changed); orbit.update();
    const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => { orbit.removeEventListener('change', changed); orbit.dispose(); controls.current = null; gl.domElement.removeEventListener('webglcontextlost', lost); };
  }, [camera, gl, invalidate, onContextLost]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    if (command.action === 'reset') { camera.position.set(...CAMERA_HOME.position); orbit.target.set(...CAMERA_HOME.target); }
    else if (command.action === 'cutout') { camera.position.set(2.5, 4.9, 5.6); orbit.target.set(-0.55, 4.35, 0.3); }
    else {
      const offset = camera.position.clone().sub(orbit.target);
      if (command.action === 'left' || command.action === 'right') offset.applyAxisAngle(new Vector3(0, 1, 0), command.action === 'left' ? -0.3 : 0.3);
      else offset.multiplyScalar(command.action === 'in' ? 0.83 : 1.2).clampLength(orbit.minDistance, orbit.maxDistance);
      camera.position.copy(orbit.target).add(offset);
    }
    orbit.update(); invalidate();
  }, [command, camera, invalidate]);
  return null;
}

class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onUnavailable(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function AssetViewport({ status, assetId }: { status: CutoutStatus; assetId: string }) {
  const [diagram, setDiagram] = useState(false);
  const [lowPoly, setLowPoly] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [rendererFailed, setRendererFailed] = useState(false);
  const [command, setCommand] = useState<CameraCommand>({ action: 'reset', sequence: 0 });
  const reducedMotion = useReducedMotion();
  useEffect(() => { setWebgl(typeof window.WebGL2RenderingContext === 'function'); }, []);
  // This callback is intentionally stable: camera controls keep their listeners across telemetry updates.
  const [onContextLost] = useState(() => () => setContextLost(true));
  const [onUnavailable] = useState(() => () => setRendererFailed(true));
  const send = (action: CameraAction) => setCommand(value => ({ action, sequence: value.sequence + 1 }));
  const graphicsUnavailable = !webgl || contextLost || rendererFailed;
  const useDiagram = diagram || graphicsUnavailable;
  const fallback = <div className="utility-scene-fallback"><PoleDiagram status={status} /><p role="status">3D is unavailable. The equipment diagram follows the same incident state.</p></div>;
  return <section className="utility-asset-panel" aria-labelledby="utility-asset-heading">
    <div className="utility-panel-heading">
      <div><h2 id="utility-asset-heading">Asset inspection</h2><p>Procedural equipment model · {assetId}</p></div>
      <span className="utility-badge utility-badge-neutral">Illustrative</span>
    </div>
    <div className="utility-scene" data-cutout-status={status}>
      <div className={`utility-cutout-readout utility-state-${status.toLowerCase()}`} aria-live="polite"><span className="utility-status-dot" /><span>Cutout <strong>{CUTOUT_VISUAL[status].label}</strong></span>{status === 'UNKNOWN' ? <small>Position not asserted</small> : null}</div>
      {useDiagram ? <><PoleDiagram status={status} />{!diagram && (contextLost || rendererFailed) ? <p className="utility-fallback-note" role="status">{contextLost ? 'Graphics context lost' : '3D unavailable'} · showing equipment diagram</p> : null}</> : <WebGLBoundary key={assetId} fallback={fallback} onUnavailable={onUnavailable}>
        <Canvas frameloop="demand" dpr={lowPoly ? 1 : [1, 1.5]} camera={{ position: [...CAMERA_HOME.position], fov: 42 }} gl={{ antialias: !lowPoly, powerPreference: 'low-power' }} fallback={fallback} aria-label={`Orbitable illustrative model for ${assetId}; cutout ${status.toLowerCase()}`}>
          <color attach="background" args={['#172838']} />
          <ambientLight intensity={1.5} /><hemisphereLight args={['#d4e7f5', '#4b4c45', 2]} />
          <directionalLight position={[5, 9, 6]} intensity={3} /><directionalLight position={[-4, 4, -3]} intensity={1.2} color="#b0d6e9" />
          <HardwareModel status={status} lowPoly={lowPoly} reducedMotion={reducedMotion} />
          <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.2, lowPoly ? 16 : 48]} /><meshStandardMaterial color="#23394a" roughness={1} /></mesh>
          <CameraRig command={command} onContextLost={onContextLost} />
        </Canvas>
      </WebGLBoundary>}
      {!useDiagram ? <div className="utility-scene-caption">Wood pole · transformer · protective cutout · sensor pod · solar panel</div> : null}
    </div>
    <div className="utility-viewport-tools">
      <div className="utility-tool-group" role="group" aria-label="Model camera controls">
        <button type="button" disabled={useDiagram} onClick={() => send('left')} aria-label="Orbit model left"><UtilityIcon kind="left" /></button>
        <button type="button" disabled={useDiagram} onClick={() => send('right')} aria-label="Orbit model right"><UtilityIcon kind="right" /></button>
        <button type="button" disabled={useDiagram} onClick={() => send('in')} aria-label="Zoom model in"><UtilityIcon kind="plus" /></button>
        <button type="button" disabled={useDiagram} onClick={() => send('out')} aria-label="Zoom model out"><UtilityIcon kind="minus" /></button>
        <button type="button" disabled={useDiagram} onClick={() => send('reset')}>Reset view</button>
        <button type="button" disabled={useDiagram} onClick={() => send('cutout')}>Inspect cutout</button>
      </div>
      <div className="utility-tool-group">
        <button type="button" aria-pressed={lowPoly} disabled={useDiagram} onClick={() => setLowPoly(value => !value)}>Low detail</button>
        <button type="button" aria-pressed={useDiagram} onClick={() => setDiagram(value => !value)} disabled={graphicsUnavailable}>2D diagram</button>
      </div>
    </div>
    <p className="utility-scene-help">{useDiagram ? 'Equipment diagram' : 'Drag to orbit · scroll to zoom · or use the camera buttons'}. No live switching controls. Geometry is illustrative.</p>
  </section>;
}
