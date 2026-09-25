#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONFIG_PATH=path.join(ROOT,'tools','performance-budget-17104.json');

export function loadPerformanceBudget(file=CONFIG_PATH){
  const value=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(value.schema,'rak-performance-budget-v1','performance budget schema mismatch');
  assert.match(value.baseline?.sha||'',/^[0-9a-f]{40}$/i,'performance baseline SHA missing');
  assert(Object.keys(value.timeModes||{}).length===3,'three timing modes required');
  assert(Object.keys(value.sizeGroups||{}).length>=3,'size budget groups missing');
  return value;
}

function deltaPct(actual,baseline){
  assert(Number.isFinite(actual)&&Number.isFinite(baseline)&&baseline>0,'invalid baseline delta');
  return Math.round(((actual-baseline)/baseline)*1000)/10;
}

function selectGroup(files,spec,name){
  assert(Array.isArray(files)&&files.length>0,'canonical build files missing');
  let selected=[];
  if(Array.isArray(spec.paths)){
    const byPath=new Map(files.map(file=>[file.path,file]));
    selected=spec.paths.map(p=>{const file=byPath.get(p);assert(file,name+' missing required '+p);return file;});
  }else if(Array.isArray(spec.rootExtensions)){
    selected=files.filter(file=>!String(file.path).includes('/')&&spec.rootExtensions.some(ext=>String(file.path).endsWith(ext)));
    assert(selected.length>0,name+' root extension group is empty');
  }else assert.fail(name+' size group has no selector');
  assert(selected.every(file=>Number.isSafeInteger(file.bytes)&&file.bytes>=0),name+' invalid file size');
  return selected;
}

export function assessPerformanceBudget({sourceCommit,bootStats,buildFiles,config=loadPerformanceBudget()}){
  assert.match(String(sourceCommit||''),/^[0-9a-f]{40}$/i,'performance evidence source SHA missing');
  const time={};
  for(const [label,spec] of Object.entries(config.timeModes)){
    const stat=bootStats?.[label];
    assert(stat&&Number.isSafeInteger(stat.p95Ms)&&stat.p95Ms>=0,'missing P95 for '+label);
    assert(Number.isSafeInteger(spec.baselineP95Ms)&&spec.baselineP95Ms>0,'invalid time baseline '+label);
    assert(Number.isSafeInteger(spec.hardBudgetMs)&&spec.hardBudgetMs>spec.baselineP95Ms,'invalid hard time budget '+label);
    assert(stat.p95Ms<=spec.hardBudgetMs,label+' P95 '+stat.p95Ms+'ms exceeds hard '+spec.hardBudgetMs+'ms budget');
    time[label]={baselineP95Ms:spec.baselineP95Ms,actualP95Ms:stat.p95Ms,hardBudgetMs:spec.hardBudgetMs,deltaMs:stat.p95Ms-spec.baselineP95Ms,deltaPct:deltaPct(stat.p95Ms,spec.baselineP95Ms)};
  }
  const size={};
  for(const [name,spec] of Object.entries(config.sizeGroups)){
    assert(Number.isSafeInteger(spec.baselineBytes)&&spec.baselineBytes>0,'invalid size baseline '+name);
    assert(Number.isSafeInteger(spec.maxBytes)&&spec.maxBytes>=spec.baselineBytes,'invalid size cap '+name);
    const selected=selectGroup(buildFiles,spec,name);
    const actualBytes=selected.reduce((sum,file)=>sum+file.bytes,0);
    assert(actualBytes<=spec.maxBytes,name+' '+actualBytes+'B exceeds hard '+spec.maxBytes+'B budget');
    size[name]={baselineBytes:spec.baselineBytes,actualBytes,maxBytes:spec.maxBytes,deltaBytes:actualBytes-spec.baselineBytes,deltaPct:deltaPct(actualBytes,spec.baselineBytes),fileCount:selected.length};
  }
  return {schema:'rak-performance-budget-evidence-v1',result:'PASS',sourceCommit,baseline:{...config.baseline},time,size};
}

export function writePerformanceBudgetEvidence(evidence,target){
  assert.equal(evidence?.schema,'rak-performance-budget-evidence-v1');
  assert(target,'performance evidence target missing');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(evidence,null,2)+'\n');
  return target;
}
