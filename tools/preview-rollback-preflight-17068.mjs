#!/usr/bin/env node
// Read-only metadata preflight. It NEVER changes an alias, branch, database or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT='prj_Pv7eNEt5qGg2GX9l365fJnc0YUMF';
const MAIN='ceca9f9644da3dc41059c5d232661d27bc6dba18';
const FALLBACK='0814420912d0d90e43b4b17f471207ef87ba5512';
const SHA=/^[0-9a-f]{40}$/;
const DEPLOYMENT=/^dpl_[a-zA-Z0-9]+$/;
const IMMUTABLE_HOST=/^skoda-spada-[a-z0-9]+-martinspadrnas-projects\.vercel\.app$/;

function unwrap(raw){return raw?.result?.deployment??raw?.deployment??raw;}
function checkDeployment(raw,label){
 const d=unwrap(raw);
 assert(d&&typeof d==='object',`${label}: missing metadata`);
 assert(DEPLOYMENT.test(d.id||''),`${label}: invalid immutable deployment ID`);
 assert.equal(d.project?.id,PROJECT,`${label}: unexpected project`);
 assert.equal(d.state,'READY',`${label}: deployment not READY`);
 assert.equal(d.target,null,`${label}: production deployment prohibited`);
 assert(d.aliasError===null||d.aliasError===undefined,`${label}: alias error`);
 assert.equal(d.meta?.githubCommitRef,'development',`${label}: not development`);
 assert.equal(d.meta?.githubRepo,'RaK',`${label}: repository mismatch`);
 assert.equal(d.meta?.githubOrg,'martinspadrna',`${label}: owner mismatch`);
 assert(SHA.test(d.meta?.githubCommitSha||''),`${label}: missing full commit SHA`);
 assert(IMMUTABLE_HOST.test(d.url||''),`${label}: not an immutable preview hostname`);
 return d;
}

export function validatePreviewRollbackMetadata({current,fallback,refs}){
 assert(refs&&typeof refs==='object','missing authenticated GitHub refs snapshot');
 assert(SHA.test(refs.development||'')&&SHA.test(refs.main||''),'invalid GitHub refs');
 assert.equal(refs.main,MAIN,'main moved; stop and investigate, never overwrite it');
 const currentDeployment=checkDeployment(current,'current');
 const fallbackDeployment=checkDeployment(fallback,'fallback');
 assert.notEqual(currentDeployment.id,fallbackDeployment.id,'fallback must be a separate immutable deployment');
 assert.equal(currentDeployment.meta.githubCommitSha,refs.development,'current preview is not exact development HEAD');
 assert.equal(fallbackDeployment.meta.githubCommitSha,FALLBACK,'fallback SHA is not the last fully verified 1.7.66');
 assert.notEqual(currentDeployment.meta.githubCommitSha,FALLBACK,'not a forward release to rehearse');
 return {currentId:currentDeployment.id,currentSha:refs.development,fallbackId:fallbackDeployment.id,fallbackSha:FALLBACK,mainSha:MAIN,
  result:'METADATA_ONLY',aliasVerified:false,schemaVerified:false,contentVerified:false};
}

function cli(){
 const args=process.argv.slice(2);
 assert(args.length===3,'usage: node tools/preview-rollback-preflight-17068.mjs /private/current.json /private/fallback.json /private/refs.json');
 const [current,fallback,refs]=args.map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
 const checked=validatePreviewRollbackMetadata({current,fallback,refs});
 console.log(`[17068-rollback] PASS metadata-only: current ${checked.currentId} ${checked.currentSha}, fallback ${checked.fallbackId} ${checked.fallbackSha}; main unchanged.`);
 console.log('[17068-rollback] STOP before any alias switch: independently verify ACTIVE alias owner, login-gated preview HTTP content, compatible TEST schema and a restorable local draft. Do not touch main, production or DB.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{cli();}catch(e){console.error('[17068-rollback] FAIL CLOSED '+e.message);process.exitCode=1;}
}
