import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const { build } = require('esbuild');
const compiled = await build({ entryPoints: [resolve(root, 'src/app/incident.tsx')],
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'] });
const hooks = [], requests = [];
let cursor = 0, effects = [], queued = false, output;
const schedule = () => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; render(); }); } };
const memo = (factory, deps) => {
  const index = cursor++, previous = hooks[index];
  if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) hooks[index] = { deps, value: factory() };
  return hooks[index].value;
};
const react = { ...React,
  useState(initial) {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; schedule(); }];
  },
  useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
  useMemo: memo,
  useCallback(fn, deps) { return memo(() => fn, deps); },
  useEffect(fn, deps) {
    const index = cursor++, previous = hooks[index];
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) effects.push(() => {
      previous?.cleanup?.(); hooks[index] = { deps, cleanup: fn() };
    });
  },
};
const sandbox = { module: { exports: {} }, console, require: name => name === 'react' ? react : require(name),
  fetch(url) {
    let finish;
    const promise = new Promise(resolve => { finish = data => resolve({ ok: true, json: async () => data }); });
    requests.push({ url, finish }); return promise;
  },
};
runInNewContext(compiled.outputFiles[0].text, sandbox);
function render() {
  cursor = 0; effects = [];
  output = sandbox.module.exports.IncidentProvider({ children: null });
  for (const effect of effects) effect();
}
const flush = async () => { for (let i = 0; i < 5; ++i) await new Promise(resolve => setImmediate(resolve)); };
const snapshot = (id, revision = 1) => ({ incident_id: id, scenario_id: id, revision,
  current_asset_id: id, impact_source: { fault_asset_token: id } });
render();
requests.find(r => r.url.endsWith('/scenarios')).finish([]);
requests.find(r => r.url.endsWith('/current')).finish(snapshot('initial'));
requests.find(r => r.url.includes('/assets')).finish([]);
await flush();
const old = output.props.value.snapshot;
const first = output.props.value.chooseScenario('slow');
const second = output.props.value.chooseScenario('latest');
requests.at(-1).finish(snapshot('latest')); await second; await flush();
requests.at(-2).finish(snapshot('slow')); await first; await flush();
assert.equal(output.props.value.snapshot.incident_id, 'latest');
assert.equal(output.props.value.selectedScenarioId, 'latest');
output.props.value.updateSnapshot(snapshot('stale-planning', 8), old); await flush();
assert.equal(output.props.value.snapshot.incident_id, 'latest');
const current = output.props.value.snapshot;
output.props.value.updateSnapshot(snapshot('section-demo', 2), current); await flush();
assert.equal(output.props.value.snapshot.incident_id, 'section-demo');
assert.equal(output.props.value.selectedScenarioId, 'section-demo');
output.props.value.updateSnapshot(snapshot('section-demo', 1)); await flush();
assert.equal(output.props.value.snapshot.revision, 2);
console.log('Incident provider: latest selection wins; stale planning is rejected; section selectors stay aligned.');
