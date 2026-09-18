#!/usr/bin/env node
// RaK 1.7.19: a deputy can prepare/share the shift report and nothing else in admin.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.19';
const BUILD = 'v1.7.19-deputy1';
const MARKER = '// RAK_REPORT_ONLY_DEPUTY_17019';
const read = path => fs.readFileSync(path, 'utf8');
const write = (path, text) => fs.writeFileSync(path, text, 'utf8');
function replace(source, before, after, label) {
  if (before === after) return source;
  assert(source.includes(before), label + ': source anchor missing');
  return source.replace(before, after);
}
function setLine(source, pattern, replacement, label) {
  assert.match(source, pattern, label + ': missing line');
  return source.replace(pattern, replacement);
}

let auth = read('app-admin-unlock.js');
if (!auth.includes(MARKER)) {
  auth = replace(auth,
    "if (!accountId || (role !== 'owner' && role !== 'admin')) return false;",
    "if (!accountId || !['owner', 'admin', 'deputy'].includes(role)) return false;", 'deputy secure context');
  auth = replace(auth,
    "    app.adminIsOwner = role === 'owner';\n    app.adminAuthVersion = 2;",
    "    app.adminIsOwner = role === 'owner';\n    app.adminRole = role;\n    app.adminAuthVersion = 2;", 'store verified role');
  auth = replace(auth,
    "    app.adminIsOwner = false;\n    app.adminAuthVersion = 0;",
    "    app.adminIsOwner = false;\n    app.adminRole = '';\n    app.adminAuthVersion = 0;", 'clear role on lock');
  auth = replace(auth,
    "      .filter((entry) => entry && String(entry.role || '') === 'admin')",
    "      .filter((entry) => entry && ['admin', 'deputy'].includes(String(entry.role || '')))", 'directory role filter');
  auth = replace(auth,
    "        passwordSalt: 'supabase-auth',\n        enabled: entry.enabled !== false",
    "        passwordSalt: 'supabase-auth',\n        role: String(entry.role || 'admin'),\n        enabled: entry.enabled !== false", 'preserve backend role');
  auth = replace(auth,
    "    && String(entry.role || '') === 'admin'\n    && String(entry.account_id || entry.accountId || '').trim() === id",
    "    && ['admin', 'deputy'].includes(String(entry.role || ''))\n    && String(entry.account_id || entry.accountId || '').trim() === id", 'deputy password gate');
  auth = replace(auth,
    "    password: String(row.querySelector('[data-admin-account-password]')?.value || ''),\n    enabled: !!(row.querySelector('[data-admin-account-enabled]')",
    "    password: String(row.querySelector('[data-admin-account-password]')?.value || ''),\n    role: String(row.querySelector('[data-admin-account-role]')?.value || 'admin'),\n    enabled: !!(row.querySelector('[data-admin-account-enabled]')", 'read role select');
  auth = replace(auth,
    "  const existing = (Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [])\n    .filter((entry) => entry && entry.role === 'admin');",
    "  const existing = (Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [])\n    .filter((entry) => entry && ['admin', 'deputy'].includes(entry.role));", 'include existing deputies when saving');
  auth = replace(auth,
    "    return { ok: false, reason: 'invalid-admin-profile' };\n  }\n  const existing =",
    "    return { ok: false, reason: 'invalid-admin-profile' };\n  }\n  if (desired.some((entry) => !['admin', 'deputy'].includes(entry.role))) return { ok: false, reason: 'invalid-role' };\n  const existing =", 'validate selected role');
  auth = replace(auth,
    "      password: '',\n      enabled: false\n    })));",
    "      password: '',\n      role: String(entry.role || 'admin'),\n      enabled: false\n    })));", 'preserve role on disable');
  const oldCanOpen = `function rakAdminCanOpenAdmin() {
  const activeId = rakAdminGetActiveAccountId();
  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId);
}`;
  const newCanOpen = `${MARKER}
function rakAdminCanOpenShiftReport() {
  const activeId = rakAdminGetActiveAccountId();
  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2
    && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId
    && ['owner', 'admin', 'deputy'].includes(String(app.adminRole || '')));
}
function rakAdminIsDeputy() {
  return rakAdminCanOpenShiftReport() && app.adminRole === 'deputy';
}
function rakAdminCanOpenAdmin() {
  return rakAdminCanOpenShiftReport() && (app.adminRole === 'owner' || app.adminRole === 'admin');
}`;
  auth = replace(auth, oldCanOpen, newCanOpen, 'full-admin permission gate');
  auth = replace(auth,
    '  window.rakAdminCanOpenAdmin = rakAdminCanOpenAdmin;',
    '  window.rakAdminCanOpenAdmin = rakAdminCanOpenAdmin;\n  window.rakAdminCanOpenShiftReport = rakAdminCanOpenShiftReport;\n  window.rakAdminIsDeputy = rakAdminIsDeputy;', 'export role gates');
  auth = replace(auth,
    "    '  <td><label class=\"adminRotationOvertimeSwitch\"><input type=\"checkbox\" data-admin-account-field=\"enabled\" data-admin-account-enabled '",
    "    '  <td><select class=\"appMenuInlineInput\" data-admin-account-field=\"role\" data-admin-account-role aria-label=\"Role účtu\"><option value=\"admin\"' + (entry.role === 'deputy' ? '' : ' selected') + '>Správce</option><option value=\"deputy\"' + (entry.role === 'deputy' ? ' selected' : '') + '>Zástupce – jen report směny</option></select></td>',\n    '  <td><label class=\"adminRotationOvertimeSwitch\"><input type=\"checkbox\" data-admin-account-field=\"enabled\" data-admin-account-enabled '", 'role input in account table');
  auth = replace(auth,
    '<th>Heslo</th><th>Aktivni</th><th></th>',
    '<th>Heslo</th><th>Role</th><th>Aktivni</th><th></th>', 'owner table header');
  auth = replace(auth,
    "    '  <div class=\"smallText uMb10\">Tady pridavas dalsi admin ucty, ktere po prihlaseni uvidi administraci. Heslo nech prazdne, pokud ho nechces menit. Pro odebrani spravce klikni na × u radku (nebo smaz ucet) a uloz. Hesla spravuje Supabase Auth a aplikace je neuklada ani je neumoznuje stahnout.</div>',",
    "    '  <div class=\"smallText uMb10\">U každého účtu vyber roli. Správce má pracovní administraci; Zástupce uvidí pouze Report směny. Heslo nech prázdné, pokud ho nechceš měnit. Odebrání nebo vypnutí potvrď uložením. Hesla bezpečně spravuje Supabase Auth.</div>',", 'role description');
  auth = replace(auth,
    "    '    <span>Nizsi admini</span>',",
    "    '    <span>Správci a zástupci</span>',", 'overview role label');
  auth = replace(auth,
    "    '    <small>Muzou spravovat pracovni casti administrace a zmenit vlastni heslo, ale nemuzou menit dalsi adminy ani heslo hlavniho admina.</small>',",
    "    '    <small>Správce má pracovní administraci bez správy účtů. Zástupce může pouze vyplnit a odeslat Report směny.</small>',", 'overview role explanation');
  auth = replace(auth,
    "  if (passwordInput) { passwordInput.value = ''; passwordInput.placeholder = 'heslo'; }\n  if (enabledInput)",
    "  if (passwordInput) { passwordInput.value = ''; passwordInput.placeholder = 'heslo'; }\n  const roleInput = row.querySelector('[data-admin-account-role]');\n  if (roleInput) roleInput.value = 'admin';\n  if (enabledInput)", 'clear role with row');
}
assert(auth.includes(MARKER) && auth.includes("role: String(row.querySelector('[data-admin-account-role]')?.value || 'admin')"), 'deputy auth stage incomplete');
write('app-admin-unlock.js', auth);

