#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>'/usr/bin/'+name).find(name=>fs.existsSync(name));
assert(chrome,'[ui-parity] Chromium is required');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/ui-parity-17069.json'),'utf8'));
const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const bodyMatch=source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
assert(bodyMatch,'[ui-parity] index body missing');
const localCss=[...source.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)]
  .map(m=>m[1].split('?')[0]).filter(href=>!/^https?:/i.test(href)).filter((href,index,array)=>array.indexOf(href)===index)
  .map(href=>{const file=path.join(ROOT,href);assert(fs.existsSync(file),'[ui-parity] missing stylesheet '+href);return fs.readFileSync(file,'utf8')}).join('\n');
const inlineCss=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const body=bodyMatch[1].replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<iframe\b[\s\S]*?<\/iframe>/gi,'');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rak-ui-parity-'));
try{
  for(const viewport of manifest.viewports){
    const payload=JSON.stringify({pages:manifest.criticalPages.map(p=>p.id),bottomNav:manifest.bottomNav}).replace(/</g,'\\u003c');
    const probeScript="const spec="+payload+";addEventListener('load',()=>setTimeout(()=>{"+
      "const rect=e=>e.getBoundingClientRect();const css=e=>getComputedStyle(e);const allPages=[...document.querySelectorAll('.page')];const pageResults=[];"+
      "for(const id of spec.pages){for(const p of allPages)p.classList.remove('active');const root=document.getElementById(id);if(root)root.classList.add('active');scrollTo(0,0);const r=root?rect(root):null;pageResults.push({id,exists:!!root,display:root?css(root).display:'missing',left:r?r.left:null,right:r?r.right:null,width:r?r.width:null,scrollWidth:document.documentElement.scrollWidth});}"+
      "const nav=[...document.querySelectorAll('.bottomNavBtn')].map(btn=>{const r=rect(btn);return {page:btn.dataset.page||'',action:btn.dataset.action||'',display:css(btn).display,width:r.width,height:r.height};});"+
      "const navRoot=document.querySelector('.bottomNav');const nr=navRoot?rect(navRoot):null;document.getElementById('rak-ui-parity-probe').textContent=JSON.stringify({viewport:{width:innerWidth,height:innerHeight},pages:pageResults,nav,navRoot:nr?{left:nr.left,right:nr.right,width:nr.width,display:css(navRoot).display}:null,docWidth:document.documentElement.scrollWidth});"+
      "},250));";
    const html='<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+inlineCss+'\n'+localCss+'</style></head><body>'+body+'<pre id="rak-ui-parity-probe">WAIT</pre><script>'+probeScript+'</'+'script></body></html>';
    const file=path.join(tmp,'ui-'+viewport.width+'x'+viewport.height+'.html');
    fs.writeFileSync(file,html,'utf8');
    const res=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=1800','--window-size='+viewport.width+','+viewport.height,'--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:12e6});
    assert.equal(res.status,0,'[ui-parity] chrome failed '+String(res.stderr||'').slice(-1200));
    const m=String(res.stdout||'').match(/<pre id="rak-ui-parity-probe">([^<]+)<\/pre>/);
    assert(m&&m[1]!=='WAIT','[ui-parity] probe missing for '+viewport.width+'x'+viewport.height);
    const data=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
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
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
