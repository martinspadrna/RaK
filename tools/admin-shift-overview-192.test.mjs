import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const shell = read('app-menu-admin-shell.js');
const renderer = read('app-menu-admin-renderer.js');
const menu = read('app-menu.js');
const app = read('app.js');
const feature = read('admin-shift-overview.js');
const sw = read('sw.js');
const index = read('index.html');
const metadata = read('rak-release-metadata.js');

function cloudFixture({ storage = new Map(), server = new Map(), legacy, delaySave } = {}) {
  const state = { identity: { accountId: '9811', userId: 'owner-a' }, online: true, fail: false, lost: false, calls: 0 };
  if (legacy) storage.set('rak_admin_shift_overview_v1', JSON.stringify(legacy));
  const events = {};
  const window = {
    crypto: { randomUUID }, navigator: {}, rakAdminCanManageAdmins: () => !!state.identity,
    rakAdminGetActiveAccountId: () => state.identity?.accountId || '',
    addEventListener: (name, handler) => { events[name] = handler; }
  };
  Object.defineProperty(window.navigator, 'onLine', { get: () => state.online });
  window.RotationSupabaseBridge = {
    getShiftOverviewIdentity: () => state.identity,
    ensureShiftOverviewIdentity: async () => state.identity,
    listShiftOverviews: async identity => state.fail ? { ok: false } : { ok: true, data: [...server.values()].filter(r => r.uid === identity.userId) },
    saveShiftOverview: async (identity, entry) => {
      state.calls++;
      if (delaySave) await delaySave(entry);
      if (state.fail) return { ok: false };
      const key = identity.userId + '|' + entry.payload.date + '|' + entry.payload.shift;
      const prior = server.get(key);
      if (prior?.mutation_id === entry.id) return { ok: true, data: { ok: true, row: prior } };
      if ((prior?.revision || 0) !== entry.revision) return { ok: true, data: { ok: false, conflict: true, row: prior } };
      const row = { uid: identity.userId, shift_date: entry.payload.date, shift_code: entry.payload.shift,
        payload: structuredClone(entry.payload), revision: (prior?.revision || 0) + 1, mutation_id: entry.id };
      server.set(key, row);
      if (state.lost) { state.lost = false; return { ok: false }; }
      return { ok: true, data: { ok: true, row } };
    }
  };
  const context = vm.createContext({ window, document: { getElementById: () => ({}) },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) } });
  // Expose the controller only inside this VM; production has no test hooks.
  vm.runInContext(feature.replace('  const AAR_COLUMNS = [', '  root.testCloud = { localCloudSave, syncCloud, cloudRead, migrateLocal, cloudResolution, readStore };\n  const AAR_COLUMNS = ['), context);
  return { api: window.testCloud, state, storage, server, events };
}
const cloudRecord = (nitrogen = '10') => ({ date: '2026-10-11', shift: 'B:nocni12', nitrogen });
const cloudKey = '2026-10-11|B:nocni12';

test('cloud backup restores the same account on a second device and isolates other accounts', async () => {
  const first = cloudFixture();
  first.api.localCloudSave(cloudRecord('123'));
  assert.equal(await first.api.syncCloud(), true);
  const second = cloudFixture({ server: first.server });
  assert.equal(await second.api.syncCloud(), true);
  assert.equal(second.api.readStore()[cloudKey].nitrogen, '123');
  second.state.identity = { accountId: '9812', userId: 'owner-b' };
  assert.equal(Object.keys(second.api.readStore()).length, 0);
  await second.api.syncCloud();
  assert.equal(Object.keys(second.api.readStore()).length, 0);
  second.state.identity = null;
  assert.equal(Object.keys(second.api.readStore()).length, 0);
  assert.throws(() => second.api.localCloudSave(cloudRecord()), /přihlas/);
});

test('offline outbox survives reload and uploads on reconnection', async () => {
  const first = cloudFixture();
  first.state.online = false;
  first.api.localCloudSave(cloudRecord('777'));
  assert.equal(await first.api.syncCloud(), false);
  assert.equal(first.server.size, 0);
  const reloaded = cloudFixture({ storage: first.storage, server: first.server });
  await reloaded.api.syncCloud();
  assert.equal([...first.server.values()][0].payload.nitrogen, '777');
  assert.equal(Object.keys(reloaded.api.cloudRead(reloaded.state.identity).pending).length, 0);
});

test('lost cloud response retries idempotently without discarding local data', async () => {
  const first = cloudFixture();
  first.api.localCloudSave(cloudRecord('42')); first.state.lost = true;
  assert.equal(await first.api.syncCloud(), false);
  assert.equal(first.api.cloudRead(first.state.identity).pending[cloudKey].length, 1);
  await first.api.syncCloud();
  assert.equal([...first.server.values()][0].revision, 1);
  assert.equal(Object.keys(first.api.cloudRead(first.state.identity).pending).length, 0);
});

