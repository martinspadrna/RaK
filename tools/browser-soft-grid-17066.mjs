#!/usr/bin/env node
// RaK 1.7.66: real Chromium CSS geometry for five MO names, no fake browser and no private data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>fs.existsSync(n));
assert(chrome,'[17066-browser] actual Chromium required');
const releaseBuild=fs.readFileSync('index.html','utf8');
assert(['v1.7.66-softgrid-draftguard1','v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1','v1.7.69-local-drafts1','v1.7.70-canonical-source1','v1.7.71-offline-rotation1','v1.7.72-shift-report1','v1.7.73-offline-persistence1','v1.7.74-offline-cache1']
  .some(id=>releaseBuild.includes(id)),'built soft-grid release required');
const isEqualGrid=['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1','v1.7.69-local-drafts1','v1.7.70-canonical-source1','v1.7.71-offline-rotation1','v1.7.72-shift-report1','v1.7.73-offline-persistence1','v1.7.74-offline-cache1']
  .some(id=>releaseBuild.includes(id));
const css=['styles.css','styles-inline-legacy.css'].map(file=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(root,file)).href+'">').join('');
const machines=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
const cols='<colgroup><col style="width:46px">'+machines.map(()=>'<col style="width:50px">').join('')+'</colgroup>';
const names=machines.map((_,i)=>'<td><div class="appMenuInlineFieldWrap appMenuInlineFieldWrapTiny"><input class="appMenuInlineInput appMenuInlineInputTiny" data-rot-field="cell-'+i+'" value="Jmeno'+i+'"></div></td>').join('');
const markup='<table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft" style="--rak-'+(isEqualGrid?'grid':'soft-grid')+'-width:'+String(84+machines.length*(isEqualGrid?52:48))+'px;">'+cols+'<thead><tr><th>Datum</th>'+machines.map(m=>'<th>'+m+'</th>').join('')+'</tr></thead><tbody><tr><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-rot-field="date" value="19.10. N"></div></td>'+names+'</tr></tbody></table>';
const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${css}<style>.rakProbeWrap{width:350px;max-width:calc(100vw - 24px);overflow-x:auto;}</style></head><body><div id="appMenuBody" data-admin-view="rotation"><div id="adminRotationEditor"><div id="softWrap" class="tableWrap appMenuTableWrap rakProbeWrap">${markup}</div></div></div><pre id="rak-soft-probe">WAIT</pre><script>window.addEventListener('load',()=>setTimeout(()=>{
const wrap=document.querySelector('#softWrap'),table=wrap.querySelector('table'),row=table.tBodies[0].rows[0],cells=Array.from(row.cells),fields=cells.slice(1).map(c=>c.querySelector('input')),rect=x=>x.getBoundingClientRect(),date=cells[0].querySelector('input'),sty=getComputedStyle(date),context=document.createElement('canvas').getContext('2d');context.font=sty.fontSize+' '+sty.fontFamily;
document.querySelector('#rak-soft-probe').textContent=JSON.stringify({viewport:innerWidth,document:document.documentElement.scrollWidth,wrap:rect(wrap).width,wrapClient:wrap.clientWidth,wrapScroll:wrap.scrollWidth,table:rect(table).width,cellWidths:cells.map(c=>rect(c).width),nameWidths:fields.map(f=>rect(f).width),gaps:fields.slice(1).map((f,i)=>rect(f).left-rect(fields[i]).right),allNames:fields.length,lastRight:rect(fields[fields.length-1]).right,wrapRight:rect(wrap).right,dateWidth:rect(date).width,dateFont:parseFloat(sty.fontSize),dateContent:date.clientWidth-parseFloat(sty.paddingLeft)-parseFloat(sty.paddingRight),dateText:context.measureText(date.value).width});
},200));</script></body></html>`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17066-soft-'));
try{
 const file=path.join(tmp,'index.html');fs.writeFileSync(file,html,'utf8');
 const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=3500','--window-size=390,844','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
 assert.equal(result.status,0,'Chromium failed: '+String(result.stderr||'').slice(-600));
 const match=String(result.stdout||'').match(/<pre id="rak-soft-probe">([^<]+)<\/pre>/);
 assert(match&&match[1]!=='WAIT','Chromium JS/CSS probe not evaluated');
 const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 const fail=message=>message+' '+JSON.stringify(data);
 assert.equal(data.allNames,5,fail('missing names'));
 assert(Math.abs(data.table-(isEqualGrid?344:324))<=2,fail('MO table is stretched'));
 assert(data.cellWidths[0]>=82&&data.cellWidths[0]<=86,fail('date col wrong'));
 assert(data.cellWidths.slice(1).every(n=>n>=(isEqualGrid?50:46)&&n<=(isEqualGrid?54:50)),fail('MO name cells not compact'));
 assert(data.nameWidths.every(n=>n>=(isEqualGrid?49:45)&&n<=(isEqualGrid?51:47)),fail('MO name input wrong'));
 assert(data.gaps.every(n=>n>=-1&&n<=4),fail('wasted gaps or overlapping fields'));
 assert(data.wrapScroll<=data.wrapClient+2&&data.lastRight<=data.wrapRight+1,fail('fifth name needs horizontal scrolling'));
 assert(data.dateWidth>=81&&data.dateWidth<=83&&data.dateFont>=16&&data.dateContent>=data.dateText+1,fail('date/shift clipped or iOS zoom'));
 assert(data.document<=data.viewport+4,fail('document overflow'));
 console.log('[17066-browser] PASS real Chromium: all 5 MO names, '+String(data.table)+'px table, <=4px gaps, no side scroll, 82px readable date');
}catch(err){console.error('[17066-browser] FAIL '+err.stack);process.exitCode=1;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}