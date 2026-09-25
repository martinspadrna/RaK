import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('rak-runtime-diagnostics.js');
const canary=Object.freeze({
  token:'Bearer rak_test_only_4Kz7Qm9v2Xc8Lp6N',
  jwt:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaWN0aXZuaSJ9.fake-signature',
  account:'684219',
  name:'Canary Osoba',
  roster:'Noční směna CANARY-TNK'
});

function exerciseDiagnostics(){
  const captured=[];
  const listeners=new Map();
  const sink={};
  for(const level of ['debug','info','log','warn','error'])sink[level]=(...args)=>captured.push({level,args});
  const context=vm.createContext({
    console:sink,
    addEventListener:(type,fn)=>listeners.set(type,fn),
    globalThis:null,
    module:{exports:{}},
    Error,TypeError,RangeError,ReferenceError,SyntaxError,URIError,
    Object,Array,String,Number,Boolean,Math,JSON,Map,Set,Date
  });
  context.globalThis=context;
  vm.runInContext(source,context,{filename:'rak-runtime-diagnostics.js'});
  const privatePayload={
    token:canary.token,
    jwt:canary.jwt,
    account:canary.account,
    name:canary.name,
    roster:canary.roster,
    nested:{screenshot:'private-image-bytes'}
  };
  const before=JSON.stringify(privatePayload);
  context.console.warn('Supabase sync failed',new Error(Object.values(canary).join('|')));
  context.console.error('Full audit report',privatePayload);
  context.console.info(canary.roster,canary.account);
  context.RAK_DIAGNOSTICS.safeLog('warn','report',privatePayload);
  context.RAK_DIAGNOSTICS.sanitizeValue(privatePayload);
  assert.equal(JSON.stringify(privatePayload),before,'sanitizer mutated the private source payload');

  let prevented=false;
  listeners.get('unhandledrejection')({reason:new Error(Object.values(canary).join('|')),preventDefault(){prevented=true;}});
  return {captured,context,listeners,prevented};
}

test('runtime diagnostics emit aggregate metadata and redact every canary value',()=>{
  const result=exerciseDiagnostics();
  const output=JSON.stringify(result.captured);
  for(const value of Object.values(canary))assert(!output.includes(value),'canary escaped aggregate-only diagnostics');
  assert(output.includes('[RaK diagnostics]'));
  assert(output.includes('"category":"sync"'));
  assert(output.includes('"kind":"error"'));
  assert(output.includes('"kind":"object"'));
  assert.equal(result.context.RAK_DIAGNOSTICS.policy,'aggregate-only-v1');
  assert.equal(result.prevented,true,'unhandled rejection default output was not suppressed');
});

test('privacy helper is installed before runtime, cached offline and cannot mutate private flows',()=>{
  const index=read('index.html');
  const sw=read('sw.js');
  const build=read('tools/canonical-build.mjs');
  const backup=read('rak-complete-backup.js');
  const bugReport=read('app-menu-bug-report.js');
  assert(index.indexOf('rak-runtime-diagnostics.js?v=1.7.105')>index.indexOf('rak-release-metadata.js'));
  assert(index.indexOf('rak-runtime-diagnostics.js?v=1.7.105')<index.indexOf('<script src="data.js"></script>'));
  assert(index.indexOf('rak-runtime-diagnostics.js?v=1.7.105')<index.indexOf('supabase-vendor-2.110.7.js'));
  assert((sw.match(/rak-runtime-diagnostics\.js\?v=1\.7\.105/g)||[]).length>=3);
  assert(build.includes("'rak-runtime-diagnostics.js'"));
  for(const text of [backup,bugReport]){
    assert(!text.includes('RAK_DIAGNOSTICS'));
    assert(!text.includes('rakSafeLog'));
  }
  assert(bugReport.includes('screenshot: rakBugReportScreenshot ? {'));
  assert(backup.includes('rak-complete-backup-v1'));
  for(const forbidden of ['localStorage','sessionStorage','fetch(','XMLHttpRequest','sendBeacon','FileReader','Blob(']){
    assert(!source.includes(forbidden),'diagnostics helper unexpectedly touches private/data transport: '+forbidden);
  }
});

test('browser runtime has no side-channel telemetry or pre-sanitizer console capture',()=>{
  const runtimeFiles=fs.readdirSync(new URL('..',import.meta.url),{withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.js')&&entry.name!=='rak-runtime-diagnostics.js')
    .map(entry=>entry.name);
  for(const file of runtimeFiles){
    const text=read(file);
    assert(!/console\.(?:debug|info|log|warn|error)\s*\.\s*(?:bind|call|apply)\b/.test(text),file+' captures a raw console method');
    assert(!/\b(?:sendBeacon|captureException|captureMessage)\s*\(/.test(text),file+' adds a diagnostics telemetry side channel');
  }
});