test('background refresh cannot silently rebase a stale open editor', async () => {
  const a = cloudFixture(); a.api.localCloudSave(cloudRecord('1')); await a.api.syncCloud();
  const b = cloudFixture({ server: a.server }); await b.api.syncCloud();
  const openedRevision = b.api.cloudRead(b.state.identity).revisions[cloudKey];
  a.api.localCloudSave(cloudRecord('2')); await a.api.syncCloud();
  await b.api.syncCloud(); // foreground/visibility refresh updates cache, not editor base
  b.api.localCloudSave(cloudRecord('3'), openedRevision);
  assert.equal(await b.api.syncCloud(), false);
  assert.equal([...a.server.values()][0].payload.nitrogen, '2');
  assert.equal(b.api.readStore()[cloudKey].nitrogen, '3');
});

test('legacy records are backed up once and never assigned to a second account', async () => {
  const legacy = { '2026-10-11|B:nocni12': cloudRecord('456') };
  const first = cloudFixture({ legacy });
  assert.equal(first.api.readStore()[cloudKey].nitrogen, '456');
  assert.equal(first.server.size, 0); // visible before the first cloud request finishes
  await first.api.syncCloud();
  assert.equal([...first.server.values()][0].payload.nitrogen, '456');
  assert.deepEqual(JSON.parse(first.storage.get('rak_admin_shift_overview_v1')), legacy);
  first.state.identity = { accountId: '9812', userId: 'owner-b' };
  await first.api.syncCloud();
  assert.equal(first.server.size, 1);
});

test('two-device stale save preserves both versions until explicit conflict resolution', async () => {
  const a = cloudFixture(); a.api.localCloudSave(cloudRecord('1')); await a.api.syncCloud();
  const b = cloudFixture({ server: a.server }); await b.api.syncCloud();
  a.api.localCloudSave(cloudRecord('2')); await a.api.syncCloud();
  b.api.localCloudSave(cloudRecord('3')); assert.equal(await b.api.syncCloud(), false);
  assert.equal([...a.server.values()][0].payload.nitrogen, '2');
  assert.equal(b.api.readStore()[cloudKey].nitrogen, '3');
  b.api.cloudResolution(false, '2026-10-11', 'B:nocni12');
  assert.equal(await b.api.syncCloud(), true);
  assert.equal([...a.server.values()][0].payload.nitrogen, '3');
  assert.equal(b.api.cloudRead(b.state.identity).recovery.length, 1);
});

test('new saves during in-flight upload keep their own mutation and are eventually backed up', async () => {
  let release, started;
  const waiting = new Promise(r => { started = r; });
  const delay = new Promise(r => { release = r; });
  let once = true;
  const a = cloudFixture({ delaySave: async () => { if (once) { once = false; started(); await delay; } } });
  a.api.localCloudSave(cloudRecord('1')); const job = a.api.syncCloud();
  await waiting; a.api.localCloudSave(cloudRecord('2')); release(); await job;
  assert.equal([...a.server.values()][0].payload.nitrogen, '2');
  assert.equal([...a.server.values()][0].revision, 2);
  assert.equal(Object.keys(a.api.cloudRead(a.state.identity).pending).length, 0);
});

test('account switch while upload is in flight cannot acknowledge a different account cache', async () => {
  let release, started;
  const waiting = new Promise(r => { started = r; }); const delay = new Promise(r => { release = r; });
  const a = cloudFixture({ delaySave: async () => { started(); await delay; } });
  const old = a.state.identity;
  a.api.localCloudSave(cloudRecord('1')); const job = a.api.syncCloud();
  await waiting; a.state.identity = { accountId: '9812', userId: 'owner-b' }; release();
  assert.equal(await job, false);
  assert.equal(Object.keys(a.api.readStore()).length, 0);
  assert.equal(a.api.cloudRead(old).pending[cloudKey].length, 1);
});

test('Přehled směny is owner/foreman-only and lives directly under More', () => {
  const managerSection = menu.slice(menu.indexOf('const roleSection = verifiedRole'), menu.indexOf('body.innerHTML = [', menu.indexOf('const roleSection = verifiedRole')));
  assert.ok(managerSection.includes('rakAdminCanOpenShiftOverview'));
  assert.ok(managerSection.includes('data-menu-action="shift-overview"'));
  assert.ok(managerSection.includes('Přehled směny'));
  assert.ok(!shell.includes('data-admin-action="open-shift-overview"'));
  assert.ok(!shell.includes('Přehled směny'));
  assert.ok(menu.includes("if (menuAction === 'shift-overview')"));
  assert.ok(menu.includes('await appMenuEnsureAdminAccessFromMenu()'));
  assert.ok(menu.includes('await appMenuEnsureAdminTools(body)'));
  assert.ok(menu.includes("'admin-shift-overview'"));
  assert.ok(menu.includes("adminAction === 'open-shift-overview'"));
  assert.ok(menu.includes("v === 'admin-shift-overview' && !(typeof rakAdminCanOpenShiftOverview"));
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
  assert.ok(metadata.includes("visibleTestVersion: '2.0.12'"));
  assert.ok(metadata.includes("buildId: 'v2.0.12-release1'"));
  assert.ok(index.includes("var e='v212',k='rak_ue'"));
  assert.ok(!index.includes("v2.0.12-release1"));
  assert.ok(sw.includes('const DEVELOPMENT_TEST_DISPLAY_VERSION = RELEASE_METADATA.visibleTestVersion || RELEASE_METADATA.displayVersion;'));
  assert.ok(sw.includes("'./admin-shift-overview.js?v=2.0.12'"));
  assert.ok(sw.includes("'./rak-release-metadata.js'"));
});

