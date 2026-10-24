import type { EvidenceQuality, Provenance } from '../../../../contracts/types';

export const PROVENANCE: Record<Provenance, string> = {
  aep_challenge: 'AEP challenge', external_research: 'External research', modeled_sensor: 'Modeled sensor', scenario: 'Scenario', authorized_enterprise: 'Authorized enterprise',
};
export const QUALITY: Record<EvidenceQuality, string> = { observed: 'Observed', modeled: 'Modeled', reported: 'Reported', field_confirmed: 'Field confirmed', missing: 'Missing' };
export const humanize = (value: string) => value.replace(/_/g, ' ').toLowerCase();
export const numberText = (value: number | null | undefined, maximumFractionDigits = 1): string => value === null || value === undefined || !Number.isFinite(value) ? 'Unavailable' : new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
export function utcText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(date) + ' UTC';
}
export function evidenceValue(value: string | number | boolean | null): string {
  return value === null ? 'Unavailable' : typeof value === 'number' ? numberText(value, 2) : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value;
}
