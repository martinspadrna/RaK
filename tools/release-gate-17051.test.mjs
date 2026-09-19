import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const VERSION='1.7.51',BUILD='v1.7.51-archiveguard1';
test('final development version, test DB, OS-only login and technical version',()=>{
 for(const [path,marker] of [
  ['index.html',`var build='${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  ['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],
  ['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['sw.js',"const SW_APP_VERSION = '1.7.0';"]])assert(read(path).includes(marker),`[17051] ${path} missing ${marker}`);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('source archive is rebuilt from precisely the safe, embedded client inventory',()=>{
 const stage=read('tools/development-version-17051.mjs');
 const audit=read('tools/backup-source-integrity-17051.mjs');
 for(const marker of ["'ls-files'","'archive'","'--format=zip'",'HEAD','...tracked','RAK_COMPLETE_BACKUP_REPO_FILES','sensitiveName','SECURITY_DEPLOYMENT.md','RAK_17051_TWO_PASS_GUARD'])
  assert(stage.includes(marker),`[17051] stage missing ${marker}`);
 assert(stage.includes("execFileSync('git',['archive','--format=zip','HEAD','--',...tracked]"));
 assert(stage.includes('tracked.map(f=>')&&stage.includes('sensitiveName'));
 for(const marker of ['unzip',"'-tqq'",'assert.deepEqual(entries,expected','no excluded files','GITHUB_SHA','VERCEL_GIT_COMMIT_SHA'])
  assert(audit.includes(marker),`[17051] archive audit missing ${marker}`);
 assert(!/git\s+archive\s+HEAD\s*\)/.test(stage),'[17051] unfiltered git archive forbidden');
});
test('deployment recovery guide no longer exposes owner identifier or obsolete commands',()=>{
 const guide=read('SECURITY_DEPLOYMENT.md');
 assert(!/\b\d{4}@admin\.rak\.local\b/i.test(guide));
 for(const forbidden of ['test:gomoku-ai','a Hry','1.337','pnpm run check'])assert(!guide.includes(forbidden),`[17051] obsolete ${forbidden}`);
 for(const must of ['development','main','rollback','izolovan','Auth','OS číslo','READY','ZIP'])assert(guide.includes(must),`[17051] missing runbook ${must}`);
});
test('two builds and live HTTP remain mandatory; history and replay preserved',()=>{
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 assert(workflow.includes('node tools/http-anon-audit-17050.mjs'));
 assert(workflow.includes('node tools/backup-source-integrity-17051.mjs'));
 assert(workflow.includes('node --test tools/release-gate-17051.test.mjs'));
 const importer=read('tools/development-version-17048.mjs');
 assert(importer.includes("await import('./development-version-17050.mjs');"));
 assert(importer.includes("await import('./development-version-17051.mjs');"));
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(stage.includes('// RAK_17051_TWO_PASS_GUARD'));
 assert(stage.includes(`indexSource.includes("var build='${BUILD}';")`));
 assert(read('tools/development-version-17050.mjs').includes("'tools/release-gate-17050.test.mjs'"));
});
test('13-item plan distinguishes risk acceptance, closed CI and outstanding physical tests',()=>{
 const plan=read('RAK_PLAN_13.md');
 for(const marker of ['2/13','1/13 technicky','1/13 uzavřen rozhodnutím','0/13 plně technicky','OS číslo','24 měsíců','anonymně čitelné',
 'importMeta','rollback','P1.3','P1.4','P1.5','iPhone','ČÁSTEČNĚ'])assert(plan.includes(marker),`[17051] missing honest scope ${marker}`);
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
});
