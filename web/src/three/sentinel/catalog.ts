/**
 * Component catalog shared by the 3D scene and the DOM chrome around it. Kept free of
 * three.js imports so page shells can render labels before the 3D chunk loads.
 */
export const SENTINEL_PART_IDS = ['sentinel', 'transformer', 'cutout', 'solar', 'crossarm'] as const;
export type SentinelPartId = typeof SENTINEL_PART_IDS[number];
export type SentinelFocus = 'overview' | SentinelPartId;

export interface PartEntry { id: SentinelPartId; index: string; label: string; short: string; summary: string }

export const SENTINEL_PARTS: Record<SentinelPartId, PartEntry> = {
  sentinel: {
    id: 'sentinel', index: '01', label: 'Sentinel node', short: 'Sentinel',
    summary: 'Proposed pole-mounted sensing node: surface-temperature, vibration and acoustic event inputs with a store-and-forward buffer and cellular backhaul. A modeled concept, not installed hardware.',
  },
  transformer: {
    id: 'transformer', index: '02', label: 'Distribution transformer', short: 'Transformer',
    summary: 'Pole-mounted single-phase tank with primary bushing, secondary terminals and hanger brackets. The Sentinel tank probe sits on its front wall.',
  },
  cutout: {
    id: 'cutout', index: '03', label: 'Protective cutout', short: 'Cutout',
    summary: 'Fused cutout on the primary tap. In inspection mode its fuse door follows the incident’s reported state; an unknown state is never drawn as open or closed.',
  },
  solar: {
    id: 'solar', index: '04', label: 'Solar power module', short: 'Solar',
    summary: 'Side-of-pole panel that charges the node’s battery bay. Panel and battery figures are modeled design inputs.',
  },
  crossarm: {
    id: 'crossarm', index: '05', label: 'Crossarm & conductors', short: 'Crossarm',
    summary: 'Primary crossarm with pin insulators, brace straps and overhead conductors. Illustrative framing, not surveyed construction.',
  },
};

export const FOCUS_ORDER: SentinelFocus[] = ['overview', ...SENTINEL_PART_IDS];

export function focusLabel(focus: SentinelFocus) {
  return focus === 'overview' ? 'Overview' : SENTINEL_PARTS[focus].short;
}
