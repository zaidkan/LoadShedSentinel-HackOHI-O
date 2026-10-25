import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const Reconciler = require('react-reconciler');
const { DefaultEventPriority } = require('react-reconciler/constants');
const { build } = require('esbuild');
const fixture = JSON.parse(await readFile(resolve(root, '../fixtures/scenario_fixture.json'), 'utf8'));
const noop = () => {};
const context = {};
const append = (parent, child) => { parent.children = parent.children.filter(item => item !== child); parent.children.push(child); };
const remove = (parent, child) => { parent.children = parent.children.filter(item => item !== child); };
const insert = (parent, child, before) => { remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child); };
// Run React's real reconciler without a DOM. This tests effects, lazy promises and
// error boundaries, but does not claim browser layout or graphics coverage.
const renderer = Reconciler({
  now: Date.now, isPrimaryRenderer: false, supportsMutation: true,
  getRootHostContext: () => context, getChildHostContext: () => context,
  prepareForCommit: () => null, resetAfterCommit: noop, getPublicInstance: node => node,
  createInstance: (type, props) => ({ type, props, children: [] }),
  createTextInstance: text => ({ text }), appendInitialChild: append,
  appendChild: append, appendChildToContainer: append,
  removeChild: remove, removeChildFromContainer: remove,
  insertBefore: insert, insertInContainerBefore: insert,
  shouldSetTextContent: () => false, finalizeInitialChildren: () => false,
  prepareUpdate: () => true, commitUpdate: (node, _update, _type, _old, props) => { node.props = props; },
  commitTextUpdate: (node, _old, text) => { node.text = text; },
  clearContainer: node => { node.children = []; }, resetTextContent: noop,
  hideInstance: node => { node.hidden = true; }, unhideInstance: node => { node.hidden = false; },
  hideTextInstance: node => { node.hidden = true; }, unhideTextInstance: node => { node.hidden = false; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  getCurrentEventPriority: () => DefaultEventPriority, detachDeletedInstance: noop,
});
const flush = async () => { for (let i = 0; i < 8; ++i) { renderer.flushPassiveEffects(); await new Promise(resolve => setImmediate(resolve)); } };
function mount(element) {
  const container = { children: [] };
  const fiber = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const update = element => renderer.updateContainer(element, fiber, null, noop);
  update(element);
  return { container, update, unmount: () => update(null) };
}
function nodes(node) { return [node, ...(node.children ?? []).flatMap(nodes)]; }
function text(node) { return nodes(node).filter(node => !node.hidden && node.text !== undefined).map(node => node.text).join(' '); }
function events() {
  const listeners = new Map();
  return { addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name) { for (const fn of listeners.get(name) ?? []) fn(); }, count(name) { return listeners.get(name)?.size ?? 0; } };
}
async function load(file, { globals = {}, react = React, stubIncident = false, stubScene = false, stubRoutes = false, modules = {} } = {}) {
  const result = await build({ entryPoints: [resolve(root, file)], write: false, bundle: true, platform: 'node', format: 'cjs',
    loader: { '.css': 'empty' }, external: ['react', 'react/jsx-runtime', 'react-dom/client'], plugins: [{ name: 'test-surfaces', setup(build) {
      if (stubRoutes) {
        build.onResolve({ filter: /pages\/(LandingPage|UtilityPage|CustomerPage|SentinelPreviewPage)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'route-test' }));
        build.onResolve({ filter: /components\/shell\/AppFrame$/ }, () => ({ path: 'frame', namespace: 'route-test' }));
        build.onResolve({ filter: /app\/motion$/ }, () => ({ path: 'motion', namespace: 'route-test' }));
        build.onLoad({ filter: /.*/, namespace: 'route-test' }, args => ({ contents: args.path === 'frame'
          ? `export const AppFrame = ({children}) => children(${JSON.stringify(fixture)});`
          : args.path === 'motion' ? 'export const MotionProvider = ({children}) => children;'
          : `import React from 'react'; export function ${args.path}() { return React.createElement('section', null, '${args.path}'); } export default ${args.path};` }));
      }
      if (stubIncident || stubRoutes) build.onResolve({ filter: /app\/incident$/ }, () => ({ path: 'incident', namespace: 'test' }));
      if (stubScene) build.onResolve({ filter: /\/SentinelScene$/ }, () => ({ path: 'scene', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'incident'
        ? 'export const IncidentProvider = ({children}) => children; export const useIncident = () => ({ aepAssets: [], chooseScenario() {}, updateSnapshot() {} });'
        : 'export default function Scene() { return null; }' }));
    } }],
  });
  const sandbox = { module: { exports: {} }, require: name => name === 'react' ? react : modules[name] ?? require(name), console,
    setTimeout, clearTimeout, ...globals };
  vm.runInNewContext(result.outputFiles[0].text, sandbox);
  return sandbox.module.exports;
}
let passed = 0;
async function check(name, fn) { await fn(); ++passed; console.log(`✔ Performance: ${name}`); }

