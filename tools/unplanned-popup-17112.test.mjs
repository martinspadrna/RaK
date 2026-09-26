import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('app-menu.js');
const wizard = read('admin-rotation-generator-wizard.js');
const css = read('styles-admin-polish.css');

test('occupied schedule tap opens unplanned-change popup before the input can focus', () => {
  const start = menu.indexOf("body.addEventListener('pointerdown', (event) => {");
  const end = menu.indexOf("body.addEventListener('focusin'", start);
  assert(start >= 0 && end > start, 'direct popup pointer route missing');
  const block = menu.slice(start, end);
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

test('popup page uses full available mobile height, safe areas and sticky page regions', () => {
  for (const marker of [
    '.adminUnplannedChangeDialog.adminUnplannedChangePage{',
    'height:100% !important',
    'grid-template-rows:auto minmax(0,1fr) auto !important',
    '.adminUnplannedChangeHeader{',
    '.adminUnplannedChangeBody{',
    'overflow:auto !important',
    '.adminUnplannedChangeFooter{',
    'env(safe-area-inset-bottom)'
  ]) assert(css.includes(marker), 'missing popup page CSS: ' + marker);
});
