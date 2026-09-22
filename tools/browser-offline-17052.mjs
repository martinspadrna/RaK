#!/usr/bin/env node
// RaK 1.7.52+: mobile Chromium, offline reboot and online recovery; never logs in or writes to Supabase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import RELEASE_METADATA from '../rak-release-metadata.js';
const ROOT=path.resolve(process.cwd());
const CHROME=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>{try{return fs.statSync(n).isFile();}catch{return false;}});
assert(CHROME,'[17052-browser] Chrome/Chromium binary missing');
assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'))).version,'1.7.0');
const config=fs.readFileSync(path.join(ROOT,'supabase-config.js'),'utf8');
const expected=RELEASE_METADATA.displayVersion;
assert(/^1\.7\.\d+$/.test(expected),'[17052-browser] expected release missing from metadata');
assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'),'[17052-browser] preview must use TEST database');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname.startsWith('/api/')){res.writeHead(503);res.end();return;}
 const filename=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
 if(!filename.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(filename,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','cache-control':'public,max-age=60','service-worker-allowed':'/'});
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(filename).pipe(res);
 });
});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17052-chrome-'));
let chrome=null,ws=null;const pending=new Map();let nextId=0;const exceptions=[];const httpFailures=[];
let chromeStderr='',chromeSpawnError='';
function send(method,params={}){
 assert(ws&&ws.readyState===WebSocket.OPEN,'[17052-browser] debugger disconnected');
 const id=++nextId;
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
  pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));
 });
}
async function check(expression){
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw Error('[17052-browser] JavaScript expression: '+expression+' '+(exceptionDetails.exception?.description||exceptionDetails.text));
 return result.value;
}
async function until(expression,ms=25000){
 const end=Date.now()+ms;let last;
 while(Date.now()<end){try{last=await check(expression);if(last)return last;}catch(e){last=String(e.message);}await delay(200);}
 throw Error('[17052-browser] timeout: '+expression+'; last='+JSON.stringify(last));
}
async function boot(label,expectedRelease){
 const start=Date.now();
 await until("document.readyState==='complete' && !!document.querySelector('.dashboardAppTitle') && !!document.querySelector('#home')");
 await until('!!window.__rakBootV2StartupReady');
 const data=await check(`(()=>({title:document.title,version:window.RAK_RELEASE_VERSION||'',build:window.RAK_PWA_BUILD||'',width:innerWidth,docWidth:document.documentElement.scrollWidth,home:!!document.querySelector('#home'),nav:!!document.querySelector('.bottomNav'),controller:!!navigator.serviceWorker?.controller,connection:document.documentElement.dataset.connection||'',updateToast:!!document.querySelector('.rakUpdateToast')}))()`);
 assert.match(data.title,/Rotace a Kalkulačky/);assert.equal(data.version,expectedRelease,'[17052-browser] unexpected release');
 assert(data.home&&data.nav,'[17052-browser] mobile shell/nav missing');
 assert(data.docWidth<=data.width+4,`[17052-browser] horizontal overflow ${data.docWidth} > ${data.width}`);
 console.log(`[17052-browser] ${label} PASS ${Date.now()-start}ms viewport=${data.width} document=${data.docWidth} SW=${data.controller}`);
 return data;
}
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/';
 chrome=spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:['ignore','ignore','pipe']});
 chrome.on('error',error=>{chromeSpawnError=String(error.message||error);});
 chrome.stderr.on('data',chunk=>{chromeStderr=(chromeStderr+String(chunk)).slice(-3000);});
 let port=0;
 // Allow slower runner startup, but never bypass the real Chrome and offline gate.
 for(let i=0;i<300;i++){
  if(chromeSpawnError||chrome.exitCode!==null)throw Error('[17052-browser] Chrome exited: '+chrome.exitCode+'; spawn='+chromeSpawnError+'; stderr='+chromeStderr.slice(-1500));
  const file=path.join(temp,'DevToolsActivePort');
  if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);break;}
  await delay(100);
 }
 assert(port>0,'[17052-browser] Chrome debugger did not start: executable='+CHROME+'; exit='+chrome.exitCode+'; spawn='+chromeSpawnError+'; stderr='+chromeStderr.slice(-1800));
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const tab=tabs.find(t=>t.type==='page');assert(tab?.webSocketDebuggerUrl,'[17052-browser] no Chrome page');
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){
   const p=pending.get(message.id);pending.delete(message.id);clearTimeout(p.timeout);
   message.error?p.reject(Error(message.error.message||'CDP error')):p.resolve(message.result||{});
  }
  if(message.method==='Fetch.requestPaused')void send('Fetch.failRequest',{requestId:message.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
  if(message.method==='Runtime.exceptionThrown'){
   const d=message.params?.exceptionDetails||{};
   const detail=String(d.exception?.description||d.exception?.value||d.text||'uncaught exception');
   const origin=String(d.url||d.stackTrace?.callFrames?.[0]?.url||'unknown').replace(/https?:\/\/[^/]+/g,'[origin]');
   exceptions.push(`${detail.slice(0,750)} @ ${origin}:${d.lineNumber??'?'}:${d.columnNumber??'?'}`);
  }
  if(message.method==='Network.responseReceived'&&message.params?.response?.status>=400&&message.params?.response?.url?.startsWith('http://127.0.0.1:'))httpFailures.push({url:message.params.response.url,status:message.params.response.status});
 });
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
 // All remote HTTPS is blocked before navigation; synthetic anonymous tests only.
 await send('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const navigation=await send('Page.navigate',{url:base});assert(!navigation.errorText,'[17052-browser] '+navigation.errorText);
 await boot('cold mobile',expected);
 await until('!!navigator.serviceWorker?.controller',30000);
 await until('!!window.__rotacePwaBootstrapped');
 await check("window.__rotaceRequestPwaCacheStatus?.('ci-mobile-offline') || false");
 await until(`window.getPwaHardeningStatus?.().swExpectedCacheVersion==='v${expected}'`,15000);
 await until('window.getPwaHardeningStatus?.().swPrecacheMissingCount===0',15000);
 assert.equal(await check("!!document.querySelector('.rakUpdateToast')"),false,'[17052-browser] false update toast after fresh install');
 // Simulate the iPhone failure: newer bridge snapshot next to an older canonical cache.
 assert.equal(await check(`(()=>{
   const current=JSON.parse(JSON.stringify(app.rotation));
   const monthKey=Object.keys(current.months||{})[0];
   if(!monthKey)return false;
   current.months[monthKey].notes=[...(current.months[monthKey].notes||[]),{date:'',shift:'',person:'',code:'',text:'RAK-CI-OFFLINE-17073'}];
   const stale={months:{'5/26':{hard:{title:'Rotace tvrdota',machines:[],rows:[]},soft:{title:'Rotace měkota',machines:[],rows:[]},notes:[]}}};
   localStorage.setItem('rotace_kalkulacky_state_v123',JSON.stringify(stale));
   localStorage.setItem('rotace_supabase_local_state_v1',JSON.stringify({updatedAt:Date.now(),version:window.APP_VERSION||'',rotation:current,machineSettingsRows:[],announcements:[]}));
   localStorage.setItem('rotace_supabase_queue_v1','[]');
   return true;
 })()`),true,'[17052-browser] divergent rotation fixture was not stored');
 const before=httpFailures.length;
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await send('Page.reload',{ignoreCache:false});
 const offline=await boot('offline reload',expected);
 assert(offline.controller,'[17052-browser] offline shell lost service worker');
 const offlineRotation=await check(`(async()=>{
   await window.rakEnsureFeature('rotation');
   await window.rakEnsureFeature('sync');
   await window.syncRotationFromSupabase(false);
   const marker=Object.values(app.rotation?.months||{}).some(month=>(month.notes||[]).some(note=>note.text==='RAK-CI-OFFLINE-17073'));
   const cached=window.RotationSupabaseBridge.loadCachedRotationState();
   const canonical=JSON.parse(localStorage.getItem('rotace_kalkulacky_state_v123')||'null');
   const snapshot=JSON.parse(localStorage.getItem('rotace_supabase_local_state_v1')||'null');
   const canonicalMarker=Object.values(canonical?.months||{}).some(month=>(month.notes||[]).some(note=>note.text==='RAK-CI-OFFLINE-17073'));
   return {rotationReady:window.rakIsFeatureReady('rotation'),syncReady:window.rakIsFeatureReady('sync'),marker,cached:!!cached?.payload,canonicalMarker,singleCopy:snapshot?.rotation===null,render:typeof renderRotace==='function'};
 })()`);
 assert.deepEqual(offlineRotation,{rotationReady:true,syncReady:true,marker:true,cached:true,canonicalMarker:true,singleCopy:true,render:true},'[17052-browser] canonical cache migration or offline feature bundle missing');
 const offlineIcons=await check(`(()=>{const icons=Array.from(document.querySelectorAll('img.dashboardIconImg,img.bottomNavIconImg'));return {count:icons.length,broken:icons.filter(img=>!img.complete||img.naturalWidth<1).map(img=>img.getAttribute('src')||'')}})()`);
 assert(offlineIcons.count>=12,'[17052-browser] dashboard/navigation icons were not rendered');
 assert.deepEqual(offlineIcons.broken,[],'[17052-browser] offline dashboard/navigation icons missing');
 assert.equal(httpFailures.length,before,'[17052-browser] offline shell/rotation caused HTTP errors');
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await send('Page.reload',{ignoreCache:false});await boot('online recovery',expected);
 const recovered=await check(`(async()=>{
   await window.rakEnsureFeature('sync');
   await new Promise(resolve=>setTimeout(resolve,50));
   const status=window.getSupabaseSyncStatus?.()||{};
   const queue=JSON.parse(localStorage.getItem('rotace_supabase_queue_v1')||'[]');
   return {conflictCount:Number(status.conflictCount||0),conflict:/Konflikt synchronizace/.test(String(status.label||'')),queueLength:queue.length};
 })()`);
 assert.deepEqual(recovered,{conflictCount:0,conflict:false,queueLength:0},'[17052-browser] online recovery created a false conflict');
 const severe=exceptions.filter(t=>!/NetworkError|Failed to fetch|fetch|Supabase|network|offline/i.test(t));
 assert(severe.length<=2,'[17052-browser] uncaught browser exceptions ('+severe.length+'/'+exceptions.length+'): '+severe.slice(0,5).join(' | '));
 console.log('[17052-browser] PASS mobile cold-start, canonical cached Rotation offline, semantic conflict-free recovery, cache version and viewport');
}catch(error){console.error('[17052-browser] FAIL '+error.stack);process.exitCode=1;
}finally{
 for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Chrome closing'));}pending.clear();
 try{ws?.close();}catch{}try{chrome?.kill('SIGTERM');}catch{}
 await new Promise(resolve=>server.close(resolve));try{fs.rmSync(temp,{recursive:true,force:true});}catch{}
}

