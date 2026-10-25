import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import type { ScenarioSnapshot } from '../../../../contracts/types';
import { useIncident } from '../../app/incident';
import { lookupPremiseTopology, type AEPSourceAsset, type TopologyTrace } from '../../services/api';
import { kindLabel, numberText, sentenceCase, tokenTail } from '../utility/presentation';
import './supply-path.css';

/** Source traces are static AEP sample data, so one lookup per premise is enough for the session. */
const traceCache = new Map<string, Promise<TopologyTrace>>();
function traceOf(premise: string) {
  let pending = traceCache.get(premise);
  if (!pending) {
    pending = lookupPremiseTopology(premise).catch(error => { traceCache.delete(premise); throw error; });
    traceCache.set(premise, pending);
  }
  return pending;
}

interface PathNode { token: string; kind: string; parent: string | null; children: string[]; premises: string[]; depth: number }
interface Forest {
  nodes: Map<string, PathNode>;
  roots: string[];
  /** Root-first equipment chain for each traced premise. */
  chains: Map<string, string[]>;
  premiseOrder: string[];
  leafColumn: number;
}

function buildForest(traces: TopologyTrace[]): Forest {
  const nodes = new Map<string, PathNode>(), roots: string[] = [], chains = new Map<string, string[]>();
  for (const trace of traces) {
    if (trace.status !== 'KNOWN' || !trace.premise_token || !trace.equipment?.length) continue;
    const chain = [...trace.equipment].reverse();
    chain.forEach((item, index) => {
      const parent = index ? chain[index - 1].asset_token : null;
      let node = nodes.get(item.asset_token);
      if (!node) {
        node = { token: item.asset_token, kind: item.kind, parent, children: [], premises: [], depth: 0 };
        nodes.set(item.asset_token, node);
        if (parent) nodes.get(parent)!.children.push(item.asset_token);
        else roots.push(item.asset_token);
      }
    });
    const leaf = nodes.get(chain[chain.length - 1].asset_token)!;
    if (!leaf.premises.includes(trace.premise_token)) leaf.premises.push(trace.premise_token);
    chains.set(trace.premise_token, chain.map(item => item.asset_token));
  }
  const premiseOrder: string[] = [];
  let leafColumn = 0;
  const walk = (token: string, depth: number) => {
    const node = nodes.get(token)!;
    node.depth = depth;
    if (node.premises.length) leafColumn = Math.max(leafColumn, depth);
    node.children.forEach(child => walk(child, depth + 1));
    premiseOrder.push(...node.premises);
  };
  roots.forEach(root => walk(root, 0));
  return { nodes, roots, chains, premiseOrder, leafColumn };
}

function subtree(forest: Forest, token: string, into = new Set<string>()) {
  const node = forest.nodes.get(token);
  if (!node) return into;
  into.add(token);
  node.children.forEach(child => subtree(forest, child, into));
  return into;
}

function premisesBelow(forest: Forest, token: string): number {
  const node = forest.nodes.get(token);
  return node ? node.premises.length + node.children.reduce((sum, child) => sum + premisesBelow(forest, child), 0) : 0;
}

function Symbol({ kind }: { kind: string }) {
  switch (kind) {
    case 'CIRCUIT_BREAKER': return <rect x="-9" y="-9" width="18" height="18" rx="2" />;
    case 'RECLOSER': return <><rect x="-9" y="-9" width="18" height="18" rx="9" /><text y="3.6" textAnchor="middle" className="supply-glyph">R</text></>;
    case 'FUSE': return <><rect x="-11" y="-4.5" width="22" height="9" rx="2" /><path d="M-11 0H11" /></>;
    case 'TRANSFORMER': return <><circle cx="-4.5" r="7" /><circle cx="4.5" r="7" /></>;
    default: return <path d="M0-9L9 0 0 9-9 0Z" />;
  }
}

const KIND_SHORT: Record<string, string> = { CIRCUIT_BREAKER: 'Breaker', RECLOSER: 'Recloser', FUSE: 'Fuse', TRANSFORMER: 'Transformer' };

interface Geometry { width: number; height: number; x: (column: number) => number; y: Map<string, number>; column: Map<string, number>; premiseColumn: number }

