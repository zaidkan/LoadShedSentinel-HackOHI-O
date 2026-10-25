import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
await require('esbuild').build({ entryPoints: ['src/pages/PreventionPage.tsx'], absWorkingDir: root, outfile: resolve(root, 'dist-test/prevention.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime', 'lucide-react'], loader: { '.css': 'empty' } });
const { PreventionPage } = require('./dist-test/prevention.cjs');
const fixture = JSON.parse(await readFile(resolve(root, '../fixtures/scenario_fixture.json'), 'utf8'));
const render = snapshot => renderToStaticMarkup(React.createElement(PreventionPage, { snapshot }));
const html = render(fixture);
assert.match(html, /Prevention/);
assert.match(html, /AEP challenge/);
assert.match(html, /not a live weather forecast/i);
assert.match(html, /href="\/customer#household-plan"/);
assert.match(html, /href="\/operator#utility-evidence-heading"/);
const uncertain = render({ ...fixture, status: 'UNDER_REVIEW', customer_risk: { band: 'UNKNOWN', drivers: [], confidence_kind: 'unavailable' } });
assert.match(uncertain, /Risk not assessed/);
assert.match(uncertain, /No risk drivers supplied/);
assert.match(uncertain, /Affected count not asserted/);
assert.doesNotMatch(uncertain, /[0-9]+ affected premises/);
const noSource = render({ ...fixture, impact_source: null, evidence: [], customer_risk: { band: 'LOW', drivers: [], confidence_kind: 'scenario' } });
assert.match(noSource, /Source scope unavailable/);
assert.match(noSource, /No evidence supplied/);
assert.doesNotMatch(noSource, /undefined|NaN/);
console.log('Prevention source, unknown/empty states and action destinations passed.');

await require('esbuild').build({ stdin: { contents: "export { SiteHeader } from './src/components/shell/SiteHeader'; export { SiteFooter } from './src/components/shell/SiteFooter'; export { MotionProvider } from './src/app/motion';", resolveDir: root, loader: 'tsx' }, outfile: resolve(root, 'dist-test/navigation.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime', 'lucide-react'], loader: { '.css': 'empty' } });
const { SiteHeader, SiteFooter, MotionProvider } = require('./dist-test/navigation.cjs');
const destinations = ['/', '/prevention', '/customer', '/operator'];
for (const route of destinations) {
  const markup = renderToStaticMarkup(React.createElement(MotionProvider, null, React.createElement(SiteHeader, { route, tone: 'paper' })));
  for (const nav of markup.matchAll(/<nav[^>]*aria-label="Primary(?: mobile)?"[^>]*>(.*?)<\/nav>/g)) {
    assert.deepEqual([...nav[1].matchAll(/href="([^"]+)"/g)].map(match => match[1]), destinations);
    assert.match(nav[1], new RegExp(`href="${route}"[^>]*aria-current="page"`));
  }
  assert.match(markup, /aria-expanded="false" aria-controls=/);
}
const footer = renderToStaticMarkup(React.createElement(SiteFooter, { compact: true }));
assert.deepEqual([...footer.matchAll(/href="([^"]+)"/g)].slice(0, 4).map(match => match[1]), destinations);
console.log('Desktop, mobile and footer navigation order and active page semantics passed.');
