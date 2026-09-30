import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

function bridgeFixture(role){
  const source=read('supabase-bridge.js');
  const run=runNamedDeclarations({
    modules:[{source,names:[
      'state','getClient','hasSignedAdminRoleContext','hasSecureAdminContext',
      'getSignedAdminAccessToken','getAdminAccessToken'
    ]}],
    globals:{window:{}},
    exports:{
      state:'state',
      signedContext:'hasSignedAdminRoleContext',
      secureContext:'hasSecureAdminContext',
      signedToken:'getSignedAdminAccessToken',
      adminToken:'getAdminAccessToken'
    }
  });
  run.api.state.adminAuth.context={authenticated:true,account_id:'fixture',role};
  run.api.state.client={auth:{getSession:async()=>({data:{session:{access_token:'signed-fixture-token'}},error:null})}};
  return run.api;
}

test('signed role context includes deputy without broadening admin-write context',async()=>{
  for(const role of ['owner','admin']){
    const api=bridgeFixture(role);
    assert.equal(api.signedContext(),true);
    assert.equal(api.secureContext(),true);
    assert.equal(await api.signedToken(),'signed-fixture-token');
    assert.equal(await api.adminToken(),'signed-fixture-token');
  }
  const deputy=bridgeFixture('deputy');
  assert.equal(deputy.signedContext(),true);
  assert.equal(deputy.secureContext(),false);
  assert.equal(await deputy.signedToken(),'signed-fixture-token');
  assert.equal(await deputy.adminToken(),'');
  const ordinary=bridgeFixture('employee');
  assert.equal(ordinary.signedContext(),false);
  assert.equal(ordinary.secureContext(),false);
  assert.equal(await ordinary.signedToken(),'');
  assert.equal(await ordinary.adminToken(),'');
});

test('self-password and live diagnostic use signed-role token only',()=>{
  const unlock=read('app-admin-unlock.js');
  const start=unlock.indexOf('async function rakAdminChangeOwnPassword');
  const end=unlock.indexOf('async function rakAdminLoadAccountsDirectoryForViewer',start);
  const ownPassword=unlock.slice(start,end);
  assert(ownPassword.includes('getSignedAdminAccessToken'));
  assert(!ownPassword.includes('getAdminAccessToken'));

  const diagnostic=read('tools/auth-role-diagnostic-17056.js');
  assert(diagnostic.includes('getSignedAdminAccessToken'));
  assert(!diagnostic.includes('getAdminAccessToken'));
  assert(diagnostic.includes("['owner', 'admin', 'deputy'].includes(role)"));
});

test('deputy remains blocked from admin management and write credential',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("return !!(hasSignedAdminRoleContext() && (context.role === 'owner' || context.role === 'admin'));"));
  assert(bridge.includes('function hasAdminWriteCredential()'));
  assert(bridge.includes('return hasSecureAdminContext();'));

  const edge=read('supabase/functions/rak-admin-users/index.ts');
  const own=edge.indexOf('if (action === "change-own-password")');
  const deputyBlock=edge.indexOf('if (actor.role === "deputy")');
  const management=edge.indexOf('if (action === "list-admin-directory")');
  assert(own>=0&&deputyBlock>own&&management>deputyBlock);
  assert(edge.includes('["owner", "admin", "deputy"].includes(String(actor.role || ""))'));
  assert(edge.includes('if (actor.role !== "owner") return jsonResponse'));
});