await check('visibility combines document state with intersection, resumes, and cleans up', async () => {
  const document = { ...events(), visibilityState: 'hidden' };
  let callback, disconnected = 0;
  const { useInView } = await load('src/three/sentinel/hooks.ts', { globals: { document,
    IntersectionObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() { ++disconnected; } } } });
  const values = [];
  function Probe() { const ref = React.useRef({}); values.push(useInView(ref)); return null; }
  const app = mount(React.createElement(Probe)); await flush();
  assert.equal(values.at(-1), false);
  callback([{ isIntersecting: true }]); await flush(); assert.equal(values.at(-1), false);
  document.visibilityState = 'visible'; document.emit('visibilitychange'); await flush(); assert.equal(values.at(-1), true);
  callback([{ isIntersecting: false }]); await flush(); assert.equal(values.at(-1), false);
  document.visibilityState = 'hidden'; document.emit('visibilitychange');
  document.visibilityState = 'visible'; document.emit('visibilitychange'); await flush(); assert.equal(values.at(-1), false);
  callback([{ isIntersecting: true }]); await flush(); assert.equal(values.at(-1), true);
  document.visibilityState = 'hidden'; document.emit('visibilitychange'); await flush(); assert.equal(values.at(-1), false);
  app.unmount(); await flush(); assert.equal(document.count('visibilitychange'), 0); assert.equal(disconnected, 1);
});
await check('visibility still pauses without IntersectionObserver', async () => {
  const document = { ...events(), visibilityState: 'visible' };
  const { useInView } = await load('src/three/sentinel/hooks.ts', { globals: { document } });
  let visible;
  function Probe() { const ref = React.useRef({}); visible = useInView(ref); return null; }
  const app = mount(React.createElement(Probe)); await flush(); assert.equal(visible, true);
  document.visibilityState = 'hidden'; document.emit('visibilitychange'); await flush(); assert.equal(visible, false);
  app.unmount(); await flush(); assert.equal(document.count('visibilitychange'), 0);
});

await check('new incident and premise-set renders hide old traces before effects and reject late results', async () => {
  const requests = [];
  const { SupplyPath } = await load('src/components/map/SupplyPath.tsx', { stubIncident: true, globals: {
    window: { innerWidth: 1200 }, ResizeObserver: class { observe() {} disconnect() {} },
    fetch(url) { let resolveResponse; const promise = new Promise(resolve => { resolveResponse = resolve; }); requests.push({ url,
      ok: data => resolveResponse({ ok: true, json: async () => data }), fail: () => resolveResponse({ ok: false, statusText: '503' }) }); return promise; },
  } });
  const make = (id, premise) => ({ ...fixture, incident_id: id, selected_premise_token: premise, affected_premise_tokens: [premise], current_asset_id: `ASSET-${id}` });
  const trace = premise => ({ status: 'KNOWN', premise_token: premise, equipment: [{ asset_token: `TRANSFORMER-${premise}`, kind: 'TRANSFORMER' }], substation_status: 'UNKNOWN' });
  const app = mount(React.createElement(SupplyPath, { snapshot: make('A', 'PREM-A') })); await flush();
  const request = premise => requests.findLast(item => item.url.includes(`premise_id=${premise}`));
  request('PREM-A').ok(trace('PREM-A')); await flush(); assert.match(text(app.container), /TRANSFORMER|PREM-A/);
  assert.ok(nodes(app.container).some(node => node.type === 'svg' && node.props.className === 'supply-svg'));
  app.update(React.createElement(SupplyPath, { snapshot: make('A', 'PREM-A') })); await flush();
  assert.ok(nodes(app.container).some(node => node.type === 'svg' && node.props.className === 'supply-svg'));
  assert.equal(requests.length, 1, 'Equivalent incident data reuses resolved traces');
  app.update(React.createElement(SupplyPath, { snapshot: make('B', 'PREM-B') }));
  // Synchronous commit: no waiting for effects before checking for stale SVG/readout.
  assert.ok(!nodes(app.container).some(node => node.type === 'svg' && node.props.className === 'supply-svg'));
  assert.doesNotMatch(text(app.container), /TRANSFORMER-PREM-A/);
  assert.match(text(app.container), /Tracing supplied paths for this incident/);
  assert.ok(nodes(app.container).find(node => node.props?.className === 'supply-sheet').props.style.minHeight >= 236);
  await flush();
  app.update(React.createElement(SupplyPath, { snapshot: make('C', 'PREM-C') })); await flush();
  request('PREM-C').ok(trace('PREM-C')); await flush();
  request('PREM-B').ok(trace('PREM-B')); await flush();
  assert.doesNotMatch(text(app.container), /TRANSFORMER-PREM-B|TRANSFORMER-PREM-A/);
  assert.match(text(app.container), /PREM-C/);
  // Same incident, different requested premises must also invalidate the tree.
  app.update(React.createElement(SupplyPath, { snapshot: make('C', 'PREM-D') }));
  assert.ok(!nodes(app.container).some(node => node.type === 'svg' && node.props.className === 'supply-svg'));
  await flush(); request('PREM-D').fail(); await flush(); assert.match(text(app.container), /could not be traced/);
  const retry = nodes(app.container).find(node => node.type === 'button' && text(node) === 'Retry trace');
  retry.props.onClick(); await flush(); assert.match(text(app.container), /Tracing supply paths/);
  request('PREM-D').ok(trace('PREM-D')); await flush(); assert.match(text(app.container), /PREM-D/);
  app.unmount(); await flush();
});

