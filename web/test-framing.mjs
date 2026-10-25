import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(resolve(root, 'package.json'));
const React = require('react');
const THREE = require('three');
const { createRoot, extend } = require('@react-three/fiber');
const { build } = require('esbuild');
const originalDOMRect = globalThis.DOMRect;
globalThis.DOMRect ??= class { constructor(x = 0, y = 0, width = 0, height = 0) { Object.assign(this, { x, y, width, height }); } };
const CameraControls = require('camera-controls').default;
CameraControls.install({ THREE });
extend(THREE);
const noop = () => {};
const gradient = { addColorStop: noop };
const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient
  : key === 'measureText' ? () => ({ width: 100 })
  : key === 'createImageData' || key === 'getImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : noop });
// Real Fiber scene, geometries and world matrices, with a renderer that does no GPU work.
const document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const compiled = await build({ stdin: { contents: `
export { SentinelAssembly } from './src/three/sentinel/SentinelAssembly';
export { DetailProvider } from './src/three/sentinel/primitives';
export { assemblyBounds, fitBounds } from './src/three/sentinel/framing';
export { proceduralPole } from './src/sentinel/models/procedural-pole';
export { CameraDirector } from './src/three/sentinel/CameraDirector';
export { HeroRig, InspectorRig } from './src/sentinel/SentinelStage';
export { Hotspots } from './src/three/sentinel/Hotspots';`, resolveDir: root, loader: 'ts' },
  write: false, bundle: true, loader: { '.css': 'empty' }, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime', 'three', '@react-three/fiber', '@react-three/drei', 'camera-controls'], plugins: [{ name: 'test-private-rig', setup(build) { build.onLoad({ filter: /[\\/]sentinel[\\/]SentinelStage\.tsx$/ }, async args => ({ contents: (await readFile(args.path, 'utf8')) + '\nexport { HeroRig, InspectorRig };', loader: 'tsx', resolveDir: dirname(args.path) })); } }] });
const capturedHtml = [];
const module = { exports: {} };
vm.runInNewContext(compiled.outputFiles[0].text, { module, require: name => name === 'camera-controls' ? CameraControls : name === '@react-three/drei' ? { Html: props => { capturedHtml.push(props.children); return null; } } : require(name), document, console, setTimeout, clearTimeout,
  performance, window: { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }) } });
