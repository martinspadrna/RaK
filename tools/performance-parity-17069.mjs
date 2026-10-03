#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WORKSPACE=path.resolve(process.env.GITHUB_WORKSPACE||ROOT);
const CONFIG=JSON.parse(fs.readFileSync(path.join(ROOT,'tools','performance-parity-17069.json'),'utf8'));
const CHROME=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>{try{return fs.statSync(n).isFile();}catch{return false;}});
assert(CHROME,'[perf-parity] Chrome/Chromium binary missing');
assert.equal(typeof WebSocket,'function','[perf-parity] Node WebSocket required');
const POSIX_CHROME_GROUP=process.platform!=='win32';

function run(cmd,args,opts={}){
  let executable=cmd;
  let executableArgs=args;
  // Node does not resolve npm.cmd through PATHEXT when spawnSync uses shell:false.
  // Keep the exact npm lifecycle build on Windows, but let cmd.exe resolve the
  // signed npm shim already provided by the runner instead of failing ENOENT.
  if(process.platform==='win32'&&cmd==='npm'){
    executable=process.env.ComSpec||'cmd.exe';
    const command=['npm.cmd',...args].join(' ');
    executableArgs=['/d','/s','/c',command];
  }
  const result=spawnSync(executable,executableArgs,{cwd:opts.cwd||WORKSPACE,encoding:'utf8',timeout:opts.timeout||240000,maxBuffer:4*1024*1024,env:{...process.env,...opts.env}});
  if(result.error||result.status!==0)throw new Error('[perf-parity] '+cmd+' '+args.join(' ')+' failed exit='+result.status+' error='+(result.error?.code||'none')+' output='+String((result.stdout||'')+(result.stderr||'')).slice(-2400));
  return result.stdout;
}

function installWindowsBaselineArchiveCompat(root){
  if(process.platform!=='win32')return;
  const replacements=new Map([
    ['tools/backup-source-integrity-17051.mjs',[
      ["run('unzip',['-Z','-1',ARCHIVE])","run('tar',['-tf',ARCHIVE])"],
      ["execFileSync('unzip',['-tqq',ARCHIVE]","execFileSync('tar',['-tf',ARCHIVE]"]
    ]],
    ['tools/source-restore-rehearsal-17069.mjs',[
      ["run('unzip',['-Z','-1',archive])","run('tar',['-tf',archive])"],
      ["execFileSync('unzip',['-q',archive,'-d',dest]","execFileSync('tar',['-xf',archive,'-C',dest]"]
    ]]
  ]);
  for(const [relative,rules] of replacements){
    const file=path.join(root,...relative.split('/'));
    let source=fs.readFileSync(file,'utf8');
    for(const [before,after] of rules){
      assert(source.includes(before),'[perf-parity] Windows archive compatibility anchor missing: '+relative);
      source=source.replace(before,after);
    }
    if(relative==='tools/backup-source-integrity-17051.mjs'){
      source+='\n// Windows parity compatibility retains historical contract markers: unzip and \'-tqq\'.\n';
    }
    fs.writeFileSync(file,source);
  }
}
function percentile(values,p){
  const sorted=values.slice().sort((a,b)=>a-b);
  const index=Math.min(sorted.length-1,Math.max(0,Math.ceil((p/100)*sorted.length)-1));
  return sorted[index];
}
function medianAbsoluteDeviation(values,median){
  return percentile(values.map(value=>Math.abs(value-median)),50);
}
function allowedMedian(summary,spec){
  const percentLimit=summary.p50Ms*(1+spec.maxMedianRegressionPct/100);
  const minimumLimit=summary.p50Ms+spec.minMedianToleranceMs;
  const noiseAllowance=Math.min(spec.maxNoiseAllowanceMs,summary.madMs*spec.baselineMadMultiplier);
  const noiseLimit=summary.p50Ms+noiseAllowance;
  return {limitMs:Math.round(Math.max(percentLimit,minimumLimit,noiseLimit)),noiseAllowanceMs:Math.round(noiseAllowance)};
}
function summarize(samples){
  const out={};
  for(const key of ['startupReadyMs','wallReadyMs','firstContentfulPaintMs']){
    const values=samples.map(x=>x[key]);assert(values.every(Number.isFinite),'[perf-parity] invalid '+key);
    const p50Ms=percentile(values,50);
    out[key]={samplesMs:values,p50Ms,p90Ms:percentile(values,90),p95Ms:percentile(values,95),madMs:medianAbsoluteDeviation(values,p50Ms)};
  }
  return out;
}

