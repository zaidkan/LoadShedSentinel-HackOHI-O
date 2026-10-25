import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CutoutStatus, ScenarioSnapshot } from '../../../../contracts/types';
import './feeder-map.css';

type Position = [number, number];
type EquipmentKind = 'substation' | 'switch' | 'fuse' | 'transformer' | 'other';
interface MapNode { token: string; kind: EquipmentKind; label: string; position: Position }
interface MapLink { upstream: string; downstream: string; positions: Position[]; directed: boolean }
export interface FeederTopology {
  nodes: MapNode[];
  links: MapLink[];
  missing: string[];
  omitted: number;
  policy: string;
  provenance: string;
  status: string;
}

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
function position(value: unknown): value is Position {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
    && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
function equipmentKind(label: string): EquipmentKind {
  if (/substation/i.test(label)) return 'substation';
  if (/fuse|cutout/i.test(label)) return 'fuse';
  if (/switch|breaker|recloser/i.test(label)) return 'switch';
  if (/distribution|transformer/i.test(label)) return 'transformer';
  return 'other';
}

/** Validate the public API boundary. Coordinates are schematic, never a measured conductor route. */
export function parseFeederTopology(value: unknown): FeederTopology {
  const collection = record(value);
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid topology response');
  const nodes: MapNode[] = [], links: MapLink[] = [];
  let omitted = 0;
  for (const item of collection.features) {
    const feature = record(item), geometry = record(feature.geometry), props = record(feature.properties);
    if (feature.type !== 'Feature') { omitted++; continue; }
    if (geometry.type === 'Point') {
      const token = text(props.asset_token), label = text(props.kind) || 'Equipment';
      if (!token || !position(geometry.coordinates) || nodes.some(node => node.token === token)) { omitted++; continue; }
      nodes.push({ token, label, kind: equipmentKind(label), position: [geometry.coordinates[0], geometry.coordinates[1]] });
    } else if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2 && geometry.coordinates.every(position)) {
      links.push({ upstream: text(props.upstream_token), downstream: text(props.downstream_token), positions: geometry.coordinates.map(p => [p[0], p[1]]), directed: false });
    } else omitted++;
  }
  for (const link of links) {
    const upstream = nodes.find(node => node.token === link.upstream), downstream = nodes.find(node => node.token === link.downstream);
    if (!upstream || !downstream) continue;
    const first = link.positions[0], last = link.positions[link.positions.length - 1];
    const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
    // API coordinates run downstream-to-upstream. Tokens, not array order, establish supply direction.
    if (same(first, downstream.position) && same(last, upstream.position)) link.positions.reverse();
    link.directed = !same(upstream.position, downstream.position) && same(link.positions[0], upstream.position) && same(link.positions[link.positions.length - 1], downstream.position);
  }
  return {
    nodes, links, omitted,
    missing: Array.isArray(collection.missing_geometry_tokens) ? collection.missing_geometry_tokens.filter((v): v is string => typeof v === 'string') : [],
    policy: text(collection.geometry_policy) || 'Equipment coordinates supplied by the topology source.',
    provenance: text(collection.provenance) || 'Source not supplied',
    status: text(collection.status) || 'UNKNOWN',
  };
}

export function fitFeederCoordinates(topology: FeederTopology, width: number, height = 300) {
  const points = [...topology.nodes.map(node => node.position), ...topology.links.flatMap(link => link.positions)];
  if (!points.length) return (_point: Position): Position => [width / 2, height / 2];
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(maxX > minX ? (width - 88) / (maxX - minX) : Infinity, maxY > minY ? (height - 88) / (maxY - minY) : Infinity);
  const safeScale = Number.isFinite(scale) ? scale : 1;
  return (p: Position): Position => [width / 2 + (p[0] - (minX + maxX) / 2) * safeScale, height / 2 - (p[1] - (minY + maxY) / 2) * safeScale];
}

function NodeSymbol({ kind }: { kind: EquipmentKind }) {
  switch (kind) {
    case 'substation': return <><rect x="-10" y="-10" width="20" height="20" /><path d="M-5 0H5M0-5V5" /></>;
    case 'switch': return <><path d="M-12 0H-5M5 0H12M-5 0L5-7" /><circle cx="-5" cy="0" r="2" /><circle cx="5" cy="0" r="2" /></>;
    case 'fuse': return <><path d="M-12 0H-6M6 0H12" /><rect x="-6" y="-5" width="12" height="10" /></>;
    case 'transformer': return <><circle cx="-4" cy="0" r="7" /><circle cx="4" cy="0" r="7" /></>;
    default: return <path d="M0-10L10 0 0 10-10 0Z" />;
  }
}

const CUTOUT_TEXT: Record<CutoutStatus, string> = {
  OPEN: 'Cutout open · energization unconfirmed',
  CLOSED: 'Cutout closed · live energization unconfirmed',
  UNKNOWN: 'Cutout position unknown · energization unconfirmed',
};

