import { useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import type { CutoutStatus } from '../../../contracts/types';
import { useMotion } from '../app/motion';
import { SentinelStage, WebGLBoundary, useWebGLSupport } from '../sentinel/SentinelStage';
import { activeSentinelModel } from '../sentinel/registry';
import type { CameraAction, CameraCommand, SentinelHotspot, SentinelPartId } from '../sentinel/types';
import { CUTOUT_VISUAL } from './visual-state';
import { PoleDiagram } from './PoleDiagram';

const FOCUS_PARTS: SentinelPartId[] = ['cutout', 'transformer', 'sensor-pod', 'solar-panel', 'crossarm'];

export interface AssetViewportProps {
  status: CutoutStatus;
  assetId: string;
  hotspots?: SentinelHotspot[];
}

/** Operator inspector. Camera and detail controls never mutate operational state. */
export function AssetViewport({ status, assetId, hotspots = [] }: AssetViewportProps) {
  const model = activeSentinelModel;
  const { reduced } = useMotion();
  const webgl = useWebGLSupport();
  const [diagram, setDiagram] = useState(false);
  const [lowPoly, setLowPoly] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [rendererFailed, setRendererFailed] = useState(false);
  const [command, setCommand] = useState<CameraCommand>({ action: 'reset', sequence: 0 });
  const [focused, setFocused] = useState<SentinelPartId | null>(null);
  const [hovered, setHovered] = useState<SentinelPartId | null>(null);
  // Stable callbacks: camera controls keep their listeners across telemetry updates.
  const [onContextLost] = useState(() => () => setContextLost(true));
  const [onUnavailable] = useState(() => () => setRendererFailed(true));
  const send = (action: CameraAction, part?: SentinelPartId) => {
    setFocused(action === 'focus' ? part ?? null : action === 'reset' ? null : focused);
    setCommand(value => ({ action, part, sequence: value.sequence + 1 }));
  };
  const graphicsUnavailable = !webgl || contextLost || rendererFailed;
  const useDiagram = diagram || graphicsUnavailable;
  const visual = CUTOUT_VISUAL[status];
  const fallback = <div className="inspector-fallback"><PoleDiagram status={status} /><p role="status">3D is unavailable. The equipment diagram follows the same incident state.</p></div>;
  return <section className="panel panel--night inspector" aria-labelledby="inspector-heading">
    <header className="panel-head">
      <div>
        <h2 id="inspector-heading" className="panel-title">Asset inspection</h2>
        <p className="panel-sub">{model.illustrative ? 'Illustrative equipment model' : model.name} · <span className="mono">{assetId}</span></p>
      </div>
      <span className="tag tag--night">{model.illustrative ? 'Illustrative geometry' : 'Hardware model'}</span>
    </header>
    <div className="inspector-scene" data-cutout-status={status}>
      <p className="inspector-readout" data-state={status.toLowerCase()} aria-live="polite">
        <span className="state" data-state={status.toLowerCase()}>Cutout {visual.label.toLowerCase()}</span>
        {status === 'UNKNOWN' ? <small>Position not asserted</small> : null}
      </p>
      {useDiagram ? <>
        <PoleDiagram status={status} />
        {!diagram && (contextLost || rendererFailed) ? <p className="inspector-note" role="status">{contextLost ? 'Graphics context lost' : '3D unavailable'} · showing equipment diagram</p> : null}
      </> : <WebGLBoundary key={assetId} fallback={fallback} onUnavailable={onUnavailable}>
        <SentinelStage
          variant="inspector"
          model={model}
          cutoutStatus={status}
          detail={lowPoly ? 'low' : 'full'}
          reducedMotion={reduced}
          command={command}
          hotspots={hotspots}
          activePart={hovered ?? focused}
          onPartHover={setHovered}
          onPartSelect={part => send('focus', part)}
          onContextLost={onContextLost}
          label={`Orbitable illustrative model for ${assetId}; cutout ${status.toLowerCase()}`}
        />
      </WebGLBoundary>}
    </div>
    <div className="inspector-tools">
      <div className="inspector-tool-group" role="group" aria-label="Model camera controls">
        <button type="button" className="icon-btn" disabled={useDiagram} onClick={() => send('left')} aria-label="Orbit model left"><ChevronLeft aria-hidden="true" /></button>
        <button type="button" className="icon-btn" disabled={useDiagram} onClick={() => send('right')} aria-label="Orbit model right"><ChevronRight aria-hidden="true" /></button>
        <button type="button" className="icon-btn" disabled={useDiagram} onClick={() => send('in')} aria-label="Zoom model in"><Plus aria-hidden="true" /></button>
        <button type="button" className="icon-btn" disabled={useDiagram} onClick={() => send('out')} aria-label="Zoom model out"><Minus aria-hidden="true" /></button>
        <button type="button" className="chip-btn" disabled={useDiagram} onClick={() => send('reset')}><RotateCcw aria-hidden="true" />Reset view</button>
      </div>
      <div className="inspector-tool-group" role="group" aria-label="Inspect a part">
        {FOCUS_PARTS.filter(part => model.parts[part]?.camera).map(part => <button key={part} type="button" className="chip-btn" aria-pressed={focused === part} disabled={useDiagram} onClick={() => send('focus', part)}>
          {part === 'cutout' ? 'Inspect cutout' : model.parts[part]!.label}
        </button>)}
      </div>
      <div className="inspector-tool-group">
        <button type="button" className="chip-btn" aria-pressed={lowPoly} disabled={useDiagram} onClick={() => setLowPoly(value => !value)}>Low detail</button>
        <button type="button" className="chip-btn" aria-pressed={useDiagram} onClick={() => setDiagram(value => !value)} disabled={graphicsUnavailable}>2D diagram</button>
      </div>
    </div>
    <p className="inspector-help">{useDiagram ? 'Equipment diagram' : 'Drag to orbit, scroll to zoom, or use the controls'}. No live switching controls. Geometry is illustrative.</p>
  </section>;
}
