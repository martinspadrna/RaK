#!/usr/bin/env node
// Read-only PWA benchmark: three fresh isolated Chrome profiles, no Supabase credentials or writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import RELEASE_METADATA from '../rak-release-metadata.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const BOOT_LABELS=Object.freeze(['cold mobile','offline reload','online recovery']);
export const BUDGET_MS=Object.freeze({'cold mobile':15000,'offline reload':12000,'online recovery':15000});
export const ROUNDS=3;

export function parseBootTimes(stdout){
 const times={};
 for(const line of String(stdout).split(/\r?\n/)){
  const match=line.match(/^\[17052-browser\] (cold mobile|offline reload|online recovery) PASS (\d+)ms viewport=\d+ document=\d+ SW=(?:true|false)$/);
  if(!match)continue;
  assert(!Object.hasOwn(times,match[1]),'duplicate browser measurement: '+match[1]);
  const ms=Number(match[2]);assert(Number.isSafeInteger(ms)&&ms>=0,'invalid duration');
  times[match[1]]=ms;
 }
 assert.deepEqual(Object.keys(times).sort(),BOOT_LABELS.slice().sort(),'missing real Chromium boot measurement');
 return times;
}

export function assessBootSamples(samples,budgets=BUDGET_MS){
 assert(Array.isArray(samples)&&samples.length===ROUNDS,'three independent browser runs required');
 const result={};
 for(const label of BOOT_LABELS){
  const values=samples.map(sample=>sample[label]);
  assert(values.every(v=>Number.isSafeInteger(v)&&v>=0),'invalid '+label+' sample');
  const sorted=values.slice().sort((a,b)=>a-b);
  const budget=budgets[label];
  assert(Number.isSafeInteger(budget)&&budget>0,'missing fixed '+label+' budget');
  result[label]={samplesMs:values,p50Ms:sorted[1],p95Ms:sorted[2],budgetMs:budget};
  assert(sorted[2]<=budget,`${label} P95 ${sorted[2]}ms exceeds fixed ${budget}ms budget`);
 }
 return result;
}

function benchmark(){
 assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version,RELEASE_METADATA.technicalVersion,'built technical version required');
 assert.equal(RELEASE_METADATA.technicalVersion,RELEASE_METADATA.displayVersion,'release version must be unified');
 const config=fs.readFileSync(path.join(ROOT,'supabase-config.js'),'utf8');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'),'TEST configuration required');
 const samples=[];
 for(let round=1;round<=ROUNDS;round++){
  const run=spawnSync(process.execPath,[path.join(ROOT,'tools/browser-offline-17052.mjs')],{
   cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,env:process.env
  });
  if(run.error||run.status!==0){
   // Never dump arbitrary browser output, page content, tokens or rotation data to CI logs.
   throw Error(`Chromium round ${round} failed (exit=${run.status}, signal=${run.signal}, error=${run.error?.code||'none'}). Run the original browser gate for diagnostics.`);
  }
  samples.push(parseBootTimes(run.stdout));
 }
 const result=assessBootSamples(samples);
 const lines=BOOT_LABELS.map(label=>{
  const v=result[label];return `${label}: runs=${v.samplesMs.join('/') }ms, p50=${v.p50Ms}ms, p95=${v.p95Ms}ms, budget=${v.budgetMs}ms`;
 });
 for(const line of lines)console.log('[17068-perf] '+line);
 console.log('[17068-perf] PASS three independent real Chromium cold/offline/recovery cycles; TEST-only and read-only. Physical Safari remains unverified.');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### RaK PWA repeated Chromium boot (3 isolated profiles)\n'+lines.map(x=>'- '+x).join('\n')+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{benchmark();}catch(e){console.error('[17068-perf] FAIL '+e.message);process.exitCode=1;}
}
