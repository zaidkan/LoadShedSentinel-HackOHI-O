import { useId, type CSSProperties } from 'react';
import type { BatteryCalcResult, CustomerSnapshotView } from '../../services/api';
import { RangeChart } from '../ui/RangeChart';
import { hoursWords, numberText } from '../utility/presentation';
import type { HouseholdNeeds } from './HouseholdNeeds';

export const INVERTER_EFFICIENCY = 0.85;
export const RESERVE_MARGIN = 0.15;

const fill = (value: number, min: number, max: number) => ({ '--fill': `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%` }) as CSSProperties;

function NumberSlider({ label, unit, value, min, max, step, onChange, hint }: {
  label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; hint?: string;
}) {
  const id = useId();
  return <div className="slider">
    <div className="slider-head">
      <label htmlFor={`${id}-n`} className="field-label">{label}</label>
      <span className="slider-input">
        <input id={`${id}-n`} className="input mono" type="number" inputMode="decimal" min={min} step={step} value={Number.isFinite(value) ? value : ''}
          onChange={event => onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
        <span aria-hidden="true">{unit}</span>
      </span>
    </div>
    <input className="range" type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value || min))} style={fill(value, min, max)}
      onChange={event => onChange(Number(event.target.value))} aria-label={`${label} slider`} aria-valuetext={`${value} ${unit}`} />
    {hint ? <span className="field-hint">{hint}</span> : null}
  </div>;
}

function coverage(conservative: number, restoration: CustomerSnapshotView['restoration_planning'] | undefined) {
  const expected = restoration?.expected_hours ?? null;
  if (!restoration || restoration.kind === 'unavailable' || expected === null) return 'There is no restoration estimate to compare with yet.';
  const { lower_hours: lower, upper_hours: upper } = restoration;
  if (upper !== null && conservative >= upper) return `That covers even the latest planning estimate (${hoursWords(upper)}).`;
  if (conservative >= expected) return `That covers the most likely estimate (${hoursWords(expected)}), but not the latest${upper !== null ? ` (${hoursWords(upper)})` : ''}.`;
  if (lower !== null && conservative >= lower) return `That covers only the earliest estimate (${hoursWords(lower)}). Lower the load or plan another option.`;
  return `That runs out before the earliest estimate${lower !== null ? ` (${hoursWords(lower)})` : ''}. Lower the load or plan another option.`;
}

export interface BatteryPlannerProps {
  needs: HouseholdNeeds;
  onChange: (next: HouseholdNeeds) => void;
  result: BatteryCalcResult | null;
  state: 'idle' | 'loading' | 'error';
  restoration?: CustomerSnapshotView['restoration_planning'];
}

export function BatteryPlanner({ needs, onChange, result, state, restoration }: BatteryPlannerProps) {
  if (!needs.backup_battery_available) return <div className="planner-off">
    <p>You told us there is no backup battery at home. If you have a portable power station or home battery, add it to see how long it could run your essentials.</p>
    <button type="button" className="btn btn--small" onClick={() => onChange({ ...needs, backup_battery_available: true })}>I have a backup battery</button>
  </div>;
  const valid = needs.battery_capacity_wh > 0 && needs.essential_load_w > 0 && needs.battery_usable_pct > 0;
  const ready = valid && result && result.usable_wh > 0;
  return <div className="planner">
    <div className="planner-inputs">
      <NumberSlider label="Battery capacity" unit="Wh" value={needs.battery_capacity_wh} min={100} max={5000} step={50} onChange={value => onChange({ ...needs, battery_capacity_wh: value })} hint="The watt-hour rating on the battery label." />
      <NumberSlider label="Share you can use" unit="%" value={Math.round(needs.battery_usable_pct * 100)} min={50} max={100} step={1} onChange={value => onChange({ ...needs, battery_usable_pct: value / 100 })} hint="Most batteries hold some charge back." />
      <NumberSlider label="Power your essentials draw" unit="W" value={needs.essential_load_w} min={10} max={2000} step={5} onChange={value => onChange({ ...needs, essential_load_w: value })} hint="Add up the watts of what you would keep running." />
      <p className="field-hint">Also assumed: {numberText(INVERTER_EFFICIENCY * 100, 0)}% inverter efficiency and a {numberText(RESERVE_MARGIN * 100, 0)}% safety reserve.</p>
    </div>
    <div className="planner-result" aria-live="polite" aria-busy={state === 'loading'}>
      {!valid ? <p className="cust-empty">Enter a capacity and a load above zero to plan runtime.</p>
        : state === 'error' && !result ? <p className="cust-alert" role="alert">The runtime could not be calculated. Check the connection and adjust a value to try again.</p>
        : !ready ? <p className="cust-empty">Calculating…</p>
        : <>
          <p className="planner-headline">Plan on about <strong>{hoursWords(result.conservative_hours)}</strong></p>
          <p className="planner-sub">with a {numberText(RESERVE_MARGIN * 100, 0)}% reserve kept back. Up to {hoursWords(result.theoretical_hours)} if fully drained. {coverage(result.conservative_hours, restoration)}</p>
          <dl className="planner-figures">
            <div><dt>Planned runtime</dt><dd className="num">{numberText(result.conservative_hours, 2)} h</dd></div>
            <div><dt>If fully drained</dt><dd className="num">{numberText(result.theoretical_hours, 2)} h</dd></div>
            <div><dt>Usable energy</dt><dd className="num">{numberText(result.usable_wh)} Wh</dd></div>
            <div><dt>Load at the battery</dt><dd className="num">{numberText(result.effective_load_w)} W</dd></div>
          </dl>
          <RangeChart
            label="Battery runtime compared with the restoration planning range"
            lower={restoration?.kind === 'unavailable' ? null : restoration?.lower_hours ?? null}
            expected={restoration?.kind === 'unavailable' ? null : restoration?.expected_hours ?? null}
            upper={restoration?.kind === 'unavailable' ? null : restoration?.upper_hours ?? null}
            bandLabel="Restoration estimate"
            markers={[
              { label: 'Planned runtime', value: result.conservative_hours, tone: 'strong' },
              { label: 'If fully drained', value: result.theoretical_hours, tone: 'soft' },
            ]}
          />
        </>}
    </div>
  </div>;
}
