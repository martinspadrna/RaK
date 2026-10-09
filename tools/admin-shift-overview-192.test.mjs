import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const shell = read('app-menu-admin-shell.js');
const renderer = read('app-menu-admin-renderer.js');
const menu = read('app-menu.js');
const app = read('app.js');
const feature = read('admin-shift-overview.js');
const sw = read('sw.js');
const index = read('index.html');
const metadata = read('rak-release-metadata.js');

test('Přehled směny is owner-only and lives directly under More / Správce', () => {
  const managerSection = menu.slice(menu.indexOf('const roleSection = verifiedRole'), menu.indexOf('body.innerHTML = [', menu.indexOf('const roleSection = verifiedRole')));
  assert.ok(managerSection.includes('rakAdminCanManageAdmins'));
  assert.ok(managerSection.includes('data-menu-action="shift-overview"'));
  assert.ok(managerSection.includes('Přehled směny'));
  assert.ok(!shell.includes('data-admin-action="open-shift-overview"'));
  assert.ok(!shell.includes('Přehled směny'));
  assert.ok(menu.includes("if (menuAction === 'shift-overview')"));
  assert.ok(menu.includes('await appMenuEnsureAdminAccessFromMenu()'));
  assert.ok(menu.includes('await appMenuEnsureAdminTools(body)'));
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
});

test('same-version TEST build offers an update and evicts the old overview module', () => {
  assert.ok(metadata.includes("visibleTestVersion: '1.9.6'"));
  assert.ok(metadata.includes("buildId: 'v1.9.0-shift-overview6'"));
  assert.ok(index.includes("var e='so6',k='rak_ue'"));
  assert.ok(!index.includes("v1.9.0-shift-overview6"));
  assert.ok(sw.includes('const DEVELOPMENT_TEST_DISPLAY_VERSION = RELEASE_METADATA.visibleTestVersion || RELEASE_METADATA.displayVersion;'));
  assert.ok(sw.includes("'./admin-shift-overview.js?v=1.9.0'"));
  assert.ok(sw.includes("'./rak-release-metadata.js'"));
});

test('first version is local-only and covers the paper table fields', () => {
  for (const label of ['Vsázky před kalírnou','Zmetky','Počet BK/ST v provozu','Dlouhodobé závady','Výroba AAR','Volné kalení','Závady na zařízení AAR','Celkové poznámky ke směně','0AM 409 155 / 409 111','Měkké obrábění','Sklad před kalením','Sklad po kalení','Nýtování','Tvrdé obrábění','Plán sklad','Montáž','ALD1 č. posl. vs.:']) {
    assert.ok(feature.includes(label), label);
  }
  for (const code of ['AG / AE','AF / AD','AH / AH','Soustružení','Do skladu','Stav skladu','Awa','Awi','TW1','SR7','FR7','ZSB-RLR','SRRG','0AM 409 155 AG','0AM 409 111 AE']) {
    assert.ok(feature.includes(code), code);
  }
  assert.ok(feature.includes('data-shift-overview-oam-total'));
  assert.ok(feature.includes('rak_admin_shift_overview_v1'));
  assert.ok(feature.includes('localStorage'));
  assert.ok(feature.includes('data-menu-back="1"'));
  assert.ok(!feature.includes('data-admin-action="back-admin"'));
  assert.ok(!feature.includes('fetch('));
  assert.ok(!feature.includes('RotationSupabaseBridge'));
  assert.ok(!feature.includes('.rpc('));
});

test('wide tables explain mobile scrolling and keep AAR row labels visible', () => {
  assert.ok(feature.includes('Posuň tabulku do stran'));
  assert.ok(feature.includes('tabulka se posouvá do stran'));
  assert.ok(feature.includes('tabindex="0"'));
  assert.ok(feature.includes('overscroll-behavior-inline:contain'));
  assert.ok(feature.includes('.rakShiftOverviewAarTable tbody th:first-child{position:sticky'));
});

test('paper overview renders only three active indices and all nine process stages', () => {
  const context = vm.createContext({
    window: { rakAdminCanManageAdmins: () => true },
    document: { getElementById: () => ({}), head: { appendChild() {} } },
    localStorage: { getItem: () => '{}' }
  });
  vm.runInContext(feature, context);
  const body = { dataset: {}, innerHTML: '', querySelector: () => null };
  assert.equal(context.window.RakAdminShiftOverview.render(body, {
    date: '2026-10-09', shift: 'ranni12',
    process: { rows: { ag: { before150: '42' } } },
    aar: { matrix: { turning: { adAg: '999' } } }
  }), true);
  for (const label of ['AG / AE', 'AF / AD', 'AH / AH', 'Počty vsázek', 'Koncové praní', 'ALD1 Vstup', 'ALD2 Vstup']) assert.ok(body.innerHTML.includes(label), label);
  assert.ok(!body.innerHTML.includes('AD / AG'));
  assert.ok(!body.innerHTML.includes('aar.matrix.turning.adAg'));
  assert.ok(!body.innerHTML.includes('oam.rows.ad.'));
  assert.equal((body.innerHTML.match(/data-shift-overview-field="process.rows./g) || []).length, 27);
  assert.equal((body.innerHTML.match(/data-shift-overview-field="inputs.rows./g) || []).length, 36);
  assert.ok(body.innerHTML.includes('value="42"'));
  const paths = [...body.innerHTML.matchAll(/data-shift-overview-field="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(paths).size, paths.length, 'a field must never be rendered twice and overwrite edits on save');
});