test('account backup preserves all paper fields and keeps network access in authenticated bridge', () => {
  for (const label of ['Měkké obrábění','Sklad před kalením','Sklad po kalení','Po 145','Po broušení','Montáž','Poslední vsázka','Dusík','Závady','Celkové poznámky ke směně']) assert.ok(feature.includes(label),label);
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
  assert.ok(feature.includes('RotationSupabaseBridge'));
  assert.ok(!feature.includes('.rpc('));
});

test('every section uses responsive grids without sideways scrolling', () => {
  assert.ok(!feature.includes('Posuň tabulku do stran'));
  assert.ok(!feature.includes('overflow-x:auto'));
  assert.ok(!feature.includes('<table'));
  assert.ok(feature.includes('repeat(2,minmax(0,1fr))'));
  assert.ok(feature.includes('@media(max-width:650px)'));
});

test('morning overview renders three active indices without duplicate or archived fields', () => {
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
  assert.equal((body.innerHTML.match(/data-shift-overview-field="oam.rows./g) || []).length, 24);
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
  window.getActiveShiftNow = () => ({team:'D',start:new Date(2026,9,12,18),end:new Date(2026,9,13,6)});
  const overnight=api.currentShiftContext(new Date(2026,9,13,4,5));
  assert.equal(overnight.date,'2026-10-12');assert.equal(overnight.shift,'D:nocni12');
  window.getActiveShiftNow = () => null;
  assert.equal(api.currentShiftContext(new Date(2026,9,11,16)).shift,'');
  assert.equal(api.normalizeRecord({shift:'nocni12'}).shift,'D:nocni12');
});

test('station panels keep all three indices together before the next workplace', () => {
  const context = vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
  vm.runInContext(feature,context);
  const body={dataset:{},innerHTML:'',querySelector:()=>null};
  context.window.RakAdminShiftOverview.render(body,{date:'2026-10-10',shift:'A:nocni12'});
  const main=body.innerHTML;
  const paths=[...main.matchAll(/data-shift-overview-field="(oam.rows.[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(paths.slice(0,6),['oam.rows.ag.stock','oam.rows.af.stock','oam.rows.ah.stock','oam.rows.ag.assembly','oam.rows.af.assembly','oam.rows.ah.assembly']);
  assert.equal(paths[6],'oam.rows.ag.op30');
  assert.ok(main.includes('value="A:nocni12" selected'));
  assert.ok(!main.includes('<label>Směna D'));
  assert.ok(!feature.includes('.rakShiftOverviewHeader{grid-template-columns:minmax(0,1fr);}'));
});

test('batch counters expose minus/count/plus and prohibit typing', () => {
  const context=vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
  vm.runInContext(feature,context);
  const body={dataset:{},innerHTML:'',querySelector:()=>null};
  context.window.RakAdminShiftOverview.render(body,{date:'2026-10-10',shift:'A:ranni12'});
  const counters=[...body.innerHTML.matchAll(/<div class="rakShiftOverviewCounter">(.*?)<\/div>/g)];
  assert.equal(counters.length,18);
  for(const [,html] of counters){assert.ok(html.includes('<output'));assert.ok(!html.includes('<input'));assert.ok(!html.includes('tabindex'));assert.ok(!html.includes('contenteditable'));assert.ok(html.indexOf('data-count-step="-1"')<html.indexOf('<output'));assert.ok(html.indexOf('</output>')<html.indexOf('data-count-step="1"'));}
  assert.ok(feature.includes('Math.max(0, numberOrZero(input.value) + step)'));
});

test('multiplication offers cover only requested stages and integers 1–99', () => {
  const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
  vm.runInContext(feature.replace('  installStyle();','  root.fixture = {canMultiply,quantityMultiplier};'),context);
  const api=context.window.fixture;
  for(const value of ['1','9','10','99','01',' 42 '])assert.equal(api.canMultiply(value),true,value);
  for(const value of ['', '0','00','100','999','-1','1.5','1,5','1e1','abc','001'])assert.equal(api.canMultiply(value),false,value);
  for(const key of ['stock','assembly','op1121','hard','after145'])assert.equal(api.quantityMultiplier(key),32,key);
  for(const key of ['op31','op121','op145'])assert.equal(api.quantityMultiplier(key),64,key);
  for(const key of ['op1020','op30','op120'])assert.equal(api.quantityMultiplier(key),0,key);
});


test('riveting keeps historic before-145 values and saves after-145 independently', () => {
  const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
  vm.runInContext(feature.replace('  installStyle();','  root.fixture = {normalizeRecord,readDom,oamTable,setRecord:(el,r)=>renderedRecords.set(el,r)};'),context);
  const api=context.window.fixture;
  const old=api.normalizeRecord({oam:{rows:{ag:{op145:'384'}}}},'2026-10-10','D:nocni12');
  assert.equal(old.oam.rows.ag.op145,'384');
  assert.equal(old.oam.rows.ag.after145,'');
  const html=api.oamTable(old);
  assert.ok(html.includes('Před 145'));assert.ok(html.includes('Po 145'));
  for(const key of ['ag','af','ah'])for(const stage of ['op145','after145'])assert.ok(html.includes('oam.rows.'+key+'.'+stage));
  const nodes=[{value:'384',getAttribute:()=> 'oam.rows.ag.op145'},{value:'288',getAttribute:()=> 'oam.rows.ag.after145'}];
  const el={querySelector:()=>null,querySelectorAll:()=>nodes};
  api.setRecord(el,old);
  const saved=api.readDom(el);
  assert.equal(saved.oam.rows.ag.op145,'384');assert.equal(saved.oam.rows.ag.after145,'288');
  const reload=api.normalizeRecord(saved,saved.date,saved.shift);
  assert.equal(reload.oam.rows.ag.op145,'384');assert.equal(reload.oam.rows.ag.after145,'288');
});



test('Excel flow groups before-145 under hardened stock and preserves archived washer data', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,readDom,oamTable,setRecord:(el,r)=>renderedRecords.set(el,r)};'),context);
 const api=context.window.fixture;
 const old=api.normalizeRecord({oam:{rows:{ag:{hard:'384',beforeWasher:'256',op145:'96',after145:'288'}}}},'2026-10-10','D:nocni12');
 const html=api.oamTable(old);
 assert.ok(html.includes('Po 145'));assert.ok(html.includes('Po broušení'));assert.ok(html.includes('Po broušení (op 212)'));assert.ok(!html.includes('<span>212</span>'));
 assert.ok(!html.includes('v nouz. skl.'));assert.ok(!html.includes('před pračkou'));assert.ok(!html.includes('data-shift-overview-field="oam.rows.ag.beforeWasher"'));
 const panels=html.split('<h3>');
 const hardened=panels.find(p=>p.startsWith('Sklad po kalení'));
 const before145=hardened.split('<section class="rakShiftOverviewBefore145"')[1];
 assert.ok(before145,'before 145 has its own section inside hardened stock');
 assert.ok(!hardened.split('<section class="rakShiftOverviewBefore145"')[0].includes('.op145"'));
 for(const key of ['ag','af','ah']){assert.ok(before145.includes('oam.rows.'+key+'.op145'));assert.ok(!before145.includes('oam.rows.'+key+'.op120'));assert.ok(!before145.includes('oam.rows.'+key+'.op121'));}
 const riveting=panels.find(p=>p.startsWith('Po 145'));
 const grinding=panels.find(p=>p.startsWith('Po broušení'));
 for(const key of ['ag','af','ah']){
  assert.ok(hardened.includes('oam.rows.'+key+'.op145'));
  assert.ok(!riveting.includes('oam.rows.'+key+'.op145'));
  assert.ok(riveting.includes('oam.rows.'+key+'.after145'));
  assert.ok(grinding.includes('oam.rows.'+key+'.hard'));
 }
 const el={querySelector:()=>null,querySelectorAll:()=>[{value:'640',getAttribute:()=> 'oam.rows.ag.hard'}]};
 api.setRecord(el,old);const saved=api.readDom(el),reload=api.normalizeRecord(saved,saved.date,saved.shift);
 assert.equal(reload.oam.rows.ag.hard,'640');assert.equal(reload.oam.rows.ag.beforeWasher,'256');
 assert.equal(reload.oam.rows.ag.op145,'96');assert.equal(reload.oam.rows.ag.after145,'288');
});


test('quantity expressions support addition/subtraction, preserve invalid text and protect counters', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={evaluateQuantityExpression,calculateQuantity};'),context);
 const api=context.window.fixture;
 for(const [input,result] of [['320+256','576'],['320-256','64'],['320 + 256 - 32','544'],['12-20','-8'],['0,1+0,2','0.3'],['1.005+0.005','1.01'],['320−256','64']])assert.equal(api.evaluateQuantityExpression(input),result);
 for(const input of ['','320','320+','1*32','abc','1+alert(1)','9007199254740991+1'])assert.equal(api.evaluateQuantityExpression(input),null);
 const input={value:'320+256',readOnly:false,hasAttribute:()=>true};api.calculateQuantity(input);assert.equal(input.value,'576');
 input.value='1+2';input.readOnly=true;api.calculateQuantity(input);assert.equal(input.value,'1+2');
 input.readOnly=false;input.hasAttribute=()=>false;api.calculateQuantity(input);assert.equal(input.value,'1+2');
 assert.ok(feature.includes("rootEl.addEventListener('focusout', finishQuantity)"));
});


test('ALD totals sum each visible list independently and exclude historic hidden combinations', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={refreshTotals};'),context);
 const out={1:{textContent:''},2:{textContent:''}};
 const fields={'inputs.rows.SR1.ald2':3,'inputs.rows.AAR.ald2':2,'inputs.rows.Awa.ald1':4,'inputs.rows.TW3.ald1':1,'inputs.rows.AAR.ald1':99};
 const root={querySelector(selector){
  const total=selector.match(/data-shift-overview-ald-total="([12])"/);if(total)return out[total[1]];
  const path=selector.match(/data-shift-overview-field="([^"]+)"/);return path&&path[1]in fields?{value:String(fields[path[1]])}:null;
 }};
 context.window.fixture.refreshTotals(root);assert.equal(out[1].textContent,'5');assert.equal(out[2].textContent,'5');
 fields['inputs.rows.SR1.ald2']=4;context.window.fixture.refreshTotals(root);assert.equal(out[1].textContent,'5');assert.equal(out[2].textContent,'6');
 assert.ok(feature.includes('Celkem vsázek'));assert.ok(feature.includes('<output data-shift-overview-ald-total='));
});


