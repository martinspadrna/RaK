#!/usr/bin/env node
// 1.7.67: real Chromium validates BOTH admin grids, not a single MO fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import net from 'node:net';
import RELEASE_METADATA from '../rak-release-metadata.js';
const ROOT=process.cwd();
const CHROME=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(n=>'/usr/bin/'+n).find(n=>fs.existsSync(n));
assert(CHROME,'[17067-browser] real Chromium required');
const releaseParts=String(RELEASE_METADATA.displayVersion).split('.').map(Number);
const atLeastEqualGrid=releaseParts.length===3&&releaseParts.every(Number.isInteger)
  && (releaseParts[0]>1 || (releaseParts[0]===1 && (releaseParts[1]>7 || (releaseParts[1]===7 && releaseParts[2]>=67))));
assert(atLeastEqualGrid,'built equal-grid release required');
const editor=fs.readFileSync('admin-rotation-editor.js','utf8');
function markup(section){
 const line=editor.split('\n').find(l=>l.includes(`data-daymod-section="${section}" style="--rak-grid-width:`));
 assert(line,'[17067-browser] missing real '+section+' table expression');
 const vars={hardMachines:Array(5).fill('X'),softMachines:Array(5).fill('X')};
 const start=vm.runInNewContext(line.trim().replace(/,$/,''),vars);
 const columns='<colgroup><col style="width:46px">'+Array(5).fill('<col style="width:50px">').join('')+'</colgroup>';
 const names=['Novotný','Špadrna','Střížek','Kmínek','Blažek'];
 const fields=names.map((name,i)=>'<td><div class="appMenuInlineFieldWrap appMenuInlineFieldWrapTiny"><input class="appMenuInlineInput appMenuInlineInputTiny" data-rot-field="cell-'+i+'" value="'+name+'"></div></td>').join('');
 return start+columns+'<thead><tr><th>Datum</th>'+Array(5).fill('<th>MSKC01</th>').join('')+'</tr></thead><tbody><tr><td><div class="appMenuInlineFieldWrap"><input class="appMenuInlineInput" data-rot-field="date" value="19.10.N8"></div></td>'+fields+'</tr></tbody></table>';
}
const style=[...fs.readFileSync('index.html','utf8').matchAll(/<link rel="stylesheet" href="(styles[^"]+\.css)"/g)].map(m=>m[1]).map(p=>'<link rel="stylesheet" href="'+pathToFileURL(path.join(ROOT,p)).href+'">').join('');
const html=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}<style>.rakGridProbeWrap{width:350px;max-width:calc(100vw - 24px);overflow-x:auto;}</style></head><body><div id="appMenuBody" data-admin-view="rotation"><div id="adminRotationEditor"><div id="hardWrap" class="tableWrap appMenuTableWrap rakGridProbeWrap">${markup('hard')}</div><div id="softWrap" class="tableWrap appMenuTableWrap rakGridProbeWrap">${markup('soft')}</div></div></div><pre id="rak-probe">WAIT</pre><script>window.addEventListener('load',()=>setTimeout(()=>{
const rect=e=>e.getBoundingClientRect();
const inspect=id=>{const wrapper=document.getElementById(id),table=wrapper.querySelector('table'),row=table.tBodies[0].rows[0],cells=Array.from(row.cells),names=cells.slice(1).map(c=>c.querySelector('input')),date=cells[0].querySelector('input'),style=getComputedStyle(date),ctx=document.createElement('canvas').getContext('2d');ctx.font=style.fontSize+' '+style.fontFamily;return {section:table.dataset.daymodSection,table:rect(table).width,columns:cells.map(c=>rect(c).width),inputs:names.map(n=>rect(n).width),gaps:names.slice(1).map((n,i)=>rect(n).left-rect(names[i]).right),wrapScroll:wrapper.scrollWidth,wrapClient:wrapper.clientWidth,wrapRight:rect(wrapper).right,lastRight:rect(names.at(-1)).right,date:rect(date).width,dateFont:parseFloat(style.fontSize),dateContent:date.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),dateText:ctx.measureText(date.value).width};};
const cases=[260,280,300,320,350].map(width=>{for(const id of ['hardWrap','softWrap'])document.getElementById(id).style.width=width+'px';return {width,hard:inspect('hardWrap'),soft:inspect('softWrap')};});document.getElementById('rak-probe').textContent=JSON.stringify({viewport:innerWidth,document:document.documentElement.scrollWidth,cases});
},200));</script></body></html>`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-17067-'));
try{
 const file=path.join(dir,'index.html');fs.writeFileSync(file,html,'utf8');
 const out=spawnSync(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=3500','--window-size=390,844','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:35000,maxBuffer:8e6});
 assert.equal(out.status,0,'Chrome failed '+String(out.stderr||'').slice(-600));
 const match=String(out.stdout||'').match(/<pre id="rak-probe">([^<]+)<\/pre>/);
 assert(match&&match[1]!=='WAIT','real browser probe missing');
 const data=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 const fail=label=>label+' '+JSON.stringify(data);
 for(const sample of data.cases){
 const expectedTable=Math.min(sample.width,324),expectedName=(expectedTable-74)/5;
 for(const section of ['hard','soft']){
  const d=sample[section];assert.equal(d.section,section);
  assert(Math.abs(d.table-expectedTable)<=2,fail(section+' not responsive at '+sample.width));
  assert(d.columns.length===6&&d.inputs.length===5,fail(section+' lost names'));
  assert(d.columns[0]>=72&&d.columns[0]<=76,fail(section+' date column'));
  assert(d.columns.slice(1).every(n=>Math.abs(n-expectedName)<=1),fail(section+' name columns'));
  assert(d.inputs.every(n=>Math.abs(n-(expectedName-2))<=1),fail(section+' name input widths'));
  assert(d.gaps.every(n=>n>=-1&&n<=4),fail(section+' excessive gaps'));
  assert(d.wrapScroll<=d.wrapClient+2&&d.lastRight<=d.wrapRight+1,fail(section+' requires horizontal scroll'));
  assert(d.date>=71&&d.date<=73&&d.dateFont>=16&&d.dateContent>=d.dateText+1,fail(section+' clipped date or iOS zoom'));
 }
 for(const key of ['table','date'])assert(Math.abs(sample.hard[key]-sample.soft[key])<0.5,fail('different '+key));
 for(const key of ['columns','inputs','gaps'])sample.hard[key].forEach((n,i)=>assert(Math.abs(n-sample.soft[key][i])<0.5,fail('unequal '+key+' index '+i)));
 }
 assert(data.document<=data.viewport+4,fail('document overflow'));
 console.log('[17067-browser] PASS actual Chromium: MO=TO at wrapper widths 260/280/300/320/350px, narrower names, no sideways scroll, date+shift at iOS-safe 16px');
}catch(err){console.error('[17067-browser] FAIL '+err.stack);process.exitCode=1;}
finally{fs.rmSync(dir,{recursive:true,force:true});}

// Real Chromium touch scrolling starts on editable names, with the actual nested table wrapper.
const touchDir=fs.mkdtempSync(path.join(os.tmpdir(),'rak-grid-touch-'));
let touchChrome=null,touchWs=null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 const file=path.join(touchDir,'touch.html');
 fs.writeFileSync(file,html.replace('</head>','<style>#appMenuBody{height:420px;overflow-y:auto;} .rakGridProbeWrap{width:260px;}</style></head>'));
 const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
 touchChrome=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+path.join(touchDir,'profile'),pathToFileURL(file).href],{stdio:'ignore'});
 let target;
 for(let i=0;i<100&&!target;i++){try{target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page');}catch{}if(!target)await pause(100);}
 assert(target,'touch DevTools target missing');
 touchWs=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{touchWs.addEventListener('open',resolve,{once:true});touchWs.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map();
 touchWs.addEventListener('message',event=>{const msg=JSON.parse(String(event.data)),p=pending.get(msg.id);if(p){pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('touch CDP timeout '+method));},15000);pending.set(id,{resolve,reject,timer});touchWs.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:740,deviceScaleFactor:2,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 for(let i=0;i<50;i++){if(await evaluate('document.readyState')==='complete')break;await pause(100);}
 await evaluate("(()=>{for(const table of document.querySelectorAll('.appMenuAdminRotationTable')){const row=table.tBodies[0].rows[0];for(let i=0;i<40;i++)table.tBodies[0].append(row.cloneNode(true));}return true;})()");
 await pause(250);
 const drag=async(point,distance)=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});for(let i=1;i<=12;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+distance*i/12}]});await pause(20);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 for(const section of ['hard','soft']){
  const locate="(()=>{const body=document.getElementById('appMenuBody'),wrapper=document.getElementById('"+section+"Wrap');body.scrollTop=wrapper.offsetTop-body.offsetTop;const b=body.getBoundingClientRect(),input=[...wrapper.querySelectorAll('input[data-rot-field^=cell-]')].find(e=>{const r=e.getBoundingClientRect();return r.top>b.top+180&&r.bottom<b.bottom-80;}),r=input.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,before:body.scrollTop,chain:getComputedStyle(wrapper).overscrollBehaviorY,parentOverflow:getComputedStyle(body).overflowY,parentHeight:body.clientHeight,parentContent:body.scrollHeight};})()";
  const start=await evaluate(locate);assert.equal(start.chain,'auto','vertical table scroll must chain to the menu');
  await pause(150);
  start.hit=await evaluate('document.elementFromPoint('+start.x+','+start.y+').outerHTML');
  await drag(start,-180);
  await pause(200);
  const down=await evaluate("document.getElementById('appMenuBody').scrollTop");assert(down>start.before+60,section+' touch over name did not scroll down '+JSON.stringify({start,down}));
  const point=await evaluate("(()=>{const body=document.getElementById('appMenuBody'),inputs=[...document.querySelectorAll('#"+section+"Wrap input[data-rot-field^=cell-]')],b=body.getBoundingClientRect(),input=inputs.find(e=>{const r=e.getBoundingClientRect();return r.top>b.top+100&&r.bottom<b.bottom-60;}),r=input.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()");
  await pause(150);await drag(point,140);await pause(200);
  const up=await evaluate("document.getElementById('appMenuBody').scrollTop");assert(up<down-50,section+' touch over name did not scroll up');
 }
 console.log('[17067-browser] PASS Chromium Android touch emulation: dragging over MO/TO names scrolls the parent menu down and up');
}catch(err){console.error('[17067-browser] TOUCH FAIL '+err.stack);process.exitCode=1;}
finally{try{touchWs?.close();}catch{}touchChrome?.kill();await pause(150);fs.rmSync(touchDir,{recursive:true,force:true});}
