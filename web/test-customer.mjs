import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { build } = require('esbuild');
const fixture = JSON.parse(await readFile(resolve(root, '../fixtures/scenario_fixture.json'), 'utf8'));
const compiled = await build({
  entryPoints: [resolve(root, 'src/pages/CustomerPage.tsx')], bundle: true, write: false,
  platform: 'node', format: 'cjs', loader: { '.css': 'empty' },
  external: ['react', 'react/jsx-runtime', 'lucide-react'],
});

// Exercise the actual page and API calls with deterministic hook scheduling.
// Responses are deferred independently; no DOM library or new dependency is needed.
function mount({ stored = null } = {}) {
  const hooks = [], requests = [], writes = [];
  let cursor = 0, effects = [], output, queued = false, active = true;
  let props = { snapshot: fixture, scenarioId: 'local_protection' };
  const schedule = () => {
    if (!active || queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; if (active) render(); });
  };
  const react = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; schedule(); }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
        effects.push(() => { previous?.cleanup?.(); hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const sandbox = {
    module: { exports: {} }, console, Intl, Date, Number, JSON,
    localStorage: { getItem: () => stored, setItem: (...args) => writes.push(args) },
    require: name => name === 'react' ? react : require(name),
    fetch(url, options) {
      let resolveResponse, reject;
      const promise = new Promise((res, rej) => { resolveResponse = res; reject = rej; });
      requests.push({ url, body: options?.body && JSON.parse(options.body),
        resolve: data => resolveResponse({ ok: true, json: async () => data }), reject });
      return promise;
    },
  };
  vm.runInNewContext(compiled.outputFiles.find(file => file.path.endsWith('.js'))?.text ?? compiled.outputFiles[0].text, sandbox);
  function render() {
    cursor = 0; effects = [];
    output = sandbox.module.exports.CustomerPage(props);
    for (const effect of effects) effect();
  }
  render();
  return {
    get view() { return output.props; }, requests, writes,
    byPath(path) { return requests.filter(request => request.url.includes(path)); },
    updateProps(patch) { props = { ...props, ...patch }; render(); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); active = false; },
  };
}
const flush = async () => { for (let i = 0; i < 5; ++i) await new Promise(resolve => setImmediate(resolve)); };
const battery = hours => ({ theoretical_hours: hours + 1, conservative_hours: hours, usable_wh: 850, effective_load_w: 141.2 });
const advice = action => ({ guidance: [{ category: 'CRITICAL_MEDICAL', priority: 'IMMEDIATE', action, detail: 'Synthetic test guidance' }] });
let passed = 0;
async function check(name, test) { await test(); ++passed; console.log(`✔ Customer: ${name}`); }

