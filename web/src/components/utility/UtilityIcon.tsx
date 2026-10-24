export function UtilityIcon({ kind }: { kind: 'left' | 'right' | 'plus' | 'minus' | 'pole' }) {
  const paths = { left: 'M8 4 3 9l5 5M3 9h8a6 6 0 0 1 0 12', right: 'm16 4 5 5-5 5M21 9h-8a6 6 0 0 0 0 12', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', pole: 'M12 3v18M5 7h14M7 4v5M17 4v5M10 13H6v5h4M15 11h4v6h-4z' };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
