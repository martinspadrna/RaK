#!/usr/bin/env node
import fs from 'node:fs';

const helper = fs.readFileSync('rak-shift-report-image.js', 'utf8');
const runtime = fs.readFileSync('rak-shift-report-share.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error('[shift-report-image-170-smoke] ' + message);
}

assert(helper.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'must use exact login crab asset');
assert(helper.includes('const CANVAS_WIDTH = 1440;'), 'portrait PNG width must stay 1440');
assert(helper.includes('const MIN_CANVAS_HEIGHT = 1920;'), 'portrait PNG minimum height must stay 1920');
assert(helper.includes('canvas.toBlob'), 'PNG blob export missing');
assert(helper.includes("canvas.toDataURL('image/png')"), 'same-gesture iOS image share path missing');
assert(helper.includes('files: [file]'), 'Web Share file payload missing');
assert(helper.includes('[data-rak-share-action="whatsapp"]'), 'WhatsApp image interception missing');
assert(helper.includes("saveButton.textContent = 'Uložit PNG';"), 'PNG action missing');
assert(String(pkg.scripts && pkg.scripts['vercel-build'] || '').includes('node tools/shift-report-image-170.mjs'), 'Vercel build transform missing');
assert(String(pkg.scripts && pkg.scripts.check || '').includes('node tools/shift-report-image-170-smoke.mjs'), 'smoke not wired into npm run check');

if (runtime.includes('__rakShiftReportImageExport170Installed')) {
  const count = runtime.split('__rakShiftReportImageExport170Installed').length - 1;
  assert(count === 1, 'runtime image helper must be attached exactly once');
}

console.log('[shift-report-image-170-smoke] OK portrait PNG, exact login crab watermark, save + image sharing contract');
