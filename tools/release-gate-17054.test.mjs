import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const VERSION='1.7.54',BUILD='v1.7.54-restorepreflight1';
const backup=read('rak-complete-backup.js');
const match=backup.match(/  function validateCompleteSnapshot\(snapshot\) \{[\s\S]*?\n  \}\n\n  function addSupabaseSnapshotFiles\(/);
const validate=match?vm.runInNewContext(match[0].replace(/\n\n  function addSupabaseSnapshotFiles\($/,'')+'\nvalidateCompleteSnapshot;',{}):null;
const PUBLIC=['announcements','app_keepalive','bug_reports','game_accounts','game_invites','game_sessions','game_stats','gomoku_wins','machine_settings','machine_settings_backups','rak_admin_audit_log','rak_admin_devices','rak_admin_profiles','rak_admin_secrets','rak_admin_settings_backups','rak_rotation_backups_v2','rotation_entries','rotation_months','rotation_state','rotation_state_backups'];
const UID='00000000-0000-4000-8000-000000000001';
function fixture(){
 const entries=Object.fromEntries(PUBLIC.filter(name=>name!=='rak_admin_secrets').map(name=>[name,[]]));
 entries.rak_admin_profiles=[{user_id:UID,role:'owner'}];
 entries.rak_admin_devices=[{user_id:UID,session_id:'synthetic'}];
 return {format:'rak-complete-backup-v1',data:{public:entries,private:{rak_rotation_import_metadata_v1:[{rotation_key:'main',month_key:'09.2026',import_metadata:{}}]},auth:{users_sanitized:[{id:UID,raw_app_meta_data:{provider:'email'}}],identities_sanitized:[{id:'synthetic',user_id:UID,provider:'email'}]},storage:{buckets:[{id:'synthetic-bucket'}],objects:[{bucket_id:'synthetic-bucket',name:'fixture.txt'}]}},schema:{tables:PUBLIC.map(name=>({schema:'public',name})).concat([{schema:'private',name:'rak_rotation_import_metadata_v1'}]),functions:[{definition:'SELECT 1'}],policies:[]},sensitive_exclusions:['auth.sessions excluded']};
}
function reject(mutator,label){const item=fixture();mutator(item);assert.throws(()=>validate(item),/Úplná záloha je neúplná/,label);}
test('development 1.7.54, OS-only login, immutable technical version and TEST Supabase',()=>{
 for(const [file,text] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(file).includes(text),file+' missing '+text);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('REAL client validator verifies full 20-table schema, 19 public exports, Auth mapping and Storage',()=>{
 assert(match&&backup.includes('RAK_17054_BACKUP_COVERAGE_GUARD'),'actual client validator not extended');
 const ok=validate(fixture());
 assert.equal(ok.completePublicTables,19);
 assert.equal(ok.publicRows,2);
 assert.equal(ok.privateImports,1);
 assert.equal(ok.sanitizedAuthAccounts,1);
 assert.equal(ok.schemaTables,21);
 reject(x=>delete x.data.public.machine_settings,'missing public table');
 reject(x=>x.data.public.unexpected=[],'extra public table');
 reject(x=>x.schema.tables=x.schema.tables.filter(t=>t.name!=='machine_settings'),'missing table from schema');
 reject(x=>x.schema.tables.push({schema:'public',name:'rak_admin_profiles'}),'duplicate schema table');
 reject(x=>x.schema.tables=x.schema.tables.filter(t=>t.name!=='rak_admin_secrets'),'missing schema secret exclusion');
 reject(x=>x.data.public.rak_admin_secrets=[],'secret table contents');
 reject(x=>x.data.public.machine_settings=[null],'invalid row');
 reject(x=>x.data.auth.users_sanitized[0].encrypted_password='secret','secret Auth column');
 reject(x=>x.data.auth.users_sanitized[0].recovery_token='token','unknown Auth column');
 reject(x=>x.data.auth.users_sanitized[0].raw_app_meta_data.access_token='token','nested Auth metadata');
 reject(x=>x.data.auth.users_sanitized.push({id:UID}),'duplicate Auth ID');
 reject(x=>x.data.public.rak_admin_profiles[0].user_id='unknown','owner orphan');
 reject(x=>x.data.public.rak_admin_devices[0].user_id='unknown','device orphan');
 reject(x=>x.data.auth.identities_sanitized[0].user_id='unknown','identity orphan');
 reject(x=>x.data.auth.identities_sanitized[0].provider_token='secret','identity data widened');
 reject(x=>x.data.storage.objects[0].bucket_id='unknown','Storage orphan');
 reject(x=>x.schema.tables=x.schema.tables.filter(t=>t.schema!=='private'),'private import table missing');
});
test('manifest and restore instructions expose counts without claiming full independent recovery',()=>{
 assert(backup.includes('completePublicTables: validated.completePublicTables'));
 assert(backup.includes('publicRows: validated.publicRows'));
 assert(backup.includes('Řádků aplikačních tabulek: '));
 assert(backup.includes('přemapuj rak_admin_profiles.user_id'));
 const sql=read('tools/backup-coverage-17054.sql');
 for(const needle of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE authenticated','rak_owner_complete_backup_v1','rak_admin_profiles','rak_admin_devices','identities_sanitized','rak_rotation_import_metadata_v1','Storage','row-count'])assert(sql.includes(needle),'missing real snapshot SQL check: '+needle);
});
test('historical stage, twice-build CI, mobile offline and live TEST HTTP remain mandatory',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17053.mjs');")&&chain.includes("['--test','tools/release-gate-17053.test.mjs']")&&chain.includes("await import('./development-version-17054.mjs');"));
 const guard=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(guard.includes('// RAK_17054_TWO_PASS_GUARD')&&guard.includes(`already17054?"var build='${BUILD}';":already17053?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const cmd of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17054.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(cmd),'CI missing '+cmd);
});
test('historical 1.7.54 coverage milestone does not override current incomplete JWT/restore plan',()=>{
 const plan=read('RAK_PLAN_13.md');
 assert(read('tools/development-version-17054.mjs').includes(VERSION));
 assert(plan.includes('2/13')&&plan.includes('JWT')&&plan.includes('iPhone')&&plan.includes('Izolovaná plná obnova zatím nebyla provedena'));
 assert(plan.includes('0/13 plně technicky'));
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
});
