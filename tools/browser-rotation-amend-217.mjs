#!/usr/bin/env node
// Real Chromium, synthetic local rotation only. No account, database or external network access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {rotationAmendFixtureSource,sampleMonthSource} from './rotation-amend-fixture-217.mjs';

const root=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'Real Chromium is required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-amend-217-'));
const source=rotationAmendFixtureSource().replaceAll('</script','<\\/script');
const css=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="(styles[^"]+\.css)"/g)]
  .map(match=>match[1]).map(file=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(root,file)).href+'">').join('');
const sicknessIcs='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261012\nDTEND;VALUE=DATE:20261026\nSUMMARY:Blažek N\nEND:VEVENT\nEND:VCALENDAR';

function probe(sampleExpression,ics){
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 const clickAction=action=>{
  const button=document.querySelector('[data-admin-action="'+action+'"]');
  check(button,'missing action '+action);
  adminHandleRotationGeneratorWizardAction(action,button);
 };
 const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
 return (async()=>{
  try{
   const NativeDate=Date;
   window.Date=class extends NativeDate{
    constructor(...args){super(...(args.length?args:['2026-10-14T12:00:00+02:00']));}
    static now(){return new NativeDate('2026-10-14T12:00:00+02:00').getTime();}
   };
   const current=(0,eval)(sampleExpression);
   app.rotation.months={'9/26':JSON.parse(JSON.stringify(current).replaceAll('.10.','.9.')),'10/26':current};
   app.selectedMonth='10/26';
   const before=JSON.stringify(app.rotation);
   window.__onlineWrites=0;
   window.saveRotationToSupabase=async()=>{window.__onlineWrites++;return {ok:true};};
   window.renderRotace=()=>{};window.renderMonth=()=>{};window.saveRotationData=()=>{};
   window.confirm=()=>true;

   adminOpenRotationGeneratorWizard('10/26');
   check(document.querySelector('[data-admin-action="generator-amend-current"]'),'amend choice');
   clickAction('generator-amend-current');
   const start=document.querySelector('#adminGeneratorStartDate');
   check(start&&start.value==='2026-10-14','today default');
   start.value='2026-10-12';
   clickAction('generator-amend-next');
   const dayInputs=[...document.querySelectorAll('[data-generator-day-date]')];
   check(dayInputs.length===15&&dayInputs[0].value==='12.10. R'&&dayInputs.at(-1).value==='26.10. R','suffix day range');
   clickAction('generator-days-next');
   adminRotationGeneratorActiveShiftCalendarSources=()=>({team:'D',sources:['fixture-calendar']});
   window.fetch=async()=>({ok:true,status:200,text:async()=>ics});
   const loaded=await adminRotationGeneratorLoadCalendarAbsences();
   check(loaded.ok&&loaded.importedCount===14,'calendar illness import');
   const wizard=adminRotationGeneratorGetWizardState();
   const absenceDates=wizard.absencesByDay.filter(day=>day.rows.some(row=>row.person==='Blažek'&&row.code==='N')).map(day=>day.date);
   check(absenceDates.length===14&&absenceDates[0]==='12.10. R'&&absenceDates.at(-1)==='25.10. R','exclusive calendar end');
   clickAction('generator-run');
   const result=adminRotationGeneratorGetWizardState().result;
   check(result&&result.normalized,'generated result');
   adminRotationGeneratorAssertAmendPrefix(current,result.normalized,adminRotationGeneratorGetWizardState());
   for(const section of ['hard','soft'])for(const row of result.normalized[section].rows.slice(11,25))check(!row.cells.includes('Blažek'),'absence leaked into '+row.date);
   check(JSON.stringify(app.rotation)===before&&window.__onlineWrites===0,'generator must remain a local draft');
   check(adminRotationGeneratorGetPendingDraft('10/26')!==null,'pending draft');

   const manual=JSON.parse(JSON.stringify(current));
   for(const row of manual.hard.rows.slice(0,2))row.cells[0]='Blažek';
   for(const row of manual.soft.rows.slice(0,2)){row.cells[3]='';row.cells[4]='Špadrna';}
   const violations=adminRotationBuildManualRuleOverrideState('10/26',manual).blockingIssues;
   check(violations.some(issue=>issue.type==='consecutive-tnks')&&violations.some(issue=>issue.type==='consecutive-solo-mill'),'manual violation detection');
   const cancelPromise=saveAdminRotationFromDom('10/26',{normalizedMonth:manual});
   await wait();
   let modal=document.querySelector('#adminRotationRuleOverrideModal');
   check(modal&&getComputedStyle(modal).zIndex==='2147483647','visible rule warning');
   const cancel=modal.querySelector('[data-admin-rule-override="cancel"]');
   cancel.scrollIntoView({block:'nearest'});
   const cancelBox=cancel.getBoundingClientRect();
   check(cancelBox.top>=0&&cancelBox.bottom<=innerHeight&&cancelBox.height>=44,'cancel reachable on narrow mobile');
   cancel.click();
   const cancelled=await cancelPromise;
   check(cancelled.saveResult.reason==='user-cancelled'&&window.__onlineWrites===0,'cancel blocks save');

   const savePromise=saveAdminRotationFromDom('10/26',{normalizedMonth:manual});
   await wait();
   modal=document.querySelector('#adminRotationRuleOverrideModal');
   const save=modal.querySelector('[data-admin-rule-override="save"]');
   check(save.textContent.trim()==='Přesto uložit','explicit override label');
   save.scrollIntoView({block:'nearest'});
   const saveBox=save.getBoundingClientRect();
   check(saveBox.top>=0&&saveBox.bottom<=innerHeight&&saveBox.height>=44,'override reachable on narrow mobile');
   save.click();
   const saved=await savePromise;
   check(saved.saveResult.ok===true&&saved.manualOverrideIssues.length>=2&&window.__onlineWrites===1,'approved exception saves once');
   check(app.rotation.months['10/26'].hard.rows[0].cells[0]==='Blažek','manual assignment retained');
   return {result:'PASS',width:innerWidth,checks:['today','suffix','calendar','prefix','local draft','manual cancel','manual override']};
  }catch(error){return {result:'FAIL',error:error&&error.message?error.message:String(error)};}
 })();
}

try{
 const html='<!doctype html><html><head><meta charset="utf-8">'+css+'<style>html,body{margin:0;min-height:100%;}#appMenuBody{width:320px;max-width:100vw;padding:10px;box-sizing:border-box;}</style></head><body><div id="appMenuBody"></div><pre id="probe">WAIT</pre><script>window.initialRotationData={months:{}};window.app={rotation:{months:{}},selectedMonth:"10/26",machineSettingsRows:[],adminUnlocked:true};</script><script>'+source+'</script><script>('+async function(sampleExpression,ics,probeSource){
   const result=await (0,eval)('('+probeSource+')')(sampleExpression,ics);
   document.querySelector('#probe').textContent=JSON.stringify(result);
  }.toString()+')('+JSON.stringify(sampleMonthSource)+','+JSON.stringify(sicknessIcs)+','+JSON.stringify(probe.toString())+');</script></body></html>';
 const file=path.join(dir,'index.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--allow-file-access-from-files','--disable-background-networking','--virtual-time-budget=12000','--window-size=320,640','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:60000,maxBuffer:8e6});
 assert.equal(run.status,0,'Chromium failed');
 const match=run.stdout.match(/<pre id="probe">([^<]+)<\/pre>/);
 assert(match&&match[1]!=='WAIT','Missing real browser result');
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(result.result,'PASS',JSON.stringify(result));
 console.log('[rotation-amend-217-browser]',JSON.stringify(result));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
