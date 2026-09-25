#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'[17100-browser] Chromium is required');

const brus=fs.readFileSync(path.join(ROOT,'brusy-fhb-correction.js'),'utf8');
const brusCss=brus.match(/s\.textContent = `([\s\S]*?)`;\n    document\.head\.appendChild\(s\);/);
assert(brusCss&&brusCss[1],'[17100-browser] Brusy CSS missing');
const share=fs.readFileSync(path.join(ROOT,'rak-shift-report-share.js'),'utf8');
const shiftCss=share.match(/style\.textContent = `([\s\S]*?)`;\n    document\.head\.appendChild\(style\);/);
assert(shiftCss&&shiftCss[1],'[17100-browser] shift CSS missing');
const rotation=fs.readFileSync(path.join(ROOT,'admin-rotation.js'),'utf8');
const helperStart=rotation.indexOf('function adminRotationFloatingViewport()');
const helperEnd=rotation.indexOf('function adminShowRotationChoicePicker(input)',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'[17100-browser] picker position helpers missing');
const pickerHelpers=rotation.slice(helperStart,helperEnd);

const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;background:#071126;color:#fff;font-family:system-ui;min-height:1500px}
${brusCss[1]}
${shiftCss[1]}
.adminRotationChoicePicker{position:fixed;display:block;max-height:264px;padding:8px;box-sizing:border-box;background:#222}
</style></head><body>
<div id="korekce-brusy"><div class="brusFhbInputs">
<label><span>FHB vlevo</span><div class="calcSignedInput brusFhbSignedInput"><button class="calcSignToggle">+</button><input value="12,5"></div></label>
<label><span>FHB vpravo</span><div class="calcSignedInput brusFhbSignedInput"><button class="calcSignToggle">−</button><input value="-8"></div></label>
</div></div>
<div class="adminBrusFhbCalibration"><div class="calcSignedInput adminCorrectionSignedInput"><button class="calcSignToggle">+</button><input class="appMenuInput"></div></div>
<div id="rakShiftReport"><div class="rakShiftContext"><div class="rakShiftMetaGrid">
<label class="rakShiftMetaLabel">Datum<input class="rakShiftInput rakShiftDate" type="date" value="2026-09-25"></label>
<label class="rakShiftMetaLabel">Směna<select class="rakShiftSelect rakShiftShift"><option>Ranní</option></select></label>
</div></div></div>
<div id="appMenuBody" data-admin-view="rotation" style="position:absolute;top:1050px;left:20px;width:350px;height:300px">
<input id="pickerInput" style="position:absolute;top:120px;left:126px;width:90px;height:44px">
</div>
<div id="adminRotationChoicePicker" class="adminRotationChoicePicker" style="width:250px;height:150px"></div>
<pre id="probe">WAIT</pre>
<script>
${pickerHelpers}
window.__rakAdminRotationChoiceInput=document.getElementById('pickerInput');
scrollTo(0,760);
setTimeout(()=>{
 adminPositionRotationChoicePicker();
 const rect=e=>e.getBoundingClientRect(), css=e=>getComputedStyle(e);
 const signs=[...document.querySelectorAll('.brusFhbSignedInput .calcSignToggle,.adminCorrectionSignedInput .calcSignToggle')].map(e=>({r:rect(e),display:css(e).display,visibility:css(e).visibility}));
 const d=rect(document.querySelector('.rakShiftDate')), sh=rect(document.querySelector('.rakShiftShift'));
 const p=rect(document.getElementById('adminRotationChoicePicker')), input=rect(document.getElementById('pickerInput'));
 document.getElementById('probe').textContent=JSON.stringify({
   signs:signs.map(x=>({width:x.r.width,height:x.r.height,display:x.display,visibility:x.visibility})),
   date:{width:d.width,rightBorder:parseFloat(css(document.querySelector('.rakShiftDate')).borderRightWidth)||0,right:d.right},
   shift:{left:sh.left,width:sh.width},gap:sh.left-d.right,
   picker:{top:p.top,left:p.left,bottom:p.bottom},input:{top:input.top,left:input.left,bottom:input.bottom},
   pickerDistance:Math.min(Math.abs(p.top-input.bottom),Math.abs(input.top-p.bottom)),
   viewport:innerWidth,docWidth:document.documentElement.scrollWidth
 });
},250);
</script></body></html>`;

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17100-iphone-'));
try{
 const file=path.join(tmp,'index.html');fs.writeFileSync(file,html,'utf8');
 const res=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=1800','--window-size=390,844','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
 assert.equal(res.status,0,'[17100-browser] chrome failed '+String(res.stderr||'').slice(-1000));
 const m=String(res.stdout||'').match(/<pre id="probe">([^<]+)<\/pre>/);
 assert(m&&m[1]!=='WAIT','[17100-browser] probe missing');
 const data=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert(data.signs.length===3&&data.signs.every(x=>x.width>=44&&x.height>=44&&x.display!=='none'&&x.visibility==='visible'),'[17100-browser] Brusy sign controls hidden/crushed '+JSON.stringify(data));
 assert(data.date.width<=130&&data.date.rightBorder>=1,'[17100-browser] date still too wide or right border missing '+JSON.stringify(data));
 assert(data.gap>=8,'[17100-browser] date and shift collide '+JSON.stringify(data));
 assert(data.pickerDistance<=10,'[17100-browser] rotation picker detached from tapped field '+JSON.stringify(data));
 assert(data.docWidth<=data.viewport+1,'[17100-browser] horizontal overflow '+JSON.stringify(data));
 process.stdout.write('[17100-browser] OK '+JSON.stringify(data)+'\n');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
