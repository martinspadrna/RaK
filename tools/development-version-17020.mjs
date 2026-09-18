#!/usr/bin/env node
// RaK 1.7.20: final application stage after the frozen 1.7.19 baseline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
await import('./shift-team-17020-impl.mjs');
const path='dashboard.js', marker='// RAK_OUTSIDE_NO_D_ROSTER_HERO_17020';
let source=fs.readFileSync(path,'utf8');
if(!source.includes(marker)) {
  const old="  const name = String(profile && profile.fullName || '').trim();\n  if (!name || typeof getPersonScheduleEntries !== 'function'";
  const replacement="  const name = String(profile && profile.fullName || '').trim();\n  " + marker + "\n  // Even if an outside account happens to share a surname with a D worker,\n  // never borrow that worker's machine, tasks or absence from the D roster.\n  if (typeof getRakActiveAccountShiftInfo === 'function' && getRakActiveAccountShiftInfo().outside)\n    return {name, active:null, next:null, absence:null};\n  if (!name || typeof getPersonScheduleEntries !== 'function'";
  assert(source.includes(old),'outside D roster guard anchor');
  source=source.replace(old,replacement);
  const oldDetail="    if (!accessOverview.length) detail = 'Další směna zatím není k dispozici.';";
  const newDetail="    if (!accessOverview.length) detail = accountTeam === 'D'\n      ? 'Další směna zatím není k dispozici.'\n      : (teamD.active ? 'Právě probíhá směna ' + accountTeam + '.'\n        : (teamD.next ? 'Nejbližší směna: ' + formatDashboardNextShiftMeta(teamD.next) : 'Termín další směny není k dispozici.'));";
  assert(source.includes(oldDetail),'own shift hero detail anchor');
  source=source.replace(oldDetail,newDetail);
  fs.writeFileSync(path,source,'utf8');
}
execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(source.includes(marker)&&source.includes('getRakActiveAccountShiftInfo().outside')&&source.includes('Nejbližší směna: '),'outside hero guard must survive both builds');
const begin=source.indexOf('function getDashboardPersonalShiftStatus(now) {');
const end=source.indexOf('function dashboardPersonalTaskText(entry)',begin);
assert(begin>=0&&end>begin,'personal shift status test bounds');
let called=0;
const ctx={getDashboardActiveProfile:()=>({fullName:'Novotný Jan'}),getRakActiveAccountShiftInfo:()=>({outside:true,team:'A'}),getPersonScheduleEntries:()=>{called++;return {entries:[]};},getPersonScheduleEntryWindow:()=>null,getDashboardScheduleName:()=>{called++;return 'Novotný';}};
vm.runInNewContext(source.slice(begin,end)+'\nthis.getStatus=getDashboardPersonalShiftStatus;',ctx);
const status=ctx.getStatus(new Date('2026-09-18T10:00:00Z'));
assert.equal(called,0,'outside worker must never query D rotation');
assert.equal(status.active,null);assert.equal(status.next,null);assert.equal(status.absence,null);
console.log('[development-version-17020] OK outside-roster identity isolated from D roster even for matching surnames; own-shift hero detail verified');
await import('./development-version-17021.mjs');
