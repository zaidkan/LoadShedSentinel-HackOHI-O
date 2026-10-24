import type { ScenarioSnapshot } from '../../../../contracts/types';
import type { NetworkFeature, NetworkGeojson } from '../../services/api';
import { PROVENANCE, humanize } from './presentation';
import type { Provenance } from '../../../../contracts/types';

const W = 420, H = 280, PAD_X = 120, PAD_Y = 44;
const KIND_LABEL: Record<string, string> = { Fuse: 'Fuse', Distribution: 'Dist. transformer', Recloser: 'Recloser', Switch: 'Switch' };
const kindLabel = (kind?: string) => kind ? KIND_LABEL[kind] ?? humanize(kind) : 'Equipment';

type Point = Extract<NetworkFeature['geometry'], { type: 'Point' }>;
const isPoint = (f: NetworkFeature): f is NetworkFeature & { geometry: Point } => f.geometry.type === 'Point';

/** Equal-aspect projection of generalized lon/lat into the panel; no basemap, no customer geometry. */
function project(features: NetworkFeature[]) {
  const coords = features.flatMap(f => f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.coordinates);
  const lons = coords.map(c => c[0]), lats = coords.map(c => c[1]);
  const [minLon, maxLon, minLat, maxLat] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max((maxLon - minLon) * kx, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((W - PAD_X * 2) / spanX, (H - PAD_Y * 2) / spanY);
  const ox = (W - spanX * scale) / 2, oy = (H - spanY * scale) / 2;
  return ([lon, lat]: [number, number]) => [ox + (lon - minLon) * kx * scale, H - oy - (lat - minLat) * scale] as const;
}

function Marker({ kind, x, y, active }: { kind?: string; x: number; y: number; active: boolean }) {
  const stroke = active ? 'var(--u-caution)' : 'var(--u-info)';
  const fill = active ? '#34312b' : '#1b3545';
  if (kind === 'Fuse') return <path d={`M${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}L${x - 9} ${y}Z`} fill={fill} stroke={stroke} strokeWidth="2" />;
  if (kind === 'Distribution') return <rect x={x - 8} y={y - 8} width="16" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />;
  return <circle cx={x} cy={y} r="8" fill={fill} stroke={stroke} strokeWidth="2" />;
}

export function NetworkMapPanel({ snapshot, network, error }: { snapshot: ScenarioSnapshot; network: NetworkGeojson | null; error: string | null }) {
  const points = network?.features.filter(isPoint) ?? [];
  const links = network?.features.filter(f => f.geometry.type === 'LineString') ?? [];
  const kinds = new Map(points.map(f => [f.properties.asset_token, f.properties.kind]));
  const path = network?.paths[0] ?? [];
  const toXY = network && network.features.length ? project(network.features) : null;
  const incidentOnMap = points.some(f => f.properties.asset_token === snapshot.current_asset_id);
  const affected = snapshot.affected_premise_tokens.length;
  return <section className="utility-panel utility-network" aria-labelledby="utility-network-heading">
    <div className="utility-panel-heading">
      <div><h2 id="utility-network-heading">Network & supply path</h2><p>Sanitized equipment slice · {network ? PROVENANCE[network.provenance as Provenance] ?? humanize(network.provenance) : 'loading'}</p></div>
      <span className={`utility-badge ${network?.status === 'KNOWN' ? 'utility-badge-info' : 'utility-badge-neutral'}`}>{network ? `Path ${humanize(network.status)}` : error ? 'Unavailable' : 'Loading'}</span>
    </div>
    <div className="utility-network-body">
      <div className="utility-network-map">
        {toXY ? <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Schematic map of ${points.length} generalized equipment points and ${links.length} supplied upstream links`}>
          <defs><pattern id="utility-network-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#223646" strokeWidth="1" /></pattern></defs>
          <rect width={W} height={H} fill="url(#utility-network-grid)" />
          {links.map((f, i) => {
            const coords = (f.geometry as Extract<NetworkFeature['geometry'], { type: 'LineString' }>).coordinates.map(toXY);
            return <polyline key={i} points={coords.map(c => c.join(',')).join(' ')} fill="none" stroke="#6f879a" strokeWidth="2" strokeDasharray="6 5" />;
          })}
          {points.map(f => {
            const [x, y] = toXY(f.geometry.coordinates);
            const token = f.properties.asset_token ?? '';
            // Labels sit on the outer side of the slice so neighbouring points never share label space.
            const right = x >= W / 2;
            return <g key={token}>
              <Marker kind={f.properties.kind} x={x} y={y} active={token === snapshot.current_asset_id} />
              <text x={right ? x + 15 : x - 15} y={y - 2} textAnchor={right ? 'start' : 'end'} fill="var(--u-text)" fontSize="12" fontFamily="ui-monospace, monospace">{token}</text>
              <text x={right ? x + 15 : x - 15} y={y + 13} textAnchor={right ? 'start' : 'end'} fill="var(--u-muted)" fontSize="11">{kindLabel(f.properties.kind)}</text>
            </g>;
          })}
        </svg> : <p className="utility-empty">{error ? 'Network slice unavailable from the API.' : 'Loading network slice…'}</p>}
        {network ? <div className="utility-network-legend" aria-hidden="true">
          <span><svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1L13 7L7 13L1 7Z" fill="#1b3545" stroke="var(--u-info)" strokeWidth="1.5" /></svg>Fuse</span>
          <span><svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" rx="1" fill="#1b3545" stroke="var(--u-info)" strokeWidth="1.5" /></svg>Transformer</span>
          <span><svg width="22" height="14" viewBox="0 0 22 14"><path d="M1 7H21" stroke="#6f879a" strokeWidth="2" strokeDasharray="4 3" /></svg>Supplied link, not a conductor route</span>
        </div> : null}
      </div>
      <div className="utility-network-trace">
        <h3>Reference premise trace</h3>
        {network && path.length ? <>
          <p className="utility-muted"><code>{network.selected_premise_token}</code> → upstream</p>
          <ol className="utility-trace-list">
            <li className="utility-trace-premise"><span>Premise</span><code>{network.selected_premise_token}</code></li>
            {path.map((token, i) => {
              const missing = network.missing_geometry_tokens.includes(token);
              const label = kinds.get(token) ? kindLabel(kinds.get(token)) : i === path.length - 1 ? 'Circuit breaker' : 'Equipment';
              return <li key={token} className={missing ? 'utility-trace-missing' : undefined}><span>{label}</span><code>{token}</code>{missing ? <small>No map geometry</small> : null}</li>;
            })}
          </ol>
          <p className="utility-footnote">{network.available_peer_count} reference premises share this path{network.truncated ? ' (truncated)' : ''}. Substation connectivity unknown.</p>
        </> : <p className="utility-empty">{error ? 'Trace unavailable.' : 'No supplied path.'}</p>}
        <div className="utility-network-incident">
          <h3>This incident</h3>
          <p><code>{snapshot.current_asset_id}</code> · {affected} listed premise{affected === 1 ? '' : 's'} · selected <code>{snapshot.selected_premise_token}</code></p>
          <p className="utility-muted">{incidentOnMap ? 'Incident asset is highlighted on the map.' : 'Demonstration incident asset is not in the sanitized slice, so it is not placed on this map.'}</p>
        </div>
      </div>
    </div>
    {network ? <p className="utility-network-policy">{network.geometry_policy} Basis: {humanize(network.relationship_basis)}.</p> : null}
  </section>;
}
