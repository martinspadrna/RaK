#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const marker='// RAK_EXTERNAL_SHIFT_TEAMS_17020';
const load=file=>fs.readFileSync(file,'utf8');
const save=(file,src)=>fs.writeFileSync(file,src,'utf8');
function change(src,oldText,nextText,label){assert(src.includes(oldText),'[17020] Missing '+label);return src.replace(oldText,nextText);}
function version(src,pattern,value,label){assert.match(src,pattern,'[17020] Missing '+label);return src.replace(pattern,value);}
let core=load('core.js');
if(!core.includes(marker)){
  core=change(core,`  if (!name || !loginNumber) return null;
  return { name, loginNumber };
}

function normalizeRakWorkerRosterSettings(settings)`,`  if (!name || !loginNumber) return null;
  const requestedTeam = String(entry.shiftTeam || entry.shift_team || 'D').trim().toUpperCase();
  const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : 'D';
  return { name, loginNumber, shiftTeam };
}

function normalizeRakWorkerRosterSettings(settings)`,'external normalization');
  core=change(core,`'  <td><span class="adminAppAccountScope">Mimo rotace</span></td>'`,`'  <td><select class="appMenuInlineInput" data-app-account-field="shiftTeam" aria-label="Směna pracovníka">' + ['A','B','C','D'].map(team => '<option value="' + team + '"' + (String(safe.shiftTeam || 'D') === team ? ' selected' : '') + '>Směna ' + team + '</option>').join('') + '</select><small class="adminAppAccountScope">Mimo rozpis</small></td>'`,'shift picker');
  core=change(core,'    appAccounts.push({ name, loginNumber });',`    const shiftTeam = String(tr.querySelector('[data-app-account-field="shiftTeam"]')?.value || 'D').toUpperCase();
    if (!['A','B','C','D'].includes(shiftTeam)) throw new Error('Vyber směnu A/B/C/D.');
    appAccounts.push({ name, loginNumber, shiftTeam });`,'save shift');
  core=change(core,'Tyto účty se nepřidají do pracovníků, rozpisu, statistik ani ke strojům. Slouží jen pro přihlášení do aplikace.','Pracovníci mimo rozpis: vyber směnu A/B/C/D. Nepřidají se do rozpisu ani statistik týmu D; směny A/B/C neuvidí Rotace, kalkulačky zůstávají.','help');
  core=change(core,'<th>Os. číslo</th><th>Zařazení</th>','<th>Os. číslo</th><th>Směna / zařazení</th>','table heading');
  const helper=`${marker}
function getRakActiveAccountShiftInfo() {
  let id = '';
  try { const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null; id = String(profile && profile.accountNumber || '').trim(); } catch(err) {}
  if(!id) { try { id = String(app && app.activeAccountId || '').trim(); } catch(err) {} }
  if(!id) return {team:'D',outside:false,accountId:''};
  const roster = getRakWorkerRosterSettings();
  const account = (roster.appAccounts || []).find(row => String(row.loginNumber || '') === id);
  return account ? {team:account.shiftTeam || 'D',outside:true,accountId:id} : {team:'D',outside:false,accountId:id};
}
function getRakActiveAccountShiftTeam() { return getRakActiveAccountShiftInfo().team; }
function rakCanAccessRotations() { return getRakActiveAccountShiftTeam() === 'D'; }
function rakApplyShiftAccess() {
  if(typeof document==='undefined') return;
  const allowed=rakCanAccessRotations();
  document.querySelectorAll('.bottomNav button[data-action="rotace"], .bottomNav button[data-action="rozpisy"], .bottomNav button[data-action="statistiky"], .bottomNav .bottomNavBtn[data-page="rotace"]').forEach(button => {
    button.hidden = !allowed;
    button.setAttribute('aria-hidden',allowed?'false':'true');
    if(allowed) button.style.removeProperty('display'); else button.style.setProperty('display','none','important');
    if(allowed) button.removeAttribute('tabindex'); else button.setAttribute('tabindex','-1');
  });
  if(!allowed && document.getElementById('rotace')?.classList.contains('active') && typeof showPage==='function') showPage('home');
}
window.getRakActiveAccountShiftInfo=getRakActiveAccountShiftInfo;
window.getRakActiveAccountShiftTeam=getRakActiveAccountShiftTeam;
window.rakCanAccessRotations=rakCanAccessRotations;
window.rakApplyShiftAccess=rakApplyShiftAccess;
`;
  core=change(core,'window.getWorkerNameByLoginNumber = getWorkerNameByLoginNumber;',helper+'window.getWorkerNameByLoginNumber = getWorkerNameByLoginNumber;','shift helper export');
  core=change(core,"  const shiftCount = active ? 0 : getVacationCountdownTeamShiftCount(sourceDate, upcoming.start, 'D');","  const countdownTeam = getRakActiveAccountShiftTeam();\n  const shiftCount = active ? 0 : getVacationCountdownTeamShiftCount(sourceDate, upcoming.start, countdownTeam);",'vacation count team');
  core=change(core,"formatVacationCountdownShiftCount(shiftCount, 'D')","formatVacationCountdownShiftCount(shiftCount, countdownTeam)",'vacation label');
  core=change(core,"formatVacationCountdownShiftTeamLabel('D')","formatVacationCountdownShiftTeamLabel(countdownTeam)",'vacation team label');
}
save('core.js',core);
let dashboard=load('dashboard.js');
if(!dashboard.includes(marker)){
  const status=`${marker}
function getDashboardAccountTeamStatus(now,team) {
  if(team==='D') return getDashboardTeamDStatus(now);
  const state=typeof getTeamShiftState==='function'?getTeamShiftState(now,team):null;
  const active=state&&state.active?{team,label:state.label||'',start:state.start,end:state.end}:null;
  const next=!active?(state&&state.next&&state.next.start?{team,label:state.next.label||'',start:state.next.start,end:state.next.end}:getDashboardNextTeamShift(now,team)):null;
  return {active,next};
}
`;
  dashboard=change(dashboard,'function getDashboardPersonalShiftStatus(now) {',status+'function getDashboardPersonalShiftStatus(now) {','dashboard team helper');
  dashboard=change(dashboard,'function getDashboardAccessOverview(now) {',"function getDashboardAccessOverview(now) {\n  if(getRakActiveAccountShiftTeam()!=='D') return [];",'no D absences for A/B/C');
  dashboard=change(dashboard,"    const teamD = typeof getDashboardTeamDStatus === 'function'\n      ? getDashboardTeamDStatus(now)\n      : { active: null, next: null };","    const accountTeam = getRakActiveAccountShiftTeam();\n    const teamD = getDashboardAccountTeamStatus(now,accountTeam);",'hero assigned shift');
  dashboard=dashboard.replace("title = 'Směna D končí za '","title = 'Směna ' + accountTeam + ' končí za '")
    .replace("title = 'Směna D začíná za '","title = 'Směna ' + accountTeam + ' začíná za '")
    .replace("title = 'Směna D';","title = 'Směna ' + accountTeam;");
  dashboard=change(dashboard,"  const active = typeof getDashboardActiveWorkShift === 'function' ? getDashboardActiveWorkShift(now) : null;\n  const nextWorkShift = !active && typeof getDashboardNextWorkShift === 'function' ? getDashboardNextWorkShift(now) : null;",
    "  if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n  const assigned = getRakActiveAccountShiftInfo();\n  let active = typeof getDashboardActiveWorkShift === 'function' ? getDashboardActiveWorkShift(now) : null;\n  let nextWorkShift = !active && typeof getDashboardNextWorkShift === 'function' ? getDashboardNextWorkShift(now) : null;\n  if(assigned.outside) { const own = getDashboardAccountTeamStatus(now,assigned.team); active=own.active; nextWorkShift=own.next; }",'own shift countdown');
}
save('dashboard.js',dashboard);
let nav=load('app-navigation.js');
if(!nav.includes(marker)){
  nav=change(nav,'function showPage(id) {',`function showPage(id) {\n  ${marker}\n  if((id==='rotace'||id==='statistiky')&&!rakCanAccessRotations()) id='home';`,'direct route');
  for(const name of ['openRotaceNames','openRotaceMonths','openRotaceStats'])nav=change(nav,`function ${name}() {`,`function ${name}() {\n  if(!rakCanAccessRotations()){showPage('home');return;}`,'route '+name);
}
save('app-navigation.js',nav);
let menu=load('app-menu.js');
if(!menu.includes(marker))menu=change(menu,"          app.machineSettingsRows = rows;\n          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}\n          renderAdminMenuBody(body, 'workers');",
  `          app.machineSettingsRows = rows;\n          ${marker}\n          if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n          if(typeof updateDashboard==='function') updateDashboard();\n          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}\n          renderAdminMenuBody(body, 'workers');`,'save team refresh');
