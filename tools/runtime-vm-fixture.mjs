import vm from 'node:vm';

function escapeRegex(value){return String(value).replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');}
function scanCode(source,start,mode){
  let round=0,square=0,curly=0,state='code';
  for(let i=start;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(state==='line'){if(ch==='\n')state='code';continue;}
    if(state==='block'){if(ch==='*'&&next==='/'){state='code';i++;}continue;}
    if(state==='single'){if(ch==='\\')i++;else if(ch==="'")state='code';continue;}
    if(state==='double'){if(ch==='\\')i++;else if(ch==='"')state='code';continue;}
    if(state==='template'){if(ch==='\\')i++;else if(ch.charCodeAt(0)===96)state='code';continue;}
    if(ch==='/'&&next==='/'){state='line';i++;continue;}
    if(ch==='/'&&next==='*'){state='block';i++;continue;}
    if(ch==="'"){state='single';continue;}if(ch==='"'){state='double';continue;}if(ch.charCodeAt(0)===96){state='template';continue;}
    if(ch==='(')round++;else if(ch===')')round--;
    else if(ch==='[')square++;else if(ch===']')square--;
    else if(ch==='{')curly++;else if(ch==='}')curly--;
    if(mode==='params'&&ch===')'&&round===0)return i+1;
    if(mode==='block'&&curly===0)return i+1;
    if(mode==='statement'&&ch===';'&&round===0&&square===0&&curly===0)return i+1;
  }
  throw Error('[runtime-fixture] unterminated '+mode);
}
function declarationMatch(source,name){
  const id=escapeRegex(name);
  const fn=new RegExp('(?:^|\\n)([ \\t]*(?:async\\s+)?function\\s+'+id+'\\s*\\()','m').exec(source);
  if(fn){
    const start=fn.index+(source[fn.index]==='\n'?1:0),paramsOpen=source.indexOf('(',fn.index);
    const paramsEnd=scanCode(source,paramsOpen,'params'),open=source.indexOf('{',paramsEnd);
    if(open<0)throw Error('[runtime-fixture] missing body for '+name);
    return {name,start,end:scanCode(source,open,'block')};
  }
  const variable=new RegExp('(?:^|\\n)([ \\t]*(?:const|let|var)\\s+'+id+'\\b)','m').exec(source);
  if(variable){
    const start=variable.index+(source[variable.index]==='\n'?1:0);
    return {name,start,end:scanCode(source,start,'statement')};
  }
  throw Error('[runtime-fixture] declaration not found: '+name);
}
export function extractNamedDeclaration(source,name){
  const match=declarationMatch(String(source),name);
  return String(source).slice(match.start,match.end);
}
export function extractNamedDeclarations(modules){
  const pieces=[];
  for(const module of modules){
    const source=String(module.source||'');
    const matches=module.names.map(name=>declarationMatch(source,name)).sort((a,b)=>a.start-b.start);
    for(const match of matches)pieces.push(source.slice(match.start,match.end));
  }
  return pieces.join('\n');
}
export function extractConditionalBlock(source,conditionStart){
  const text=String(source),start=text.indexOf(conditionStart);
  if(start<0)throw Error('[runtime-fixture] condition not found: '+conditionStart);
  const open=text.indexOf('{',start+conditionStart.length);
  if(open<0)throw Error('[runtime-fixture] condition body missing: '+conditionStart);
  return text.slice(start,scanCode(text,open,'block'));
}
export function createMemoryStorage(initial={}){
  const map=new Map(Object.entries(initial).map(([key,value])=>[String(key),String(value)]));
  return {get length(){return map.size;},key:index=>Array.from(map.keys())[index]??null,
    getItem:key=>map.has(String(key))?map.get(String(key)):null,
    setItem:(key,value)=>map.set(String(key),String(value)),removeItem:key=>map.delete(String(key)),
    clear:()=>map.clear(),snapshot:()=>Object.fromEntries(map)};
}
export function createBrowserGlobals(overrides={}){
  const listeners=new Map(),localStorage=overrides.localStorage||createMemoryStorage();
  const document=overrides.document||{};
  Object.assign(document,{readyState:document.readyState||'loading',visibilityState:document.visibilityState||'visible',
    addEventListener:document.addEventListener||((type,fn)=>listeners.set('document:'+type,fn)),
    removeEventListener:document.removeEventListener||(()=>{}),
    getElementById:document.getElementById||(()=>null),
    querySelector:document.querySelector||(()=>null),
    querySelectorAll:document.querySelectorAll||(()=>[])});
  const window=overrides.window||{};
  Object.assign(window,{addEventListener:window.addEventListener||((type,fn)=>listeners.set('window:'+type,fn)),
    removeEventListener:window.removeEventListener||(()=>{})});
  const context={console:{log:()=>{},warn:()=>{},error:()=>{}},navigator:{onLine:true},document,window,localStorage,
    setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
    Date,Math,JSON,Promise,Map,Set,WeakMap,WeakSet,URL,URLSearchParams,TextEncoder,TextDecoder,
    Blob:globalThis.Blob,structuredClone:globalThis.structuredClone,...overrides};
  context.document=document;context.window=window;context.localStorage=localStorage;
  window.window=window;window.document=document;window.navigator=context.navigator;window.localStorage=localStorage;
  return context;
}
export function runNamedDeclarations({modules,globals={},exports}){
  const context=createBrowserGlobals(globals),source=extractNamedDeclarations(modules);
  const pairs=Object.entries(exports||{});
  for(const [,identifier] of pairs)if(!/^[A-Za-z_$][\w$]*$/.test(identifier))throw Error('[runtime-fixture] invalid export '+identifier);
  const exposed=pairs.map(([alias,identifier])=>JSON.stringify(alias)+':'+identifier).join(',');
  vm.runInNewContext(source+'\n;globalThis.__rakRuntimeFixture={'+exposed+'};',context);
  return {api:context.__rakRuntimeFixture,context,source};
}
export function evaluateExpression(source,globals={}){
  return vm.runInNewContext(String(source),createBrowserGlobals(globals));
}
