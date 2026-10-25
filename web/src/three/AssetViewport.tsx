import { lazy, Suspense, useRef, useState } from 'react';
import type { CutoutStatus, SolarNode } from '../../../contracts/types';
import { CUTOUT_VISUAL } from './visual-state';
import { PoleDiagram } from './PoleDiagram';
import { UtilityIcon } from '../components/utility/UtilityIcon';
import { numberText } from '../components/utility/presentation';
import { useMediaQuery, webglAvailable } from './sentinel/hooks';
import { FOCUS_ORDER, SENTINEL_PARTS, focusLabel, type SentinelFocus, type SentinelPartId } from './sentinel/catalog';
import type { SentinelSceneHandle, SentinelUnavailableReason } from './sentinel/SentinelScene';
import type { SubjectOffset } from './sentinel/CameraDirector';
import type { Detail } from './sentinel/primitives';

const SentinelScene = lazy(() => import('./sentinel/SentinelScene'));

/** Keeps a focused part clear of the inspect card: beside it on wide panels, above it on narrow ones. */
const CARD_CLEARANCE: Record<'wide' | 'compact', SubjectOffset> = { wide: { x: -0.22, y: 0 }, compact: { x: 0, y: 0.24 } };

let webglSupport: boolean | undefined;
const supportsWebgl = () => (webglSupport ??= webglAvailable());

export interface AssetViewportProps {
  status: CutoutStatus;
  assetId: string;
  /** Modeled node telemetry from the same snapshot; drives the node light bar and inspection facts. */
  solar?: SolarNode;
}

type Fact = [label: string, value: string];

/** Facts drawn only from the incident snapshot; anything absent is reported as not supplied. */
function partFacts(part: SentinelPartId, { status, assetId, solar }: AssetViewportProps): Fact[] {
  const validBattery = solar && Number.isFinite(solar.battery_soc_pct) && solar.battery_soc_pct >= 0 && solar.battery_soc_pct <= 100;
  switch (part) {
    case 'sentinel':
      return solar ? [
        ['Link · modeled', solar.connectivity],
        ['Battery · modeled', validBattery ? `${numberText(solar.battery_soc_pct)}%` : 'Unavailable'],
        ['Buffered events', numberText(solar.buffered_events, 0)],
      ] : [['Node telemetry', 'Not supplied']];
    case 'solar':
      return solar ? [
        ['Panel · modeled', `${numberText(solar.solar_w)} W nominal`],
        ['Battery · modeled', `${numberText(solar.nominal_wh)} Wh nominal`],
        ['Runtime · modeled', solar.modeled_runtime_days === null ? 'Unavailable' : `${numberText(solar.modeled_runtime_days)} days`],
      ] : [['Node telemetry', 'Not supplied']];
    case 'cutout':
      return [
        ['Reported state', CUTOUT_VISUAL[status].label],
        status === 'UNKNOWN' ? ['Fuse position', 'Not asserted'] : ['Fuse door', status === 'OPEN' ? 'Drawn dropped open' : 'Drawn latched closed'],
      ];
    case 'transformer':
      return [['Asset', assetId], ['Geometry', 'Procedural · not surveyed']];
    case 'crossarm':
      return [['Geometry', 'Illustrative · not surveyed']];
  }
}

