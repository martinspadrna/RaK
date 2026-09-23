#!/usr/bin/env node
// RaK 1.7.50: LIVE read-only HTTP checks against TEST Supabase. No Auth credentials,
// no valid OS numbers, no report insert and no private response bodies in CI logs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const config=fs.readFileSync('supabase-config.js','utf8');
const urlMatch=config.match(/url:\s*"(https:\/\/[^"\s]+)"/);
const keyMatch=config.match(/publishableKey:\s*"(sb_publishable_[^"\s]+)"/);
assert(urlMatch && keyMatch,'[17050-http] TEST publishable configuration unavailable');
const BASE=urlMatch[1].replace(/\/$/,'');
assert.equal(new URL(BASE).hostname,'cgshssdjgzzuprlwnabl.supabase.co','[17050-http] production/unknown DB forbidden');
assert(!config.includes('bkqamcbkiwumsvelahxr'),'[17050-http] production DB reference forbidden');
const KEY=keyMatch[1];
let verified=0;
async function call(name,path,{method='GET',body,invalidJwt=false}={}){
  assert(path.startsWith('/rest/v1/'),'[17050-http] only TEST PostgREST may be queried');
  const headers={apikey:KEY,Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(invalidJwt)headers.Authorization='Bearer deliberately-invalid-jwt';
  const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
  const raw=await response.text();
  assert(raw.length<2_000_000,`[17050-http] oversized reply for ${name}`);
  let data;
  try{data=JSON.parse(raw);}catch{data=null;}
  console.log(`[17050-http] ${name}: HTTP ${response.status}`); // NEVER log response bodies or account information.
  verified++;
  return {status:response.status,data};
}
function denied(name,result){assert([401,403,404].includes(result.status),`[17050-http] ${name} unexpectedly accessible: HTTP ${result.status}`);}
function rejected(name,result){assert(result.status>=400&&result.status<500,`[17050-http] ${name} expected 4xx, got ${result.status}`);}
const privateTables=[
 ['account-directory','/rest/v1/game_accounts?select=account_number&limit=1'],
 ['admin-devices','/rest/v1/rak_admin_devices?select=device_id&limit=1'],
 ['private-bug-reports','/rest/v1/bug_reports?select=id&limit=1'],
 ['owner-settings-backups','/rest/v1/rak_admin_settings_backups?select=id&limit=1'],
 ['rotation-backups','/rest/v1/rak_rotation_backups_v2?select=id&limit=1'],
 // This table has a real 'key' column, not 'id': a nonexistent projection returns
 // HTTP 400 and cannot establish whether anonymous SELECT is denied.
 ['admin-secrets','/rest/v1/rak_admin_secrets?select=key&limit=1']
];
for(const [name,path] of privateTables)denied(name,await call(name,path));
const rotation=await call('intentional-public-rotation','/rest/v1/rotation_state?select=key,revision&key=eq.main');
assert.equal(rotation.status,200);
assert(Array.isArray(rotation.data)&&rotation.data.length===1&&rotation.data[0].key==='main');
const settings=await call('public-machine-settings','/rest/v1/machine_settings?select=category,machine_key,settings_json&limit=500');
assert.equal(settings.status,200);
assert(Array.isArray(settings.data)&&settings.data.length>0&&settings.data.length<500);
const blockedCategories=new Set(['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings']);
const blockedKeys=new Set(['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS']);
const privateRow=row=>{
  const j=row?.settings_json||{};
  return blockedCategories.has(String(row?.category||'').trim().toLowerCase())
    ||blockedCategories.has(String(j.stored_category||'').trim().toLowerCase())
    ||blockedCategories.has(String(j.type||'').trim().toLowerCase())
    ||[row?.machine_key,j.admin_settings_key].some(value=>{
      const key=String(value||'').trim().toUpperCase();
      return blockedKeys.has(key)||key.startsWith('ADMIN_FULL_SETTINGS_BACKUP_')||key.startsWith('ROTATION_SAVE_BACKUP_');
    });
};
const restrictedIdentityFields=new Set(['appaccounts','applicationaccounts','workers','loginnumber','accountnumber','personalnumber','employeeid','userid','roster','employees','staff','fullname','firstname','lastname','email','phone','contactemail','contactphone']);
const normalizeField=key=>String(key||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
function containsRestrictedIdentityField(value){
  if(Array.isArray(value))return value.some(containsRestrictedIdentityField);
  if(!value||typeof value!=='object')return false;
  return Object.entries(value).some(([key,nested])=>restrictedIdentityFields.has(normalizeField(key))||containsRestrictedIdentityField(nested));
}
assert(!settings.data.some(privateRow),'[17050-http] private machine settings leaked');
assert(!settings.data.some(row=>containsRestrictedIdentityField(row?.settings_json)),'[17050-http] recursive personal field leaked through public settings');
console.log(`[17050-http] machine settings: ${settings.data.length} public rows, 0 private categories or personal fields`);
for(const [name,fn,args] of [
 ['admin-context','rak_admin_context',{}],
 ['owner-complete-export','rak_owner_complete_backup_v1',{}],
 ['admin-directory-rpc','rak_admin_list_application_accounts_v1',{}],
 ['admin-devices-rpc','rak_owner_list_admin_devices',{}]
])denied(name,await call(name,`/rest/v1/rpc/${fn}`,{method:'POST',body:args}));
for(const [name,fn,args] of [
 ['invalid-login-v2','rak_lookup_account_for_login_v2',{p_last4:'abc'}],
 ['invalid-login-v1','rak_lookup_account_for_login_v1',{p_last4:'abc'}],
 ['invalid-legacy-admin-gate','rak_admin_account_requires_auth',{p_account_id:'abc'}]
]){
  const result=await call(name,`/rest/v1/rpc/${fn}`,{method:'POST',body:args});
  assert.equal(result.status,200);
  if(name==='invalid-legacy-admin-gate')assert.equal(result.data,false);
  else assert(result.data?.ok===false&&!containsRestrictedIdentityField(result.data),'[17050-http] invalid login leaked personal fields');
}
rejected('invalid-keepalive',await call('invalid-keepalive','/rest/v1/rpc/rak_app_keepalive',{method:'POST',body:{p_device_key:'x',p_app_version:null,p_user_agent:null,p_payload:{}}}));
rejected('invalid-report',await call('invalid-report','/rest/v1/rpc/rak_submit_bug_report_v2',{method:'POST',body:{p_account_number:null,p_player_name:null,p_report_type:'chyba',p_message:'x',p_app_version:null,p_route:null,p_user_agent:null,p_device_info:{}}}));
denied('forged-jwt',await call('forged-jwt','/rest/v1/game_accounts?select=account_number&limit=1',{invalidJwt:true}));
assert.equal(verified,18);
console.log(`[17050-http] PASS: ${verified} real anonymous/invalid-JWT HTTP probes; no writes, no credentials, TEST DB only. Valid admin/deputy JWT and Vercel SSO remain outside this test.`);