await check('new household generation wins when older requests finish last', async () => {
  const app = mount(); await flush();
  const oldBattery = app.byPath('battery-runtime')[0], oldGuidance = app.byPath('preparedness')[0];
  app.view.onNeedsChange({ essential_load_w: 400, life_critical_medical_device: true });
  await flush();
  const latestBattery = app.byPath('battery-runtime').at(-1), latestGuidance = app.byPath('preparedness').at(-1);
  assert.equal(latestBattery.body.device_w, 400);
  assert.equal(latestGuidance.body.life_critical_medical_device, true);
  latestBattery.resolve(battery(1.5)); latestGuidance.resolve(advice('Current medical plan')); await flush();
  oldBattery.resolve(battery(90)); oldGuidance.resolve(advice('Old plan')); await flush();
  assert.equal(app.view.batteryCalc.conservative_hours, 1.5);
  assert.equal(app.view.guidance[0].action, 'Current medical plan');
  assert.equal(app.view.batteryLoading, false); assert.equal(app.view.guidanceLoading, false);
  app.unmount();
});
await check('input mutation invalidates responses before effects run', async () => {
  const app = mount(); await flush();
  app.view.onNeedsChange({ refrigerated_medication: true });
  app.byPath('battery-runtime')[0].resolve(battery(99));
  app.byPath('preparedness')[0].resolve(advice('Wrong generation')); await flush();
  assert.equal(app.view.batteryCalc, null); assert.equal(app.view.guidance.length, 0);
  assert.equal(app.view.guidanceLoading, true);
  app.unmount();
});
await check('stale failures and finally handlers cannot replace current success/loading', async () => {
  const app = mount(); await flush();
  app.view.onNeedsChange({ essential_load_w: 200 }); await flush();
  app.byPath('battery-runtime')[0].reject(new Error('stale battery error'));
  app.byPath('preparedness')[0].reject(new Error('stale guidance error')); await flush();
  assert.equal(app.view.batteryError, false); assert.equal(app.view.guidanceError, false);
  assert.equal(app.view.batteryLoading, true); assert.equal(app.view.guidanceLoading, true);
  app.byPath('battery-runtime').at(-1).resolve(battery(3));
  app.byPath('preparedness').at(-1).resolve(advice('Latest')); await flush();
  assert.equal(app.view.batteryCalc.conservative_hours, 3);
  assert.equal(app.view.guidance[0].action, 'Latest'); app.unmount();
});
await check('invalid load and no-battery choices clear estimates and reject pending results', async () => {
  const app = mount(); await flush();
  app.view.onNeedsChange({ essential_load_w: 0 }); await flush();
  assert.equal(app.byPath('battery-runtime').length, 1);
  app.byPath('battery-runtime')[0].resolve(battery(99)); await flush();
  assert.equal(app.view.batteryCalc, null); assert.equal(app.view.batteryLoading, false);
  app.view.onNeedsChange({ essential_load_w: 120, backup_battery_available: false }); await flush();
  assert.equal(app.byPath('battery-runtime').length, 1);
  assert.equal(app.view.needs.backup_battery_available, false); app.unmount();
});
await check('current errors are actionable and retry reads the current inputs', async () => {
  const app = mount(); await flush();
  app.byPath('battery-runtime')[0].reject(new Error('offline'));
  app.byPath('preparedness')[0].reject(new Error('offline')); await flush();
  assert.equal(app.view.batteryError, true); assert.equal(app.view.guidanceError, true);
  app.view.onNeedsRetry(); await flush();
  assert.equal(app.view.batteryError, false); assert.equal(app.view.guidanceError, false);
  assert.equal(app.byPath('battery-runtime').length, 2);
  assert.equal(app.byPath('preparedness').length, 2); app.unmount();
});
await check('malformed battery responses cannot become a runtime estimate', async () => {
  const app = mount(); await flush();
  app.byPath('battery-runtime')[0].resolve({ ...battery(1), conservative_hours: null }); await flush();
  assert.equal(app.view.batteryCalc, null); assert.equal(app.view.batteryError, true);
  app.unmount();
});
await check('snapshot refresh rejects an older scenario response and reports failure', async () => {
  const app = mount(); await flush();
  const old = app.byPath('/snapshot')[0];
  app.updateProps({ scenarioId: 'unknown_fault', snapshot: { ...fixture, revision: fixture.revision + 1 } });
  await flush(); app.byPath('/snapshot').at(-1).reject(new Error('offline')); await flush();
  old.resolve({ status: 'RESTORED', selected_premise_token: 'old' }); await flush();
  assert.equal(app.view.snapshot, null); assert.equal(app.view.snapshotError, true);
  assert.equal(app.view.loading, false); app.unmount();
});
await check('unmount invalidates both household response handlers', async () => {
  const app = mount(); await flush(); app.unmount();
  app.byPath('battery-runtime')[0].resolve(battery(99)); app.byPath('preparedness')[0].resolve(advice('Late')); await flush();
  assert.equal(app.view.batteryCalc, null); assert.equal(app.view.guidance.length, 0);
});
await check('stored values are type-checked and household edits persist', async () => {
  const app = mount({ stored: '{"life_critical_medical_device":"false","battery_capacity_wh":"bad","food_refrigeration":false}' });
  await flush();
  assert.equal(app.view.needs.life_critical_medical_device, false); assert.equal(app.view.needs.battery_capacity_wh, 1000);
  assert.equal(app.view.needs.food_refrigeration, false);
  app.view.onNeedsChange({ mobility_accessibility_needs: true }); await flush();
  assert.equal(JSON.parse(app.writes.at(-1)[1]).mobility_accessibility_needs, true); app.unmount();
});

