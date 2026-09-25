#!/usr/bin/env node
// RaK 1.7.97: real Chromium geometry for shift-report context + mobile signed-input controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'[17097-browser] Chromium is required; no mocked browser pass');

const report=fs.readFileSync(path.join(ROOT,'rak-shift-report.js'),'utf8');
const cssMatch=report.match(/style\.textContent=\`([\s\S]*?)\`;\s*document\.head\.appendChild\(style\)/);
assert(cssMatch&&cssMatch[1],'[17097-browser] shift report inline CSS missing');
const common=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');

const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${common}\n${cssMatch[1]}</style>
<style>
  body{margin:0;padding:12px;box-sizing:border-box;background:#071126;color:#fff}
  #probe{width:100%;max-width:390px}
  .signedProbe{width:100%;max-width:340px;margin-top:20px}
  .signedProbe .calcSignedInput{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:stretch}
  .signedProbe .calcSignToggle{min-height:44px}
  .signedProbe input{min-width:0;width:100%;box-sizing:border-box;font-size:16px}
</style></head><body>
<div id="probe">
  <div class="rakShiftContext">
    <div class="rakShiftMetaGrid">
      <label class="rakShiftMetaLabel">Datum směny<input class="rakShiftInput rakShiftDate" type="date" value="2026-09-24"></label>
      <label class="rakShiftMetaLabel">Směna<select class="rakShiftSelect rakShiftShift"><option>Noční</option></select></label>
    </div>
  </div>
  <div class="signedProbe">
    <div class="calcSignedInput"><button class="calcSignToggle" type="button">+</button><input inputmode="decimal" value="-12,5"></div>
  </div>
</div>
<pre id="rak-probe">WAIT</pre>
<script>
addEventListener('load',()=>setTimeout(()=>{
 const rect=e=>e.getBoundingClientRect();
 const date=document.querySelector('.rakShiftDate');
 const shift=document.querySelector('.rakShiftShift');
 const sign=document.querySelector('.calcSignToggle');
 const signedInput=document.querySelector('.signedProbe input');
 const d=rect(date),s=rect(shift),b=rect(sign),i=rect(signedInput);
 document.querySelector('#rak-probe').textContent=JSON.stringify({
   date:{left:d.left,right:d.right,width:d.width},
   shift:{left:s.left,right:s.right,width:s.width},
   gap:s.left-d.right,
   overlap:d.right>s.left,
   sign:{width:b.width,height:b.height},
   signedInput:{width:i.width,font:parseFloat(getComputedStyle(signedInput).fontSize)},
   viewport:innerWidth,
   docWidth:document.documentElement.scrollWidth
 });
},200));
</script></body></html>`;

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17097-fourth-'));
try{
  const file=path.join(tmp,'index.html');fs.writeFileSync(file,html,'utf8');
  const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=2500',
    '--window-size=390,844','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
  assert.equal(result.status,0,'[17097-browser] chrome failed '+String(result.stderr||'').slice(-1000));
  const match=String(result.stdout||'').match(/<pre id="rak-probe">([^<]+)<\/pre>/);
  assert(match&&match[1]!=='WAIT','[17097-browser] probe did not run');
  const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(data.overlap,false,'[17097-browser] date border overlaps shift select '+JSON.stringify(data));
  assert(data.gap>=9,'[17097-browser] date/shift gap too small '+JSON.stringify(data));
  assert(data.date.width>=117&&data.date.width<=125,'[17097-browser] compact date geometry regressed '+JSON.stringify(data));
  assert(data.shift.width>=107&&data.shift.width<=113,'[17097-browser] shift geometry regressed '+JSON.stringify(data));
  assert(data.sign.width>=40&&data.sign.height>=40,'[17097-browser] sign toggle touch target too small '+JSON.stringify(data));
  assert(data.signedInput.font>=16,'[17097-browser] decimal input risks iOS zoom '+JSON.stringify(data));
  assert(data.docWidth<=data.viewport+1,'[17097-browser] horizontal overflow '+JSON.stringify(data));
  process.stdout.write('[17097-browser] OK '+JSON.stringify(data)+'\n');
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