test('ALD3 manual total persists independently and numeric inputs retain arithmetic access', () => {
 const context=vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,readDom,setRecord:(el,r)=>renderedRecords.set(el,r)};'),context);
 const api=context.window.fixture,record=api.normalizeRecord({date:'2026-10-11',shift:'B:nocni12',inputs:{ald3:'17',rows:{AAR:{ald1:2}}}});
 const body={dataset:{},innerHTML:'',querySelector:()=>null};context.window.RakAdminShiftOverview.render(body,record);
 const inputs=[...body.innerHTML.matchAll(/<input[^>]+data-shift-overview-field="([^"]+)"[^>]*>/g)];
 for(const [tag,path]of inputs){if(!tag.includes('readonly')){assert.match(tag,/inputmode="(?:numeric|decimal)"/,path);assert.ok(tag.includes('data-shift-overview-calculate'),path);}}
 assert.match(body.innerHTML,/data-shift-overview-field="inputs.ald3"[^>]+value="17"/);
 const el={querySelector:s=>s.includes('date')?{value:record.date}:{value:record.shift},querySelectorAll:()=>[{getAttribute:()=> 'inputs.ald3',value:'19'}]};
 api.setRecord(el,record);const saved=api.readDom(el);assert.equal(saved.inputs.ald3,'19');assert.equal(saved.inputs.rows.AAR.ald2,2);assert.equal(api.normalizeRecord(saved).inputs.ald3,'19');
});


