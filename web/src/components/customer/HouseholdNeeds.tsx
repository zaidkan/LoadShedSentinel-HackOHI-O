import { Accessibility, BatteryCharging, Droplets, HeartPulse, Pill, Refrigerator, Smartphone, type LucideIcon } from 'lucide-react';
import type { PreparednessGuidance } from '../../services/api';

export interface HouseholdNeeds {
  food_refrigeration: boolean;
  refrigerated_medication: boolean;
  life_critical_medical_device: boolean;
  medical_device_notes: string;
  mobility_accessibility_needs: boolean;
  communications_charging: boolean;
  sump_pump: boolean;
  backup_battery_available: boolean;
  battery_capacity_wh: number;
  battery_usable_pct: number;
  essential_load_w: number;
}

export const DEFAULT_NEEDS: HouseholdNeeds = {
  food_refrigeration: true,
  refrigerated_medication: false,
  life_critical_medical_device: false,
  medical_device_notes: '',
  mobility_accessibility_needs: false,
  communications_charging: true,
  sump_pump: false,
  backup_battery_available: true,
  battery_capacity_wh: 1000,
  battery_usable_pct: 0.85,
  essential_load_w: 120,
};

type NeedKey = 'life_critical_medical_device' | 'refrigerated_medication' | 'mobility_accessibility_needs' | 'food_refrigeration' | 'sump_pump' | 'communications_charging' | 'backup_battery_available';

const NEEDS: Array<{ key: NeedKey; label: string; hint: string; Icon: LucideIcon }> = [
  { key: 'life_critical_medical_device', label: 'Life-critical medical device', hint: 'Oxygen, breathing, dialysis or similar equipment', Icon: HeartPulse },
  { key: 'refrigerated_medication', label: 'Medicine that must stay cold', hint: 'Insulin or other refrigerated medication', Icon: Pill },
  { key: 'mobility_accessibility_needs', label: 'Mobility or accessibility needs', hint: 'Powered chair, lift or stair access', Icon: Accessibility },
  { key: 'food_refrigeration', label: 'Food in the fridge or freezer', hint: 'Keeping food cold and safe', Icon: Refrigerator },
  { key: 'sump_pump', label: 'Basement sump pump', hint: 'Keeping water out of the basement', Icon: Droplets },
  { key: 'communications_charging', label: 'Phones and devices to charge', hint: 'Staying reachable', Icon: Smartphone },
  { key: 'backup_battery_available', label: 'Backup battery or power station', hint: 'Plan its runtime below', Icon: BatteryCharging },
];

const CATEGORY_ICON: Record<string, LucideIcon> = {
  CRITICAL_MEDICAL: HeartPulse, MEDICATION: Pill, ACCESSIBILITY: Accessibility, FOOD_SAFETY: Refrigerator, WATER_DAMAGE: Droplets, COMMUNICATIONS: Smartphone,
};
const PRIORITY_RANK: Record<string, number> = { IMMEDIATE: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_LABEL: Record<string, string> = { IMMEDIATE: 'Do this now', HIGH: 'High priority', MEDIUM: 'Worth doing', LOW: 'When you can' };
const PRIORITY_STATE: Record<string, string> = { IMMEDIATE: 'critical', HIGH: 'open', MEDIUM: 'unknown', LOW: 'unknown' };

export function NeedsPicker({ needs, onChange }: { needs: HouseholdNeeds; onChange: (next: HouseholdNeeds) => void }) {
  return <fieldset className="needs">
    <legend className="sr-only">What depends on power in your home</legend>
    <div className="needs-grid">
      {NEEDS.map(({ key, label, hint, Icon }) => <label key={key} className="need" data-checked={needs[key] || undefined} data-tone={key === 'life_critical_medical_device' ? 'critical' : undefined}>
        <input type="checkbox" checked={needs[key]} onChange={event => onChange({ ...needs, [key]: event.target.checked })} />
        <span className="need-icon" aria-hidden="true"><Icon /></span>
        <span className="need-text"><span className="need-label">{label}</span><span className="need-hint">{hint}</span></span>
        <span className="need-check" aria-hidden="true" />
      </label>)}
    </div>
    {needs.life_critical_medical_device ? <label className="field needs-notes">
      <span className="field-label">Device notes <span className="muted">(optional)</span></span>
      <textarea className="input" value={needs.medical_device_notes} maxLength={500} onChange={event => onChange({ ...needs, medical_device_notes: event.target.value })} placeholder="For example: oxygen concentrator, needs power overnight" />
      <span className="field-hint">Sent with this guidance request only.</span>
    </label> : null}
  </fieldset>;
}

export function GuidanceList({ guidance, state }: { guidance: PreparednessGuidance[]; state: 'idle' | 'loading' | 'error' }) {
  const ordered = [...guidance].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  if (state === 'error' && !guidance.length) return <p className="cust-alert" role="alert">Preparation steps could not be loaded. Your choices are kept; try changing one to reload.</p>;
  if (!ordered.length) return <p className="cust-empty">Choose what depends on power at home to see steps for your household.</p>;
  return <ol className="guidance" aria-busy={state === 'loading'}>
    {ordered.map((item, index) => {
      const Icon = CATEGORY_ICON[item.category] ?? HeartPulse;
      return <li key={`${item.category}-${index}`} className="guidance-item" data-priority={item.priority.toLowerCase()}>
        <span className="guidance-icon" aria-hidden="true"><Icon /></span>
        <div className="guidance-body">
          <span className="state" data-state={PRIORITY_STATE[item.priority] ?? 'unknown'}>{PRIORITY_LABEL[item.priority] ?? item.priority.toLowerCase()}</span>
          <h3 className="guidance-action">{item.action}</h3>
          <p className="guidance-detail">{item.detail}</p>
        </div>
      </li>;
    })}
  </ol>;
}
