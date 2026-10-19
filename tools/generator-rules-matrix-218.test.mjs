import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rotationAmendFixture} from './rotation-amend-fixture-217.mjs';

const names=['Blažek','Kmínek','Kříž','Novotný','Pech','Starý','Střížek','Synek','Třasák','Špadrna'];
const fullSkills=['MSK','MFK','TNK','TBK','TPKW01','TPKW02'];
const softCoreSkills=['MSK','MFK','TNK','TPKW01','TPKW02'];
const skillMap=Object.fromEntries(names.map(name=>[name,['Střížek','Synek','Třasák'].includes(name)?softCoreSkills:fullSkills]));

function initialMonths(){
 const source=fs.readFileSync(new URL('../data.js',import.meta.url),'utf8');
 const match=source.match(/^const initialRotationData = (\{.*\});$/m);
 assert(match,'initial rotation JSON');
 return JSON.parse(match[1]).months;
}

function rosterRow(){
 return {machine_key:'WORKER_ROSTER_SETTINGS',category:'frezka',settings_json:{
  type:'worker_roster_settings',stored_category:'worker_roster_settings',custom:true,
  workers:names.map(name=>({name,active:true,machines:skillMap[name]})),appAccounts:[]
 }};
}

function setup(){
 const f=rotationAmendFixture();
 f.context.app.rotation={months:initialMonths()};
 f.context.app.machineSettingsRows=[rosterRow()];
 return f;
}

