import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('tools/quality-thresholds-17104.json'));
const script=read('tools/quality-thresholds-17104.mjs');
const workflow=read('.github/workflows/rak-development-validation.yml');

test('P2.4 quality thresholds are explicit, zero-tolerance for silent conflicts and warnings cannot pass',()=>{
 assert.equal(config.schema,'rak-quality-thresholds-v1');
 assert.equal(config.warningsMayPass,false);
 assert.equal(config.periodicDevelopmentGate,true);
 assert.equal(config.networkResilience.maxFalseConflictsOnCleanRecovery,0);
 assert.equal(config.conflicts.maxUnknownBaselineNetworkWrites,0);
 assert.equal(config.conflicts.maxSilentRevisionAdoptions,0);
 assert.equal(config.conflicts.maxLegacyV2MutationRpcReferences,0);
 assert.equal(config.conflicts.requiredSqlState,'40001');
});

test('quality gate measures real CAS fixtures and binds performance/network/parity evidence to exact SHA',()=>{
 for(const marker of [
  "runNamedDeclarations",
  "machineUnknown.calls.length",
  "monthUnknown.calls.length",
  "silentRevisionAdoptions",
  "legacyV2MutationRpcReferences",
  "network.conflict?.cleanRecoveryConflictCount",
  "performance.sourceCommit,SHA",
  "network.sourceCommit,SHA",
  "parity.sourceCommit,SHA",
  "rak-quality-threshold-evidence-v1"
 ])assert(script.includes(marker),'missing '+marker);
 assert(workflow.includes('node --test tools/quality-thresholds-17104.test.mjs'));
 assert(workflow.includes('node tools/quality-thresholds-17104.mjs'));
 assert(workflow.includes('RAK_QUALITY_EVIDENCE'));
});
