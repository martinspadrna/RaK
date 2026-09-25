#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import RELEASE_METADATA from '../rak-release-metadata.js';
import {classifyVercelBuild} from './vercel-build-policy.mjs';

export const PROJECT_ID='prj_Pv7eNEt5qGg2GX9l365fJnc0YUMF';
export const TEST_SUPABASE='cgshssdjgzzuprlwnabl';
export const PROD_SUPABASE='bkqamcbkiwumsvelahxr';
export const STABLE_ALIAS='skoda-spada-git-development-martinspadrnas-projects.vercel.app';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SHA=/^[0-9a-f]{40}$/i;
const DEPLOYMENT=/^dpl_[a-zA-Z0-9]+$/;
const REQUIRED_BUILD_FILES=['index.html','sw.js','rak-release-metadata.js','supabase-config.js','supabase-vendor-2.110.7.js','rak-complete-backup-source.zip'];
const REQUIRED_CHECKS=[
  'preflight-contracts','dependency-install','two-clean-canonical-builds','release-and-regression-gates',
  'rollback-and-pwa-contracts','zip-manifest-crc','chromium-offline-layout','three-profile-benchmark','quality-thresholds',
  'test-supabase-http','immutable-source-tree'
];

function ok(value,message){if(!value)throw Error('[release-evidence] '+message);}
function json(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function digest(data){return crypto.createHash('sha256').update(data).digest('hex');}
function git(args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();}
function output(name,value){if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,name+'='+String(value)+'\n');}
function cleanHost(value){return String(value||'').replace(/^https?:\/\//,'').replace(/\/$/,'');}
function changed(previous,head){
  if(!SHA.test(previous)||!SHA.test(head))return null;
  try{return git(['diff','--name-only',previous+'..'+head]).split(/\r?\n/).map(v=>v.trim()).filter(Boolean);}
  catch{return null;}
}

export function releaseDecision({branch,previous,head,files}){
  ok(SHA.test(head),'invalid release head SHA');
  const decision=classifyVercelBuild({branch,previous,files});
  return {schema:'rak-release-policy-v1',branch,previousSha:previous,headSha:head,files,deploy:!decision.skip,reason:decision.reason};
}

export function validateBuildProof(proof,sha){
  ok(proof&&proof.schema==='rak-isolated-canonical-build-v1','unknown canonical build proof');
  ok(proof.repeatBuild===true,'two clean canonical builds not proven');
  ok(proof.sourceCommit===sha,'canonical build SHA mismatch');
  ok(proof.release===RELEASE_METADATA.displayVersion,'display version mismatch');
  ok(proof.technicalVersion===RELEASE_METADATA.technicalVersion,'technical version mismatch');
  ok(proof.buildId===RELEASE_METADATA.buildId,'build ID mismatch');
  ok(/^[0-9a-f]{64}$/i.test(proof.stableDigest||''),'stable build digest missing');
  ok(Array.isArray(proof.files)&&REQUIRED_BUILD_FILES.every(name=>proof.files.some(file=>file.path===name&&/^[0-9a-f]{64}$/i.test(file.sha256||''))),'canonical build inventory incomplete');
  ok(Array.isArray(proof.differences)&&proof.differences.every(file=>(proof.variableOutputs||[]).includes(file)),'undeclared repeat-build difference');
  return proof;
}

export function validatePerformanceBudgetProof(proof,sha){
  ok(proof&&proof.schema==='rak-performance-budget-evidence-v1','unknown performance budget proof');
  ok(proof.result==='PASS','performance budget is not PASS');
  ok(proof.sourceCommit===sha,'performance budget SHA mismatch');
  const config=json(path.join(ROOT,'tools','performance-budget-17104.json'));
  ok(proof.baseline?.sha===config.baseline.sha,'performance baseline SHA mismatch');
  for(const [label,spec] of Object.entries(config.timeModes)){
    const item=proof.time?.[label];
    ok(item&&item.baselineP95Ms===spec.baselineP95Ms&&item.hardBudgetMs===spec.hardBudgetMs,'performance timing contract mismatch '+label);
    ok(Number.isFinite(item.actualP95Ms)&&item.actualP95Ms<=spec.hardBudgetMs,'performance timing budget exceeded '+label);
  }
  for(const [name,spec] of Object.entries(config.sizeGroups)){
    const item=proof.size?.[name];
    ok(item&&item.baselineBytes===spec.baselineBytes&&item.maxBytes===spec.maxBytes,'performance size contract mismatch '+name);
    ok(Number.isSafeInteger(item.actualBytes)&&item.actualBytes<=spec.maxBytes,'performance size budget exceeded '+name);
  }
  return proof;
}

export function validateQualityThresholdProof(proof,sha){
  ok(proof&&proof.schema==='rak-quality-threshold-evidence-v1','unknown quality threshold proof');
  ok(proof.result==='PASS','quality threshold proof is not PASS');
  ok(proof.sourceCommit===sha,'quality threshold SHA mismatch');
  ok(proof.periodicDevelopmentGate===true,'quality thresholds are not periodic');
  ok(proof.warningsAsSuccess===false,'quality warnings may not count as PASS');
  const config=json(path.join(ROOT,'tools','quality-thresholds-17104.json'));
  ok(config.warningsMayPass===false&&config.periodicDevelopmentGate===true,'quality threshold config is permissive');
  ok(proof.performanceBudget?.result===config.performanceBudget.requiredResult&&proof.performanceBudget?.sourceCommit===sha,'quality performance evidence mismatch');
  ok(proof.networkResilience?.result===config.networkResilience.requiredResult&&proof.networkResilience?.sourceCommit===sha,'quality network evidence mismatch');
  const falseConflicts=proof.networkResilience?.conflict?.cleanRecoveryConflictCount;
  ok(Number.isSafeInteger(falseConflicts)&&falseConflicts<=config.networkResilience.maxFalseConflictsOnCleanRecovery,'false conflict threshold exceeded');
  for(const [key,required] of [['waitingObserved',config.networkResilience.requireWaitingObserved],['confirmationObserved',config.networkResilience.requireConfirmationObserved],['activationObserved',config.networkResilience.requireActivationObserved]]){
    if(required)ok(proof.networkResilience?.serviceWorker?.[key]===true,'service worker '+key+' missing');
  }
  ok(proof.performanceParity?.result===config.performanceParity.requiredResult&&proof.performanceParity?.sourceCommit===sha,'quality parity evidence mismatch');
  ok(proof.performanceParity?.baselineSha===config.performanceParity.baselineSha,'quality parity baseline mismatch');
  ok(Number(proof.performanceParity?.rounds)>=config.performanceParity.minRounds,'quality parity rounds below minimum');
  const conflict=proof.conflict||{};
  ok(conflict.requiredSqlState===config.conflicts.requiredSqlState,'quality conflict SQLSTATE mismatch');
  ok(conflict.machineUnknownBaselineNetworkWrites<=config.conflicts.maxUnknownBaselineNetworkWrites,'machine unknown baseline wrote to network');
  ok(conflict.monthUnknownBaselineNetworkWrites<=config.conflicts.maxUnknownBaselineNetworkWrites,'month unknown baseline wrote to network');
  ok(conflict.machineStaleRpcCalls===config.conflicts.expectedStaleRpcCalls,'machine stale RPC count mismatch');
  ok(conflict.monthStaleRpcCalls===config.conflicts.expectedStaleRpcCalls,'month stale RPC count mismatch');
  ok(conflict.silentRevisionAdoptions<=config.conflicts.maxSilentRevisionAdoptions,'silent revision adoption detected');
  ok(conflict.legacyV2MutationRpcReferences<=config.conflicts.maxLegacyV2MutationRpcReferences,'legacy v2 mutation RPC reference detected');
  ok(conflict.machineConflictCode===config.conflicts.requiredMachineConflictCode,'machine conflict code mismatch');
  ok(conflict.monthConflictCode===config.conflicts.requiredMonthConflictCode,'month conflict code mismatch');
  return proof;
}

export function validateCiProof(proof,sha){
  ok(proof&&proof.schema==='rak-ci-release-proof-v1','unknown CI proof');
  ok(proof.sha===sha,'CI proof SHA mismatch');
  ok(proof.result==='PASS','CI proof is not PASS');
  ok(Array.isArray(proof.completedChecks)&&REQUIRED_CHECKS.every(name=>proof.completedChecks.includes(name)),'required CI checks missing');
  ok(Number.isInteger(proof.github?.runId)&&proof.github.runId>0,'CI run ID missing');
  ok(Number.isInteger(proof.github?.runNumber)&&proof.github.runNumber>0,'CI run number missing');
  validatePerformanceBudgetProof(proof.performanceBudget,sha);
  validateQualityThresholdProof(proof.qualityThresholds,sha);
  return proof;
}

function policy(){
  const event=process.env.GITHUB_EVENT_PATH&&fs.existsSync(process.env.GITHUB_EVENT_PATH)?json(process.env.GITHUB_EVENT_PATH):{};
  const head=String(process.env.GITHUB_SHA||git(['rev-parse','HEAD'])).trim();
  ok(head===git(['rev-parse','HEAD']),'checkout is not the workflow SHA');
  const branch=String(process.env.GITHUB_REF_NAME||event.ref||'').replace(/^refs\/heads\//,'');
  const previous=String(event.before||'').trim();
  const proof=releaseDecision({branch,previous,head,files:changed(previous,head)});
  writeJson(path.join(ROOT,'.rak-release-evidence','policy.json'),proof);
  output('deploy',proof.deploy?'true':'false');
  output('reason',proof.reason);
  console.log('[release-evidence] policy '+(proof.deploy?'DEPLOY':'SKIP')+': '+proof.reason);
}

function ciProof(){
  const sha=String(process.env.GITHUB_SHA||git(['rev-parse','HEAD'])).trim();
  const build=validateBuildProof(json(path.join(ROOT,'.rak-canonical-build','verified.json')),sha);
  const runId=Number(process.env.GITHUB_RUN_ID),runNumber=Number(process.env.GITHUB_RUN_NUMBER),attempt=Number(process.env.GITHUB_RUN_ATTEMPT||1);
  ok(Number.isInteger(runId)&&runId>0&&Number.isInteger(runNumber)&&runNumber>0,'GitHub run identity missing');
  const performanceBudget=validatePerformanceBudgetProof(json(path.join(ROOT,'.rak-release-evidence','performance-budget.json')),sha);
  const qualityThresholds=validateQualityThresholdProof(json(path.join(ROOT,'.rak-release-evidence','quality-thresholds.json')),sha);
  const proof={
    schema:'rak-ci-release-proof-v1',result:'PASS',sha,
    github:{repository:process.env.GITHUB_REPOSITORY,workflow:process.env.GITHUB_WORKFLOW,runId,runNumber,runAttempt:attempt,
      url:'https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+runId},
    completedChecks:[...REQUIRED_CHECKS],
    canonicalBuild:{stableDigest:build.stableDigest,repeatBuild:true,fileCount:build.files.length,differences:build.differences},
    performanceBudget,
    qualityThresholds,
    release:{displayVersion:RELEASE_METADATA.displayVersion,technicalVersion:RELEASE_METADATA.technicalVersion,
      cacheVersion:RELEASE_METADATA.cacheVersion,buildId:RELEASE_METADATA.buildId}
  };
  const folder=path.join(ROOT,'.rak-release-evidence','ci');
  writeJson(path.join(folder,'ci-proof.json'),proof);
  writeJson(path.join(folder,'canonical-build-verified.json'),build);
  console.log('[release-evidence] CI proof PASS for '+sha);
}

function status(headers){
  const matches=[...headers.matchAll(/^HTTP\/\S+\s+(\d{3})/gmi)];
  return matches.length?Number(matches.at(-1)[1]):0;
}
function prop(source,name){
  const match=source.match(new RegExp(name+'\\s*:\\s*[\\\'"]([^\\\'"]+)[\\\'"]'));
  return match?match[1]:'';
}
export function validateHttpFolder(label,folder){
  const entries={};
  for(const name of ['index','sw','metadata','supabase']){
    const body=fs.readFileSync(path.join(folder,name+'.body'));
    const code=status(fs.readFileSync(path.join(folder,name+'.headers'),'utf8'));
    ok(code===200,label+' '+name+' HTTP '+code);ok(body.length>20,label+' '+name+' empty');
    entries[name]={status:code,bytes:body.length,sha256:digest(body)};
  }
  const index=fs.readFileSync(path.join(folder,'index.body'),'utf8');
  const sw=fs.readFileSync(path.join(folder,'sw.body'),'utf8');
  const metadata=fs.readFileSync(path.join(folder,'metadata.body'),'utf8');
  const supabase=fs.readFileSync(path.join(folder,'supabase.body'),'utf8');
  ok(/<!doctype html/i.test(index)&&index.includes('rak-release-metadata.js'),label+' main HTML invalid');
  ok(sw.includes('rak-release-metadata.js')||sw.includes(RELEASE_METADATA.cacheVersion),label+' service worker metadata link missing');
  for(const key of ['displayVersion','technicalVersion','cacheVersion','buildId'])ok(prop(metadata,key)===RELEASE_METADATA[key],label+' '+key+' mismatch');
  ok(supabase.includes(TEST_SUPABASE),label+' TEST Supabase missing');
  ok(!supabase.includes(PROD_SUPABASE),label+' production Supabase detected');
  return {schema:'rak-http-release-proof-v1',label,result:'PASS',entries,release:{...RELEASE_METADATA},
    supabase:{testProject:TEST_SUPABASE,productionProjectAbsent:true}};
}

function deployment(raw){
  const d=raw?.result?.deployment??raw?.deployment??raw;ok(d&&typeof d==='object','deployment metadata missing');
  return {id:d.id||d.uid||'',url:cleanHost(d.url||d.alias?.[0]),state:d.state||d.readyState||'',
    target:d.target??null,projectId:d.projectId||d.project?.id||'',meta:d.meta||{}};
}
function preview(raw,label,sha){
  const d=deployment(raw);
  ok(DEPLOYMENT.test(d.id),label+' deployment ID invalid');ok(d.projectId===PROJECT_ID,label+' project mismatch');
  ok(d.state==='READY',label+' not READY');ok(d.target===null||d.target==='preview',label+' is not preview');
  ok(d.url.endsWith('.vercel.app'),label+' URL invalid');
  if(sha){
    ok(d.meta.githubCommitSha===sha,label+' SHA mismatch');ok(d.meta.githubCommitRef==='development',label+' branch mismatch');
    ok(d.meta.githubRepo==='RaK'&&d.meta.githubOrg==='martinspadrna',label+' repository metadata mismatch');
  }
  return d;
}
function refs(raw,label){ok(raw&&SHA.test(raw.development)&&SHA.test(raw.main),label+' GitHub refs invalid');return raw;}
function noSecrets(value){ok(!/(gho_|github_pat_|Bearer\s|VERCEL_TOKEN|token=|protection-bypass|shareable)/i.test(JSON.stringify(value)),'secret-like value in evidence');}

function assemble(){
  const base=path.join(ROOT,'.rak-release-evidence'),input=path.join(base,'input');
  const sha=String(process.env.GITHUB_SHA||git(['rev-parse','HEAD'])).trim();
  const ci=validateCiProof(json(path.join(input,'ci-proof.json')),sha);
  const build=validateBuildProof(json(path.join(input,'canonical-build-verified.json')),sha);
  const policyProof=json(path.join(base,'policy.json'));ok(policyProof.deploy===true&&policyProof.headSha===sha,'policy did not authorize deployment');
  const before=refs(json(path.join(base,'refs-before.json')),'before'),after=refs(json(path.join(base,'refs-after.json')),'after');
  ok(before.development===sha&&after.development===sha,'development moved during release');ok(before.main===after.main,'main changed during release');
  const current=preview(json(path.join(base,'deployment.json')),'current',sha);
  const rollback=preview(json(path.join(base,'rollback-target.json')),'rollback');
  ok(rollback.id!==current.id&&SHA.test(rollback.meta.githubCommitSha||''),'rollback target invalid');
  const alias=preview(json(path.join(base,'alias-after.json')),'stable alias',sha);ok(alias.id===current.id,'stable alias mismatch');
  const prodBefore=deployment(json(path.join(base,'production-before.json'))),prodAfter=deployment(json(path.join(base,'production-after.json')));
  ok(prodBefore.id===prodAfter.id&&prodBefore.url===prodAfter.url,'production deployment changed');
  ok(prodBefore.target==='production'&&prodAfter.target==='production','production snapshot invalid');
  const immutable=json(path.join(base,'http-immutable.json')),stable=json(path.join(base,'http-stable-alias.json'));
  for(const http of [immutable,stable]){
    ok(http.result==='PASS'&&http.release.displayVersion===RELEASE_METADATA.displayVersion,'HTTP evidence incomplete');
    ok(http.supabase.testProject===TEST_SUPABASE&&http.supabase.productionProjectAbsent===true,'Supabase isolation not proven');
  }
  const evidence={
    schema:'rak-functional-release-evidence-v1',result:'PASS',createdAt:new Date().toISOString(),
    release:{sha,branch:'development',...RELEASE_METADATA},
    github:{...ci.github,conclusion:'success',mainBefore:before.main,mainAfter:after.main},
    checks:{completed:ci.completedChecks,canonicalBuild:{stableDigest:build.stableDigest,repeatBuild:true,fileCount:build.files.length},performanceBudget:ci.performanceBudget,qualityThresholds:ci.qualityThresholds},
    vercel:{projectId:PROJECT_ID,deploymentId:current.id,state:current.state,url:current.url,commitSha:current.meta.githubCommitSha,
      stableDevelopmentAlias:STABLE_ALIAS,aliasDeploymentId:alias.id,productionDeploymentIdBefore:prodBefore.id,productionDeploymentIdAfter:prodAfter.id},
    http:{immutable,stableAlias:stable},
    supabase:{testProject:TEST_SUPABASE,productionProject:PROD_SUPABASE,productionProjectAbsentFromOutput:true,noDatabaseMutation:true},
    rollback:{targetDeploymentId:rollback.id,targetUrl:rollback.url,targetSha:rollback.meta.githubCommitSha,state:rollback.state,
      procedure:['Verify rollback target remains READY and belongs to '+PROJECT_ID+'.',
        'Run: vercel alias set '+rollback.url+' '+STABLE_ALIAS+' --scope martinspadrnas-projects',
        'Verify main HTML, sw.js, metadata and TEST Supabase through the stable development alias.',
        'To restore this release, run the same alias command with '+current.url+'.']},
    invariants:{mainUnchanged:true,productionDeploymentUnchanged:true,previewOnly:true,secretsExcluded:true}
  };
  noSecrets(evidence);writeJson(path.join(base,'release-evidence.json'),evidence);
  console.log('[release-evidence] PASS '+sha+' -> '+current.id+'; rollback '+rollback.id);
}

function httpCheck(){const [,,,label,folder,out]=process.argv;ok(label&&folder&&out,'usage: http-check label folder output');writeJson(path.resolve(out),validateHttpFolder(label,path.resolve(folder)));console.log('[release-evidence] HTTP '+label+' PASS');}
function verifyCi(){const [,,,proofFile,buildFile,sha]=process.argv;validateCiProof(json(proofFile),sha);validateBuildProof(json(buildFile),sha);console.log('[release-evidence] downloaded CI proof PASS for '+sha);}

const mode=process.argv[2];
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  try{
    if(mode==='policy')policy();else if(mode==='ci-proof')ciProof();else if(mode==='verify-ci')verifyCi();
    else if(mode==='http-check')httpCheck();else if(mode==='assemble')assemble();else throw Error('unknown mode');
  }catch(error){console.error('[release-evidence] FAIL CLOSED '+error.message);process.exitCode=1;}
}
