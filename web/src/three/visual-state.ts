import type { CutoutStatus } from '../../../contracts/types';

/** Dusk state-fill colors for Three.js and SVG; UNKNOWN has no asserted physical position. */
export const CUTOUT_VISUAL = {
  OPEN: { angle: -2.05, label: 'Open', color: '#f0b04a' },
  CLOSED: { angle: 0, label: 'Closed', color: '#59c494' },
  UNKNOWN: { angle: null, label: 'Unknown', color: '#a9aec8' },
} satisfies Record<CutoutStatus, { angle: number | null; label: string; color: string }>;
