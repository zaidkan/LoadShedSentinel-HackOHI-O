import type { ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, numberText, utcText } from './presentation';

export function TelemetryHUD({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const cutout = snapshot.evidence.find(e => e.kind === 'cutout_state' && e.incident_id === snapshot.incident_id && (!e.asset_id || e.asset_id === snapshot.current_asset_id) && e.value === snapshot.cutout_status);
  const { solar } = snapshot;
  const validBattery = Number.isFinite(solar.battery_soc_pct) && solar.battery_soc_pct >= 0 && solar.battery_soc_pct <= 100;
  return <section className="utility-telemetry" aria-label="Asset telemetry and sensor-node battery">
    <div className="utility-instrument utility-cutout-instrument">
      <div className="utility-instrument-label">Protective cutout</div>
      <strong className={`utility-reading utility-state-${snapshot.cutout_status.toLowerCase()}`}>{snapshot.cutout_status}</strong>
      <span>{cutout ? `${QUALITY[cutout.quality]} · ${PROVENANCE[cutout.provenance]}` : 'Source not supplied'}</span>
      {cutout ? <time dateTime={cutout.timestamp_utc}>{utcText(cutout.timestamp_utc)}</time> : null}
    </div>
    <div className="utility-instrument">
      <div className="utility-instrument-label">Sensor-node battery</div>
      <strong className="utility-reading">{validBattery ? `${numberText(solar.battery_soc_pct)}%` : 'Unavailable'}</strong>
      {validBattery ? <meter min={0} max={100} value={solar.battery_soc_pct} aria-label="Modeled battery state of charge" /> : null}
      <span>Modeled · {numberText(solar.nominal_wh)} Wh nominal</span>
    </div>
    <div className="utility-instrument">
      <div className="utility-instrument-label">Solar & communications</div>
      <strong className="utility-reading">{numberText(solar.solar_w)} <small>W</small></strong>
      <span>{solar.connectivity} · {numberText(solar.buffered_events, 0)} buffered events</span>
      <span>Modeled runtime: {solar.modeled_runtime_days === null ? 'unavailable' : `${numberText(solar.modeled_runtime_days)} days`}</span>
    </div>
  </section>;
}
