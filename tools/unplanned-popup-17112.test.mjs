import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const editor = read('admin-rotation-editor.js');
const wizard = read('admin-rotation-generator-wizard.js');
const globalCss = read('styles-admin-polish.css');

function actionFixture() {
  const handlers = {}, fields = [], buttons = [], tables = {}, state = { authorized: true, opened: [], events: [], blur: 0 };
  const classes = () => { const set = new Set(); return { contains: x => set.has(x), toggle: (x, on) => on ? set.add(x) : set.delete(x) }; };
  for (const section of ['hard', 'soft', 'absence']) {
    const table = tables[section] = { dataset: {}, classList: classes(), querySelectorAll: () => fields.filter(f => f.section === section) };
    fields.push({ section, value: 'TEST', readOnly: false, setAttribute(k) { if (k === 'readonly') this.readOnly = true; }, removeAttribute(k) { if (k === 'readonly') this.readOnly = false; }, closest: selector => selector === 'table' || (section === 'absence' && selector.startsWith('[data-rotation-name-mode]') && table.dataset.rotationNameMode) ? table : selector.includes('[data-rot-field') ? fields.find(f => f.section === section) : null, matches: () => section !== 'absence', dispatchEvent: e => state.events.push(e.type) });
    for (const mode of ['unplanned', 'remove']) buttons.push({ dataset: { rotationNameMode: mode, rotationActionSection: section }, classList: classes(), setAttribute(k, v) { this[k] = v; }, closest: selector => selector.includes('[data-rotation-name-mode]') ? buttons.find(b => b.dataset.rotationActionSection === section && b.dataset.rotationNameMode === mode) : null });
  }
  const body = { dataset: { adminView: 'rotation' }, contains: () => true,
    querySelector: s => { const section = ['hard', 'soft', 'absence'].find(x => s.includes('="' + x + '"')); return s.startsWith('table') ? tables[section] : null; },
    querySelectorAll: s => { const section = ['hard', 'soft', 'absence'].find(x => s.includes('="' + x + '"')); return s.includes('data-daymod-mode') ? [] : buttons.filter(b => b.dataset.rotationActionSection === section); } };
  const document = { body: {}, activeElement: { blur: () => state.blur++ }, getElementById: id => id === 'appMenuBody' ? body : null,
    addEventListener: (type, fn) => { handlers[type] = fn; } };
  const context = { document, Event: class { constructor(type) { this.type = type; } }, appMenuCanRunAdminInteraction: () => state.authorized,
    adminCloseRotationQuickRemove() {}, adminHideRotationSelectedRemove() {}, adminCloseAbsenceCodePicker() {}, adminRotationIsRemoveValue: x => x === '-', adminOpenUnplannedChangeDialog: x => state.opened.push(x) };
  context.window = context;
  vm.createContext(context);
  const start = editor.indexOf('function buildAdminRotationActionBarHtml(');
  const end = editor.indexOf('function adminEnsureRotationNameActionMenuStyles()', start);
  const route = editor.slice(editor.indexOf('function adminBindRotationNameActionMenuRoute()'), editor.indexOf('try { adminBindRotationNameActionMenuRoute(); }'));
  vm.runInContext(editor.slice(start, end) + '\nfunction adminEnsureRotationNameActionMenuStyles() {}\n' + route, context);
  const mods = read('admin-daymods.js');
  vm.runInContext(mods.slice(mods.indexOf('function setSectionEditMode('), mods.indexOf('function onDocClick(')), context);
  context.adminBindRotationNameActionMenuRoute();
  const event = target => ({ target, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  return { context, state, fields, buttons, tables, event, handlers };
}

test('normal and exception taps never open the unplanned menu or intercept pointer focus', () => {
  const f = actionFixture(), target = f.fields[0];
  for (const exception of [false, true]) {
    f.tables.hard.classList.toggle('rakDayModEditMode', exception);
    const pointer = f.event(target), click = f.event(target);
    f.handlers.pointerdown(pointer); f.handlers.click(click);
    assert.equal(pointer.prevented, false); assert.equal(click.prevented, false);
    assert.equal(f.state.opened.length, 0); assert.equal(f.state.blur, 0);
  }
  assert(!editor.includes('adminRotationQuickRemoveText'));
});

test('explicit modes select only their section and hand vacation to the existing dialog', () => {
  const f = actionFixture();
  const button = f.buttons.find(b => b.dataset.rotationActionSection === 'hard' && b.dataset.rotationNameMode === 'unplanned');
  f.handlers.click(f.event(button));
  assert.equal(f.tables.hard.dataset.rotationNameMode, 'unplanned');
  assert.equal(f.fields[0].readOnly, true); assert.equal(f.fields[1].readOnly, false);
  assert.equal(button['aria-pressed'], 'true');
  const pointer = f.event(f.fields[0]); f.handlers.pointerdown(pointer); assert(pointer.prevented);
  f.handlers.click(f.event(f.fields[0])); assert.equal(f.state.opened[0], f.fields[0]);
  f.handlers.click(f.event(button)); assert.equal(f.fields[0].readOnly, false);
  assert.equal(button['aria-pressed'], 'false');
});

test('exceptions and name modes are mutually exclusive without changing other sections', () => {
  const f = actionFixture();
  f.context.adminSetRotationNameActionMode('soft', 'remove');
  f.context.adminSetRotationNameActionMode('hard', 'unplanned');
  f.context.rakDayModSetEditMode('hard', true);
  assert.equal(f.tables.hard.dataset.rotationNameMode, '');
  assert(f.tables.hard.classList.contains('rakDayModEditMode'));
  assert.equal(f.fields[0].readOnly, true);
  assert.equal(f.tables.soft.dataset.rotationNameMode, 'remove');
  f.context.adminSetRotationNameActionMode('hard', 'remove');
  assert(!f.tables.hard.classList.contains('rakDayModEditMode'));
  assert.equal(f.tables.hard.dataset.rotationNameMode, 'remove');
});

test('remove is local, emits draft events, does not focus, ignores empty/sentinel and fails closed', () => {
  const f = actionFixture();
  f.context.adminSetRotationNameActionMode('hard', 'remove');
  f.state.authorized = false;
  f.handlers.click(f.event(f.fields[0])); assert.equal(f.fields[0].value, 'TEST');
  f.state.authorized = true;
  f.handlers.click(f.event(f.fields[0])); assert.equal(f.fields[0].value, '');
  assert.deepEqual(f.state.events, ['input', 'change']); assert.equal(f.state.opened.length, 0);
  f.handlers.click(f.event(f.fields[0]));
  f.fields[0].value = '-'; f.handlers.click(f.event(f.fields[0]));
  assert.deepEqual(f.state.events, ['input', 'change']);
  f.context.adminSetRotationNameActionMode('absence', 'remove');
  f.handlers.click(f.event(f.fields[2])); assert.equal(f.fields[2].value, '');
  assert.equal(f.state.blur, 2);
});

test('toolbar is outside summary, wraps on mobile and preserves accessible controls', () => {
  const f = actionFixture();
  const hard = f.context.buildAdminRotationActionBarHtml('hard');
  for (const text of ['Výjimky dne', 'Neplánovaná dovolená', 'Odebrat', 'aria-pressed="false"']) assert(hard.includes(text));
  assert(!f.context.buildAdminRotationActionBarHtml('absence').includes('Neplánovaná dovolená'));
  assert(editor.includes('flex-wrap:wrap')); assert(editor.includes('min-height:44px'));
  assert(editor.includes("buildAdminRotationActionBarHtml('hard')"));
  assert(!editor.includes('<summary>Tvrdota <button'));
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
    'grid-template-rows:auto minmax(0,1fr) auto!important',
    '.adminUnplannedChangeHeader{',
    '.adminUnplannedChangeBody{',
    'overflow:auto!important',
    '.adminUnplannedChangeFooter{',
    'env(safe-area-inset-bottom)'
  ]) assert(wizard.includes(marker), 'missing deferred popup page CSS: ' + marker);
  assert(
    wizard.includes('height:100%!important') || (wizard.includes('height:auto!important') && wizard.includes('max-height:calc(100dvh')),
    'successor must keep the popup page-like while allowing a compact safe-area bounded height'
  );
  assert(!globalCss.includes('RaK 1.7.112 – Neplánovaná změna je mobilní popup stránka'), '1.7.112 popup CSS leaked into startup stylesheet');
});
