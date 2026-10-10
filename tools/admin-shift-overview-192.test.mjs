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
  assert.ok(metadata.includes("visibleTestVersion: '1.9.9'"));
  assert.ok(metadata.includes("buildId: 'v1.9.0-shift-overview9'"));
  assert.ok(index.includes("var e='so9',k='rak_ue'"));
  assert.ok(!index.includes("v1.9.0-shift-overview9"));
  assert.ok(sw.includes('const DEVELOPMENT_TEST_DISPLAY_VERSION = RELEASE_METADATA.visibleTestVersion || RELEASE_METADATA.displayVersion;'));
  assert.ok(sw.includes("'./admin-shift-overview.js?v=1.9.0'"));
  assert.ok(sw.includes("'./rak-release-metadata.js'"));
});

test('first version is local-only and covers the paper table fields', () => {
  for (const label of ['Měkké obrábění','Sklad před kalením','Sklad po kalení','Nýtování','Tvrdé obrábění','Montáž','Poslední vsázka','Dusík','Závady','Celkové poznámky ke směně']) assert.ok(feature.includes(label),label);
  for (const code of ['AG / AE','AF / AD','AH','Soustružení','Do skladu','Stav skladu','Awa','Awi','TW1','SR7','FR7','ZSB-RLR','SRRG','0AM 409 155 AG','0AM 409 111 AE']) {
    assert.ok(feature.includes(code), code);
  }
  assert.ok(feature.includes('Dusík'));
  assert.ok(feature.includes("'lastBatch.ald3'"));
  assert.ok(feature.includes('rak_admin_shift_overview_v1'));
  assert.ok(feature.includes('localStorage'));
  assert.ok(feature.includes('data-menu-back="1"'));
  assert.ok(!feature.includes('data-admin-action="back-admin"'));
  assert.ok(!feature.includes('fetch('));
  assert.ok(!feature.includes('RotationSupabaseBridge'));
  assert.ok(!feature.includes('.rpc('));
});

test('every section uses responsive grids without sideways scrolling', () => {
  assert.ok(!feature.includes('Posuň tabulku do stran'));
  assert.ok(!feature.includes('overflow-x:auto'));
  assert.ok(!feature.includes('<table'));
  assert.ok(feature.includes('repeat(2,minmax(0,1fr))'));
  assert.ok(feature.includes('@media(max-width:650px)'));
});

