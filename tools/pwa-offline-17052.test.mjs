import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const conn=read('app-pwa-connectivity.js'),sw=read('sw.js'),releaseMetadata=read('rak-release-metadata.js');
test('release version rather than historical APP_VERSION drives SW matching',()=>{
 const begin=conn.indexOf('  const getAppVersionTag ='),end=conn.indexOf('  const scheduleVersionMismatchUpdateCheck =',begin);
 assert(begin>0&&end>begin);
 const ctx={window:{APP_VERSION:'1.5',RAK_TEST_DISPLAY_VERSION:'1.7.52',RAK_RELEASE_VERSION:'1.7.52'}};
 vm.runInNewContext(conn.slice(begin,end)+'\nthis.version=getAppVersionTag;this.cache=getExpectedServiceWorkerCacheVersion;',ctx);
 assert.equal(ctx.version(),'1.7.52');assert.equal(ctx.cache(),'v1.7.52');
 ctx.window.RAK_TEST_DISPLAY_VERSION='';ctx.window.RAK_RELEASE_VERSION='1.7.51';assert.equal(ctx.cache(),'v1.7.51');
 ctx.window.RAK_RELEASE_VERSION='';assert.equal(ctx.version(),'1.5');
});
function worker(failShell=false){
 const store=new Map(),listeners={},sent=[],url='http://localhost/';
 const key=input=>String(typeof input==='string'?new URL(input,url):new URL(input.url,url));
 function makeCache(name){
  if(!store.has(name))store.set(name,new Map());const map=store.get(name);
  return {async put(req,res){map.set(key(req),res.clone());},async match(req,opts={}){
   const wanted=key(req);if(map.has(wanted))return map.get(wanted).clone();
   if(opts.ignoreSearch){for(const [u,v] of map)if(new URL(u).pathname===new URL(wanted).pathname)return v.clone();}
   return undefined;
  },async delete(req){return map.delete(key(req));},async keys(){return [...map.keys()].map(u=>new Request(u));}};
 }
 const caches={open:async name=>makeCache(name),keys:async()=>[...store.keys()],delete:async name=>store.delete(name),match:async(req,opts)=>{
  for(const name of store.keys()){const hit=await makeCache(name).match(req,opts);if(hit)return hit;}return undefined;
 }};
 let offline=false,skipWaiting=0;
 const self={location:{href:url+'sw.js',origin:url.slice(0,-1)},addEventListener:(t,f)=>{listeners[t]=f;},skipWaiting:()=>{skipWaiting++;},clients:{claim:async()=>{},matchAll:async()=>[]},registration:{navigationPreload:{enable:async()=>{}}}};
 let context;
 const importScripts=source=>{
  assert.equal(source,'./rak-release-metadata.js','service worker must load the canonical release metadata');
  vm.runInContext(releaseMetadata,context,{filename:'rak-release-metadata.js'});
  self.RAK_RELEASE_METADATA=context.RAK_RELEASE_METADATA;
 };
 context=vm.createContext({self,caches,Response,Request,URL,Date,Promise,console,importScripts,fetch:async(request)=>{
  if(offline)throw Error('network offline');const u=new URL(request.url);
  if(failShell&&(u.pathname==='/'||u.pathname==='/index.html'))return new Response('missing',{status:404});
  return new Response('CONTENT:'+u.pathname,{status:200,headers:{'cache-control':'public,max-age=60'}});
 }});
 vm.runInContext(sw,context,{filename:'sw.js'});
 return {listeners,store,makeCache,sent,setOffline(value){offline=value;},getSkipWaiting(){return skipWaiting;},async trigger(type,request,extra={}){
  let promise;const event={request,source:{id:'client-1',postMessage:msg=>sent.push(msg)},waitUntil:pr=>{promise=pr;},respondWith:pr=>{promise=pr;},...extra};
  listeners[type](event);return promise?await promise:null;
 }};
}
test('empty shell aborts installation instead of replacing a working offline worker',async()=>{
 const env=worker(true);await assert.rejects(()=>env.trigger('install'),/offline shell/);assert.equal(env.getSkipWaiting(),0);
});
test('offline navigation uses current release only; update requires approval',async()=>{
 const env=worker();await env.trigger('install');assert.equal(env.getSkipWaiting(),0);await env.trigger('activate');
 const old=await env.makeCache('rotace-static-v1.7.50');await old.put('./legacy-only.js',new Response('UNSAFE-OLD-SCRIPT'));
 env.setOffline(true);const request=new Request('http://localhost/');Object.defineProperty(request,'mode',{value:'navigate'});
 const navigation=await env.trigger('fetch',request);assert.equal(await navigation.text(),'CONTENT:/');
 const stale=new Request('http://localhost/legacy-only.js');const response=await env.trigger('fetch',stale);
 assert(!response||response.type==='error','old assets must not leak from historical CacheStorage');
 await env.trigger('message',null,{data:{type:'SKIP_WAITING'}});assert.equal(env.getSkipWaiting(),1);
});


test('offline package prewarms Rotation and sync feature modules',()=>{
 for(const asset of [
  './supabase-vendor-2.110.7.js',
  './stats.js?v=1.7.0','./rotace.js?v=1.7.0','./rotation-tasks.js?v=1.7.0',
  './admin-daymods.js?v=1.7.0','./app-rotation-controls.js?v=1.7.0',
  './supabase-bridge.js?v=1.7.0','./app-rotation-sync.js?v=1.7.0'
 ]) assert(sw.includes(asset),asset+' must be available before offline navigation');
 assert(sw.includes("DEVELOPMENT_OFFLINE_ROTATION_POLICY = 'prewarm-retained-on-quota;repair-protocol;dashboard-icons-required;cached-state-first;semantic-ui-conflict'"));
});

