import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const editor = read('admin-rotation-editor.js');
const wizard = read('admin-rotation-generator-wizard.js');
const globalCss = read('styles-admin-polish.css');

test('occupied schedule tap opens unplanned-change popup before the input can focus', () => {
  const start = editor.indexOf('function adminBindUnplannedChangePopupRoute()');
  const end = editor.indexOf("try { adminBindUnplannedChangePopupRoute(); }", start);
  assert(start >= 0 && end > start, 'deferred admin popup pointer route missing');
  const block = editor.slice(start, end);
  assert(block.includes("closest('[data-rot-field^=\"cell-\"]')"));
  assert(block.includes("String(target.value || '').trim()"));
  assert(block.includes("app.adminRotationDirty === true"));
  assert(block.includes('event.preventDefault()'));
  assert(block.includes('event.stopPropagation()'));
  assert(block.includes("typeof active.blur === 'function'"));
  assert(block.includes('adminOpenUnplannedChangeDialog(target)'));
  assert(block.indexOf('event.preventDefault()') < block.indexOf('adminOpenUnplannedChangeDialog(target)'));
});

test('unplanned change is rendered as a page-like modal and still offers explicit manual editing', () => {
  assert(wizard.includes('adminUnplannedChangeDialog adminUnplannedChangePage'));
  assert(wizard.includes('adminUnplannedChangeHeader'));
  assert(wizard.includes('adminUnplannedChangeBody'));
  assert(wizard.includes('adminUnplannedChangeFooter'));
  assert(wizard.includes('data-unplanned-action="manual"'));
  assert(wizard.includes("if (action === 'manual')"));
  assert(wizard.includes('input.focus({ preventScroll: true })'));
  assert(wizard.includes('data-unplanned-action="save"'));
  assert(wizard.includes('data-unplanned-action="cancel"'));
});

test('popup page styles are injected only with the deferred admin feature, not into startup CSS', () => {
  assert(wizard.includes('function adminEnsureUnplannedChangePopupPageStyles()'));
  assert(wizard.includes("style.id = 'rakUnplannedChangePopupPageStyles'"));
  for (const marker of [
    'height:100%!important',
    'grid-template-rows:auto minmax(0,1fr) auto!important',
    '.adminUnplannedChangeHeader{',
    '.adminUnplannedChangeBody{',
    'overflow:auto!important',
    '.adminUnplannedChangeFooter{',
    'env(safe-area-inset-bottom)'
  ]) assert(wizard.includes(marker), 'missing deferred popup page CSS: ' + marker);
  assert(!globalCss.includes('RaK 1.7.112 – Neplánovaná změna je mobilní popup stránka'), '1.7.112 popup CSS leaked into startup stylesheet');
});
