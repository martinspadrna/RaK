#!/usr/bin/env node
// 1.7.61/62: real Chromium geometry; does not authenticate, call Supabase or access personal data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'[17061-browser] Chromium is required; no mocked browser pass');
function start(file,marker,loopEnd,output){
  const source=fs.readFileSync(path.join(ROOT,file),'utf8');
  const a=source.indexOf(marker),b=source.indexOf(loopEnd,a+marker.length);
  assert(a>=0&&b>a,'missing layout generator '+file);
  const ctx={maxPairs:3,absenceHtml:'',html:''};
  vm.runInNewContext(source.slice(a,b)+`\n globalThis.__start=${output};`,ctx);
  return ctx.__start;
}
function makeSummary(open){
  const cells=["<th class='noteDateCell'>Datum</th>","<th class='noteShiftCell'>Směna</th>"];
  const row=["<td class='noteDateCell'>29.10.</td>","<td class='noteShiftCell'>N</td>"];
  for(let i=0;i<3;i++){
    if(i){cells.push("<th class='noteSpacer'></th>");row.push("<td class='noteSpacer'></td>");}
    cells.push("<th class='notePersonCell'>Jméno</th>","<th class='noteReasonCell'>Důvod</th>");
    row.push("<td class='notePersonCell'>Špadrna</td>","<td class='noteReasonCell'>NV</td>");
  }
  return open+cells.join('')+'</tr></thead><tbody><tr>'+row.join('')+'</tr></tbody></table></div>';
}
const publicStart=start('rotace.js','    // RAK_17061_PUBLIC_ABSENCE_LAYOUT:',
  '    for (let i = 0; i < maxPairs; i += 1) {','absenceHtml');
const adminStart=start('admin-rotation-editor.js','  // RAK_17061_ADMIN_ABSENCE_LAYOUT:',
  '  for (let i = 0; i < maxPairs; i += 1) {','html');
const styles=['styles.css','styles-inline-legacy.css']
  .map(file=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(ROOT,file)).href+'">').join('');
