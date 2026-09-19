import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const VERSION='1.7.53',BUILD='v1.7.53-backupverify1';
const source=read('rak-complete-backup.js');
const validatorMatch=source.match(/  \/\/ RAK_17053_BACKUP_STRUCTURE_GUARD[^\n]*\n[\s\S]*?(?=  function addSupabaseSnapshotFiles\()/);
const snapshot={format:'rak-complete-backup-v1', data:{public:{rotation_state:[],rak_admin_profiles:[]},private:{rak_rotation_import_metadata_v1:[{rotation_key:'rotation_state',month_key:'09.2026'}]},auth:{users_sanitized:[{id:'fake'}],identities_sanitized:[]},storage:{buckets:[],objects:[]}},schema:{tables:[{}],functions:[{}],policies:[]},sensitive_exclusions:['auth.sessions excluded']};
const clone=value=>JSON.parse(JSON.stringify(value));
test('exact development release, double build, OS-only employees and isolation',()=>{
 for(const [file,text] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(file).includes(text),file+' missing '+text);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('actual in-app owner ZIP validator rejects missing records and disclosed secrets',()=>{
 assert(validatorMatch,'[17053] missing runtime backup validator');
 const validate=vm.runInNewContext(validatorMatch[0]+'\nvalidateCompleteSnapshot;',{});
 const good=validate(clone(snapshot));
 assert.equal(good.privateImports,1);
 assert.equal(good.sanitizedAuthAccounts,1);
 assert.equal(good.schemaTables,1);
 for(const mutate of [
  x=>delete x.data.public.rotation_state,
  x=>x.data.public.rak_admin_secrets=[],
  x=>delete x.data.private,
  x=>delete x.data.auth.users_sanitized,
  x=>x.data.auth.users_sanitized[0].encrypted_password='secret',
  x=>delete x.data.storage.objects,
  x=>delete x.schema.functions,
  x=>x.sensitive_exclusions=[]
 ]){const bad=clone(snapshot);mutate(bad);assert.throws(()=>validate(bad),/Úplná záloha je neúplná/);}
 assert(source.includes('const validated = validateCompleteSnapshot(snapshot);'));
 assert(source.includes('privateImports: validated.privateImports'));
});
test('ZIP exports private import JSON explicitly and documents honest recovery',()=>{
 assert(source.includes("'supabase/data/private/rak_rotation_import_metadata_v1.json', data.private.rak_rotation_import_metadata_v1"));
 assert(source.includes('Obnov soukromá metadata importů'));
 assert(source.includes('přemapuj rak_admin_profiles.user_id'));
 assert(source.includes('staré záznamy zařízení/relací nepovažuj za platné'));
 assert(source.includes('Soukromých importů: '));
 assert(source.includes('Sanitizovaných Auth účtů: '));
 const sql=read('tools/role-backup-regression-17053.sql');
 for(const value of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE authenticated','rak_owner_list_admin_profiles','rak_owner_complete_backup_v1','rak_admin_secrets','rak_rotation_import_metadata_v1'])assert(sql.includes(value),'SQL fixture missing '+value);
});
test('historic gates, real mobile/offline, HTTP and safe archive still required',()=>{
 const workflow=read('.github/workflows/rak-development-validation.yml');
 for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17053.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(workflow.includes(command),'CI missing '+command);
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17052.mjs');")&&chain.includes("await import('./development-version-17053.mjs');"));
 assert(chain.includes("['--test','tools/release-gate-17052.test.mjs']"));
 const guard=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(guard.includes('// RAK_17053_TWO_PASS_GUARD')&&guard.includes(`already17053?"var build='${BUILD}';":already17052?`));
});
test('13-point report distinguishes partial restoration from completed recovery',()=>{
 const plan=read('RAK_PLAN_13.md');
 assert(plan.includes('1.7.53')&&plan.includes('2/13')&&plan.includes('rollback')&&plan.includes('iPhone'));
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
 assert(plan.includes('riziko přijato, nikoli zabezpečeno'));
});
