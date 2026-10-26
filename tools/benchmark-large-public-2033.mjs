#!/usr/bin/env node
// RaK 2.0.33 one-off, read-only public MAIN/TEST mobile browser benchmark.
// Dedicated temporary PR, no app/source/production changes, no authentication, no database requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';

const TARGETS={
  main:{url:'https://skoda-spada.vercel.app/',version:'2.0.33',db:'bkqamcbkiwumsvelahxr'},
  test:{url:'https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/',version:'2.0.33',db:'cgshssdjgzzuprlwnabl'}
};
const MODE_COUNTS={warm:24,cold:12,slow:6};
const chromePath=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert(chromePath,'Chromium required');
assert.equal(typeof WebSocket,'function','Node 22 required');

for(const [name,target] of Object.entries(TARGETS)){
  const assets=['rak-release-metadata.js','supabase-config.js','app.js','index.html'];
  const responses=await Promise.all(assets.map(p=>fetch(new URL('/'+p,target.url),{signal:AbortSignal.timeout(18000)})));
  const texts=await Promise.all(responses.map(r=>r.text()));
  responses.forEach((r,i)=>assert.equal(r.status,200,name+' missing '+assets[i]));
  assert(texts[0].includes("displayVersion: '"+target.version+"'"),name+' unexpected release');
  assert(texts[1].includes(target.db),name+' wrong database');
  assert(!texts[1].includes(name==='main'?TARGETS.test.db:TARGETS.main.db),name+' database isolation fail');
  target.assetSizes=Object.fromEntries(assets.map((a,i)=>[a,Buffer.byteLength(texts[i])]));
}

const port=await new Promise((resolve,reject)=>{
  const server=net.createServer();server.on('error',reject);
  server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(e=>e?reject(e):resolve(p))});
});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-large-benchmark-'));
const chrome=spawn(chromePath,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--remote-debugging-port='+port,'--user-data-dir='+dir,'about:blank'
],{stdio:'ignore',detached:process.platform!=='win32'});