let menu = read('app-menu.js');
if (!menu.includes(MARKER)) {
  menu = replace(menu,
    "  const canOpen = () => !!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin());",
    "  const canOpen = () => !!(typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport());", 'shared authenticated entry');
  menu = replace(menu,
    "      if (menuAction === 'admin') {\n        const adminReady =",
    "      if (menuAction === 'admin') {\n        if (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy()) { openAppMenu('menu'); return; }\n        const adminReady =", 'prevent deputy admin route');
  menu = replace(menu,
    "            '<div class=\"appMenuAdminQuickLinksTitle\">Správce</div>' +",
    "            '<div class=\"appMenuAdminQuickLinksTitle\">' + (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? 'Zástupce' : 'Správce') + '</div>' +", 'deputy title');
  menu = replace(menu,
    "              '<button type=\"button\" class=\"appMenuAction isActive\" data-menu-action=\"admin\">Administrace</button>' +\n              '<button type=\"button\" class=\"appMenuAction isActive\" data-admin-action=\"vacation-report\">Report dovolené</button>' +",
    "              // RAK_REPORT_ONLY_DEPUTY_17019: do not render other admin entries for deputies.\n              (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? '' : '<button type=\"button\" class=\"appMenuAction isActive\" data-menu-action=\"admin\">Administrace</button><button type=\"button\" class=\"appMenuAction isActive\" data-admin-action=\"vacation-report\">Report dovolené</button>') +", 'deputy quick links');
  menu = replace(menu,
    "  if (typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin()) return true;",
    "  if (typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport()) return true;", 'show report-only entry');
}
assert(menu.includes(MARKER), 'menu role marker missing');
write('app-menu.js', menu);

