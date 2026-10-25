import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Import compiled or source modules via esbuild or direct
const { build } = require('esbuild');

await build({
  entryPoints: [
    resolve(root, 'src/components/utility/PlanningPanels.tsx'),
    resolve(root, 'src/components/utility/SectionRestorationControls.tsx'),
    resolve(root, 'src/components/utility/TelemetryHUD.tsx'),
    resolve(root, 'src/components/utility/EvidencePanel.tsx'),
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
const { SectionRestorationControls } = require(resolve(root, 'dist-test/components/utility/SectionRestorationControls.cjs'));
const { TelemetryHUD } = require(resolve(root, 'dist-test/components/utility/TelemetryHUD.cjs'));
const { EvidencePanel } = require(resolve(root, 'dist-test/components/utility/EvidencePanel.cjs'));
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

console.log('--- Session fallback: unavailable, denied and unwritable storage ---');
{
  const code = await readFile(resolve(root, 'dist-test/services/api.cjs'), 'utf8');
  function isolatedApi(storage) {
    const module = { exports: {} };
    const context = { module, exports: module.exports };
    if (storage === 'denied') Object.defineProperty(context, 'sessionStorage', { get() { throw new Error('Storage denied'); } });
    else if (storage) context.sessionStorage = storage;
    runInNewContext(code, context);
    return module.exports;
  }
  for (const storage of [undefined, 'denied', { getItem() { return null; }, setItem() { throw new Error('Quota exceeded'); } }]) {
    const client = isolatedApi(storage);
    const first = client.getSessionId();
    assert.match(first, /^sess_/);
    assert.equal(client.getSessionId(), first, 'Fallback must preserve the identity across repeated requests');
  }
  const preserved = isolatedApi({ getItem() { return 'sess_existing_tab'; }, setItem() {} });
  assert.equal(preserved.getSessionId(), 'sess_existing_tab', 'An existing browser session must be retained');
  console.log('✔ Missing/throwing storage uses a stable fallback and existing sessions survive');
}

console.log('--- Section restoration: separate isolation, repair and release gates ---');
{
  const premises = Array.from({ length: 16 }, (_, i) => `P-SECTION-${i}`);
  const section = { phase: 'UPSTREAM_TRIP', fault_asset_token: 'T-SECTION', isolating_asset_token: 'F-SECTION',
    all_premise_tokens: premises, isolated_premise_tokens: premises.slice(0, 8), unaffected_premise_tokens: premises.slice(8),
    restored_premise_tokens: [], still_out_premise_tokens: premises, isolation_confirmed: false, repair_complete: false,
    authorized_unaffected: false, authorized_repaired: false, assumptions: ['Source-sample simulation'] };
  function render(state) { return renderToStaticMarkup(React.createElement(SectionRestorationControls, {
    snapshot: { ...fixture, selected_premise_token: premises[0], section_restoration: state }, onSectionAction: async () => {},
  })); }
  function enabled(html, label) {
    const button = [...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].find(match => match[2] === label);
    assert.ok(button, `Expected button ${label}`);
    return !/\bdisabled\b/.test(button[1]);
  }
  const initial = render(section);
  assert.match(initial, /No live switch is operated/);
  assert.ok(enabled(initial, 'Simulate section isolation'));
  assert.ok(!enabled(initial, 'Authorize unaffected section (modeled)'));
  assert.ok(!enabled(initial, 'Complete modeled transformer repair'));
  assert.ok(!enabled(initial, 'Authorize repaired section (modeled)'));
  const isolated = { ...section, phase: 'SECTION_ISOLATED', isolation_confirmed: true };
  assert.ok(enabled(render(isolated), 'Complete modeled transformer repair'), 'Repair-first is valid once isolation is confirmed');
  assert.ok(enabled(render(isolated), 'Authorize unaffected section (modeled)'));
  assert.ok(!enabled(render(isolated), 'Authorize repaired section (modeled)'));
  const partial = { ...isolated, phase: 'UNAFFECTED_RESTORED', authorized_unaffected: true,
    restored_premise_tokens: premises.slice(8), still_out_premise_tokens: premises.slice(0, 8) };
  assert.match(render(partial), /Partial restoration/);
  assert.ok(!enabled(render(partial), 'Authorize repaired section (modeled)'), 'An early group release must not bypass repair');
  const repaired = { ...partial, phase: 'REPAIR_COMPLETE', repair_complete: true };
  assert.ok(enabled(render(repaired), 'Authorize repaired section (modeled)'));
  assert.ok(!enabled(render(repaired), 'Complete modeled transformer repair'));
  assert.ok(enabled(render(partial), 'Inspect unaffected customer'));
  console.log('✔ Early release, repair-first and customer inspection controls respect modeled gates');
}

console.log('\nAll frontend integration checks passed successfully.');
