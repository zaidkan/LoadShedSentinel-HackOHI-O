import type { ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, evidenceValue, numberText, utcText } from './presentation';

export function TelemetryHUD({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const records = snapshot.evidence.filter(e => e.incident_id === snapshot.incident_id && (!e.asset_id || e.asset_id === snapshot.current_asset_id));
  const cutout = records.find(e => e.kind === 'cutout_state' && e.value === snapshot.cutout_status);
  const temperatureValues = [...new Set(records.filter(e => e.kind === 'temperature_state').map(e => e.value))];
  const { solar } = snapshot;
  const validBattery = Number.isFinite(solar.battery_soc_pct) && solar.battery_soc_pct >= 0 && solar.battery_soc_pct <= 100;

  return <section className="utility-telemetry utility-panel" aria-labelledby="utility-simulation-heading">
    <div className="utility-panel-heading"><h3 id="utility-simulation-heading">Modeled Simulation</h3><span className="utility-badge utility-badge-neutral">No live feed</span></div>
    <p className="utility-panel-intro">Scenario inputs, not live supervisory control and data acquisition (SCADA) feeds.</p>
    <div className="utility-instrument utility-cutout-instrument">
      <div className="utility-instrument-label">Protective cutout</div>
      <strong className={`utility-reading utility-state-${snapshot.cutout_status.toLowerCase()}`}>{snapshot.cutout_status}</strong>
      <span>{cutout ? `${QUALITY[cutout.quality]} · ${PROVENANCE[cutout.provenance]}` : 'Matching evidence not supplied; position unverified'}</span>
      {cutout ? <time dateTime={cutout.timestamp_utc}>{utcText(cutout.timestamp_utc)}</time> : null}
    </div>
    <div className="utility-instrument utility-temperature-instrument">
      <div className="utility-instrument-label">Thermal condition</div>
      <strong className="utility-reading">{temperatureValues.length > 1 ? 'Conflicting inputs' : temperatureValues.length ? evidenceValue(temperatureValues[0]) : 'Unavailable'}</strong>
      <span>Qualitative state · no measured temperature supplied</span>
    </div>
    <div className="utility-node-instruments">
      <div className="utility-instrument">
        <div className="utility-instrument-label">Sensor-node battery</div>
        <strong className="utility-reading">{validBattery ? `${numberText(solar.battery_soc_pct)}%` : 'Unavailable'}</strong>
        {validBattery ? <meter min={0} max={100} value={solar.battery_soc_pct} aria-label="Modeled battery state of charge" /> : null}
        <span>{numberText(solar.nominal_wh)} Wh nominal · modeled</span>
      </div>
      <div className="utility-instrument">
        <div className="utility-instrument-label">Solar & communications</div>
        <strong className="utility-reading">{numberText(solar.solar_w)} <small>W</small></strong>
        <span>{solar.connectivity} · {numberText(solar.buffered_events, 0)} buffered events</span>
        <span>Modeled runtime: {solar.modeled_runtime_days === null ? 'unavailable' : `${numberText(solar.modeled_runtime_days)} days`}</span>
      </div>
    </div>
    <p className="utility-telemetry-note">Sensor-node energy is separate from household backup-power planning.</p>
  </section>;
}
