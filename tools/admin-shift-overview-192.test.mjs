import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const shell = read('app-menu-admin-shell.js');
const renderer = read('app-menu-admin-renderer.js');
const menu = read('app-menu.js');
const app = read('app.js');
const feature = read('admin-shift-overview.js');
const sw = read('sw.js');

test('Přehled směny is owner-only and lives under Admin', () => {
  assert.ok(shell.includes('rakAdminCanManageAdmins'));
  assert.ok(shell.includes('data-admin-action="open-shift-overview"'));
  assert.ok(shell.includes('Přehled směny'));
  assert.ok(menu.includes("'admin-shift-overview'"));
  assert.ok(menu.includes("adminAction === 'open-shift-overview'"));
  assert.ok(menu.includes("v === 'admin-shift-overview' && !(typeof rakAdminCanManageAdmins"));
  assert.ok(renderer.includes("mode === 'shift-overview'"));
  assert.ok(renderer.includes('renderAdminShiftOverview'));
});

test('feature remains deferred and does not join startup core', () => {
  const adminStart = app.indexOf('const adminFeatureFiles');
  const adminEnd = app.indexOf('const deferredFiles', adminStart);
  const startupStart = app.indexOf('const startupFiles');
  const startupEnd = app.indexOf('const rotationFeatureFiles', startupStart);
  assert.ok(app.slice(adminStart, adminEnd).includes('"admin-shift-overview.js"'));
  assert.ok(!app.slice(startupStart, startupEnd).includes('admin-shift-overview.js'));
  assert.ok(sw.includes("'./admin-shift-overview.js?v=1.9.0'"));
});

test('first version is local-only and covers the paper table fields', () => {
  for (const label of ['Vsázky před kalírnou','Počet zmetků','Počet BK/ST v provozu','Dlouhodobé závady','Výroba AAR','Volné kalení','Závady na zařízení AAR','Celkové poznámky ke směně']) {
    assert.ok(feature.includes(label), label);
  }
  for (const code of ['AG / AE','AF / AD','AD / AG','AH / AH','Soustružení','Do skladu','Stav skladu']) {
    assert.ok(feature.includes(code), code);
  }
  assert.ok(feature.includes('rak_admin_shift_overview_v1'));
  assert.ok(feature.includes('localStorage'));
  assert.ok(!feature.includes('fetch('));
  assert.ok(!feature.includes('RotationSupabaseBridge'));
  assert.ok(!feature.includes('.rpc('));
});
