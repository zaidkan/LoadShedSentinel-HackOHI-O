import type { CutoutStatus } from '../../../contracts/types';
import { CUTOUT_VISUAL } from './visual-state';

export interface PoleDiagramProps {
  status: CutoutStatus;
  labels?: boolean;
}

/** 2D technical SVG fallback when 3D is unavailable or when the operator toggles 2D view. */
export function PoleDiagram({ status, labels = true }: PoleDiagramProps) {
  const visual = CUTOUT_VISUAL[status];
  return <svg viewBox="0 0 640 480" role="img" aria-label={`Equipment diagram showing pole, transformer, Sentinel node, solar panel, and cutout switch in ${status} state.`} className="utility-pole-diagram">
    <rect width="640" height="480" fill="var(--night-1)" />
    <path d="M312 40V460H328V40Z" fill="#3e2d1d" stroke="#5d432b" strokeWidth="2" />
    <path d="M180 80H460V96H180Z" fill="#2d3f4f" stroke="#485f73" strokeWidth="2" />
    <circle cx="210" cy="72" r="12" fill="#587185" stroke="#7793ab" strokeWidth="2" />
    <circle cx="320" cy="72" r="12" fill="#587185" stroke="#7793ab" strokeWidth="2" />
    <circle cx="430" cy="72" r="12" fill="#587185" stroke="#7793ab" strokeWidth="2" />
    <rect x="336" y="160" width="68" height="120" rx="10" fill="#293947" stroke="#496277" strokeWidth="3" />
    <path d="M350 160V140H366V160M374 160V140H390V160" stroke="#7793ab" strokeWidth="3" fill="none" />
    <rect x="236" y="320" width="50" height="70" rx="6" fill="#1f3328" stroke="#3d624f" strokeWidth="2" />
    <circle cx="261" cy="340" r="5" fill="#44d18d" />
    <polygon points="340,360 420,330 435,390 355,420" fill="#1e3247" stroke="#4a6a8c" strokeWidth="2" />
    <path d="M254 130V260" stroke="#485f73" strokeWidth="3" fill="none" />
    <circle cx="254" cy="170" r="10" fill="#2d3f4f" stroke="#7793ab" strokeWidth="2" />
    <circle cx="254" cy="251" r="7" fill="#485f73" />
    {status === 'UNKNOWN' ? <g><circle cx="254" cy="215" r="19" fill="#233344" stroke={visual.color} strokeDasharray="4 4" /><text x="254" y="222" textAnchor="middle" fill={visual.color} fontSize="22">?</text></g> : <g transform={`rotate(${-(visual.angle ?? 0) * 180 / Math.PI} 254 251)`} data-cutout-angle={visual.angle}>
      <path d="M254 251V185" stroke="#986e51" strokeWidth="9" /><path d="M254 201V190" stroke={visual.color} strokeWidth="10" />
    </g>}
    {labels ? <>
      <g stroke="var(--on-night-muted)" fill="none"><path d="M251 210H167V184H100M405 250H448V231H541M287 333H199V353H100M356 381H445V393H541" /></g>
      <g fill="var(--on-night)" fontSize="13" fontFamily="var(--font-body)"><text x="100" y="174">Cutout · {visual.label.toLowerCase()}</text><text x="448" y="222">Transformer</text><text x="100" y="373">Sentinel node</text><text x="446" y="416">Solar panel</text></g>
      <text x="320" y="450" textAnchor="middle" fill="var(--on-night-muted)" fontSize="12" fontFamily="var(--font-body)">Illustrative 2D equipment diagram · no surveyed geometry</text>
    </> : null}
  </svg>;
}
