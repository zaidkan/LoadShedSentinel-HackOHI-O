import { numberText } from '../utility/presentation';
import './range-chart.css';

export interface RangeMarker {
  label: string;
  value: number;
  tone: 'strong' | 'soft';
}

export interface RangeChartProps {
  lower: number | null;
  expected: number | null;
  upper: number | null;
  label: string;
  markers?: RangeMarker[];
  bandLabel?: string;
  tone?: 'paper' | 'night';
}

function niceStep(span: number) {
  const raw = span / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

const finite = (value: number | null | undefined): value is number => value !== null && value !== undefined && Number.isFinite(value);

/** Hours axis with the supplied planning band, its expected value, and optional comparison bars. */
export function RangeChart({ lower, expected, upper, label, markers = [], bandLabel = 'Planning range', tone = 'paper' }: RangeChartProps) {
  const values = [lower, expected, upper, ...markers.map(marker => marker.value)].filter(finite);
  const top = Math.max(1, ...values) * 1.08;
  const step = niceStep(top);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const at = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  const hasBand = finite(lower) && finite(upper);
  return <figure className="range-chart" data-tone={tone} role="group" aria-label={label}>
    <div className="range-chart-plot">
      <div className="range-chart-grid" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: at(tick) }} />)}</div>
      <div className="range-chart-lane">
        {hasBand ? <div className="range-chart-band" style={{ left: at(lower), width: `calc(${at(upper)} - ${at(lower)})` }}>
          <span className="range-chart-band-label">{bandLabel} · {numberText(lower)}–{numberText(upper)} h</span>
        </div> : <p className="range-chart-empty">No range supplied</p>}
        {finite(expected) ? <div className="range-chart-expected" style={{ left: at(expected) }}><span>Expected {numberText(expected)} h</span></div> : null}
      </div>
      {markers.map(marker => <div className="range-chart-lane range-chart-lane--bar" key={marker.label}>
        <div className="range-chart-bar" data-tone={marker.tone} style={{ width: at(marker.value) }} />
        <span className="range-chart-bar-label">{marker.label} · {numberText(marker.value)} h</span>
      </div>)}
      <div className="range-chart-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: at(tick) }}>{numberText(tick)} h</span>)}</div>
    </div>
  </figure>;
}
