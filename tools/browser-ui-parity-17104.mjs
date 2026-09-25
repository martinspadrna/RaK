#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const ROOT=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'[ui-parity] Chromium is required');
assert.equal(typeof WebSocket,'function','[ui-parity] Node WebSocket client is required');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/ui-parity-17069.json'),'utf8'));
const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const bodyMatch=source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
assert(bodyMatch,'[ui-parity] index body missing');
const localCss=[...source.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)]
  .map(m=>m[1].split('?')[0]).filter(href=>!/^https?:/i.test(href)).filter((href,index,array)=>array.indexOf(href)===index)
  .map(href=>{const file=path.join(ROOT,href);assert(fs.existsSync(file),'[ui-parity] missing stylesheet '+href);return fs.readFileSync(file,'utf8')}).join('\n');
const inlineCss=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const body=bodyMatch[1].replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<iframe\b[\s\S]*?<\/iframe>/gi,'');
const html='<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+inlineCss+'\n'+localCss+'</style></head><body>'+body+'</body></html>';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
  return await new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();const port=address&&typeof address==='object'?address.port:0;server.close(err=>err?reject(err):resolve(port));});});
}
async function targetFor(port){
  let lastErr=null;
  for(let i=0;i<100;i++){
    try{
      const res=await fetch('http://127.0.0.1:'+port+'/json/list');
      if(res.ok){const list=await res.json();const target=list.find(x=>x.type==='page'&&String(x.url||'').startsWith('file:'))||list.find(x=>x.type==='page');if(target&&target.webSocketDebuggerUrl)return target;}
    }catch(err){lastErr=err;}
    await sleep(100);
  }
  throw new Error('[ui-parity] DevTools target unavailable '+String(lastErr||''));
}
async function openCdp(url){
  const ws=new WebSocket(url);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();
  ws.addEventListener('message',event=>{let msg;try{msg=JSON.parse(String(event.data));}catch{return;}if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(new Error('[ui-parity] CDP '+JSON.stringify(msg.error)));else p.resolve(msg.result||{});});
  return {
    send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});},
    close(){try{ws.close();}catch{}}
  };
}
async function waitReady(cdp){
  for(let i=0;i<50;i++){const r=await cdp.send('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});if(r.result&&r.result.value==='complete')return;await sleep(100);}
  throw new Error('[ui-parity] page did not reach readyState complete');
}
function measurementExpression(){
  const spec=JSON.stringify({pages:manifest.criticalPages.map(p=>p.id)});
  return "(()=>{const spec="+spec+";const rect=e=>e.getBoundingClientRect();const css=e=>getComputedStyle(e);const allPages=[...document.querySelectorAll('.page')];const pageResults=[];for(const id of spec.pages){for(const p of allPages)p.classList.remove('active');const root=document.getElementById(id);if(root)root.classList.add('active');scrollTo(0,0);const r=root?rect(root):null;pageResults.push({id,exists:!!root,display:root?css(root).display:'missing',left:r?r.left:null,right:r?r.right:null,width:r?r.width:null,scrollWidth:document.documentElement.scrollWidth});}const nav=[...document.querySelectorAll('.bottomNavBtn')].map(btn=>{const r=rect(btn);return {page:btn.dataset.page||'',action:btn.dataset.action||'',display:css(btn).display,width:r.width,height:r.height};});const navRoot=document.querySelector('.bottomNav');const nr=navRoot?rect(navRoot):null;return {viewport:{width:innerWidth,height:innerHeight},pages:pageResults,nav,navRoot:nr?{left:nr.left,right:nr.right,width:nr.width,display:css(navRoot).display}:null,docWidth:document.documentElement.scrollWidth};})()";
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-ui-parity-cdp-'));
let proc=null;let cdp=null;let stderr='';
try{
  const file=path.join(tmp,'index.html');fs.writeFileSync(file,html,'utf8');
  const port=await freePort();
  const profile=path.join(tmp,'profile');
  proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--allow-file-access-from-files','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+profile,'--no-first-run','--no-default-browser-check',pathToFileURL(file).href],{stdio:['ignore','ignore','pipe']});
  proc.stderr.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-5000);});
  const target=await targetFor(port);
  cdp=await openCdp(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  for(const viewport of manifest.viewports){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:3,mobile:true,screenWidth:viewport.width,screenHeight:viewport.height,positionX:0,positionY:0,screenOrientation:{type:'portraitPrimary',angle:0}});
    await cdp.send('Page.reload',{ignoreCache:true});
    await waitReady(cdp);
    await sleep(150);
    const evaluated=await cdp.send('Runtime.evaluate',{expression:measurementExpression(),returnByValue:true});
    const data=evaluated.result&&evaluated.result.value;
    assert(data,'[ui-parity] no evaluation result');
    assert(data.viewport.width===viewport.width,'[ui-parity] emulated viewport width mismatch '+JSON.stringify({wanted:viewport.width,actual:data.viewport.width}));
    assert(data.viewport.height===viewport.height,'[ui-parity] emulated viewport height mismatch '+JSON.stringify({wanted:viewport.height,actual:data.viewport.height}));
    const limit=manifest.invariants.maxHorizontalOverflowPx;
    assert.equal(data.pages.length,manifest.criticalPages.length);
    for(const page of data.pages){
      assert(page.exists,'[ui-parity] page missing '+page.id);
      assert(page.display!=='none','[ui-parity] page hidden after activation '+page.id);
      assert(page.width>0,'[ui-parity] zero-width page '+page.id);
      assert(page.left>=-limit,'[ui-parity] page escapes left '+JSON.stringify(page));
      assert(page.right<=data.viewport.width+limit,'[ui-parity] page escapes right '+JSON.stringify(page));
      assert(page.scrollWidth<=data.viewport.width+limit,'[ui-parity] horizontal overflow on '+page.id+' '+JSON.stringify(page));
    }
    assert.deepEqual(data.nav.map(x=>({page:x.page,action:x.action})),manifest.bottomNav);
    assert(data.nav.every(x=>x.display!=='none'&&x.height>=manifest.invariants.minBottomNavButtonHeightPx),'[ui-parity] bottom-nav target hidden/too short '+JSON.stringify(data.nav));
    assert(data.navRoot&&data.navRoot.display!=='none','[ui-parity] bottom nav hidden');
    assert(data.docWidth<=data.viewport.width+limit,'[ui-parity] document horizontal overflow '+JSON.stringify(data));
    process.stdout.write('[ui-parity] OK '+viewport.width+'x'+viewport.height+' '+JSON.stringify(data)+'\n');
  }
}catch(err){
  throw new Error(String(err&&err.message||err)+'\n'+stderr);
}finally{
  if(cdp)cdp.close();
  if(proc&&!proc.killed)proc.kill('SIGTERM');
  fs.rmSync(tmp,{recursive:true,force:true});
}
