import type { ReactNode } from 'react';
import type { ScenarioSnapshot } from '../../../../contracts/types';
import { useIncident } from '../../app/incident';
import type { RoutePath } from '../../app/router';
import { IncidentBar } from './IncidentBar';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import '../../styles/views.css';

/** Header, incident controls, and the connection and loading states shared by the two working views. */
export function AppFrame({ route, audience, children }: { route: RoutePath; audience: 'operator' | 'customer'; children: (snapshot: ScenarioSnapshot) => ReactNode }) {
  const { snapshot, loading, connectionError, retry } = useIncident();
  return <div className="app-frame" data-audience={audience} data-view={route.slice(1)}>
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteHeader route={route} tone="paper" />
    {snapshot && !connectionError ? <IncidentBar audience={audience} /> : null}
    <main id="main" tabIndex={-1} className="app-frame-main">
      {connectionError ? <div className="page app-frame-state" role="alert">
        <h1 className="display display-m">The Sentinel API is unreachable</h1>
        <p className="lead">The service could not be reached. Try again to load the current demonstration. Incident details are unavailable until the connection returns.</p>
        <button type="button" className="btn btn--accent" onClick={() => void retry()}>Retry connection</button>
      </div> : loading || !snapshot ? <div className="page app-frame-state" role="status">
        <p className="app-frame-loading">Loading LoadShed Sentinel…</p>
      </div> : children(snapshot)}
    </main>
    <SiteFooter disclosure={snapshot?.disclosure} compact />
  </div>;
}
