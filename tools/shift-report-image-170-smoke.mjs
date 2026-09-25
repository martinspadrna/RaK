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
assert(helper.includes('function shiftReportShareTitle(root)'), 'contextual WhatsApp title helper missing');
assert(helper.includes('const model = collectModel(root);'), 'WhatsApp title must read the current report form model');
assert(helper.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"), 'WhatsApp title must contain selected date and shift');
assert(helper.includes('navigator.share({ title: shiftReportShareTitle(root), files: [file] })'), 'WhatsApp image share must use contextual title');
assert(helper.includes('[data-rak-share-action="whatsapp"]'), 'WhatsApp image interception missing');
assert(helper.includes("saveButton.textContent = 'Uložit PNG';"), 'PNG action missing');
const compiler=String(pkg.scripts&& (pkg.scripts['legacy:vercel-build']||pkg.scripts['vercel-build']) || '');
assert(compiler.includes('node tools/shift-report-image-170.mjs'), 'frozen compatibility compiler missing');
assert(String(pkg.scripts && pkg.scripts.check || '').includes('node tools/shift-report-image-170-smoke.mjs'), 'smoke not wired into npm run check');

const helperMarkerCount = helper.split(marker).length - 1;
assert(helperMarkerCount >= 1, 'source helper marker missing');
if (runtime.includes(marker)) {
  const runtimeMarkerCount = runtime.split(marker).length - 1;
  assert(runtimeMarkerCount === helperMarkerCount, 'runtime image helper must be attached exactly once as a complete helper');
}

console.log('[shift-report-image-170-smoke] OK mobile/legacy portrait PNG width, exact crab, save + image sharing contract');