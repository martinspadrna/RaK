#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WORKSPACE=path.resolve(process.env.GITHUB_WORKSPACE||ROOT);
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const CONFIG=JSON.parse(read('tools/quality-thresholds-17104.json'));
assert.equal(CONFIG.schema,'rak-quality-thresholds-v1');
assert.equal(CONFIG.warningsMayPass,false,'[quality-thresholds] warnings must never pass');
assert.equal(CONFIG.periodicDevelopmentGate,true,'[quality-thresholds] periodic gate required');
const SHA=String(process.env.GITHUB_SHA||'').trim();
assert.match(SHA,/^[0-9a-f]{40}$/i,'[quality-thresholds] exact GITHUB_SHA required');

const bridge=read('supabase-bridge.js');
const conflictError=(message,code)=>Object.assign(new Error(message),{code,conflict:true});

function machineFixture(revision,reply){
  const state={machineSettingsRevision:revision},calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});return reply||{data:{ok:true,saved_count:1,revision:Number(revision)+1},error:null};}};
  const {api}=runNamedDeclarations({modules:[{source:bridge,names:['trySaveMachineSettingsViaRpc']}],globals:{
    state,hasSecureAdminContext:()=>true,isCredentialOrBackupMachineSettingsPayload:()=>false,isSupabaseRpcUnavailableError:()=>false,
    SUPABASE_RPC_HARDENING_STATUS:{},rakRevisionConflictError:conflictError,
    rakIsSqlRevisionConflict:err=>String(err&&err.code||'')===CONFIG.conflicts.requiredSqlState
  },exports:{save:'trySaveMachineSettingsViaRpc'}});
  return {state,calls,run:()=>api.save(client,[{machine_key:'QUALITY',label:'Quality'}],{reason:'quality-gate'})};
}

function monthFixture(revision,reply){
  const month='2026-10-01';
  const state={rotationMonthRevisions:{[month]:revision}},calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});return reply||{data:{ok:true,inserted:1,revision:Number(revision)+1},error:null};}};
  const {api}=runNamedDeclarations({modules:[{source:bridge,names:['upsertRotationMonthEntriesDirect']}],globals:{
    state,hasSecureAdminContext:()=>true,rakRevisionConflictError:conflictError,
    rakIsSqlRevisionConflict:err=>String(err&&err.code||'')===CONFIG.conflicts.requiredSqlState
  },exports:{save:'upsertRotationMonthEntriesDirect'}});
  return {state,calls,month,run:()=>api.save(client,month,'10/26',[{employee_name:'Quality',row_order:0}])};
}

async function rejected(run){try{await run();assert.fail('[quality-thresholds] operation unexpectedly succeeded');}catch(error){return error;}}

const machineUnknown=machineFixture(null);
const machineUnknownError=await rejected(()=>machineUnknown.run());
assert.equal(machineUnknownError.code,'RAK_MACHINE_SETTINGS_REVISION_UNVERIFIED');
const monthUnknown=monthFixture(undefined);
const monthUnknownError=await rejected(()=>monthUnknown.run());
assert.equal(monthUnknownError.code,'RAK_ROTATION_MONTH_REVISION_UNVERIFIED');

const machineStaleSql=Object.assign(new Error('changed on another device'),{code:CONFIG.conflicts.requiredSqlState});
const machineStale=machineFixture(9,{data:null,error:machineStaleSql});
const machineStaleError=await rejected(()=>machineStale.run());
const monthStaleSql=Object.assign(new Error('changed on another device'),{code:CONFIG.conflicts.requiredSqlState});
const monthStale=monthFixture(4,{data:null,error:monthStaleSql});
const monthStaleError=await rejected(()=>monthStale.run());

