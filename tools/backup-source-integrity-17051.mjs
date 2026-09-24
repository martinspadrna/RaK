#!/usr/bin/env node
// RaK 1.7.51: independent verification of the exact, filtered source ZIP.
// Requires only Git and unzip on the build runner. Never exports private data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {BUILD_TARGET,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=path=>fs.readFileSync(path,'utf8');
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const ARCHIVE='rak-complete-backup-source.zip';
const sha=run('git',['rev-parse','HEAD']);
assert(/^[0-9a-f]{40}$/.test(sha),'[17051] missing exact Git commit');
const expectedBranch=BUILD_TARGET==='production'?'main':'development';
for(const [name,value] of [['GitHub',process.env.GITHUB_REF_NAME],['Vercel',process.env.VERCEL_GIT_COMMIT_REF]]){
 if(value)assert.equal(value,expectedBranch,`[17051] ${name} branch must match ${BUILD_TARGET} target`);
}
if(process.env.GITHUB_SHA)assert.equal(process.env.GITHUB_SHA,sha,'[17051] workflow SHA mismatch');
if(process.env.VERCEL_GIT_COMMIT_SHA)assert.equal(process.env.VERCEL_GIT_COMMIT_SHA,sha,'[17051] deployment SHA mismatch');
const config=read('supabase-config.js');
assertSupabaseTarget(config,'[17051] source archive');
const app=read('rak-complete-backup.js');
assert(app.includes(`const RAK_COMPLETE_BACKUP_BUILD_SHA = '${sha}';`),'[17051] ZIP owner UI SHA differs from source commit');
const inventoryMatch=app.match(/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\((\[[\s\S]*?\])\);/);
assert(inventoryMatch,'[17051] missing embedded owner-backup inventory');
const expected=JSON.parse(inventoryMatch[1]);
assert(Array.isArray(expected)&&expected.length>80,'[17051] inventory too small');
assert.equal(new Set(expected).size,expected.length,'[17051] duplicate source paths');
const sorted=[...expected].sort();
assert.deepEqual(expected,sorted,'[17051] inventory order changed');
assert(expected.every(path=>typeof path==='string'&&path&&!path.startsWith('/')&&!path.split('/').includes('..')),'[17051] unsafe path');
assert(fs.existsSync(ARCHIVE)&&fs.statSync(ARCHIVE).size>100000,'[17051] missing/incomplete ZIP');
const entries=run('unzip',['-Z','-1',ARCHIVE]).split(/\r?\n/).filter(item=>item&&!item.endsWith('/')).sort();
assert.deepEqual(entries,expected,'[17051] source ZIP differs from safe owner inventory (unlisted file or missing source)');
execFileSync('unzip',['-tqq',ARCHIVE],{stdio:'pipe',maxBuffer:128*1024*1024});
const forbidden=/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.netrc$|\.mcp\.json$|credentials(?:\.|$)|service-account(?:\.|$)|secrets?(?:\.|$)|id_rsa(?:\.|$)|id_ed25519(?:\.|$))/i;
assert(!entries.some(item=>forbidden.test(item)||/\.(?:pem|key|p12|pfx|zip|log)$/i.test(item)),'[17051] private or archive file in public source ZIP');
const docs=read('SECURITY_DEPLOYMENT.md');
assert(!/\b\d{4}@admin\.rak\.local\b/i.test(docs)&&!docs.includes('test:gomoku-ai')&&!docs.includes('a Hry'),'[17051] obsolete or identifying release guidance');
assert(docs.includes('development')&&docs.includes('main')&&docs.includes('rollback')&&docs.includes('izolovan'),'[17051] rollback runbook incomplete');
console.log(`[17051-source-integrity] PASS: SHA ${sha}; ${entries.length} allowlisted Git files; ZIP CRC OK; no excluded files; target=${BUILD_TARGET}`);
// P1.5: go beyond ZIP CRC by actually extracting all source files and verifying every Git blob.
await import('./source-restore-rehearsal-17069.mjs');
