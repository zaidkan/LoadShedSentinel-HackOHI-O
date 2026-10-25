import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Import compiled or source modules via esbuild or direct
const { build } = require('esbuild');

await build({
  entryPoints: [
    resolve(root, 'src/components/utility/PlanningPanels.tsx'),
    resolve(root, 'src/components/utility/TelemetryHUD.tsx'),
    resolve(root, 'src/components/utility/EvidencePanel.tsx'),
    resolve(root, 'src/components/utility/CounterfactualCompareCard.tsx'),
    resolve(root, 'src/pages/CustomerPage.tsx'),
    resolve(root, 'src/services/api.ts'),
  ],
  outdir: resolve(root, 'dist-test'),
  outExtension: { '.js': '.cjs' },
  platform: 'node',
  bundle: true,
  format: 'cjs',
  external: ['react', 'react/jsx-runtime', 'lucide-react', 'three', '@react-three/fiber', '@react-three/drei'],
});

const { PlanningPanels } = require(resolve(root, 'dist-test/components/utility/PlanningPanels.cjs'));
const { TelemetryHUD } = require(resolve(root, 'dist-test/components/utility/TelemetryHUD.cjs'));
const { EvidencePanel } = require(resolve(root, 'dist-test/components/utility/EvidencePanel.cjs'));
const { CounterfactualCompareCard } = require(resolve(root, 'dist-test/components/utility/CounterfactualCompareCard.cjs'));
const { CustomerPage } = require(resolve(root, 'dist-test/pages/CustomerPage.cjs'));
const api = require(resolve(root, 'dist-test/services/api.cjs'));

const fixture = JSON.parse(await readFile(resolve(root, '../fixtures/scenario_fixture.json'), 'utf8'));

console.log('--- Test 1: PlanningPanels component rendering & states ---');
{
  const props = {
    snapshot: { ...fixture, planning_inputs: { crew_size: 4, access_hours: 1 } },
    inputs: { crew_size: 4, access_hours: 1 },
    pending: false,
    error: '',
    onInputsChange() {},
    onRetry() {},
  };
  const html = renderToStaticMarkup(React.createElement(PlanningPanels, props));
  assert.match(html, /Crew size: 4 lineworkers/);
  assert.match(html, /Access delay: 1 hour/);
  assert.match(html, /min="2" max="8"/);
  assert.match(html, /min="0" max="24"/);
  assert.doesNotMatch(html, /<fieldset disabled/);
  console.log('✔ PlanningPanels basic render passed');
}

console.log('--- Test 2: CustomerPage initial loading state ---');
{
  const props = {
    snapshot: fixture,
    scenarioId: 'local_protection',
  };
  const html = renderToStaticMarkup(React.createElement(CustomerPage, props));
  assert.match(html, /Loading Customer Concierge\.\.\./);
  console.log('✔ CustomerPage initial loading state render passed');
}

console.log('--- Test 3: TelemetryHUD & EvidencePanel component rendering ---');
{
  const hudHtml = renderToStaticMarkup(React.createElement(TelemetryHUD, { snapshot: fixture }));
  assert.match(hudHtml, /Protective cutout/i);
  assert.match(hudHtml, /Sensor-node battery/i);
  assert.match(hudHtml, /Solar &amp; communications/i);

  const evHtml = renderToStaticMarkup(React.createElement(EvidencePanel, { snapshot: fixture }));
  assert.match(evHtml, /Incident evidence/i);
  assert.match(evHtml, /Working hypotheses/i);
  console.log('✔ TelemetryHUD and EvidencePanel renders passed');
}

console.log('--- Test 3: API Service session isolation headers ---');
{
  const sid = api.getSessionId();
  assert.ok(sid && typeof sid === 'string', 'Session ID should be non-empty string');
  assert.ok(sid.startsWith('sess_'), 'Session ID should have prefix sess_');

  let interceptedHeaders = null;
  globalThis.fetch = async (url, opts) => {
    interceptedHeaders = opts?.headers || {};
    return {
      ok: true,
      json: async () => ({ status: 'ok', session_id: interceptedHeaders['X-Session-ID'] }),
    };
  };

  await api.fetchCurrentScenario();
  assert.equal(interceptedHeaders['X-Session-ID'], sid, 'Fetch should attach X-Session-ID header');
  console.log('✔ Session header attachment passed');
}

console.log('--- Test 4: advanceScenario parameter serialization ---');
{
  let sentBody = null;
  globalThis.fetch = async (url, opts) => {
    sentBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ ...fixture, status: sentBody.status }),
    };
  };

  const payload = {
    incident_id: fixture.incident_id,
    expected_revision: 2,
    status: 'RESTORED',
    action: 'record_demo_authorization',
    completed_task_ids: ['repair_work', 'verify_clearance', 'reclose_cutout'],
  };
  const res = await api.advanceScenario(payload);
  assert.equal(res.status, 'RESTORED');
  assert.equal(sentBody.action, 'record_demo_authorization');
  assert.deepEqual(sentBody.completed_task_ids, ['repair_work', 'verify_clearance', 'reclose_cutout']);
  console.log('✔ advanceScenario serialized action and blocker parameters passed');
}

console.log('--- Test 5: CounterfactualCompareCard rendering & hypotheses ---');
{
  const cardHtml = renderToStaticMarkup(React.createElement(CounterfactualCompareCard, {
    snapshot: { ...fixture, scenario_id: 'local_protection' },
  }));
  assert.match(cardHtml, /Counterfactual Incident Comparator/);
  assert.match(cardHtml, /Local Cutout Blown/);
  assert.match(cardHtml, /Upstream Feeder Lockout/);
  assert.match(cardHtml, /OPEN \(-117\.5° Drop\)/);
  assert.match(cardHtml, /CLOSED \(Latched 0°\)/);
  assert.match(cardHtml, /3 Sample Premises/);
  assert.match(cardHtml, /16 Sample Premises/);
  assert.match(cardHtml, /8\.974 labor person-hours/);
  assert.match(cardHtml, /\$12,000/);
  console.log('✔ CounterfactualCompareCard render & hypotheses verified');
}

// Customer household-generation races and loaded dashboard states.
await import('./test-customer.mjs');
console.log('All frontend integration and customer dashboard checks passed.');

// Route loading, graphics recovery, visibility and supply-path isolation.
await import('./test-performance.mjs');