const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styles}
<style>.rakProbeWrap{width:350px;max-width:calc(100vw - 24px);overflow-x:auto;}</style>
</head><body><div id="public" class="rakProbeWrap">${makeSummary(publicStart)}</div>
<div id="appMenuBody" data-admin-view="rotation"><div id="adminRotationEditor">
<div id="preview" class="rakProbeWrap">${makeSummary(adminStart)}</div>
<div class="rakProbeWrap"><table class="appMenuTable appMenuAdminTable appMenuAdminRotationTable" data-daymod-section="soft">
<colgroup><col style="width:46px"><col style="width:50px"><col style="width:50px"></colgroup>
<thead><tr><th>Datum</th><th>MSKC01</th><th>MSKC03</th></tr></thead>
<tbody><tr><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-rot-field="date" value="19.10. N"></div></td><td><input class="appMenuInlineInput" data-rot-field="cell-0" value="Pecha"></td><td><input class="appMenuInlineInput" data-rot-field="cell-1" value="Novotný"></td></tr></tbody></table></div>
<div class="rakProbeWrap"><table class="appMenuTable appMenuAdminTable appMenuAdminAbsenceTable">
<colgroup><col style="width:55px"><col style="width:106px"><col style="width:32px"></colgroup>
<thead><tr><th>Datum</th><th>Jméno</th><th>Kód</th></tr></thead>
<tbody><tr><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-note-field="date" value="19.10. N"></div></td><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-note-field="person" value="Špadrna"></div></td><td><input class="appMenuInlineInput" data-note-field="code" value="NV"></td></tr></tbody></table></div>
</div></div><pre id="rak-probe">WAIT</pre>
<script>
window.addEventListener('load',()=>setTimeout(()=>{
 const rect=e=>e.getBoundingClientRect();
 const measure=input=>{
  const style=getComputedStyle(input),context=document.createElement('canvas').getContext('2d');
  context.font=style.fontSize+' '+style.fontFamily;
  return {width:rect(input).width,content:input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),text:context.measureText(input.value).width,font:parseFloat(style.fontSize)};
 };
 const summary=container=>{
   const table=container.querySelector('table'),cells=Array.from(table.querySelectorAll('tbody tr:first-child td'));
   const get=cls=>rect(cells.find(c=>c.classList.contains(cls))).width;
   return {table:rect(table).width,date:get('noteDateCell'),shift:get('noteShiftCell'),name:get('notePersonCell'),reason:get('noteReasonCell'),spacer:get('noteSpacer'),visibleDate:cells[0].scrollWidth<=cells[0].clientWidth+1};
 };
 const rot=document.querySelector('.appMenuAdminRotationTable');
 const abs=document.querySelector('.appMenuAdminAbsenceTable');
 const rotCells=Array.from(rot.rows[1].cells),absCells=Array.from(abs.rows[1].cells);
 document.querySelector('#rak-probe').textContent=JSON.stringify({
   public:summary(document.querySelector('#public')),admin:summary(document.querySelector('#preview')),
   rotDate:measure(rot.querySelector('[data-rot-field="date"]')),
   absDate:measure(abs.querySelector('[data-note-field="date"]')),
   absName:rect(abs.querySelector('[data-note-field="person"]')).width,
   rotCell:rect(rotCells[0]).width,absDateCell:rect(absCells[0]).width,absNameCell:rect(absCells[1]).width,
   rotOverlap:rect(rotCells[0].querySelector('input')).right>rect(rotCells[1]).left+1,
   absOverlap:rect(absCells[0].querySelector('input')).right>rect(absCells[1]).left+1,
   codeOverlap:rect(absCells[1].querySelector('input')).right>rect(absCells[2]).left+1,
   viewport:innerWidth,docWidth:document.documentElement.scrollWidth
 });
},200));
</script></body></html>`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17061-layout-'));
try{
  const page=path.join(tmp,'index.html');fs.writeFileSync(page,html,'utf8');
  const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=3500',
    '--window-size=390,844','--dump-dom',pathToFileURL(page).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
  assert.equal(result.status,0,'[17061-browser] chrome failed '+String(result.stderr||'').slice(-1000));
  const match=String(result.stdout||'').match(/<pre id="rak-probe">([^<]+)<\/pre>/);
  assert(match&&match[1]!=='WAIT','[17061-browser] CSS probe was not evaluated');
  const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  for(const key of ['public','admin']){
    assert(data[key].date>=56,'[17061-browser] clipped '+key+' date: '+JSON.stringify(data[key]));
    assert(data[key].name>=66&&data[key].name<=71,'[17061-browser] name not 10% narrower: '+JSON.stringify(data[key]));
    assert(data[key].shift>=32&&data[key].reason>=36,'[17061-browser] columns crushed');
    assert(data[key].visibleDate,'[17061-browser] actual date text clipped: '+key);
  }
  const releaseSource=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const narrow=['v1.7.65-admin-draft-recovery1','v1.7.66-softgrid-draftguard1','v1.7.67-equalgrid-reload1',
    'v1.7.68-async-draft-guard1','v1.7.69-local-drafts1','v1.7.70-canonical-source1']
    .some(id=>releaseSource.includes(id));
  if(narrow)assert(data.rotDate.width>=81&&data.rotDate.width<=83&&data.rotCell>=83,
    '[17065+-browser] MO/TO date width regression '+JSON.stringify(data.rotDate));
  else assert(data.rotDate.width>=85&&data.rotCell>=87,'[17061-browser] editable hard/soft date too narrow');
  assert(data.absDate.width>=83&&data.absDateCell>=85,'[17061-browser] editable absence date too narrow');
  assert(data.absName>=83&&data.absName<=87,'[17061-browser] absence name not reduced');
  assert(data.rotDate.font>=16&&data.absDate.font>=16,'[17061-browser] iOS input auto-zoom regression '+JSON.stringify({rot:data.rotDate,absence:data.absDate}));
  assert(data.rotDate.content>=data.rotDate.text+1&&data.absDate.content>=data.absDate.text+1,
    '[17061-browser] full date and shift text must fit '+JSON.stringify({rot:data.rotDate,absence:data.absDate}));
  assert(!data.rotOverlap&&!data.absOverlap&&!data.codeOverlap,'[17061-browser] fields overlap neighbouring cells');
  assert(data.docWidth<=data.viewport+4,'[17061-browser] document overflows instead of table scrolling');
  console.log('[17061-browser] PASS Chromium: public/admin absence geometry; MO/TO '+String(data.rotDate.width)+'px, absence '+String(data.absDate.width)+'px; full date+shift at 16px, no overlap');
}catch(e){console.error('[17061-browser] FAIL '+e.stack);process.exitCode=1;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
