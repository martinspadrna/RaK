#!/usr/bin/env node
// RaK 1.7.22 – compact admin home only; no data, permission or storage migrations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.22', BUILD='v1.7.22-admincompact1';
const MARK='// RAK_ADMIN_COMPACT_17022';
const read=p=>fs.readFileSync(p,'utf8');
const update=(p,fn)=>{const old=read(p),next=fn(old);if(next!==old)fs.writeFileSync(p,next,'utf8');return next;};
const once=(source,from,to,tag)=>{assert(source.includes(from),'[17022] missing '+tag);return source.replace(from,to);};
const renderer=update('app-menu-admin-renderer.js',s=>{
  if(s.includes(MARK))return s;
  const begin=s.indexOf('  const homeHtml = [');
  const end=s.indexOf('  const calendarNotePrefs =',begin);
  assert(begin>=0&&end>begin,'admin home boundaries');
  const old=s.slice(begin,end);
  for(const label of ['1. Provoz','2. Rozpisy','3. Pro zaměstnance','4. Kontrola a servis'])
    assert(old.includes(label),'missing original admin category '+label);
  const home=`  ${MARK}
  const adminCompactOpenGroup = typeof app !== 'undefined' && app ? String(app.adminCompactOpenGroup || '') : '';
  const homeHtml = [
    '<div class="appMenuCard appMenuAdminCard adminCompactHome">',
    '  <div class="appMenuCardTitle">Administrace</div>',
    '  <div class="appMenuText">',
    '    <div>Nejčastější úkony najdeš hned nahoře. Ostatní možnosti rozbal podle tématu.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Změny se ukládají až tlačítkem Uložit v konkrétní sekci.</div>',
    '  </div>',
    '  <div class="appMenuSubTitle">Rychlý přístup</div>',
    '  <div class="adminCompactQuickGrid">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="open-rotation">Rozpisy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-workers">Pracovníci</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-machines">Nastavení strojů</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-reports">Reporty chyb</button>',
    '  </div>',
    '  <div class="appMenuSubTitle">Všechny možnosti</div>',
    '  <div class="adminMenuSections">',
    buildAdminMenuSectionHtml('Rozpisy a směny', 'Rozpis, lidé, generátor, historie a soubory.', [
      { action: 'open-rotation', label: 'Rozpisy' },
      { action: 'open-workers', label: 'Pracovníci' },
      { action: 'open-generator-settings', label: 'Pravidla generátoru' },
      { action: 'open-machine-tasks', label: 'Úkoly podle stroje' },
      { action: 'open-change-log', label: 'Historie změn' },
      { action: 'open-backups', label: 'Zálohy rozpisů' },
      { action: 'open-export', label: 'Export / import' }
    ], { open: false }),
    buildAdminMenuSectionHtml('Provoz a absence', 'Stroje, časy, přesčasy a volné dny.', [
      { action: 'open-machines', label: 'Nastavení strojů' },
      { action: 'open-correction-settings', label: 'Nastavení korekcí' },
      { action: 'open-food', label: 'Kantýna / jídelna' },
      { action: 'open-overtime', label: 'Přesčasy' },
      { action: 'open-vacation', label: 'Dovolená / odstávky' },
      { action: 'open-special-days', label: 'Mimořádné volné dny' }
    ], { open: false }),
    buildAdminMenuSectionHtml('Informace pro zaměstnance', 'Co se zobrazuje v běžné aplikaci.', [
      { action: 'open-announcement', label: 'Oznámení Dashboard' },
      { action: 'open-external-links', label: 'Odkazy' }
    ].concat((typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins()) ? [{ action: 'open-app-contact', label: 'Kontakt aplikace' }] : []).concat([
      { action: 'open-payroll-settings', label: 'Výplata' }
    ]), { open: false }),
    buildAdminMenuSectionHtml('Správa a servis', adminServiceDetail, [
      { action: 'open-reports', label: 'Reporty chyb' }
    ].concat(adminServiceActions), { open: false }),
    '  </div>',
    '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
    '</div>'
  ].join('');

`;
  s=s.slice(0,begin)+home+s.slice(end);
  const anchor="  if (mode === 'rotation') {\n    runAdminRotationEditorMaintenance(body, 'render-admin-rotation');";
  const bind=`  if (mode === 'home') {
    // Keep the last category open when returning from a subpage, but show one at a time.
    const groups = Array.from(body.querySelectorAll('.adminMenuSection'));
    groups.forEach((group, index) => {
      group.open = adminCompactOpenGroup === String(index);
      const summary = group.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', () => {
        const next = group.open ? '' : String(index);
        if (typeof app !== 'undefined' && app) app.adminCompactOpenGroup = next;
        if (next) groups.forEach(other => { if (other !== group) other.open = false; });
      });
    });
  }

`;
  return once(s,anchor,bind+anchor,'admin home toggle lifecycle');
});
const css=update('styles-admin-polish.css',s=>s.includes(MARK)?s:s+`
/* ${MARK}: four quick actions and one compact accordion; inherited theme colors. */
#appMenuBody[data-admin-view="home"] .adminCompactQuickGrid {
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:8px !important;
  margin:8px 0 16px !important;
}
#appMenuBody[data-admin-view="home"] .adminCompactQuickGrid > .appMenuAction {
  box-sizing:border-box !important;
  min-width:0 !important;
  min-height:46px !important;
  margin:0 !important;
  padding:10px 7px !important;
  white-space:normal !important;
  text-align:center !important;
}
#appMenuBody[data-admin-view="home"] .adminCompactHome .adminMenuSections {
  margin-top:8px !important;
}
`);
update('tools/shift-report-mo-hotfix-170-smoke.mjs',s=>{
  if(s.includes('// RAK_17022_TWO_PASS_GUARD'))return s;
  s=once(s,`const already17021=indexSource.includes("var build='v1.7.21-gamescleanup1';")`,`// RAK_17022_TWO_PASS_GUARD
const already17022=indexSource.includes("var build='${BUILD}';")
  && coreSource.includes('// RAK_EXTERNAL_SHIFT_TEAMS_17020')
  && imageSource.includes('// RAK_EXTERNAL_SHIFT_TEAMS_17020');
const already17021=(already17022||indexSource.includes("var build='v1.7.21-gamescleanup1';"))`,'second-pass recognition');
  s=once(s,`const old=already17021?"var build='v1.7.21-gamescleanup1';":already17020?`,`const old=already17022?"var build='${BUILD}';":already17021?"var build='v1.7.21-gamescleanup1';":already17020?`,'second-pass replay');
  return s;
});
update('supabase-config.js',s=>{
  assert(s.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!s.includes('bkqamcbkiwumsvelahxr'),'test Supabase only');
  return once(once(once(s,'window.RAK_RELEASE_VERSION = "1.7.21";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release'),
    'window.RAK_TEST_DISPLAY_VERSION = "1.7.21";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display'),
    'window.RAK_PWA_BUILD = "v1.7.21-gamescleanup1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'build');
});
update('app.js',s=>once(once(s,'const RAK_DEV_UPDATE_BUILD = "v1.7.21-gamescleanup1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app update marker'),
 'window.RAK_RELEASE_VERSION = "1.7.21";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release'));
update('sw.js',s=>{
  assert(s.includes("const SW_APP_VERSION = '1.7.0';"),'technical service worker version');
  return once(once(once(s,"const CACHE_VERSION = 'v1.7.21';",`const CACHE_VERSION = 'v${VERSION}';`,'cache'),
    "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.21';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW display'),
    "const DEVELOPMENT_BUILD_ID = 'v1.7.21-gamescleanup1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');
});
update('index.html',s=>once(s,"var build='v1.7.21-gamescleanup1';",`var build='${BUILD}';`,'index build'));
// UI-only regression: 21 existing destinations, owner-only links, initial collapsed state and theme CSS.
const start=renderer.indexOf('  const homeHtml = [');
const finish=renderer.indexOf('  const calendarNotePrefs =',start);
const home=renderer.slice(start,finish);
const actions=['open-machines','open-correction-settings','open-food','open-overtime','open-vacation','open-special-days','open-rotation','open-workers','open-generator-settings','open-machine-tasks','open-change-log','open-backups','open-export','open-announcement','open-external-links','open-app-contact','open-payroll-settings','open-reports','open-service','open-admin-accounts','open-settings-backups'];
for(const action of actions)assert(home.includes(`action: '${action}'`)||home.includes(`data-admin-action="${action}"`)||read('app-menu-admin-renderer.js').includes(`{ action: '${action}'`),'admin destination missing: '+action);
assert.equal((home.match(/buildAdminMenuSectionHtml\(/g)||[]).length,4,'four thematic groups');
assert.equal((home.match(/\{ open: false \}\)/g)||[]).length,4,'all categories initially collapsed');
assert.equal((home.match(/adminCompactQuickGrid/g)||[]).length,1,'one shortcuts grid');
for(const action of ['open-rotation','open-workers','open-machines','open-reports'])assert(home.includes(`data-admin-action="${action}"`),'quick action '+action);
assert(renderer.includes('app.adminCompactOpenGroup = next')&&renderer.includes('other.open = false'),'accordion state retained and exclusive');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'mobile two-column quick links');
assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('const already17022='),'two-pass guard');
assert(read('index.html').includes(`var build='${BUILD}';`),'index version');
assert(read('supabase-config.js').includes(`window.RAK_RELEASE_VERSION = "${VERSION}";`),'runtime version');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version unchanged');
for(const file of ['app-menu-admin-renderer.js','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log('[admin-compact-17022] OK admin shortcuts, 4 collapsed groups, 21 existing destinations, role gates, one-group memory, mobile CSS, version and test DB');