let ws,requestId=0;const pending=new Map(),httpRequests=new Map();
let jsErrors=0,httpFailures=0;
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++requestId,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},23000);
  pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
});
const evaluate=async expression=>{
  const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw Error('CDP expression failed');return r.result?.value;
};
const until=async (expression,maxMs=28000)=>{
  const end=Date.now()+maxMs;
  while(Date.now()<end){try{if(await evaluate(expression))return}catch{}await pause(90)}
  throw Error('Page did not become ready ('+maxMs+'ms)');
};
const samples={warm:{main:[],test:[]},cold:{main:[],test:[]},slow:{main:[],test:[]}};
let currentLabel=null,currentMode=null;
try{
  let connected=false;
  for(let i=0;i<200;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');if(r.ok){connected=true;break}}catch{}await pause(100)}
  assert(connected,'Chrome debug port failed');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page')?.webSocketDebuggerUrl||'');
  ws.addEventListener('message',e=>{
    const m=JSON.parse(String(e.data));
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message||'CDP')):p.resolve(m.result||{});return;}
    if(m.method==='Fetch.requestPaused')void send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
    if(m.method==='Runtime.exceptionThrown')jsErrors++;
    if(m.method==='Network.requestWillBeSent'){
      const url=m.params?.request?.url||'';
      if(currentLabel&&url.startsWith(TARGETS[currentLabel].url))httpRequests.set(m.params.requestId,{label:currentLabel,mode:currentMode,bytes:0,status:0});
    }
    if(m.method==='Network.responseReceived'){
      const req=httpRequests.get(m.params?.requestId);
      if(req){req.status=m.params.response?.status||0;if(req.status>=400)httpFailures++;}
    }
    if(m.method==='Network.loadingFinished'){
      const req=httpRequests.get(m.params?.requestId);if(req)req.bytes=Number(m.params.encodedDataLength||0);
    }
  });
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
  await send('Network.setBypassServiceWorker',{bypass:true});
  await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});

  // The synthetic fixture is installed before application scripts read localStorage.
  // The worker and assignment are invented for this test; no personal account is accessed.
  const seed=String.raw`
try{
 const t=Date.now(),who='RAK_PERF_SYNTHETIC';
 localStorage.setItem('rotace_kalkulacky:user_profile_v1',JSON.stringify({accountNumber:who,fullName:'CI Synthetic',shiftTeam:'D'}));
 localStorage.setItem('rak_home_fast_assignments_v1',JSON.stringify({
  accountNumber:who,savedAt:t-36*3600000,
  entries:[{start:t-3600000,end:t+11*3600000,target:'TBKR07'},
           {start:t+23*3600000,end:t+35*3600000,target:'MFKF06'}]}));
 localStorage.setItem('rak_home_warm_snapshot_v1',JSON.stringify({at:t-36*3600000,account:who,values:{'#dashCalendar .dashboardValue':'--'}}));
}catch(_){}
`;
  await send('Page.addScriptToEvaluateOnNewDocument',{source:seed});

  for(const [mode,count] of Object.entries(MODE_COUNTS)){
    await send('Network.setCacheDisabled',{cacheDisabled:mode!=='warm'});
    await send('Network.emulateNetworkConditions',mode==='slow'?
      {offline:false,latency:120,downloadThroughput:250000,uploadThroughput:100000,connectionType:'cellular3g'}:
      {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1,connectionType:'wifi'});
    for(let round=0;round<count;round++){
      const order=round%2?['test','main']:['main','test'];
      for(const label of order){
        currentLabel=label;currentMode=mode;httpRequests.clear();
        if(mode==='cold')await send('Network.clearBrowserCache');
        const target=TARGETS[label];
        const url=target.url+'?rak_large_audit='+mode+'_'+round;
        const nav=await send('Page.navigate',{url});
        assert(!nav.errorText,'Navigation failed: '+label+'/'+mode);
        await until("document.readyState==='complete'&&!!document.querySelector('#dashHero')&&location.hostname==='"+new URL(url).hostname+"'");
        await until("window.__rakBootV2StartupReady===true");
        const s=await evaluate(`(()=>{
          const paints=performance.getEntriesByType('paint');
          const navigation=performance.getEntriesByType('navigation')[0];
          const machine=Number(window.__rakAssignmentFirstShownMs||0);
          const firstPaint=Number(paints.find(p=>p.name==='first-contentful-paint')?.startTime||0);
          const status=String(document.querySelector('#dashHero')?.dataset.rakWarmAssignment||'');
          return{
            version:String(window.RAK_RELEASE_VERSION||''),firstMachineMs:Math.round(machine),
            machineVisibleAtEarliestMs:Math.round(Math.max(firstPaint,machine)),
            firstContentfulPaintMs:Math.round(firstPaint),
            firstInteractiveMs:Math.round(Number(window.__rakFirstInteractiveMs||0)),
            startupReadyMs:Math.round(Number(window.__rakBootV2StartupReadyMs||0)),
            domContentLoadedMs:Math.round(navigation?.domContentLoadedEventEnd||0),
            loadMs:Math.round(navigation?.loadEventEnd||0),
            heroCache:status==='1'||!!window.__rakWarmAssignmentRestored?.restored,
            cachedMarker:!!window.__rakWarmAssignmentRestored?.restored,
            navBound:!!document.querySelector('.bottomNav'),
            horizontalOverflow:document.documentElement.scrollWidth>innerWidth+4
          };
        })()`);
        assert.equal(s.version,target.version,label+' version drift');
        assert(s.firstMachineMs>0&&s.firstMachineMs<s.startupReadyMs,'early local machine not ready on '+label+'/'+mode);
        assert(s.heroCache,'cached machine not restored on '+label+'/'+mode);
        assert(s.firstContentfulPaintMs>0,'FCP missing');
        assert(s.firstInteractiveMs>0,'first interactive signal missing');
        assert(s.navBound&&!s.horizontalOverflow,'mobile UI geometry failed');
        s.requests=httpRequests.size;
        s.bytes=[...httpRequests.values()].reduce((sum,r)=>sum+r.bytes,0);
        samples[mode][label].push(s);
        if((round+1)%8===0)console.log('[rak-large-audit] progress '+mode+' '+(round+1)+'/'+count);
      }
    }
  }
  const percentile=(values,p)=>{const a=values.slice().sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(a.length*p)-1)]};
  const fields=['firstMachineMs','machineVisibleAtEarliestMs','firstContentfulPaintMs','firstInteractiveMs','startupReadyMs','domContentLoadedMs','loadMs','requests','bytes'];
  const summary={};
  for(const [mode,sets] of Object.entries(samples)){
    summary[mode]={};
    for(const [label,rows] of Object.entries(sets)){
      const metrics={};
      for(const key of fields){const nums=rows.map(r=>r[key]);metrics[key]={p50:percentile(nums,.5),p95:percentile(nums,.95),min:Math.min(...nums),max:Math.max(...nums)};}
      summary[mode][label]={runs:rows.length,metrics,successfulAssignments:rows.filter(r=>r.heroCache).length};
    }
  }
  const report={
    schema:'rak-large-public-2033-v1',targetVersion:'2.0.33',profile:'Chromium mobile 390x844 DPR3',
    isolatedReadOnly:true,networkBlockedSupabase:true,serviceWorkerBypassed:true,syntheticFixture:true,
    counts:MODE_COUNTS,assetSizes:Object.fromEntries(Object.entries(TARGETS).map(([k,v])=>[k,v.assetSizes])),
    jsErrors,httpFailures,summary
  };
  assert.equal(samples.warm.main.length,24);assert.equal(samples.warm.test.length,24);
  assert.equal(samples.cold.main.length,12);assert.equal(samples.cold.test.length,12);
  assert.equal(samples.slow.main.length,6);assert.equal(samples.slow.test.length,6);
  // Cross-environment performance parity: no meaningful regression from same source.
  for(const mode of Object.keys(MODE_COUNTS)){
    const m=summary[mode].main.metrics.startupReadyMs.p50,t=summary[mode].test.metrics.startupReadyMs.p50;
    assert(t<Math.max(m*1.65,m+1000),mode+' TEST startup regressions exceed tolerance');
  }
  console.log('[rak-large-audit] RESULT '+JSON.stringify(report));
  console.log('[rak-large-audit] PASS '+Object.values(MODE_COUNTS).reduce((s,n)=>s+n,0)*2+' public site navigations; database writes blocked; synthetic local profile');
}finally{
  try{ws?.close()}catch{}
  for(const value of pending.values()){clearTimeout(value.timer);value.reject(Error('cleanup'))}
  if(chrome.exitCode===null&&chrome.pid){try{if(process.platform!=='win32')process.kill(-chrome.pid,'SIGTERM');else chrome.kill('SIGTERM')}catch(e){if(e.code!=='ESRCH')throw e}}
  if(chrome.exitCode===null)await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),pause(4000)]);
  await pause(350);fs.rmSync(dir,{recursive:true,force:true,maxRetries:20,retryDelay:200});
}
