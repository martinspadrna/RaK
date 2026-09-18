#!/usr/bin/env node
// RaK 1.7.20: outside-roster teams, own dashboard, hidden Rotace and shorter MO NOK.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.20', BUILD='v1.7.20-shiftteams1', MARKER='// RAK_EXTERNAL_SHIFT_TEAMS_17020';
const read=file=>fs.readFileSync(file,'utf8');
const write=(file,text)=>fs.writeFileSync(file,text,'utf8');
function swap(src,before,after,label){assert(src.includes(before),label+' missing');return src.replace(before,after);}
function setLine(src,re,text,label){assert.match(src,re,label+' missing');return src.replace(re,text);}

let core=read('core.js');
if(!core.includes(MARKER)){
  core=swap(core,"  if (!name || !loginNumber) return null;\n  return { name, loginNumber };\n}\n\nfunction normalizeRakWorkerRosterSettings(settings)",
    "  if (!name || !loginNumber) return null;\n  const requestedTeam = String(entry.shiftTeam || entry.shift_team || 'D').trim().toUpperCase();\n  const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : 'D';\n  return { name, loginNumber, shiftTeam };\n}\n\nfunction normalizeRakWorkerRosterSettings(settings)", 'external team normalization');
  core=swap(core,"    '  <td><span class=\"adminAppAccountScope\">Mimo rotace</span></td>',",
    "    '  <td><select class=\"appMenuInlineInput\" data-app-account-field=\"shiftTeam\" aria-label=\"Směna pracovníka\">' + ['A','B','C','D'].map(team => '<option value=\"' + team + '\"' + (String(safe.shiftTeam || 'D') === team ? ' selected' : '') + '>Směna ' + team + '</option>').join('') + '</select><small class=\"adminAppAccountScope\">Mimo rozpis</small></td>', 'team picker');
  core=swap(core,"    appAccounts.push({ name, loginNumber });",
    "    const shiftTeam = String(tr.querySelector('[data-app-account-field=\"shiftTeam\"]')?.value || 'D').toUpperCase();\n    if (!['A','B','C','D'].includes(shiftTeam)) throw new Error('Vyber platnou směnu A, B, C nebo D.');\n    appAccounts.push({ name, loginNumber, shiftTeam });",'read external team');
  core=swap(core,'Tyto účty se nepřidají do pracovníků, rozpisu, statistik ani ke strojům. Slouží jen pro přihlášení do aplikace.',
    'Pracovníci mimo rozpis: vyber směnu A/B/C/D. Nezařadí se do generátoru ani statistik týmu D. Směny A/B/C neuvidí Rotace; kalkulačky zůstávají.', 'description');
  core=swap(core,"    '    <thead><tr><th>Jméno</th><th>Os. číslo</th><th>Zařazení</th></tr></thead>',",
    "    '    <thead><tr><th>Jméno</th><th>Os. číslo</th><th>Směna / zařazení</th></tr></thead>', 'team column');
  const helpers=`${MARKER}
function getRakActiveAccountShiftInfo() {
  let id = '';
  try { const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null; id = String(profile && profile.accountNumber || '').trim(); } catch (err) {}
  if (!id) { try { id = String(app && app.activeAccountId || '').trim(); } catch (err) {} }
  if (!id) return {team:'D',outside:false,accountId:''};
  const settings = getRakWorkerRosterSettings();
  const external = (settings.appAccounts || []).find(entry => String(entry.loginNumber || '') === id);
  return external ? {team:external.shiftTeam || 'D',outside:true,accountId:id} : {team:'D',outside:false,accountId:id};
}
function getRakActiveAccountShiftTeam() { return getRakActiveAccountShiftInfo().team; }
function rakCanAccessRotations() { return getRakActiveAccountShiftTeam() === 'D'; }
function rakApplyShiftAccess() {
  if (typeof document === 'undefined') return;
  const allowed = rakCanAccessRotations();
  document.querySelectorAll('.bottomNav button[data-action="rotace"], .bottomNav button[data-action="rozpisy"], .bottomNav button[data-action="statistiky"], .bottomNav .bottomNavBtn[data-page="rotace"]').forEach(button => {
    button.hidden = !allowed;
    button.setAttribute('aria-hidden',allowed?'false':'true');
    if(allowed) button.style.removeProperty('display'); else button.style.setProperty('display','none','important');
    if(allowed) button.removeAttribute('tabindex'); else button.setAttribute('tabindex','-1');
  });
  if(!allowed && document.getElementById('rotace')?.classList.contains('active') && typeof showPage === 'function') showPage('home');
}
window.getRakActiveAccountShiftInfo = getRakActiveAccountShiftInfo;
window.getRakActiveAccountShiftTeam = getRakActiveAccountShiftTeam;
window.rakCanAccessRotations = rakCanAccessRotations;
window.rakApplyShiftAccess = rakApplyShiftAccess;
`;
  core=swap(core,'window.getWorkerNameByLoginNumber = getWorkerNameByLoginNumber;',helpers+'window.getWorkerNameByLoginNumber = getWorkerNameByLoginNumber;','global helpers');
  core=swap(core,"  const shiftCount = active ? 0 : getVacationCountdownTeamShiftCount(sourceDate, upcoming.start, 'D');",
    "  const countdownTeam = getRakActiveAccountShiftTeam();\n  const shiftCount = active ? 0 : getVacationCountdownTeamShiftCount(sourceDate, upcoming.start, countdownTeam);",'vacation count');
  core=swap(core,"    shiftMeta: formatVacationCountdownShiftCount(shiftCount, 'D'),\n    shiftText: formatVacationCountdownShiftCountValue(shiftCount),\n    shiftTeamMeta: formatVacationCountdownShiftTeamLabel('D'),",
    "    shiftMeta: formatVacationCountdownShiftCount(shiftCount, countdownTeam),\n    shiftText: formatVacationCountdownShiftCountValue(shiftCount),\n    shiftTeamMeta: formatVacationCountdownShiftTeamLabel(countdownTeam),",'vacation team');
}
assert(core.includes(MARKER)&&core.includes('shiftTeam'),'shift model');write('core.js',core);

let dashboard=read('dashboard.js');
if(!dashboard.includes(MARKER)){
  dashboard=swap(dashboard,'function getDashboardPersonalShiftStatus(now) {\n  const profile =',
    `${MARKER}
function getDashboardAccountTeamStatus(now,team) {
  if(team==='D') return getDashboardTeamDStatus(now);
  const state = typeof getTeamShiftState === 'function' ? getTeamShiftState(now,team) : null;
  const active = state && state.active ? {team,label:state.label||'',start:state.start,end:state.end} : null;
  const next = !active ? (state && state.next && state.next.start ? {team,label:state.next.label||'',start:state.next.start,end:state.next.end} : getDashboardNextTeamShift(now,team)) : null;
  return {active,next};
}
function getDashboardPersonalShiftStatus(now) {
  const profile =`,'team state');
  dashboard=swap(dashboard,'function getDashboardAccessOverview(now) {\n  // Účet mimo Rotace',
    "function getDashboardAccessOverview(now) {\n  if(getRakActiveAccountShiftTeam()!=='D') return [];\n  // Účet mimo Rotace",'non-D absence');
  dashboard=swap(dashboard,"    const teamD = typeof getDashboardTeamDStatus === 'function'\n      ? getDashboardTeamDStatus(now)\n      : { active: null, next: null };\n    if (teamD.active && teamD.active.end instanceof Date && typeof formatDuration === 'function') {\n      title = 'Směna D končí za ' + formatDuration(Math.max(0, teamD.active.end.getTime() - now.getTime()));\n    } else if (teamD.next && teamD.next.start instanceof Date && typeof formatDuration === 'function') {\n      title = 'Směna D začíná za ' + formatDuration(Math.max(0, teamD.next.start.getTime() - now.getTime()));\n    } else {\n      title = 'Směna D';\n    }\n    accessOverview = getDashboardAccessOverview(now);\n    if (!accessOverview.length) detail = 'Další směna zatím není k dispozici.';",
    "    const accountTeam = getRakActiveAccountShiftTeam();\n    const teamStatus = getDashboardAccountTeamStatus(now,accountTeam);\n    status = 'Přehled směny ' + accountTeam;\n    if (teamStatus.active && teamStatus.active.end instanceof Date && typeof formatDuration === 'function') {\n      title = 'Směna ' + accountTeam + ' končí za ' + formatDuration(Math.max(0, teamStatus.active.end.getTime() - now.getTime()));\n    } else if (teamStatus.next && teamStatus.next.start instanceof Date && typeof formatDuration === 'function') {\n      title = 'Směna ' + accountTeam + ' začíná za ' + formatDuration(Math.max(0, teamStatus.next.start.getTime() - now.getTime()));\n    } else {\n      title = 'Směna ' + accountTeam;\n    }\n    accessOverview = accountTeam === 'D' ? getDashboardAccessOverview(now) : [];\n    if (!accessOverview.length) detail = teamStatus.next ? formatDashboardNextShiftMeta(teamStatus.next) : (teamStatus.active ? 'Právě probíhá tvoje směna.' : 'Další směna zatím není k dispozici.');",'team hero');
  dashboard=swap(dashboard,"  const active = typeof getDashboardActiveWorkShift === 'function' ? getDashboardActiveWorkShift(now) : null;\n  const nextWorkShift = !active && typeof getDashboardNextWorkShift === 'function' ? getDashboardNextWorkShift(now) : null;\n  const teamDStatus =",
    "  if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n  const assigned = getRakActiveAccountShiftInfo();\n  let active = typeof getDashboardActiveWorkShift === 'function' ? getDashboardActiveWorkShift(now) : null;\n  let nextWorkShift = !active && typeof getDashboardNextWorkShift === 'function' ? getDashboardNextWorkShift(now) : null;\n  if(assigned.outside) { const own = getDashboardAccountTeamStatus(now,assigned.team); active=own.active; nextWorkShift=own.next; }\n  const teamDStatus =",'personal countdown');
}
write('dashboard.js',dashboard);
let nav=read('app-navigation.js');
if(!nav.includes(MARKER)){
  nav=swap(nav,'function showPage(id) {\n  const currentPage =',
    `function showPage(id) {\n  ${MARKER}\n  if ((id === 'rotace' || id === 'statistiky') && !rakCanAccessRotations()) id = 'home';\n  const currentPage =`,'routes');
  for(const name of ['openRotaceNames','openRotaceMonths','openRotaceStats'])nav=swap(nav,`function ${name}() {`,`function ${name}() {\n  if(!rakCanAccessRotations()) { showPage('home'); return; }`,'route '+name);
}
write('app-navigation.js',nav);
let menu=read('app-menu.js');
if(!menu.includes(MARKER))menu=swap(menu,"          app.machineSettingsRows = rows;\n          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}\n          renderAdminMenuBody(body, 'workers');",
    `          app.machineSettingsRows = rows;\n          ${MARKER}\n          if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n          try { if(typeof updateDashboard==='function') updateDashboard(); } catch(err){}\n          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}\n          renderAdminMenuBody(body, 'workers');`,'save workers access');
write('app-menu.js',menu);
let machine=read('admin-machine-settings.js');
if(!machine.includes(MARKER))machine=swap(machine,'    app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();\n    return app.machineSettingsRows;',
    `    app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();\n    ${MARKER}\n    if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n    return app.machineSettingsRows;`,'online refresh');
write('admin-machine-settings.js',machine);
let report=read('rak-shift-report.js');
if(!report.includes(MARKER)){
  report=swap(report,'function defaultShiftContext(now) {',`${MARKER}\nfunction defaultShiftContext(now) {`,'report marker');
  report=swap(report,"  const d = new Date(now || Date.now()); const hour=d.getHours(); let shift='R';",
    "  const d = new Date(now || Date.now());\n  const info = typeof getRakActiveAccountShiftInfo === 'function' ? getRakActiveAccountShiftInfo() : {team:'D',outside:false};\n  if(info.outside && typeof getTeamShiftState === 'function') {\n    const state = getTeamShiftState(d,info.team);\n    const own = state && (state.active ? state : state.next);\n    if(own && own.start instanceof Date) { const start=own.start,h=start.getHours(); return {date:localDateValue(start),shift:(h>=18||h<6)?'N':'R'}; }\n  }\n  const hour=d.getHours(); let shift='R';",'report team date');
  report=swap(report,"NoK celkem'+inputNumber(draft&&draft.moNok","NOK'+inputNumber(draft&&draft.moNok",'MO NOK label');
  report=report.replaceAll('NOK celkem: ','NOK: ').replaceAll('NoK celkem: ','NOK: ');
  report=swap(report,"const lines = ['RaK – REPORT SMĚNY', date + (draft.shift ? ' · ' + draft.shift : ''), ''];",
    "const team = typeof getRakActiveAccountShiftTeam === 'function' ? getRakActiveAccountShiftTeam() : 'D';\n    const lines = ['RaK – REPORT SMĚNY', date + ' · Směna ' + team + (draft.shift ? ' · ' + draft.shift : ''), ''];",'text report team');
  report=swap(report,"'  <div class=\"appMenuSubTitle\">Report směny pro mistra</div>",
    "'  <div class=\"appMenuSubTitle\">Report směny pro mistra · směna ' + (typeof getRakActiveAccountShiftTeam === 'function' ? getRakActiveAccountShiftTeam() : 'D') + '</div>",'form team label');
}
assert(report.includes(MARKER)&&!report.includes('NOK celkem: '),'report NOK');write('rak-shift-report.js',report);
for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  let image=read(file).replaceAll('NOK celkem: ','NOK: ').replaceAll('NoK celkem: ','NOK: ');
  const header="ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);";
  if(!image.includes(MARKER))image=swap(image,header,"// RAK_EXTERNAL_SHIFT_TEAMS_17020\n    ctx.fillText(formatDate(model.date) + '  •  Směna ' + (typeof getRakActiveAccountShiftTeam === 'function' ? getRakActiveAccountShiftTeam() : 'D') + '  •  ' + shiftLabel(model.shift), OUTER, 218);",file+' team header');
  assert(image.includes(MARKER)&&!image.includes('NOK celkem: '),file+' NOK/header');write(file,image);
}
let config=read('supabase-config.js');assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!config.includes('bkqamcbkiwumsvelahxr'),'test DB only');
config=setLine(config,/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
config=setLine(config,/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'test display');
config=setLine(config,/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`,'build');write('supabase-config.js',config);
let app=read('app.js');app=setLine(app,/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
app=setLine(app,/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');write('app.js',app);
let sw=read('sw.js');assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW');
sw=setLine(sw,/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`,'cache');
sw=setLine(sw,/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW display');
sw=setLine(sw,/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');write('sw.js',sw);
let index=read('index.html');if(!index.includes(`var build='${BUILD}';`))index=swap(index,"var build='v1.7.19-deputy1';",`var build='${BUILD}';`,'index marker');write('index.html',index);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical package');
for(const file of ['core.js','dashboard.js','app-navigation.js','app-menu.js','admin-machine-settings.js','rak-shift-report.js','rak-shift-report-image.js','rak-shift-report-share.js','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/shift-team-17020-smoke.mjs'],{stdio:'inherit'});
console.log('[development-version-17020] OK A/B/C/D outsider team, personal dashboard, D-only Rotace, deputy report, MO NOK');