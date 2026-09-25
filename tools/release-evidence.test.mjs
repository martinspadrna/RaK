import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import RELEASE_METADATA from '../rak-release-metadata.js';
import {PROD_SUPABASE,TEST_SUPABASE,releaseDecision,validateBuildProof,validateCiProof,validateHttpFolder,validatePerformanceBudgetProof} from './release-evidence.mjs';

const SHA='a'.repeat(40);
const HASH='b'.repeat(64);
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const checks=[
  'preflight-contracts','dependency-install','two-clean-canonical-builds','release-and-regression-gates',
  'rollback-and-pwa-contracts','zip-manifest-crc','chromium-offline-layout','three-profile-benchmark',
  'test-supabase-http','immutable-source-tree'
];

function buildProof(){
  return {
    schema:'rak-isolated-canonical-build-v1',sourceCommit:SHA,release:RELEASE_METADATA.displayVersion,
    technicalVersion:RELEASE_METADATA.technicalVersion,buildId:RELEASE_METADATA.buildId,
    repeatBuild:true,stableDigest:HASH,variableOutputs:['rak-complete-backup-source.zip'],differences:['rak-complete-backup-source.zip'],
    files:['index.html','sw.js','rak-release-metadata.js','supabase-config.js','supabase-vendor-2.110.7.js','rak-complete-backup-source.zip'].map(file=>({path:file,sha256:HASH}))
  };
}
function performanceProof(){
  const config=JSON.parse(read('tools/performance-budget-17104.json'));
  return {schema:'rak-performance-budget-evidence-v1',result:'PASS',sourceCommit:SHA,baseline:{...config.baseline},
    time:Object.fromEntries(Object.entries(config.timeModes).map(([label,spec])=>[label,{baselineP95Ms:spec.baselineP95Ms,actualP95Ms:spec.baselineP95Ms,hardBudgetMs:spec.hardBudgetMs,deltaMs:0,deltaPct:0}])),
    size:Object.fromEntries(Object.entries(config.sizeGroups).map(([name,spec])=>[name,{baselineBytes:spec.baselineBytes,actualBytes:spec.baselineBytes,maxBytes:spec.maxBytes,deltaBytes:0,deltaPct:0,fileCount:1}]))};
}
function ciProof(){
  return {schema:'rak-ci-release-proof-v1',result:'PASS',sha:SHA,completedChecks:[...checks],github:{runId:1,runNumber:2},performanceBudget:performanceProof()};
}

test('documentation-only commit skips deployment, unknown or workflow change deploys',()=>{
  assert.equal(releaseDecision({branch:'development',previous:'c'.repeat(40),head:SHA,files:['RAK_PLAN_13.md']}).deploy,false);
  assert.equal(releaseDecision({branch:'development',previous:'c'.repeat(40),head:SHA,files:['.github/workflows/rak-development-validation.yml']}).deploy,true);
  assert.equal(releaseDecision({branch:'development',previous:'',head:SHA,files:null}).deploy,true);
});

test('canonical proof requires exact SHA, two builds and declared differences',()=>{
  assert.equal(validateBuildProof(buildProof(),SHA).repeatBuild,true);
  assert.throws(()=>validateBuildProof({...buildProof(),sourceCommit:'c'.repeat(40)},SHA),/SHA mismatch/);
  assert.throws(()=>validateBuildProof({...buildProof(),repeatBuild:false},SHA),/two clean/);
  assert.throws(()=>validateBuildProof({...buildProof(),differences:['index.html']},SHA),/undeclared/);
});

test('CI proof is fail closed for missing checks, mismatched SHA and failed performance evidence',()=>{
  assert.equal(validatePerformanceBudgetProof(performanceProof(),SHA).result,'PASS');
  assert.equal(validateCiProof(ciProof(),SHA).result,'PASS');
  assert.throws(()=>validateCiProof({...ciProof(),sha:'c'.repeat(40)},SHA),/SHA mismatch/);
  assert.throws(()=>validateCiProof({...ciProof(),completedChecks:checks.slice(1)},SHA),/checks missing/);
  const bad=ciProof();bad.performanceBudget.time['cold mobile'].actualP95Ms=bad.performanceBudget.time['cold mobile'].hardBudgetMs+1;
  assert.throws(()=>validateCiProof(bad,SHA),/timing budget exceeded/);
});

function httpFixture({production=false}={}){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rak-http-evidence-'));
  const bodies={
    index:'<!doctype html><script src="rak-release-metadata.js"></script>',
    sw:'importScripts("./rak-release-metadata.js"); const cache="'+RELEASE_METADATA.cacheVersion+'";',
    metadata:'({ displayVersion: '+JSON.stringify(RELEASE_METADATA.displayVersion)+', technicalVersion: '+JSON.stringify(RELEASE_METADATA.technicalVersion)+', cacheVersion: '+JSON.stringify(RELEASE_METADATA.cacheVersion)+', buildId: '+JSON.stringify(RELEASE_METADATA.buildId)+' })',
    supabase:'const config = { url: "https://'+(production?PROD_SUPABASE:TEST_SUPABASE)+'.supabase.co" };'
  };
  for(const [name,body] of Object.entries(bodies)){
    fs.writeFileSync(path.join(folder,name+'.body'),body);
    fs.writeFileSync(path.join(folder,name+'.headers'),'HTTP/2 200\ncontent-type: text/plain\n');
  }
  return folder;
}

test('HTTP proof accepts only complete TEST output',()=>{
  const good=httpFixture();
  assert.equal(validateHttpFolder('fixture',good).supabase.productionProjectAbsent,true);
  const bad=httpFixture({production:true});
  assert.throws(()=>validateHttpFolder('fixture',bad),/TEST Supabase missing|production Supabase detected/);
});

test('CLI argument routing verifies downloaded CI proof and HTTP files',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rak-release-cli-'));
  const proofFile=path.join(folder,'ci.json'),buildFile=path.join(folder,'build.json'),httpOut=path.join(folder,'http.json');
  fs.writeFileSync(proofFile,JSON.stringify(ciProof()));
  fs.writeFileSync(buildFile,JSON.stringify(buildProof()));
  const script=fileURLToPath(new URL('./release-evidence.mjs',import.meta.url));
  assert.doesNotThrow(()=>execFileSync(process.execPath,[script,'verify-ci',proofFile,buildFile,SHA],{stdio:'pipe'}));
  assert.doesNotThrow(()=>execFileSync(process.execPath,[script,'http-check','fixture',httpFixture(),httpOut],{stdio:'pipe'}));
  assert.equal(JSON.parse(fs.readFileSync(httpOut,'utf8')).result,'PASS');
});