await check('a rejected lazy scene renders the 2D diagram, disables 3D controls, and reloads', async () => {
  let rejectScene, reloads = 0;
  const pending = new Promise((_resolve, reject) => { rejectScene = reject; });
  const query = { matches: false, addEventListener: noop, removeEventListener: noop };
  const { AssetViewport } = await load('src/three/AssetViewport.tsx', { stubScene: true,
    react: { ...React, lazy: () => React.lazy(() => pending) }, globals: {
      window: { WebGL2RenderingContext: function () {}, matchMedia: () => query, location: { reload() { ++reloads; } } },
      document: { createElement: () => ({ getContext: () => ({ getExtension: () => null }) }) },
    } });
  const app = mount(React.createElement(AssetViewport, { status: 'UNKNOWN', assetId: 'ASSET-TEST' })); await flush();
  assert.match(text(app.container), /Preparing 3D model/);
  const originalError = console.error, diagnostics = [];
  try {
    console.error = (...args) => diagnostics.push(args.join(' '));
    rejectScene(new Error('Synthetic chunk failure')); await flush();
  } finally { console.error = originalError; }
  assert.ok(diagnostics.some(message => message.includes('SceneLoadBoundary')), 'Expected React boundary diagnostic');
  assert.ok(nodes(app.container).some(node => node.type === 'svg' && node.props.className?.includes('utility-pole-diagram')));
  assert.match(text(app.container), /Reload the page to try 3D again/);
  assert.match(text(app.container), /Position not asserted/);
  const controls = nodes(app.container).filter(node => node.type === 'button' && /^Orbit model|^Zoom model/.test(node.props['aria-label'] ?? ''));
  assert.equal(controls.length, 4); assert.ok(controls.every(node => node.props.disabled));
  nodes(app.container).find(node => node.type === 'button' && text(node) === 'Reload page').props.onClick(); assert.equal(reloads, 1);
  app.unmount(); await flush();
});

await check('all four hash routes render through the real lazy App/Root and history listeners', async () => {
  const window = { ...events(), location: { hash: '#/operator', pathname: '/' }, scrollTo: noop,
    history: { state: null, replaceState(state) { this.state = state; } } };
  const document = { getElementById: () => ({}), title: '' };
  let rootElement, releasePages;
  const gate = new Promise(resolve => { releasePages = resolve; });
  await load('src/main.tsx', { stubRoutes: true, globals: { window, document },
    react: { ...React, lazy: factory => React.lazy(async () => { await gate; return factory(); }) },
    modules: { 'react-dom/client': { createRoot: () => ({ render(element) { rootElement = element; } }) } } });
  const app = mount(rootElement); await flush();
  assert.match(text(app.container), /Loading view/);
  assert.ok(nodes(app.container).some(node => node.props?.role === 'status'));
  releasePages(); await flush(); assert.match(text(app.container), /UtilityPage/);
  assert.equal(document.title, 'Operator console · LoadShed Sentinel');
  window.location.hash = '#/customer'; window.emit('hashchange'); await flush(); assert.match(text(app.container), /CustomerPage/);
  window.location.hash = '#/sentinel'; window.emit('hashchange'); await flush(); assert.match(text(app.container), /SentinelPreviewPage/);
  assert.doesNotMatch(text(app.container), /CustomerPage|UtilityPage/);
  window.location.hash = ''; window.emit('hashchange'); window.emit('popstate'); await flush(); assert.match(text(app.container), /LandingPage/);
  window.location.hash = '#/operator'; window.emit('hashchange'); await flush(); assert.match(text(app.container), /UtilityPage/);
  app.unmount(); await flush(); assert.equal(window.count('hashchange'), 0); assert.equal(window.count('popstate'), 0);
});
console.log(`Performance hardening regression checks passed (${passed}/${passed}).`);
