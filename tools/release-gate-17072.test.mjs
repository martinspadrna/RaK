import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const {buildId:BUILD,displayVersion:VERSION}=RELEASE_METADATA;
const normalize=value=>String(value).replace(/\u00a0/g,' ');
const fixture={
 date:'2026-09-21',shift:'N',moNok:'0',problems:[],
 production:{
  mo:[{index:'AF',qty:'1184',free:'',nok:''},{index:'AG',qty:'32',free:'',nok:''}],
  to:[{index:'AD',qty:'1201',free:'',nok:''}],
  r01:[{index:'AD',qty:'256',free:'320',nok:''}],
  r07:[{index:'AD',qty:'625',free:'',nok:''}]
 }
};
function textRenderer(){
 return runNamedDeclarations({
  modules:[{source:read('rak-shift-report.js'),names:[
   'reportLineIndex','formatShiftReportText','sortReportRowsByIndexColor','reportText'
  ]}],
  globals:{REPORT_SEPARATOR:'__________',INDEX_ORDER:{AG:0,AE:0,AF:1,AD:1,AH:2},
   getRakActiveAccountShiftTeam:()=> 'D'},
  exports:{render:'reportText'}
 }).api.render;
}
function pngRows(source){
 return runNamedDeclarations({
  modules:[{source,names:[
   'quantityNumber17013','quantityText17013','positiveQuantity17014',
   'formattedQuantity17014','nokSuffix17014','sectionLines17013'
  ]}],
  exports:{rows:'sectionLines17013'}
 }).api.rows;
}
test('1.7.72 formatting and verified successors use canonical release metadata and TEST Supabase',()=>{assertCurrentReleaseIdentity(read,'1.7.72');});
test('preview and copied report use quantity-index rows with plain grand totals',()=>{
 const text=normalize(textRenderer()(fixture));
 for(const line of ['1 184 AF','32 AG','Celkově 1 216 ks','1 201 AD',
  '256 AD','320 AD volné','Celkově 576 ks','625 AD'])assert(text.includes(line),'missing '+line);
 for(const removed of ['Celkově 1 184 AF, 32 AG (1 216 ks)','AD 1 201 ks',
  '256 AD ks','Celkově 576 ks (576 AD)','625 AD ks'])assert(!text.includes(removed),'obsolete label '+removed);
 assert(!/Celkově[^\n]*(?:AF|AG|AH|AD|AE)/.test(text),'total repeats index breakdown');
});
test('both PNG entrypoints generate the exact same simplified production labels',()=>{
 const expected={
  mo:['1 184 AF','32 AG','Celkově 1 216 ks'],
  to:['1 201 AD'],
  r01:['256 AD','320 AD volné','Celkově 576 ks'],
  r07:['625 AD']
 };
 for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  const source=read(file),rows=pngRows(source);
  assert(source.includes('RAK_17072_REPORT_QUANTITY_INDEX'),file+' policy marker');
  for(const id of Object.keys(expected)){
   const actual=Array.from(rows({id,rows:fixture.production[id]}),entry=>normalize(entry.text));
   assert.deepEqual(actual,expected[id],file+' '+id);
  }
  const withNok=Array.from(rows({id:'r01',rows:[
   {index:'AD',qty:'555',free:'',nok:'2'},{index:'AE',qty:'21',free:'',nok:''}
  ]}),entry=>normalize(entry.text));
  assert.deepEqual(withNok,['555 AD (z toho 2 NOK)','21 AE','Celkově 576 ks'],file+' NOK details');
  assert(source.includes('drawProductionRow(ctx,line,x+20,rowY,w-40);'),file+' total image row');
 }
});
test('strict CI runs this gate after two clean canonical builds',()=>{
 const pkg=JSON.parse(read('package.json')),workflow=read('.github/workflows/rak-development-validation.yml');
 assert(pkg.scripts.check.includes('tools/release-gate-17072.test.mjs'));
 for(const anchor of ['npm run vercel-build\n          npm run vercel-build',
  'node --test tools/release-gate-17072.test.mjs','rak-170'+VERSION.split('.').at(-1)+'-isolated-build-'])
  assert(workflow.includes(anchor),'CI missing '+anchor);
});