test('paper overview renders only three active indices and all ten production flow operations', () => {
  const context = vm.createContext({
    window: { rakAdminCanManageAdmins: () => true },
    document: { getElementById: () => ({}), head: { appendChild() {} } },
    localStorage: { getItem: () => '{}' }
  });
  vm.runInContext(feature, context);
  const body = { dataset: {}, innerHTML: '', querySelector: () => null };
  assert.equal(context.window.RakAdminShiftOverview.render(body, {
    date: '2026-10-09', shift: 'ranni12',
    process: { rows: { ag: { before150: '42', kiln: '23' } } },
    aar: { matrix: { turning: { adAg: '999', agAe: '17' } } }
  }), true);
  for (const label of ['AG / AE', 'AF / AD', 'AH', 'ALD1', 'ALD2', 'ALD3', 'Dusík', 'Poslední vsázka']) assert.ok(body.innerHTML.includes(label), label);
  assert.ok(!body.innerHTML.includes('AD / AG'));
  assert.ok(!body.innerHTML.includes('aar.matrix.turning.adAg'));
  assert.ok(!body.innerHTML.includes('oam.rows.ad.'));
  assert.equal((body.innerHTML.match(/data-shift-overview-field="oam.rows./g) || []).length, 30);
  assert.equal((body.innerHTML.match(/data-shift-overview-field="inputs.rows./g) || []).length, 18);
  assert.ok(!body.innerHTML.includes('<details'));
  assert.ok(!body.innerHTML.includes('data-shift-overview-field="process.rows.'));
  const main = body.innerHTML;
  assert.equal((main.match(/data-shift-overview-field="inputs.rows./g) || []).length, 18);
  assert.ok(main.includes('lastBatch.ald3'));
  assert.ok(main.includes('inputmode="decimal"'));
  assert.ok(!main.includes('oam.rows.ag.planStock'));
  const paths = [...body.innerHTML.matchAll(/data-shift-overview-field="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(paths).size, paths.length, 'a field must never be rendered twice and overwrite edits on save');
});

test('editing the active table preserves archived yellow values and excludes them from totals', () => {
  const context = vm.createContext({
    window: { rakAdminCanManageAdmins: () => true },
    document: { getElementById: () => ({}) }
  });
  // Expose private helpers only inside this VM fixture, never in the deployed module.
  vm.runInContext(feature.replace('  installStyle();',
    '  root.fixture = { normalizeRecord, readDom, refreshTotals, setRecord: (el, record) => renderedRecords.set(el, record) };'), context);
  const api = context.window.fixture;
  const original = api.normalizeRecord({
    aar: { matrix: { turning: { agAe: '12', afAd: '8', adAg: '999', ahAh: '2' } } },
    oam: { rows: { ad: { op1020: '888' } } },
    process: { rows: { ag: { before150: '42' } } }
  }, '2026-10-09', 'ranni12');
  const values = new Map([
    ['[data-shift-overview-date]', { value: '2026-10-10' }],
    ['[data-shift-overview-shift]', { value: 'nocni12' }]
  ]);
  for (const [path, value] of [
    ['aar.matrix.turning.agAe', '12'], ['aar.matrix.turning.afAd', '8'], ['aar.matrix.turning.ahAh', '2'],
    ['inputs.rows.AAR.ald1', '11'], ['inputs.rows.AAR.ald2', '9'], ['process.rows.ag.before150', '43'], ['lastBatch.ald3', '12345'], ['nitrogen', '99,8']
  ]) values.set('[data-shift-overview-field="' + path + '"]', { value, getAttribute: () => path });
  const total = { textContent: '' };
  const inputTotal = { textContent: '' };
  const batchTotal = { textContent: '' };
  values.set('[data-shift-overview-batch-total]', batchTotal);
  values.set('[data-shift-overview-total="turning"]', total);
  values.set('[data-shift-overview-input-total="AAR"]', inputTotal);
  const el = {
    querySelector: (selector) => values.get(selector) || null,
    querySelectorAll: () => [...values].filter(([selector]) => selector.startsWith('[data-shift-overview-field=')).map(([, value]) => value)
  };
  api.setRecord(el, original);
  api.refreshTotals(el);
  assert.equal(total.textContent, '22');
  assert.equal(inputTotal.textContent, '20');
  assert.equal(batchTotal.textContent, '20');
  const saved = api.readDom(el);
  assert.equal(saved.lastBatch.ald3, '12345');
  assert.equal(saved.nitrogen, '99,8');
  assert.equal(api.normalizeRecord(saved).nitrogen, '99,8');
  assert.equal(api.normalizeRecord({nitrogen: 0}).nitrogen, '0');
  assert.equal(saved.date, '2026-10-10');
  assert.equal(saved.shift, 'D:nocni12');
  assert.equal(saved.process.rows.ag.before150, '43');
  assert.equal(saved.aar.matrix.turning.adAg, '999');
  assert.equal(saved.oam.rows.ad.op1020, '888');
  assert.equal(saved.inputs.rows.AAR.ald2, '9');
});

test('automatic shift context follows the active A–D cycle, duration and start date', () => {
  const window = { rakAdminCanManageAdmins: () => true };
  const context = vm.createContext({ window, Date, document: { getElementById: () => ({}) } });
  vm.runInContext(feature.replace('  installStyle();', '  root.fixture = { currentShiftContext, normalizeRecord };'), context);
  const api = window.fixture;
  for (const team of ['A','B','C','D']) {
    for (const [hour,hours,key] of [[6,12,'ranni12'],[18,12,'nocni12'],[6,8,'ranni8'],[22,8,'nocni8']]) {
      const start = new Date(2026,9,10,hour), end = new Date(start.getTime()+hours*3600000);
      window.getActiveShiftNow = () => ({team,start,end});
      const result = api.currentShiftContext(new Date(end.getTime()-1000));
      assert.equal(result.shift,team + ':' + key);
      assert.equal(result.date,'2026-10-10');
    }
  }
  window.getActiveShiftNow = () => null;
  assert.equal(api.currentShiftContext(new Date(2026,9,11,16)).shift,'');
  assert.equal(api.normalizeRecord({shift:'nocni12'}).shift,'D:nocni12');
});

test('station panels keep all three indices together before the next workplace', () => {
  const context = vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
  vm.runInContext(feature,context);
  const body={dataset:{},innerHTML:'',querySelector:()=>null};
  context.window.RakAdminShiftOverview.render(body,{date:'2026-10-10',shift:'A:ranni12'});
  const main=body.innerHTML;
  const paths=[...main.matchAll(/data-shift-overview-field="(oam.rows.[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(paths.slice(0,6),['oam.rows.ag.op1020','oam.rows.ag.op1121','oam.rows.af.op1020','oam.rows.af.op1121','oam.rows.ah.op1020','oam.rows.ah.op1121']);
  assert.equal(paths[6],'oam.rows.ag.op30');
  assert.ok(main.includes('value="A:ranni12" selected'));
  assert.ok(!main.includes('<label>Směna D'));
  assert.ok(!feature.includes('.rakShiftOverviewHeader{grid-template-columns:minmax(0,1fr);}'));
});

test('batch counters expose plus/count/minus and prohibit typing', () => {
  const context=vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
  vm.runInContext(feature,context);
  const body={dataset:{},innerHTML:'',querySelector:()=>null};
  context.window.RakAdminShiftOverview.render(body,{date:'2026-10-10',shift:'A:ranni12'});
  const counters=[...body.innerHTML.matchAll(/<div class="rakShiftOverviewCounter">(.*?)<\/div>/g)];
  assert.equal(counters.length,18);
  for(const [,html] of counters){assert.ok(html.includes('readonly'));assert.ok(html.indexOf('data-count-step="1"')<html.indexOf('readonly'));assert.ok(html.indexOf('readonly')<html.indexOf('data-count-step="-1"'));}
  assert.ok(feature.includes('Math.max(0, numberOrZero(input.value) + step)'));
});
