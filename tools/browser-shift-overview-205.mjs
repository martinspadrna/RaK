#!/usr/bin/env node
// Real Chromium, synthetic local records only. No account or network credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>fs.existsSync(n));
assert(chrome,'Real Chromium is required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-overview-205-'));
const feature=fs.readFileSync(path.join(root,'admin-shift-overview.js'),'utf8').replaceAll('</script','<\\/script');
const css=['styles.css','styles-inline-legacy.css','styles-menu-polish.css'].map(p=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(root,p)).href+'">').join('');
function probe(width){
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 const body=document.querySelector('#appMenuBody');
 const api=window.RakAdminShiftOverview;
 const edit=(path,value)=>{const el=body.querySelector('[data-shift-overview-field="'+path+'"]');check(el,'missing '+path);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el;};
 const choose=shift=>{const el=body.querySelector('[data-shift-overview-shift]');el.value=shift;el.dispatchEvent(new Event('change',{bubbles:true}));};
 const value=path=>body.querySelector('[data-shift-overview-field="'+path+'"]')?.value;
 const order=()=>[...body.querySelectorAll('[data-shift-overview-section]')].map(el=>el.dataset.shiftOverviewSection).join(',');
 const night='stock,assembly,ald3,before-kiln,after-kiln,ground,after-145,before-145,soft,machining,ald2,ald1';
 const morning='stock,ald3,nitrogen,machining,ald2,ald1';
 try{
  api.render(body,{date:'2026-10-12',shift:'D:nocni12',nitrogen:'13',lastBatch:{ald3:'123'}});
  check(order()===night,'night route');
  edit('oam.rows.ag.op1020','320+256');check(value('oam.rows.ag.op1020')==='576','arithmetic');
  edit('oam.rows.ag.op145','5');body.querySelector('[data-shift-overview-multiply="oam.rows.ag.op145"]').click();check(value('oam.rows.ag.op145')==='320','multiplier');
  edit('oam.rows.ag.stock','192');edit('oam.rows.ag.producedTO','64');edit('oam.rows.af.groundTBKR07Free','32');
  check(body.querySelectorAll('[data-running-unit][aria-pressed="true"]').length===25,'all units active initially');
  for(const id of [1,2,3])body.querySelector('[data-running-ald="'+id+'"][data-running-unit="2"]').click();
  check(body.querySelectorAll('[data-running-unit][aria-pressed="false"]').length===3,'units toggle');
  edit('lastBatch.ald1','100');edit('lastBatch.ald2','200');edit('ald.2.faults','synthetic fixture');
  body.querySelector('[data-shift-overview-count="inputs.rows.TW1.ald1"][data-count-step="1"]').click();
  check(value('inputs.rows.TW1.ald1')==='1','counter');
  choose('D:ranni12');check(order()===morning,'manual morning route');
  check(!body.querySelector('[data-shift-overview-field="oam.rows.ag.op1020"]'),'hidden morning stage');
  check(value('nitrogen')==='13'&&value('lastBatch.ald3')==='123','hidden values restored');
  edit('nitrogen','15.5');choose('D:nocni12');check(order()===night,'manual night route');
  check(value('oam.rows.ag.op1020')==='576'&&value('oam.rows.ag.op145')==='320','hidden flow preserved');
  check(value('oam.rows.ag.producedTO')==='64'&&value('oam.rows.af.groundTBKR07Free')==='32','route inputs preserved');
  check(body.querySelectorAll('[data-running-unit][aria-pressed="false"]').length===3,'disabled units preserved');
  check(value('lastBatch.ald1')==='100'&&value('lastBatch.ald2')==='200','both last batches preserved');
  const summary=decodeURIComponent(body.querySelector('[data-shift-overview-summary-image]').src.split(',')[1]);
  check(summary.includes('data-summary-production="whole"')&&summary.includes('>576</text>'),'original summary');
  const draft=JSON.parse(localStorage.getItem('rak_shift_overview_draft_v1:local'));
  check(draft.record.nitrogen==='15.5'&&draft.record.oam.rows.ag.stock==='192','synchronous draft');
  api.render(body);check(order()===night&&value('oam.rows.ag.op1020')==='576','reopen draft');
  choose('D:ranni12');check(value('nitrogen')==='15.5','reopen morning values');
  check(body.querySelectorAll('[data-running-unit][aria-pressed="false"]').length===3,'disabled identities survive reopen');
  const square=body.querySelector('[data-running-unit]');check(Math.abs(square.getBoundingClientRect().width-44)<1&&Math.abs(square.getBoundingClientRect().height-44)<1,'numbered squares');
  check(value('lastBatch.ald1')==='100'&&value('lastBatch.ald2')==='200','morning last batches');
  edit('oam.rows.ag.groundTBKR01Free','32');edit('oam.rows.ag.groundTBKR01Press','64');check(value('oam.rows.ag.groundTBKR01Free')==='32'&&value('oam.rows.ag.groundTBKR01Press')==='64','independent free and press');
  const fields=[...body.querySelectorAll('[data-shift-overview-field]')];
  check(new Set(fields.map(el=>el.dataset.shiftOverviewField)).size===fields.length,'duplicate fields');
  const box=body.getBoundingClientRect();
  const overflow=fields.filter(el=>el.getBoundingClientRect().right>box.right+2);
  check(overflow.length===0,'field overflow');
  check([...body.querySelectorAll('[data-count-step]')].every(el=>el.getBoundingClientRect().height>=43),'touch targets');
  window.rakAdminCanManageAdmins=()=>false;api.render(body);check(!body.querySelector('[data-shift-overview-field]'),'role gate');
  return {result:'PASS',containerWidth:width,checks:['routes','manual switch','hidden fields','arithmetic','multipliers','counters','draft reopen','summary','roles','overflow']};
 }catch(error){return {result:'FAIL',containerWidth:width,error:error.message};}
}
try{
 for(const width of [320,390,768,1366]){
  const html='<!doctype html><html><head><meta charset="utf-8">'+css+'<style>html,body{margin:0;padding:0;}#appMenuBody{width:'+width+'px;max-width:100vw;box-sizing:border-box;padding:12px;}</style></head><body><div id="appMenuBody"></div><pre id="probe">WAIT</pre><script>window.rakAdminCanManageAdmins=()=>true;</script><script>'+feature+'</script><script>addEventListener("load",()=>{document.querySelector("#probe").textContent=JSON.stringify(('+probe.toString()+')('+width+'));});</script></body></html>';
  const file=path.join(dir,'index.html');fs.writeFileSync(file,html);
  const r=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--allow-file-access-from-files','--disable-background-networking','--virtual-time-budget=3500','--window-size='+Math.max(500,width)+',900','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:45000,maxBuffer:5e6});
  assert.equal(r.status,0,'Chromium failed');
  const match=r.stdout.match(/<pre id="probe">([^<]+)<\/pre>/);assert(match&&match[1]!=='WAIT','Missing real browser result');
  const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(result.result,'PASS',JSON.stringify(result));console.log('[overview-205-browser]',JSON.stringify(result));
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
