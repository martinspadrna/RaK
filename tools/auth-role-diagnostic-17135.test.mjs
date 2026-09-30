import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const helper=read('tools/auth-role-diagnostic-17056.js');
const diagnostics=read('rak-runtime-diagnostics.js');
const menu=read('app-menu.js');
const renderer=read('app-menu-admin-renderer.js');

function response(ok,status,payload){return {ok,status,json:async()=>payload,body:{cancel:async()=>{}}};}

async function runRole(role){
  const token='eyJhbGciOiJIUzI1NiJ9.role-diagnostic-canary.signature-with-enough-length-to-look-like-a-real-jwt-token';
  const accountId='1234', userId='user-'+role, calls=[];
  const status={textContent:'',dataset:{}};
  const context=vm.createContext({
    console:{debug(){},info(){},log(){},warn(){},error(){}}, addEventListener(){},
    document:{getElementById:id=>id==='rakLiveAuthDiagnosticStatus'?status:null},
    navigator:{onLine:true}, app:{adminAuthVersion:2,adminAccountId:accountId,adminRole:role},
    rakAdminCanOpenShiftReport:()=>true, AbortController,setTimeout,clearTimeout,
    fetch:async(url,options={})=>{
      calls.push({url:String(url),authorization:String(options.headers?.Authorization||'')});
      if(String(url).endsWith('/auth/v1/user')) return response(true,200,{id:userId});
      if(String(url).endsWith('/rest/v1/rpc/rak_admin_context')) return response(true,200,{role,user_id:userId,account_id:accountId,session_id:'session-'+role});
      if(String(url).endsWith('/rest/v1/rpc/rak_admin_list_audit_v2')) return role==='deputy'?response(false,403,{message:'secret-audit-denial'}):response(true,200,[]);
      if(String(url).endsWith('/rest/v1/rpc/rak_admin_save_rotation_v2')) return response(false,400,{message:'secret-invalid-write'});
      if(String(url).endsWith('/rest/v1/rpc/rak_owner_list_admin_profiles')) return role==='owner'?response(true,200,[]):response(false,403,{message:'secret-owner-denial'});
      throw new Error('unexpected endpoint '+url);
    },
    SUPABASE_CONFIG:{url:'https://cgshssdjgzzuprlwnabl.supabase.co',publishableKey:'sb_publishable_test_canary'},
    RotationSupabaseBridge:{getSignedAdminAccessToken:async()=>token}, globalThis:null,window:null,
    Error,TypeError,RangeError,ReferenceError,SyntaxError,URIError,Object,Array,String,Number,Boolean,Math,JSON,Map,Set,Date
  });
  context.globalThis=context; context.window=context;
  vm.runInContext(diagnostics,context,{filename:'rak-runtime-diagnostics.js'});
  vm.runInContext(helper,context,{filename:'auth-role-diagnostic-17056.js'});
  await context.rakRunLiveAuthDiagnostic();
  return {token,calls,status};
}

for(const role of ['owner','admin','deputy']){
  test('1.7.135 live role diagnostic passes sanitized signed '+role+' scenario',async()=>{
    const result=await runRole(role);
    assert.equal(result.status.dataset.result,'pass');
    assert.match(result.status.textContent,/^PROŠLO:/);
    assert(!result.status.textContent.includes(result.token),'JWT leaked into visible diagnostic');
    for(const call of result.calls) assert.equal(call.authorization,'Bearer '+result.token);
    assert.equal(result.calls.filter(c=>c.url.endsWith('/rak_admin_save_rotation_v2')).length,role==='deputy'?0:1);
    assert.equal(result.calls.filter(c=>c.url.endsWith('/rak_owner_list_admin_profiles')).length,1);
  });
}

test('1.7.135 More owns TEST-only diagnostic without opening heavy Admin',()=>{
  assertCurrentReleaseIdentity(read,'1.7.135');
  for(const marker of ['function appMenuLiveAuthDiagnosticEnabled()','https://cgshssdjgzzuprlwnabl.supabase.co','data-menu-action="live-auth-check"', "menuAction === 'live-auth-check'",'RAK_17135_ROLE_DIAGNOSTIC',"['owner', 'admin', 'deputy'].includes(role)","diagnose('admin-audit-read'","diagnose('owner-profile-read'"]){
    assert(menu.includes(marker),'app-menu missing '+marker);
  }
  assert(!renderer.includes('async function rakRunLiveAuthDiagnostic()'),'heavy renderer still duplicates diagnostic helper');
  assert(renderer.includes('data-admin-action="run-live-auth-check"'),'Admin service entry should reuse lightweight helper');
});

test('1.7.135 rejected responses are never parsed or exposed',()=>{
  for(const name of ['adminResponse','rejectedWriteResponse','ownerResponse']) assert(!helper.includes('await '+name+'.json()'),'rejected response body parsed: '+name);
  for(const forbidden of ['console.log(token)','console.warn(token)','localStorage','sessionStorage','service_role','sb_secret_']) assert(!helper.includes(forbidden),'forbidden diagnostic behavior: '+forbidden);
  assert(helper.includes("diagnose('rotation-save'"));
  assert(helper.includes("rejected.reason === 'permission-denied'"));
});