export function AssetViewport(props: AssetViewportProps) {
  const { status, assetId, solar } = props;
  const [diagram, setDiagram] = useState(false);
  const [detail, setDetail] = useState<Detail>('high');
  const [webgl] = useState(supportsWebgl);
  const [unavailable, setUnavailable] = useState<SentinelUnavailableReason | null>(null);
  const [focus, setFocus] = useState<SentinelFocus>('overview');
  const compact = useMediaQuery('(max-width: 720px)');
  const scene = useRef<SentinelSceneHandle>(null);
  const graphicsUnavailable = !webgl || unavailable !== null;
  const useDiagram = diagram || graphicsUnavailable;
  const active = focus === 'overview' ? null : SENTINEL_PARTS[focus];
  const fallbackNote = unavailable === 'context-lost' ? 'Graphics context lost' : '3D unavailable';

  return <section className="utility-asset-panel" aria-labelledby="utility-asset-heading">
    <div className="utility-panel-heading">
      <div><h2 id="utility-asset-heading">Asset inspection</h2><p>Procedural equipment model · {assetId}</p></div>
      <span className="utility-badge utility-badge-neutral">Illustrative</span>
    </div>
    <div className="utility-scene" data-cutout-status={status} data-focus={focus}>
      <div className={`utility-cutout-readout utility-state-${status.toLowerCase()}`} aria-live="polite"><span className="utility-status-dot" /><span>Cutout <strong>{CUTOUT_VISUAL[status].label}</strong></span>{status === 'UNKNOWN' ? <small>Position not asserted</small> : null}</div>
      {useDiagram ? <>
        <PoleDiagram status={status} />
        {!diagram && graphicsUnavailable ? <p className="utility-fallback-note" role="status">{webgl ? fallbackNote : '3D unavailable'} · showing equipment diagram</p> : null}
      </> : <Suspense fallback={<div className="utility-scene-loading" role="status">Preparing 3D model…</div>}>
        <SentinelScene
          ref={scene}
          mode="inspection"
          focus={focus}
          onFocusChange={setFocus}
          cutoutStatus={status}
          link={solar?.connectivity}
          detail={detail}
          subjectOffset={active ? CARD_CLEARANCE[compact ? 'compact' : 'wide'] : undefined}
          label={`Orbitable illustrative model for ${assetId}; cutout ${status.toLowerCase()}; focus ${focusLabel(focus).toLowerCase()}`}
          onUnavailable={setUnavailable}
        />
      </Suspense>}
      {!useDiagram && active ? <aside className="utility-inspect-card" aria-live="polite" aria-label={`${active.label} details`}>
        <div className="utility-inspect-card-title"><span>{active.index}</span><h3>{active.label}</h3></div>
        <p>{active.summary}</p>
        <dl>{partFacts(active.id, props).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </aside> : null}
      {!useDiagram ? <div className="utility-scene-caption"><span>{focusLabel(focus)}</span> Wood pole · crossarm · transformer · protective cutout · Sentinel node · solar module</div> : null}
    </div>
    <div className="utility-viewport-tools">
      <div className="utility-tool-group" role="group" aria-label="Model camera controls">
        <button type="button" disabled={useDiagram} onClick={() => scene.current?.orbit(-1)} aria-label="Orbit model left"><UtilityIcon kind="left" /></button>
        <button type="button" disabled={useDiagram} onClick={() => scene.current?.orbit(1)} aria-label="Orbit model right"><UtilityIcon kind="right" /></button>
        <button type="button" disabled={useDiagram} onClick={() => scene.current?.zoom(1)} aria-label="Zoom model in"><UtilityIcon kind="plus" /></button>
        <button type="button" disabled={useDiagram} onClick={() => scene.current?.zoom(-1)} aria-label="Zoom model out"><UtilityIcon kind="minus" /></button>
        <button type="button" disabled={useDiagram} onClick={() => scene.current?.reset()}>Reset view</button>
      </div>
      <div className="utility-tool-group utility-focus-group" role="group" aria-label="Focus a component">
        {FOCUS_ORDER.map(item => <button key={item} type="button" disabled={useDiagram} aria-pressed={focus === item} onClick={() => setFocus(item)}>{focusLabel(item)}</button>)}
      </div>
      <div className="utility-tool-group">
        <button type="button" aria-pressed={detail === 'low'} disabled={useDiagram} onClick={() => setDetail(value => value === 'low' ? 'high' : 'low')}>Low detail</button>
        <button type="button" aria-pressed={useDiagram} onClick={() => setDiagram(value => !value)} disabled={graphicsUnavailable}>2D diagram</button>
      </div>
    </div>
    <p className="utility-scene-help">{useDiagram ? 'Equipment diagram' : 'Drag to orbit · scroll to zoom · right-drag to pan · select a component to focus'}. No live switching controls. Geometry is illustrative.</p>
  </section>;
}
