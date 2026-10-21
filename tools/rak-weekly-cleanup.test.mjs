import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');

function setup(rows = []) {
  const context = {
    app: { machineSettingsRows: rows },
    window: { rakCleanupAdminYear: 2026 },
    Date, Map, Set, Array, String, Number, Object, Math, RegExp,
    console,
    parseMonthKey: key => ({ year: Number(key.slice(0,4)), month: Number(key.slice(5,7)) }),
    parseDateToken: value => {
      const m=String(value).match(/^(\d{1,2})\.\s*(\d{1,2})\.?.*?\b(R8|N8|R|N)\b/i);
      return m ? { day: Number(m[1]), month:Number(m[2]), shift:m[3].toUpperCase() } : null;
    }
  };
  vm.createContext(context);
  vm.runInContext(read('rak-cleanup-schedule.js'), context, { filename:'rak-cleanup-schedule.js' });
  return context;
}

test('ISO weeks display only KT number and use Sunday morning by default', () => {
  const c=setup();
  const wk=c.rakCleanupWeekForISO('2026-10-24');
  assert.equal(wk.week,43);
  assert.equal(wk.key,'2026-W43');
  assert.equal(wk.sunday,'2026-10-25');
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-25','R'),true);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-25','N'),false);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-24','R'),false);
  assert.equal(c.rakCleanupWeeksForYear(2026).length,53);
  assert.equal(c.rakCleanupWeekForISO('2027-01-03').key,'2026-W53');
  assert.match(c.rakCleanupAdminHtml(),/<strong>43 KT<\/strong>/);
  assert(!c.rakCleanupAdminHtml().includes('19.–25.'));
});

test('43 KT Saturday override credits Saturday, never Sunday, on same machines', () => {
  const c=setup([{machine_key:'ROTATION_CLEANUP_SETTINGS',category:'rotation_cleanup_settings',
    settings_json:{entries:[{week:'2026-W43',date:'2026-10-24'}]}}]);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-24','R'),true);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-25','R'),false);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-24','N8'),false);
  assert.equal(c.rakCleanupIsMorningRow('2026-10','24. 10. R'),true);
  assert.equal(c.rakCleanupIsMorningRow('2026-10','25. 10. R'),false);
  assert.equal(c.rakCleanupIsMorningMeta({year:2026,month:10,day:24,shift:'R'}),true);
  assert.equal(c.rakCleanupIsMorningMeta({year:2026,month:10,day:25,shift:'R'}),false);
  assert.match(c.rakCleanupAdminHtml(),/value="2026-10-24" selected/);
});

test('disabled week counts no cleaning; invalid cross-week dates are ignored', () => {
  const c=setup([{machine_key:'ROTATION_CLEANUP_SETTINGS',settings_json:JSON.stringify({entries:[
    {week:'2026-W43',disabled:true},{week:'2026-W44',date:'2026-10-24'}]})}]);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-25','R'),false);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-10-24','R'),false);
  assert.equal(c.rakCleanupIsMorningOnISO('2026-11-01','R'),true);
  assert.equal(c.rakCleanupSettings().size,1);
});

test('saving exceptions preserves other years and never duplicates the settings category',()=>{
  const c=setup([{machine_key:'ROTATION_CLEANUP_SETTINGS',settings_json:{entries:[
    {week:'2025-W43',date:'2025-10-25'}]}},
    {machine_key:'TNKS01',category:'frezka',settings_json:{}}]);
  const stub={ querySelectorAll:()=>[
    {getAttribute:()=> '2026-W43',value:'2026-10-24'},
    {getAttribute:()=> '2026-W44',value:'off'}
  ]};
  const items=c.rakCleanupAdminReadFromDom(stub);
  assert.equal(items.length,3);
  assert.equal(items[0].week,'2025-W43');
  assert.equal(items[1].date,'2026-10-24');
  assert.equal(items[2].disabled,true);
  const rows=c.rakCleanupMergeRows(items);
  assert.equal(rows.length,2);
  assert.equal(rows[0].machine_key,'TNKS01');
  assert.equal(rows[1].settings_json.entries.length,3);
});

