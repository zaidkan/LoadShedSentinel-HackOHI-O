import type { CutoutStatus } from '../../../contracts/types';
import { CUTOUT_VISUAL } from './visual-state';

export function PoleDiagram({ status }: { status: CutoutStatus }) {
  const visual = CUTOUT_VISUAL[status];
  return <svg viewBox="0 0 640 470" role="img" aria-label={`Illustrative equipment diagram. Cutout ${visual.label.toLowerCase()}. ${status === 'UNKNOWN' ? 'Physical fuse position is not shown.' : ''}`} className="utility-pole-diagram">
    <g fill="none" stroke="#6c8295" strokeWidth="1"><path d="M105 415H535M138 90H510M138 108H510" /><path strokeDasharray="4 5" d="M312 50V420" /></g>
    <path d="M303 60H321L329 415H295Z" fill="#8c7156" stroke="#ba9a74" />
    <path d="M204 115H424V128H204Z" fill="#9a8060" />
    {[225, 312, 400].map(x => <g key={x} stroke="#becbd3" strokeWidth="5"><path d={`M${x} 91V116`} /><path d={`M${x - 9} 98H${x + 9}M${x - 9} 106H${x + 9}`} /></g>)}
    <rect x="329" y="204" width="78" height="112" rx="7" fill="#9faab2" stroke="#d1d9df" strokeWidth="2" />
    <path d="M330 213H406M330 307H406" stroke="#d1d9df" strokeWidth="3" />
    <rect x="349" y="246" width="36" height="22" fill="#526371" />
    <rect x="273" y="312" width="29" height="42" rx="3" fill="#456873" stroke="#c4d5db" />
    <path d="M292 311V299" stroke="#a9bac7" strokeWidth="3" />
    <path d="M295 366L354 355L366 387L305 401Z" fill="#233e61" stroke="#afc2cf" strokeWidth="3" />
    <path d="M308 368L317 396M322 365L332 392M338 361L348 388M300 378L360 368" stroke="#6483a1" />
    <path d="M305 186H254V253H305" fill="none" stroke="#6f879a" strokeWidth="5" />
    <circle cx="254" cy="251" r="5" fill="#c1cbd3" />
    {status === 'UNKNOWN' ? <g><circle cx="254" cy="215" r="19" fill="#233344" stroke={visual.color} strokeDasharray="4 4" /><text x="254" y="222" textAnchor="middle" fill={visual.color} fontSize="22">?</text></g> : <g transform={`rotate(${-(visual.angle ?? 0) * 180 / Math.PI} 254 251)`} data-cutout-angle={visual.angle}>
      <path d="M254 251V185" stroke="#986e51" strokeWidth="9" /><path d="M254 201V190" stroke={visual.color} strokeWidth="10" />
    </g>}
    <g stroke="#6c8295" fill="none"><path d="M251 210H167V184H100M405 250H448V231H541M287 333H199V353H100M356 381H445V393H541" /></g>
    <g fill="#c5d2df" fontSize="13" fontFamily="system-ui, sans-serif"><text x="100" y="174">Cutout · {visual.label.toLowerCase()}</text><text x="448" y="222">Transformer</text><text x="100" y="373">Sensor pod</text><text x="446" y="416">Solar panel</text></g>
    <text x="320" y="450" textAnchor="middle" fill="#9eafbf" fontSize="12" fontFamily="system-ui, sans-serif">Illustrative 2D equipment diagram · no surveyed geometry</text>
  </svg>;
}
