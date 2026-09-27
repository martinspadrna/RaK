import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const diagnostics = read('rak-runtime-diagnostics.js');
const liveProbe = read('tools/auth-role-diagnostic-17056.js');
const menu = read('app-menu.js');
const renderer = read('app-menu-admin-renderer.js');
const bridge = read('supabase-bridge.js');

function loadDiagnostics() {
  const captured = [];
  const context = vm.createContext({
    console: {
      debug:(...args)=>captured.push(args), info:(...args)=>captured.push(args),
      log:(...args)=>captured.push(args), warn:(...args)=>captured.push(args), error:(...args)=>captured.push(args)
    },
    addEventListener(){},
    globalThis:null,
    Error,TypeError,RangeError,ReferenceError,SyntaxError,URIError,
    Object,Array,String,Number,Boolean,Math,JSON,Map,Set,Date
  });
  context.globalThis = context;
  vm.runInContext(diagnostics, context, {filename:'rak-runtime-diagnostics.js'});
  return { api:context.RAK_DIAGNOSTICS, captured };
}

test('rejected-operation diagnostics expose only fixed categories and never raw values', () => {
  const {api} = loadDiagnostics();
  const secret = 'Bearer eyJhbGciOiJIUzI1NiJ9.secret-canary';
  const cases = [
    ['unplanned-absence',{code:'40001',message:secret},'revision-conflict'],
    ['owner-profile-read',{code:'42501',message:secret},'permission-denied'],
    ['rotation-save',{status:401,message:secret},'authentication-required'],
    ['rotation-save',{code:'22023',status:400,message:secret},'invalid-request'],
    ['admin-audit-read',{status:429,message:secret},'rate-limited'],
    ['unknown-operation',{status:403,message:secret},'permission-denied']
  ];
  for (const [operation,error,expected] of cases) {
    const result = api.diagnoseRejectedOperation(operation,error);
    assert.equal(result.reason,expected);
    if (operation === 'unknown-operation') assert.equal(result.operation,'other');
    assert(!JSON.stringify(result).includes(secret));
    assert(!Object.prototype.hasOwnProperty.call(result,'message'));
  }
});

test('live role probe uses real signed TEST JWT paths with sanitized owner/admin/deputy boundaries', () => {
  for (const marker of [
    'getAdminAccessToken',
    "/auth/v1/user",
    "/rest/v1/rpc/rak_admin_context",
    "['owner', 'admin', 'deputy'].includes(role)",
    "/rest/v1/rpc/rak_admin_list_audit_v2",
    "diagnose('admin-audit-read'",
    "/rest/v1/rpc/rak_admin_save_rotation_v2",
    "p_payload: []",
    "diagnose('rotation-save'",
    "/rest/v1/rpc/rak_owner_list_admin_profiles",
    "diagnose('owner-profile-read'",
    "rejected.reason === 'permission-denied'"
  ]) assert(liveProbe.includes(marker), 'live probe missing ' + marker);
  for (const rejectedName of ['adminResponse','rejectedWriteResponse','ownerResponse']) {
    assert(!liveProbe.includes('await ' + rejectedName + '.json()'), 'rejected body must not be parsed/logged: ' + rejectedName);
  }
  assert(!liveProbe.includes('console.log(token)'));
  assert(menu.includes('RAK_17135_ROLE_DIAGNOSTIC'), 'lightweight More shell lacks role diagnostic');
  assert(menu.includes('data-menu-action="live-auth-check"'), 'More role section lacks TEST diagnostic action');
  assert(!renderer.includes('async function rakRunLiveAuthDiagnostic()'), 'heavy Admin renderer must not own duplicate role diagnostic');
});
test('operational bridge records only sanitized rejection metadata', () => {
  assert(bridge.includes("diagnoseSupabaseRejection('unplanned-absence', err)"));
  assert(bridge.includes("window.RAK_DIAGNOSTICS.safeLog('warn', 'rotation unplanned change rejected', diagnostic)"));
  assert(!bridge.includes("safeLog('warn', 'rotation unplanned change rejected', err)"));
});
