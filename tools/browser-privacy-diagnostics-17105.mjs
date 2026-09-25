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
assert(chrome,'[privacy-17105-browser] Chromium is required');
const helper=fs.readFileSync(path.join(ROOT,'rak-runtime-diagnostics.js'),'utf8');
const canary=Object.freeze({
  token:'Bearer rak_browser_only_7Pc4Vz8Lm2Qx5Nk9',
  jwt:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJicm93c2VyLWZha2UifQ.fake-signature',
  account:'739164',
  name:'Browser Canary',
  roster:'Ranní směna CANARY-W01'
});
const encoded=JSON.stringify(canary);
const html=`<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="probe">WAIT</pre>
<script>
window.__captured=[];
for(const level of ['debug','info','log','warn','error'])console[level]=(...args)=>window.__captured.push({level,args});
</script>
<script>${helper.replaceAll('</script>','<\\/script>')}</script>
<script>
const canary=${encoded};
const privatePayload={token:canary.token,jwt:canary.jwt,account:canary.account,name:canary.name,roster:canary.roster,nested:{screenshot:'private-image-bytes'}};
const before=JSON.stringify(privatePayload);
console.warn('Supabase sync failed',new Error(Object.values(canary).join('|')));
console.error('Full health report',privatePayload);
console.log(canary.name,canary.roster,canary.account);
RAK_DIAGNOSTICS.safeLog('error','backup',privatePayload);
const rejection=new Event('unhandledrejection',{cancelable:true});
Object.defineProperty(rejection,'reason',{value:new Error(Object.values(canary).join('|'))});
dispatchEvent(rejection);
document.getElementById('probe').textContent=JSON.stringify({
  captured:window.__captured,
  installed:RAK_DIAGNOSTICS.installed,
  policy:RAK_DIAGNOSTICS.policy,
  sourceUnchanged:before===JSON.stringify(privatePayload),
  rejectionPrevented:rejection.defaultPrevented
});
</script></body></html>`;

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-privacy-17105-'));
try{
  const file=path.join(tmp,'index.html');
  fs.writeFileSync(file,html,'utf8');
  const result=spawnSync(chrome,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
    '--allow-file-access-from-files','--virtual-time-budget=1200','--dump-dom',pathToFileURL(file).href
  ],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
  assert.equal(result.status,0,'[privacy-17105-browser] Chromium failed '+String(result.stderr||'').slice(-1000));
  const match=String(result.stdout||'').match(/<pre id="probe">([^<]+)<\/pre>/);
  assert(match&&match[1]!=='WAIT','[privacy-17105-browser] probe missing');
  const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  const output=JSON.stringify(data.captured);
  for(const value of Object.values(canary))assert(!output.includes(value),'[privacy-17105-browser] canary escaped diagnostics');
  assert(data.installed&&data.policy==='aggregate-only-v1','[privacy-17105-browser] diagnostics helper not active');
  assert(data.sourceUnchanged,'[privacy-17105-browser] private payload was mutated');
  assert(data.rejectionPrevented,'[privacy-17105-browser] raw rejection default output was not suppressed');
  assert(output.includes('[RaK diagnostics]')&&output.includes('"category":"sync"'),'[privacy-17105-browser] aggregate record missing');
  process.stdout.write('[privacy-17105-browser] PASS aggregate-only diagnostics; '+data.captured.length+' records\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