test('last calculation is validated, preserved per field and escaped in rendering', () => {
 const context=vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})},localStorage:{getItem:()=> '{}'}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,readDom,validQuantityHistory,calculateQuantity,setRecord:(el,r)=>renderedRecords.set(el,r)};'),context);
 const api=context.window.fixture,attrs={'data-shift-overview-field':'oam.rows.ag.op1020','data-shift-overview-calculate':''};
 const input={value:'200 + 32',readOnly:false,hasAttribute:k=>k in attrs,getAttribute:k=>attrs[k]??null,setAttribute:(k,v)=>attrs[k]=v,closest:()=>null};
 api.calculateQuantity(input);assert.equal(input.value,'232');assert.equal(attrs['data-quantity-expression'],'200 + 32');
 api.calculateQuantity(input);assert.equal(attrs['data-quantity-expression'],'200 + 32','change then blur retains expression');
 assert.equal(api.validQuantityHistory({expression:'1+alert(1)',result:'2'}),null);
 assert.equal(api.validQuantityHistory({expression:'1+2',result:'4'}),null);
 assert.equal(api.validQuantityHistory({expression:'5',factor:64,result:'320'}).result,'320');
 const record=api.normalizeRecord({date:'2026-10-11',shift:'D:ranni12',calculations:{'oam.rows.af.op1020':{expression:'3-1',result:'2'},bad:{expression:'<script>',result:'1'}}});
 const el={querySelector:s=>s.includes('date')?{value:record.date}:{value:record.shift},querySelectorAll:()=>[input]};api.setRecord(el,record);
 const saved=api.readDom(el);assert.equal(saved.calculations['oam.rows.ag.op1020'].expression,'200 + 32');assert.equal(saved.calculations['oam.rows.af.op1020'].result,'2');assert.equal(saved.calculations.bad,undefined);
 const body={dataset:{},innerHTML:'',querySelector:()=>null};context.window.RakAdminShiftOverview.render(body,saved);assert.ok(!body.innerHTML.includes('200 + 32 = 232'),'saved history must not reopen undo');assert.ok(body.innerHTML.includes('data-quantity-restore'));
 assert.ok(!body.innerHTML.includes('Hotovo'));assert.ok(body.innerHTML.includes('rakShiftOverviewSideLabel'));assert.ok(body.innerHTML.includes('>Poslední vsázka</span>'));assert.ok(body.innerHTML.includes('>Celkem vsázek</span>'));assert.ok(!body.innerHTML.includes('>Hodnota<'));assert.ok(!body.innerHTML.includes('Po nýtování'));
});