const app = mount(); await flush();
const component = app.view;
// Recover the component type without exposing test-only production exports.
const panelBundle = await build({ entryPoints: [resolve(root, 'src/components/customer/CustomerDashboard.tsx')], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime', 'lucide-react'] });
const panelSandbox = { module: { exports: {} }, require }; vm.runInNewContext(panelBundle.outputFiles[0].text, panelSandbox);
const { CustomerDashboard } = panelSandbox.module.exports;
const snapshot = {
  ...fixture, selected_premise_token: 'HOME-TEST', timestamp_utc: '2026-10-24T12:00:00Z',
  restoration_planning: { lower_hours: 1.6875, upper_hours: 3.375, expected_hours: 2.25 },
  notifications: [], disclosure: 'Synthetic network mapping, not live conditions.',
};
const render = patch => renderToStaticMarkup(React.createElement(CustomerDashboard, { ...component, loading: false, guidanceLoading: false, batteryLoading: false, ...patch }));
await check('all service states are plain English and estimates are suppressed under review', () => {
  for (const [status, expected] of [['OUTAGE', 'Confirmed outage'], ['UNDER_REVIEW', 'Under review'], ['NORMAL', 'Normal'], ['RESTORED', 'Simulated restored']]) {
    const html = render({ snapshot: { ...snapshot, status } }); assert.ok(html.includes(expected));
    assert.ok(html.includes('Simulated Demonstration Preview')); assert.ok(html.includes('What is not verified'));
    if (status === 'UNDER_REVIEW') { assert.match(html, /No confirmed restoration estimate/); assert.doesNotMatch(html, /1\.7–3\.4/); }
  }
  assert.match(render({ snapshot: { ...snapshot, status: 'OUTAGE' } }), /1\.7–3\.4 hours · planning window/);
  assert.doesNotMatch(render({ snapshot: { ...snapshot, status: 'OUTAGE' } }), /ASSET-|confidence_kind|effective_load_w/);
});
await check('priority guidance, battery units/assumptions and notification honesty are visible', () => {
  const html = render({ snapshot, batteryCalc: battery(5.129), needs: { ...app.view.needs, life_critical_medical_device: true }, guidance: [
    { category: 'FOOD_SAFETY', action: 'Food action', detail: 'Food detail' },
    { category: 'CRITICAL_MEDICAL', priority: 'IMMEDIATE', action: 'Medical action', detail: 'Medical detail' },
    { category: 'ACCESSIBILITY', action: 'Mobility action', detail: 'Mobility detail' },
  ] });
  assert.ok(html.indexOf('Medical action') < html.indexOf('Mobility action'));
  assert.ok(html.indexOf('Mobility action') < html.indexOf('Food action'));
  assert.match(html, /watt-hours \/ Wh/); assert.match(html, /watts \/ W/);
  assert.match(html, /5\.1 <span>hours/); assert.match(html, /conversion efficiency is 85%/); assert.match(html, /15% of runtime/);
  assert.match(html, /No SMS, push notification, 911 call, or dispatcher contact is made/);
  assert.match(html, /Nothing has been sent/); assert.match(html, /do not register you for utility assistance/);
});
await check('service, battery and guidance error/loading states have labels and recovery', () => {
  const html = render({ snapshot: null, snapshotError: true, batteryError: true, guidanceError: true });
  assert.match(html, /Status unavailable/); assert.match(html, /Retry service update/);
  assert.match(html, /Retry battery estimate/); assert.match(html, /Retry household guidance/); assert.match(html, /role="alert"/);
  const loading = render({ loading: true, batteryLoading: true, guidanceLoading: true });
  assert.match(loading, /Checking service status/); assert.match(loading, /aria-busy="true"/);
});
app.unmount();
console.log(`Customer dashboard regression tests passed (${passed}/${passed}).`);
