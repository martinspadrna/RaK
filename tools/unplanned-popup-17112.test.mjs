import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const editor = read('admin-rotation-editor.js');
const wizard = read('admin-rotation-generator-wizard.js');
const globalCss = read('styles-admin-polish.css');

test('occupied schedule tap opens a full two-action menu before the input can focus', () => {
  const start = editor.indexOf('function adminBindRotationNameActionMenuRoute()');
  const end = editor.indexOf("try { adminBindRotationNameActionMenuRoute(); }", start);
  assert(start >= 0 && end > start, 'deferred name action menu route missing');
  const block = editor.slice(start, end);
  assert(block.includes("closest('[data-rot-field^=\"cell-\"]')"));
  assert(block.includes("String(target.value || '').trim()"));
  assert(block.includes('event.preventDefault()'));
  assert(block.includes('event.stopPropagation()'));
  assert(block.includes("typeof active.blur === 'function'"));
  assert(block.includes('adminShowRotationQuickRemove(target)'));
  assert(block.indexOf('event.preventDefault()') < block.indexOf('adminShowRotationQuickRemove(target)'));
  assert(editor.includes('Neplánovaná dovolená'));
  assert(editor.includes('adminRotationQuickRemoveBtn">Odebrat</button>'));
  assert(editor.includes("grid-template-columns:1fr!important"));
  assert(editor.includes("width:min(260px,calc(100vw - 16px))!important"));
  assert(editor.includes(".adminRotationQuickRemove.isVisible{display:grid!important;grid-template-columns:1fr!important;align-items:stretch!important;justify-content:stretch!important}"));
  assert(editor.includes("box.style.setProperty('display', 'grid', 'important')"));
  assert(editor.includes("box.style.setProperty('grid-template-columns', '1fr', 'important')"));
  assert(editor.includes("actions.style.setProperty('display', 'grid', 'important')"));
  assert(editor.includes("actions.style.setProperty('grid-template-columns', '1fr', 'important')"));
  assert(editor.includes("button.style.setProperty('width', '100%', 'important')"));
  assert(editor.includes("button.style.setProperty('display', 'block', 'important')"));
  assert(editor.includes("adminOpenUnplannedChangeDialog(target)"), 'unplanned menu action must still open the large popup');
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