function layout(forest: Forest, width: number): Geometry {
  const rowH = 32, padL = 52, padR = 178, padY = 52;
  const rows = forest.premiseOrder.length;
  const height = Math.max(236, rows * rowH + padY * 2);
  const top = (height - rows * rowH) / 2;
  const premiseColumn = forest.leafColumn + 2;
  const gap = (width - padL - padR) / premiseColumn;
  const x = (column: number) => padL + column * gap;
  const y = new Map<string, number>(), column = new Map<string, number>();
  forest.premiseOrder.forEach((premise, index) => { y.set(premise, top + index * rowH + rowH / 2); column.set(premise, premiseColumn); });
  const place = (token: string): number => {
    const node = forest.nodes.get(token)!;
    const ys = [...node.children.map(place), ...node.premises.map(premise => y.get(premise)!)];
    const value = ys.reduce((sum, v) => sum + v, 0) / Math.max(1, ys.length);
    y.set(token, value);
    column.set(token, node.premises.length ? forest.leafColumn + 1 : node.depth + 1);
    return value;
  };
  forest.roots.forEach(place);
  return { width, height, x, y, column, premiseColumn };
}

interface SupplyPathProps { snapshot: ScenarioSnapshot }

export function SupplyPath({ snapshot }: SupplyPathProps) {
  const { aepAssets } = useIncident();
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => typeof window === 'undefined' ? 1200 : Math.min(window.innerWidth - 48, 1400));
  const [extra, setExtra] = useState<string[]>([]);
  const [traces, setTraces] = useState<TopologyTrace[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pinned, setPinned] = useState(snapshot.selected_premise_token);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'known' | 'unknown' | 'error'; message?: string }>({ state: 'idle' });

  const underReview = snapshot.status === 'UNDER_REVIEW';
  const affected = useMemo(() => new Set(snapshot.affected_premise_tokens), [snapshot.affected_premise_tokens]);
  const premises = useMemo(() => [...new Set([...snapshot.affected_premise_tokens, snapshot.selected_premise_token, ...extra])].filter(Boolean), [snapshot.affected_premise_tokens, snapshot.selected_premise_token, extra]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.round(entries[0].contentRect.width)));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setPinned(snapshot.selected_premise_token); setHovered(null); }, [snapshot.incident_id, snapshot.selected_premise_token]);

  useEffect(() => {
    let live = true;
    setFailed(false);
    Promise.all(premises.map(traceOf))
      .then(result => { if (live) setTraces(result); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [premises, attempt]);

  const forest = useMemo(() => buildForest(traces ?? []), [traces]);
  const geometry = useMemo(() => layout(forest, Math.max(width, 720)), [forest, width]);
  const source = snapshot.impact_source;
  const fault = source && forest.nodes.has(source.fault_asset_token) ? source.fault_asset_token : null;
  const footprint = useMemo(() => !fault || underReview ? new Set<string>() : subtree(forest, fault), [forest, fault, underReview]);
  const feed = useMemo(() => {
    const path = new Set<string>();
    let cursor = fault && !underReview ? forest.nodes.get(fault) : undefined;
    while (cursor) { path.add(cursor.token); cursor = cursor.parent ? forest.nodes.get(cursor.parent) : undefined; }
    return path;
  }, [forest, fault, underReview]);
  const active = hovered ?? pinned;
  const activeChain = forest.chains.get(active) ?? [];
  const traced = new Set([...activeChain, active]);
  const assetInfo = new Map<string, AEPSourceAsset>(aepAssets.map(asset => [asset.asset_token, asset]));
  const untraced = aepAssets.filter(asset => asset.kind === 'TRANSFORMER' && !forest.nodes.has(asset.asset_token));
  const lit = [...affected].filter(premise => forest.chains.has(premise)).length;
  const compact = width < 720;
  const drawKey = `${snapshot.incident_id}-${snapshot.revision}-${snapshot.current_asset_id}`;

  const premiseState = (premise: string) => affected.has(premise) && !underReview ? 'affected' : 'clear';
  const edgeState = (child: string, isPremise: boolean) => {
    if (isPremise) return premiseState(child) === 'affected' && footprint.size ? 'footprint' : 'idle';
    return footprint.has(child) && footprint.has(forest.nodes.get(child)?.parent ?? '') ? 'footprint' : feed.has(child) ? 'feed' : 'idle';
  };

  const pin = (premise: string) => { setPinned(premise); setHovered(null); };
  const onPremiseKey = (event: KeyboardEvent, premise: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pin(premise); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = query.trim().toUpperCase();
    if (!token) return;
    setLookup({ state: 'busy' });
    try {
      const result = await traceOf(token);
      if (result.status === 'KNOWN' && result.equipment?.length) {
        setExtra(list => list.includes(token) ? list : [...list, token]);
        setPinned(token);
        setLookup({ state: 'known', message: `${token} traced through ${result.equipment.length} devices to ${result.endpoint?.toLowerCase() ?? 'the upstream endpoint'}. Substation ${result.substation_status === 'UNKNOWN' ? 'not identified' : result.substation_status?.toLowerCase()}.` });
      } else {
        traceCache.delete(token);
        setLookup({ state: 'unknown', message: `${token} is not in the public AEP sample slice, so no supply path is asserted${result.reason ? ` (${sentenceCase(result.reason)})` : ''}.` });
      }
    } catch {
      setLookup({ state: 'error', message: 'The topology lookup failed. Check the API connection and try again.' });
    }
  };

  const summary = !fault ? 'The simulated fault asset is not on a traced path in this slice.'
    : underReview ? `Fault location and footprint are not asserted while evidence conflicts. The selected premise path is shown for context.`
    : `Simulated fault at ${kindLabel(forest.nodes.get(fault)!.kind).toLowerCase()} ${tokenTail(fault)} reaches ${lit} of ${source?.sample_premise_count ?? premises.length} sample premises${source?.full_source_known_dependent_count && source.full_source_known_dependent_count > lit ? ` (${numberText(source.full_source_known_dependent_count, 0)} known dependents in the full AEP source)` : ''}.`;

  const readout = forest.chains.get(active);
  const activeTrace = traces?.find(trace => trace.premise_token === active);

  return <section className="console-section supply" aria-labelledby="supply-heading">
    <header className="section-split">
      <h2 id="supply-heading" className="console-h2 console-h2--large"><em>Supply</em> path</h2>
      <div className="section-split-body">
        <p className="lead">{summary}</p>
        <p className="block-sub">Drawn from the AEP-supplied upstream sequence for each premise this incident lists. Lines are dependencies, not conductors, and carry no live energization state.</p>
      </div>
    </header>

    <div className="supply-sheet" ref={host} data-compact={compact ? 'true' : 'false'}>
      {failed ? <div className="supply-empty" role="alert"><p>Supply paths could not be traced.</p><button type="button" className="btn btn--small" onClick={() => setAttempt(value => value + 1)}>Retry trace</button></div>
        : !traces ? <p className="supply-empty" role="status">Tracing supply paths…</p>
        : !forest.roots.length ? <p className="supply-empty" role="status">No supplied path for the premises in this incident.</p>
        : compact ? <SupplyTree forest={forest} footprint={footprint} fault={fault} underReview={underReview} affected={affected} pinned={pinned} onPin={pin} selected={snapshot.selected_premise_token} />
        : <svg key={drawKey} className="supply-svg" viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="group" aria-labelledby="supply-svg-title supply-svg-desc">
          <title id="supply-svg-title">One-line supply path from breaker to premises</title>
          <desc id="supply-svg-desc">{summary} Focus a premise to trace its path. The trace is also listed as text beside the diagram.</desc>
          {forest.roots.map(root => {
            const ry = geometry.y.get(root)!;
            return <g key={`sub-${root}`} className="supply-node supply-node--substation" transform={`translate(${geometry.x(0)} ${ry})`}>
              <path className="supply-edge supply-edge--unknown" d={`M12 0H${geometry.x(1) - geometry.x(0) - 12}`} />
              <rect x="-12" y="-12" width="24" height="24" rx="3" />
              <text y="4" textAnchor="middle" className="supply-glyph">?</text>
              <text y="-20" textAnchor="middle" className="supply-kind">Substation</text>
              <text y="28" textAnchor="middle" className="supply-token">not identified</text>
            </g>;
          })}
          <g className="supply-layer supply-layer--traced" aria-hidden="true">
            {activeChain.length ? [...activeChain.slice(1), active].map((child, index) => {
              const from = activeChain[index];
              const px = geometry.x(geometry.column.get(from)!), py = geometry.y.get(from)!;
              const cx = geometry.x(geometry.column.get(child)!), cy = geometry.y.get(child)!;
              const bus = cx - (geometry.x(1) - geometry.x(0)) / 2;
              return <path key={child} className="supply-edge" d={`M${px + 12} ${py}H${bus}V${cy}H${cx - (child === active ? 7 : 12)}`} />;
            }) : null}
          </g>
          {(['idle', 'feed', 'footprint'] as const).map(layer => <g key={layer} className={`supply-layer supply-layer--${layer}`}>
            {[...forest.nodes.values()].flatMap(node => {
              const edges: ReactElement[] = [];
              const px = geometry.x(geometry.column.get(node.token)!), py = geometry.y.get(node.token)!;
              const out = (child: string, isPremise: boolean) => {
                if (edgeState(child, isPremise) !== layer) return;
                const cx = geometry.x(geometry.column.get(child)!), cy = geometry.y.get(child)!;
                const bus = cx - (geometry.x(1) - geometry.x(0)) / 2;
                edges.push(<path key={child} className="supply-edge" pathLength={1} style={{ '--i': geometry.column.get(child) } as CSSProperties}
                  d={`M${px + 12} ${py}H${bus}V${cy}H${cx - (isPremise ? 7 : 12)}`} />);
              };
              node.children.forEach(child => out(child, false));
              node.premises.forEach(premise => out(premise, true));
              return edges;
            })}
          </g>)}
          {[...forest.nodes.values()].map(node => {
            const x = geometry.x(geometry.column.get(node.token)!), y = geometry.y.get(node.token)!;
            const info = assetInfo.get(node.token);
            const below = premisesBelow(forest, node.token);
            const tip = `${kindLabel(node.kind)} ${node.token} · ${below} traced ${below === 1 ? 'premise' : 'premises'} below${info ? ` · ${info.dependent_premises_in_sample} in sample${info.full_source_known_dependent_count ? `, ${numberText(info.full_source_known_dependent_count, 0)} in full source` : ''}` : ''}`;
            return <g key={node.token} className="supply-node" transform={`translate(${x} ${y})`}
              data-footprint={footprint.has(node.token) || undefined} data-fault={node.token === fault ? (underReview ? 'unknown' : 'true') : undefined}
              data-traced={traced.has(node.token) || undefined} data-current={node.token === snapshot.current_asset_id || undefined}>
              <title>{tip}</title>
              {node.token === fault ? <circle className="supply-halo" r="19" /> : null}
              {node.token === snapshot.current_asset_id ? <rect className="supply-current" x="-16" y="-14" width="32" height="28" rx="8" /> : null}
              <g className="supply-symbol"><Symbol kind={node.kind} /></g>
              {node.premises.length ? <text y="-19" textAnchor="middle" className="supply-token">{tokenTail(node.token)}</text> : <>
                <text y="-20" textAnchor="middle" className="supply-kind">{KIND_SHORT[node.kind] ?? kindLabel(node.kind)}</text>
                <text y="28" textAnchor="middle" className="supply-token">{tokenTail(node.token)}</text>
              </>}
            </g>;
          })}
          <g className="supply-columns" aria-hidden="true">
            <text x={geometry.x(forest.leafColumn + 1)} y="24" textAnchor="middle">Transformers</text>
            <text x={geometry.x(geometry.premiseColumn) - 5} y="24">Premises · {forest.premiseOrder.length} traced</text>
          </g>
          {forest.premiseOrder.map(premise => {
            const x = geometry.x(geometry.premiseColumn), y = geometry.y.get(premise)!;
            const state = premiseState(premise), selected = premise === snapshot.selected_premise_token;
            return <g key={premise} className="supply-premise" transform={`translate(${x} ${y})`} role="button" tabIndex={0}
              aria-pressed={pinned === premise} aria-label={`Premise ${premise}${state === 'affected' ? ', in the simulated footprint' : ''}${selected ? ', selected premise' : ''}. Trace its path.`}
              data-state={state} data-traced={premise === active || undefined} data-selected={selected || undefined}
              onMouseEnter={() => setHovered(premise)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(premise)} onBlur={() => setHovered(null)}
              onClick={() => pin(premise)} onKeyDown={event => onPremiseKey(event, premise)}>
              <rect className="supply-hit" x="-12" y="-14" width="150" height="28" rx="6" />
              <circle r="5" />
              <text x="14" y="4" className="supply-token">{tokenTail(premise)}</text>
              {selected ? <text x="82" y="4" className="supply-flag">Selected</text> : extra.includes(premise) ? <text x="82" y="4" className="supply-flag">Traced</text> : null}
            </g>;
          })}
        </svg>}
    </div>

    <div className="supply-foot">
      <div className="supply-readout" aria-live="polite">
        <h3 className="panel-title">Trace <span className="mono">{active}</span></h3>
        {readout ? <ol className="supply-steps">
          <li data-kind="premise"><span>Premise</span><span className="mono">{tokenTail(active)}</span>{premiseState(active) === 'affected' ? <span className="state" data-state="critical">In footprint</span> : null}</li>
          {[...readout].reverse().map(token => <li key={token} data-fault={token === fault || undefined}><span>{kindLabel(forest.nodes.get(token)!.kind)}</span><span className="mono">{tokenTail(token)}</span>{token === fault ? <span className="state" data-state={underReview ? 'unknown' : 'critical'}>{underReview ? 'Fault not asserted' : 'Simulated fault'}</span> : null}</li>)}
          <li data-kind="substation"><span>Substation</span><span className="muted">{activeTrace?.substation_status === 'UNKNOWN' || !activeTrace?.substation_status ? 'Not identified' : activeTrace.substation_status}</span></li>
        </ol> : <p className="muted small">No supplied path for this premise.</p>}
        {activeTrace?.limitations?.length ? <ul className="supply-limits">{activeTrace.limitations.map(item => <li key={item}>{item}</li>)}</ul> : null}
      </div>

      <div className="supply-tools">
        <form className="supply-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">Trace any premise token</span>
            <input className="input mono" value={query} onChange={event => setQuery(event.target.value)} placeholder="Anonymized AEP premise" spellCheck={false} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn--small btn--accent" disabled={lookup.state === 'busy' || !query.trim()}>{lookup.state === 'busy' ? 'Tracing…' : 'Trace'}</button>
        </form>
        {lookup.message ? <p className="supply-lookup" data-state={lookup.state} role={lookup.state === 'error' ? 'alert' : 'status'}>{lookup.message}</p> : null}
        <ul className="supply-legend" aria-label="Diagram legend">
          <li><svg viewBox="-12 -12 24 24" aria-hidden="true"><g className="supply-symbol"><Symbol kind="CIRCUIT_BREAKER" /></g></svg>Breaker</li>
          <li><svg viewBox="-12 -12 24 24" aria-hidden="true"><g className="supply-symbol"><Symbol kind="RECLOSER" /></g></svg>Recloser</li>
          <li><svg viewBox="-12 -12 24 24" aria-hidden="true"><g className="supply-symbol"><Symbol kind="FUSE" /></g></svg>Fuse</li>
          <li><svg viewBox="-12 -12 24 24" aria-hidden="true"><g className="supply-symbol"><Symbol kind="TRANSFORMER" /></g></svg>Transformer</li>
          <li><span className="supply-key" data-key="footprint" />Simulated footprint</li>
          <li><span className="supply-key" data-key="feed" />Feed to fault asset</li>
          <li><span className="supply-key" data-key="traced" />Selected trace</li>
          <li><span className="supply-key" data-key="current" />Asset in the inspector</li>
        </ul>
        {untraced.length ? <p className="block-note">Not traced in this incident: {untraced.map(asset => `transformer ${tokenTail(asset.asset_token)} (${asset.dependent_premises_in_sample} sample ${asset.dependent_premises_in_sample === 1 ? 'premise' : 'premises'})`).join(', ')}. Their premises are not listed in this snapshot.</p> : null}
      </div>
    </div>
  </section>;
}

function SupplyTree({ forest, footprint, fault, underReview, affected, pinned, onPin, selected }: {
  forest: Forest; footprint: Set<string>; fault: string | null; underReview: boolean; affected: Set<string>; pinned: string; onPin: (premise: string) => void; selected: string;
}) {
  const branch = (token: string): ReactElement => {
    const node = forest.nodes.get(token)!;
    return <li key={token} data-footprint={footprint.has(token) || undefined} data-fault={token === fault ? (underReview ? 'unknown' : 'true') : undefined}>
      <div className="supply-tree-row">
        <svg viewBox="-12 -12 24 24" aria-hidden="true"><g className="supply-symbol"><Symbol kind={node.kind} /></g></svg>
        <span>{kindLabel(node.kind)}</span><span className="mono">{tokenTail(token)}</span>
        {token === fault ? <span className="state" data-state={underReview ? 'unknown' : 'critical'}>{underReview ? 'Not asserted' : 'Simulated fault'}</span> : null}
      </div>
      {node.premises.length ? <ul className="supply-tree-premises">{node.premises.map(premise => <li key={premise}>
        <button type="button" className="chip-btn chip-btn--paper" aria-pressed={pinned === premise} data-state={affected.has(premise) && !underReview ? 'affected' : 'clear'} onClick={() => onPin(premise)}>
          <span className="mono">{tokenTail(premise)}</span>{premise === selected ? ' · selected' : ''}
        </button>
      </li>)}</ul> : null}
      {node.children.length ? <ol className="supply-tree">{node.children.map(branch)}</ol> : null}
    </li>;
  };
  return <ol className="supply-tree supply-tree--root" aria-label="Supply path from substation to premises">
    <li data-kind="substation"><div className="supply-tree-row"><span className="supply-tree-sub" aria-hidden="true">?</span><span>Substation</span><span className="muted">not identified</span></div>
      <ol className="supply-tree">{forest.roots.map(branch)}</ol>
    </li>
  </ol>;
}
