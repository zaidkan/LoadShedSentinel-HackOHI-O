import { CornerDownRight } from 'lucide-react';
import { Link } from '../../app/router';
import { Wordmark } from './SiteHeader';

export function SiteFooter({ disclosure, compact = false }: { disclosure?: string; compact?: boolean }) {
  return <footer className="site-footer" data-compact={compact}>
    <div className="page">
      {compact ? null : <div className="site-footer-close">
        <p className="display display-l">Restore<CornerDownRight className="hook" aria-hidden="true" />with evidence</p>
        <div className="site-footer-actions">
          <Link to="/customer" className="btn btn--accent">Customer view<CornerDownRight aria-hidden="true" /></Link>
          <Link to="/operator" className="btn">Operator console</Link>
        </div>
      </div>}
      <div className="site-footer-grid">
        <div className="site-footer-brand"><Wordmark /><p>HackOHI/O 2026 · AEP track</p></div>
        <nav aria-label="Footer">
          <ul>
            <li><Link to="/">Overview</Link></li>
            <li><Link to="/customer">Customer view</Link></li>
            <li><Link to="/operator">Operator console</Link></li>
            <li><a href="https://github.com/hackohio/aep_challenge_hack26" target="_blank" rel="noreferrer">AEP challenge data<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </nav>
        {disclosure ? <p className="site-footer-disclosure">{disclosure}</p> : null}
      </div>
    </div>
  </footer>;
}
