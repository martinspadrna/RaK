#!/usr/bin/env node
// Read-only A/B: same headless Chromium, two already published immutable versions.
// Synthetic browser-local user + local assignment; no authentication and no database writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
const refs={
  main:{url:'https://skoda-spada.vercel.app/',version:'2.0.31',db:'bkqamcbkiwumsvelahxr'},
  test:{url:'https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/',version:'2.0.33',db:'cgshssdjgzzuprlwnabl'}
};
const CHROME=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert(CHROME,'Chromium missing');
assert.equal(typeof WebSocket,'function','Node 22+ required');
for(const [label,ref] of Object.entries(refs)){
  const [m,c]=await Promise.all([fetch(new URL('/rak-release-metadata.js',ref.url),{signal:AbortSignal.timeout(12000)}),fetch(new URL('/supabase-config.js',ref.url),{signal:AbortSignal.timeout(12000)})]);
  assert.equal(m.status,200,'metadata HTTP '+label);assert.equal(c.status,200,'config HTTP '+label);
  const ms=await m.text(),cs=await c.text();
  assert(ms.includes("displayVersion: '"+ref.version+"'"),label+' immutable release changed');
  assert(cs.includes(ref.db),label+' Supabase target changed');
  assert(!cs.includes(label==='test'?refs.main.db:refs.test.db),label+' cross-environment Supabase leak');
}
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(e=>e?reject(e):resolve(port))})});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-assignment-ab-'));
const port=await freePort();const chrome=spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port='+port,'--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
let ws,id=0;const pending=new Map();
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP '+method+' timeout'))},15000);
 pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));
});
const evalJS=async expression=>{const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw Error('JS evaluation failure');return v.result?.value};
const until=async (expression,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){let r;try{r=await evalJS(expression)}catch{}if(r)return r;await pause(80)}throw Error('Page timeout')};
try{
 let connected=false;for(let n=0;n<150;n++){try{const p=await fetch('http://127.0.0.1:'+port+'/json/list');if(p.ok){connected=true;break}}catch{}await pause(100)}
 assert(connected,'Chrome not launched');
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page')?.webSocketDebuggerUrl||'');
 ws.addEventListener('message',event=>{
   const m=JSON.parse(String(event.data));
   if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result||{});}
   if(m.method==='Fetch.requestPaused')void send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
 });
 await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
 await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
 await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Network.setBypassServiceWorker',{bypass:true});
 await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const seed=String.raw`
try{
 const now=Date.now(),p={accountNumber:'RAK_CI_0000',fullName:'CI Synthetic',shiftTeam:'D'};
 localStorage.setItem('rotace_kalkulacky:user_profile_v1',JSON.stringify(p));
 localStorage.setItem('rak_home_fast_assignments_v1',JSON.stringify({
  accountNumber:'RAK_CI_0000',savedAt:now-36*3600000,
  entries:[{start:now-2*3600000,end:now+10*3600000,target:'TBKR07'},
           {start:now+24*3600000,end:now+36*3600000,target:'MSKC03'}]}));
 localStorage.setItem('rak_home_warm_snapshot_v1',JSON.stringify({
   at:now-36*3600000,account:'RAK_CI_0000',
   values:{'#dashCalendar .dashboardValue':'--'},
   hero:{accountNumber:'RAK_CI_0000',title:'Dnes jsi na TBKR07.',
         savedAt:now-36*3600000,day:new Date().toDateString()}
 }));
}catch(_){}
`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:seed});
 const rounds=8,observations={main:[],test:[]};
 for(let round=0;round<rounds;round++){
  for(const label of round%2?['test','main']:['main','test']){
    const url=refs[label].url+'?rak_ab_round='+round;
    const response=await send('Page.navigate',{url});
    assert(!response.errorText,'Navigation failed '+label);
    await until("document.readyState==='complete'&&!!document.querySelector('#dashHero')&&location.hostname==='"+new URL(url).hostname+"'",18000);
    await until("window.__rakBootV2StartupReady===true",16000);
    const sample=await evalJS(`(()=>{
     const fcp=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')?.startTime||0;
     const first=Number(window.__rakAssignmentFirstShownMs||0);
     const confirmed=Number(window.__rakAssignmentConfirmedMs||0);
     const ready=Number(window.__rakBootV2StartupReadyMs||0);
     return {first:Math.round(first),confirmed:Math.round(confirmed),ready:Math.round(ready),fcp:Math.round(fcp),
       warm:!!window.__rakWarmAssignmentRestored?.restored,
       status:document.querySelector('#dashHero')?.dataset.rakWarmAssignment||'',
       version:String(window.RAK_RELEASE_VERSION||'')};
    })()`);
    assert.equal(sample.version,refs[label].version,label+' version drift in Chrome');
    if(label==='test'){
      assert(sample.first>0&&sample.first<sample.ready,'TEST must paint cached real assignment before startupReady');
      assert(sample.warm,'TEST did not restore machine from signed-in local account fixture');
      assert(sample.first<sample.fcp+350,'TEST early assignment not near first content paint');
    }else assert(!sample.warm,'MAIN cannot restore expired last-title snapshot');
    observations[label].push(sample);
  }
 }
 const median=(values)=>{const v=values.slice().sort((a,b)=>a-b);return v[Math.floor((v.length-1)/2)]};
 const report=Object.fromEntries(Object.entries(observations).map(([label,values])=>[label,{
   runs:values.length,firstMachineMs:median(values.map(x=>x.first)),
   startupReadyMs:median(values.map(x=>x.ready)),fcpMs:median(values.map(x=>x.fcp)),
   earlyCachedAssignmentPass:values.every(x=>label==='test'?x.first>0&&x.first<x.ready:!x.warm),
   samples:values.map(x=>({first:x.first,ready:x.ready,fcp:x.fcp}))}]));
 assert(report.test.firstMachineMs>0&&report.test.firstMachineMs<report.test.startupReadyMs);
 assert(report.test.startupReadyMs<report.main.startupReadyMs*1.5+150,'global startup regression relative to MAIN');
 console.log('[rak-home-assignment-ab] PASS '+JSON.stringify({kind:'real-public-mobile-Chromium-readonly-synthetic-account',...report}));
}finally{
 try{ws?.close()}catch{}
 chrome.kill('SIGTERM');
 for(const value of pending.values()){clearTimeout(value.timer);value.reject(Error('closing'));}
 fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});
}