const { SentinelAssembly, DetailProvider, assemblyBounds, fitBounds, proceduralPole, CameraDirector, HeroRig, InspectorRig, Hotspots } = module.exports;
const dom = { setAttribute: noop, removeAttribute: noop, getRootNode: () => ({ addEventListener: noop, removeEventListener: noop }), style: {}, ownerDocument: { addEventListener: noop, removeEventListener: noop }, addEventListener: noop, removeEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }) };
const gl = { render: noop, domElement: dom, setPixelRatio: noop, setSize: noop, shadowMap: {}, xr: { addEventListener: noop, removeEventListener: noop }, renderLists: { dispose: noop }, forceContextLoss: noop };
const canvas = {};
const fiber = createRoot(canvas);
fiber.configure({ gl, frameloop: 'never', size: { width: 1000, height: 600, top: 0, left: 0 }, dpr: 1, camera: { fov: 34, near: 0.1, far: 200 } });
const flush = async () => { for (let i = 0; i < 8; ++i) await new Promise(resolve => setImmediate(resolve)); };
let scene;
function Capture() { const { useThree } = require('@react-three/fiber'); scene = useThree(state => state.scene); return React.createElement(SentinelAssembly, { mode: 'inspection', focus: 'overview', cutoutStatus: 'CLOSED', reducedMotion: true, interactive: true }); }
fiber.render(React.createElement(Capture)); await flush();
assert.ok(scene, 'Fiber committed the real geometry');
const assembly = scene.getObjectByName('illustrative-pole-assembly');
assert.ok(assembly);
const bounds = assemblyBounds(assembly);
assert.ok(bounds.max.y > 9.4 && bounds.min.y < 0.001, JSON.stringify({ min: bounds.min.toArray(), max: bounds.max.toArray() }));
assert.ok(bounds.max.z - bounds.min.z < 4, 'Distant fading spans must not dominate fitting');
const corners = box => [box.min.x, box.max.x].flatMap(x => [box.min.y, box.max.y].flatMap(y => [box.min.z, box.max.z].map(z => new THREE.Vector3(x, y, z))));
const project = (box, camera) => { camera.updateMatrixWorld(true); return corners(box).map(point => point.project(camera)); };
const fits = points => points.every(point => Math.abs(point.x) <= 0.901 && Math.abs(point.y) <= 0.901 && point.z > -1 && point.z < 1);
for (const aspect of [0, Infinity, NaN]) assert.ok(fitBounds(bounds, 34, aspect, 0.58, 1.5).position.toArray().every(Number.isFinite));
let poses = 0, maxNdc = 0;
for (const [width, height] of [[1440, 900], [800, 440], [390, 380], [360, 760]]) {
 for (const [mode, fov, offset] of [['inspection', 34, { x: 0, y: 0 }], ['hero', 30, { x: 0.3, y: 0.08 }], ['hero', 30, { x: 0, y: 0.34 }]]) {
  for (const azimuth of [0, 0.58, Math.PI / 2, Math.PI]) {
   const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 200);
   const controls = new CameraControls(camera);
   const pose = fitBounds(bounds, fov, width / height, azimuth, mode === 'hero' ? 1.64 : 1.5, offset);
   controls.maxDistance = pose.distance * 2;
   await controls.setLookAt(...pose.position.toArray(), ...pose.target.toArray(), false);
   await controls.setFocalOffset(pose.focal.x, pose.focal.y, 0, false); controls.update(0); camera.updateMatrixWorld(true); controls.update(0);
   const points = project(bounds, camera); assert.ok(fits(points), `${mode} ${width}x${height} azimuth ${azimuth} clips`);
   maxNdc = Math.max(maxNdc, ...points.map(point => Math.max(Math.abs(point.x), Math.abs(point.y))));
   controls.dispose(); ++poses;
  }
 }
}
// The actual model registration shares layout-derived anchors; each is adjacent to its geometry.
const targets = { cutout: 'part-cutout', transformer: 'part-transformer', 'sensor-pod': 'part-sentinel', 'solar-panel': 'part-solar', crossarm: 'part-crossarm', pole: 'wood-pole' };
const distances = {};
for (const [id, name] of Object.entries(targets)) {
 const object = scene.getObjectByName(name); assert.ok(object, name);
 const partBox = assemblyBounds(object);
 const anchor = new THREE.Vector3(...proceduralPole.parts[id].anchor);
 distances[id] = partBox.distanceToPoint(anchor);
 assert.ok(distances[id] < 0.15, `${id} is detached by ${distances[id]}m`);
 assert.equal((id === 'pole' ? object.parent : object).userData.sentinelPart, id);
}
// Marker and mesh points share a transformed model frame, so orbit, zoom and DPR cannot separate them.
let alignmentChecks = 0;
for (const rotation of [0, 0.7, 2.2]) {
 assembly.rotation.set(0.03, rotation, 0); assembly.position.set(0.4, -0.2, 0.7); assembly.updateWorldMatrix(true, true);
 const camera = new THREE.PerspectiveCamera(34, 390 / 760, 0.1, 200); camera.position.set(12, 7, 16); camera.lookAt(0, 4.8, 0); camera.updateMatrixWorld(true);
 for (const part of Object.values(proceduralPole.parts)) {
  const expected = new THREE.Vector3(...part.anchor).applyMatrix4(assembly.matrixWorld).project(camera);
  const marker = new THREE.Group(); marker.position.set(...part.anchor); assembly.add(marker); marker.updateWorldMatrix(true, false);
  const actual = marker.getWorldPosition(new THREE.Vector3()).project(camera);
  for (const dpr of [1, 1.75, 2]) for (const [left, top] of [[0, 0], [37, 420]]) {
   assert.ok(Math.abs(((actual.x + 1) * 390 / 2 + left) - ((expected.x + 1) * 390 / 2 + left)) < 1e-8);
   assert.ok(Math.abs(((-actual.y + 1) * 760 / 2 + top) - ((-expected.y + 1) * 760 / 2 + top)) < 1e-8);
   assert.ok(dpr > 0); ++alignmentChecks;
  }
  assembly.remove(marker);
 }
}
assembly.rotation.set(0, 0, 0); assembly.position.set(0, 0, 0); assembly.updateWorldMatrix(true, true);
const oldCamera = new THREE.PerspectiveCamera(34, 390 / 760, 0.1, 80); oldCamera.position.set(7.1, 2.5, 12.2); oldCamera.lookAt(0.1, 3.45, 0);
const oldClippedCorners = project(bounds, oldCamera).filter(point => Math.abs(point.x) > 1 || Math.abs(point.y) > 1).length;
assert.ok(oldClippedCorners > 0, 'The baseline portrait camera reproduces clipping');
let geometryStates = 0;
for (const status of ['OPEN', 'CLOSED', 'UNKNOWN']) for (const detail of ['high', 'low']) {
  function Variant() { const { useThree } = require('@react-three/fiber'); scene = useThree(state => state.scene); return React.createElement(DetailProvider, { detail }, React.createElement(SentinelAssembly, { mode: 'inspection', focus: 'overview', cutoutStatus: status, reducedMotion: true, interactive: true })); }
  fiber.render(React.createElement(Variant)); await flush();
  const measured = assemblyBounds(scene.getObjectByName('illustrative-pole-assembly'));
  const pose = fitBounds(measured, 34, 390 / 380, 0.58, 1.5);
  const camera = new THREE.PerspectiveCamera(34, 390 / 380, 0.1, 200); camera.position.copy(pose.position); camera.lookAt(pose.target);
  assert.ok(fits(project(measured, camera)), `${status}/${detail} clips`); ++geometryStates;
}
// Execute the production CameraDirector, including its distance limits and resizing effects.
let director = { current: null }, cameraState;
const assemblyRef = { current: null };
function Directed() { const { useThree } = require('@react-three/fiber'); cameraState = useThree(); return React.createElement(React.Fragment, null,
  React.createElement('group', { ref: assemblyRef }, React.createElement(SentinelAssembly, { mode: 'inspection', focus: 'overview', cutoutStatus: 'CLOSED', reducedMotion: true, interactive: true })),
  React.createElement(CameraDirector, { assemblyRef, directorRef: director, mode: 'inspection', focus: 'overview', intro: false, reducedMotion: true, interactive: true })); }
