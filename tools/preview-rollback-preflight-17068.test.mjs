#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePreviewRollbackMetadata} from './preview-rollback-preflight-17068.mjs';
const main='ceca9f9644da3dc41059c5d232661d27bc6dba18',previous='0814420912d0d90e43b4b17f471207ef87ba5512',current='86b43e72cd02033dd26173a0beee3df4fcff3e1f';
function deploy(id,sha){return {id,project:{id:'prj_Pv7eNEt5qGg2GX9l365fJnc0YUMF'},state:'READY',target:null,aliasError:null,url:'skoda-spada-5nqdxp3vj-martinspadrnas-projects.vercel.app',meta:{githubCommitRef:'development',githubCommitSha:sha,githubRepo:'RaK',githubOrg:'martinspadrna'}};}
function snapshot(){return {current:deploy('dpl_C8xqjDCsXVehx58jzjXaiowaJtFC',current),fallback:deploy('dpl_42yHCGBWmahZJhbzh5xM3nuAjLY8',previous),refs:{main,development:current}};}
test('read-only preflight proves identities but NEVER claims a completed rollback',()=>{
 const result=validatePreviewRollbackMetadata(snapshot());
 assert.equal(result.result,'METADATA_ONLY');assert.equal(result.aliasVerified,false);assert.equal(result.schemaVerified,false);assert.equal(result.contentVerified,false);
 const source=fs.readFileSync(new URL('./preview-rollback-preflight-17068.mjs',import.meta.url),'utf8');
 assert(!/execFileSync|spawnSync|update_ref|alias set|fetch\(/.test(source),'preflight must never perform mutating actions or network access');
});
test('reject stale HEAD, moved main, wrong branch or repository',()=>{
 for(const mutate of [s=>{s.refs.development=previous;},s=>{s.refs.main=current;},s=>{s.current.meta.githubCommitRef='main';},s=>{s.current.meta.githubOrg='another';},s=>{s.fallback.meta.githubCommitSha=current;}]){
  const s=snapshot();mutate(s);assert.throws(()=>validatePreviewRollbackMetadata(s));
 }
});
test('reject production target, failed deployment, wrong project, alias error and mutable hostname',()=>{
 for(const mutate of [s=>{s.current.target='production';},s=>{s.fallback.state='ERROR';},s=>{s.current.project.id='other';},s=>{s.current.aliasError='error';},s=>{s.current.url='skoda-spada.vercel.app';},s=>{s.fallback.id=s.current.id;}]){
  const s=snapshot();mutate(s);assert.throws(()=>validatePreviewRollbackMetadata(s));
 }
});
