import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyRoadmapProgress} from './roadmap-contract.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.56', BUILD='v1.7.56-authprobe1';
test('visible 1.7.56, PWA and TEST database align; OS-only login and technical 1.7.0 remain',()=>{
 for(const [file,anchor] of [
  ['index.html',`var build='${BUILD}';`],
  ['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  ['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]
 ])assert(read(file).includes(anchor),'release mismatch: '+file+' '+anchor);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('auth diagnostic uses GoTrue signed token, exact TEST URL and strictly read-only RPCs',()=>{
 const helper=read('tools/auth-role-diagnostic-17056.js');
 const built=read('app-menu-admin-renderer.js');
 assert(built.includes(helper),'actual built app missing diagnostic implementation');
 for(const text of ['rakAdminCanOpenAdmin()','app.adminAuthVersion !== 2','getAdminAccessToken()',
  "origin !== 'https://cgshssdjgzzuprlwnabl.supabase.co'", "'/auth/v1/user', 'GET'",
  "'/rest/v1/rpc/rak_admin_context'", "'/rest/v1/rpc/rak_admin_list_audit_v2'",
  "'/rest/v1/rpc/rak_owner_list_admin_profiles'", "role === 'owner'", "[401, 403].includes(ownerResponse.status)",
  'String(context.user_id || \'\') !== String(authenticatedUser.id || \'\')',
  'String(context.account_id || \'\') !== String(app.adminAccountId || \'\')'])assert(helper.includes(text),'missing live check: '+text);
 for(const forbidden of ['localStorage','sessionStorage','console.log','console.warn','service_role','sb_secret_','signInWithPassword','signOut','PATCH','DELETE','INSERT','UPDATE','rak_owner_complete_backup_v1'])
  assert(!helper.includes(forbidden),'diagnostic must not log, mutate or request full backup: '+forbidden);
 assert(!helper.includes('bkqamcbkiwumsvelahxr'),'production DB must never be contacted');
});
test('diagnostic is user-triggered only within verified administrator service, with safe status text',()=>{
 const renderer=read('app-menu-admin-renderer.js'), menu=read('app-menu.js');
 assert(renderer.includes('data-admin-action=\\"run-live-auth-check\\"')||renderer.includes('data-admin-action="run-live-auth-check"'));
 assert(renderer.includes('rakLiveAuthDiagnosticStatus')&&renderer.includes('Ještě neověřeno'));
 assert(menu.includes("if (adminAction === 'run-live-auth-check')")&&menu.includes("currentView === 'service'"));
 assert(menu.includes('appMenuCanRunAdminInteraction(currentView)'));
 assert(!renderer.includes('window.rakRunLiveAuthDiagnostic();'),'probe cannot auto-run');
});
test('second full build preserves 1.7.55, all historical gates, offline Chromium, ZIP and actual HTTP',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17055.mjs');"));
 assert(chain.includes("await import('./development-version-17056.mjs');"));
 assert(chain.indexOf("await import('./development-version-17055.mjs');")<chain.indexOf("await import('./development-version-17056.mjs');"));
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(stage.includes('// RAK_17055_TWO_PASS_GUARD')&&stage.includes('// RAK_17056_TWO_PASS_GUARD'));
 assert(stage.includes(`already17056?"var build='${BUILD}';":already17055?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17056.test.mjs',
  'node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs',
  'node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(command),'CI missing '+command);
});
test('13-point roadmap validates every percentage independently of old status prose',()=>{
 const progress=verifyRoadmapProgress(read('RAK_HANDOFF.md'));
 assert.equal(progress.length,13);
 assert(progress.some(item=>item.id==='P1.5'));
 assert(read('tools/auth-role-diagnostic-17056.js').includes('/auth/v1/user'));
});
