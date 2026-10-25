import { lazy, Suspense, useEffect } from 'react';
import { IncidentProvider, useIncident } from './app/incident';
import { MotionProvider } from './app/motion';
import { useRoute, type RoutePath } from './app/router';
import { AppFrame } from './components/shell/AppFrame';
const CustomerPage = lazy(() => import('./pages/CustomerPage').then(module => ({ default: module.CustomerPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const UtilityPage = lazy(() => import('./pages/UtilityPage').then(module => ({ default: module.UtilityPage })));
import './components/shell/shell.css';

const TITLES: Record<RoutePath, string> = {
  '/': 'LoadShed Sentinel',
  '/operator': 'Operator console · LoadShed Sentinel',
  '/customer': 'Outage concierge · LoadShed Sentinel',
};

function Routes() {
  const route = useRoute();
  const { chooseScenario, updateSnapshot } = useIncident();

  useEffect(() => {
    document.title = TITLES[route];
    if (!window.location.hash || window.location.hash === '#/operator' || window.location.hash === '#/customer') {
      window.scrollTo(0, 0);
    }
  }, [route]);

  if (route === '/operator') {
    return (
      <AppFrame route={route} audience="operator">
        {snapshot => (
          <UtilityPage
            snapshot={snapshot}
            onSnapshotChange={updateSnapshot}
            onSelectScenario={chooseScenario}
          />
        )}
      </AppFrame>
    );
  }

  if (route === '/customer') {
    return (
      <AppFrame route={route} audience="customer">
        {snapshot => (
          <CustomerPage
            key={`${snapshot.incident_id}-${snapshot.revision}-${snapshot.current_asset_id}`}
            snapshot={snapshot}
            scenarioId={snapshot.scenario_id}
          />
        )}
      </AppFrame>
    );
  }

  return <LandingPage />;
}

export function App() {
  return (
    <MotionProvider>
      <IncidentProvider>
        <Suspense fallback={<p role="status">Loading view…</p>}><Routes /></Suspense>
      </IncidentProvider>
    </MotionProvider>
  );
}

export default App;
