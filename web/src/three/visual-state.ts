import type { CutoutStatus } from '../../../contracts/types';

/** Presentation mapping only: UNKNOWN has no asserted physical position. */
export const CUTOUT_VISUAL = {
  OPEN: { angle: -2.05, label: 'Open', color: '#e9b965' },
  CLOSED: { angle: 0, label: 'Closed', color: '#84d4b0' },
  UNKNOWN: { angle: null, label: 'Unknown', color: '#b4c1d0' },
} satisfies Record<CutoutStatus, { angle: number | null; label: string; color: string }>;