const legacyV2Refs=(bridge.match(/client\.rpc\('rak_admin_save_machine_settings_v2'/g)||[]).length+(bridge.match(/client\.rpc\('rak_admin_save_rotation_month_entries_v2'/g)||[]).length;
const silentRevisionAdoptions=(machineStale.state.machineSettingsRevision===9?0:1)+(monthStale.state.rotationMonthRevisions[monthStale.month]===4?0:1);

const performancePath=process.env.RAK_PERFORMANCE_EVIDENCE||path.join(WORKSPACE,'.rak-release-evidence','performance-budget.json');
const networkPath=process.env.RAK_NETWORK_EVIDENCE||path.join(WORKSPACE,'.rak-canonical-build','network-resilience.json');
const parityPath=process.env.RAK_PARITY_EVIDENCE||path.join(WORKSPACE,'.rak-canonical-build','performance-parity-17069.json');
const performance=json(performancePath),network=json(networkPath),parity=json(parityPath);

assert.equal(performance.schema,'rak-performance-budget-evidence-v1');
assert.equal(performance.result,CONFIG.performanceBudget.requiredResult);
assert.equal(performance.sourceCommit,SHA,'[quality-thresholds] performance SHA mismatch');
assert.equal(network.schema,'rak-pwa-network-resilience-v1');
assert.equal(network.result,CONFIG.networkResilience.requiredResult);
assert.equal(network.sourceCommit,SHA,'[quality-thresholds] network SHA mismatch');
assert.equal(parity.schema,'rak-performance-parity-evidence-v1');
assert.equal(parity.result,CONFIG.performanceParity.requiredResult);
assert.equal(parity.sourceCommit,SHA,'[quality-thresholds] parity SHA mismatch');
assert.equal(parity.baseline?.sha,CONFIG.performanceParity.baselineSha);
assert(parity.rounds>=CONFIG.performanceParity.minRounds,'[quality-thresholds] parity rounds below minimum');

const falseConflicts=Number(network.conflict?.cleanRecoveryConflictCount);
assert(Number.isSafeInteger(falseConflicts)&&falseConflicts<=CONFIG.networkResilience.maxFalseConflictsOnCleanRecovery,'[quality-thresholds] false conflict threshold exceeded');
for(const [key,required] of [['waitingObserved',CONFIG.networkResilience.requireWaitingObserved],['confirmationObserved',CONFIG.networkResilience.requireConfirmationObserved],['activationObserved',CONFIG.networkResilience.requireActivationObserved]]){
  if(required)assert.equal(network.serviceWorker?.[key],true,'[quality-thresholds] service worker '+key+' missing');
}

const conflict={
  requiredSqlState:CONFIG.conflicts.requiredSqlState,
  machineUnknownBaselineNetworkWrites:machineUnknown.calls.length,
  monthUnknownBaselineNetworkWrites:monthUnknown.calls.length,
  machineStaleRpcCalls:machineStale.calls.length,
  monthStaleRpcCalls:monthStale.calls.length,
  silentRevisionAdoptions,legacyV2MutationRpcReferences:legacyV2Refs,
  falseConflictsOnCleanRecovery:falseConflicts,
  machineConflictCode:machineStaleError.code,monthConflictCode:monthStaleError.code
};
assert(conflict.machineUnknownBaselineNetworkWrites<=CONFIG.conflicts.maxUnknownBaselineNetworkWrites);
assert(conflict.monthUnknownBaselineNetworkWrites<=CONFIG.conflicts.maxUnknownBaselineNetworkWrites);
assert.equal(conflict.machineStaleRpcCalls,CONFIG.conflicts.expectedStaleRpcCalls);
assert.equal(conflict.monthStaleRpcCalls,CONFIG.conflicts.expectedStaleRpcCalls);
assert(conflict.silentRevisionAdoptions<=CONFIG.conflicts.maxSilentRevisionAdoptions);
assert(conflict.legacyV2MutationRpcReferences<=CONFIG.conflicts.maxLegacyV2MutationRpcReferences);
assert.equal(conflict.machineConflictCode,CONFIG.conflicts.requiredMachineConflictCode);
assert.equal(conflict.monthConflictCode,CONFIG.conflicts.requiredMonthConflictCode);

const evidence={
  schema:'rak-quality-threshold-evidence-v1',result:'PASS',sourceCommit:SHA,periodicDevelopmentGate:true,warningsAsSuccess:false,
  performanceBudget:{result:performance.result,sourceCommit:performance.sourceCommit,baselineSha:performance.baseline?.sha},
  networkResilience:{result:network.result,sourceCommit:network.sourceCommit,measurementsMs:network.measurementsMs,serviceWorker:network.serviceWorker,conflict:network.conflict},
  performanceParity:{result:parity.result,sourceCommit:parity.sourceCommit,baselineSha:parity.baseline?.sha,rounds:parity.rounds,comparisons:parity.comparisons},
  conflict
};
const target=process.env.RAK_QUALITY_EVIDENCE||path.join(WORKSPACE,'.rak-release-evidence','quality-thresholds.json');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(evidence,null,2)+'\n');
console.log('[quality-thresholds] PASS '+JSON.stringify(evidence));
