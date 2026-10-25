import { useEffect, useId, useState } from 'react';
import { CornerDownRight, Menu, X } from 'lucide-react';
import { Link, type RoutePath } from '../../app/router';
import { useMotion } from '../../app/motion';
import './shell.css';

const NAV: Array<{ to: RoutePath; label: string }> = [
  { to: '/', label: 'Overview' },
  { to: '/customer', label: 'Customer' },
  { to: '/operator', label: 'Operator' },
];

export function Wordmark() {
  return <span className="wordmark"><span>loadshed</span><span className="wordmark-accent">sentinel</span></span>;
}

function MotionToggle() {
  const { reduced, systemReduced, userReduced, setUserReduced } = useMotion();
  return <button
    type="button"
    className="header-motion"
    aria-pressed={reduced}
    disabled={systemReduced}
    title={systemReduced ? 'Your system setting already reduces motion' : undefined}
    onClick={() => setUserReduced(!userReduced)}
  >
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10c2.5-4 5-4 8 0s5.5 4 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />{reduced ? <path d="M3 17L17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> : null}</svg>
    <span>{reduced ? 'Motion off' : 'Motion on'}</span>
  </button>;
}

export interface SiteHeaderProps {
  route: RoutePath;
  tone: 'night' | 'paper';
  floating?: boolean;
}

export function SiteHeader({ route, tone, floating = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const cta = route === '/operator'
    ? { to: '/customer' as const, label: 'Customer view' }
    : { to: '/operator' as const, label: route === '/customer' ? 'Operator console' : 'Open console' };
  return <header className="site-header" data-tone={tone} data-floating={floating} data-open={open}>
    <div className="site-header-inner page">
      <Link to="/" className="site-header-brand" aria-label="LoadShed Sentinel overview"><Wordmark /></Link>
      <nav className="site-header-nav" aria-label="Primary">
        <ul>{NAV.map(item => <li key={item.to}><Link to={item.to} aria-current={route === item.to ? 'page' : undefined}>{item.label}</Link></li>)}</ul>
      </nav>
      <div className="site-header-tools">
        <MotionToggle />
        <Link to={cta.to} className={`btn btn--small ${tone === 'night' ? 'btn--night' : ''}`}>{cta.label}<CornerDownRight aria-hidden="true" /></Link>
      </div>
      <button type="button" className="site-header-menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}<span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
    </div>
    <div className="site-header-sheet" id={menuId} hidden={!open}>
      <nav aria-label="Primary mobile">
        <ul>{NAV.map(item => <li key={item.to}><Link to={item.to} aria-current={route === item.to ? 'page' : undefined} className="display">{item.label}</Link></li>)}</ul>
      </nav>
      <MotionToggle />
    </div>
  </header>;
}
