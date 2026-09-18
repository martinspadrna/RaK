#!/usr/bin/env node
// RaK 1.7.19: authenticated deputy may use Report směny and no admin functions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.19', BUILD='v1.7.19-deputy1', MARKER='// RAK_REPORT_ONLY_DEPUTY_17019';
const read=name=>fs.readFileSync(name,'utf8');
const write=(name,text)=>fs.writeFileSync(name,text,'utf8');
function swap(src,oldText,newText,label){assert(src.includes(oldText),label+' anchor missing');return src.replace(oldText,newText);}
function line(src,regex,text,label){assert.match(src,regex,label+' anchor missing');return src.replace(regex,text);}
let auth=read('app-admin-unlock.js');
if(!auth.includes(MARKER)){
  auth=swap(auth,"if (!accountId || (role !== 'owner' && role !== 'admin')) return false;","if (!accountId || !['owner','admin','deputy'].includes(role)) return false;",'secure context role');
  auth=swap(auth,"    app.adminIsOwner = role === 'owner';\n    app.adminAuthVersion = 2;","    app.adminIsOwner = role === 'owner';\n    app.adminRole = role;\n    app.adminAuthVersion = 2;",'verified role');
  auth=swap(auth,"    app.adminIsOwner = false;\n    app.adminAuthVersion = 0;","    app.adminIsOwner = false;\n    app.adminRole = '';\n    app.adminAuthVersion = 0;",'clear role');
  auth=swap(auth,"      .filter((entry) => entry && String(entry.role || '') === 'admin')","      .filter((entry) => entry && ['admin', 'deputy'].includes(String(entry.role || '')))",'directory roles');
  auth=swap(auth,"        passwordSalt: 'supabase-auth',\n        enabled: entry.enabled !== false","        passwordSalt: 'supabase-auth',\n        role: String(entry.role || 'admin'),\n        enabled: entry.enabled !== false",'directory role field');
  auth=swap(auth,"    && String(entry.role || '') === 'admin'\n    && String(entry.account_id || entry.accountId || '').trim() === id","    && ['admin', 'deputy'].includes(String(entry.role || ''))\n    && String(entry.account_id || entry.accountId || '').trim() === id",'password gate');
  auth=swap(auth,"    password: String(row.querySelector('[data-admin-account-password]')?.value || ''),\n    enabled: !!(row.querySelector('[data-admin-account-enabled]')","    password: String(row.querySelector('[data-admin-account-password]')?.value || ''),\n    role: String(row.querySelector('[data-admin-account-role]')?.value || 'admin'),\n    enabled: !!(row.querySelector('[data-admin-account-enabled]')",'owner role select');
  auth=swap(auth,"    .filter((entry) => entry && entry.role === 'admin');","    .filter((entry) => entry && ['admin', 'deputy'].includes(entry.role));",'save existing deputy');
  auth=swap(auth,"  const existing = (Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [])","  if (desired.some((entry) => !['admin', 'deputy'].includes(entry.role))) return { ok:false, reason:'invalid-role' };\n  const existing = (Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [])",'validate roles');
  auth=swap(auth,"      password: '',\n      enabled: false\n    })));","      password: '',\n      role: String(entry.role || 'admin'),\n      enabled: false\n    })));",'role on disable');
  const oldGate="function rakAdminCanOpenAdmin() {\n  const activeId = rakAdminGetActiveAccountId();\n  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId);\n}";
  const newGate=MARKER+"\nfunction rakAdminCanOpenShiftReport() {\n  const activeId = rakAdminGetActiveAccountId();\n  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2\n    && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId\n    && ['owner', 'admin', 'deputy'].includes(String(app.adminRole || '')));\n}\nfunction rakAdminIsDeputy() {\n  return rakAdminCanOpenShiftReport() && app.adminRole === 'deputy';\n}\nfunction rakAdminCanOpenAdmin() {\n  return rakAdminCanOpenShiftReport() && (app.adminRole === 'owner' || app.adminRole === 'admin');\n}";
  auth=swap(auth,oldGate,newGate,'full admin versus report gate');
  auth=swap(auth,'  window.rakAdminCanOpenAdmin = rakAdminCanOpenAdmin;','  window.rakAdminCanOpenAdmin = rakAdminCanOpenAdmin;\n  window.rakAdminCanOpenShiftReport = rakAdminCanOpenShiftReport;\n  window.rakAdminIsDeputy = rakAdminIsDeputy;','export gates');
  const checkbox="    '  <td><label class=\"adminRotationOvertimeSwitch\"><input type=\"checkbox\" data-admin-account-field=\"enabled\" data-admin-account-enabled '";
  const roleCell="    '  <td><select class=\"appMenuInlineInput\" data-admin-account-field=\"role\" data-admin-account-role aria-label=\"Role účtu\"><option value=\"admin\"' + (entry.role === 'deputy' ? '' : ' selected') + '>Správce</option><option value=\"deputy\"' + (entry.role === 'deputy' ? ' selected' : '') + '>Zástupce – pouze Report směny</option></select></td>',\n";
  auth=swap(auth,checkbox,roleCell+checkbox,'owner role picker');
  auth=swap(auth,'<th>Heslo</th><th>Aktivni</th><th></th>','<th>Heslo</th><th>Role</th><th>Aktivni</th><th></th>','role header');
  auth=swap(auth,'Tady pridavas dalsi admin ucty, ktere po prihlaseni uvidi administraci. Heslo nech prazdne, pokud ho nechces menit. Pro odebrani spravce klikni na × u radku (nebo smaz ucet) a uloz. Hesla spravuje Supabase Auth a aplikace je neuklada ani je neumoznuje stahnout.','U každého účtu vyber roli: Správce spravuje pracovní části aplikace, Zástupce vidí pouze Report směny. Heslo nech prázdné, pokud ho nechceš měnit. Účet odeber nebo vypni a potvrď uložením. Hesla spravuje Supabase Auth.','role instructions');
  auth=swap(auth,'<span>Nizsi admini</span>','<span>Správci a zástupci</span>','overview title');
  auth=swap(auth,'Muzou spravovat pracovni casti administrace a zmenit vlastni heslo, ale nemuzou menit dalsi adminy ani heslo hlavniho admina.','Správce spravuje pracovní administraci. Zástupce může pouze připravit a odeslat Report směny.','overview roles');
  auth=swap(auth,"  if (passwordInput) { passwordInput.value = ''; passwordInput.placeholder = 'heslo'; }\n  if (enabledInput)","  if (passwordInput) { passwordInput.value = ''; passwordInput.placeholder = 'heslo'; }\n  const roleInput = row.querySelector('[data-admin-account-role]');\n  if (roleInput) roleInput.value = 'admin';\n  if (enabledInput)",'clear role');
}
assert(auth.includes(MARKER)&&auth.includes('data-admin-account-role'),'auth role patch missing');write('app-admin-unlock.js',auth);
let menu=read('app-menu.js');
if(!menu.includes(MARKER)){
  menu=swap(menu,"  const canOpen = () => !!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin());","  const canOpen = () => !!(typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport());",'restore report session');
  menu=swap(menu,"  if (typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin()) return true;","  if (typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport()) return true;",'report menu entry');
  menu=swap(menu,"      if (menuAction === 'admin') {\n        const adminReady =","      if (menuAction === 'admin') {\n        if (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy()) { openAppMenu('menu'); return; }\n        const adminReady =",'admin route');
  menu=swap(menu,"            '<div class=\"appMenuAdminQuickLinksTitle\">Správce</div>' +","            '<div class=\"appMenuAdminQuickLinksTitle\">' + (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? 'Zástupce' : 'Správce') + '</div>' +",'deputy heading');
  const oldBtns="              '<button type=\"button\" class=\"appMenuAction isActive\" data-menu-action=\"admin\">Administrace</button>' +\n              '<button type=\"button\" class=\"appMenuAction isActive\" data-admin-action=\"vacation-report\">Report dovolené</button>' +";
  const newBtns="              "+MARKER+"\n              (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? '' : '<button type=\"button\" class=\"appMenuAction isActive\" data-menu-action=\"admin\">Administrace</button><button type=\"button\" class=\"appMenuAction isActive\" data-admin-action=\"vacation-report\">Report dovolené</button>') +";
  menu=swap(menu,oldBtns,newBtns,'deputy only shift-report link');
}
assert(menu.includes(MARKER),'deputy menu marker');write('app-menu.js',menu);
let renderer=read('app-menu-admin-renderer.js');
if(!renderer.includes(MARKER))renderer=swap(renderer,'function renderAdminMenuBody(body, section) {\n  const mode =',"function renderAdminMenuBody(body, section) {\n  "+MARKER+"\n  if (!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {\n    if (body) body.innerHTML = '<div class=\"appMenuCard\">Administrace není přístupná.<button type=\"button\" class=\"appMenuAction\" data-menu-back=\"1\">Zpět</button></div>';\n    return;\n  }\n  const mode =",'deny direct admin renderer');
write('app-menu-admin-renderer.js',renderer);
let entry=read('app-menu-shift-report.js');
const oldEntry="typeof window.rakAdminCanOpenAdmin === 'function' && window.rakAdminCanOpenAdmin()";
const newEntry="typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport()";
if(entry.includes(oldEntry))entry=entry.replaceAll(oldEntry,newEntry);
assert(entry.includes(newEntry)&&!entry.includes(oldEntry),'shift entry gate');write('app-menu-shift-report.js',entry);
let shift=read('rak-shift-report.js');
const oldReport="function canUseShiftReport(){return typeof rakAdminCanOpenAdmin==='function'&&rakAdminCanOpenAdmin();}";
const newReport="function canUseShiftReport(){return typeof rakAdminCanOpenShiftReport==='function'&&rakAdminCanOpenShiftReport();}";
if(shift.includes(oldReport))shift=swap(shift,oldReport,newReport,'report role');
if(shift.includes('data-shift-action="close">Zpět do Adminu</button>'))shift=swap(shift,'data-shift-action="close">Zpět do Adminu</button>','data-shift-action="close">Zpět</button>','back label');
const oldClick="if(!root)return;const add=e.target.closest('[data-shift-add]');";
if(shift.includes(oldClick))shift=swap(shift,oldClick,"if(!root)return;if(!canUseShiftReport()){e.preventDefault();return;}const add=e.target.closest('[data-shift-add]');",'report action authorization');
const oldBack="if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');";
if(!shift.includes('rakAdminIsDeputy')){
  assert(shift.includes(oldBack),'report back anchor');
  shift=shift.replaceAll(oldBack,"if(typeof rakAdminIsDeputy==='function'&&rakAdminIsDeputy()){if(typeof openAppMenu==='function')openAppMenu('menu');}else if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');");
}
assert(shift.includes(newReport)&&(shift.match(/rakAdminIsDeputy/g)||[]).length>=2,'report permission and back routes');write('rak-shift-report.js',shift);
let config=read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!config.includes('bkqamcbkiwumsvelahxr'),'test DB');
config=line(config,/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`,'version');
config=line(config,/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'test version');
config=line(config,/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`,'build');write('supabase-config.js',config);
let app=read('app.js');
app=line(app,/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
app=line(app,/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`,'app display');write('app.js',app);
let sw=read('sw.js');assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW version');
sw=line(sw,/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`,'cache');
sw=line(sw,/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW version');
sw=line(sw,/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');write('sw.js',sw);
let index=read('index.html');
if(!index.includes(`var build='${BUILD}';`))index=swap(index,"var build='v1.7.18-absencegroups1';",`var build='${BUILD}';`,'index marker');
write('index.html',index);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','package version');
for(const file of ['app-admin-unlock.js','app-menu.js','app-menu-admin-renderer.js','app-menu-shift-report.js','rak-shift-report.js','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/deputy-report-role-17019-smoke.mjs'],{stdio:'inherit'});
console.log('[development-version-17019] OK deputy role report-only, owner CRUD, direct route denied, auth and version');