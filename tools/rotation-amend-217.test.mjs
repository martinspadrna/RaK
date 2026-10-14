import test from 'node:test';
import assert from 'node:assert/strict';
import {rotationAmendFixture,sampleMonthSource} from './rotation-amend-fixture-217.mjs';
export const sicknessIcs='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261012\nDTEND;VALUE=DATE:20261026\nSUMMARY:Blažek N\nEND:VEVENT\nEND:VCALENDAR';
function setup(start='2026-10-12'){
 const f=rotationAmendFixture();f.context.source=f.evaluate(sampleMonthSource);f.context.app.rotation.months={'9/26':JSON.parse(JSON.stringify(f.context.source).replaceAll('.10.','.9.')),'10/26':f.context.source};
 f.context.start=start;f.context.ics=sicknessIcs;
 f.evaluate("const days=adminRotationGeneratorAmendDays({monthKey:'10/26',startDate:start},adminRotationCollectMonthWorkDatesFromMonth(source));adminRotationGeneratorSetWizardState({mode:'amend',monthKey:'10/26',startDate:start,sourceMonth:source,days,absencesByDay:adminRotationGeneratorParseIcsAbsences(ics,'10/26',days)})");return f;
}
test('calendar sickness 12–25 is applied to the suffix; whole-month generation/balancing preserves every prior row/note and does not save online',()=>{
 const f=setup(),before=JSON.stringify(f.context.app.rotation);let writes=0;f.context.saveRotationToSupabase=()=>{writes++;throw Error('unexpected online write');};
 const result=f.evaluate("adminGenerateRotationMonthDraft('10/26',adminRotationGeneratorEnsurePreparedMonthFromWizard(),{ignoreDom:true,persistPending:false,mutableDateLabels:adminRotationGeneratorGetWizardState().days,baselineMonth:source})");
 assert.equal(result.days,15);assert(result.blockedByAbsence>=14);assert(result.filledCells>0);assert.equal(writes,0);assert.equal(JSON.stringify(f.context.app.rotation),before);
 f.context.generated=result.normalized;f.evaluate('adminRotationGeneratorAssertAmendPrefix(source,generated,adminRotationGeneratorGetWizardState())');
 const month=JSON.parse(JSON.stringify(result.normalized));
 for(const section of ['hard','soft']){
  assert.deepEqual(month[section].rows.slice(0,11),JSON.parse(JSON.stringify(f.context.source[section].rows.slice(0,11))));
  for(const row of month[section].rows.slice(11,25))assert(!row.cells.includes('Blažek'),row.date);
 }
 assert(month.notes.some(n=>n.date==='2.10. R'&&n.person==='Pech'));
 assert.equal(result.normalized.pressRotationOverrides['2.10. R'],'nosplit');
 assert(result.ruleWarnings.some(i=>i.type==='solo-mill-balance'),'frozen prefix / unavailable person can prevent exact monthly fairness');
 const errors=f.evaluate("adminRotationValidateMonthRules(generated,'10/26',{source:'generator'}).issues.filter(i=>i.severity==='error'&&adminRotationUnplannedIssueTouchesSelectedDate(i,adminRotationGeneratorGetWizardState().days))");
 assert.equal(errors.length,0,JSON.stringify(errors));
});
test('date bounds include the chosen day, retain R/N shifts, reject invalid dates and never fall back to full month on an empty suffix',()=>{
 const f=setup();assert.deepEqual(Array.from(f.evaluate("adminRotationGeneratorAmendDays({monthKey:'10/26',startDate:'2026-10-12'},['11.10. N','12.10. R','12.10. N','26.10. R'])")),['12.10. R','12.10. N','26.10. R']);
 for(const date of ['2026-09-30','2026-10-32','2026-11-01',''])assert.throws(()=>f.evaluate(`adminRotationGeneratorAmendDays({monthKey:'10/26',startDate:${JSON.stringify(date)}},[])`),/datum/);
 assert.throws(()=>f.evaluate("adminRotationGeneratorAmendDays({monthKey:'10/26',startDate:'2026-10-12'},['1.11. R'])"),/nepatří/);
 assert.equal(f.evaluate("adminRotationGeneratorResolveWizardDays({mode:'amend',monthKey:'10/26',startDate:'2026-10-31',days:[]}).length"),0);
});
test('current-month mode falls back to the stored month when no live editor snapshot exists',()=>{
 const f=setup();f.evaluate("adminRotationGeneratorSetWizardState({editorMonthKey:'10/26',editorMonth:null});adminRotationGeneratorStartAmend(adminRotationGeneratorGetWizardState())");
 const state=f.evaluate('adminRotationGeneratorGetWizardState()');assert.equal(state.monthKey,'10/26');assert.equal(state.mode,'amend');assert(state.sourceMonth.hard.rows.length>0);
});
test('all actual balancing and repair passes see frozen rows in counts but cannot mutate them',()=>{
 const f=setup();f.evaluate("adminRotationGeneratorMutableDates.set(source,new Set(['26.10. R']))");
 const before=JSON.stringify(f.context.source);f.evaluate("const model=adminBuildRotationGenerationModel('10/26'); for(const fn of [adminRotationGeneratorBalanceSoloMill,adminRotationGeneratorBalanceSoftTotals,adminRotationGeneratorBalanceSoftKind,adminRotationGeneratorBalanceKminekNovotnyMoTo,adminRotationGeneratorRepairEmptyHardCells,adminRotationGeneratorRepairConsecutiveTnks,adminRotationGeneratorRepairConsecutiveSoloMill17008,adminRotationGeneratorRepairSoloMillSpread17009,adminRotationGeneratorBalanceSundayTbkrCleanup17011,adminRotationGeneratorBalancePressHalfSteps17012,adminRotationGeneratorBalanceTpkw02Final17013])fn(source,model,'10/26');for(const machine of ['TNKS01','TPKW02'])adminRotationGeneratorBalanceHardMachine(source,machine,model,'10/26');");
 const after=JSON.parse(JSON.stringify(f.context.source)),original=JSON.parse(before);
 for(const section of ['hard','soft'])assert.deepEqual(after[section].rows.slice(0,25),original[section].rows.slice(0,25));
 assert(f.evaluate("adminRotationGeneratorCountSectionTotals(source,adminGetKnownNames())['Blažek'].hard")>0,'frozen hard rows must remain included in whole-month totals');
 assert(f.evaluate("adminRotationGeneratorCountHardMachine(source,'TBKR07',adminGetKnownNames(),'10/26')['Kmínek']")>0);
 f.context.clone=JSON.parse(JSON.stringify(f.context.source));assert.equal(f.evaluate('adminRotationGeneratorCanEditRow(clone,0)'),true,'scope must not serialize or leak to a later generator');
});
test('prefix tampering fails before pending draft can be used',()=>{
 const f=setup();f.context.changed=JSON.parse(JSON.stringify(f.context.source));f.context.changed.hard.rows[0].cells[0]='Changed';
 assert.throws(()=>f.evaluate('adminRotationGeneratorAssertAmendPrefix(source,changed,adminRotationGeneratorGetWizardState())'),/dřívější/);
});
test('actual TNKS and consecutive solo-mill violations can be cancelled or explicitly saved through the real save entrypoint',async()=>{
 for(const approve of [false,true]){
  const f=setup();f.context.manual=JSON.parse(JSON.stringify(f.context.source));
  for(const row of f.context.manual.hard.rows.slice(0,2))row.cells[0]='Blažek';
  for(const row of f.context.manual.soft.rows.slice(0,2)){row.cells[3]='';row.cells[4]='Špadrna';}
  const state=f.evaluate("adminRotationBuildManualRuleOverrideState('10/26',manual)");assert(state.blockingIssues.some(i=>i.type==='consecutive-tnks'));assert(state.blockingIssues.some(i=>i.type==='consecutive-solo-mill'));
  f.context.__approve=approve;f.context.__confirmations=0;f.context.__writes=0;
  f.evaluate("adminRotationConfirmManualRuleOverride=async state=>{__confirmations++;if(!state.blockingIssues.some(i=>i.type==='consecutive-tnks')||!state.blockingIssues.some(i=>i.type==='consecutive-solo-mill'))throw Error('missing blocking issue');return __approve};saveRotationToSupabase=async()=>{__writes++;return {ok:true}};renderRotace=()=>{};saveRotationData=()=>{}");
  const result=await f.evaluate("saveAdminRotationFromDom('10/26',{normalizedMonth:manual})");
  assert.equal(f.context.__confirmations,1);assert.equal(f.context.__writes,approve?1:0);assert.equal(result.saveResult.ok,approve);
  if(approve){assert(result.manualOverrideIssues.length>=2);assert.equal(f.context.app.rotation.months['10/26'].hard.rows[0].cells[0],'Blažek');}else assert.equal(result.saveResult.reason,'user-cancelled');
 }
});
test('manual override never bypasses admin authorization or failed online persistence',async()=>{
 for(const scenario of ['locked','conflict']){
  const f=setup();f.context.manual=JSON.parse(JSON.stringify(f.context.source));
  for(const row of f.context.manual.hard.rows.slice(0,2))row.cells[0]='Blažek';
  for(const row of f.context.manual.soft.rows.slice(0,2)){row.cells[3]='';row.cells[4]='Špadrna';}
  f.context.__writes=0;
  f.evaluate("adminRotationConfirmManualRuleOverride=async()=>true;saveRotationToSupabase=async()=>{__writes++;return {ok:false,reason:'conflict'}};renderRotace=()=>{};saveRotationData=()=>{}");
  if(scenario==='locked')f.context.app.adminUnlocked=false;
  const before=JSON.stringify(f.context.app.rotation);
  const result=await f.evaluate("saveAdminRotationFromDom('10/26',{normalizedMonth:manual})");
  assert.equal(f.context.__writes,scenario==='locked'?0:1);
  assert.equal(result.saveResult.reason,scenario==='locked'?'admin-required':'conflict');
  assert.equal(JSON.stringify(f.context.app.rotation),before,'failed or unauthorized override must not commit runtime rotation');
  assert.equal(result.preservedDraft,true,'approved manual edits remain recoverable after a refused save');
  assert.equal(f.context.app.adminRotationDirty,true);
 }
});
