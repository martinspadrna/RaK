import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

test('the public build is isolated and the historical rewrite chain is legacy-only',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'1.7.0');
  assert.equal(pkg.scripts['vercel-build'],'node tools/canonical-build.mjs build');
  assert.match(pkg.scripts['legacy:vercel-build'],/development-version-17048|shift-report-mo-hotfix-170/);
  assert.equal(pkg.scripts['test:canonical-build'],'node --test tools/canonical-build-contract.test.mjs');
  const config=JSON.parse(read('vercel.json'));
  assert.equal(config.outputDirectory,'.rak-dist');
  assert.equal(config.git?.deploymentEnabled?.development,false);
  const ignored=read('.gitignore');
  for(const entry of ['.rak-canonical-build/','.rak-dist/','.rak-promotion/'])assert(ignored.includes(entry),entry+' must be ignored');
});

test('the canonical build contract names its output, variable archive and immutable-source proof',()=>{
  const source=read('tools/canonical-build.mjs');
  for(const marker of [".rak-canonical-build","'.rak-dist'","GIT_WORK_TREE","legacy:vercel-build",
    "git',['diff','--name-only','HEAD','--']","rak-complete-backup-source.zip","stableDigest","verify-repeat"]){
    assert(source.includes(marker),'missing canonical build guard: '+marker);
  }
  assert(!fs.existsSync(path.join(ROOT,'tools/development-version-17070.mjs')));
});

test('build evidence proves two stable passes without source changes when present',()=>{
  const proof=path.join(ROOT,'.rak-canonical-build','verified.json');
  if(!fs.existsSync(proof))return;
  const value=JSON.parse(fs.readFileSync(proof,'utf8'));
  assert.equal(value.schema,'rak-isolated-canonical-build-v1');
  assert.equal(value.repeatBuild,true);
  assert.equal(value.technicalVersion,'1.7.0');
  assert.equal(value.release,'1.7.69');
  assert.match(value.stableDigest,/^[a-f0-9]{64}$/);
  assert.deepEqual(value.variableOutputs,['rak-complete-backup-source.zip']);
  const changed=git('diff','--name-only','HEAD','--');
  assert.equal(changed,'','canonical source changed while building');
});
