#!/usr/bin/env node
import fs from 'node:fs';

const helper = fs.readFileSync('rak-shift-report-image.js', 'utf8');
const runtime = fs.readFileSync('rak-shift-report-share.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const marker = '__rakShiftReportImageExport170Installed';

function assert(condition, message) {
  if (!condition) throw new Error('[shift-report-image-170-smoke] ' + message);
}

assert(helper.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'must use exact login crab asset');
// Before the development-only portrait transform the original layout remains 1440px;
// after 1.7.13 the mobile-specific single-column report is intentionally 1080px.
const mobilePortrait = helper.includes('// RAK_MOBILE_REPORT_LINES_17013');
assert(helper.includes(mobilePortrait ? 'const CANVAS_WIDTH = 1080;' : 'const CANVAS_WIDTH = 1440;'), 'portrait PNG must use the matching versioned width');
assert(helper.includes('const MIN_CANVAS_HEIGHT = 1920;'), 'portrait PNG minimum height must stay 1920');
assert(helper.includes('canvas.toBlob'), 'PNG blob export missing');
assert(helper.includes("canvas.toDataURL('image/png')"), 'same-gesture iOS image share path missing');
assert(helper.includes('files: [file]'), 'Web Share file payload missing');
for (const [label, source] of [['helper', helper], ['live runtime', runtime]]) {
  assert(source.includes('function shiftReportShareTitle(root)'), label + ': contextual WhatsApp caption helper missing');
  assert(source.includes('const model = collectModel(root);'), label + ': WhatsApp caption must read the current report form model');
  assert(source.includes("const shift = ['N', 'R', 'N8', 'R8'].includes(rawShift) ? shiftLabel(rawShift) : '—';"), label + ': WhatsApp caption must translate shift code to a human label');
  assert(source.includes("return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })"), label + ': human shift labels missing');
  assert(source.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"), label + ': WhatsApp caption must contain selected date and human-readable shift');
  assert(source.includes('const caption = shiftReportShareTitle(root);'), label + ': image share must build one contextual caption');
  assert(source.includes('navigator.share({ title: caption, text: caption, files: [file] })'), label + ': image share must pass contextual text with the PNG');
  assert(!source.includes("navigator.share({ title: 'RaK – Report směny diferenciály', files: [file] })"), label + ': stale static WhatsApp message must not remain');
}
assert(helper.includes('[data-rak-share-action="whatsapp"]'), 'WhatsApp image interception missing');
assert(helper.includes("saveButton.textContent = 'Uložit PNG';"), 'PNG action missing');
const compiler=String(pkg.scripts&& (pkg.scripts['legacy:vercel-build']||pkg.scripts['vercel-build']) || '');
assert(compiler.includes('node tools/shift-report-image-170.mjs'), 'frozen compatibility compiler missing');
const compilerSource = fs.readFileSync('tools/shift-report-image-170.mjs', 'utf8');
assert(compilerSource.includes('runtime.lastIndexOf(helperHeader)'), 'compatibility compiler must synchronize the embedded live helper on every build');
assert(String(pkg.scripts && pkg.scripts.check || '').includes('node tools/shift-report-image-170-smoke.mjs'), 'smoke not wired into npm run check');

const helperMarkerCount = helper.split(marker).length - 1;
assert(helperMarkerCount >= 1, 'source helper marker missing');
if (runtime.includes(marker)) {
  const runtimeMarkerCount = runtime.split(marker).length - 1;
  assert(runtimeMarkerCount === helperMarkerCount, 'runtime image helper must be attached exactly once as a complete helper');
}

console.log('[shift-report-image-170-smoke] OK mobile/legacy portrait PNG width, exact crab, save + image sharing contract');