test('only the latest calculation exposes transient undo and it cannot return focus', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={calculateQuantity,clearQuantityUndo,quantityUndo};'),context);
 const api=context.window.fixture,displays=[0,1].map(()=>({hidden:true,text:{textContent:''},querySelector(){return this.text;}}));
 const root={querySelectorAll:()=>displays};
 const inputs=displays.map((display,i)=>{const attrs={};return {value:i?'320-256':'200+32',readOnly:false,hasAttribute:()=>true,setAttribute:(k,v)=>attrs[k]=v,closest:s=>s==='#rakShiftOverviewRoot'?root:{querySelector:()=>display}};});
 api.calculateQuantity(inputs[0]);assert.equal(displays[0].hidden,false);assert.equal(displays[1].hidden,true);assert.equal(displays[0].text.textContent,'200+32 = 232');
 api.calculateQuantity(inputs[1]);assert.equal(displays[0].hidden,true);assert.equal(displays[1].hidden,false);assert.equal(api.quantityUndo.get(root).input,inputs[1]);
 api.clearQuantityUndo(root);assert(displays.every(d=>d.hidden));assert.equal(api.quantityUndo.get(root),undefined);
 const restore=feature.slice(feature.indexOf("const restore = event.target"),feature.indexOf('const multiply = event.target'));
 assert.ok(!restore.includes('.focus('));assert.ok(!restore.includes('setSelectionRange'));
});

test('summary image derives active values and totals, excludes archived data and escapes notes', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg};'),context);
 const api=context.window.fixture;
 const record=api.normalizeRecord({date:'2026-10-11',shift:'B:ranni12',oam:{rows:{ag:{op1020:'320+256'},af:{stock:'192'},ah:{assembly:'39'},ad:{stock:'987654'}}},inputs:{ald3:'7',rows:{SR1:{ald1:2,ald2:999}}},nitrogen:'99,8',notes:'<script>alert(1)</script> & poznámka'});
 const svg=api.summarySvg(record);
 for(const value of ['576','807','99,8','&lt;script&gt;alert(1)&lt;/script&gt; &amp; poznámka'])assert.ok(svg.includes(value),value);
 for(const value of ['987654','999','<script>','Plán sklad','AD / AG'])assert.ok(!svg.includes(value),value);
 assert.match(svg,/width="900"/);assert.ok(feature.includes('data-shift-overview-summary-open'));
});


test('portrait summary lists every part vertically, omits zero counts and removes previous load', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg};'),context);
 const api=context.window.fixture;
 const record=api.normalizeRecord({inputs:{rows:{SR1:{ald1:2,ald2:999},TW1:{ald2:3}}}});
 const svg=api.summarySvg(record);
 const rows=[...svg.matchAll(/<g data-summary-part="([^"]+)">(.*?)<\/g>/g)];
 assert.equal(rows.length,18);
 const values=Object.fromEntries(rows.map(([,name,body])=>[name,[...body.matchAll(/<text [^>]+>(.*?)<\/text>/g)].map(m=>m[1])]));
 assert.deepEqual(values.SR1,['SR1','2']);assert.deepEqual(values.TW1,['TW1','3']);assert.deepEqual(values.AAR,['AAR','']);
 assert.ok(!svg.includes('ALD1:'));assert.ok(!svg.includes('ALD2:'));
 assert.ok(Number(svg.match(/height="(\d+)"/)[1])>900);
 assert.ok(!feature.includes('Načíst předchozí'));assert.ok(!feature.includes("action === 'previous'"));
});


test('production preview is one continuous table with both part numbers in each index row', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg};'),context);
 const svg=context.window.fixture.summarySvg(context.window.fixture.normalizeRecord({oam:{rows:{ag:{op1020:576,stock:192}}}}));
 assert.equal([...svg.matchAll(/data-summary-production="whole"/g)].length,1);
 const rows=[...svg.matchAll(/<g data-summary-index="([^"]+)">(.*?)<\/g>/g)];assert.equal(rows.length,3);
 for(const [,index,body]of rows){
  const rects=[...body.matchAll(/<rect x="([^"]+)" y="([^"]+)"/g)];
  assert.equal(rects.length,13);assert.equal(new Set(rects.map(m=>m[2])).size,1);
  assert.ok(body.includes('0AM 409 155'));assert.ok(body.includes('0AM 409 111'));
 }
 assert.ok(rows[0][2].includes('>576</text>'));assert.ok(rows[0][2].includes('>192</text>'));
});


test('corrected ALD assignment preserves legacy quantities/history exactly once and keeps ALD3', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,ALD1_INPUT_ROWS,ALD2_INPUT_ROWS};'),context);
 const api=context.window.fixture;
 assert.deepEqual(Array.from(api.ALD1_INPUT_ROWS),['Awa','Awi','TW1','TW2','TW3']);
 assert.deepEqual(Array.from(api.ALD2_INPUT_ROWS),['SR1','SR2','SR3','SR4','SR5','SR6','SR7','FR3','FR5','FR7','ZSB-RLR','SRRG','AAR']);
 const old={inputs:{ald3:'19',rows:{SR1:{ald1:'2',ald2:'999'},TW1:{ald1:'',ald2:'3'}}},calculations:{'inputs.rows.SR1.ald1':{expression:'1+1',result:'2'}},lastBatch:{ald1:'10',ald2:'20'}};
 const first=api.normalizeRecord(old);
 assert.equal(first.inputs.rows.SR1.ald2,'2');assert.equal(first.inputs.rows.SR1.ald1,'999');assert.equal(first.inputs.rows.TW1.ald1,'3');
 assert.equal(first.calculations['inputs.rows.SR1.ald2'].expression,'1+1');assert.equal(first.calculations['inputs.rows.SR1.ald1'],undefined);
 assert.equal(first.inputs.ald3,'19');assert.equal(first.lastBatch.ald1,'10');assert.equal(first.lastBatch.ald2,'20');
 assert.equal(first.inputs.partsAssignment,2);assert.equal(old.inputs.rows.SR1.ald1,'2');
 assert.equal(JSON.stringify(api.normalizeRecord(first)),JSON.stringify(first));
 const current=api.normalizeRecord({inputs:{partsAssignment:2,rows:{TW1:{ald1:'7'},SR1:{ald2:'8'}}}});
 assert.equal(current.inputs.rows.TW1.ald1,'7');assert.equal(current.inputs.rows.SR1.ald2,'8');
});

