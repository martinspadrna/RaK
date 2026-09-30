import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const menu=read('app-menu.js');
const helper=read('tools/auth-role-diagnostic-17056.js');
const diagnostics=read('rak-runtime-diagnostics.js');

function extractDiagnostic(source){
  const start=source.indexOf('async function rakRunLiveAuthDiagnostic()');
  assert(start>=0,'diagnostic function missing');
  const next=source.indexOf('\nfunction appMenuShouldOfferRoleRefresh',start);
  return (next>=0?source.slice(start,next):source.slice(start)).trim();
}

function response(ok,status,payload){return {ok,status,json:async()=>payload,body:{cancel:async()=>{}}};}

async function runActualMenuDeputy(){
  const source=extractDiagnostic(menu);
  const token='eyJhbGciOiJIUzI1NiJ9.runtime-deputy-signed-token.signature-long-enough-for-live-diagnostic-and-over-one-hundred-characters-total-canary';
  const status={textContent:'',dataset:{}};
  const calls=[];
  const context=vm.createContext({
    console:{debug(){},info(){},log(){},warn(){},error(){}},
    document:{getElementById:id=>id==='rakLiveAuthDiagnosticStatus'?status:null},
    navigator:{onLine:true},
    app:{adminAuthVersion:2,adminAccountId:'1234',adminRole:'deputy'},
    rakAdminCanOpenShiftReport:()=>true,
    AbortController,setTimeout,clearTimeout,
    fetch:async(url,options={})=>{
      const value=String(url);
      calls.push({url:value,authorization:String(options.headers?.Authorization||'')});
      if(value.endsWith('/auth/v1/user')) return response(true,200,{id:'user-deputy'});
      if(value.endsWith('/rest/v1/rpc/rak_admin_context')) return response(true,200,{role:'deputy',user_id:'user-deputy',account_id:'1234',session_id:'session-deputy'});
      if(value.endsWith('/rest/v1/rpc/rak_admin_list_audit_v2')) return response(false,403,{});
      if(value.endsWith('/rest/v1/rpc/rak_owner_list_admin_profiles')) return response(false,403,{});
      throw new Error('unexpected endpoint '+value);
    },
    SUPABASE_CONFIG:{url:'https://cgshssdjgzzuprlwnabl.supabase.co',publishableKey:'sb_publishable_test_canary'},
    RotationSupabaseBridge:{getSignedAdminAccessToken:async()=>token},
    globalThis:null,window:null,
    Error,TypeError,RangeError,ReferenceError,SyntaxError,URIError,Object,Array,String,Number,Boolean,Math,JSON,Map,Set,Date
  });
  context.globalThis=context; context.window=context;
  vm.runInContext(diagnostics,context,{filename:'rak-runtime-diagnostics.js'});
  vm.runInContext(source,context,{filename:'app-menu-live-auth.js'});
  await context.rakRunLiveAuthDiagnostic();
  return {status,calls,token};
}

test('runtime More diagnostic and regression helper cannot drift apart',()=>{
  const actual=extractDiagnostic(menu);
  const reference=extractDiagnostic(helper);
  assert.equal(actual,reference);
  assert(actual.includes('getSignedAdminAccessToken'));
  assert(!actual.includes('getAdminAccessToken'));
});

test('actual lightweight More runtime passes a signed deputy session',async()=>{
  const result=await runActualMenuDeputy();
  assert.equal(result.status.dataset.result,'pass');
  assert.match(result.status.textContent,/^PROŠLO:/);
  assert(!result.status.textContent.includes(result.token));
  assert(result.calls.length>=4);
  for(const call of result.calls) assert.equal(call.authorization,'Bearer '+result.token);
  assert.equal(result.calls.filter(call=>call.url.endsWith('/rak_admin_save_rotation_v2')).length,0);
});