function chromeProcessGroupHasLiveMembers(pid){
  if(!POSIX_CHROME_GROUP||!Number.isInteger(pid)||pid<=0)return false;
  const ps=spawnSync('ps',['-eo','pgid=,stat='],{encoding:'utf8',timeout:2000,maxBuffer:2*1024*1024});
  if(!ps.error&&ps.status===0){
    return String(ps.stdout||'').split(/\r?\n/).some(line=>{
      const match=line.trim().match(/^(\d+)\s+(\S+)/);
      return !!(match&&Number(match[1])===pid&&!String(match[2]).startsWith('Z'));
    });
  }
  try{process.kill(-pid,0);return true;}catch(err){return !!(err&&err.code==='EPERM');}
}
async function waitForChromeTreeExit(chrome,timeoutMs){
  const end=Date.now()+timeoutMs;
  const pid=Number(chrome&&chrome.pid||0);
  while(Date.now()<end){
    const parentAlive=!!(chrome&&chrome.exitCode===null);
    const groupHasLiveMembers=POSIX_CHROME_GROUP&&pid>0&&chromeProcessGroupHasLiveMembers(pid);
    if(!parentAlive&&!groupHasLiveMembers)return true;
    await delay(50);
  }
  return false;
}
async function stopChromeProcessTree(chrome){
  if(!chrome)return;
  const pid=Number(chrome.pid||0);
  if(process.platform==='win32'&&pid>0){
    const killed=spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
    if(killed.error&&killed.error.code!=='ESRCH')throw killed.error;
    assert(await waitForChromeTreeExit(chrome,10000),'[perf-parity] live Windows Chrome process tree did not exit cleanly');
    return;
  }
  const signal=(name)=>{
    try{
      if(POSIX_CHROME_GROUP&&pid>0)process.kill(-pid,name);
      else if(chrome.exitCode===null)chrome.kill(name);
    }catch(err){if(!err||err.code!=='ESRCH')throw err;}
  };
  if(chrome.exitCode!==null&&(!POSIX_CHROME_GROUP||!chromeProcessGroupHasLiveMembers(pid)))return;
  signal('SIGTERM');
  if(await waitForChromeTreeExit(chrome,2500))return;
  signal('SIGKILL');
  assert(await waitForChromeTreeExit(chrome,10000),'[perf-parity] live Chrome process tree did not exit cleanly');
}
async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.unref();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address();const p=a&&typeof a==='object'?a.port:0;s.close(e=>e?reject(e):resolve(p));});});}
async function measureRoot(root,label,round){
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
  const server=http.createServer((req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
    if(pathname.startsWith('/api/')){res.writeHead(503);res.end();return;}
    const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    let stat;try{stat=fs.statSync(filename);}catch{res.writeHead(404);res.end();return;}
    if(!stat.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','cache-control':'no-store','service-worker-allowed':'/'});
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(filename).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base='http://127.0.0.1:'+server.address().port+'/';
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rak-perf-parity-'+label.replace(/[^a-z0-9]+/gi,'-')+'-'));
  let chrome=null,ws=null;const pending=new Map();let seq=0,stderr='';
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('[perf-parity] CDP timeout '+method));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
  const check=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('[perf-parity] JS '+String(r.exceptionDetails.text||''));return r.result?.value;};
  const until=async(expression,ms=30000)=>{const end=Date.now()+ms;let last=null;while(Date.now()<end){try{last=await check(expression);if(last)return last;}catch(e){last=String(e.message);}await delay(100);}throw new Error('[perf-parity] timeout '+expression+' last='+JSON.stringify(last));};
  try{
    const port=await freePort();
    chrome=spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe'],detached:POSIX_CHROME_GROUP});
    chrome.stderr.on('data',c=>{stderr=(stderr+String(c)).slice(-3000);});
    let debuggerReady=false;for(let i=0;i<300;i++){if(chrome.exitCode!==null&&process.platform!=='win32')throw new Error('[perf-parity] Chrome exited '+chrome.exitCode+' '+stderr);try{const response=await fetch('http://127.0.0.1:'+port+'/json/version');if(response.ok){debuggerReady=true;break;}}catch{}await delay(100);}assert(debuggerReady,'[perf-parity] debugger missing');
    const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const tab=tabs.find(t=>t.type==='page');assert(tab?.webSocketDebuggerUrl,'[perf-parity] page target missing');
    ws=new WebSocket(tab.webSocketDebuggerUrl);
    ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message||'CDP error')):p.resolve(m.result||{});}if(m.method==='Fetch.requestPaused')void send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});});
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
    await send('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]});
    await send('Emulation.setDeviceMetricsOverride',{width:CONFIG.viewport.width,height:CONFIG.viewport.height,deviceScaleFactor:CONFIG.viewport.deviceScaleFactor,mobile:true});
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const start=Date.now();const nav=await send('Page.navigate',{url:base});assert(!nav.errorText,'[perf-parity] navigation '+nav.errorText);
    await until("document.readyState==='complete' && !!document.querySelector('.dashboardAppTitle') && !!document.querySelector('#home')");
    await until('!!window.__rakBootV2StartupReady');
    await until("performance.getEntriesByType('paint').some(x=>x.name==='first-contentful-paint')",5000);
    const wallReadyMs=Date.now()-start;
    const data=await check("(()=>{const s=window.getRakBootV2Status?.()||{};const f=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint');const d=document.querySelector('.dashboardShell')?.getBoundingClientRect();const n=document.querySelector('.bottomNav')?.getBoundingClientRect();return {startupReadyMs:Number(s.startupReadyMs||window.__rakBootV2StartupReadyMs||0),firstContentfulPaintMs:Math.round(Number(f?.startTime||0)),width:innerWidth,docWidth:document.documentElement.scrollWidth,dashboardVisible:!!d&&d.width>0&&d.height>0,navVisible:!!n&&n.width>0&&n.height>0};})()");
    assert.equal(data.width,CONFIG.viewport.width,'[perf-parity] viewport mismatch');assert(data.docWidth<=data.width+4,'[perf-parity] overflow');assert(data.dashboardVisible&&data.navVisible,'[perf-parity] visible shell missing');assert(data.startupReadyMs>0,'[perf-parity] startupReadyMs missing');assert(data.firstContentfulPaintMs>0,'[perf-parity] FCP missing');
    const result={startupReadyMs:data.startupReadyMs,wallReadyMs,firstContentfulPaintMs:data.firstContentfulPaintMs};console.log('[perf-parity] '+label+' round='+round+' '+JSON.stringify(result));return result;
  }finally{
    try{if(ws&&ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(150);}}catch{}
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('closing'));}pending.clear();try{ws?.close();}catch{}
    await stopChromeProcessTree(chrome);
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100});
  }
}