const MAP_HEIGHT = 320, CELL_INSET_X = 96, CELL_INSET_Y = 56, CELL_STEP_X = 78, CELL_STEP_Y = 76;

interface GeneralizedCell { key: string; position: Position; center: Position; width: number; height: number; tokens: string[] }

/** Generalized coordinates put several devices in one grid cell; spread them inside the cell instead of stacking them. */
function generalizedCells(topology: FeederTopology, project: (p: Position) => Position) {
  const groups = new Map<string, MapNode[]>();
  for (const node of topology.nodes) {
    const key = node.position.join(',');
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  const placed = new Map<string, Position>(), cells: GeneralizedCell[] = [];
  for (const [key, members] of groups) {
    const center = project(members[0].position);
    const columns = Math.min(members.length, 3), rows = Math.ceil(members.length / columns);
    members.forEach((node, index) => {
      const column = index % columns, row = Math.floor(index / columns);
      const inRow = row === rows - 1 ? members.length - row * columns : columns;
      placed.set(node.token, [center[0] + (column - (inRow - 1) / 2) * CELL_STEP_X, center[1] + (row - (rows - 1) / 2) * CELL_STEP_Y]);
    });
    if (members.length > 1) cells.push({ key, position: members[0].position, center, width: columns * CELL_STEP_X + 8, height: rows * CELL_STEP_Y + 10, tokens: members.map(node => node.token) });
  }
  return { placed, cells };
}

export interface FeederMapProps { snapshot: ScenarioSnapshot; topology?: unknown }

/** Topology is optional for fixture/parent injection; otherwise load the sanitized public endpoint. */
export function FeederMap({ snapshot, topology }: FeederMapProps) {
  const uid = useId().replace(/:/g, ''), host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640), [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState<unknown>(undefined), [failed, setFailed] = useState(false);
  const [inspected, setInspected] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, Math.round(entries[0].contentRect.width))));
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (topology !== undefined) return;
    const controller = new AbortController(); setFailed(false); setRemote(undefined);
    fetch('/api/topology/geojson', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Topology unavailable'); return response.json() as Promise<unknown>; })
      .then(value => { if (!controller.signal.aborted) setRemote(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [topology, attempt]);
  useEffect(() => { setInspected(null); setHovered(null); }, [snapshot.current_asset_id, topology]);
  const data = topology === undefined ? remote : topology;
  const parsed = useMemo(() => {
    if (data === undefined) return null;
    try { return parseFeederTopology(data); } catch { return null; }
  }, [data]);
  const project = useMemo(() => {
    if (!parsed) return null;
    const base = fitFeederCoordinates(parsed, width - CELL_INSET_X * 2, MAP_HEIGHT - CELL_INSET_Y * 2);
    return (p: Position): Position => { const [x, y] = base(p); return [x + CELL_INSET_X, y + CELL_INSET_Y]; };
  }, [parsed, width]);
  const cells = useMemo(() => parsed && project ? generalizedCells(parsed, project) : null, [parsed, project]);
  const loadFailed = (topology === undefined && failed) || (data !== undefined && !parsed);
  const current = parsed?.nodes.find(node => node.token === snapshot.current_asset_id);
  const active = parsed?.nodes.find(node => node.token === (hovered || inspected)) || current || parsed?.nodes[0];
  const inspect = (token: string) => { setInspected(token); setHovered(null); };
  return <section className="console-block feeder" aria-labelledby={`${uid}-heading`}>
    <header className="block-head block-head--split">
      <div>
        <h2 id={`${uid}-heading`} className="console-h2"><em>Equipment</em> locations</h2>
        <p className="block-sub">Generalized positions of the sample equipment. Only the inspected asset carries a supplied cutout state.</p>
      </div>
      {parsed ? <span className="tag" data-source={parsed.provenance === 'aep_challenge' ? 'aep_challenge' : undefined}>{parsed.provenance === 'aep_challenge' ? 'AEP challenge' : parsed.provenance.replace(/_/g, ' ')}</span> : null}
    </header>
    <div className="feeder-body" ref={host}>
      {loadFailed ? <div className="feeder-empty" role="status"><p>Network topology could not be loaded.</p>{topology === undefined ? <button type="button" className="btn btn--small" onClick={() => setAttempt(value => value + 1)}>Retry topology</button> : <p>Supply a valid GeoJSON FeatureCollection.</p>}</div>
        : !parsed ? <p className="feeder-empty" role="status">Loading network topology…</p>
        : !parsed.nodes.length && !parsed.links.length ? <p className="feeder-empty" role="status">No equipment geometry supplied. Topology status: {parsed.status}.</p>
        : <>
          <svg viewBox={`0 0 ${width} ${MAP_HEIGHT}`} className="feeder-svg" role="group" aria-labelledby={`${uid}-title ${uid}-description`}>
            <title id={`${uid}-title`}>Equipment locations</title><desc id={`${uid}-description`}>Generalized equipment positions. Arrows, when supplied, show upstream to downstream relationships, not measured power flow. Focus or select equipment to inspect it. Only the current asset has a supplied cutout state.</desc>
            <defs>
              <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5 0 10Z" fill="currentColor" /></marker>
              <pattern id={`${uid}-grid`} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" className="feeder-grid-line" /></pattern>
            </defs>
            <rect width={width} height={MAP_HEIGHT} fill={`url(#${uid}-grid)`} />
            {cells?.cells.map(cell => <g key={cell.key} className="feeder-cell" aria-hidden="true">
              <rect x={cell.center[0] - cell.width / 2} y={cell.center[1] - cell.height / 2 - 8} width={cell.width} height={cell.height + 32} rx="14" />
              <text x={cell.center[0] - cell.width / 2 + 10} y={cell.center[1] - cell.height / 2 - 14}>Cell {cell.position[1].toFixed(2)}°, {cell.position[0].toFixed(2)}° · {cell.tokens.length} devices</text>
            </g>)}
            {parsed.links.map((link, index) => {
              const positions = link.positions.map(p => project!(p));
              // Shorten the last segment so the arrow remains visible outside the node's hit area.
              if (link.directed) {
                const end = positions[positions.length - 1], before = positions[positions.length - 2];
                const length = Math.hypot(end[0] - before[0], end[1] - before[1]);
                if (length > 25) positions[positions.length - 1] = [end[0] - (end[0] - before[0]) * 25 / length, end[1] - (end[1] - before[1]) * 25 / length];
              }
              return <polyline key={index} className={`feeder-link${link.directed ? '' : ' feeder-link--unknown'}`} points={positions.map(p => p.join(',')).join(' ')} markerEnd={link.directed ? `url(#${uid}-arrow)` : undefined}><title>{link.directed ? `${link.upstream} supplies ${link.downstream} · topology only` : 'Link direction unavailable'}</title></polyline>;
            })}
            {parsed.nodes.map(node => {
              const [x, y] = cells?.placed.get(node.token) ?? project!(node.position), selected = node.token === snapshot.current_asset_id;
              const description = `${node.token} · ${node.label} · ${selected ? CUTOUT_TEXT[snapshot.cutout_status] : 'Energization not supplied'}`;
              return <g key={node.token} transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-label={description} aria-pressed={active?.token === node.token}
                className="feeder-node" data-current={selected || undefined} data-state={selected ? snapshot.cutout_status.toLowerCase() : undefined}
                onMouseEnter={() => setHovered(node.token)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(node.token)} onBlur={() => setHovered(null)}
                onClick={() => inspect(node.token)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(node.token); } }}>
                <title>{description}</title><circle className="feeder-hit" r="22" />{selected ? <circle className="feeder-selection" r="18" /> : null}<g className="feeder-symbol"><NodeSymbol kind={node.kind} /></g>
                <text y="34" textAnchor="middle">{selected ? 'Current asset' : node.kind === 'other' ? 'Equipment' : node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}</text>
                <text y="47" textAnchor="middle" className="feeder-token">…{node.token.slice(-8)}</text>
              </g>;
            })}
          </svg>
          <div className="feeder-inspector">
            <label className="field-label" htmlFor={`${uid}-inspect`}>Inspect equipment</label>
            <select id={`${uid}-inspect`} className="select mono" value={active?.token || ''} onChange={event => inspect(event.target.value)}>{parsed.nodes.map(node => <option key={node.token} value={node.token}>{node.token} · {node.label}</option>)}</select>
            <p role="status" aria-live="polite">{active ? <><strong>{active.label.charAt(0) + active.label.slice(1).toLowerCase().replace(/_/g, ' ')}</strong><span className="mono">{active.token}</span><span>{active.token === snapshot.current_asset_id ? CUTOUT_TEXT[snapshot.cutout_status] : 'Energization not supplied for this equipment.'}</span></> : 'No equipment points supplied.'}</p>
          </div>
        </>}
    </div>
    {parsed ? <div className="feeder-notes">
      <p className="feeder-legend"><span>Arrow: upstream → downstream</span><span>Ring: current asset</span><span>Other equipment: state not supplied</span>{!parsed.links.length ? <span>No links supplied in this slice; see the supply path above</span> : null}</p>
      {!current ? <p role="status">Current asset {snapshot.current_asset_id} is not located in this topology slice.</p> : null}
      {parsed.missing.length ? <p>Missing equipment geometry: <span className="mono">{parsed.missing.join(', ')}</span>.</p> : null}
      {parsed.omitted ? <p>{parsed.omitted} unsupported or invalid features omitted.</p> : null}
      <p>{parsed.policy} Links show topology, not surveyed conductors or live energized status.</p>
      <p>Topology status: {parsed.status.toLowerCase()}</p>
    </div> : null}
  </section>;
}
