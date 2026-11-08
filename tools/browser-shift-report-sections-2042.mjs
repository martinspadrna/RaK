#!/usr/bin/env node
// Real Chromium: visual separation in Report pro mistra; synthetic local data only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>fs.existsSync(n));
assert(chrome,'Real Chromium required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-report-sections-2042-'));
const shift=fs.readFileSync(path.join(root,'rak-shift-report.js'),'utf8').replaceAll('</script','<\\/script');
const polishSource=fs.readFileSync(path.join(root,'rak-shift-report-share.js'),'utf8').split('// RaK 1.7 – PNG')[0].replaceAll('</script','<\\/script');
assert(polishSource.includes('function decorateSections('),'foreman polish UI script found');
const base=pathToFileURL(root+path.sep).href;
function probe(width){
 const fail=message=>{throw Error(message);};
 try{
  window.RakShiftReport.open();
  window.rakShiftReportPolishUi();
  const target=document.querySelector('#rakShiftReport');
  if(!target)fail('report did not open');
  const keys=['mo','to','r01','r07'];
  const cards=keys.map(key=>target.querySelector('[data-section-block="'+key+'"]'));
  if(cards.some(c=>!c))fail('missing production section');
  const problems=target.querySelector('.rakShiftProblemsSection');
  const preview=target.querySelector('.rakShiftPreviewSection');
  if(!problems||!preview)fail('problems/preview section absent');
  const all=cards.concat(problems,preview);
  for(const card of all){
   const st=getComputedStyle(card),r=card.getBoundingClientRect();
   if(parseFloat(st.borderLeftWidth)<6||parseFloat(st.borderTopWidth)<2)fail('weak section border: '+card.className);
   if(r.width>target.getBoundingClientRect().width+1)fail('section horizontal overflow');
  }
  const head=cards[0].querySelector('.rakShiftSectionHead');
  if(parseFloat(getComputedStyle(head).borderBottomWidth)<2)fail('heading is not separated');
  if(cards[1].getBoundingClientRect().top<cards[0].getBoundingClientRect().bottom+10)fail('cards lack spacing');
  const tones=[
    ['mo','AF','rgb(20, 114, 194)','rgba(20,114,194,0.27)','rgba(20,114,194,0.38)'],
    ['mo','AG','rgb(135, 172, 58)','rgba(135,172,58,0.24)','rgba(135,172,58,0.38)'],
    ['mo','AH','rgb(206, 85, 47)','rgba(206,85,47,0.25)','rgba(206,85,47,0.38)'],
    ['to','AD','rgb(20, 114, 194)','rgba(20,114,194,0.27)','rgba(20,114,194,0.38)'],
    ['to','AE','rgb(135, 172, 58)','rgba(135,172,58,0.24)','rgba(135,172,58,0.38)'],
    ['to','AH','rgb(206, 85, 47)','rgba(206,85,47,0.25)','rgba(206,85,47,0.38)'],
    ['r01','AD','rgb(20, 114, 194)','rgba(20,114,194,0.27)','rgba(20,114,194,0.38)'],
    ['r01','AE','rgb(135, 172, 58)','rgba(135,172,58,0.24)','rgba(135,172,58,0.38)'],
    ['r01','AH','rgb(206, 85, 47)','rgba(206,85,47,0.25)','rgba(206,85,47,0.38)'],
    ['r07','AD','rgb(20, 114, 194)','rgba(20,114,194,0.27)','rgba(20,114,194,0.38)'],
    ['r07','AE','rgb(135, 172, 58)','rgba(135,172,58,0.24)','rgba(135,172,58,0.38)'],
    ['r07','AH','rgb(206, 85, 47)','rgba(206,85,47,0.25)','rgba(206,85,47,0.38)']
  ];
  const norm=v=>String(v).replaceAll(' ','');
  for(const [section,index,stroke,fill,fieldFill] of tones){
    const select=target.querySelector('[data-section="'+section+'"] .rakShiftIndex');
    if(!Array.from(select.options).some(option=>option.value===index))fail('missing selectable '+section+'/'+index);
    select.value=index;select.dispatchEvent(new Event('change',{bubbles:true}));
    const row=select.closest('.rakShiftProdRow'),style=getComputedStyle(row),chip=getComputedStyle(select);
    if(row.dataset.indexColor!==(index==='AG'||index==='AE'?'green':index==='AH'?'orange':'blue'))fail('index color not synchronized '+index);
    if(style.borderLeftColor!==stroke||norm(style.backgroundColor)!==norm(fill))fail('overview tint mismatch '+index+': '+style.backgroundColor);
    if(chip.borderColor!==stroke||norm(chip.backgroundColor)!==norm(fieldFill))fail('index selector tint mismatch '+section+'/'+index);
    const fields=Array.from(row.querySelectorAll('input.rakShiftQty,input.rakShiftFree,input.rakShiftNok'));
    if(!fields.length)fail('missing editable fields '+section+'/'+index);
    for(const field of fields){
      const inputStyle=getComputedStyle(field);
      if(norm(inputStyle.backgroundColor)!==norm(fieldFill))fail('editable field is not index-tinted '+section+'/'+index+' '+field.className+' '+inputStyle.backgroundColor);
      if(inputStyle.borderColor!==stroke||inputStyle.backgroundImage!=='none')fail('editable field retains generic gradient '+section+'/'+index);
    }
    if(style.borderLeftWidth!=='4px'||style.backgroundImage!=='none'||chip.backgroundImage!=='none')fail('neon style remains '+index);
  }
  if(!target.querySelector('[data-section="mo"] .rakShiftQty'))fail('quantity entry lost');
  if(!target.querySelector('.rakShiftProblems .rakShiftProblemRow'))fail('problems entry lost');
  if(!target.querySelector('[data-shift-action="send"]'))fail('send report action lost');
  return {result:'PASS',width,sections:all.length,checks:['section-borders','accent-headers','spacing','no-overflow','index-tone-parity','colored-quantity-free-nok','dynamic-index-colors','existing-form']};
 } catch(e) {return {result:'FAIL',width,error:e.message};}
}
try{
 for(const width of [320,390,768,1366]){
  const html='<!doctype html><html><head><meta charset="utf-8"><base href="'+base+'"><link rel="stylesheet" href="features/shift-report-sections.css?v=2.0.48"><style>html,body{margin:0;padding:0}#appMenuBody{width:'+width+'px;max-width:100vw;box-sizing:border-box;padding:12px}</style></head><body><div id="appMenuBody"></div><pre id="probe">WAIT</pre><script>window.rakAdminCanOpenShiftReport=()=>true;</script><script>'+shift+'</script><script>'+polishSource+'</script><script>addEventListener("load",()=>{setTimeout(()=>{document.querySelector("#probe").textContent=JSON.stringify(('+probe.toString()+')('+width+'));},200)});</script></body></html>';
  const file=path.join(dir,'index.html');fs.writeFileSync(file,html);
  const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--allow-file-access-from-files','--disable-background-networking','--virtual-time-budget=3500','--window-size='+Math.max(500,width)+',900','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:45000,maxBuffer:5e6});
  assert.equal(result.status,0,'Chromium failed');
  const match=result.stdout.match(/<pre id="probe">([^<]+)<\/pre>/);
  assert(match&&match[1]!=='WAIT','Missing real browser result');
  const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(data.result,'PASS',JSON.stringify(data));
  console.log('[foreman-section-2042-browser]',JSON.stringify(data));
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