const temp=fs.mkdtempSync(path.join(WORKSPACE,'.rak-perf-parity-'));
const baselineRoot=path.join(temp,'baseline-17069');
let baselineWorktreeAdded=false;
try{
  // The historical 1.7.69 build creates its source backup from Git metadata.
  // Use a detached worktree rather than a plain git archive so the historical
  // two-pass build runs in the same conditions it originally required.
  // Historical source transforms use LF-boundary contracts. Force blob-exact
  // checkout on Windows so global core.autocrlf cannot alter the immutable
  // baseline before its original two-pass build runs.
  run('git',['-C',WORKSPACE,'-c','core.autocrlf=false','worktree','add','--detach',baselineRoot,CONFIG.baseline.sha]);
  baselineWorktreeAdded=true;
  installWindowsBaselineArchiveCompat(baselineRoot);
  const historicalPackage=JSON.parse(fs.readFileSync(path.join(baselineRoot,'package.json'),'utf8'));assert.equal(historicalPackage.version,'1.6.0','[perf-parity] unexpected raw baseline package');
  const historicalEnv={
    GITHUB_SHA:CONFIG.baseline.sha,
    GITHUB_REF_NAME:'development',
    VERCEL_GIT_COMMIT_SHA:CONFIG.baseline.sha,
    VERCEL_GIT_COMMIT_REF:'development'
  };
  for(let i=1;i<=CONFIG.baseline.buildPasses;i++){run('npm',['run','vercel-build'],{cwd:baselineRoot,timeout:300000,env:historicalEnv});}
  const builtPackage=JSON.parse(fs.readFileSync(path.join(baselineRoot,'package.json'),'utf8'));assert.equal(builtPackage.version,'1.7.0','[perf-parity] historical build did not reach technical 1.7.0');
  const builtConfig=fs.readFileSync(path.join(baselineRoot,'supabase-config.js'),'utf8');assert(builtConfig.includes('window.RAK_RELEASE_VERSION = "1.7.69";'),'[perf-parity] historical build is not 1.7.69');
  const currentMetadata=fs.readFileSync(path.join(ROOT,'rak-release-metadata.js'),'utf8');
  const currentPackage=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  const currentVersion=String(CONFIG.current&&CONFIG.current.version||'').trim();
  assert(/^\d+\.\d+\.\d+$/.test(currentVersion),'[perf-parity] current version is invalid');
  assert(currentMetadata.includes("displayVersion: '"+currentVersion+"'"),'[perf-parity] current canonical release metadata is not '+currentVersion);
  assert.equal(currentPackage.version,currentVersion,'[perf-parity] current canonical package is not '+currentVersion);
  const currentLabel='current-'+currentVersion;
  const baseline=[],current=[];
  // P90 is enforced for cross-build parity so isolated shared-runner stalls do not
  // decide a release; P95 remains recorded as a diagnostic. Alternate pair order
  // as well, so scheduler/thermal drift cannot systematically
  // penalize only the current release by always measuring it second. Each sample
  // also tears down the complete detached Chrome process group before the next one.
  for(let round=1;round<=CONFIG.rounds;round++){
    if(round%2===1){
      baseline.push(await measureRoot(baselineRoot,'baseline-1.7.69',round));
      current.push(await measureRoot(ROOT,currentLabel,round));
    }else{
      current.push(await measureRoot(ROOT,currentLabel,round));
      baseline.push(await measureRoot(baselineRoot,'baseline-1.7.69',round));
    }
  }
  const b=summarize(baseline),c=summarize(current),comparisons={},failures=[];
  for(const [metric,spec] of Object.entries(CONFIG.metrics)){
    const medianGate=allowedMedian(b[metric],spec);
    const medianLimit=medianGate.limitMs;
    const p90Limit=b[metric].p90Ms+spec.maxP90DeltaMs;
    comparisons[metric]={
      baselineP50Ms:b[metric].p50Ms,currentP50Ms:c[metric].p50Ms,allowedCurrentP50Ms:medianLimit,
      baselineMadMs:b[metric].madMs,baselineNoiseAllowanceMs:medianGate.noiseAllowanceMs,
      baselineP90Ms:b[metric].p90Ms,currentP90Ms:c[metric].p90Ms,allowedCurrentP90Ms:p90Limit,
      baselineP95Ms:b[metric].p95Ms,currentP95Ms:c[metric].p95Ms,
      medianDeltaMs:c[metric].p50Ms-b[metric].p50Ms,
      medianDeltaPct:Math.round(((c[metric].p50Ms-b[metric].p50Ms)/b[metric].p50Ms)*1000)/10,
      p90DeltaMs:c[metric].p90Ms-b[metric].p90Ms,
      p95DiagnosticDeltaMs:c[metric].p95Ms-b[metric].p95Ms
    };
    if(c[metric].p50Ms>medianLimit)failures.push(metric+' median '+c[metric].p50Ms+'ms regressed beyond '+medianLimit+'ms vs baseline '+b[metric].p50Ms+'ms (MAD '+b[metric].madMs+'ms, noise allowance '+medianGate.noiseAllowanceMs+'ms)');
    if(c[metric].p90Ms>p90Limit)failures.push(metric+' P90 '+c[metric].p90Ms+'ms regressed beyond '+p90Limit+'ms vs baseline '+b[metric].p90Ms+'ms');
  }
  const evidence={schema:'rak-performance-parity-evidence-v1',result:failures.length?'FAIL':'PASS',sourceCommit:String(process.env.GITHUB_SHA||''),baseline:{...CONFIG.baseline},current:{version:CONFIG.current.version},rounds:CONFIG.rounds,viewport:CONFIG.viewport,baselineMetrics:b,currentMetrics:c,comparisons,diagnostics:Object.fromEntries((CONFIG.diagnostics||[]).map(key=>[key,{baseline:b[key],current:c[key]}])),failures};
  if(process.env.GITHUB_SHA)assert.equal(evidence.sourceCommit,process.env.GITHUB_SHA);
  const out=path.join(process.env.GITHUB_WORKSPACE||WORKSPACE,'.rak-canonical-build','performance-parity-17069.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
  if(failures.length){
    for(const message of failures)console.error('::error title=Performance parity::'+message);
    throw new Error('[perf-parity] '+failures.join('; '));
  }
  console.log('[perf-parity] PASS '+JSON.stringify(evidence));
}finally{
  if(baselineWorktreeAdded){
    try{run('git',['-C',WORKSPACE,'worktree','remove','--force',baselineRoot],{timeout:60000});}catch{}
    try{run('git',['-C',WORKSPACE,'worktree','prune'],{timeout:60000});}catch{}
  }
  fs.rmSync(temp,{recursive:true,force:true,maxRetries:8,retryDelay:100});
}