test('navigation refuses to discard unsaved changes',()=>{
 const c=setup();
 const alert={textContent:''};
 const root={querySelectorAll:()=>[{getAttribute:()=> '2026-W43',value:'2026-10-24'}],
   querySelector:()=>alert};
 assert.equal(c.rakCleanupAdminChangeYear(1,root),false);
 assert.equal(c.window.rakCleanupAdminYear,2026);
 assert.match(alert.textContent,/Nejprve ulož/);
});

test('Admin, statistics, fairness generator, secure storage, offline and release wiring',()=>{
  const admin=read('app-menu.js');
  const renderer=read('app-menu-admin-renderer.js');
  const shell=read('app-menu-admin-shell.js');
  const stats=read('stats.js');
  const generator=read('admin-rotation-generator.js');
  const machine=read('admin-machine-settings.js');
  const app=read('app.js');
  const sw=read('sw.js');
  assert(shell.includes("open-cleanup', label: 'Úklid'"));
  assert(admin.includes("openAppMenu('admin-cleanup')"));
  assert(admin.includes('save-cleanup-settings'));
  assert(admin.includes('await window.RotationSupabaseBridge.saveMachineSettings(rows)'));
  assert(admin.includes('if (!result || result.ok !== true)'));
  assert(renderer.includes("mode === 'cleanup'"));
  assert(renderer.includes('rakCleanupAdminHtml()'));
  assert(stats.includes('rakCleanupIsMorningRow(monthKey, row.date, cleanupOverrides)'));
  assert(stats.includes('if (isCleanupMorning)'));
  assert(generator.includes('rakCleanupIsMorningMeta(meta)'));
  assert(machine.includes('filter(rakCleanupIsSettingsRow)'));
  assert(app.includes('"rak-cleanup-schedule.js"'));
  assert(read('styles-admin-polish.css').includes('.rakCleanupWeek'));
  assert(sw.includes('rak-cleanup-schedule.js?v=2.0.31'));
  assert(sw.includes('styles-admin-polish.css'));
  assert(read('rak-release-metadata.js').includes("displayVersion: '2.0.31'"));
});


test('opening Úklid centers current KT inside its own scroller, not page; rerender preserves manual scroll', () => {
  const c=setup();
  const row={getBoundingClientRect:()=>({top:1400,height:48})};
  const list={
    scrollTop:0,
    scrollHeight:3200,
    clientHeight:600,
    getAttribute:name => name==='data-cleanup-year'?'2026':'',
    getBoundingClientRect:()=>({top:100,height:600}),
    querySelector:selector => selector==='.rakCleanupWeek.isCurrent'?row:null
  };
  const root={querySelector:selector => selector==='.rakCleanupWeeks[data-cleanup-year]'?list:null};
  c.rakCleanupAdminPositionScroll(root,null);
  assert.equal(list.scrollTop,1024,'current week must be centered in the internal scroll area');
  list.scrollTop=780;
  const previous=c.rakCleanupAdminRememberScroll(root);
  assert.equal(previous.year,2026);
  list.scrollTop=0;
  c.rakCleanupAdminPositionScroll(root,previous);
  assert.equal(list.scrollTop,780,'a save/load rerender must not jump back to current week');
  const differentYear={...list,scrollTop:250,getAttribute:()=> '2025',querySelector:()=>null};
  const otherRoot={querySelector:()=>differentYear};
  c.rakCleanupAdminPositionScroll(otherRoot,previous);
  assert.equal(differentYear.scrollTop,0,'other years should open from KT 1');
  assert(read('app-menu-admin-renderer.js').includes('rakCleanupAdminPositionScroll(body, previous)'));
  assert(read('app-menu.js').includes('rakCleanupAdminResetToCurrentYear()'));
});
