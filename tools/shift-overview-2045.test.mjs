import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const overview = read('admin-shift-overview.js');

test('32/64 quantities accept 1..150 and reject values outside the range', () => {
  const fn = overview.match(/  function canMultiply\(value\) \{[\s\S]*?\n  \}/);
  assert(fn, 'quantity predicate not found');
  const canMultiply = vm.runInNewContext('(' + fn[0] + ')');
  for (const value of ['1', '99', '100', '149', '150']) assert.equal(canMultiply(value), true, value);
  for (const value of ['', '0', '151', '999', '-2', '1.5', 'a']) assert.equal(canMultiply(value), false, value);
  assert(overview.includes('factor === 32 || factor === 64'), 'quantity history still validates both factors');
});

test('locks are durable per section, do not dim values and clear with the record', () => {
  const css = read('features/shift-overview-extra.css');
  const locks = read('features/shift-overview-image.js');
  assert(overview.includes('lockedSections: {}'), 'new record has no locked sections');
  assert(overview.includes('base.lockedSections = Object.fromEntries'), 'stored locks are not normalized');
  assert(locks.includes("data-shift-overview-lock"), 'lock control missing');
  assert(locks.includes('control.readOnly = locked'), 'input lock missing');
  assert(locks.includes('control.disabled = locked'), 'button lock missing');
  assert(overview.includes('rakApplyShiftOverviewLocks') && locks.includes('persistDraft(rootEl)'), 'lock state must persist with the draft');
  assert(overview.includes('const empty = defaultRecord(defaults.date, defaults.shift)'), 'clear must reset locked sections');
  assert(css.includes('.isLocked input[readonly]') && css.includes('opacity:1!important'), 'locked values must remain readable');
  assert(css.includes('label:not(:has(>span))'), 'single-value input alignment missing');
});

test('green report and incoming/outgoing kiln badges remain visible in both schedules', () => {
  const report=read('rak-shift-report.js'), publicRotation=read('rotace.js');
  const editor=read('admin-rotation-editor.js'), daymods=read('admin-daymods.js');
  const css=read('styles-daymods.css');
  assert(report.includes('--rak-index-stroke:#87ac3a;--rak-index-fill:rgba(135,172,58,.24)'), 'shared overview green tint missing');
  assert(publicRotation.includes('badge ? markHtml.trim()'), 'empty public cell does not render badge marker');
  assert(editor.includes('rakMiniDayModMark'), 'expanded/compact admin marker missing');
  assert(daymods.includes("mod.type === 'kalirnaIn'") && daymods.includes("mod.type === 'kalirnaOut'"));
  assert(css.includes('td.missingCell.rakDayModCell .rakDayModMark'));
});