fiber.render(React.createElement(Directed)); await flush();
for (const [width, height] of [[1000, 440], [360, 760], [390, 380]]) {
  cameraState.setSize(width, height); await flush();
  cameraState.advance(1, true); cameraState.camera.updateMatrixWorld(true); cameraState.advance(2, true);
  assert.ok(fits(project(assemblyBounds(assemblyRef.current), cameraState.camera)), `Production director clips at ${width}x${height}`);
}
// The live landing uses a second rig; exercise its measured fit too.
function LandingDirected() { const { useThree } = require('@react-three/fiber'); cameraState = useThree(); return React.createElement(React.Fragment, null,
  React.createElement('group', { ref: assemblyRef }, React.createElement(SentinelAssembly, { mode: 'hero', focus: 'overview', reducedMotion: true, interactive: false })),
  React.createElement(HeroRig, { subject: assemblyRef, model: proceduralPole, reducedMotion: true })); }
fiber.render(React.createElement(LandingDirected)); await flush();
for (const [width, height] of [[1440, 900], [360, 760]]) {
 cameraState.setSize(width, height); await flush();
 assert.ok(fits(project(assemblyBounds(assemblyRef.current), cameraState.camera)), `Landing rig clips at ${width}x${height}`);
}
function LegacyInspection() { const { useThree } = require('@react-three/fiber'); cameraState = useThree(); return React.createElement(React.Fragment, null,
 React.createElement('group', { ref: assemblyRef }, React.createElement(SentinelAssembly, { mode: 'inspection', focus: 'overview', reducedMotion: true, interactive: true })),
 React.createElement(InspectorRig, { subject: assemblyRef, model: proceduralPole, reducedMotion: true })); }
fiber.render(React.createElement(LegacyInspection)); await flush();
for (const [width, height] of [[1000, 440], [360, 760]]) {
 cameraState.setSize(width, height); await flush();
 assert.ok(fits(project(assemblyBounds(assemblyRef.current), cameraState.camera)), `Legacy inspection rig clips at ${width}x${height}`);
}
// The legacy public IDs must drive the new assembly's real highlight uniforms.
fiber.render(React.createElement(proceduralPole.Component, { cutoutStatus: 'CLOSED', detail: 'low', reducedMotion: true, activePart: 'solar-panel' })); await flush();
function uniformsFor(name) { const part = scene.getObjectByName(name); let material; part.traverse(object => { if (!material && object.isMesh) material = object.material; });
 const shader = { uniforms: {}, fragmentShader: '#include <common>\n#include <emissivemap_fragment>\n#include <opaque_fragment>' }; material.onBeforeCompile(shader); return shader.uniforms; }
