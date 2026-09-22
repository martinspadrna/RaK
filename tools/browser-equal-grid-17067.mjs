#!/usr/bin/env node
// 1.7.67: real Chromium validates BOTH admin grids, not a single MO fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const CHROME=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>fs.existsSync(n));
assert(CHROME,'[17067-browser] real Chromium required');
const releaseBuild=fs.readFileSync('index.html','utf8');
assert(['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1','v1.7.69-local-drafts1','v1.7.70-canonical-source1','v1.7.71-offline-rotation1']
  .some(id=>releaseBuild.includes(id)),'built equal-grid release required');
const editor=fs.readFileSync('admin-rotation-editor.js','utf8');
function markup(section){
 const line=editor.split('\n').find(l=>l.includes(`data-daymod-section="${section}" style="--rak-grid-width:`));
 assert(line,'[17067-browser] missing real '+section+' table expression');
 const vars={hardMachines:Array(5).fill('X'),softMachines:Array(5).fill('X')};
 const start=vm.runInNewContext(line.trim().replace(/,$/,''),vars);
 const columns='<colgroup><col style="width:46px">'+Array(5).fill('<col style="width:50px">').join('')+'</colgroup>';
 const names=['Novotný','Špadrna','Střížek','Kmínek','Blažek'];
 const fields=names.map((name,i)=>'<td><div class="appMenuInlineFieldWrap appMenuInlineFieldWrapTiny"><input class="appMenuInlineInput appMenuInlineInputTiny" data-rot-field="cell-'+i+'" value="'+name+'"></div></td>').join('');
 return start+columns+'<thead><tr><th>Datum</th>'+Array(5).fill('<th>MSKC01</th>').join('')+'</tr></thead><tbody><tr><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-rot-field="date" value="19.10. N"></div></td>'+fields+'</tr></tbody></table>';
}
const style=['styles.css','styles-inline-legacy.css'].map(p=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(ROOT,p)).href+'">').join('');
const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}<style>.rakGridProbeWrap{width:350px;max-width:calc(100vw - 24px);overflow-x:auto;}</style></head><body><div id="appMenuBody" data-admin-view="rotation"><div id="adminRotationEditor"><div id="hardWrap" class="tableWrap appMenuTableWrap rakGridProbeWrap">${markup('hard')}</div><div id="softWrap" class="tableWrap appMenuTableWrap rakGridProbeWrap">${markup('soft')}</div></div></div><pre id="rak-probe">WAIT</pre><script>window.addEventListener('load',()=>setTimeout(()=>{
const rect=e=>e.getBoundingClientRect();
const inspect=id=>{const wrapper=document.getElementById(id),table=wrapper.querySelector('table'),row=table.tBodies[0].rows[0],cells=Array.from(row.cells),names=cells.slice(1).map(c=>c.querySelector('input')),date=cells[0].querySelector('input'),style=getComputedStyle(date),ctx=document.createElement('canvas').getContext('2d');ctx.font=style.fontSize+' '+style.fontFamily;return {section:table.dataset.daymodSection,table:rect(table).width,columns:cells.map(c=>rect(c).width),inputs:names.map(n=>rect(n).width),gaps:names.slice(1).map((n,i)=>rect(n).left-rect(names[i]).right),wrapScroll:wrapper.scrollWidth,wrapClient:wrapper.clientWidth,wrapRight:rect(wrapper).right,lastRight:rect(names.at(-1)).right,date:rect(date).width,dateFont:parseFloat(style.fontSize),dateContent:date.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),dateText:ctx.measureText(date.value).width};};
document.getElementById('rak-probe').textContent=JSON.stringify({viewport:innerWidth,document:document.documentElement.scrollWidth,hard:inspect('hardWrap'),soft:inspect('softWrap')});
},200));</script></body></html>`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17067-'));
try{
 const file=path.join(dir,'index.html');fs.writeFileSync(file,html,'utf8');
 const out=spawnSync(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=3500','--window-size=390,844','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
 assert.equal(out.status,0,'Chrome failed '+String(out.stderr||'').slice(-600));
 const match=String(out.stdout||'').match(/<pre id="rak-probe">([^<]+)<\/pre>/);
 assert(match&&match[1]!=='WAIT','real browser probe missing');
 const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 const fail=label=>label+' '+JSON.stringify(data);
 for(const section of ['hard','soft']){
  const d=data[section];assert.equal(d.section,section);
  assert(Math.abs(d.table-344)<=2,fail(section+' not 344px'));
  assert(d.columns.length===6&&d.inputs.length===5,fail(section+' lost names'));
  assert(d.columns[0]>=82&&d.columns[0]<=86,fail(section+' date column'));
  assert(d.columns.slice(1).every(n=>n>=50&&n<=54),fail(section+' name columns'));
  assert(d.inputs.every(n=>n>=49&&n<=51),fail(section+' name input widths'));
  assert(d.gaps.every(n=>n>=-1&&n<=4),fail(section+' excessive gaps'));
  assert(d.wrapScroll<=d.wrapClient+2&&d.lastRight<=d.wrapRight+1,fail(section+' requires horizontal scroll'));
  assert(d.date>=81&&d.date<=83&&d.dateFont>=16&&d.dateContent>=d.dateText+1,fail(section+' clipped date or iOS zoom'));
 }
 for(const key of ['table','date'])assert(Math.abs(data.hard[key]-data.soft[key])<0.5,fail('different '+key));
 for(const key of ['columns','inputs','gaps'])data.hard[key].forEach((n,i)=>assert(Math.abs(n-data.soft[key][i])<0.5,fail('unequal '+key+' index '+i)));
 assert(data.document<=data.viewport+4,fail('document overflow'));
 console.log('[17067-browser] PASS actual Chromium: MO=TO, 84px date + five 52px name columns, 50px inputs, no sideways scroll, date+shift at iOS-safe 16px');
}catch(err){console.error('[17067-browser] FAIL '+err.stack);process.exitCode=1;}
finally{fs.rmSync(dir,{recursive:true,force:true});}