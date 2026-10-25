import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const SentinelPreviewPage = lazy(() => import('./pages/SentinelPreviewPage'));

const PREVIEW_HASH = '#/sentinel';

function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash === PREVIEW_HASH) {
    return (
      <Suspense fallback={null}>
        <SentinelPreviewPage />
      </Suspense>
    );
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