const solarUniforms = uniformsFor('part-solar'), transformerUniforms = uniformsFor('part-transformer');
for (let frame = 1; frame <= 10; ++frame) cameraState.advance(2 + frame / 10, true);
assert.ok(solarUniforms.uSentinelRim.value > 0.1, 'Solar marker must emphasize the physical panel');
assert.ok(transformerUniforms.uSentinelDim.value > 0.1, 'Other equipment is subdued, rather than the wrong item highlighted');
const oldAnchors = { cutout: [-0.68, 4.72, 0.5], 'solar-panel': [0.55, 2.3, 0.75] };
const oldDistances = Object.fromEntries(Object.entries(oldAnchors).map(([id, anchor]) => [id, assemblyBounds(scene.getObjectByName(targets[id])).distanceToPoint(new THREE.Vector3(...anchor))]));
if (process.env.FRAMING_VISUAL_DIR) {
 await mkdir(process.env.FRAMING_VISUAL_DIR, { recursive: true });
 const subject = scene.getObjectByName('illustrative-pole-assembly'); subject.updateWorldMatrix(true, true);
 const lines = [];
 subject.traverse(object => { if (!object.isMesh || object.name === 'overhead-span') return;
  const edges = new THREE.EdgesGeometry(object.geometry, 30); const vertices = edges.getAttribute('position');
  for (let i = 0; i < vertices.count; i += 2) lines.push([new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld), new THREE.Vector3().fromBufferAttribute(vertices, i + 1).applyMatrix4(object.matrixWorld)]);
  edges.dispose();
 });
 for (const [width, height] of [[1440, 900], [390, 760]]) for (const version of ['before', 'after']) {
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 200);
  if (version === 'before') { camera.position.set(7.1, 2.5, 12.2); camera.lookAt(0.1, 3.45, 0); }
  else { const pose = fitBounds(bounds, 34, width / height, 0.52, 1.5); camera.position.copy(pose.position); camera.lookAt(pose.target); }
  camera.updateMatrixWorld(true);
  const pixel = point => { const p = point.clone().project(camera); return [(p.x + 1) * width / 2, (1 - p.y) * height / 2]; };
  const paths = lines.map(([a, b]) => { const pa = pixel(a), pb = pixel(b); return `M${pa[0].toFixed(1)},${pa[1].toFixed(1)}L${pb[0].toFixed(1)},${pb[1].toFixed(1)}`; }).join('');
  const before = { cutout: [-0.68, 4.72, 0.5], transformer: [1.18, 3.95, 0.4], 'sensor-pod': [-0.32, 2.95, 0.4], 'solar-panel': [0.55, 2.3, 0.75] };
  const markers = Object.keys(before).map(id => { const [x, y] = pixel(new THREE.Vector3(...(version === 'before' ? before[id] : proceduralPole.parts[id].anchor))); return `<circle cx="${x}" cy="${y}" r="5" fill="${version === 'before' ? '#ff917e' : '#7fd8e8'}"/><text x="${x + 9}" y="${y - 5}" fill="#edf3f7" font-size="12">${id}</text>`; }).join('');
  await writeFile(resolve(process.env.FRAMING_VISUAL_DIR, `${version}-${width}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${version} — actual assembly geometry projection, ${width}×${height}; not a browser screenshot</title><rect width="100%" height="100%" fill="#101b29"/><path d="${paths}" fill="none" stroke="#9eafbb" stroke-width="0.65" opacity="0.7"/>${markers}</svg>`);
 }
}
const css = await readFile(resolve(root, 'src/three/sentinel/sentinel.css'), 'utf8');
require('postcss').parse(css).walkRules(rule => { if (rule.selector.includes('.sentinel-hotspot')) for (const selector of rule.selector.split(',')) {
 assert.ok(selector.trim().startsWith('.sentinel-scene '), `Leaking hotspot style: ${selector}`);
} });
let selected = null, hovered = null;
fiber.render(React.createElement(React.Fragment, null,
 React.createElement(SentinelAssembly, { mode: 'inspection', focus: 'overview', reducedMotion: true, interactive: true }),
 React.createElement(Hotspots, { focus: 'overview', ready: true, variant: 'inspection', onSelect: id => { selected = id; }, onHoverChange: id => { hovered = id; } })));
await flush();
const markerButtons = capturedHtml.filter(element => element?.type === 'button');
assert.equal(markerButtons.length, 5);
for (const button of markerButtons) {
 button.props.onPointerEnter(); const id = hovered;
 button.props.onClick({ stopPropagation: noop }); assert.equal(selected, id);
 button.props.onPointerLeave(); assert.equal(hovered, null);
}
const receipts = { geometryBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, fittedPoses: poses, geometryStates, productionDirectorSizes: 3, productionLandingSizes: 2, productionLegacyInspectionSizes: 2, selectionUniformCheck: true, markerCallbacks: 5, scopedMarkerCss: true, maxNdc, anchorDistancesMetres: distances, transformedProjectionChecks: alignmentChecks, baselinePortraitClippedCorners: oldClippedCorners, baselineAnchorDistancesMetres: oldDistances, graphicsCoverage: 'Real geometry and camera matrices; no GPU/browser rendering' };
console.log(JSON.stringify(receipts, null, 2));
if (process.env.FRAMING_RECEIPT) await writeFile(process.env.FRAMING_RECEIPT, JSON.stringify(receipts, null, 2) + '\n');
fiber.unmount(); await flush();
if (originalDOMRect === undefined) delete globalThis.DOMRect;
console.log('Sentinel geometry framing and marker checks passed.');