let renderer = read('app-menu-admin-renderer.js');
if (!renderer.includes(MARKER)) {
  renderer = replace(renderer,
    "function renderAdminMenuBody(body, section) {\n  const mode =",
    "function renderAdminMenuBody(body, section) {\n  " + MARKER + "\n  if (!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {\n    if (body) body.innerHTML = '<div class=\"appMenuCard\">Administrace není přístupná.<button type=\"button\" class=\"appMenuAction\" data-menu-back=\"1\">Zpět</button></div>';\n    return;\n  }\n  const mode =", 'guard direct admin renderer');
}
write('app-menu-admin-renderer.js', renderer);

let shiftEntry = read('app-menu-shift-report.js');
shiftEntry = replace(shiftEntry,
  "typeof window.rakAdminCanOpenAdmin === 'function' && window.rakAdminCanOpenAdmin()",
  "typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport()", 'entry initial role');
shiftEntry = shiftEntry.replaceAll(
  "typeof window.rakAdminCanOpenAdmin === 'function' && window.rakAdminCanOpenAdmin()",
  "typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport()");
assert(!shiftEntry.includes('window.rakAdminCanOpenAdmin()'), 'old report entry gate remains');
write('app-menu-shift-report.js', shiftEntry);

let shift = read('rak-shift-report.js');
shift = replace(shift,
  "function canUseShiftReport(){return typeof rakAdminCanOpenAdmin==='function'&&rakAdminCanOpenAdmin();}",
  "function canUseShiftReport(){return typeof rakAdminCanOpenShiftReport==='function'&&rakAdminCanOpenShiftReport();}", 'shift dialog permission');
shift = replace(shift,
  "data-shift-action=\"close\">Zpět do Adminu</button>",
  "data-shift-action=\"close\">Zpět</button>", 'report close label');
shift = replace(shift,
  "if(!root)return;const add=e.target.closest('[data-shift-add]');",
  "if(!root)return;if(!canUseShiftReport()){e.preventDefault();return;}const add=e.target.closest('[data-shift-add]');", 'recheck report interaction permission');
shift = replace(shift,
  "if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');",
  "if(typeof rakAdminIsDeputy==='function'&&rakAdminIsDeputy()){if(typeof openAppMenu==='function')openAppMenu('menu');}else if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');", 'report back navigation');
shift = shift.replaceAll(
  "if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');",
  "if(typeof rakAdminIsDeputy==='function'&&rakAdminIsDeputy()){if(typeof openAppMenu==='function')openAppMenu('menu');}else if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');");
assert(!shift.includes("renderAdminMenuBody(body,'home');}return;"), 'shift dialog close must respect deputy route');
write('rak-shift-report.js', shift);

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test database isolation');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'test display');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'build');
write('supabase-config.js', config);
let app = read('app.js');
app = setLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = setLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app version');
write('app.js', app);
let sw = read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
write('sw.js', sw);
let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.18-absencegroups1';"), 'previous release build id');
  index = index.replace("var build='v1.7.18-absencegroups1';", `var build='${BUILD}';`);
}
write('index.html', index);
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical package version preserved');
for (const path of ['app-admin-unlock.js','app-menu.js','app-menu-admin-renderer.js','app-menu-shift-report.js','rak-shift-report.js','supabase-config.js','app.js','sw.js']) execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['tools/deputy-report-role-17019-smoke.mjs'],{stdio:'inherit'});
console.log('[development-version-17019] OK deputy role grants only shift report; owner/admin rights preserved; role CRUD and v1.7.19 PWA verified');