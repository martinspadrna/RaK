#!/usr/bin/env node
// RaK 1.7.51: one final release stage after the inherited 1.7.50 gates.
// Fixes the source ZIP allowlist gap and documents an honest development-only recovery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.51',BUILD='v1.7.51-archiveguard1',PREVIOUS='v1.7.50-privatecase1';
const read=path=>fs.readFileSync(path,'utf8');
const write=(path,text)=>fs.writeFileSync(path,text,'utf8');
function replace(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17051] ambiguous '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17051] missing '+label);
 return source;
}
function edit(file,pairs){
 let source=read(file);
 for(const [before,after] of pairs)source=replace(source,before,after,file);
 write(file,source);
}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert(/^[0-9a-f]{40}$/.test(sha),'[17051] Git SHA invalid');
// IMPORTANT: git archive HEAD (without explicit paths) includes files deliberately
// excluded from the client inventory. Recreate from exactly the same SAFE file set.
const excludedDirectories=new Set(['.git','node_modules','.vercel','.next','dist','coverage','.cache']);
const sensitiveName=/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.netrc$|\.mcp\.json$|credentials(?:\.|$)|service-account(?:\.|$)|secrets?(?:\.|$)|id_rsa(?:\.|$)|id_ed25519(?:\.|$))/i;
function safe(path){
 const name=String(path||'').replace(/\\/g,'/');
 const base=name.split('/').at(-1)||'';
 return !!name&&!name.startsWith('/')&&!name.startsWith('../')&&!name.split('/').some(part=>part==='..'||excludedDirectories.has(part))
  &&!sensitiveName.test(name)&&!/^\.env(?:\.|$)/i.test(base)
  &&!/\.(?:pem|key|p12|pfx|zip|log)$/i.test(base);
}
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(s=>s.replace(/\\/g,'/')).filter(safe).sort();
assert(tracked.length>80,'[17051] insufficient allowlisted files');
assert(tracked.includes('rak-complete-backup.js')&&tracked.includes('SECURITY_DEPLOYMENT.md'),'[17051] restore essentials excluded');
const inventoryRe=/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[[\s\S]*?\]\);/;
let backup=read('rak-complete-backup.js');
assert(inventoryRe.test(backup),'[17051] cannot find generated owner source inventory');
backup=backup.replace(inventoryRe,'const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([\n'+tracked.map(f=>'    '+JSON.stringify(f)).join(',\n')+'\n  ]);');
write('rak-complete-backup.js',backup);
const zip=execFileSync('git',['archive','--format=zip','HEAD','--',...tracked],{encoding:null,maxBuffer:128*1024*1024});
assert(Buffer.isBuffer(zip)&&zip.length>100000,'[17051] filtered archive unexpectedly small');
write('rak-complete-backup-source.zip',zip);
// Historical 1.7.48 -> 1.7.50 transformer needs to replay on the second
// full build. Treat final 1.7.51 marker as prior 1.7.50, then bump once again.
const guardFile='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(guardFile);
const previousGuard=`const already17050=indexSource.includes("var build='${PREVIOUS}';");`;
const extendedGuard=`// RAK_17051_TWO_PASS_GUARD\nconst already17050=indexSource.includes("var build='${PREVIOUS}';")||indexSource.includes("var build='${BUILD}';");`;
if(!stage.includes('// RAK_17051_TWO_PASS_GUARD')){
 stage=replace(stage,previousGuard,extendedGuard,'full second-pass replay');
 write(guardFile,stage);
}
edit('supabase-config.js',[
 ['window.RAK_RELEASE_VERSION = "1.7.50";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['window.RAK_TEST_DISPLAY_VERSION = "1.7.50";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 [`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`]]);
edit('app.js',[
 [`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['window.RAK_RELEASE_VERSION = "1.7.50";',`window.RAK_RELEASE_VERSION = "${VERSION}";`]]);
edit('sw.js',[
 ["const CACHE_VERSION = 'v1.7.50';",`const CACHE_VERSION = 'v${VERSION}';`],
 ["const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.50';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 [`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]]);
edit('index.html',[[`var build='${PREVIOUS}';`,`var build='${BUILD}';`]]);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17051] OS-only employee login changed');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const file of ['tools/development-version-17051.mjs','tools/backup-source-integrity-17051.mjs','sw.js','app.js','supabase-config.js',guardFile])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/backup-source-integrity-17051.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--test','tools/release-gate-17051.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17051] OK safe source ZIP, backup manifest inventory, updated runbook, inherited two-pass tests and TEST PWA '+VERSION);