test('morning and night section order matches the supplied counting routes', () => {
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,shiftLayout};'),context);
 const api=context.window.fixture;
 for(const [shift,expected] of [
  ['B:ranni12',['stock','ald3','nitrogen','machining','ald2','ald1']],
  ['C:nocni8',['stock','assembly','ald3','before-kiln','after-kiln','ground','after-145','before-145','soft','machining','ald2','ald1']]
 ]){
  const html=api.shiftLayout(api.normalizeRecord({shift}));
  assert.deepEqual([...html.matchAll(/data-shift-overview-section="([^"]+)"/g)].map(m=>m[1]),expected);
  const paths=[...html.matchAll(/data-shift-overview-field="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(paths).size,paths.length);
  for(const key of ['producedTO','producedMOFree','producedMOPress','groundTBKR01Free','groundTBKR01Press','groundTBKR07Free','groundTBKR07Press'])
   for(const index of ['ag','af','ah'])assert.ok(paths.includes('oam.rows.'+index+'.'+key));
  assert.equal((html.match(/data-running-unit=/g)||[]).length,25);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,25);
  assert.equal(paths.includes('nitrogen'),shift.includes(':ranni'));
  assert.equal(paths.includes('lastBatch.ald3'),true);
  assert.ok(paths.includes('lastBatch.ald1'));assert.ok(paths.includes('lastBatch.ald2'));
 }
});

test('manual shift changes preserve hidden quantities, drafts, history and the original summary', () => {
 const context=vm.createContext({window:{rakAdminCanManageAdmins:()=>true},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,shiftLayout,updateShiftLayout,summarySvg,nestedGet,get:el=>renderedRecords.get(el),set:(el,record)=>renderedRecords.set(el,record),setRevision:(el,v)=>renderedRevisions.set(el,v),revision:el=>renderedRevisions.get(el)};'),context);
 const api=context.window.fixture;
 const initial=api.normalizeRecord({date:'2026-10-12',shift:'D:nocni12',nitrogen:'12.4',lastBatch:{ald3:'700'},
   oam:{rows:{ag:{op1020:'576',stock:'192',producedTO:'64',groundTBKR01:'32'}}},
   calculations:{'oam.rows.ag.op1020':{expression:'320+256',result:'576'}},
   inputs:{partsAssignment:2,rows:{TW1:{ald1:'2'},SR1:{ald2:'3'}}}});
 const layout={innerHTML:api.shiftLayout(initial)},header={value:'D:nocni12'},date={value:initial.date},fields=new Map();
 const el={dataset:{},querySelector:s=>s.includes('data-shift-overview-layout')?layout:s.includes('data-shift-overview-date')?date:s.includes('data-shift-overview-shift')?header:null,
  querySelectorAll:s=>s==='[data-shift-overview-field]'?[...fields].map(([path,value])=>({value,getAttribute:key=>key==='data-shift-overview-field'?path:null})):[]};
 function hydrate(){fields.clear();const record=api.get(el);for(const [,path]of layout.innerHTML.matchAll(/data-shift-overview-field="([^"]+)"/g))fields.set(path,String(api.nestedGet(record,path)??''));}
 api.set(el,initial);hydrate();
 fields.set('oam.rows.ag.stock','256');fields.set('oam.rows.ag.producedTO','96');
 header.value='D:ranni12';api.updateShiftLayout(el);hydrate();
 assert.ok(layout.innerHTML.includes('data-shift-overview-section="nitrogen"'));
 assert.equal(api.get(el).oam.rows.ag.op1020,'576');assert.equal(api.get(el).calculations['oam.rows.ag.op1020'].expression,'320+256');
 fields.set('nitrogen','15.5');header.value='D:nocni12';api.updateShiftLayout(el);
 const saved=api.get(el);assert.equal(saved.nitrogen,'15.5');assert.equal(saved.lastBatch.ald3,'700');
 assert.equal(saved.oam.rows.ag.stock,'256');assert.equal(saved.oam.rows.ag.producedTO,'96');
 assert.equal(saved.oam.rows.ag.groundTBKR01,'32');assert.equal(saved.inputs.rows.SR1.ald2,'3');
 const clean=JSON.parse(JSON.stringify(saved));delete clean.oam.rows.ag.producedTO;delete clean.oam.rows.ag.groundTBKR01;
 const inventory=svg=>svg.match(/<g data-summary-production="whole"[\s\S]*?<\/g><g transform=/)[0];
 assert.equal(inventory(api.summarySvg(saved)),inventory(api.summarySvg(clean)),'conclusion fields must not alter inventory totals');
 api.setRevision(el,9);el.dataset.cloudMutation='old-date-save';date.value='2026-10-13';api.updateShiftLayout(el);
 assert.equal(api.get(el).date,'2026-10-13');assert.equal(api.revision(el),null);assert.equal(el.dataset.cloudMutation,'');
 assert.equal(api.get(el).oam.rows.ag.op1020,'576');assert.equal(api.get(el).lastBatch.ald3,'700');
});

 test('numbered running units default active and preserve exact disabled identities on reload',()=>{
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,runningUnits,inactiveUnits,shiftLayout};'),context);
 const api=context.window.fixture;
 const record=api.normalizeRecord({shift:'D:nocni12',ald:[{running:'old',inactiveUnits:[2,10]},{inactiveUnits:[1,5]},{inactiveUnits:[3]}]});
 assert.deepEqual(Array.from(api.inactiveUnits(record,1)),[2,10]);
 assert.equal(record.ald[0].running,'old');
 assert.equal((api.runningUnits(record,3).match(/aria-pressed="false"/g)||[]).length,1);
 assert.equal((api.runningUnits(api.normalizeRecord({}),1).match(/aria-pressed="true"/g)||[]).length,10);
 const html=api.shiftLayout(record);
 assert.ok(html.includes('Po broušení (op 212)'));assert.ok(!html.includes('<span>212</span>'));
 assert.ok(!html.includes('<span>145</span>'));assert.ok(!html.includes('<span>Sklad</span>'));
 for(const machine of ['groundTBKR01','groundTBKR07'])for(const type of ['Free','Press'])
 assert.ok(html.includes('data-shift-overview-field="oam.rows.ag.'+machine+type+'"'));
 });


test('grinding summary reports exact machine/index/type quantities and keeps inventory totals separate',()=>{
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg};'),context);
 const api=context.window.fixture;
 const record=api.normalizeRecord({shift:'D:nocni12',oam:{rows:{ag:{stock:'100',groundTBKR01Free:'32',groundTBKR01Press:'64',groundTBKR07Press:'20',producedMO:'888',groundTBKR01:'999'},af:{groundTBKR01Free:'8+8',groundTBKR07Free:'10'}}}});
 const svg=api.summarySvg(record),clean=api.normalizeRecord({shift:'D:nocni12',oam:{rows:{ag:{stock:'100'}}}});
 const production=value=>value.match(/<g data-summary-production="whole"[\s\S]*?<\/g><g transform=/)[0];
 assert.equal(production(svg),production(api.summarySvg(clean)));
 for(const machine of ['TBKR01','TBKR07'])assert.ok(svg.includes('data-summary-grinder="'+machine+'"'));
 const first=svg.split('data-summary-grinder="TBKR01"')[1].split('data-summary-grinder="TBKR07"')[0];
 for(const value of ['32','64','16','48'])assert.ok(first.includes('>'+value+'</text>'),value);
 assert.ok(svg.includes('Nabroušeno · brusy'));assert.ok(!svg.includes('>888</text>'));assert.ok(!svg.includes('>999</text>'));
});


test('compact grinding and conclusion reports omit idle machines and zero or empty indices without mutating data',()=>{
 const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
 vm.runInContext(feature.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg,shiftLayout};'),context);
 const api=context.window.fixture;
 const record=api.normalizeRecord({shift:'D:nocni12',oam:{rows:{ag:{groundTBKR01Free:'32',producedMOFree:'8+8',producedTO:'64'},af:{groundTBKR01Free:'0',groundTBKR07Press:'10-10',producedMOPress:'0'},ah:{}}}});
 const before=JSON.stringify(record),svg=api.summarySvg(record);
 assert.ok(svg.includes('data-summary-grinder="TBKR01"'));assert.ok(!svg.includes('data-summary-grinder="TBKR07"'));
 assert.deepEqual([...svg.matchAll(/data-summary-grinding-index="(.*?)"/g)].map(m=>m[1]),['ag']);
 assert.deepEqual([...svg.matchAll(/data-summary-conclusion-index="(.*?)"/g)].map(m=>m[1]),['ag']);
 assert.ok(svg.indexOf('data-summary-machining="conclusion"')>svg.indexOf('data-summary-grinding="by-machine"'));
 const conclusion=svg.split('data-summary-machining="conclusion"')[1];assert.ok(conclusion.includes('>16</text>'));assert.ok(conclusion.includes('>64</text>'));
 assert.equal(JSON.stringify(record),before);assert.ok(api.shiftLayout(record).includes('>Závěr</h4>'));
 const empty=api.summarySvg(api.normalizeRecord({}));assert.ok(!empty.includes('data-summary-grinding='));assert.ok(!empty.includes('data-summary-machining='));
});
