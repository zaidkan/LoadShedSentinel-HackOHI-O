import type { ScenarioSnapshot } from '../../../contracts/types';
import { numberText, tokenTail } from '../components/utility/presentation';
import { CUTOUT_VISUAL } from '../three/visual-state';
import type { SentinelHotspot } from './types';

/** Hotspot readings for the loaded incident. Every value comes from the snapshot; sensor values stay labelled as modeled. */
export function incidentHotspots(snapshot: ScenarioSnapshot | null): SentinelHotspot[] {
  if (!snapshot) return [];
  const status = snapshot.cutout_status;
  const { solar } = snapshot;
  return [
    { part: 'cutout', label: 'Protective cutout', value: `${CUTOUT_VISUAL[status].label} · modeled`, tone: status === 'OPEN' ? 'open' : status === 'CLOSED' ? 'closed' : 'unknown' },
    { part: 'transformer', label: 'Transformer', value: tokenTail(snapshot.current_asset_id), tone: 'neutral' },
    { part: 'sensor-pod', label: 'Sensor node charge', value: `${numberText(solar.battery_soc_pct)}% · modeled`, tone: 'neutral' },
    { part: 'solar-panel', label: 'Solar input', value: `${numberText(solar.solar_w)} W · modeled`, tone: 'neutral' },
  ];
}
