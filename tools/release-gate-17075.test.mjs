import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const VERSION='1.7.75',BUILD='v1.7.75-report-columns1';
function planner(source){
 return runNamedDeclarations({
  modules:[{source,names:[
   'quantityNumber17013','quantityText17013','positiveQuantity17014','nokSuffix17014',
   'sectionLines17013','wrapLines','sectionLayout17015',
   'sectionFitsPairColumn17075','sectionRows17075'
  ]}],
  globals:{CANVAS_WIDTH:1080,OUTER:50,SECTION_PAIR_GAP_17075:22,MOBILE_LINE_STEP:78},
  exports:{plan:'sectionRows17075'}
 }).api.plan;
}
const compact=[
 {id:'mo',totalNok:'2',rows:[{index:'AF',qty:'1184',free:'',nok:''},{index:'AG',qty:'32',free:'',nok:''}]},
 {id:'to',rows:[{index:'AD',qty:'1201',free:'',nok:''}]},
 {id:'r01',rows:[{index:'AD',qty:'256',free:'320',nok:''}]},
 {id:'r07',rows:[{index:'AD',qty:'625',free:'',nok:''}]}
];
const ctx=()=>({font:'',measureText:text=>({width:Array.from(String(text)).length*18})});

test('1.7.75 keeps technical 1.7.0 and isolated TEST Supabase',()=>{
 for(const [file,anchor] of [
  ['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]
 ]) assert(read(file).includes(anchor),file+' release mismatch');
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 const config=read('supabase-config.js');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
});

test('compact MO/TO and grinder pairs share two columns in both PNG entrypoints',()=>{
 for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  const source=read(file),rows=Array.from(planner(source)(ctx(),compact),row=>({
   paired:row.paired,ids:Array.from(row.sections,section=>section.id),width:row.width,height:row.height
  }));
  assert.deepEqual(rows.map(row=>row.paired),[true,true],file+' compact pair decisions');
  assert.deepEqual(rows.map(row=>row.ids.join('+')),['mo+to','r01+r07'],file+' section pairing');
  assert(rows.every(row=>row.width===479),file+' pair width');
  assert(rows.every(row=>row.height>0),file+' measured pair height');
  assert(source.includes('y = drawSectionRows17075(ctx, model.sections, y);'),file+' renderer wiring');
  assert(source.includes('row.sections[1], OUTER + row.width + SECTION_PAIR_GAP_17075'),file+' right column');
 }
});

test('a label that would wrap keeps its whole section pair at full width',()=>{
 const long=structuredClone(compact);
 long[2].rows=[{index:'AD',qty:'999999',free:'',nok:'99999'}];
 for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  const rows=Array.from(planner(read(file))(ctx(),long),row=>({
   paired:row.paired,ids:Array.from(row.sections,section=>section.id),width:row.width
  }));
  assert.deepEqual(rows.map(row=>row.ids.join('+')),['mo+to','r01','r07'],file+' fallback rows');
  assert.deepEqual(rows.map(row=>row.paired),[true,false,false],file+' fallback decisions');
  assert.deepEqual(rows.map(row=>row.width),[479,980,980],file+' fallback widths');
 }
});

test('strict CI runs the adaptive PNG regression after two clean canonical builds',()=>{
 const pkg=JSON.parse(read('package.json')),workflow=read('.github/workflows/rak-development-validation.yml');
 assert(pkg.scripts.check.includes('tools/release-gate-17075.test.mjs'));
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 assert(workflow.includes('node --test tools/release-gate-17075.test.mjs'));
 assert(workflow.includes('rak-17075-isolated-build-'));
});
