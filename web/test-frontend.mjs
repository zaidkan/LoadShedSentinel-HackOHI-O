import assert from 'node:assert/strict';
import vm from 'node:vm';
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
    resolve(root, 'src/app/router.tsx'),
    resolve(root, 'src/components/map/FeederMap.tsx'),
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

console.log('--- Person 5 UI regressions ---');
let remediationFailures = 0;
async function regression(name, run) {
  try { await run(); console.log(`✔ ${name}`); }
  catch (error) { remediationFailures++; console.error(`FAIL ${name}: ${error.message}`); }
}
const comparator = snapshot => renderToStaticMarkup(React.createElement(CounterfactualCompareCard, { snapshot }));
await regression('Comparator has no unsupported savings or energization assertions', () => {
  const html = comparator(fixture);
  assert.match(html, /Modeled Scenario Comparison/);
  assert.doesNotMatch(html, /\$12,000|8\.974|Misdispatch Prevented|confirms transformer energization|Required Dispatch/);
  assert.match(html, /subject to field verification/i);
});
await regression('Comparator count follows the selected snapshot, not a fixed asset', () => {
  for (const [scenario, count] of [['local_protection', 2], ['upstream_feeder', 7]]) {
    const html = comparator({ ...fixture, scenario_id: scenario, current_asset_id: 'ASSET-CHANGED', affected_premise_tokens: Array.from({ length: count }, (_, i) => `P-${i}`) });
    assert.match(html, new RegExp(`${count} sample premises`));
    assert.match(html, /ASSET-CHANGED/);
    assert.match(html, /Illustrative baseline/);
    assert.doesNotMatch(html, /3 Sample Premises|16 Sample Premises|Active Scenario/);
  }
});
await regression('Comparator abstains for conflicting evidence and unknown cutout state', () => {
  for (const patch of [{ scenario_id: 'insufficient_evidence' }, { status: 'UNDER_REVIEW' }, { cutout_status: 'UNKNOWN' }]) {
    const html = comparator({ ...fixture, ...patch });
    assert.match(html, /Comparison withheld/);
    assert.match(html, /energization.*not (?:asserted|confirmed)/i);
    assert.doesNotMatch(html, /Local Cutout Blown|CLOSED \(Latched|OPEN \(-117|misdispatch.*prevented|\d+ sample premises/i);
  }
});
await regression('Comparator still switches scenarios and offers a baseline', () => {
  function walk(element, found = []) {
    if (!element || typeof element !== 'object') return found;
    if (element.type === 'button') found.push(element);
    React.Children.forEach(element.props?.children, child => walk(child, found));
    return found;
  }
  for (const [id, expected] of [['local_protection', 'upstream_feeder'], ['upstream_feeder', 'local_protection'], ['confirmed_replacement', 'local_protection'], ['insufficient_evidence', 'local_protection']]) {
    let selected;
    const tree = CounterfactualCompareCard({ snapshot: { ...fixture, scenario_id: id }, onSelectScenario: value => { selected = value; } });
    const buttons = walk(tree); assert.equal(buttons.length, 1); buttons[0].props.onClick(); assert.equal(selected, expected);
  }
});

// Exercise the real route hook with browser navigation events. Only React's
// hook scheduling and the History API are replaced; route resolution is real code.
function routeHarness(url) {
  const listeners = new Map(); let value, mounted = false; const effects = [], refs = [];
  const entries = [{ url: new URL(url, 'https://sentinel.test'), state: null }]; let index = 0;
  const emit = type => { for (const listener of listeners.get(type) ?? []) listener({ type }); };
  const win = {
    get location() { return entries[index].url; },
    addEventListener(type, fn) { const set = listeners.get(type) ?? new Set(); set.add(fn); listeners.set(type, set); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { emit(event.type); },
    history: {
      get state() { return entries[index].state; },
      pushState(state, _title, next) { entries.splice(index + 1); entries.push({ url: new URL(next, entries[index].url), state }); index++; },
      replaceState(state, _title, next) { entries[index] = { url: next ? new URL(next, entries[index].url) : entries[index].url, state }; },
    },
  };
  const react = { ...React,
    useState(initial) { if (!mounted) value = typeof initial === 'function' ? initial() : initial; return [value, next => { value = typeof next === 'function' ? next(value) : next; }]; },
    useRef(initial) { return refs[0] ??= { current: initial }; },
    useEffect(effect) { effects.push(effect); },
  };
  const module = { exports: {} };
  const code = require('node:fs').readFileSync(resolve(root, 'dist-test/app/router.cjs'), 'utf8');
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name === 'react' ? react : require(name), window: win, Event });
  module.exports.useRoute(); mounted = true; for (const effect of effects) effect();
  return {
    get route() { return value; }, get url() { return win.location.href; },
    anchor(hash) { win.history.pushState(null, '', hash); emit('popstate'); emit('hashchange'); },
    back() { index--; emit('popstate'); emit('hashchange'); },
    forward() { index++; emit('popstate'); emit('hashchange'); },
    navigate: module.exports.navigate,
  };
}
await regression('Operator and customer section anchors retain their route', () => {
  for (const [url, fragment, expected] of [['/#/operator', '#utility-work-heading', '/operator'], ['/#/customer', '#household-plan', '/customer'], ['/operator', '#utility-evidence-heading', '/operator'], ['/customer', '#household-plan', '/customer']]) {
    const app = routeHarness(url); assert.equal(app.route, expected); app.anchor(fragment); assert.equal(app.route, expected);
  }
});
await regression('Route history restores the audience of section anchors', () => {
  const app = routeHarness('/#/operator'); app.anchor('#utility-work-heading');
  app.anchor('#/customer'); app.anchor('#household-plan');
  app.back(); assert.equal(app.route, '/customer'); app.back(); assert.equal(app.route, '/operator');
  app.forward(); assert.equal(app.route, '/customer'); app.forward(); assert.equal(app.route, '/customer');
  app.navigate('/'); assert.equal(app.route, '/');
  app.navigate('/operator', { hash: 'utility-work-heading' }); assert.equal(app.route, '/operator');
  app.anchor('#/'); assert.equal(app.route, '/operator'); // A path route remains authoritative when the hash is empty-root.
  app.navigate('/', { hash: 'method' }); assert.equal(app.route, '/');
});
await regression('Explicit hash navigation still opens each page and home', () => {
  const app = routeHarness('/#/operator');
  app.anchor('#/customer'); assert.equal(app.route, '/customer');
  app.anchor('#/'); assert.equal(app.route, '/');
  app.anchor('#/operator'); assert.equal(app.route, '/operator');
});

await regression('Feeder SVG classes match transparent hit regions and status rules', async () => {
  const { FeederMap } = require(resolve(root, 'dist-test/components/map/FeederMap.cjs'));
  const css = require('postcss').parse(await readFile(resolve(root, 'src/components/map/feeder-map.css'), 'utf8'));
  const rule = selector => css.nodes.find(node => node.type === 'rule' && node.selector === selector);
  const hit = rule('.feeder-hit'); assert.ok(hit, 'Hit region CSS exists');
  assert.ok(hit.nodes.some(node => node.prop === 'fill' && ['transparent', 'rgba(0, 0, 0, 0)'].includes(node.value)));
  assert.ok(rule('.feeder-symbol').nodes.some(node => node.prop === 'stroke' && node.value === 'currentColor'));
  const topology = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { asset_token: fixture.current_asset_id, kind: 'Transformer' }, geometry: { type: 'Point', coordinates: [-83, 40] } },
    { type: 'Feature', properties: { asset_token: 'OTHER-ASSET', kind: 'Circuit breaker' }, geometry: { type: 'Point', coordinates: [-83.1, 40.1] } },
  ] };
  for (const state of ['OPEN', 'CLOSED', 'UNKNOWN']) {
    const html = renderToStaticMarkup(React.createElement(FeederMap, { snapshot: { ...fixture, cutout_status: state }, topology }));
    assert.match(html, /class="feeder-hit"/); assert.match(html, /class="feeder-symbol"/);
    assert.match(html, new RegExp(`data-state="${state.toLowerCase()}"`));
    assert.match(html, /data-current="true"/); assert.doesNotMatch(html, /data-state="(open|closed|unknown)"[^>]*aria-label="OTHER-ASSET/);
  }
});
await regression('Customer light surface has readable heading/body/secondary ink', async () => {
  const css = require('postcss').parse(await readFile(resolve(root, 'src/components/customer/customer.css'), 'utf8'));
  const rootRule = css.nodes.find(node => node.type === 'rule' && node.selector === '.customer-dashboard');
  assert.ok(rootRule.nodes.some(node => node.prop === 'background' && node.value === 'var(--paper)'), 'Customer reading surface pins a light background');
  const tokens = await readFile(resolve(root, 'src/styles/tokens.css'), 'utf8');
  const color = name => tokens.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))[1];
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  };
  for (const ink of ['ink', 'ink-2', 'muted']) for (const bg of ['paper', 'card', 'paper-2', 'accent-soft']) {
    const a = luminance(color(ink)), b = luminance(color(bg));
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${ink} on ${bg} needs 4.5:1`);
  }
});
if (remediationFailures) throw new Error(`${remediationFailures} Person 5 remediation regressions failed`);

// Customer household-generation races and loaded dashboard states.
await import('./test-customer.mjs');
console.log('All frontend integration and customer dashboard checks passed.');

// Route loading, graphics recovery, visibility and supply-path isolation.
await import('./test-performance.mjs');