function clone(value){return JSON.parse(JSON.stringify(value));}
function dates(month){return month.hard.rows.map(row=>row.date);}
function absenceNote(date,person){
 const shift=(String(date).match(/\b(R8|N8|R|N)\b/)||[])[1]||'';
 return {date,person,code:'D',shift,text:person+' D'};
}
function prepareMonth(template,absencePlan){
 const month=clone(template);
 for(const section of ['hard','soft'])month[section].rows.forEach(row=>{row.cells=Array(5).fill('');});
 month.notes=[];
 dates(month).forEach((date,rowIdx)=>{
  const count=absencePlan(rowIdx,date);
  for(let i=0;i<count;i++)month.notes.push(absenceNote(date,names[(rowIdx*3+i)%names.length]));
 });
 return month;
}
function rowNames(month,rowIdx){
 return [...month.hard.rows[rowIdx].cells,...month.soft.rows[rowIdx].cells].filter(Boolean);
}
function validatePhysicalRows(f,month,monthKey){
 const hardMachines=['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
 const softMachines=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
 dates(month).forEach((date,rowIdx)=>{
  const absent=new Set(month.notes.filter(note=>note.date===date).map(note=>note.person));
  const assigned=rowNames(month,rowIdx);
  assert.equal(new Set(assigned).size,assigned.length,monthKey+' '+date+' duplicate worker');
  assigned.forEach(person=>assert(!absent.has(person),monthKey+' '+date+' absent worker '+person));
  month.hard.rows[rowIdx].cells.forEach((person,machineIdx)=>{
   if(person)assert(skillMap[person].includes(f.evaluate(`adminRotationGeneratorMachineGroupForName(${JSON.stringify(hardMachines[machineIdx])})`)),monthKey+' '+date+' hard qualification '+person);
  });
  month.soft.rows[rowIdx].cells.forEach((person,machineIdx)=>{
   if(person)assert(skillMap[person].includes(f.evaluate(`adminRotationGeneratorMachineGroupForName(${JSON.stringify(softMachines[machineIdx])})`)),monthKey+' '+date+' soft qualification '+person);
  });
  const count=absent.size;
  const hardFilled=month.hard.rows[rowIdx].cells.filter(Boolean).length;
  const softFilled=month.soft.rows[rowIdx].cells.filter(Boolean).length;
  if(count===0){assert.equal(hardFilled,5,monthKey+' '+date+' hard 0 absence');assert.equal(softFilled,5,monthKey+' '+date+' soft 0 absence');}
  if(count===1){assert.equal(hardFilled,5,monthKey+' '+date+' hard 1 absence');assert.equal(softFilled,4,monthKey+' '+date+' soft 1 absence');assert.equal(month.soft.rows[rowIdx].cells[3],'',monthKey+' '+date+' MFKF06');}
  if(count===2){assert.equal(hardFilled,5,monthKey+' '+date+' hard 2 absences');assert.equal(softFilled,3,monthKey+' '+date+' soft 2 absences');assert.equal(month.soft.rows[rowIdx].cells[0],'',monthKey+' '+date+' MSKC01');assert.equal(month.soft.rows[rowIdx].cells[3],'',monthKey+' '+date+' MFKF06');}
  if(count===3){assert.equal(hardFilled,4,monthKey+' '+date+' hard 3 absences');assert.equal(month.hard.rows[rowIdx].cells[3],'',monthKey+' '+date+' TPKW02');assert.equal(softFilled,3,monthKey+' '+date+' soft 3 absences');assert.equal(month.soft.rows[rowIdx].cells[0],'',monthKey+' '+date+' MSKC01');assert.equal(month.soft.rows[rowIdx].cells[3],'',monthKey+' '+date+' MFKF06');}
 });
}

function generateFutureSequence(){
 const f=setup();
 const generated={};
 for(const monthKey of ['6/26','7/26','8/26','9/26','10/26','11/26','12/26']){
  const template=f.context.app.rotation.months[monthKey];
  assert(template,monthKey+' template');
  const prepared=prepareMonth(template,(rowIdx)=>rowIdx%4);
  f.context.prepared=prepared;f.context.monthKey=monthKey;
  let result;
  try{
   result=f.evaluate("adminGenerateRotationMonthDraft(monthKey,prepared,{ignoreDom:true,persistPending:false})");
  }catch(error){
   throw new Error(monthKey+' generation failed: '+String(error&&error.message||error),{cause:error});
  }
  const normalized=clone(result.normalized);
  f.context.generated=normalized;
  const errors=clone(f.evaluate("adminRotationValidateMonthRules(generated,monthKey,{source:'generator'}).issues.filter(issue=>issue.severity==='error')"));
  assert.deepEqual(errors,[],monthKey+' '+JSON.stringify(errors));
  validatePhysicalRows(f,normalized,monthKey);
  generated[monthKey]=normalized;
  f.context.app.rotation.months[monthKey]=normalized;
 }
 return {f,generated};
}

test('current TEST roster qualifications and all configured generator rules are exercised',()=>{
 const f=setup();
 assert.deepEqual(Array.from(f.evaluate('adminGetKnownNames()')),names.slice().sort((a,b)=>a.localeCompare(b,'cs')));
 const rules=clone(f.evaluate('getAdminRotationGeneratorRules()'));
 assert.deepEqual(rules.softCore,['Synek','Třasák','Střížek']);
 assert.deepEqual(rules.softHardCycle,['TNKS01','TPKW01','TPKW02']);
 assert.equal(rules.softHardBlockLength,3);
 assert.deepEqual(rules.hardCycle,['TBKR01','TNKS01','TBKR07','TPKW01','TPKW02']);
 assert.equal(rules.soloMillBalanceEnabled,true);assert.equal(rules.soloMillMaxSpread,1);
 assert.equal(rules.softTotalBalanceEnabled,true);assert.equal(rules.softTotalMaxSpread,1);
 assert.equal(rules.hardPeopleSoftKindBalanceEnabled,true);assert.equal(rules.hardPeopleSoftKindMaxSpread,1);
 for(const [name,skills] of Object.entries(skillMap))assert.deepEqual(Array.from(f.evaluate(`getWorkerMachineSkills(${JSON.stringify(name)})`)),skills);
});

test('one inactive worker plus two absences uses the seven-person 4 TO + 3 MO layout',()=>{
 const f=setup();
 const roster=f.context.app.machineSettingsRows[0].settings_json.workers;
 roster.find(worker=>worker.name==='Špadrna').active=false;
 const monthKey='11/26';
 const prepared=prepareMonth(f.context.app.rotation.months[monthKey],rowIdx=>rowIdx===0?2:0);
 f.context.prepared=prepared;
 const result=f.evaluate("adminGenerateRotationMonthDraft('11/26',prepared,{ignoreDom:true,persistPending:false})");
 const generated=clone(result.normalized);
 assert.equal(generated.hard.rows[0].cells.filter(Boolean).length,4);
 assert.equal(generated.soft.rows[0].cells.filter(Boolean).length,3);
 assert.equal(generated.hard.rows[0].cells[3],'','TPKW02 must remain empty with seven available workers');
 assert.equal(generated.soft.rows[0].cells[0],'','MSKC01 must remain empty with seven available workers');
 assert.equal(generated.soft.rows[0].cells[3],'','MFKF06 must remain empty with seven available workers');
 f.context.generated=generated;
 const errors=clone(f.evaluate("adminRotationValidateMonthRules(generated,'11/26',{source:'generator'}).issues.filter(issue=>issue.severity==='error')"));
 assert.deepEqual(errors,[]);
});

test('staffing uses active people per day, including reactivation and changing absences',()=>{
 const f=setup();
 const crew=names.filter(name=>!['Synek','Třasák','Střížek','Špadrna'].includes(name));
 const core=['Synek','Třasák','Střížek'];
 for(const activeCount of [7,8,9,10]){
  const active=new Set(core.concat(crew.slice(0,activeCount-7),crew.slice(0,4),activeCount>=8?['Špadrna']:[]));
  // The transition 7 -> 8 explicitly reactivates Špadrna; additional names can rejoin as well.
  if(activeCount===9)active.add(crew[4]);
  if(activeCount===10)crew.forEach(name=>active.add(name));
  assert.equal(active.size,activeCount,'fixture count '+activeCount);
  f.context.app.machineSettingsRows[0].settings_json.workers.forEach(worker=>{worker.active=active.has(worker.name);});
  for(const absentCount of [0,1]){
   const unavailable=Array.from(active).filter(name=>name!=='Špadrna').slice(0,absentCount);
   const monthKey='11/26',prepared=prepareMonth(f.context.app.rotation.months[monthKey],()=>0);
   if(absentCount)prepared.notes.push(absenceNote(prepared.hard.rows[0].date,unavailable[0]));
   f.context.prepared=prepared;
   let actual;
   try { actual=clone(f.evaluate("adminGenerateRotationMonthDraft('11/26',prepared,{ignoreDom:true,persistPending:false}).normalized")); }
   catch(error) { throw new Error('active '+activeCount+', absent '+absentCount+': '+String(error&&error.message||error),{cause:error}); }
   const day=actual.hard.rows[0].cells.concat(actual.soft.rows[0].cells).filter(Boolean);
   const availableCount=activeCount-absentCount;
   const expectedHard=availableCount===7?4:Math.min(5,availableCount);
   assert.equal(new Set(day).size,day.length,'no duplicates at '+activeCount+'/'+absentCount);
   assert.equal(day.length,availableCount,'all available people at '+activeCount+'/'+absentCount);
   assert(day.every(name=>active.has(name)&&!unavailable.includes(name)),'no absent or inactive workers');
   assert.equal(actual.hard.rows[0].cells.filter(Boolean).length,expectedHard,'TO from availability '+availableCount);
   assert.equal(actual.soft.rows[0].cells.filter(Boolean).length,availableCount-expectedHard,'MO from availability '+availableCount);
   f.context.generated=actual;
   const errors=clone(f.evaluate("adminRotationValidateMonthRules(generated,'11/26',{source:'generator'}).issues.filter(issue=>issue.severity==='error')"));
   assert.deepEqual(errors,[],'hard rules '+activeCount+'/'+absentCount+': '+JSON.stringify(errors));
  }
 }
});

test('seven real D-shift month templates preserve all hard rules for 0/1/2/3 absences and month boundaries',()=>{
 const {f,generated}=generateFutureSequence();
 assert.equal(f.evaluate("adminRotationGeneratorShouldSplitPressMachines('7.6. N8','6/26',generatedMonth)".replace('generatedMonth','app.rotation.months[\'6/26\']')),true);
 assert.equal(f.evaluate("adminRotationGeneratorShouldSplitPressMachines('19.7. N8','7/26',app.rotation.months['7/26'])"),false);
 assert.equal(f.evaluate("adminRotationGeneratorShouldSplitPressMachines('22.11. R8','11/26',app.rotation.months['11/26'])"),true);
 assert.equal(Object.keys(generated).length,7);
});

test('every possible start row of current-month amendment freezes its prefix and keeps suffix rules valid',()=>{
 const {f,generated}=generateFutureSequence();
 const source=generated['10/26'];
 const allDays=dates(source);
 for(let startIdx=0;startIdx<allDays.length;startIdx++){
  const startDate=f.evaluate(`adminRotationGeneratorDateLabelToIso(${JSON.stringify(allDays[startIdx])},'10/26')`);
  const selected=allDays.slice(startIdx);
  const absences=selected.map((date,idx)=>({date,rows:Array.from({length:idx%4},(_,n)=>({person:names[(startIdx+idx+n)%names.length],code:'D'}))}));
  f.context.source=clone(source);f.context.startDate=startDate;f.context.selected=selected;f.context.absences=absences;
  f.evaluate("adminRotationGeneratorSetWizardState({mode:'amend',monthKey:'10/26',startDate,sourceMonth:source,days:selected,absencesByDay:absences,result:null})");
  f.context.prepared=f.evaluate('adminRotationGeneratorEnsurePreparedMonthFromWizard()');
  let result;
  try{
   result=f.evaluate("adminGenerateRotationMonthDraft('10/26',prepared,{ignoreDom:true,persistPending:false,mutableDateLabels:selected,baselineMonth:source})");
  }catch(error){
   throw new Error('amend start '+allDays[startIdx]+' failed: '+String(error&&error.message||error),{cause:error});
  }
  f.context.candidate=clone(result.normalized);
  f.evaluate("adminRotationGeneratorAssertAmendPrefix(source,candidate,adminRotationGeneratorGetWizardState())");
  for(const section of ['hard','soft'])assert.deepEqual(f.context.candidate[section].rows.slice(0,startIdx),source[section].rows.slice(0,startIdx),'prefix '+startIdx+' '+section);
  const errors=clone(f.evaluate("adminRotationValidateMonthRules(candidate,'10/26',{source:'generator'}).issues.filter(issue=>issue.severity==='error'&&adminRotationUnplannedIssueTouchesSelectedDate(issue,selected))"));
  assert.deepEqual(errors,[],'start '+allDays[startIdx]+' '+JSON.stringify(errors));
 }
});

test('all seven TO-qualified workers take turns on TO and MO, cycling several machines',()=>{
 const f=setup();
 const prepared=prepareMonth(f.context.app.rotation.months['11/26'],()=>0);
 f.context.prepared=prepared;
 const output=clone(f.evaluate("adminGenerateRotationMonthDraft('11/26',prepared,{ignoreDom:true,persistPending:false}).normalized"));
 const core=new Set(['Synek','Třasák','Střížek']);
 const crew=names.filter(name=>!core.has(name));
 const machines=['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
 const totals=Object.fromEntries(crew.map(name=>[name,{hard:0,soft:0,machines:new Set(),same:0,next:0,transitions:0}]));
 const last=Object.create(null);
 for(let i=0;i<output.hard.rows.length;i++){
  output.hard.rows[i].cells.forEach((name,idx)=>{
   if(!totals[name])return;
   totals[name].hard++;
   totals[name].machines.add(machines[idx]);
   if(last[name]){
    totals[name].transitions++;
    if(last[name]===machines[idx])totals[name].same++;
    if(machines[(machines.indexOf(last[name])+1)%machines.length]===machines[idx])totals[name].next++;
   }
   last[name]=machines[idx];
  });
  output.soft.rows[i].cells.forEach(name=>{if(totals[name])totals[name].soft++;});
 }
 const report=Object.fromEntries(crew.map(name=>[name,{hard:totals[name].hard,soft:totals[name].soft,hardKinds:totals[name].machines.size,same:totals[name].same,next:totals[name].next,transitions:totals[name].transitions}]));
 console.log('[hard-cycle-fairness-222] '+JSON.stringify(report));
 for(const name of crew){
  assert(totals[name].hard>0&&totals[name].soft>0,name+' must work both TO and MO');
  assert(totals[name].machines.size>=3,name+' should rotate across several TO machines');
 }
 const softCounts=crew.map(name=>totals[name].soft);
 assert(Math.max(...softCounts)-Math.min(...softCounts)<=4,'Crew MO counts should be comparable: '+JSON.stringify(report));
 const correct=crew.reduce((sum,name)=>sum+totals[name].next,0);
 const all=crew.reduce((sum,name)=>sum+totals[name].transitions,0);
 console.log('[hard-cycle-sequence-222] '+JSON.stringify({correct,all,rate:all?correct/all:0}));
 assert(correct>=Math.ceil(all*0.6),'At least 60% of TO steps should be exact next-cycle moves with non-negotiable rules preserved');
});
