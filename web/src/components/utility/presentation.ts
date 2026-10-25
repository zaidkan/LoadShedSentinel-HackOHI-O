import type { EvidenceQuality, Provenance } from '../../../../contracts/types';

export const PROVENANCE: Record<Provenance, string> = {
  aep_challenge: 'AEP challenge', external_research: 'External research', modeled_sensor: 'Modeled sensor', scenario: 'Scenario', authorized_enterprise: 'Authorized enterprise',
};
export const PROVENANCE_NOTE: Record<Provenance, string> = {
  aep_challenge: 'Supplied challenge record; field quality is identified separately.',
  modeled_sensor: 'Modeled node input; not a field observation.',
  scenario: 'Input supplied by the demonstration scenario.',
  external_research: 'External reference; not an operational feed.',
  authorized_enterprise: 'Authorized enterprise source; see each record’s quality.',
};
export const QUALITY: Record<EvidenceQuality, string> = { observed: 'Observed', modeled: 'Modeled', reported: 'Reported', field_confirmed: 'Field confirmed', missing: 'Missing' };
export const humanize = (value: string) => value.replace(/_/g, ' ').toLowerCase();
export const sentenceCase = (value: string) => { const text = humanize(value); return text.charAt(0).toUpperCase() + text.slice(1); };
export const numberText = (value: number | null | undefined, maximumFractionDigits = 1): string => value === null || value === undefined || !Number.isFinite(value) ? 'Unavailable' : new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
export function utcText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(date) + ' UTC';
}
export function evidenceValue(value: string | number | boolean | null): string {
  return value === null ? 'Unavailable' : typeof value === 'number' ? numberText(value, 2) : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value;
}

const KIND_LABEL: Record<string, string> = {
  TRANSFORMER: 'Transformer', FUSE: 'Fuse', RECLOSER: 'Recloser', CIRCUIT_BREAKER: 'Circuit breaker', SWITCH: 'Switch',
};
export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? sentenceCase(kind);
export const tokenTail = (token: string) => `…${token.slice(-8)}`;

/** A planning range as the console charts print it: 1.6875, 3.375 → "1.69–3.38 h". */
export const rangeHoursText = (lower: number | null | undefined, upper: number | null | undefined) =>
  lower === null || lower === undefined || upper === null || upper === undefined || !Number.isFinite(lower) || !Number.isFinite(upper)
    ? 'Unavailable' : `${numberText(lower, 2)}–${numberText(upper, 2)} h`;

export function scoreText(scoreType: string, score: number | null): string {
  if (scoreType === 'calibrated_probability' && score !== null && Number.isFinite(score) && score >= 0 && score <= 1) return `Calibrated probability · ${numberText(score * 100)}%`;
  if (scoreType === 'relative_evidence' && score !== null && Number.isFinite(score)) return `Relative evidence score · ${numberText(score, 2)}`;
  return 'Score unavailable';
}