save('app-menu.js',menu);
let machines=load('admin-machine-settings.js');
if(!machines.includes(marker))machines=change(machines,'    app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();\n    return app.machineSettingsRows;',`    app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();\n    ${marker}\n    if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();\n    return app.machineSettingsRows;`,'online refresh');
save('admin-machine-settings.js',machines);
let report=load('rak-shift-report.js');
if(!report.includes(marker)){
  report=change(report,'function defaultShiftContext(now) {',marker+'\nfunction defaultShiftContext(now) {','report marker');
  report=change(report,"  const d = new Date(now || Date.now()); const hour=d.getHours(); let shift='R';",
    "  const d = new Date(now || Date.now());\n  const info=typeof getRakActiveAccountShiftInfo==='function'?getRakActiveAccountShiftInfo():{team:'D',outside:false};\n  if(info.outside&&typeof getTeamShiftState==='function'){const state=getTeamShiftState(d,info.team);const own=state&&(state.active?state:state.next);if(own&&own.start instanceof Date){const start=own.start,h=start.getHours();return {date:localDateValue(start),shift:(h>=18||h<6)?'N':'R'};}}\n  const hour=d.getHours(); let shift='R';",'report default');
  report=change(report,"NoK celkem'+inputNumber(draft&&draft.moNok","NOK'+inputNumber(draft&&draft.moNok",'NOK form');
  report=report.replaceAll('NOK celkem: ','NOK: ').replaceAll('NoK celkem: ','NOK: ');
  report=change(report,"const lines = ['RaK – REPORT SMĚNY', date + (draft.shift ? ' · ' + draft.shift : ''), ''];",
    "const team=typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D';\n    const lines = ['RaK – REPORT SMĚNY', date + ' · Směna ' + team + (draft.shift ? ' · ' + draft.shift : ''), ''];",'text report team');
  report=change(report,`'  <div class="appMenuSubTitle">Report směny pro mistra</div>`,`'  <div class="appMenuSubTitle">Report směny pro mistra · směna ' + (typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D') + '</div>`,'report form team');
}
save('rak-shift-report.js',report);
for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  let image=load(file).replaceAll('NOK celkem: ','NOK: ').replaceAll('NoK celkem: ','NOK: ');
  const header="ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);";
  if(!image.includes(marker))image=change(image,header,"// RAK_EXTERNAL_SHIFT_TEAMS_17020\n    ctx.fillText(formatDate(model.date) + '  •  Směna ' + (typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D') + '  •  ' + shiftLabel(model.shift), OUTER, 218);",file+' team header');
  assert(image.includes(marker),file+' missing team');save(file,image);
}
let config=load('supabase-config.js');assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'),'test DB');
config=version(config,/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,'window.RAK_RELEASE_VERSION = "1.7.20";','release');
config=version(config,/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,'window.RAK_TEST_DISPLAY_VERSION = "1.7.20";','display');
config=version(config,/^window\.RAK_PWA_BUILD = "[^"]+";$/m,'window.RAK_PWA_BUILD = "v1.7.20-shiftteams1";','build');save('supabase-config.js',config);
let app=load('app.js');app=version(app,/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,'  const RAK_DEV_UPDATE_BUILD = "v1.7.20-shiftteams1";','app build');app=version(app,/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,'  window.RAK_RELEASE_VERSION = "1.7.20";','app display');save('app.js',app);
let sw=load('sw.js');assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW');sw=version(sw,/^const CACHE_VERSION = '[^']+';$/m,"const CACHE_VERSION = 'v1.7.20';",'cache');sw=version(sw,/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.20';",'SW display');sw=version(sw,/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,"const DEVELOPMENT_BUILD_ID = 'v1.7.20-shiftteams1';",'SW build');save('sw.js',sw);
let index=load('index.html');if(!index.includes("var build='v1.7.20-shiftteams1';"))index=change(index,"var build='v1.7.19-deputy1';","var build='v1.7.20-shiftteams1';",'index');save('index.html',index);
assert.equal(JSON.parse(load('package.json')).version,'1.7.0');
for(const path of ['core.js','dashboard.js','app-navigation.js','app-menu.js','admin-machine-settings.js','rak-shift-report.js','rak-shift-report-image.js','rak-shift-report-share.js','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['tools/shift-team-17020-smoke.mjs'],{stdio:'inherit'});
console.log('[development-version-17020] OK outside roster teams, own dashboard, D-only Rotace, deputy report and concise NOK');