#!/usr/bin/env node
// RaK 1.7.24: three narrowly scoped A/B/C fixes, D remains on the legacy path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.24',BUILD='v1.7.24-crossshift1',MARK='// RAK_CROSS_SHIFT_FIXES_17024';
const read=p=>fs.readFileSync(p,'utf8');
function update(path,fn){const old=read(path),next=fn(old);if(next!==old)fs.writeFileSync(path,next,'utf8');return next;}
function swap(s,oldText,newText,label){assert(s.includes(oldText),'[17024] anchor missing: '+label);return s.replace(oldText,newText);}
const core=update('core.js',s=>{
  if(s.includes(MARK))return s;
  s=swap(s,`function rakApplyShiftAccess() {
  if(typeof document==='undefined') return;
  const allowed=rakCanAccessRotations();`,`function rakApplyShiftAccess() {
  if(typeof document==='undefined') return;
  const allowed=rakCanAccessRotations();
  ${MARK}
  // Three evenly spaced entries only when Rotace is unavailable. Do not touch D layout.
  const nav=document.querySelector('nav.bottomNav');
  if(nav&&nav.classList) nav.classList.toggle('rakBottomNavWithoutRotace17024',!allowed);`,'nav state');
  s=swap(s,'    if (!vacationCountdownMonthHasSchedule(monthKey) && !seen.has(key)) {',
    "    // The saved rotation belongs exclusively to D; it must not suppress the A/B/C cycle.\n    if ((targetTeam !== 'D' || !vacationCountdownMonthHasSchedule(monthKey)) && !seen.has(key)) {",'outside shift count');
  s=swap(s,'  return activeCount + count + countVacationCountdownRotationScheduledShifts(source, target, targetTeam);',
    "  return activeCount + count + (targetTeam === 'D' ? countVacationCountdownRotationScheduledShifts(source, target, targetTeam) : 0);",'D-only roster count');
  return s;
});
const css=update('styles-admin-polish.css',s=>s.includes(MARK)?s+'' : s+`
/* ${MARK}: A/B/C only. Three available buttons consume three equal slots. */
html body nav.bottomNav.rakBottomNavWithoutRotace17024 #bottomNavScroll {
  display:grid !important;
  grid-template-columns:repeat(3,minmax(0,1fr)) !important;
  justify-content:stretch !important;
  justify-items:stretch !important;
  width:100% !important;
  gap:4px !important;
  overflow:visible !important;
  scroll-snap-type:none !important;
}
html body nav.bottomNav.rakBottomNavWithoutRotace17024 #bottomNavScroll > button.bottomNavBtn:not([hidden]) {
  grid-column:auto !important;
  justify-self:stretch !important;
  align-self:center !important;
  box-sizing:border-box !important;
  width:100% !important;
  min-width:0 !important;
  max-width:none !important;
  margin:0 !important;
}
html body nav.bottomNav.rakBottomNavWithoutRotace17024 #bottomNavScroll > button[data-action="rotace"] {
  display:none !important;
}
`);
const auth=update('app-admin-unlock.js',s=>{
  if(s.includes(MARK))return s;
  const helper=`${MARK}
// Registered RaK identities include both D rotation workers and workers outside the roster.
// Keep machine/rotation membership completely separate from report authorization.
function rakAdminAppIdentity17024(accountId) {
  const id=String(accountId||'').trim();
  if(!/^\\d{4}$/.test(id))return null;
  const roster=typeof getRakWorkerRosterSettings==='function'?getRakWorkerRosterSettings():null;
  const rows=[].concat(Array.isArray(roster&&roster.workers)?roster.workers:[],
    Array.isArray(roster&&roster.appAccounts)?roster.appAccounts:[]);
  const found=rows.find(row=>String(row&&row.loginNumber||'').trim()===id);
  return found?{id,name:String(found.name||'').trim(),outside:(roster.appAccounts||[]).includes(found)}:null;
}

`;
  s=swap(s,'function readAdminAccountsSecureDraftRowsFromDom(root) {',helper+'function readAdminAccountsSecureDraftRowsFromDom(root) {','identity helper');
  s=swap(s,`    displayName: String(row.querySelector('[data-admin-account-label]')?.value || '').trim(),`,
    `    displayName: String(row.querySelector('[data-admin-account-label]')?.value || '').trim()
      || String(rakAdminAppIdentity17024(row.querySelector('[data-admin-account-id]')?.value)?.name || '').trim(),`,'autofill existing account name');
  s=swap(s,'  const desired = readAdminAccountsSecureDraftRowsFromDom(root);\n  const duplicateIds =',`  const desired = readAdminAccountsSecureDraftRowsFromDom(root);
  // Existing app-only accounts are legitimate deputies. If roster settings have not
  // loaded yet, resolve the same identity against RaK's login directory instead.
  for(const entry of desired){
    if(!entry.accountId || !/^\\d{4}$/.test(entry.accountId))continue;
    const local=rakAdminAppIdentity17024(entry.accountId);
    if(local&&local.name){
      if(!entry.displayName)entry.displayName=local.name;
      continue;
    }
    if(typeof window.rakUserProfileLookup==='function'){
      try{
        const result=await window.rakUserProfileLookup(entry.accountId);
        if(result&&result.ok&&String(result.accountNumber||'').trim()===entry.accountId){
          if(!entry.displayName)entry.displayName=String(result.fullName||'').trim();
          continue;
        }
      }catch(err){}
    }
    // A saved existing admin can still be disabled if the ordinary login was retired.
    const existing=(Array.isArray(app.adminProfilesV2)?app.adminProfilesV2:[]).some(profile=>
      String(profile&&profile.account_id||'')===entry.accountId);
    if(!existing)return {ok:false,reason:'account-not-in-login-directory'};
  }
  const duplicateIds =`,'login account verification + fallback');
  s=swap(s,"const rows = settings.admins.concat(Array.from({ length: 4 }, () => ({ accountId: '', label: '', passwordHash: '', enabled: true })));",
    `const rows = settings.admins.concat(Array.from({ length: 4 }, () => ({ accountId: '', label: '', passwordHash: '', enabled: true })));
  const roster=typeof getRakWorkerRosterSettings==='function'?getRakWorkerRosterSettings():null;
  const availableAccounts=[].concat(Array.isArray(roster&&roster.workers)?roster.workers:[],
    Array.isArray(roster&&roster.appAccounts)?roster.appAccounts:[])
    .filter(row=>row&&/^\\d{4}$/.test(String(row.loginNumber||'')));
  const accountOptions='<datalist id="rakAdminExistingAccounts17024">'+availableAccounts.map(row=>
    '<option value="'+escapeHtml(row.loginNumber)+'" label="'+escapeHtml(row.name)+'"></option>').join('')+'</datalist>';`,'registered account suggestions');
  s=swap(s,'data-admin-account-id value="','data-admin-account-id list="rakAdminExistingAccounts17024" value="','select registered identity');
  s=swap(s,'    buildAdminAccountsStatusHtml({ rows }),\n    buildAdminAccountsRoleOverviewHtml(settings),',
    '    buildAdminAccountsStatusHtml({ rows }),\n    accountOptions,\n    buildAdminAccountsRoleOverviewHtml(settings),','show registered accounts list');
  return s;
});
const menu=update('app-menu.js',s=>{
  if(s.includes(MARK))return s;
  s=swap(s,"          if (!secureResult.ok) throw (secureResult.error || new Error('Uložení správců selhalo: ' + String(secureResult.reason || 'neznámá chyba')));",
    `          ${MARK}
          if (!secureResult.ok) throw (secureResult.error || new Error(secureResult.reason === 'account-not-in-login-directory'
            ? 'Osobní číslo není v přihlašovacích účtech RaK. Ulož pracovníka v Účty aplikace a znovu načti správce.'
            : 'Uložení správců selhalo: ' + String(secureResult.reason || 'neznámá chyba')));`,'clear lookup status');
  return s;
});
// The legacy finalizer detects releases by index and replays all intermediate stages.
// Recognize the latest build before it resets the index to the 1.7.15 compatibility marker.
update('tools/shift-report-mo-hotfix-170-smoke.mjs',s=>{
  if(s.includes('// RAK_17024_TWO_PASS_GUARD'))return s;
  s=swap(s,`const already17023=indexSource.includes("var build='v1.7.23-rotationslim1';");`,
    `// RAK_17024_TWO_PASS_GUARD
const already17024=indexSource.includes("var build='${BUILD}';");
const already17023=(already17024||indexSource.includes("var build='v1.7.23-rotationslim1';"));`,'repeated-build detection');
  s=swap(s,`const old=already17022?(already17023?"var build='v1.7.23-rotationslim1';":"var build='v1.7.22-admincompact1';"):already17021?`,
    `const old=already17022?(already17024?"var build='${BUILD}';":already17023?"var build='v1.7.23-rotationslim1';":"var build='v1.7.22-admincompact1';"):already17021?`,'index reset for second pass');
  return s;
});
update('supabase-config.js',s=>{
  assert(s.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!s.includes('bkqamcbkiwumsvelahxr'),'only isolated test Supabase');
  return swap(swap(swap(s,'window.RAK_RELEASE_VERSION = "1.7.23";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'config release'),
    'window.RAK_TEST_DISPLAY_VERSION = "1.7.23";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'config display'),
    'window.RAK_PWA_BUILD = "v1.7.23-rotationslim1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'config build');
});
update('app.js',s=>swap(swap(s,'const RAK_DEV_UPDATE_BUILD = "v1.7.23-rotationslim1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build'),
  'window.RAK_RELEASE_VERSION = "1.7.23";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version'));
update('sw.js',s=>{
  assert(s.includes("const SW_APP_VERSION = '1.7.0';"),'technical version unchanged');
  return swap(swap(swap(s,"const CACHE_VERSION = 'v1.7.23';",`const CACHE_VERSION = 'v${VERSION}';`,'cache'),
    "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.23';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW label'),
    "const DEVELOPMENT_BUILD_ID = 'v1.7.23-rotationslim1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');
});
update('index.html',s=>swap(s,"var build='v1.7.23-rotationslim1';",`var build='${BUILD}';`,'index release'));
// Behavioral tests: the actual deployed function, simulated four-week team engine,
// and a registered outside user that has no D roster membership.
const a=core.indexOf('function getVacationCountdownTeamShiftCount(now, targetStart, team) {');
const b=core.indexOf('\nfunction getVacationCountdown(now)',a);
assert(a>=0&&b>a,'countdown function boundaries');
const epoch=new Date(2026,8,18,6).getTime(),DAY=86400000;
const shiftStarts=Array.from({length:90},(_,i)=>new Date(epoch+i*DAY)).filter((_,i)=>i%2===0);
const state=(cursor,team)=>{
  const now=cursor.getTime();const next=shiftStarts.find(start=>start.getTime()>now);
  const active=shiftStarts.find(start=>start.getTime()<=now&&start.getTime()+12*3600000>now);
  return active?{active:true,start:active,end:new Date(active.getTime()+12*3600000)}:{active:false,next:next?{start:next,end:new Date(next.getTime()+12*3600000)}:null};
};
const testCtx={Date,Set,Number,String,getTeamShiftState:state,parseVacationCountdownDateTime:value=>new Date(value),getVacationCountdownActiveTeamShiftStart:()=>null,getVacationCountdownMonthKey:()=> '9/26',vacationCountdownMonthHasSchedule:()=>true,countVacationCountdownRotationScheduledShifts:()=>12};
vm.runInNewContext(core.slice(a,b)+'\nthis.count=getVacationCountdownTeamShiftCount;',testCtx);
const beginDate=new Date(2026,8,18,0),endDate=new Date(2026,9,20,0);
assert(testCtx.count(beginDate,endDate,'A')>10,'A shifts must be counted despite loaded D rotation');
assert(testCtx.count(beginDate,endDate,'B')>10,'B shifts must be counted despite loaded D rotation');
assert.equal(testCtx.count(beginDate,endDate,'D'),12,'D count from saved rotation must remain unchanged');
const identityStart=auth.indexOf('function rakAdminAppIdentity17024(accountId) {');
const identityEnd=auth.indexOf('\nfunction readAdminAccountsSecureDraftRowsFromDom(',identityStart);
assert(identityStart>=0&&identityEnd>identityStart,'registered identity function');
const authCtx={getRakWorkerRosterSettings:()=>({workers:[{name:'Tým D',loginNumber:'1111'}],appAccounts:[{name:'Testák',loginNumber:'2222',shiftTeam:'A'}]})};
vm.runInNewContext(auth.slice(identityStart,identityEnd)+'\nthis.lookup=rakAdminAppIdentity17024;',authCtx);
assert.equal(authCtx.lookup('2222').name,'Testák','outside account recognized');
assert.equal(authCtx.lookup('2222').outside,true,'outside distinction retained');
assert.equal(authCtx.lookup('1111').outside,false,'D worker unchanged');
assert.equal(authCtx.lookup('9999'),null,'unregistered account not inferred');
assert(auth.includes("role: String(row.querySelector('[data-admin-account-role]')?.value || 'admin')"),'deputy role selection retained');
assert(auth.includes("['admin', 'deputy'].includes(entry.role)"),'role validation retained');
assert(auth.includes("window.rakUserProfileLookup(entry.accountId)"),'login directory fallback is live');
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))')&&css.includes('rakBottomNavWithoutRotace17024'),'three equal nav slots only when Rotace hidden');
assert(core.includes("nav.classList.toggle('rakBottomNavWithoutRotace17024',!allowed)"),'D retains original nav');
assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('const already17024='),'second pass release recognized');
assert(read('supabase-config.js').includes(`window.RAK_RELEASE_VERSION = "${VERSION}";`)&&read('index.html').includes(`var build='${BUILD}';`),'release markers');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version');
for(const file of ['core.js','app-admin-unlock.js','app-menu.js','app.js','supabase-config.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log('[cross-shift-fixes-17024] OK three nav slots only for A/B/C, live registered outside-account deputy lookup, A/B synthetic shift count >10 with D roster, D count=12 unchanged, role gates, PWA markers/test Supabase');
