import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../admin-shift-overview.js',import.meta.url),'utf8');
const extra=fs.readFileSync(new URL('../features/shift-overview-image.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../features/shift-overview-extra.css',import.meta.url),'utf8');
function fixture(exports='normalizeRecord,summarySvg,shiftLayout,oamTable,buildHtml') {
  const context=vm.createContext({window:{},document:{getElementById:()=>({})}});
  vm.runInContext(source.replace('  installStyle();','  root.fixture={'+exports+'};'),context);
  return context.window.fixture;
}

test('graphic overview shows true BK totals from ALD1 and ALD2 disabled unit masks',()=>{
  const api=fixture();
  const rec=api.normalizeRecord({date:'2026-11-30',shift:'A:nocni12',ald:[
    {inactiveUnits:[2,10]}, {inactiveUnits:[1,5]}, {inactiveUnits:[3]}
  ]});
  const before=JSON.stringify(rec),svg=api.summarySvg(rec);
  assert(svg.includes('data-summary-bk="ald1-ald2"'));
  assert(svg.includes('BK v provozu · 16/20'));
  const ald1=svg.split('data-summary-bk-ald="1"')[1].split('</g>')[0];
  const ald2=svg.split('data-summary-bk-ald="2"')[1].split('</g>')[0];
  assert(ald1.includes('>8/10</text>')&&ald1.includes('BK2, BK10'));
  assert(ald2.includes('>8/10</text>')&&ald2.includes('BK1, BK5'));
  assert(!ald1.includes('BK3')&& !ald2.includes('BK3'));
  assert.equal(JSON.stringify(rec),before,'summary never changes the saved record');
});

test('new overview with no disabled BK reports 20/20; invalid and repeated masks do not overcount',()=>{
  const api=fixture();
  const empty=api.summarySvg(api.normalizeRecord({shift:'D:ranni12'}));
  assert(empty.includes('BK v provozu · 20/20'));
  assert.equal((empty.match(/Vypnuté: žádné/g)||[]).length,2);
  const rec=api.normalizeRecord({ald:[{inactiveUnits:[2,2,0,11,-1]},{inactiveUnits:[1,10,11]},{inactiveUnits:[1,2,3,4,5]}]});
  const svg=api.summarySvg(rec);
  assert(svg.includes('BK v provozu · 17/20'),'ALD3 has ST, not BK');
  assert(svg.includes('>9/10</text>')&&svg.includes('>8/10</text>'));
});

test('each production stage has its own bordered card and before-145 is no longer nested',()=>{
  const api=fixture();
  const empty=api.normalizeRecord({});
  const flow=api.oamTable(empty);
  assert.equal((flow.match(/<h3>Před 145<\/h3>/g)||[]).length,1);
  assert.equal((flow.match(/<h3>Po 145<\/h3>/g)||[]).length,1);
  assert(!flow.includes('rakShiftOverviewBefore145'));
  const layout=api.shiftLayout(api.normalizeRecord({shift:'A:nocni12'}));
  for(const key of ['before-kiln','after-kiln','before-145','after-145','ground','stock','assembly','soft','machining','ald1','ald2','ald3'])
    assert(layout.includes('data-shift-overview-section="'+key+'"'),'missing standalone '+key);
  assert(styles.includes('border-left:6px solid var(--shift-section-accent)'));
  assert(styles.includes('gap:20px;'));
});

test('PNG export actually rasterizes the current vector graphic without uploading anything',async()=>{
  const canvas={width:0,height:0,fillStyle:null};
  let drawn=false,released=false,created=false,format='';
  const url={createObjectURL:()=>{created=true;return 'blob:mock-svg';},revokeObjectURL:()=>{released=true;}};
  canvas.getContext=()=>({fillRect:()=>{},drawImage:()=>{drawn=true;},set fillStyle(v){canvas.fillStyle=v;}});
  canvas.toBlob=(done,type)=>{format=type;done(new Blob([new Uint8Array([137,80,78,71])],{type}));};
  class Picture {set src(value){assert.equal(value,'blob:mock-svg');queueMicrotask(()=>this.onload());}}
  const context=vm.createContext({window:{},document:{getElementById:()=>({}),createElement:tag=>tag==='canvas'?canvas:null},URL:url,Blob,Image:Picture,Promise});
  vm.runInContext(extra,context);
  vm.runInContext(source.replace('  installStyle();','  root.fixture={normalizeRecord,summarySvg,buildHtml};'),context);
  const api=context.window.fixture,record=api.normalizeRecord({shift:'B:nocni12',ald:[{inactiveUnits:[1]},{inactiveUnits:[9]}]});
  const result=await context.window.RakShiftOverviewPngExporter.raster(api.summarySvg(record));
  assert(created&&released&&drawn,'load SVG into canvas and release temporary SVG object URL');
  assert.equal(format,'image/png');assert.equal(result.type,'image/png');
  assert(canvas.width>=900&&canvas.height>=900,'high-resolution PNG canvas');
  assert(canvas.width*canvas.height<=12000000,'canvas obeys iOS memory budget');
  const html=api.buildHtml(record);
  assert(html.includes('data-shift-overview-export="download"'));
  assert(html.includes('data-shift-overview-export="share"'));
  assert(source.includes('data-summary-save-png')&&source.includes('data-summary-share-png'),'full-screen viewer also supports export');
  assert(extra.includes("navigator.canShare?.({files:[file]})"),'iOS share sheet is available when supported');
  assert(extra.includes('anchor.download=name'),'standalone download stays available');
  assert(source.includes('clearQuantityUndo(rootEl);refreshSummary(rootEl);persistDraft(rootEl);'),'BK toggle instantly updates graphic preview');
  const boot=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert(boot.includes('"features/shift-overview-image.js"'),'image export module loads with admin feature');
  assert(sw.includes("'./features/shift-overview-image.js?v=2.0.41'")&&sw.includes("'./features/shift-overview-extra.css?v=2.0.41'"),'both optional assets stay offline');

});
