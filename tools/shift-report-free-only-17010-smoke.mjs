#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[shift-report-free-only-17010-smoke] ' + message); };

const image = read('rak-shift-report-image.js');
const share = read('rak-shift-report-share.js');
const config = read('supabase-config.js');
const index = read('index.html');

for (const [name, source] of [['image', image], ['share', share]]) {
  assert(source.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'), name + ' marker missing');
  assert(source.includes("section.id === 'r01' || section.id === 'r07'"), name + ' free-only rule is not grinder-scoped');
  assert(source.includes("ctx.fillText(row.free + ' ' + (row.index || '') + ' volné', x + 24, y + 63);"), name + ' single free-only text missing');
  assert(source.includes('drawProductionRow(ctx, row, x + 18, rowY, w - 36, section);'), name + ' section not passed to renderer');
  assert(source.includes("ctx.fillText(row.free + ' volné', x + w - 18, y + 50);"), name + ' mixed normal+free primary value changed');
  assert(source.includes('ctx.globalAlpha = .16;'), name + ' stronger crab watermark lost');
  assert(source.includes("rgba(255,255,255,.36)"), name + ' transparent report cards lost');
}

function freeOnlyLabel(sectionId, row) {
  const freeOnlyGrinder = !!row.free && !row.qty && !row.nok && (sectionId === 'r01' || sectionId === 'r07');
  return freeOnlyGrinder ? row.free + ' ' + (row.index || '') + ' volné' : '';
}
assert(freeOnlyLabel('r01', { index: 'AD', qty: '', free: '200', nok: '' }) === '200 AD volné', 'TBKR01 free-only label mismatch');
assert(freeOnlyLabel('r07', { index: 'AE', qty: '', free: '150', nok: '' }) === '150 AE volné', 'TBKR07 free-only label mismatch');
assert(freeOnlyLabel('mo', { index: 'AD', qty: '', free: '200', nok: '' }) === '', 'MO must not use grinder-only format');
assert(freeOnlyLabel('r01', { index: 'AD', qty: '59', free: '12', nok: '' }) === '', 'mixed normal+free must keep two-value layout');

assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.10";'), 'display version is not 1.7.10');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.10-reportfree1";'), 'PWA build is not 1.7.10');
assert(index.includes("var build='v1.7.10-reportfree1';"), 'index build marker is not 1.7.10');

console.log('[shift-report-free-only-17010-smoke] OK grinder free-only row: 200 AD volné; mixed normal+free, transparent glass and strong crab preserved');