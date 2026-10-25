import { useEffect } from 'react';
import { IncidentProvider, useIncident } from './app/incident';
import { MotionProvider } from './app/motion';
import { useRoute, type RoutePath } from './app/router';
import { AppFrame } from './components/shell/AppFrame';
import { CustomerPage } from './pages/CustomerPage';
import { LandingPage } from './pages/LandingPage';
import { UtilityPage } from './pages/UtilityPage';
import { PreventivePage } from './pages/PreventivePage';
import './components/shell/shell.css';

const TITLES: Record<RoutePath, string> = {
  '/': 'LoadShed Sentinel',
  '/operator': 'Operator console · LoadShed Sentinel',
  '/customer': 'Outage concierge · LoadShed Sentinel',
  '/prevention': 'Prevention & evidence · LoadShed Sentinel',
};

function Routes() {
  const route = useRoute();
  const { chooseScenario, updateSnapshot, aepAssets } = useIncident();

  useEffect(() => {
    document.title = TITLES[route];
    if (!window.location.hash || window.location.hash === '#/operator' || window.location.hash === '#/customer') {
      window.scrollTo(0, 0);
    }
  }, [route]);

  if (route === '/prevention') {
    return <AppFrame route={route} audience="operator">{() => <PreventivePage assets={aepAssets} />}</AppFrame>;
  }

  if (route === '/operator') {
    return (
      <AppFrame route={route} audience="operator">
        {snapshot => (
          <UtilityPage
            snapshot={snapshot}
            onSnapshotChange={next => updateSnapshot(next, snapshot)}
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
        <Routes />
      </IncidentProvider>
    </MotionProvider>
  );
}

export default App;
