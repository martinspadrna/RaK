import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {equivalentJsonText} from './canonical-build.mjs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

test('Vercel may normalize only JSON formatting before the isolated build',()=>{
  const pretty='{\n  "outputDirectory": ".rak-dist",\n  "git": {"deploymentEnabled": {"development": false}}\n}\n';
  const minified='{"git":{"deploymentEnabled":{"development":false}},"outputDirectory":".rak-dist"}';
  const changed='{"git":{"deploymentEnabled":{"development":true}},"outputDirectory":".rak-dist"}';
  assert.equal(equivalentJsonText(pretty,minified),true);
  assert.equal(equivalentJsonText(pretty,changed),false);
  assert.equal(equivalentJsonText(pretty,'not-json'),false);
});

test('the public build is isolated and the historical rewrite chain is legacy-only',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,RELEASE_METADATA.technicalVersion);
  assert.equal(pkg.version,RELEASE_METADATA.displayVersion);
  assert.equal(pkg.scripts['vercel-build'],'node tools/canonical-build.mjs build');
  assert.match(pkg.scripts['legacy:vercel-build'],/development-version-17048|shift-report-mo-hotfix-170/);
  assert.equal(pkg.scripts['test:canonical-build'],'node --test tools/canonical-build-contract.test.mjs');
  assert(pkg.scripts['legacy:check'].includes('tools/v160-smoke.mjs'));
  assert(pkg.scripts.check.includes('tools/canonical-baseline-smoke.mjs'));
  assert(!pkg.scripts.check.includes('tools/v160-smoke.mjs'));
  const config=JSON.parse(read('vercel.json'));
  assert.equal(config.outputDirectory,'.rak-dist');
  assert.equal(config.git?.deploymentEnabled?.development,false);
  const ignored=read('.gitignore');
  for(const entry of ['.rak-canonical-build/','.rak-dist/','.rak-promotion/'])assert(ignored.includes(entry),entry+' must be ignored');
});

test('the canonical build contract names its output, variable archive and immutable-source proof',()=>{
  const source=read('tools/canonical-build.mjs');
  for(const marker of [".rak-canonical-build","'.rak-dist'","GIT_WORK_TREE","prepareBackup","['run','check']",
    "git',['diff','--name-only','HEAD','--']","rak-complete-backup-source.zip","stableDigest","verify-repeat"]){
    assert(source.includes(marker),'missing canonical build guard: '+marker);
  }
  assert(source.includes("['archive','--format=zip','HEAD','--',...inventory]"),
    'source ZIP must use the verified allowlist');
  assert(!source.includes('applyMetadata(WORK'),'canonical work must keep the exact published release metadata');
  assert(!source.includes('LEGACY_RELEASE'),'canonical build must not relabel current code as an older release');
  const restore=read('tools/source-restore-rehearsal-17069.mjs');
  assert(restore.includes("['-C',gitRoot,'ls-files','-s','-z']"),
    'restore rehearsal must read the repository index from its exact root');
  assert(restore.includes("git(['hash-object','--',restored])"),
    'restore rehearsal must compare every recovered Git blob');
  assert(!fs.existsSync(path.join(ROOT,'tools/development-version-17070.mjs')));
  assertCurrentReleaseIdentity(read,'1.7.76');
  const buildSource=read('tools/canonical-build.mjs');
  assert(buildSource.includes("import RELEASE_METADATA from '../rak-release-metadata.js';"));
  assert(buildSource.includes("SUPABASE_VENDOR_RELATIVE='supabase-vendor-2.110.7.js'"));
  assert(buildSource.includes("SUPABASE_VENDOR_SOURCE=path.join(ROOT,'node_modules','@supabase','supabase-js','dist','umd','supabase.js')"));
  assert(buildSource.includes("SUPABASE_VENDOR_SHA384='hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD'"));
  assert(buildSource.includes("crypto.createHash('sha384')"));
  assert(buildSource.includes('prepareVendor()'));
  assert.equal(JSON.parse(read('package.json')).devDependencies['@supabase/supabase-js'],'2.110.7');
});

test('build evidence proves two stable passes without source changes when present',()=>{
  const proof=path.join(ROOT,'.rak-canonical-build','verified.json');
  if(!fs.existsSync(proof))return;
  const value=JSON.parse(fs.readFileSync(proof,'utf8'));
  assert.equal(value.schema,'rak-isolated-canonical-build-v1');
  assert.equal(value.repeatBuild,true);
  assert.equal(value.technicalVersion,RELEASE_METADATA.technicalVersion);
  assert.equal(value.release,RELEASE_METADATA.displayVersion);
  assert.equal(value.buildId,RELEASE_METADATA.buildId);
  assert.match(value.stableDigest,/^[a-f0-9]{64}$/);
  assert.deepEqual(value.variableOutputs,['rak-complete-backup-source.zip']);
  assert(read('.rak-dist/index.html').includes('<script src="rak-release-metadata.js"></script>'));
  assert(read('.rak-dist/sw.js').includes("importScripts('./rak-release-metadata.js?sw="+RELEASE_METADATA.displayVersion+"')"));
  assert.equal(read('.rak-dist/rak-release-metadata.js'),read('rak-release-metadata.js'));
  assert(fs.existsSync(path.join(ROOT,'.rak-dist','supabase-vendor-2.110.7.js')),'self-hosted Supabase SDK missing from public output');
  const vendor=fs.readFileSync(path.join(ROOT,'.rak-dist','supabase-vendor-2.110.7.js'));
  assert.equal(crypto.createHash('sha384').update(vendor).digest('base64'),'hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD');
  const changed=git('diff','--name-only','HEAD','--');
  assert.equal(changed,'','canonical source changed while building');
});

