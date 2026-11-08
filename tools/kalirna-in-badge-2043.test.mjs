import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const daymods = read('admin-daymods.js');
const editor = read('admin-rotation-editor.js');
const admin = read('admin-rotation.js');
const publicView = read('rotace.js');
const css = read('styles-daymods.css');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

const globals = { window: {}, document: { addEventListener() {} } };
vm.runInNewContext(daymods, globals, { filename: 'admin-daymods.js' });

const date = '8.11. R';
const month = {
  soft: { rows: [{ date, cells: ['', 'Novotný', '', '', ''] }] },
  dayMods: [
    { section: 'soft', date, cellIndex: 0, type: 'kalirnaIn', person: '' },
    { section: 'soft', date, cellIndex: 1, type: 'kalirnaIn', person: 'Novotný' }
  ]
};
const mod = globals.window.rakDayModForCell;
const badge = globals.window.rakDayModBadge;

test('Kalírna k nám has a K→ badge for both an empty and an occupied machine', () => {
  assert.equal(mod(month, 'soft', date, 0)?.type, 'kalirnaIn');
  assert.equal(mod(month, 'soft', date, 1)?.type, 'kalirnaIn');
  assert.equal(badge(mod(month, 'soft', date, 0)), 'K→');
  assert.equal(badge(mod(month, 'soft', date, 1)), 'K→');
  assert.equal(badge({ type: 'kalirnaOut' }), '→K');
});

test('month mini overview renders Kalírna k nám without inserting a worker name', () => {
  const begin = editor.indexOf('function buildAdminRotationCompactOverviewHtml(');
  const end = editor.indexOf('\n\n// RAK_ROTATION_TOOLBAR_SLIM_17023', begin);
  assert(begin >= 0 && end > begin, 'mini overview function available');
  const source = editor.slice(begin, end) + '\nbuildAdminRotationCompactOverviewHtml';
  const compact = vm.runInNewContext(source, {
    rakDayModForCell: mod,
    rakDayModBadge: badge,
    rakDayModTooltip: globals.window.rakDayModTooltip,
    adminRotationDateLabel: x => x,
    adminRotationCompactMachineLabel: x => x,
    adminShortRotationName: x => x,
    escapeHtml
  });
  const html = compact('11/2026', [], month.soft.rows, [], ['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'], month);
  assert.equal((html.match(/K→/g) || []).length, 2);
  assert(html.includes('adminRotationMiniDayModIn'));
  assert(html.includes('adminRotationMiniHasDayMod'));
  assert(!month.soft.rows[0].cells[0], 'the incoming helper is not made a physical worker');
});

test('editor, public grid and narrow screen styles keep the incoming badge visible', () => {
  assert(admin.includes("mod.type === 'kalirnaIn') tdClasses.push('rakKalirnaInCell')"));
  assert(publicView.includes("mod.type === 'kalirnaIn' ? \" rakKalirnaInCell\""));
  assert(publicView.includes('(badge ? escapeHtml(badge) : "—")'), 'public empty cell shows K→');
  assert(css.includes('.rakDayModCell.rakKalirnaInCell .rakDayModMark'));
  assert(css.includes('td .rakMiniDayModMark'));
  assert(css.includes('color:#fff !important;'), 'mini marker is visible over transparent empty cell');
  assert(daymods.includes("type === 'kalirnaOut' || type === 'kalirnaIn'"), 'saving both directions unchanged');
});

test('full rotation finds the incoming badge with compact editor date while keeping distinct shifts', () => {
  const month = {
    soft: { rows: [
      { date: '8.11. R', cells: ['', 'Novotný'] },
      { date: '8.11. N', cells: ['', 'Novotný'] }
    ] },
    dayMods: [
      { section: 'soft', date: '8.11.R', cellIndex: 0, type: 'kalirnaIn' },
      { section: 'soft', date: '8.11.R', cellIndex: 1, type: 'kalirnaOut', person: 'Novotný' }
    ]
  };
  assert.equal(mod(month, 'soft', '8.11. R', 0)?.type, 'kalirnaIn');
  assert.equal(badge(mod(month, 'soft', '8.11. R', 0)), 'K→');
  assert.equal(mod(month, 'soft', '8.11. R', 1)?.type, 'kalirnaOut');
  assert.equal(mod(month, 'soft', '8.11. N', 0), null);
  assert.equal(mod(month, 'soft', '8.11. N', 1), null);
  assert.equal(mod(month, 'soft', '09.11.R', 0), null);
  assert.equal(mod(month, 'soft', '8.11.R8', 0), null);
  assert(daymods.includes('sameDayModDate(m.date, record.date)'), 'saving a compact-date exception replaces its canonical shift');
});

test('outgoing helper badge never follows a replaced worker on a date variant', () => {
  const month = {
    soft: { rows: [{ date: '8.11. R', cells: ['Pech'] }] },
    dayMods: [{ section: 'soft', date: '8.11.R', cellIndex: 0, person: 'Novotný', type: 'kalirnaOut' }]
  };
  assert.equal(mod(month, 'soft', '8.11. R', 0), null);
});
