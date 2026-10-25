import type { Evidence, ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, evidenceValue, numberText, sentenceCase, utcText } from './presentation';

const shortId = (id: string) => id.split(':').pop() ?? id;

/** Asset-scoped readings of one kind. Several distinct values mean the records conflict. */
function readings(snapshot: ScenarioSnapshot, kind: string): Evidence[] {
  return snapshot.evidence.filter(e => e.kind === kind && e.incident_id === snapshot.incident_id && (!e.asset_id || e.asset_id === snapshot.current_asset_id));
}

function ReadingSource({ records }: { records: Evidence[] }) {
  if (!records.length) return <span className="instrument-sub">No record supplied</span>;
  const distinct = new Set(records.map(e => String(e.value)));
  if (distinct.size > 1) return <span className="instrument-sub instrument-sub--conflict">
    Conflicting records: {records.map(e => `${shortId(e.id)} ${evidenceValue(e.value).toLowerCase()}`).join(' · ')}
  </span>;
  const first = records[0];
  return <span className="instrument-sub">
    <span className="tag" data-source={first.provenance}>{PROVENANCE[first.provenance]}</span>
    <span>{QUALITY[first.quality]} · <time dateTime={first.timestamp_utc}>{utcText(first.timestamp_utc)}</time></span>
  </span>;
}

export function TelemetryHUD({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const cutout = readings(snapshot, 'cutout_state');
  const temperature = readings(snapshot, 'temperature_state');
  const temperatureValues = new Set(temperature.map(e => String(e.value)));
  const temperatureReading = !temperature.length ? 'Not supplied' : temperatureValues.size > 1 ? 'Conflicting' : sentenceCase(String(temperature[0].value));
  const temperatureState = temperatureValues.size > 1 ? 'unknown' : temperatureReading === 'Hot' ? 'critical' : temperatureReading === 'Normal' ? 'normal' : 'unknown';
  const { solar } = snapshot;
  const validBattery = Number.isFinite(solar.battery_soc_pct) && solar.battery_soc_pct >= 0 && solar.battery_soc_pct <= 100;
  const cutoutLabel = snapshot.cutout_status === 'UNKNOWN' ? 'Not asserted' : sentenceCase(snapshot.cutout_status);
  return <section className="instruments" aria-label="Asset telemetry and sensor-node readings">
    <div className="instrument">
      <h3 className="instrument-label">Protective cutout</h3>
      <p className="instrument-reading" data-state={snapshot.cutout_status.toLowerCase()}>{cutoutLabel}</p>
      <ReadingSource records={cutout} />
    </div>
    <div className="instrument">
      <h3 className="instrument-label">Transformer temperature</h3>
      <p className="instrument-reading" data-state={temperatureState}>{temperatureReading}</p>
      <ReadingSource records={temperature} />
    </div>
    <div className="instrument">
      <h3 className="instrument-label">Sensor-node battery</h3>
      <p className="instrument-reading">{validBattery ? <>{numberText(solar.battery_soc_pct)}<small>%</small></> : 'Unavailable'}</p>
      {validBattery ? <meter className="instrument-meter" min={0} max={100} low={20} high={50} optimum={90} value={solar.battery_soc_pct} aria-label="Modeled battery state of charge" /> : null}
      <span className="instrument-sub"><span className="tag" data-source="modeled_sensor">Modeled sensor</span><span>{numberText(solar.nominal_wh)} Wh nominal</span></span>
    </div>
    <div className="instrument">
      <h3 className="instrument-label">Solar and link</h3>
      <p className="instrument-reading">{numberText(solar.solar_w)}<small> W</small></p>
      <span className="instrument-sub">
        <span>{sentenceCase(solar.connectivity)} · {numberText(solar.buffered_events, 0)} buffered events</span>
        <span>Modeled runtime {solar.modeled_runtime_days === null ? 'unavailable' : `${numberText(solar.modeled_runtime_days)} days`}</span>
      </span>
    </div>
  </section>;
}
